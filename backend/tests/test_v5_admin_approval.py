"""
V5 Backend Tests - Admin Approval System with Hardcoded Credentials
Tests for:
- Admin login with hardcoded credentials (4 admin accounts)
- Registration creation with approval_status, num_people, attendees
- 3-bucket approval system (pending/approved/deleted)
- Activity logs
- Summary endpoint with status counts
- CSV export (approved only)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://guest-arrival-hub-3.preview.emergentagent.com').rstrip('/')

# Hardcoded admin credentials from server.py
ADMIN_ACCOUNTS = [
    {"username": "arunpanchariya", "password": "arunlondon123", "name": "Arun Panchariya", "city": "London"},
    {"username": "ashokpanchariya", "password": "ashokahmedabad123", "name": "Ashok Panchariya", "city": "Ahmedabad"},
    {"username": "satishpanchariya", "password": "satishmumbai123", "name": "Satish Panchariya", "city": "Mumbai"},
    {"username": "basantmalpani", "password": "basantjaipur123", "name": "Basant Malpani", "city": "Jaipur"},
]


class TestAdminAuthentication:
    """Test admin login with hardcoded credentials"""
    
    def test_admin_login_arun_success(self):
        """Test login with arunpanchariya credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert data["username"] == "arunpanchariya"
        assert data["name"] == "Arun Panchariya"
        assert data["city"] == "London"
        print(f"✓ Admin login successful for arunpanchariya")
    
    def test_admin_login_ashok_success(self):
        """Test login with ashokpanchariya credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "ashokpanchariya",
            "password": "ashokahmedabad123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["username"] == "ashokpanchariya"
        assert data["name"] == "Ashok Panchariya"
        assert data["city"] == "Ahmedabad"
        print(f"✓ Admin login successful for ashokpanchariya")
    
    def test_admin_login_satish_success(self):
        """Test login with satishpanchariya credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "satishpanchariya",
            "password": "satishmumbai123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "satishpanchariya"
        assert data["name"] == "Satish Panchariya"
        print(f"✓ Admin login successful for satishpanchariya")
    
    def test_admin_login_basant_success(self):
        """Test login with basantmalpani credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "basantmalpani",
            "password": "basantjaipur123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "basantmalpani"
        assert data["name"] == "Basant Malpani"
        print(f"✓ Admin login successful for basantmalpani")
    
    def test_admin_login_wrong_password(self):
        """Test login with wrong password - should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "Invalid credentials" in data["detail"]
        print(f"✓ Login correctly rejected for wrong password")
    
    def test_admin_login_wrong_username(self):
        """Test login with non-existent username - should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "nonexistentuser",
            "password": "somepassword"
        })
        assert response.status_code == 401
        print(f"✓ Login correctly rejected for non-existent username")
    
    def test_admin_login_case_insensitive_username(self):
        """Test that username is case-insensitive"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "ARUNPANCHARIYA",
            "password": "arunlondon123"
        })
        assert response.status_code == 200, "Username should be case-insensitive"
        print(f"✓ Username is case-insensitive")
    
    def test_auth_me_endpoint(self):
        """Test /api/auth/me returns current user info"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        token = login_resp.json()["token"]
        
        # Then check /me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "arunpanchariya"
        assert data["name"] == "Arun Panchariya"
        print(f"✓ /api/auth/me returns correct user info")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me without token - should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ /api/auth/me correctly rejects unauthenticated request")


class TestRegistrationCreation:
    """Test registration creation with new schema"""
    
    def test_create_registration_with_attendees(self):
        """Test POST /api/registrations with dynamic attendees array"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "full_name": f"TEST_V5_{unique_id}",
            "mobile": "+91 9876543210",
            "email": f"test_{unique_id}@example.com",
            "city": "Mumbai",
            "country": "India",
            "attendance_intent": "Yes",
            "arrival_date": "2026-05-28",
            "departure_date": "2026-06-03",
            "days_attending": ["28 May", "29 May", "30 May"],
            "num_people": 3,
            "attendees": [
                {"name": "Person One", "category": "Adult", "special_needs": ""},
                {"name": "Person Two", "category": "Child", "special_needs": "Wheelchair"},
                {"name": "Person Three", "category": "Senior", "special_needs": ""}
            ],
            "message": "Test registration",
            "consent": True
        }
        
        response = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["approval_status"] == "pending", "New registration should have pending status"
        assert data["num_people"] == 3
        assert len(data["attendees"]) == 3
        assert data["attendees"][0]["name"] == "Person One"
        assert data["attendees"][1]["category"] == "Child"
        assert data["attendees"][1]["special_needs"] == "Wheelchair"
        print(f"✓ Registration created with id: {data['id']}, approval_status: pending")
        return data["id"]
    
    def test_create_registration_minimal(self):
        """Test registration with minimal required fields"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "full_name": f"TEST_V5_Minimal_{unique_id}",
            "mobile": "+91 1234567890",
            "num_people": 1,
            "attendees": [{"name": "Solo Person", "category": "Adult", "special_needs": ""}],
            "consent": True
        }
        
        response = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "pending"
        print(f"✓ Minimal registration created successfully")


class TestApprovalWorkflow:
    """Test 3-bucket approval system"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_registration(self):
        """Create a test registration for approval workflow tests"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "full_name": f"TEST_V5_Approval_{unique_id}",
            "mobile": "+91 9999999999",
            "num_people": 2,
            "attendees": [
                {"name": "Test Person 1", "category": "Adult", "special_needs": ""},
                {"name": "Test Person 2", "category": "Adult", "special_needs": ""}
            ],
            "consent": True
        }
        response = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        return response.json()
    
    def test_get_all_registrations(self, admin_token):
        """Test GET /api/admin/registrations returns all registrations"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/registrations returned {len(data)} registrations")
    
    def test_get_registrations_by_status(self, admin_token):
        """Test filtering registrations by status"""
        # Get pending
        response = requests.get(f"{BASE_URL}/api/admin/registrations?status=pending", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        pending = response.json()
        for reg in pending:
            assert reg.get("approval_status", "pending") == "pending"
        print(f"✓ Filtered pending registrations: {len(pending)}")
        
        # Get approved
        response = requests.get(f"{BASE_URL}/api/admin/registrations?status=approved", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        approved = response.json()
        for reg in approved:
            assert reg["approval_status"] == "approved"
        print(f"✓ Filtered approved registrations: {len(approved)}")
    
    def test_approve_registration(self, admin_token, test_registration):
        """Test PUT /api/admin/registrations/{id}/status with status=approved"""
        reg_id = test_registration["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["new_status"] == "approved"
        print(f"✓ Registration {reg_id} approved successfully")
    
    def test_delete_registration(self, admin_token, test_registration):
        """Test PUT /api/admin/registrations/{id}/status with status=deleted"""
        reg_id = test_registration["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "deleted"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "deleted"
        print(f"✓ Registration {reg_id} moved to deleted (recycle bin)")
    
    def test_restore_registration(self, admin_token, test_registration):
        """Test restoring a deleted registration back to pending"""
        reg_id = test_registration["id"]
        
        # First delete it
        requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "deleted"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Then restore it
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "pending"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "pending"
        print(f"✓ Registration {reg_id} restored to pending")
    
    def test_invalid_status_update(self, admin_token, test_registration):
        """Test that invalid status values are rejected"""
        reg_id = test_registration["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "invalid_status"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        print(f"✓ Invalid status correctly rejected")
    
    def test_status_update_without_auth(self, test_registration):
        """Test that status update requires authentication"""
        reg_id = test_registration["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "approved"}
        )
        assert response.status_code == 401
        print(f"✓ Status update correctly requires authentication")


class TestActivityLogs:
    """Test activity logging for admin actions"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "ashokpanchariya",
            "password": "ashokahmedabad123"
        })
        return response.json()["token"]
    
    def test_get_activity_logs(self, admin_token):
        """Test GET /api/admin/activity-logs returns logs"""
        response = requests.get(f"{BASE_URL}/api/admin/activity-logs", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/activity-logs returned {len(data)} logs")
    
    def test_activity_log_created_on_status_change(self, admin_token):
        """Test that activity log is created when status changes"""
        # Create a registration
        unique_id = str(uuid.uuid4())[:8]
        reg_resp = requests.post(f"{BASE_URL}/api/registrations", json={
            "full_name": f"TEST_V5_ActivityLog_{unique_id}",
            "mobile": "+91 8888888888",
            "num_people": 1,
            "attendees": [{"name": "Log Test", "category": "Adult", "special_needs": ""}],
            "consent": True
        })
        reg_id = reg_resp.json()["id"]
        
        # Get current log count
        logs_before = requests.get(f"{BASE_URL}/api/admin/activity-logs", headers={
            "Authorization": f"Bearer {admin_token}"
        }).json()
        
        # Approve the registration
        requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Get logs after
        logs_after = requests.get(f"{BASE_URL}/api/admin/activity-logs", headers={
            "Authorization": f"Bearer {admin_token}"
        }).json()
        
        assert len(logs_after) > len(logs_before), "Activity log should be created"
        
        # Check the latest log
        latest_log = logs_after[0]  # Sorted by performed_at desc
        assert latest_log["registration_id"] == reg_id
        assert latest_log["action"] == "approved"
        assert latest_log["old_status"] == "pending"
        assert "performed_by" in latest_log
        assert "performed_at" in latest_log
        print(f"✓ Activity log created with correct details")
    
    def test_activity_logs_require_auth(self):
        """Test that activity logs require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/activity-logs")
        assert response.status_code == 401
        print(f"✓ Activity logs correctly require authentication")


class TestSummaryEndpoint:
    """Test admin summary endpoint with status counts"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    def test_get_summary(self, admin_token):
        """Test GET /api/admin/summary returns counts by status"""
        response = requests.get(f"{BASE_URL}/api/admin/summary", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "total_registrations" in data
        assert "pending_count" in data
        assert "approved_count" in data
        assert "deleted_count" in data
        assert "total_people" in data
        
        # Verify counts are non-negative integers
        assert isinstance(data["total_registrations"], int) and data["total_registrations"] >= 0
        assert isinstance(data["pending_count"], int) and data["pending_count"] >= 0
        assert isinstance(data["approved_count"], int) and data["approved_count"] >= 0
        assert isinstance(data["deleted_count"], int) and data["deleted_count"] >= 0
        
        print(f"✓ Summary: total={data['total_registrations']}, pending={data['pending_count']}, approved={data['approved_count']}, deleted={data['deleted_count']}")
    
    def test_summary_requires_auth(self):
        """Test that summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/summary")
        assert response.status_code == 401
        print(f"✓ Summary correctly requires authentication")


class TestCSVExport:
    """Test CSV export functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    def test_export_csv(self, admin_token):
        """Test GET /api/admin/export-csv returns CSV"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        print(f"✓ CSV export returned with correct content type")
    
    def test_csv_contains_only_approved(self, admin_token):
        """Test that CSV export only contains approved registrations"""
        # Create and approve a registration
        unique_id = str(uuid.uuid4())[:8]
        reg_resp = requests.post(f"{BASE_URL}/api/registrations", json={
            "full_name": f"TEST_V5_CSV_Approved_{unique_id}",
            "mobile": "+91 7777777777",
            "num_people": 1,
            "attendees": [{"name": "CSV Test", "category": "Adult", "special_needs": ""}],
            "consent": True
        })
        reg_id = reg_resp.json()["id"]
        
        # Approve it
        requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Export CSV
        response = requests.get(f"{BASE_URL}/api/admin/export-csv", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        csv_content = response.text
        
        # Check that our approved registration is in the CSV
        assert f"TEST_V5_CSV_Approved_{unique_id}" in csv_content, "Approved registration should be in CSV"
        print(f"✓ CSV export contains approved registrations")
    
    def test_csv_export_requires_auth(self):
        """Test that CSV export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv")
        assert response.status_code == 401
        print(f"✓ CSV export correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
