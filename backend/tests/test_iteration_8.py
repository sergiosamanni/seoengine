"""
Iteration 8 Tests - Testing new features:
1. POST /api/articles/simple-generate with client_id for admin (fix for 400 error)
2. POST /api/serp/analyze-full - new endpoint for full SERP analysis with competitor data
3. Verify all auth and basic endpoints still working
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
TEST_CLIENT_ID = "a8ab5383-b444-4f17-9465-41fa32c34bb9"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Admin login should return token and role=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data.get("user", {}).get("role") == "admin", "User role should be admin"
        
    def test_login_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestSimpleGenerateEndpoint:
    """Tests for /api/articles/simple-generate - the fixed endpoint"""
    
    def test_simple_generate_with_client_id_for_admin(self, auth_headers):
        """
        Admin should be able to call simple-generate with client_id
        This was the bug fix - previously returned 400 for admin
        """
        response = requests.post(f"{BASE_URL}/api/articles/simple-generate", 
            json={
                "client_id": TEST_CLIENT_ID,
                "keyword": "test keyword salerno",
                "topic": "test topic",
                "objective": "informazionale"
            },
            headers=auth_headers
        )
        # Should NOT return 400 anymore
        assert response.status_code != 400, f"Should not return 400. Got: {response.status_code}: {response.text}"
        # Expected: 200 with job_id OR 400 for missing LLM config (which is different from the client_id bug)
        if response.status_code == 200:
            data = response.json()
            assert "job_id" in data, "Response should contain job_id"
            assert data.get("status") == "running", "Status should be running"
            print(f"SUCCESS: simple-generate returned job_id: {data.get('job_id')}")
        elif response.status_code == 400:
            data = response.json()
            # The only valid 400 should be about LLM config, not client_id
            detail = data.get("detail", "")
            assert "client_id" not in detail.lower(), f"Should not fail on client_id. Got: {detail}"
            print(f"INFO: simple-generate returned 400 for config reason: {detail}")
            
    def test_simple_generate_without_client_id_for_admin_fails(self, auth_headers):
        """Admin without client_id should get 400 with proper message"""
        response = requests.post(f"{BASE_URL}/api/articles/simple-generate", 
            json={
                "keyword": "test keyword",
                "topic": "test topic"
            },
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for missing client_id, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", "")
        assert "client_id" in detail.lower(), f"Error should mention client_id. Got: {detail}"


class TestSerpAnalyzeFullEndpoint:
    """Tests for new /api/serp/analyze-full endpoint"""
    
    def test_serp_analyze_full_returns_competitors(self, auth_headers):
        """
        New endpoint should return full SERP analysis with:
        - competitors array with position, url, title, headings, description
        - extracted object with titles and headings arrays
        """
        response = requests.post(f"{BASE_URL}/api/serp/analyze-full", 
            json={
                "keyword": "noleggio auto salerno",
                "num_results": 3,
                "country": "it"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "keyword" in data, "Response should contain keyword"
        assert "competitors" in data, "Response should contain competitors array"
        assert "count" in data, "Response should contain count"
        assert "extracted" in data, "Response should contain extracted object"
        
        # Verify competitors structure
        competitors = data.get("competitors", [])
        print(f"Got {len(competitors)} competitors")
        
        if len(competitors) > 0:
            comp = competitors[0]
            assert "position" in comp, "Competitor should have position"
            assert "url" in comp, "Competitor should have url"
            assert "title" in comp, "Competitor should have title"
            assert "headings" in comp, "Competitor should have headings array"
            print(f"First competitor: #{comp['position']} - {comp['title']}")
            print(f"Headings extracted: {len(comp.get('headings', []))}")
            
        # Verify extracted structure
        extracted = data.get("extracted", {})
        assert "titles" in extracted, "Extracted should contain titles array"
        assert "headings" in extracted, "Extracted should contain headings array"
        print(f"Extracted titles: {len(extracted.get('titles', []))}")
        print(f"Extracted headings: {len(extracted.get('headings', []))}")
        
    def test_serp_analyze_full_empty_keyword_fails(self, auth_headers):
        """Empty keyword should return 400"""
        response = requests.post(f"{BASE_URL}/api/serp/analyze-full", 
            json={"keyword": "", "num_results": 3},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for empty keyword, got {response.status_code}"


class TestExistingSerpSearchEndpoint:
    """Verify existing /api/serp/search still works"""
    
    def test_serp_search_returns_results(self, auth_headers):
        """Basic SERP search should still work"""
        response = requests.post(f"{BASE_URL}/api/serp/search", 
            json={"keyword": "noleggio auto", "num_results": 3, "country": "it"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "results" in data, "Response should contain results"
        assert "keyword" in data, "Response should contain keyword"


class TestClientsEndpoints:
    """Verify clients endpoints still working"""
    
    def test_get_clients(self, auth_headers):
        """Get clients list"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
    def test_get_specific_client(self, auth_headers):
        """Get specific test client"""
        response = requests.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("id") == TEST_CLIENT_ID, "Client ID should match"


class TestActivityLogs:
    """Verify activity logs endpoint"""
    
    def test_get_all_activity_logs(self, auth_headers):
        """Get all activity logs (admin)"""
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
    def test_get_client_activity_logs(self, auth_headers):
        """Get client-specific activity logs"""
        response = requests.get(f"{BASE_URL}/api/activity-logs/{TEST_CLIENT_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"


class TestStatsOverview:
    """Verify stats overview endpoint"""
    
    def test_get_stats_overview(self, auth_headers):
        """Get stats overview for admin"""
        response = requests.get(f"{BASE_URL}/api/stats/overview", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_clients" in data, "Response should contain total_clients"
        assert "total_articles" in data, "Response should contain total_articles"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
