"""
15-Point Audit Backend Tests for Shrimad Bhagavat Katha Mahotsav 2026
Tests admin authentication, registration API, and approval workflow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Point 14: Admin login uses username/password (not email)"""
    
    def test_admin_login_with_username_arunpanchariya(self):
        """Test login with arunpanchariya/arunlondon123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["username"] == "arunpanchariya"
        assert data["name"] == "Arun Panchariya"
        print(f"✓ Admin login successful: {data['name']}")
    
    def test_admin_login_with_username_ashokpanchariya(self):
        """Test login with ashokpanchariya/ashokahmedabad123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "ashokpanchariya",
            "password": "ashokahmedabad123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["username"] == "ashokpanchariya"
        print(f"✓ Admin login successful: {data['name']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_admin_login_with_email_fails(self):
        """Verify email-based login is not supported"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        # Should fail because API expects username, not email
        assert response.status_code in [401, 422], "Email login should not work"
        print("✓ Email-based login correctly not supported")


class TestAdminDashboard:
    """Point 13: Admin dashboard has 3 tabs + Activity Log"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth failed")
    
    def test_admin_registrations_endpoint(self, auth_token):
        """Test admin can fetch registrations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/registrations",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin registrations endpoint works: {len(data)} registrations")
    
    def test_admin_summary_endpoint(self, auth_token):
        """Test admin summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_registrations" in data
        assert "pending_count" in data
        assert "approved_count" in data
        assert "deleted_count" in data
        print(f"✓ Admin summary: {data['total_registrations']} total, {data['pending_count']} pending, {data['approved_count']} approved")
    
    def test_admin_activity_logs_endpoint(self, auth_token):
        """Test activity logs endpoint (Point 13: Activity Log tab)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-logs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Activity logs endpoint works: {len(data)} logs")


class TestRegistrationAPI:
    """Point 12: Registration form submits to /thank-you page"""
    
    def test_create_registration(self):
        """Test registration creation with required fields"""
        payload = {
            "full_name": "TEST_15Point_User",
            "mobile": "+91 9876543210",
            "email": "test@example.com",
            "city": "Mumbai",
            "country": "India",
            "attendance_intent": "Yes",
            "arrival_date": "2026-05-28",
            "departure_date": "2026-06-03",
            "days_attending": ["28 May", "29 May", "30 May"],
            "num_people": 2,
            "attendees": [
                {"name": "Test Person 1", "category": "Adult", "special_needs": ""},
                {"name": "Test Person 2", "category": "Child", "special_needs": ""}
            ],
            "message": "Test registration",
            "consent": True
        }
        response = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "id" in data, "No registration ID returned"
        assert data["full_name"] == "TEST_15Point_User"
        assert data["approval_status"] == "pending"
        print(f"✓ Registration created with ID: {data['id'][:8]}")
        return data["id"]
    
    def test_registration_count(self):
        """Test registration count endpoint"""
        response = requests.get(f"{BASE_URL}/api/registrations/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        print(f"✓ Total registrations: {data['total']}")


class TestApprovalWorkflow:
    """Point 13: 3-bucket approval system (Approval Center, Guest List, Recycle Bin)"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth failed")
    
    @pytest.fixture
    def test_registration(self, auth_token):
        """Create a test registration for approval workflow"""
        payload = {
            "full_name": "TEST_Approval_Workflow",
            "mobile": "+91 1234567890",
            "attendance_intent": "Yes",
            "arrival_date": "2026-05-28",
            "departure_date": "2026-06-03",
            "num_people": 1,
            "attendees": [{"name": "Test", "category": "Adult", "special_needs": ""}],
            "consent": True
        }
        response = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        return response.json()["id"]
    
    def test_approve_registration(self, auth_token, test_registration):
        """Test approving a registration (moves to Guest List)"""
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/{test_registration}/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "approved"
        print(f"✓ Registration approved: {test_registration[:8]}")
    
    def test_delete_registration(self, auth_token, test_registration):
        """Test deleting a registration (moves to Recycle Bin)"""
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/{test_registration}/status",
            json={"status": "deleted"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "deleted"
        print(f"✓ Registration deleted: {test_registration[:8]}")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
