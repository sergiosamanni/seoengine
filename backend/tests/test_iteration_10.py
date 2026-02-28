"""
Iteration 10 Tests - GSC Persistence & Context Injection
Tests for:
1. GSC config now returned in client API response
2. simple-generate endpoint accepts gsc_context and serp_context
3. GSC status endpoint returns redirect_uri
4. SERP analyze-full endpoint with retry logic
5. Activity log functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration10:
    """Tests for GSC persistence improvements and context injection in generation."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_client_id = "a8ab5383-b444-4f17-9465-41fa32c34bb9"
    
    # ============== AUTH TESTS ==============
    
    def test_admin_login_returns_token(self):
        """Test admin login returns valid token and role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
    
    def test_invalid_credentials_returns_401(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    # ============== GSC CONFIG IN CLIENT RESPONSE (BUG FIX) ==============
    
    def test_client_response_includes_gsc_config(self):
        """CRITICAL: Client API now returns GSC configuration (fixed in this iteration)"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{self.test_client_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # GSC config should now be in the response
        assert "configuration" in data
        assert data["configuration"] is not None
        
        gsc_config = data["configuration"].get("gsc")
        assert gsc_config is not None, "GSC config missing from client response - BUG!"
        
        # Verify GSC fields
        assert "site_url" in gsc_config
        assert "connected" in gsc_config
        assert gsc_config["connected"] == True, "GSC should be connected for test client"
    
    # ============== GSC STATUS ENDPOINT ==============
    
    def test_gsc_status_returns_redirect_uri(self):
        """GSC status endpoint returns configured=true and redirect_uri"""
        response = requests.get(
            f"{BASE_URL}/api/gsc/status",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["configured"] == True
        assert "redirect_uri" in data
        assert "api/gsc/callback" in data["redirect_uri"]
    
    # ============== SIMPLE-GENERATE WITH CONTEXT ==============
    
    def test_simple_generate_accepts_gsc_context(self):
        """POST /api/articles/simple-generate accepts gsc_context without error"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            headers=self.headers,
            json={
                "client_id": self.test_client_id,
                "keyword": "TEST_noleggio auto iter10",
                "topic": "Test with GSC context",
                "gsc_context": {
                    "top_keywords": [
                        {"keyword": "noleggio auto", "position": 5, "clicks": 100, "impressions": 1000}
                    ],
                    "totals": {"total_clicks": 100}
                }
            }
        )
        assert response.status_code == 200, f"simple-generate failed: {response.text}"
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "running"
    
    def test_simple_generate_accepts_serp_context(self):
        """POST /api/articles/simple-generate accepts serp_context without error"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            headers=self.headers,
            json={
                "client_id": self.test_client_id,
                "keyword": "TEST_noleggio auto serp iter10",
                "topic": "Test with SERP context",
                "serp_context": {
                    "competitors": [
                        {"position": 1, "title": "Competitor 1", "url": "https://example.com", "headings": ["H2 Test"]}
                    ],
                    "extracted": {"titles": ["Test Title"], "headings": ["H2 Test"]}
                }
            }
        )
        assert response.status_code == 200, f"simple-generate with SERP failed: {response.text}"
        data = response.json()
        assert "job_id" in data
    
    def test_simple_generate_with_both_contexts(self):
        """POST /api/articles/simple-generate accepts both gsc_context and serp_context"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            headers=self.headers,
            json={
                "client_id": self.test_client_id,
                "keyword": "TEST_noleggio auto both iter10",
                "gsc_context": {
                    "top_keywords": [{"keyword": "test", "position": 3, "clicks": 50, "impressions": 500}],
                    "totals": {"total_clicks": 50}
                },
                "serp_context": {
                    "competitors": [{"position": 1, "title": "Test Comp", "url": "https://test.com"}],
                    "extracted": {"titles": ["Test"], "headings": ["H2"]}
                }
            }
        )
        assert response.status_code == 200
    
    # ============== SERP ANALYSIS ==============
    
    def test_serp_analyze_full_with_retry(self):
        """POST /api/serp/analyze-full returns competitors with retry logic"""
        response = requests.post(
            f"{BASE_URL}/api/serp/analyze-full",
            headers=self.headers,
            json={
                "keyword": "noleggio auto roma",
                "num_results": 4,
                "country": "it"
            },
            timeout=60
        )
        assert response.status_code == 200, f"SERP analyze failed: {response.text}"
        data = response.json()
        
        assert data["keyword"] == "noleggio auto roma"
        assert "competitors" in data
        assert data["count"] >= 1, "Should return at least 1 competitor"
        assert "extracted" in data
        assert "titles" in data["extracted"]
    
    # ============== STATS & OVERVIEW ==============
    
    def test_stats_overview_returns_dashboard_data(self):
        """GET /api/stats/overview returns dashboard statistics"""
        response = requests.get(
            f"{BASE_URL}/api/stats/overview",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_clients" in data
        assert "total_articles" in data
        assert "published_articles" in data
        assert data["total_clients"] >= 1
    
    # ============== ACTIVITY LOGS ==============
    
    def test_activity_logs_returns_operations(self):
        """GET /api/activity-logs returns activity log entries"""
        response = requests.get(
            f"{BASE_URL}/api/activity-logs",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Should have activity logs"
        
        # Check log entry structure
        if len(data) > 0:
            log = data[0]
            assert "action" in log
            assert "status" in log
            assert "timestamp" in log
    
    # ============== CLIENT LIST ==============
    
    def test_clients_list_includes_totale_articoli(self):
        """GET /api/clients returns clients with article counts"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) >= 1
        client = data[0]
        assert "totale_articoli" in client
        assert client["totale_articoli"] >= 0
