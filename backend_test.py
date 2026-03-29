import requests
import sys
import json
from datetime import datetime

class KathaEventAPITester:
    def __init__(self, base_url="https://shrimad-katha-event.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, cookies=cookies)
            elif method == 'POST':
                response = self.session.post(url, json=data, cookies=cookies)

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
                print(f"   Response: {response.text[:200]}")

            return success, response

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        
        if success and response:
            # Store cookies for subsequent requests
            self.session.cookies.update(response.cookies)
            print(f"   Cookies set: {dict(response.cookies)}")
            
        return success

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        success, response = self.run_test(
            "Admin Login (Invalid Credentials)",
            "POST",
            "auth/login",
            401,
            data={"email": "admin@example.com", "password": "wrongpassword"}
        )
        return success

    def test_get_me(self):
        """Test get current user endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_registration(self):
        """Test creating a registration"""
        test_registration = {
            "full_name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "mobile": "+91 9876543210",
            "whatsapp": "+91 9876543210",
            "email": "test@example.com",
            "city_country": "Mumbai, India",
            "will_attend": "Yes",
            "arrival_date": "2026-05-28",
            "departure_date": "2026-06-03",
            "days_attending": ["28 May", "29 May", "30 May"],
            "adults": 2,
            "children": 1,
            "senior_citizens": 0,
            "attendee_details": [
                {"name": "Test Adult 1", "age": "35", "gender": "Male", "special_needs": ""},
                {"name": "Test Adult 2", "age": "32", "gender": "Female", "special_needs": ""},
                {"name": "Test Child", "age": "8", "gender": "Male", "special_needs": ""}
            ],
            "need_accommodation": True,
            "room_type": "Family",
            "ac_preference": "AC",
            "num_rooms": 1,
            "check_in": "2026-05-28",
            "check_out": "2026-06-03",
            "num_meals": 3,
            "jain_food": False,
            "no_onion_garlic": True,
            "allergies": "None",
            "travel_mode": "Car",
            "arrival_time": "10:00 AM on 28 May",
            "pickup_required": False,
            "parking_needed": True,
            "message": "Looking forward to the katha",
            "consent": True
        }
        
        success, response = self.run_test(
            "Create Registration",
            "POST",
            "registrations",
            200,
            data=test_registration
        )
        
        if success and response:
            try:
                data = response.json()
                self.test_registration_id = data.get('id')
                print(f"   Registration ID: {self.test_registration_id}")
            except:
                pass
                
        return success

    def test_registration_count(self):
        """Test getting registration count"""
        success, response = self.run_test(
            "Get Registration Count",
            "GET",
            "registrations/count",
            200
        )
        return success

    def test_admin_registrations(self):
        """Test getting all registrations (admin only)"""
        success, response = self.run_test(
            "Get Admin Registrations",
            "GET",
            "admin/registrations",
            200
        )
        return success

    def test_admin_summary(self):
        """Test getting admin summary"""
        success, response = self.run_test(
            "Get Admin Summary",
            "GET",
            "admin/summary",
            200
        )
        return success

    def test_admin_export_csv(self):
        """Test CSV export"""
        print(f"\n🔍 Testing Admin CSV Export...")
        url = f"{self.base_url}/admin/export-csv"
        
        try:
            response = self.session.get(url)
            success = response.status_code == 200
            
            self.tests_run += 1
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
                print(f"   Content-Length: {len(response.content)} bytes")
                
                # Check if it's actually CSV content
                if 'text/csv' in response.headers.get('content-type', ''):
                    print("   ✅ Correct CSV content type")
                else:
                    print("   ⚠️  Content type might not be CSV")
                    
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                
            return success
            
        except Exception as e:
            self.tests_run += 1
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_logout(self):
        """Test admin logout"""
        success, response = self.run_test(
            "Admin Logout",
            "POST",
            "auth/logout",
            200
        )
        
        if success:
            # Clear session cookies
            self.session.cookies.clear()
            print("   Session cookies cleared")
            
        return success

    def test_unauthorized_access(self):
        """Test accessing admin endpoints without authentication"""
        success, response = self.run_test(
            "Unauthorized Admin Access",
            "GET",
            "admin/registrations",
            401
        )
        return success

def main():
    print("🚀 Starting Katha Event API Testing...")
    print("=" * 60)
    
    tester = KathaEventAPITester()
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Admin Login", tester.test_admin_login),
        ("Get Current User", tester.test_get_me),
        ("Create Registration", tester.test_create_registration),
        ("Registration Count", tester.test_registration_count),
        ("Admin Registrations", tester.test_admin_registrations),
        ("Admin Summary", tester.test_admin_summary),
        ("Admin CSV Export", tester.test_admin_export_csv),
        ("Admin Logout", tester.test_logout),
        ("Unauthorized Access", tester.test_unauthorized_access),
        ("Invalid Login", tester.test_admin_login_invalid),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())