"""
Backend API Tests for Shrimad Bhagavat Katha Mahotsav 2026 V2
Tests the simplified registration schema and auth endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://registration-hub-71.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test admin login with valid credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['email']}")
        return session
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected with 401")
    
    def test_auth_me_authenticated(self):
        """Test /auth/me with authenticated session"""
        session = requests.Session()
        # Login first
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        
        # Check /auth/me
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ /auth/me returns authenticated user: {data['email']}")
    
    def test_auth_me_unauthenticated(self):
        """Test /auth/me without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me correctly rejects unauthenticated requests")
    
    def test_logout(self):
        """Test logout endpoint"""
        session = requests.Session()
        # Login first
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Logout
        logout_resp = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_resp.status_code == 200
        
        # Verify logged out
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 401
        print("✓ Logout successful, session invalidated")


class TestRegistrationEndpoints:
    """Registration endpoint tests with new simplified schema"""
    
    def test_create_registration_minimal(self):
        """Test creating registration with minimal required fields"""
        test_data = {
            "full_name": f"TEST_User_{uuid.uuid4().hex[:6]}",
            "mobile": "+91 9876543210",
            "consent": True
        }
        response = requests.post(f"{BASE_URL}/api/registrations", json=test_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["full_name"] == test_data["full_name"]
        assert data["mobile"] == test_data["mobile"]
        assert "id" in data
        assert "created_at" in data
        print(f"✓ Minimal registration created: {data['full_name']}")
    
    def test_create_registration_full(self):
        """Test creating registration with all fields (new V2 schema)"""
        test_data = {
            "full_name": f"TEST_FullUser_{uuid.uuid4().hex[:6]}",
            "mobile": "+91 9876543211",
            "email": "test@example.com",
            "city": "Mumbai",
            "country": "India",
            "attendance_intent": "Yes",
            "arrival_date": "2026-05-28",
            "departure_date": "2026-06-03",
            "arrival_time": "10:00 AM",
            "days_attending": ["28 May", "29 May", "30 May"],
            "num_people": 3,
            "attendees": [
                {"name": "Person 1", "category": "Adult", "special_needs": ""},
                {"name": "Person 2", "category": "Child", "special_needs": "Wheelchair"},
                {"name": "Person 3", "category": "Senior", "special_needs": ""}
            ],
            "need_accommodation": True,
            "room_type": "Double",
            "num_rooms": 2,
            "message": "Looking forward to the event",
            "consent": True
        }
        response = requests.post(f"{BASE_URL}/api/registrations", json=test_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify all fields
        assert data["full_name"] == test_data["full_name"]
        assert data["mobile"] == test_data["mobile"]
        assert data["email"] == test_data["email"]
        assert data["city"] == test_data["city"]
        assert data["country"] == test_data["country"]
        assert data["attendance_intent"] == test_data["attendance_intent"]
        assert data["num_people"] == test_data["num_people"]
        assert data["need_accommodation"] == test_data["need_accommodation"]
        assert data["room_type"] == test_data["room_type"]
        assert data["num_rooms"] == test_data["num_rooms"]
        assert len(data["attendees"]) == 3
        assert len(data["days_attending"]) == 3
        print(f"✓ Full registration created with all V2 schema fields")
    
    def test_create_registration_attendance_intent_options(self):
        """Test different attendance_intent values"""
        for intent in ["Yes", "Most Probably", "Maybe"]:
            test_data = {
                "full_name": f"TEST_Intent_{intent.replace(' ', '_')}",
                "mobile": "+91 9876543212",
                "attendance_intent": intent,
                "consent": True
            }
            response = requests.post(f"{BASE_URL}/api/registrations", json=test_data)
            assert response.status_code == 200
            data = response.json()
            assert data["attendance_intent"] == intent
            print(f"✓ Registration with attendance_intent='{intent}' created")
    
    def test_registration_count(self):
        """Test registration count endpoint"""
        response = requests.get(f"{BASE_URL}/api/registrations/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert isinstance(data["total"], int)
        print(f"✓ Registration count: {data['total']}")


class TestAdminEndpoints:
    """Admin endpoint tests"""
    
    @pytest.fixture
    def admin_session(self):
        """Create authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_admin_registrations_authenticated(self, admin_session):
        """Test fetching registrations as admin"""
        response = admin_session.get(f"{BASE_URL}/api/admin/registrations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin registrations fetched: {len(data)} records")
        
        # Verify new schema fields if records exist
        if len(data) > 0:
            reg = data[0]
            # Check for new V2 schema fields
            expected_fields = ["full_name", "mobile", "attendance_intent", "num_people"]
            for field in expected_fields:
                assert field in reg, f"Missing field: {field}"
            print(f"✓ Registration record has V2 schema fields")
    
    def test_admin_registrations_unauthenticated(self):
        """Test admin registrations without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations")
        assert response.status_code == 401
        print("✓ Admin registrations correctly blocked for unauthenticated users")
    
    def test_admin_summary(self, admin_session):
        """Test admin summary endpoint with new aggregations"""
        response = admin_session.get(f"{BASE_URL}/api/admin/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Check for expected summary fields
        expected_fields = [
            "total_registrations", "total_people", "total_rooms",
            "accommodation_needed", "attend_yes", "attend_probably", "attend_maybe"
        ]
        for field in expected_fields:
            assert field in data, f"Missing summary field: {field}"
        
        print(f"✓ Admin summary: {data['total_registrations']} registrations, {data['total_people']} people")
        print(f"  - Confirmed (Yes): {data['attend_yes']}")
        print(f"  - Most Probably: {data['attend_probably']}")
        print(f"  - Maybe: {data['attend_maybe']}")
    
    def test_admin_export_csv(self, admin_session):
        """Test CSV export endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/admin/export-csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Check CSV content
        content = response.text
        assert "full_name" in content or "No registrations" in content
        print("✓ CSV export successful")
    
    def test_admin_export_csv_unauthenticated(self):
        """Test CSV export without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv")
        assert response.status_code == 401
        print("✓ CSV export correctly blocked for unauthenticated users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
