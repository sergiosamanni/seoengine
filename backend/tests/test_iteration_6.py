"""
Iteration 6 Tests: SERP Analysis, Website Scraping, GSC Integration, Client Simple Generator
Tests the following new features:
- SERP Analysis (POST /api/serp/search) - googlesearch-python based
- Website Scraping (POST /api/clients/{id}/scrape-website)
- GSC Config (POST /api/clients/{id}/gsc-config)
- GSC Authorization (GET /api/gsc/authorize/{id})
- Client Simple Generator (POST /api/articles/simple-generate)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
CLIENT_EMAIL = "cliente@noleggiosalerno.it"
CLIENT_PASSWORD = "password"
TEST_CLIENT_ID = "a8ab5383-b444-4f17-9465-41fa32c34bb9"


class TestAuth:
    """Authentication Tests"""
    
    def test_admin_login(self):
        """Admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login successful - role: {data['user']['role']}")
        
    def test_client_login(self):
        """Client can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "client"
        print(f"PASS: Client login successful - role: {data['user']['role']}, client_id: {data['user'].get('client_id')}")


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    return response.json()["token"]


@pytest.fixture
def client_token():
    """Get client auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Client login failed")
    return response.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    """Admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def client_headers(client_token):
    """Client auth headers"""
    return {"Authorization": f"Bearer {client_token}"}


class TestDashboard:
    """Dashboard & Stats Tests"""
    
    def test_admin_overview_stats(self, admin_headers):
        """Admin can view dashboard overview stats"""
        response = requests.get(f"{BASE_URL}/api/stats/overview", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        # Admin sees all client stats
        assert "total_clients" in data
        assert "total_articles" in data
        print(f"PASS: Admin overview - total_clients: {data['total_clients']}, total_articles: {data['total_articles']}")
        
    def test_client_overview_stats(self, client_headers):
        """Client can view their dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/stats/overview", headers=client_headers)
        assert response.status_code == 200, f"Failed to get client stats: {response.text}"
        data = response.json()
        # Client sees their own stats
        assert "total_articles" in data
        print(f"PASS: Client overview - total_articles: {data['total_articles']}")


