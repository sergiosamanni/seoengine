"""
Test Suite for Content Strategy & SEO Copywriting Features (Iteration 5)

Tests:
- Content Strategy model and fields in client configuration
- Configuration merge: saving content_strategy doesn't delete other config sections
- POST /api/articles/generate-and-publish accepts content_type and brief_override
- All configuration tabs still work
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://seo-admin-suite-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
TEST_CLIENT_ID = "a8ab5383-b444-4f17-9465-41fa32c34bb9"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for API calls"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestContentStrategyModel:
    """Test content_strategy model fields in client configuration"""

    def test_content_strategy_exists_in_client(self, auth_headers):
        """Verify content_strategy is stored in client configuration"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        config = data.get("configuration", {})
        strategy = config.get("content_strategy")
        
        assert strategy is not None, "content_strategy should exist in config"
        print(f"Content strategy found: {strategy}")

    def test_content_strategy_has_required_fields(self, auth_headers):
        """Verify content_strategy has all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        strategy = response.json()["configuration"]["content_strategy"]
        
        # Required fields based on ContentStrategy model
        required_fields = [
            "funnel_stage", "obiettivo_primario", "modello_copywriting",
            "buyer_persona_nome", "buyer_persona_descrizione", "buyer_persona_obiezioni",
            "cta_finale", "search_intent", "leve_psicologiche",
            "keyword_secondarie", "keyword_lsi", "lunghezza_target", "note_speciali"
        ]
        
        for field in required_fields:
            assert field in strategy, f"Field '{field}' missing from content_strategy"
        
        # Validate types
        assert isinstance(strategy["leve_psicologiche"], list)
        assert isinstance(strategy["keyword_secondarie"], list)
        assert isinstance(strategy["keyword_lsi"], list)
        assert isinstance(strategy["lunghezza_target"], int)
        print(f"All {len(required_fields)} required fields present with correct types")

    def test_content_strategy_values(self, auth_headers):
        """Verify content_strategy has expected values from previous save"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        strategy = response.json()["configuration"]["content_strategy"]
        
        # Values set by main agent's curl test
        assert strategy["funnel_stage"] == "MOFU", "Funnel stage should be MOFU"
        assert strategy["modello_copywriting"] == "PAS", "Model should be PAS"
        assert strategy["buyer_persona_nome"] == "Marco - Turista"
        assert "riprova_sociale" in strategy["leve_psicologiche"]
        assert "autorita" in strategy["leve_psicologiche"]
        assert "reciprocita" in strategy["leve_psicologiche"]
        print("Content strategy values match expected configuration")


class TestConfigurationMerge:
    """Test that PUT /configuration merges instead of overwriting"""

    def test_combinations_preserved_after_strategy_save(self, auth_headers):
        """Verify keyword_combinations not deleted when saving content_strategy"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/combinations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] > 0, "Combinations should exist (not deleted by strategy save)"
        assert len(data["combinations"]) > 0
        print(f"Found {data['total']} combinations - config merge working correctly")

    def test_all_config_sections_preserved(self, auth_headers):
        """Verify all config sections exist after content_strategy was saved"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        # These sections should all exist
        expected_sections = [
            "llm", "wordpress", "seo", "tono_e_stile", 
            "knowledge_base", "keyword_combinations", "content_strategy"
        ]
        
        for section in expected_sections:
            assert section in config, f"Config section '{section}' missing after merge"
        
        # Verify keyword_combinations has data
        kw = config.get("keyword_combinations", {})
        assert len(kw.get("servizi", [])) > 0, "servizi should have data"
        assert len(kw.get("citta_e_zone", [])) > 0, "citta_e_zone should have data"
        print(f"All {len(expected_sections)} config sections preserved")

    def test_update_content_strategy_preserves_combinations(self, auth_headers):
        """Test that updating content_strategy doesn't delete combinations"""
        # First get current combination count
        combos_before = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/combinations",
            headers=auth_headers
        ).json()["total"]
        
        # Update only content_strategy
        update_payload = {
            "content_strategy": {
                "funnel_stage": "MOFU",
                "modello_copywriting": "PAS",
                "note_speciali": f"Test update - combinations should be preserved ({combos_before} before)"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/configuration",
            json=update_payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"Configuration update response: {response.json()}")
        
        # Check combinations still exist
        combos_after = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/combinations",
            headers=auth_headers
        ).json()["total"]
        
        assert combos_after == combos_before, f"Combinations changed from {combos_before} to {combos_after}"
        print(f"Combinations preserved: {combos_before} -> {combos_after}")


