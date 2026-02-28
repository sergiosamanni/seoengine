"""
Test suite for Users Management feature - Iteration 7
Tests user assignment/unassignment, deletion, and client sites management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

# Test credentials
ADMIN_EMAIL = "admin@seoengine.it"
ADMIN_PASSWORD = "admin123"
ASSIGNED_CLIENT_EMAIL = "cliente@noleggiosalerno.it"
UNASSIGNED_CLIENT_EMAIL = "freedomlancers.sergio@gmail.com"
CLIENT_PASSWORD = "password"
TEST_CLIENT_ID = "a8ab5383-b444-4f17-9465-41fa32c34bb9"

class TestAuthFixtures:
    """Authentication helpers"""
    
    @staticmethod
    def get_admin_token():
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @staticmethod
    def get_client_token(email, password):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json()["token"]
        return None


class TestGetUsersEndpoint:
    """Test GET /api/users endpoint"""
    
    def test_get_users_requires_auth(self):
        """GET /api/users requires authentication"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ GET /api/users requires auth")
    
    def test_get_users_requires_admin(self):
        """GET /api/users requires admin role"""
        token = TestAuthFixtures.get_client_token(ASSIGNED_CLIENT_EMAIL, CLIENT_PASSWORD)
        if token:
            response = requests.get(
                f"{BASE_URL}/api/users",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 403, "Should require admin role"
            print("✓ GET /api/users requires admin role")
        else:
            pytest.skip("Could not get client token")
    
    def test_get_users_admin_success(self):
        """Admin can get all users"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        users = response.json()
        assert isinstance(users, list), "Should return list of users"
        assert len(users) >= 1, "Should have at least admin user"
        
        # Check user fields
        for user in users:
            assert "id" in user
            assert "email" in user
            assert "name" in user
            assert "role" in user
            assert "client_id" in user or user.get("client_id") is None
            assert "password" not in user, "Password should not be returned"
        
        print(f"✓ GET /api/users returns {len(users)} users")
        return users
    
    def test_users_include_expected_users(self):
        """Users list includes expected test users"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = response.json()
        
        emails = [u["email"] for u in users]
        
        # Check for admin
        admin_users = [u for u in users if u["role"] == "admin"]
        assert len(admin_users) >= 1, "Should have at least one admin"
        print(f"✓ Found {len(admin_users)} admin user(s)")
        
        # Check for clients
        client_users = [u for u in users if u["role"] == "client"]
        print(f"✓ Found {len(client_users)} client user(s)")
        
        return users


class TestAssignClientEndpoint:
    """Test POST /api/users/assign-client endpoint"""
    
    def test_assign_client_requires_auth(self):
        """POST /api/users/assign-client requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/users/assign-client",
            json={"user_id": "test", "client_id": "test"}
        )
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ POST /api/users/assign-client requires auth")
    
    def test_assign_client_requires_admin(self):
        """POST /api/users/assign-client requires admin role"""
        token = TestAuthFixtures.get_client_token(ASSIGNED_CLIENT_EMAIL, CLIENT_PASSWORD)
        if token:
            response = requests.post(
                f"{BASE_URL}/api/users/assign-client",
                json={"user_id": "test", "client_id": "test"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 403, "Should require admin role"
            print("✓ POST /api/users/assign-client requires admin role")
        else:
            pytest.skip("Could not get client token")
    
    def test_assign_client_invalid_user(self):
        """Assigning non-existent user returns 404"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.post(
            f"{BASE_URL}/api/users/assign-client",
            json={"user_id": "nonexistent-user-id", "client_id": TEST_CLIENT_ID},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Should return 404: {response.text}"
        print("✓ Assign non-existent user returns 404")
    
    def test_assign_client_invalid_client(self):
        """Assigning to non-existent client returns 404"""
        token = TestAuthFixtures.get_admin_token()
        # Get a valid user first
        users_response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = users_response.json()
        client_users = [u for u in users if u["role"] == "client"]
        
        if client_users:
            response = requests.post(
                f"{BASE_URL}/api/users/assign-client",
                json={"user_id": client_users[0]["id"], "client_id": "nonexistent-client-id"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 404, f"Should return 404: {response.text}"
            print("✓ Assign to non-existent client returns 404")
        else:
            pytest.skip("No client users found")


class TestUnassignClientEndpoint:
    """Test POST /api/users/unassign-client endpoint"""
    
    def test_unassign_client_requires_auth(self):
        """POST /api/users/unassign-client requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/users/unassign-client",
            json={"user_id": "test"}
        )
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ POST /api/users/unassign-client requires auth")
    
    def test_unassign_client_requires_admin(self):
        """POST /api/users/unassign-client requires admin role"""
        token = TestAuthFixtures.get_client_token(ASSIGNED_CLIENT_EMAIL, CLIENT_PASSWORD)
        if token:
            response = requests.post(
                f"{BASE_URL}/api/users/unassign-client",
                json={"user_id": "test"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 403, "Should require admin role"
            print("✓ POST /api/users/unassign-client requires admin role")
        else:
            pytest.skip("Could not get client token")
    
    def test_unassign_client_requires_user_id(self):
        """POST /api/users/unassign-client requires user_id"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.post(
            f"{BASE_URL}/api/users/unassign-client",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Should require user_id: {response.text}"
        print("✓ POST /api/users/unassign-client requires user_id")
    
    def test_unassign_client_invalid_user(self):
        """Unassigning non-existent user returns 404"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.post(
            f"{BASE_URL}/api/users/unassign-client",
            json={"user_id": "nonexistent-user-id"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Should return 404: {response.text}"
        print("✓ Unassign non-existent user returns 404")


class TestDeleteUserEndpoint:
    """Test DELETE /api/users/{user_id} endpoint"""
    
    def test_delete_user_requires_auth(self):
        """DELETE /api/users/{id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/users/test-user-id")
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ DELETE /api/users/{id} requires auth")
    
    def test_delete_user_requires_admin(self):
        """DELETE /api/users/{id} requires admin role"""
        token = TestAuthFixtures.get_client_token(ASSIGNED_CLIENT_EMAIL, CLIENT_PASSWORD)
        if token:
            response = requests.delete(
                f"{BASE_URL}/api/users/test-user-id",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 403, "Should require admin role"
            print("✓ DELETE /api/users/{id} requires admin role")
        else:
            pytest.skip("Could not get client token")
    
    def test_delete_user_invalid_user(self):
        """Deleting non-existent user returns 404"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.delete(
            f"{BASE_URL}/api/users/nonexistent-user-id",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Should return 404: {response.text}"
        print("✓ Delete non-existent user returns 404")
    
    def test_cannot_delete_admin(self):
        """Cannot delete an admin user"""
        token = TestAuthFixtures.get_admin_token()
        
        # Get admin user id
        users_response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = users_response.json()
        admin_users = [u for u in users if u["role"] == "admin"]
        
        if admin_users:
            response = requests.delete(
                f"{BASE_URL}/api/users/{admin_users[0]['id']}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 400, f"Should return 400 for admin delete: {response.text}"
            print("✓ Cannot delete admin user (returns 400)")
        else:
            pytest.skip("No admin users found")


class TestClientSitesEndpoint:
    """Test POST /api/clients/{id}/sites endpoint"""
    
    def test_add_site_requires_auth(self):
        """POST /api/clients/{id}/sites requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/sites",
            json={"site_url": "https://test.com"}
        )
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ POST /api/clients/{id}/sites requires auth")
    
    def test_add_site_requires_admin(self):
        """POST /api/clients/{id}/sites requires admin role"""
        token = TestAuthFixtures.get_client_token(ASSIGNED_CLIENT_EMAIL, CLIENT_PASSWORD)
        if token:
            response = requests.post(
                f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/sites",
                json={"site_url": "https://test.com"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 403, "Should require admin role"
            print("✓ POST /api/clients/{id}/sites requires admin role")
        else:
            pytest.skip("Could not get client token")
    
    def test_add_site_requires_url(self):
        """POST /api/clients/{id}/sites requires site_url"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/sites",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Should require site_url: {response.text}"
        print("✓ POST /api/clients/{id}/sites requires site_url")


class TestUserAssignmentFlow:
    """Test full user assignment/unassignment flow"""
    
    def test_full_assignment_flow(self):
        """Test complete assign -> verify -> unassign flow"""
        token = TestAuthFixtures.get_admin_token()
        
        # 1. Get users to find Sergio (unassigned user)
        users_response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = users_response.json()
        
        sergio = next((u for u in users if u["email"] == UNASSIGNED_CLIENT_EMAIL), None)
        if not sergio:
            pytest.skip(f"User {UNASSIGNED_CLIENT_EMAIL} not found")
        
        sergio_id = sergio["id"]
        initial_client_id = sergio.get("client_id")
        print(f"✓ Found user Sergio (id={sergio_id}, current client_id={initial_client_id})")
        
        # 2. Assign Sergio to test client
        assign_response = requests.post(
            f"{BASE_URL}/api/users/assign-client",
            json={"user_id": sergio_id, "client_id": TEST_CLIENT_ID},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert assign_response.status_code == 200, f"Assign failed: {assign_response.text}"
        print(f"✓ Assigned Sergio to client {TEST_CLIENT_ID}")
        
        # 3. Verify assignment via GET /users
        verify_response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = verify_response.json()
        sergio = next((u for u in users if u["id"] == sergio_id), None)
        assert sergio["client_id"] == TEST_CLIENT_ID, f"Client ID not updated: {sergio}"
        print("✓ Verified Sergio's client_id updated correctly")
        
        # 4. Test that Sergio can now login and has client_id in token
        sergio_token = TestAuthFixtures.get_client_token(UNASSIGNED_CLIENT_EMAIL, CLIENT_PASSWORD)
        if sergio_token:
            me_response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {sergio_token}"}
            )
            assert me_response.status_code == 200
            me_data = me_response.json()
            assert me_data["client_id"] == TEST_CLIENT_ID, f"Token client_id mismatch: {me_data}"
            print("✓ Sergio's login returns correct client_id")
        
        # 5. Unassign Sergio (cleanup for manual testing)
        unassign_response = requests.post(
            f"{BASE_URL}/api/users/unassign-client",
            json={"user_id": sergio_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert unassign_response.status_code == 200, f"Unassign failed: {unassign_response.text}"
        print("✓ Unassigned Sergio from client")
        
        # 6. Verify unassignment
        verify_response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = verify_response.json()
        sergio = next((u for u in users if u["id"] == sergio_id), None)
        assert sergio["client_id"] is None, f"Client ID should be null: {sergio}"
        print("✓ Verified Sergio is unassigned (client_id is null)")
        
        return True


class TestSitiWebField:
    """Test siti_web array field in Client model"""
    
    def test_client_has_siti_web_field(self):
        """Client model includes siti_web array"""
        token = TestAuthFixtures.get_admin_token()
        response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        client = response.json()
        
        # siti_web should exist and be an array
        assert "siti_web" in client, "Client should have siti_web field"
        assert isinstance(client["siti_web"], list), "siti_web should be a list"
        print(f"✓ Client has siti_web field: {client['siti_web']}")
    
    def test_add_site_to_siti_web(self):
        """Add site to siti_web array"""
        token = TestAuthFixtures.get_admin_token()
        test_site = f"https://test-site-{uuid.uuid4().hex[:8]}.com"
        
        # Add site
        response = requests.post(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/sites",
            json={"site_url": test_site},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Add site failed: {response.text}"
        print(f"✓ Added site: {test_site}")
        
        # Verify site was added
        client_response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        client = client_response.json()
        assert test_site in client["siti_web"], f"Site not in siti_web: {client['siti_web']}"
        print("✓ Site added to siti_web array")
        
        # Cleanup - remove the test site
        delete_response = requests.delete(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/sites",
            json={"site_url": test_site},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert delete_response.status_code == 200, f"Delete site failed: {delete_response.text}"
        print("✓ Cleaned up test site")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
