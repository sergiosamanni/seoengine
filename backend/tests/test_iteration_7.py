"""
Iteration 7 Backend Tests
=========================
Tests for the refactored modular backend and updated UI structure:
- Auth & Login (POST /api/auth/login)
- Clients CRUD (GET /api/clients, GET /api/clients/{id})
- Users management (GET /api/users)
- Stats overview (GET /api/stats/overview)
- Activity logs (GET /api/activity-logs)
- SERP search with DuckDuckGo (POST /api/serp/search)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://serp-wizard.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """POST /api/auth/login - Admin login returns token and correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, role={data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - Invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")


class TestClients:
    """Client endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_clients_list(self):
        """GET /api/clients - Returns list of clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least one client"
        # Verify client has expected fields
        client = data[0]
        assert "id" in client
        assert "nome" in client
        assert "totale_articoli" in client
        print(f"✓ GET /api/clients returned {len(data)} clients")
    
    def test_get_client_by_id(self):
        """GET /api/clients/{id} - Returns specific client"""
        # First get the list
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = response.json()
        client_id = clients[0]["id"]
        
        # Get specific client
        response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["id"] == client_id
        print(f"✓ GET /api/clients/{client_id} returned client '{data['nome']}'")
    
    def test_get_client_nonexistent(self):
        """GET /api/clients/{id} - Nonexistent client returns 404"""
        response = requests.get(f"{BASE_URL}/api/clients/nonexistent-id", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Nonexistent client correctly returns 404")


class TestUsers:
    """User management endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_users_list(self):
        """GET /api/users - Returns list of users (admin only)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least one user (admin)"
        # Verify admin user exists
        admin_user = next((u for u in data if u["email"] == ADMIN_EMAIL), None)
        assert admin_user is not None, "Admin user should exist in list"
        assert admin_user["role"] == "admin"
        print(f"✓ GET /api/users returned {len(data)} users")


class TestStats:
    """Stats overview endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_stats_overview(self):
        """GET /api/stats/overview - Returns admin stats"""
        response = requests.get(f"{BASE_URL}/api/stats/overview", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Admin stats should have these fields
        assert "total_clients" in data, "Missing total_clients"
        assert "active_clients" in data, "Missing active_clients"
        assert "total_articles" in data, "Missing total_articles"
        assert "published_articles" in data, "Missing published_articles"
        assert "generated_articles" in data, "Missing generated_articles"
        print(f"✓ GET /api/stats/overview: {data['total_clients']} clients, {data['total_articles']} articles")


class TestActivityLogs:
    """Activity logs endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_activity_logs(self):
        """GET /api/activity-logs - Returns all activity logs (admin only)"""
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Verify log structure if logs exist
        if len(data) > 0:
            log = data[0]
            assert "action" in log
            assert "status" in log
            assert "timestamp" in log
        print(f"✓ GET /api/activity-logs returned {len(data)} logs")
    
    def test_get_client_activity_logs(self):
        """GET /api/activity-logs/{client_id} - Returns client-specific logs"""
        # First get a client ID
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = response.json()
        client_id = clients[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/activity-logs/{client_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All logs should be for this client
        for log in data:
            assert log["client_id"] == client_id, f"Log client_id mismatch"
        print(f"✓ GET /api/activity-logs/{client_id} returned {len(data)} logs")


class TestSerpSearch:
    """SERP search endpoint tests - uses DuckDuckGo"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_serp_search_returns_results(self):
        """POST /api/serp/search - Returns SERP results for keyword"""
        response = requests.post(f"{BASE_URL}/api/serp/search", 
            headers=self.headers,
            json={"keyword": "noleggio auto salerno", "country": "it", "num_results": 5}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "keyword" in data
        assert "results" in data
        assert data["keyword"] == "noleggio auto salerno"
        # DuckDuckGo should return real results
        assert len(data["results"]) > 0, "Should return at least some results"
        # Verify result structure
        result = data["results"][0]
        assert "url" in result
        assert "title" in result
        assert "position" in result
        print(f"✓ POST /api/serp/search returned {len(data['results'])} results for 'noleggio auto salerno'")
    
    def test_serp_search_empty_keyword_rejected(self):
        """POST /api/serp/search - Empty keyword returns 400"""
        response = requests.post(f"{BASE_URL}/api/serp/search", 
            headers=self.headers,
            json={"keyword": "", "country": "it", "num_results": 5}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Empty keyword correctly rejected with 400")


class TestArticles:
    """Articles endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_articles_list(self):
        """GET /api/articles - Returns list of articles"""
        response = requests.get(f"{BASE_URL}/api/articles", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        if len(data) > 0:
            article = data[0]
            assert "id" in article
            assert "titolo" in article
            assert "stato" in article
        print(f"✓ GET /api/articles returned {len(data)} articles")


class TestCombinations:
    """Combinations endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_combinations(self):
        """GET /api/clients/{id}/combinations - Returns keyword combinations"""
        # First get a client ID
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = response.json()
        client_id = clients[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/clients/{client_id}/combinations", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "combinations" in data
        assert "total" in data
        print(f"✓ GET /api/clients/{client_id}/combinations returned {data['total']} combinations")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
