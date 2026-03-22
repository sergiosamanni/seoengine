"""
Iteration 12: Test Gutenberg conversion, H1 sanitization, meta description limits, and upload validation
Features tested:
1. helpers.py - convert_to_gutenberg_blocks creates wp:heading, wp:paragraph blocks
2. helpers.py - sanitize_single_h1 removes duplicate H1 tags (keeps first)
3. helpers.py - generate_seo_metadata meta_description never exceeds 155 chars
4. helpers.py - meta_description ends with complete word and punctuation
5. Upload endpoint - validation for non-image and >5MB files
6. API structure verification
"""

import pytest
import requests
import os
import io
import sys

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')
if BASE_URL and BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Set up environment for helpers import
os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test_database')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
CLIENT_EMAIL = "testclient@test.it"
CLIENT_PASSWORD = "test123"


class TestHelperFunctions:
    """Test helper functions directly - Gutenberg, H1 sanitization, meta description"""
    
    def test_sanitize_single_h1_removes_duplicates(self):
        """sanitize_single_h1 should keep only the first H1 tag"""
        # Add backend to path for import
        sys.path.insert(0, '/app/backend')
        from helpers import sanitize_single_h1
        
        # Test with multiple H1s
        html_multi_h1 = """
        <h1>First Title</h1>
        <p>Some content</p>
        <h1>Second Title Should Be Removed</h1>
        <p>More content</p>
        <h1 class="extra">Third Title Also Removed</h1>
        """
        
        result = sanitize_single_h1(html_multi_h1)
        
        # Count H1 tags in result
        h1_count = result.lower().count('<h1')
        assert h1_count == 1, f"Expected 1 H1, found {h1_count}"
        assert "First Title" in result, "First H1 should be preserved"
        assert "Second Title Should Be Removed" not in result, "Second H1 should be removed"
        assert "Third Title Also Removed" not in result, "Third H1 should be removed"
        print("PASS: sanitize_single_h1 removes duplicate H1 tags, keeps first")
    
    def test_sanitize_single_h1_no_change_single(self):
        """sanitize_single_h1 should not modify HTML with single H1"""
        sys.path.insert(0, '/app/backend')
        from helpers import sanitize_single_h1
        
        html_single_h1 = "<h1>Only Title</h1><p>Content here</p>"
        result = sanitize_single_h1(html_single_h1)
        
        assert "<h1>Only Title</h1>" in result, "Single H1 should be preserved"
        assert result.lower().count('<h1') == 1, "Should still have exactly 1 H1"
        print("PASS: sanitize_single_h1 preserves content with single H1")
    
    def test_sanitize_single_h1_no_h1(self):
        """sanitize_single_h1 should not modify HTML without H1"""
        sys.path.insert(0, '/app/backend')
        from helpers import sanitize_single_h1
        
        html_no_h1 = "<h2>Subheading</h2><p>Content</p>"
        result = sanitize_single_h1(html_no_h1)
        
        assert result == html_no_h1, "HTML without H1 should be unchanged"
        print("PASS: sanitize_single_h1 handles HTML without H1")
    
    def test_convert_to_gutenberg_blocks_headings(self):
        """convert_to_gutenberg_blocks should wrap headings in wp:heading blocks"""
        sys.path.insert(0, '/app/backend')
        from helpers import convert_to_gutenberg_blocks
        
        html = "<h1>Main Title</h1><h2>Section Title</h2><h3>Subsection</h3>"
        result = convert_to_gutenberg_blocks(html)
        
        # Check for Gutenberg heading blocks
        assert "<!-- wp:heading" in result, "Should contain wp:heading comment"
        assert '{"level":1}' in result, "H1 should have level 1"
        assert '{"level":2}' in result, "H2 should have level 2"
        assert '{"level":3}' in result, "H3 should have level 3"
        assert "<!-- /wp:heading -->" in result, "Should contain closing wp:heading"
        print("PASS: convert_to_gutenberg_blocks creates wp:heading blocks with correct levels")
    
    def test_convert_to_gutenberg_blocks_paragraphs(self):
        """convert_to_gutenberg_blocks should wrap paragraphs in wp:paragraph blocks"""
        sys.path.insert(0, '/app/backend')
        from helpers import convert_to_gutenberg_blocks
        
        html = "<p>First paragraph content.</p><p>Second paragraph here.</p>"
        result = convert_to_gutenberg_blocks(html)
        
        assert "<!-- wp:paragraph -->" in result, "Should contain wp:paragraph comment"
        assert "<!-- /wp:paragraph -->" in result, "Should contain closing wp:paragraph"
        assert result.count("<!-- wp:paragraph -->") >= 2, "Should have at least 2 paragraph blocks"
        print("PASS: convert_to_gutenberg_blocks creates wp:paragraph blocks")
    
    def test_convert_to_gutenberg_blocks_lists(self):
        """convert_to_gutenberg_blocks should wrap lists in wp:list blocks"""
        sys.path.insert(0, '/app/backend')
        from helpers import convert_to_gutenberg_blocks
        
        html = "<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Num 1</li></ol>"
        result = convert_to_gutenberg_blocks(html)
        
        assert "<!-- wp:list -->" in result, "Should contain wp:list for unordered list"
        assert '<!-- wp:list {"ordered":true} -->' in result, "Should contain wp:list with ordered:true"
        print("PASS: convert_to_gutenberg_blocks creates wp:list blocks (ordered and unordered)")
    
    def test_convert_to_gutenberg_removes_duplicate_h1(self):
        """convert_to_gutenberg_blocks should call sanitize_single_h1 first"""
        sys.path.insert(0, '/app/backend')
        from helpers import convert_to_gutenberg_blocks
        
        html = "<h1>Keep This</h1><p>Content</p><h1>Remove This</h1>"
        result = convert_to_gutenberg_blocks(html)
        
        # Should only have one H1 block
        h1_block_count = result.count('{"level":1}')
        assert h1_block_count == 1, f"Expected 1 H1 block, found {h1_block_count}"
        assert "Keep This" in result, "First H1 content should be preserved"
        # The second H1 should be removed before Gutenberg conversion
        print("PASS: convert_to_gutenberg_blocks sanitizes H1 duplicates first")
    
    def test_meta_description_max_155_chars(self):
        """generate_seo_metadata should produce meta_description <= 155 chars"""
        sys.path.insert(0, '/app/backend')
        from helpers import generate_seo_metadata
        
        # Create test data that would generate a long description
        title = "Noleggio Auto a Lungo Termine per Privati e Aziende - Guida Completa"
        content = "Content about car rental services..."
        kb = {
            "citta_principale": "Milano",
            "descrizione_attivita": "Azienda leader nel noleggio auto",
            "punti_di_forza": [
                "Oltre 20 anni di esperienza nel settore automobilistico",
                "Flotta di oltre 5000 veicoli sempre disponibili",
                "Assistenza clienti 24 ore su 24, 7 giorni su 7"
            ],
            "call_to_action_principale": "Richiedi un preventivo gratuito oggi stesso senza impegno"
        }
        combination = {
            "servizio": "noleggio auto lungo termine",
            "citta": "Milano",
            "tipo": "commerciale"
        }
        
        result = generate_seo_metadata(title, content, kb, combination)
        meta_desc = result.get("meta_description", "")
        
        assert len(meta_desc) <= 155, f"Meta description too long: {len(meta_desc)} chars (max 155)\nContent: {meta_desc}"
        assert len(meta_desc) > 50, f"Meta description too short: {len(meta_desc)} chars"
        print(f"PASS: meta_description length = {len(meta_desc)} chars (max 155)\nContent: {meta_desc}")
    
    def test_meta_description_ends_complete_word(self):
        """generate_seo_metadata meta_description should end with complete word and punctuation"""
        sys.path.insert(0, '/app/backend')
        from helpers import generate_seo_metadata
        
        title = "Test Title"
        content = "Test content"
        kb = {
            "citta_principale": "Roma",
            "punti_di_forza": ["Qualita superiore garantita sempre"],
            "call_to_action_principale": "Contattaci ora per un preventivo gratuito"
        }
        combination = {
            "servizio": "consulenza aziendale strategica",
            "citta": "Roma",
            "tipo": "informazionale"
        }
        
        result = generate_seo_metadata(title, content, kb, combination)
        meta_desc = result.get("meta_description", "")
        
        # Check ends with punctuation (. ! ? :)
        assert meta_desc[-1] in '.!?:', f"Meta description should end with punctuation, got: '{meta_desc[-10:]}'"
        
        # Check not ending with incomplete word (no trailing spaces before punctuation from truncation)
        words = meta_desc.rstrip('.!?:').split()
        if words:
            last_word = words[-1]
            # Last word should be a complete word (not a fragment)
            assert len(last_word) >= 2 or last_word in ['a', 'e', 'i', 'o', 'u'], f"Last word seems incomplete: '{last_word}'"
        
        print(f"PASS: meta_description ends with complete word and punctuation: '...{meta_desc[-30:]}'")
    
    def test_meta_description_various_inputs(self):
        """Test meta_description with various input combinations"""
        sys.path.insert(0, '/app/backend')
        from helpers import generate_seo_metadata
        
        test_cases = [
            {
                "title": "Short Title",
                "kb": {"citta_principale": "Napoli", "punti_di_forza": [], "call_to_action_principale": ""},
                "combination": {"servizio": "test", "citta": "Napoli", "tipo": "info"}
            },
            {
                "title": "Very Long Title That Goes On and On",
                "kb": {
                    "citta_principale": "Torino",
                    "punti_di_forza": ["Punto uno molto lungo", "Punto due", "Punto tre"],
                    "call_to_action_principale": "Chiama subito per informazioni"
                },
                "combination": {"servizio": "servizio molto dettagliato", "citta": "Torino", "tipo": "commerciale"}
            }
        ]
        
        for i, tc in enumerate(test_cases):
            result = generate_seo_metadata(tc["title"], "content", tc["kb"], tc["combination"])
            meta_desc = result.get("meta_description", "")
            
            assert len(meta_desc) <= 155, f"Test case {i}: meta_description too long ({len(meta_desc)} chars)"
            assert meta_desc[-1] in '.!?:', f"Test case {i}: should end with punctuation"
            print(f"PASS: Test case {i} - meta_description = {len(meta_desc)} chars, ends correctly")