class TestGenerateAndPublishEndpoint:
    """Test that POST /api/articles/generate-and-publish accepts new fields"""

    def test_endpoint_accepts_content_type(self, auth_headers):
        """Verify endpoint accepts content_type field"""
        # Get one combination
        combos = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/combinations",
            headers=auth_headers
        ).json()["combinations"][:1]
        
        # NOTE: We're NOT actually generating (costs money) - just checking the endpoint accepts the payload
        # Using a minimal payload with publish_to_wordpress=false to avoid actual generation
        payload = {
            "client_id": TEST_CLIENT_ID,
            "combinations": [],  # Empty - won't generate anything
            "publish_to_wordpress": False,
            "content_type": "pillar_page"  # NEW field
        }
        
        # The endpoint should accept the payload structure even with empty combinations
        # It will return a job_id but process nothing
        response = requests.post(
            f"{BASE_URL}/api/articles/generate-and-publish",
            json=payload,
            headers=auth_headers
        )
        
        # Should be 200 (returns job_id) or error only if required fields missing
        assert response.status_code == 200, f"Endpoint should accept content_type: {response.text}"
        data = response.json()
        assert "job_id" in data
        print(f"Endpoint accepted content_type=pillar_page, job_id: {data['job_id']}")

    def test_endpoint_accepts_brief_override(self, auth_headers):
        """Verify endpoint accepts brief_override field"""
        payload = {
            "client_id": TEST_CLIENT_ID,
            "combinations": [],  # Empty - won't generate
            "publish_to_wordpress": False,
            "content_type": "articolo_blog",
            "brief_override": {  # NEW field
                "cta_finale": "Test CTA for this generation",
                "note_speciali": "Test notes override"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/articles/generate-and-publish",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Endpoint should accept brief_override: {response.text}"
        data = response.json()
        assert "job_id" in data
        print(f"Endpoint accepted brief_override, job_id: {data['job_id']}")

    def test_content_types_valid(self, auth_headers):
        """Test all valid content_type values are accepted"""
        content_types = ["articolo_blog", "pillar_page", "landing_page"]
        
        for ct in content_types:
            payload = {
                "client_id": TEST_CLIENT_ID,
                "combinations": [],
                "publish_to_wordpress": False,
                "content_type": ct
            }
            
            response = requests.post(
                f"{BASE_URL}/api/articles/generate-and-publish",
                json=payload,
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"content_type={ct} should be accepted: {response.text}"
        
        print(f"All {len(content_types)} content types accepted")


class TestAllConfigurationTabs:
    """Verify all configuration sections can be fetched and updated"""

    def test_api_keys_section(self, auth_headers):
        """Test llm/wordpress/apify sections"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        assert "llm" in config
        assert "wordpress" in config
        llm = config["llm"]
        assert "provider" in llm
        assert "api_key" in llm
        print(f"API Keys section OK: provider={llm['provider']}")

    def test_knowledge_base_section(self, auth_headers):
        """Test knowledge_base section"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        assert "knowledge_base" in config
        kb = config["knowledge_base"]
        assert "descrizione_attivita" in kb
        assert "citta_principale" in kb
        print(f"Knowledge Base section OK: citta={kb.get('citta_principale')}")

    def test_tone_style_section(self, auth_headers):
        """Test tono_e_stile section"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        assert "tono_e_stile" in config
        tone = config["tono_e_stile"]
        assert "registro" in tone
        assert "persona_narrativa" in tone
        print(f"Tone & Style section OK: registro={tone.get('registro')}")

    def test_keywords_section(self, auth_headers):
        """Test keyword_combinations section"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        assert "keyword_combinations" in config
        kw = config["keyword_combinations"]
        assert "servizi" in kw
        assert "citta_e_zone" in kw
        assert "tipi_o_qualificatori" in kw
        assert len(kw["servizi"]) > 0
        print(f"Keywords section OK: {len(kw['servizi'])} servizi, {len(kw['citta_e_zone'])} citta")

    def test_serp_analysis_available(self, auth_headers):
        """Test SERP analysis endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/serp-analyses",
            headers=auth_headers
        )
        # Either 200 with results or empty list
        assert response.status_code == 200
        print(f"SERP analyses endpoint OK: {len(response.json())} analyses found")

    def test_advanced_prompt_section(self, auth_headers):
        """Test advanced_prompt section"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        # advanced_prompt may not be set initially
        if "advanced_prompt" in config:
            ap = config["advanced_prompt"]
            assert "secondo_livello_prompt" in ap
            print(f"Advanced Prompt section present")
        else:
            print("Advanced Prompt section not set (optional)")


class TestActivityLog:
    """Verify Activity Log still works"""

    def test_activity_log_endpoint(self, auth_headers):
        """Test GET /api/activity-logs/{client_id} works"""
        response = requests.get(
            f"{BASE_URL}/api/activity-logs/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        logs = response.json()
        assert isinstance(logs, list)
        print(f"Activity Log working: {len(logs)} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