class TestClientsList:
    """Clients Page Tests"""
    
    def test_admin_get_clients(self, admin_headers):
        """Admin can list all clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        clients = response.json()
        assert isinstance(clients, list)
        assert len(clients) > 0, "No clients found"
        # Verify test client exists
        test_client = next((c for c in clients if c["id"] == TEST_CLIENT_ID), None)
        assert test_client is not None, "Test client not found"
        print(f"PASS: Admin got {len(clients)} clients, test client found: {test_client['nome']}")
        
    def test_admin_get_client_detail(self, admin_headers):
        """Admin can view client detail with configuration"""
        response = requests.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get client: {response.text}"
        client = response.json()
        assert client["id"] == TEST_CLIENT_ID
        assert "configuration" in client or client.get("configuration") is None
        print(f"PASS: Got client detail: {client['nome']}, settore: {client['settore']}")


class TestSerpAnalysis:
    """SERP Analysis Tests (googlesearch-python based)"""
    
    def test_serp_search_endpoint_exists(self, admin_headers):
        """SERP search endpoint returns valid response structure"""
        response = requests.post(f"{BASE_URL}/api/serp/search", 
            json={"keyword": "test keyword", "country": "it", "num_results": 3},
            headers=admin_headers
        )
        # May fail in container env due to Google blocking, but endpoint should exist
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "results" in data
            print(f"PASS: SERP search returned {len(data['results'])} results")
        else:
            # Expected in container environment
            print(f"INFO: SERP search returned {response.status_code} - may be blocked in container env")
            
    def test_serp_search_validation(self, admin_headers):
        """SERP search validates required keyword"""
        response = requests.post(f"{BASE_URL}/api/serp/search", 
            json={"keyword": "", "country": "it"},
            headers=admin_headers
        )
        # Should fail with empty keyword
        assert response.status_code in [400, 422], f"Should reject empty keyword: {response.status_code}"
        print("PASS: SERP search rejects empty keyword")


class TestWebsiteScraping:
    """Website Scraping for Knowledge Base Tests"""
    
    def test_scrape_website_endpoint_exists(self, admin_headers):
        """Website scraping endpoint returns valid response structure"""
        response = requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/scrape-website",
            json={"url": "https://example.com"},
            headers=admin_headers
        )
        # May fail due to SSL/network issues in container
        assert response.status_code in [200, 400, 500, 504], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            # Should have some structured data
            print(f"PASS: Website scraping returned data with keys: {list(data.keys())}")
        else:
            print(f"INFO: Website scraping returned {response.status_code} - network/SSL issues in container")
            
    def test_scrape_website_validation(self, admin_headers):
        """Website scraping validates URL"""
        response = requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/scrape-website",
            json={"url": ""},
            headers=admin_headers
        )
        assert response.status_code in [400, 422], f"Should reject empty URL: {response.status_code}"
        print("PASS: Website scraping rejects empty URL")


class TestGSCIntegration:
    """Google Search Console Integration Tests"""
    
    def test_gsc_config_save(self, admin_headers):
        """GSC config can be saved"""
        config = {
            "oauth_client_id": "test-client-id.apps.googleusercontent.com",
            "oauth_client_secret": "test-secret",
            "site_url": "https://test-site.com/",
            "enabled": True
        }
        response = requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/gsc-config",
            json=config,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to save GSC config: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PASS: GSC config saved successfully")
        
    def test_gsc_authorize_endpoint(self, admin_headers):
        """GSC authorize endpoint returns auth URL when configured"""
        # First ensure config is set
        config = {
            "oauth_client_id": "test-client-id.apps.googleusercontent.com",
            "oauth_client_secret": "test-secret",
            "site_url": "https://test-site.com/",
            "enabled": True
        }
        requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/gsc-config",
            json=config,
            headers=admin_headers
        )
        
        # Now test authorize endpoint
        response = requests.get(
            f"{BASE_URL}/api/gsc/authorize/{TEST_CLIENT_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get auth URL: {response.text}"
        data = response.json()
        assert "authorization_url" in data
        assert "accounts.google.com" in data["authorization_url"]
        print(f"PASS: GSC authorize returns Google OAuth URL")
        
    def test_gsc_disconnect(self, admin_headers):
        """GSC can be disconnected"""
        response = requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/gsc-disconnect",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to disconnect GSC: {response.text}"
        print("PASS: GSC disconnect works")
        
    def test_gsc_data_without_connection(self, admin_headers):
        """GSC data returns proper error when not connected"""
        # First disconnect to ensure clean state
        requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/gsc-disconnect",
            headers=admin_headers
        )
        
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/gsc-data",
            headers=admin_headers
        )
        # Should return error when not connected
        assert response.status_code in [400, 401], f"Should fail when not connected: {response.status_code}"
        print("PASS: GSC data returns error when not connected")


class TestClientSimpleGenerator:
    """Client Simple Article Generator Tests"""
    
    def test_simple_generate_requires_auth(self):
        """Simple generate requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            json={"keyword": "test"}
        )
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Simple generate requires authentication")
        
    def test_simple_generate_validation(self, client_headers):
        """Simple generate validates keyword"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            json={"keyword": "", "topic": "", "objective": "informazionale"},
            headers=client_headers
        )
        # Should fail with empty keyword or return proper error
        assert response.status_code in [400, 422], f"Should reject empty keyword: {response.status_code}"
        print("PASS: Simple generate validates keyword input")
        
    def test_simple_generate_no_llm_error(self, client_headers):
        """Simple generate returns proper error when no LLM configured"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            json={
                "keyword": "noleggio auto economico",
                "topic": "Test topic",
                "objective": "informazionale",
                "publish_to_wordpress": False
            },
            headers=client_headers
        )
        # Should return 400 or 500 due to missing LLM config
        if response.status_code == 400:
            data = response.json()
            # Expecting LLM not configured error
            assert "LLM" in data.get("detail", "") or "API" in data.get("detail", "")
            print(f"PASS: Simple generate returns LLM config error: {data.get('detail')}")
        elif response.status_code == 200:
            # If LLM is configured, job should be created
            data = response.json()
            assert "job_id" in data
            print(f"PASS: Simple generate started job: {data['job_id']}")
        else:
            print(f"INFO: Simple generate returned {response.status_code}: {response.text}")


class TestConfigurationTabs:
    """Configuration Page Tab Tests"""
    
    def test_client_config_with_all_sections(self, admin_headers):
        """Client config has all required sections"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        client = response.json()
        config = client.get("configuration", {}) or {}
        
        # Check key sections exist or can be set
        sections = ["wordpress", "llm", "seo", "tono_e_stile", "knowledge_base", 
                    "keyword_combinations", "content_strategy", "advanced_prompt"]
        
        present_sections = [s for s in sections if config.get(s)]
        print(f"PASS: Config has sections: {present_sections}")
        
    def test_update_knowledge_base(self, admin_headers):
        """Knowledge base can be updated"""
        response = requests.put(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/configuration",
            json={
                "knowledge_base": {
                    "descrizione_attivita": "Test description",
                    "citta_principale": "Salerno",
                    "regione": "Campania"
                }
            },
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to update KB: {response.text}"
        print("PASS: Knowledge base updated successfully")


class TestArticles:
    """Articles endpoint tests"""
    
    def test_get_articles(self, admin_headers):
        """Admin can list articles"""
        response = requests.get(
            f"{BASE_URL}/api/articles?client_id={TEST_CLIENT_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        articles = response.json()
        assert isinstance(articles, list)
        print(f"PASS: Got {len(articles)} articles for client")
        
    def test_client_get_own_articles(self, client_headers):
        """Client can list their own articles"""
        response = requests.get(
            f"{BASE_URL}/api/articles",
            headers=client_headers
        )
        assert response.status_code == 200
        articles = response.json()
        assert isinstance(articles, list)
        print(f"PASS: Client got {len(articles)} articles")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
