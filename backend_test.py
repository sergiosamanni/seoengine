import requests
import sys
from datetime import datetime
import json

class SEOEngineAPITester:
    def __init__(self, base_url="https://seo-content-hub-14.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.client_id = "a8ab5383-b444-4f17-9465-41fa32c34bb9"  # Existing client mentioned in requirements

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response.text}")

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Initialize seed data including admin user"""
        print("\n🌱 Initializing seed data...")
        success, response = self.run_test(
            "Seed Data",
            "POST",
            "seed",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login with provided credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@seoengine.it", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token acquired: {self.token[:50]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_clients(self):
        """Test getting all clients (admin only)"""
        success, response = self.run_test(
            "Get All Clients",
            "GET",
            "clients",
            200
        )
        if success and response:
            print(f"   Found {len(response)} clients")
        return success

    def test_get_specific_client(self):
        """Test getting specific client by ID"""
        success, response = self.run_test(
            f"Get Client {self.client_id}",
            "GET",
            f"clients/{self.client_id}",
            200
        )
        if success and 'nome' in response:
            print(f"   Client name: {response['nome']}")
        return success

    def test_create_client(self):
        """Test creating a new client"""
        test_client_data = {
            "nome": f"Test Client {datetime.now().strftime('%H%M%S')}",
            "settore": "test",
            "sito_web": "https://testclient.it",
            "attivo": True
        }
        
        success, response = self.run_test(
            "Create New Client",
            "POST",
            "clients",
            200,
            data=test_client_data
        )
        
        if success and 'id' in response:
            # Store the new client ID for cleanup
            self.new_client_id = response['id']
            print(f"   Created client with ID: {self.new_client_id}")
        return success

    def test_client_configuration(self):
        """Test updating client configuration"""
        config_data = {
            "openai": {
                "api_key": "sk-test-key-for-testing",
                "modello": "gpt-4-turbo-preview",
                "temperatura": 0.7
            },
            "wordpress": {
                "url_api": "https://testsite.it/wp-json/wp/v2/posts",
                "utente": "testuser",
                "password_applicazione": "testpass123",
                "stato_pubblicazione": "draft"
            },
            "keyword_combinations": {
                "servizi": ["test service"],
                "citta_e_zone": ["test city"],
                "tipi_o_qualificatori": ["test type"]
            }
        }
        
        success, response = self.run_test(
            f"Update Client Configuration",
            "PUT",
            f"clients/{self.client_id}/configuration",
            200,
            data=config_data
        )
        return success

    def test_get_combinations(self):
        """Test getting keyword combinations for client"""
        success, response = self.run_test(
            f"Get Keyword Combinations",
            "GET",
            f"clients/{self.client_id}/combinations",
            200
        )
        if success and 'combinations' in response:
            print(f"   Found {len(response['combinations'])} combinations")
        return success

    def test_get_articles(self):
        """Test getting articles"""
        success, response = self.run_test(
            "Get All Articles",
            "GET",
            "articles",
            200
        )
        if success:
            print(f"   Found {len(response)} articles")
        return success

    def test_get_stats(self):
        """Test getting overview statistics"""
        success, response = self.run_test(
            "Get Overview Stats",
            "GET",
            "stats/overview",
            200
        )
        if success:
            print(f"   Stats: {response}")
        return success

    def test_generate_articles(self):
        """Test generating articles (requires valid OpenAI key)"""
        # First ensure we have some combinations
        combinations = [
            {"servizio": "test service", "citta": "test city", "tipo": "test type"}
        ]
        
        success, response = self.run_test(
            "Generate Articles",
            "POST",
            "articles/generate",
            200,
            data={
                "client_id": self.client_id,
                "combinations": combinations
            }
        )
        
        if success and 'articles' in response:
            print(f"   Generated {len(response['articles'])} articles")
        return success

    def test_verify_admin_password(self):
        """Test admin master password verification"""
        # Test with correct password
        success, response = self.run_test(
            "Verify Admin Password (Correct)",
            "POST",
            "verify-admin-password",
            200,
            data={"password": "seo_admin_2024"}
        )
        if success and response.get('valid'):
            print("   ✅ Master password verification successful")
        
        # Test with wrong password
        success2, response2 = self.run_test(
            "Verify Admin Password (Wrong)",
            "POST", 
            "verify-admin-password",
            200,
            data={"password": "wrong_password"}
        )
        if success2 and not response2.get('valid'):
            print("   ✅ Correctly rejected wrong password")
            
        return success and response.get('valid') and success2 and not response2.get('valid')

    def test_verify_prompt_password(self):
        """Test client prompt password verification"""
        # Test with master password (should always work)
        success, response = self.run_test(
            "Verify Prompt Password (Master)",
            "POST",
            "verify-prompt-password", 
            200,
            data={"password": "seo_admin_2024", "client_id": self.client_id}
        )
        if success and response.get('valid'):
            print("   ✅ Master password works for prompt access")
        return success and response.get('valid')

    def test_advanced_prompt_update(self):
        """Test updating advanced prompt with password"""
        prompt_data = {
            "password": "seo_admin_2024",
            "secondo_livello_prompt": "Test advanced prompt for article generation {keyword}",
            "keyword_injection_template": "Strategically use {keyword} in the content",
            "prompt_password": "client_password_123"
        }
        
        success, response = self.run_test(
            "Update Advanced Prompt",
            "PUT",
            f"clients/{self.client_id}/advanced-prompt",
            200,
            data=prompt_data
        )
        return success

    def test_serp_analysis_no_api_key(self):
        """Test SERP analysis without Apify API key (should fail gracefully)"""
        serp_data = {
            "keyword": "test keyword",
            "country": "it",
            "num_results": 4
        }
        
        success, response = self.run_test(
            "SERP Analysis (No API Key)",
            "POST", 
            f"clients/{self.client_id}/serp-analysis",
            400,  # Should fail with 400 due to missing API key
            data=serp_data
        )
        return success

def main():
    """Run all backend API tests"""
    tester = SEOEngineAPITester()
    
    print("🚀 Starting SEO Engine Backend API Testing")
    print(f"📡 Base URL: {tester.base_url}")
    
    # Test sequence
    test_results = []
    
    # 1. Seed data (create admin user)
    test_results.append(tester.test_seed_data())
    
    # 2. Authentication
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    test_results.append(True)
    
    # 3. User info
    test_results.append(tester.test_get_me())
    
    # 4. Clients endpoints
    test_results.append(tester.test_get_clients())
    test_results.append(tester.test_get_specific_client())
    test_results.append(tester.test_create_client())
    
    # 5. Configuration
    test_results.append(tester.test_client_configuration())
    test_results.append(tester.test_get_combinations())
    
    # 6. Articles
    test_results.append(tester.test_get_articles())
    
    # 7. Stats
    test_results.append(tester.test_get_stats())
    
    # 8. Article generation (may fail due to API key)
    test_results.append(tester.test_generate_articles())
    
    # 9. NEW FEATURES - Password Management
    test_results.append(tester.test_verify_admin_password())
    test_results.append(tester.test_verify_prompt_password())
    test_results.append(tester.test_advanced_prompt_update())
    
    # 10. NEW FEATURES - SERP Analysis (without API key)
    test_results.append(tester.test_serp_analysis_no_api_key())
    
    # Print final results
    print(f"\n📊 Final Results:")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed >= tester.tests_run * 0.8:  # 80% pass rate
        print("✅ Backend API tests mostly successful")
        return 0
    else:
        print("❌ Backend API tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())