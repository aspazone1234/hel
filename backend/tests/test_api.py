"""
Backend API Tests for Shrimad Bhagavat Katha Mahotsav 2026 Swamsevak Portal
Tests: Authentication, Dashboard, Registrations, Admin APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "superashwini"
ADMIN_PASSWORD = "supersebhiupper123"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data["username"] == ADMIN_USERNAME
        assert data["role"] == "superadmin"
        assert data["name"] == "Super Admin Ashwini"
        print(f"✓ Login successful - token received, role: {data['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")
    
    def test_login_wrong_password(self):
        """Test login with correct username but wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Wrong password correctly rejected")
    
    def test_auth_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Test /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == ADMIN_USERNAME
        assert data["role"] == "superadmin"
        print(f"✓ /auth/me returned user info: {data['name']}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me correctly requires authentication")


class TestDashboardEndpoints:
    """Dashboard and admin stats endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_dashboard(self):
        """Test admin dashboard endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Verify dashboard has expected fields
        assert "pending_count" in data
        assert "approved_count" in data
        assert "total_people" in data
        assert "daily_schedule" in data
        print(f"✓ Dashboard loaded - Pending: {data['pending_count']}, Approved: {data['approved_count']}")
    
    def test_dashboard_without_auth(self):
        """Test dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401
        print("✓ Dashboard correctly requires authentication")


class TestRegistrationEndpoints:
    """Registration CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_registrations(self):
        """Test getting registrations list"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Registrations list - Total: {data['total']}, Page: {data['page']}")
    
    def test_get_registrations_with_bucket_filter(self):
        """Test getting registrations with bucket filter"""
        # Test pending bucket
        response = requests.get(f"{BASE_URL}/api/admin/registrations?bucket=pending_approval", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Pending bucket - Total: {data['total']}")
        
        # Test expected bucket
        response = requests.get(f"{BASE_URL}/api/admin/registrations?bucket=expected", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Expected bucket - Total: {data['total']}")
        
        # Test arrived bucket
        response = requests.get(f"{BASE_URL}/api/admin/registrations?bucket=arrived", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Arrived bucket - Total: {data['total']}")
    
    def test_get_registration_count_public(self):
        """Test public registration count endpoint"""
        response = requests.get(f"{BASE_URL}/api/registrations/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        print(f"✓ Public registration count: {data['total']}")


class TestPublicEndpoints:
    """Public endpoints that don't require authentication"""
    
    def test_reference_persons_public(self):
        """Test public reference persons endpoint"""
        response = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Reference persons public - Count: {len(data)}")
    
    def test_relation_categories_public(self):
        """Test public relation categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/relation-categories/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Relation categories public - Count: {len(data)}")
    
    def test_geo_countries(self):
        """Test geo countries endpoint"""
        response = requests.get(f"{BASE_URL}/api/geo/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check India is in the list
        india = next((c for c in data if c["code"] == "IN"), None)
        assert india is not None
        print(f"✓ Geo countries - Count: {len(data)}, India found: {india['name']}")
    
    def test_geo_states_india(self):
        """Test geo states for India"""
        response = requests.get(f"{BASE_URL}/api/geo/states/IN")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ India states - Count: {len(data)}")


class TestAdminManagementEndpoints:
    """Admin management endpoints (superadmin only)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_reference_persons_admin(self):
        """Test admin reference persons endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reference-persons", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin reference persons - Count: {len(data)}")
    
    def test_get_relation_categories_admin(self):
        """Test admin relation categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/relation-categories", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin relation categories - Count: {len(data)}")
    
    def test_get_rooms(self):
        """Test rooms endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/rooms", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Rooms - Count: {len(data)}")
    
    def test_get_audit_logs(self):
        """Test audit logs endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Audit logs - Total: {data['total']}")


class TestRoomManagement:
    """Room management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_and_delete_room(self):
        """Test room creation and deletion"""
        # Create a test room
        room_data = {
            "room_code": "TEST_ROOM_001",
            "floor": "1",
            "capacity": 2,
            "ac_type": "AC",
            "notes": "Test room for automated testing"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/admin/rooms", 
                                    json=room_data, headers=self.headers)
        
        if create_resp.status_code == 409:
            # Room already exists, try to delete it first
            delete_resp = requests.delete(f"{BASE_URL}/api/admin/rooms/TEST_ROOM_001", 
                                         headers=self.headers)
            # Try creating again
            create_resp = requests.post(f"{BASE_URL}/api/admin/rooms", 
                                        json=room_data, headers=self.headers)
        
        assert create_resp.status_code == 200, f"Room creation failed: {create_resp.text}"
        created_room = create_resp.json()
        assert created_room["room_code"] == "TEST_ROOM_001"
        print(f"✓ Room created: {created_room['room_code']}")
        
        # Delete the test room
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/rooms/TEST_ROOM_001", 
                                     headers=self.headers)
        assert delete_resp.status_code == 200
        print("✓ Room deleted successfully")


class TestOTPEndpoints:
    """OTP endpoints (WhatsApp integration - will fail without real credentials)"""
    
    def test_otp_send_invalid_mobile(self):
        """Test OTP send with invalid mobile"""
        response = requests.post(f"{BASE_URL}/api/otp/send", json={
            "mobile": "123"  # Too short
        })
        assert response.status_code == 400
        print("✓ OTP send correctly rejects invalid mobile")
    
    def test_otp_verify_no_session(self):
        """Test OTP verify without session"""
        response = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "mobile": "9999999999",
            "otp": "123456"
        })
        assert response.status_code == 400
        print("✓ OTP verify correctly rejects when no session exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
