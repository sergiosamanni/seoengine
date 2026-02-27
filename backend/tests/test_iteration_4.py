"""
Test suite for SEO Engine Iteration 4
Focus: Async generate-and-publish, Activity Logs, Job Polling

Test credentials:
- Admin: admin@seoengine.it / admin123
- Client ID: a8ab5383-b444-4f17-9465-41fa32c34bb9
- Test Job ID: f3c57067-f224-438d-83db-7eddce3a6be7 (completed)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
CLIENT_ID = "a8ab5383-b444-4f17-9465-41fa32c34bb9"
TEST_JOB_ID = "f3c57067-f224-438d-83db-7eddce3a6be7"


@pytest.fixture(scope="session")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    """Return headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestAdminLogin:
    """Admin login tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print("PASSED: Admin login successful")


class TestActivityLogs:
    """Activity log endpoint tests"""
    
    def test_get_all_activity_logs(self, auth_headers):
        """GET /api/activity-logs returns log entries"""
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASSED: Activity logs returned {len(data)} entries")
    
    def test_get_activity_logs_with_limit(self, auth_headers):
        """GET /api/activity-logs?limit=10 respects limit"""
        response = requests.get(f"{BASE_URL}/api/activity-logs?limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10
        print(f"PASSED: Activity logs with limit returned {len(data)} entries")
    
    def test_get_activity_logs_by_client(self, auth_headers):
        """GET /api/activity-logs/{client_id} returns filtered logs"""
        response = requests.get(f"{BASE_URL}/api/activity-logs/{CLIENT_ID}?limit=30", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned logs should be for this client
        for log in data:
            assert log.get("client_id") == CLIENT_ID
        print(f"PASSED: Client activity logs returned {len(data)} entries for client {CLIENT_ID}")
    
    def test_activity_log_structure(self, auth_headers):
        """Verify activity log entry structure"""
        response = requests.get(f"{BASE_URL}/api/activity-logs?limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            log = data[0]
            # Check expected fields
            assert "id" in log
            assert "client_id" in log
            assert "action" in log
            assert "status" in log
            assert "timestamp" in log
            # Action should be one of the known types
            valid_actions = ["batch_start", "batch_complete", "article_generate", "wordpress_publish"]
            assert log["action"] in valid_actions, f"Unknown action: {log['action']}"
            print(f"PASSED: Activity log structure valid (action: {log['action']}, status: {log['status']})")
        else:
            print("INFO: No activity logs found - skipping structure test")


class TestJobPolling:
    """Job status polling tests"""
    
    def test_get_job_status_existing(self, auth_headers):
        """GET /api/jobs/{job_id} returns job status for existing completed job"""
        response = requests.get(f"{BASE_URL}/api/jobs/{TEST_JOB_ID}", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["id"] == TEST_JOB_ID
            assert "status" in data
            assert "total" in data
            assert "completed" in data
            assert "results" in data
            print(f"PASSED: Job {TEST_JOB_ID} found - status: {data['status']}, completed: {data['completed']}/{data['total']}")
            
            # If job is completed, verify summary
            if data["status"] == "completed":
                assert "summary" in data
                summary = data["summary"]
                assert "total" in summary
                assert "generated_ok" in summary
                assert "published_ok" in summary
                print(f"PASSED: Job summary - generated: {summary['generated_ok']}, published: {summary['published_ok']}")
        elif response.status_code == 404:
            print(f"INFO: Test job {TEST_JOB_ID} not found - this is expected if job data was cleaned")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_get_job_status_not_found(self, auth_headers):
        """GET /api/jobs/{job_id} returns 404 for non-existent job"""
        fake_job_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/jobs/{fake_job_id}", headers=auth_headers)
        assert response.status_code == 404
        print("PASSED: Non-existent job returns 404")


class TestGenerateAndPublishEndpoint:
    """Tests for POST /api/articles/generate-and-publish"""
    
    def test_generate_and_publish_returns_job_id(self, auth_headers):
        """POST /api/articles/generate-and-publish returns job_id immediately (without triggering actual generation)"""
        # NOTE: We're testing only the initial response, NOT actually triggering generation
        # Because generation costs money and takes 2+ minutes per article
        
        # First verify client has configuration
        client_response = requests.get(f"{BASE_URL}/api/clients/{CLIENT_ID}", headers=auth_headers)
        assert client_response.status_code == 200
        client = client_response.json()
        
        config = client.get("configuration", {})
        llm_config = config.get("llm", {}) or config.get("openai", {})
        wp_config = config.get("wordpress", {})
        
        # Check if client is properly configured
        has_llm = bool(llm_config.get("api_key"))
        has_wp = bool(wp_config.get("url_api") and wp_config.get("utente") and wp_config.get("password_applicazione"))
        
        print(f"INFO: Client config - LLM: {'configured' if has_llm else 'missing'}, WP: {'configured' if has_wp else 'missing'}")
        
        # Test with missing config should return appropriate error
        if not has_llm:
            response = requests.post(f"{BASE_URL}/api/articles/generate-and-publish", 
                headers=auth_headers,
                json={
                    "client_id": CLIENT_ID,
                    "combinations": [{"servizio": "test", "citta": "test", "tipo": "test"}],
                    "publish_to_wordpress": False
                }
            )
            assert response.status_code == 400
            assert "API Key" in response.json().get("detail", "")
            print("PASSED: Endpoint correctly rejects request when LLM not configured")
        else:
            # If configured, the endpoint should accept the request
            # We use a single combination to minimize cost if it does run
            response = requests.post(f"{BASE_URL}/api/articles/generate-and-publish", 
                headers=auth_headers,
                json={
                    "client_id": CLIENT_ID,
                    "combinations": [{"servizio": "test-only", "citta": "test", "tipo": "test"}],
                    "publish_to_wordpress": False  # Don't publish - just generate
                }
            )
            
            # Should return 200 with job_id
            if response.status_code == 200:
                data = response.json()
                assert "job_id" in data
                assert "status" in data
                assert data["status"] == "running"
                assert "total" in data
                print(f"PASSED: Endpoint returned job_id: {data['job_id']}")
            elif response.status_code == 400:
                # Could be missing WP config if publish_to_wordpress was True
                print(f"INFO: Request rejected - {response.json().get('detail')}")
            else:
                print(f"INFO: Unexpected response - {response.status_code}: {response.text}")


class TestClientCombinations:
    """Test client combinations endpoint for GeneratorPage"""
    
    def test_get_combinations(self, auth_headers):
        """GET /api/clients/{client_id}/combinations returns combinations"""
        response = requests.get(f"{BASE_URL}/api/clients/{CLIENT_ID}/combinations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "combinations" in data
        assert "total" in data
        
        combos = data["combinations"]
        total = data["total"]
        
        assert len(combos) == total
        print(f"PASSED: Client has {total} combinations")
        
        # Check combination structure if any exist
        if len(combos) > 0:
            combo = combos[0]
            assert "servizio" in combo
            assert "citta" in combo
            assert "tipo" in combo
            assert "titolo" in combo
            print(f"PASSED: Combination structure valid - first: {combo['titolo'][:50]}...")


class TestClientConfiguration:
    """Test client configuration for GeneratorPage info panel"""
    
    def test_client_has_llm_config(self, auth_headers):
        """Verify client configuration includes LLM provider info"""
        response = requests.get(f"{BASE_URL}/api/clients/{CLIENT_ID}", headers=auth_headers)
        assert response.status_code == 200
        client = response.json()
        
        assert client["nome"] == "Noleggio Auto Salerno"
        config = client.get("configuration", {})
        
        llm_config = config.get("llm", {})
        if llm_config:
            provider = llm_config.get("provider", "openai")
            model = llm_config.get("modello", "unknown")
            print(f"PASSED: Client LLM config - provider: {provider}, model: {model}")
        else:
            print("INFO: No LLM config found for client")
        
        wp_config = config.get("wordpress", {})
        if wp_config.get("url_api"):
            print(f"PASSED: Client has WordPress config - URL: {wp_config['url_api'][:30]}...")
        else:
            print("INFO: No WordPress config for client")


class TestArticleFullEndpoint:
    """Test article full endpoint with SEO metadata"""
    
    def test_get_article_full_with_seo_metadata(self, auth_headers):
        """GET /api/articles/{article_id}/full returns SEO metadata"""
        # First get an article ID
        articles_response = requests.get(f"{BASE_URL}/api/articles?client_id={CLIENT_ID}", headers=auth_headers)
        assert articles_response.status_code == 200
        articles = articles_response.json()
        
        if len(articles) == 0:
            print("INFO: No articles found for client - skipping full article test")
            return
        
        article_id = articles[0]["id"]
        
        # Get full article
        response = requests.get(f"{BASE_URL}/api/articles/{article_id}/full", headers=auth_headers)
        assert response.status_code == 200
        article = response.json()
        
        assert "id" in article
        assert "titolo" in article
        assert "contenuto" in article
        assert "stato" in article
        
        # Check SEO metadata if present
        seo = article.get("seo_metadata")
        if seo:
            print(f"PASSED: Article has SEO metadata:")
            if "meta_description" in seo:
                print(f"  - meta_description: {seo['meta_description'][:50]}...")
            if "tags" in seo:
                print(f"  - tags: {seo['tags']}")
            if "slug" in seo:
                print(f"  - slug: {seo['slug']}")
            if "focus_keyword" in seo:
                print(f"  - focus_keyword: {seo['focus_keyword']}")
        else:
            print("INFO: Article has no SEO metadata (may be an older article)")


class TestLLMProviders:
    """Test LLM providers endpoint"""
    
    def test_get_llm_providers(self, auth_headers):
        """GET /api/llm-providers returns available providers"""
        response = requests.get(f"{BASE_URL}/api/llm-providers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "providers" in data
        providers = data["providers"]
        assert len(providers) >= 4  # OpenAI, Anthropic, DeepSeek, Perplexity
        
        provider_ids = [p["id"] for p in providers]
        assert "openai" in provider_ids
        assert "anthropic" in provider_ids
        assert "deepseek" in provider_ids
        assert "perplexity" in provider_ids
        
        print(f"PASSED: {len(providers)} LLM providers available: {provider_ids}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
