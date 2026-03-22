"""
Iteration 9 Test Suite: Unified Dashboard, Simplified Sidebar, Article History in GeneratorPage
Testing changes:
1) Dashboard + Clienti unified in one section
2) Sidebar simplified (no separate Clienti, no Articoli)
3) Article History moved to GeneratorPage
4) GSC status returns redirect_uri
5) SERP retry with backoff and User-Agent rotation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
TEST_CLIENT_ID = "a8ab5383-b444-4f17-9465-41fa32c34bb9"


class TestAuthEndpoints:
    """Authentication endpoint tests"""

    def test_admin_login_success(self):
        """Admin login returns token and role=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@seoengine.it"
        print(f"✓ Admin login successful, role={data['user']['role']}")

    def test_login_invalid_credentials(self):
        """Invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly return 401")


class TestDashboardEndpoints:
    """Dashboard stats and clients list - unified view"""

    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_get_clients_list(self):
        """GET /api/clients returns list of clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Verify client structure
        client = data[0]
        assert "id" in client
        assert "nome" in client
        assert "settore" in client
        assert "sito_web" in client
        print(f"✓ GET /api/clients returns {len(data)} clients")

    def test_get_stats_overview(self):
        """GET /api/stats/overview returns dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/stats/overview", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Verify stats structure for unified dashboard
        assert "total_clients" in data or "clients_count" in data
        assert "total_articles" in data or "articles_count" in data
        print(f"✓ GET /api/stats/overview returns stats: clients={data.get('total_clients', data.get('clients_count'))}")

    def test_get_activity_logs(self):
        """GET /api/activity-logs returns activity logs"""
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/activity-logs returns {len(data)} logs")


class TestGSCEndpoints:
    """GSC status and redirect_uri test"""

    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_gsc_status_returns_redirect_uri(self):
        """GET /api/gsc/status returns redirect_uri for OAuth setup"""
        response = requests.get(f"{BASE_URL}/api/gsc/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # New feature: redirect_uri should be returned
        assert "redirect_uri" in data
        assert data["redirect_uri"].endswith("/api/gsc/callback")
        assert "configured" in data
        assert "instructions" in data
        print(f"✓ GSC status returns redirect_uri: {data['redirect_uri']}")


class TestSERPEndpoints:
    """SERP analysis with retry logic"""

    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_serp_analyze_full_returns_results(self):
        """POST /api/serp/analyze-full returns competitors with retry logic"""
        response = requests.post(
            f"{BASE_URL}/api/serp/analyze-full",
            headers=self.headers,
            json={"keyword": "noleggio auto roma", "num_results": 3, "country": "it"},
            timeout=45  # SERP may take 10-15 seconds
        )
        assert response.status_code == 200
        data = response.json()
        # Verify SERP response structure
        assert "keyword" in data
        assert data["keyword"] == "noleggio auto roma"
        assert "competitors" in data
        assert "count" in data
        assert "extracted" in data
        # Retry logic should ensure we get results
        assert data["count"] > 0, "SERP should return results with retry"
        print(f"✓ SERP analyze-full returns {data['count']} competitors")


class TestArticlesEndpoints:
    """Article generation for admin"""

    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_simple_generate_with_client_id(self):
        """POST /api/articles/simple-generate works for admin with client_id"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            headers=self.headers,
            json={
                "client_id": TEST_CLIENT_ID,
                "keyword": "noleggio auto test iteration 9"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        print(f"✓ simple-generate for admin with client_id returns job_id: {data['job_id']}")

    def test_get_articles_for_client(self):
        """GET /api/articles returns articles for client (used in Article History)"""
        response = requests.get(
            f"{BASE_URL}/api/articles?client_id={TEST_CLIENT_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/articles returns {len(data)} articles for client")


class TestUsersEndpoints:
    """Users management page"""

    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@seoengine.it",
            "password": "admin123"
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_get_users_list(self):
        """GET /api/users returns users list"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ GET /api/users returns {len(data)} users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
