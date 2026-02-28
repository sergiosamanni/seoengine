"""
Iteration 11: Test upload endpoints and content_type functionality
Features tested:
1. POST /api/uploads - Image upload with token
2. POST /api/uploads - Invalid format rejection (400)
3. POST /api/uploads - File too large rejection (400)
4. GET /api/uploads/files/{file_id} - Retrieve uploaded image
5. POST /api/articles/simple-generate - content_type and image_ids fields
6. POST /api/articles/generate-and-publish - content_type field
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://serp-wizard.preview.emergentagent.com')
if BASE_URL and BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
CLIENT_EMAIL = "testclient@test.it"
CLIENT_PASSWORD = "test123"


class TestUploadEndpoints:
    """Test image upload functionality"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client token for upload tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]

    def test_upload_without_token_returns_401(self):
        """Upload without token should fail with 401"""
        # Create a small fake JPG
        fake_jpg = io.BytesIO(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01' + b'\x00' * 100)
        fake_jpg.name = "test.jpg"
        
        response = requests.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("test.jpg", fake_jpg, "image/jpeg")}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: Upload without token returns 401")

    def test_upload_invalid_format_returns_400(self, client_token):
        """Upload with invalid format (.txt) should return 400"""
        fake_txt = io.BytesIO(b"This is a text file content")
        
        response = requests.post(
            f"{BASE_URL}/api/uploads?token={client_token}",
            files={"file": ("test.txt", fake_txt, "text/plain")}
        )
        assert response.status_code == 400, f"Expected 400 for txt file, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Formato non supportato" in data.get("detail", ""), f"Expected format error message, got: {data}"
        print("PASS: Upload with .txt format returns 400 with proper message")

    def test_upload_file_too_large_returns_400(self, client_token):
        """Upload with file > 5MB should return 400"""
        # Create a file > 5MB (5.1 MB)
        large_file = io.BytesIO(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01' + b'\x00' * (5 * 1024 * 1024 + 100000))
        
        response = requests.post(
            f"{BASE_URL}/api/uploads?token={client_token}",
            files={"file": ("large.jpg", large_file, "image/jpeg")}
        )
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}: {response.text}"
        data = response.json()
        assert "troppo grande" in data.get("detail", "").lower() or "5mb" in data.get("detail", "").lower(), f"Expected size error message, got: {data}"
        print("PASS: Upload with file > 5MB returns 400")

    def test_upload_valid_jpg_returns_success(self, client_token):
        """Upload valid JPG should return {id, path, filename, size}"""
        # Create a valid-ish JPG (minimal JFIF header)
        jpg_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        jpg_data += b'\xff\xfe\x00\x13' + b'Test image data' + b'\xff\xd9'
        fake_jpg = io.BytesIO(jpg_data)
        
        response = requests.post(
            f"{BASE_URL}/api/uploads?token={client_token}",
            files={"file": ("test_upload.jpg", fake_jpg, "image/jpeg")}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, f"Response missing 'id': {data}"
        assert "path" in data, f"Response missing 'path': {data}"
        assert "filename" in data, f"Response missing 'filename': {data}"
        assert "size" in data, f"Response missing 'size': {data}"
        assert data["filename"] == "test_upload.jpg", f"Filename mismatch: {data['filename']}"
        assert isinstance(data["size"], int), f"Size should be int: {data['size']}"
        
        print(f"PASS: Upload valid JPG returns success with id={data['id']}, size={data['size']}")
        return data["id"]

    def test_retrieve_uploaded_file(self, client_token):
        """Retrieve uploaded file by ID"""
        # First upload a file
        jpg_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        jpg_data += b'\xff\xfe\x00\x13' + b'Retrieve test' + b'\xff\xd9'
        
        upload_response = requests.post(
            f"{BASE_URL}/api/uploads?token={client_token}",
            files={"file": ("retrieve_test.jpg", io.BytesIO(jpg_data), "image/jpeg")}
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        file_id = upload_response.json()["id"]
        
        # Now retrieve it
        get_response = requests.get(f"{BASE_URL}/api/uploads/files/{file_id}?auth={client_token}")
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
        assert get_response.headers.get("Content-Type", "").startswith("image/"), f"Expected image content-type, got: {get_response.headers.get('Content-Type')}"
        assert len(get_response.content) > 0, "Retrieved file is empty"
        
        print(f"PASS: Retrieved uploaded file successfully, size={len(get_response.content)} bytes")

    def test_retrieve_nonexistent_file_returns_404(self, client_token):
        """Retrieve non-existent file should return 404"""
        response = requests.get(f"{BASE_URL}/api/uploads/files/nonexistent-file-id?auth={client_token}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Retrieve non-existent file returns 404")


class TestContentTypeInGeneration:
    """Test content_type field in article generation endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def client_id(self, admin_token):
        """Get test client ID"""
        response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        clients = response.json()
        assert len(clients) > 0, "No clients found"
        return clients[0]["id"]

    def test_simple_generate_accepts_content_type(self, admin_token, client_id):
        """POST /api/articles/simple-generate should accept content_type field"""
        # Test all three content types - just verify the endpoint accepts them
        for ct in ["articolo", "landing_page", "pillar_page"]:
            response = requests.post(
                f"{BASE_URL}/api/articles/simple-generate",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "client_id": client_id,
                    "keyword": f"test {ct} keyword",
                    "content_type": ct,
                    "publish_to_wordpress": False  # Don't actually publish
                }
            )
            # Should return 200 with job_id (starts async generation)
            assert response.status_code == 200, f"Expected 200 for content_type={ct}, got {response.status_code}: {response.text}"
            data = response.json()
            assert "job_id" in data, f"Response missing job_id for content_type={ct}: {data}"
            print(f"PASS: simple-generate accepts content_type='{ct}', job_id={data['job_id']}")

    def test_simple_generate_accepts_image_ids(self, admin_token, client_id):
        """POST /api/articles/simple-generate should accept image_ids field"""
        response = requests.post(
            f"{BASE_URL}/api/articles/simple-generate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "client_id": client_id,
                "keyword": "test with images",
                "image_ids": ["fake-image-id-1", "fake-image-id-2"],
                "publish_to_wordpress": False
            }
        )
        # Endpoint should accept the field even if images don't exist
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "job_id" in data, f"Response missing job_id: {data}"
        print(f"PASS: simple-generate accepts image_ids field, job_id={data['job_id']}")

    def test_generate_and_publish_accepts_content_type(self, admin_token, client_id):
        """POST /api/articles/generate-and-publish should accept content_type field"""
        for ct in ["articolo", "landing_page", "pillar_page"]:
            response = requests.post(
                f"{BASE_URL}/api/articles/generate-and-publish",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "client_id": client_id,
                    "combinations": [{"servizio": "test", "citta": "Roma", "tipo": "informazionale"}],
                    "content_type": ct,
                    "publish_to_wordpress": False
                }
            )
            assert response.status_code == 200, f"Expected 200 for content_type={ct}, got {response.status_code}: {response.text}"
            data = response.json()
            assert "job_id" in data, f"Response missing job_id: {data}"
            print(f"PASS: generate-and-publish accepts content_type='{ct}'")


class TestExistingFunctionality:
    """Verify existing functionality still works"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_admin_login(self):
        """Admin login should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login works")

    def test_client_login(self):
        """Client login should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "client"
        print("PASS: Client login works")

    def test_get_clients_list(self, admin_token):
        """GET /api/clients should return client list"""
        response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)
        assert len(clients) > 0
        print(f"PASS: GET /api/clients returns {len(clients)} client(s)")

    def test_get_articles_list(self, admin_token):
        """GET /api/articles should return articles"""
        response = requests.get(f"{BASE_URL}/api/articles", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        articles = response.json()
        assert isinstance(articles, list)
        print(f"PASS: GET /api/articles returns {len(articles)} article(s)")

    def test_serp_analyze_full(self, admin_token):
        """POST /api/serp/analyze-full should return competitor data"""
        response = requests.post(
            f"{BASE_URL}/api/serp/analyze-full",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"keyword": "test keyword", "num_results": 2, "country": "it"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "keyword" in data
        assert "competitors" in data
        print(f"PASS: SERP analysis returns {len(data.get('competitors', []))} competitors")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
