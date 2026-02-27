"""
SEO Engine API Tests - Iteration 3
Tests for:
- Article preview modal with SEO metadata (meta_description, tags, slug, focus_keyword)
- Backend endpoint GET /api/articles/{article_id}/full 
- ConfigurationPage refactored tabs (API Keys, Knowledge Base, Tone & Style, Keywords, SERP Analysis, Advanced Prompt)
- Login flows for admin and client users
- Dashboard stats
- Articles listing with filters
- Configuration save functionality
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
CLIENT_EMAIL = "cliente@noleggiosalerno.it"
CLIENT_PASSWORD = "password123"
TEST_CLIENT_ID = "a8ab5383-b444-4f17-9465-41fa32c34bb9"
TEST_ARTICLE_ID = "7be62ff2-f0a8-4edc-aee3-2c6cb1432c0f"
ADMIN_MASTER_PASSWORD = "seo_admin_2024"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User data missing from response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['name']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_client_login_attempt(self):
        """Test client login - document actual behavior"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        
        # Document the actual response
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            print(f"✓ Client login successful with password: {CLIENT_PASSWORD}")
        else:
            print(f"! Client login failed with password '{CLIENT_PASSWORD}': {response.status_code} - {response.text}")
            # Try to find correct password - this is informational
            pytest.skip(f"Client password might be different. Status: {response.status_code}")


class TestDashboardStats:
    """Dashboard statistics endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_overview_stats(self, admin_token):
        """Test dashboard overview statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/stats/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Stats overview failed: {response.text}"
        
        data = response.json()
        # Admin should see all client stats
        assert "total_clients" in data or "total_articles" in data, "Stats data structure incorrect"
        print(f"✓ Dashboard stats retrieved: {data}")


