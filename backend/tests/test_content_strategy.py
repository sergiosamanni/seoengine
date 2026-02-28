"""
Test Suite for Content Strategy & SEO Copywriting Features (Iteration 5)

Tests:
- Content Strategy model and fields in client configuration
- Configuration merge: saving content_strategy doesn't delete other config sections
- POST /api/articles/generate-and-publish accepts content_type and brief_override (model structure test)
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
        print(f"Content strategy found: funnel={strategy.get('funnel_stage')}, model={strategy.get('modello_copywriting')}")

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
        
        # These sections should all exist (as keys, may be null)
        expected_sections = [
            "keyword_combinations", "content_strategy"
        ]
        
        for section in expected_sections:
            assert section in config, f"Config section '{section}' missing after merge"
        
        # Verify keyword_combinations has data
        kw = config.get("keyword_combinations", {})
        assert kw is not None, "keyword_combinations should not be None"
        assert len(kw.get("servizi", [])) > 0, "servizi should have data"
        assert len(kw.get("citta_e_zone", [])) > 0, "citta_e_zone should have data"
        print(f"Config sections preserved: keyword_combinations has {len(kw.get('servizi', []))} servizi")

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
        print(f"Configuration update response: {response.json().get('message')}")
        
        # Check combinations still exist
        combos_after = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/combinations",
            headers=auth_headers
        ).json()["total"]
        
        assert combos_after == combos_before, f"Combinations changed from {combos_before} to {combos_after}"
        print(f"Combinations preserved: {combos_before} -> {combos_after}")


class TestGenerateAndPublishModelStructure:
    """
    Test that ArticleGenerateAndPublish model accepts content_type and brief_override.
    NOTE: Not actually generating articles (costs money). Testing model validation only.
    """

    def test_model_accepts_content_type_field(self, auth_headers):
        """
        Verify Pydantic model accepts content_type. 
        Expect 400 for missing API key (validation passed, business rule failed).
        """
        payload = {
            "client_id": TEST_CLIENT_ID,
            "combinations": [],  # Empty - won't generate
            "publish_to_wordpress": False,
            "content_type": "pillar_page"  # NEW field
        }
        
        response = requests.post(
            f"{BASE_URL}/api/articles/generate-and-publish",
            json=payload,
            headers=auth_headers
        )
        
        # Expected: 400 for "API Key LLM non configurata" (model validated, business rule failed)
        # NOT 422 (validation error - unknown field)
        assert response.status_code != 422, f"Pydantic should accept content_type field: {response.text}"
        print(f"Model accepts content_type field (status={response.status_code})")

    def test_model_accepts_brief_override_field(self, auth_headers):
        """Verify Pydantic model accepts brief_override dict"""
        payload = {
            "client_id": TEST_CLIENT_ID,
            "combinations": [],
            "publish_to_wordpress": False,
            "content_type": "articolo_blog",
            "brief_override": {  # NEW field
                "cta_finale": "Test CTA",
                "note_speciali": "Test notes"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/articles/generate-and-publish",
            json=payload,
            headers=auth_headers
        )
        
        # Model should accept brief_override, but return 400 for missing API key
        assert response.status_code != 422, f"Pydantic should accept brief_override field: {response.text}"
        print(f"Model accepts brief_override field (status={response.status_code})")


class TestAllConfigurationTabsData:
    """Verify all configuration sections can be fetched (may be null but key exists)"""

    def test_configuration_key_exists(self, auth_headers):
        """Test main configuration object exists"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "configuration" in data
        config = data["configuration"]
        assert config is not None, "configuration should not be None"
        print(f"Configuration exists with {len(config)} sections")

    def test_keyword_combinations_section(self, auth_headers):
        """Test keyword_combinations section - critical for generation"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        kw = config.get("keyword_combinations")
        assert kw is not None, "keyword_combinations should exist"
        assert "servizi" in kw
        assert "citta_e_zone" in kw
        assert "tipi_o_qualificatori" in kw
        assert len(kw["servizi"]) > 0, "Should have servizi configured"
        print(f"Keywords section OK: {len(kw['servizi'])} servizi, {len(kw['citta_e_zone'])} citta, {len(kw['tipi_o_qualificatori'])} tipi")

    def test_content_strategy_section(self, auth_headers):
        """Test content_strategy section - NEW feature"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        config = response.json()["configuration"]
        
        strategy = config.get("content_strategy")
        assert strategy is not None, "content_strategy should exist"
        assert strategy.get("funnel_stage") in ["TOFU", "MOFU", "BOFU"]
        assert strategy.get("modello_copywriting") in ["AIDA", "PAS", "FAB", "PASTOR", "Libero"]
        print(f"Content Strategy section OK: funnel={strategy['funnel_stage']}, model={strategy['modello_copywriting']}")


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


class TestCombinationsEndpoint:
    """Verify combinations endpoint returns expected data"""

    def test_combinations_endpoint(self, auth_headers):
        """Test GET /api/clients/{client_id}/combinations"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/combinations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "combinations" in data
        assert "total" in data
        assert data["total"] == len(data["combinations"])
        
        if data["total"] > 0:
            combo = data["combinations"][0]
            assert "servizio" in combo
            assert "citta" in combo
            assert "tipo" in combo
            assert "titolo" in combo
        
        print(f"Combinations endpoint OK: {data['total']} total")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