class TestUploadValidation:
    """Test upload endpoint validation"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client token for upload tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_upload_rejects_non_image(self, client_token):
        """Upload should reject non-image files with 400"""
        # Test various non-image types
        test_files = [
            ("test.pdf", b"%PDF-1.4 test content", "application/pdf"),
            ("test.txt", b"plain text content", "text/plain"),
            ("test.doc", b"\xd0\xcf\x11\xe0 doc content", "application/msword"),
        ]
        
        for filename, content, content_type in test_files:
            response = requests.post(
                f"{BASE_URL}/api/uploads?token={client_token}",
                files={"file": (filename, io.BytesIO(content), content_type)}
            )
            assert response.status_code == 400, f"Expected 400 for {filename}, got {response.status_code}"
            detail = response.json().get("detail", "")
            assert "Formato non supportato" in detail, f"Expected format error for {filename}, got: {detail}"
            print(f"PASS: Upload rejects {filename} with 400 'Formato non supportato'")
    
    def test_upload_rejects_large_files(self, client_token):
        """Upload should reject files > 5MB with 400"""
        # Create 5.5MB file
        large_content = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01' + (b'\x00' * (5 * 1024 * 1024 + 500000))
        
        response = requests.post(
            f"{BASE_URL}/api/uploads?token={client_token}",
            files={"file": ("large.jpg", io.BytesIO(large_content), "image/jpeg")}
        )
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        detail = response.json().get("detail", "")
        assert "5mb" in detail.lower() or "troppo grande" in detail.lower(), f"Expected size error, got: {detail}"
        print("PASS: Upload rejects files > 5MB with 400")
    
    def test_upload_accepts_valid_jpg(self, client_token):
        """Upload should accept valid JPG and return {id, path}"""
        jpg_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        jpg_data += b'\xff\xfe\x00\x13' + b'Test image data' + b'\xff\xd9'
        
        response = requests.post(
            f"{BASE_URL}/api/uploads?token={client_token}",
            files={"file": ("test_valid.jpg", io.BytesIO(jpg_data), "image/jpeg")}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "path" in data, "Response should contain 'path'"
        assert data.get("id"), "ID should not be empty"
        assert data.get("path"), "Path should not be empty"
        print(f"PASS: Valid JPG upload returns {{id: {data['id']}, path: {data['path'][:50]}...}}")


class TestAPIEndpointsStructure:
    """Verify API endpoints accept required fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def client_id(self, admin_token):
        response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        clients = response.json()
        assert len(clients) > 0
        return clients[0]["id"]
    
    def test_simple_generate_endpoint_structure(self, admin_token, client_id):
        """POST /api/articles/simple-generate should accept all expected fields"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "client_id": client_id,
                "keyword": "test keyword gutenberg",
                "titolo_suggerito": "Test Title",
                "topic": "Test topic notes",
                "content_type": "articolo",
                "publish_to_wordpress": False,
                "image_ids": ["test-id-1"],
                "gsc_context": {"top_keywords": []},
                "serp_context": {"competitors": []}
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "job_id" in data, "Should return job_id"
        print(f"PASS: simple-generate accepts all expected fields, job_id={data['job_id']}")
    
    def test_auth_endpoints_working(self):
        """Verify auth endpoints work"""
        # Admin login
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert admin_resp.status_code == 200
        assert admin_resp.json()["user"]["role"] == "admin"
        
        # Client login
        client_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL, "password": CLIENT_PASSWORD
        })
        assert client_resp.status_code == 200
        assert client_resp.json()["user"]["role"] == "client"
        
        print("PASS: Both admin and client login work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