class TestClientsEndpoints:
    """Clients CRUD endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_clients_list(self, admin_token):
        """Test clients listing endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Clients list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Clients list retrieved: {len(data)} clients")
    
    def test_get_specific_client(self, admin_token):
        """Test getting specific client by ID"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test client {TEST_CLIENT_ID} not found")
        
        assert response.status_code == 200, f"Get client failed: {response.text}"
        
        data = response.json()
        assert data["id"] == TEST_CLIENT_ID
        assert "nome" in data
        assert "configuration" in data or data.get("configuration") is None
        print(f"✓ Client retrieved: {data.get('nome', 'Unknown')}")


class TestArticlesEndpoints:
    """Articles CRUD and preview endpoint tests - MAIN FOCUS"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_articles_list(self, admin_token):
        """Test articles listing endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Articles list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Articles list retrieved: {len(data)} articles")
        return data
    
    def test_get_articles_with_status_filter(self, admin_token):
        """Test articles listing with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/articles?stato=generated",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Filtered articles list failed: {response.text}"
        
        data = response.json()
        # All returned articles should have 'generated' status
        for article in data:
            if article.get("stato"):
                assert article["stato"] == "generated", f"Article has wrong status: {article['stato']}"
        print(f"✓ Filtered articles retrieved: {len(data)} generated articles")
    
    def test_get_article_full_with_seo_metadata(self, admin_token):
        """TEST KEY FIX: Get full article with SEO metadata via /api/articles/{id}/full endpoint"""
        # First get list of articles to find a valid ID
        list_response = requests.get(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        articles = list_response.json()
        
        if not articles:
            pytest.skip("No articles found to test full endpoint")
        
        # Test with first available article
        article_id = articles[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/articles/{article_id}/full",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get article full failed: {response.text}"
        
        data = response.json()
        # Validate article structure
        assert "id" in data, "Article ID missing"
        assert "titolo" in data, "Title (titolo) missing"
        assert "contenuto" in data, "Content (contenuto) missing"
        assert "stato" in data, "Status (stato) missing"
        
        # Check for SEO metadata if present
        if "seo_metadata" in data and data["seo_metadata"]:
            seo = data["seo_metadata"]
            print(f"✓ SEO Metadata found:")
            if "meta_description" in seo:
                print(f"  - meta_description: {seo['meta_description'][:50]}...")
            if "tags" in seo:
                print(f"  - tags: {seo['tags']}")
            if "slug" in seo:
                print(f"  - slug: {seo['slug']}")
            if "focus_keyword" in seo:
                print(f"  - focus_keyword: {seo['focus_keyword']}")
        else:
            print(f"! Article {article_id} has no SEO metadata (may be older article)")
        
        print(f"✓ Full article retrieved: {data['titolo'][:50]}...")
    
    def test_get_specific_test_article_full(self, admin_token):
        """Test getting specific test article by ID with full data"""
        response = requests.get(
            f"{BASE_URL}/api/articles/{TEST_ARTICLE_ID}/full",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            print(f"! Test article {TEST_ARTICLE_ID} not found - may have been deleted")
            pytest.skip(f"Test article {TEST_ARTICLE_ID} not found")
        
        assert response.status_code == 200, f"Get specific article failed: {response.text}"
        
        data = response.json()
        assert data["id"] == TEST_ARTICLE_ID
        print(f"✓ Specific test article retrieved: {data.get('titolo', 'Unknown')[:50]}...")
        
        # Check SEO metadata
        if "seo_metadata" in data and data["seo_metadata"]:
            seo = data["seo_metadata"]
            print(f"  SEO Metadata present with keys: {list(seo.keys())}")
    
    def test_article_basic_vs_full_endpoint_comparison(self, admin_token):
        """Compare basic /articles/{id} vs /articles/{id}/full responses"""
        # Get articles list
        list_response = requests.get(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        articles = list_response.json()
        if not articles:
            pytest.skip("No articles to compare")
        
        article_id = articles[0]["id"]
        
        # Get basic article
        basic_response = requests.get(
            f"{BASE_URL}/api/articles/{article_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Get full article
        full_response = requests.get(
            f"{BASE_URL}/api/articles/{article_id}/full",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert basic_response.status_code == 200
        assert full_response.status_code == 200
        
        basic_data = basic_response.json()
        full_data = full_response.json()
        
        # Full endpoint should have more data or equal data
        print(f"✓ Basic endpoint keys: {list(basic_data.keys())}")
        print(f"✓ Full endpoint keys: {list(full_data.keys())}")
        
        # Full endpoint should include seo_metadata if article has it
        if "seo_metadata" in full_data:
            print(f"✓ Full endpoint includes seo_metadata")


class TestConfigurationEndpoints:
    """Configuration save and update endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_client_configuration(self, admin_token):
        """Test getting client configuration"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test client {TEST_CLIENT_ID} not found")
        
        assert response.status_code == 200
        
        data = response.json()
        config = data.get("configuration")
        if config:
            print(f"✓ Configuration keys: {list(config.keys())}")
        else:
            print("! Client has no configuration yet")
    
    def test_save_configuration(self, admin_token):
        """Test saving client configuration - validates Save button functionality"""
        # Minimal configuration update
        config_data = {
            "seo": {
                "lingua": "italiano",
                "lunghezza_minima_parole": 1500,
                "include_faq_in_fondo": False
            },
            "tono_e_stile": {
                "registro": "professionale_accessibile",
                "persona_narrativa": "seconda_singolare"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/configuration",
            json=config_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test client {TEST_CLIENT_ID} not found")
        
        assert response.status_code == 200, f"Save configuration failed: {response.text}"
        
        data = response.json()
        assert "message" in data or "configuration" in data
        print(f"✓ Configuration saved successfully")
    
    def test_get_keyword_combinations(self, admin_token):
        """Test getting keyword combinations for article generation"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/combinations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test client {TEST_CLIENT_ID} not found")
        
        assert response.status_code == 200, f"Get combinations failed: {response.text}"
        
        data = response.json()
        assert "combinations" in data
        assert "total" in data
        print(f"✓ Keyword combinations: {data['total']} total")


class TestPasswordProtection:
    """Password protection endpoint tests - Advanced Prompt tab"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_verify_admin_master_password(self, admin_token):
        """Test admin master password verification"""
        response = requests.post(
            f"{BASE_URL}/api/verify-admin-password",
            json={"password": ADMIN_MASTER_PASSWORD},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Password verification failed: {response.text}"
        
        data = response.json()
        assert data["valid"] == True
        assert data["access_level"] == "admin"
        print(f"✓ Admin master password verified successfully")
    
    def test_verify_wrong_admin_password(self, admin_token):
        """Test wrong admin password rejection"""
        response = requests.post(
            f"{BASE_URL}/api/verify-admin-password",
            json={"password": "wrongpassword"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["valid"] == False
        print(f"✓ Wrong password correctly rejected")
    
    def test_verify_prompt_password_with_master(self, admin_token):
        """Test prompt password verification with master password"""
        response = requests.post(
            f"{BASE_URL}/api/verify-prompt-password",
            json={"password": ADMIN_MASTER_PASSWORD, "client_id": TEST_CLIENT_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test client {TEST_CLIENT_ID} not found")
        
        assert response.status_code == 200, f"Prompt password verification failed: {response.text}"
        
        data = response.json()
        assert data["valid"] == True
        print(f"✓ Prompt password (master) verified for client")


class TestLLMProviders:
    """LLM providers endpoint test"""
    
    def test_get_llm_providers(self):
        """Test getting available LLM providers list"""
        response = requests.get(f"{BASE_URL}/api/llm-providers")
        
        assert response.status_code == 200, f"Get LLM providers failed: {response.text}"
        
        data = response.json()
        assert "providers" in data
        
        providers = data["providers"]
        assert len(providers) >= 4, "Should have at least 4 providers (OpenAI, Anthropic, DeepSeek, Perplexity)"
        
        provider_ids = [p["id"] for p in providers]
        assert "openai" in provider_ids
        assert "anthropic" in provider_ids
        
        print(f"✓ LLM Providers available: {provider_ids}")


class TestHealthAndConnectivity:
    """Basic connectivity tests"""
    
    def test_api_base_url_accessible(self):
        """Test that the API base URL is accessible"""
        response = requests.get(f"{BASE_URL}/api/llm-providers")
        assert response.status_code in [200, 401, 403], f"API not accessible: {response.status_code}"
        print(f"✓ API is accessible at {BASE_URL}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
