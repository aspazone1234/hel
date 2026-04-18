"""
V3 Admin Dashboard API Tests
Tests all admin endpoints for Shrimad Bhagavat Katha Mahotsav 2026
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_USERNAME = "arunpanchariya"
ADMIN_PASSWORD = "arunlondon123"

class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test valid admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data["username"] == ADMIN_USERNAME
        assert "name" in data
        print(f"✓ Login successful for {ADMIN_USERNAME}")
    
    def test_login_invalid_credentials(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_with_token(self):
        """Test /auth/me returns user info with valid token"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Then check /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == ADMIN_USERNAME
        print("✓ /auth/me returns correct user info")
    
    def test_auth_me_without_token(self):
        """Test /auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me correctly rejects unauthenticated requests")


class TestDashboardEndpoint:
    """Dashboard API tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_dashboard_returns_stats(self, auth_token):
        """Test dashboard returns all required stats"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields
        required_fields = [
            "total_approved", "pending_count", "deleted_count", "rejected_count",
            "total_people", "arrivals_range", "departures_range",
            "arrived_families", "arrived_people", "not_coming",
            "missing_management", "total_rooms", "occupied_rooms", "available_rooms"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard stats: {data['total_approved']} approved, {data['pending_count']} pending, {data['deleted_count']} deleted")
    
    def test_dashboard_requires_auth(self):
        """Test dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401
        print("✓ Dashboard correctly requires authentication")


class TestRegistrationsEndpoints:
    """Registration CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_pending_registrations(self, auth_token):
        """Test fetching pending registrations"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "pending", "per_page": 20}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Pending registrations: {data['total']} total")
    
    def test_get_approved_registrations(self, auth_token):
        """Test fetching approved registrations"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "approved", "per_page": 20}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Approved registrations: {data['total']} total")
    
    def test_get_deleted_registrations(self, auth_token):
        """Test fetching deleted registrations (recycle bin)"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "deleted", "per_page": 20}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Deleted registrations (recycle bin): {data['total']} total")
    
    def test_search_registrations(self, auth_token):
        """Test search functionality"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "approved", "search": "test", "per_page": 20}
        )
        assert response.status_code == 200
        print("✓ Search functionality works")


class TestApprovalWorkflow:
    """Test approve/reject workflow"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_approve_registration(self, auth_token):
        """Test approving a pending registration"""
        # First get a pending registration
        pending_res = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "pending", "per_page": 1}
        )
        pending = pending_res.json()["data"]
        
        if not pending:
            pytest.skip("No pending registrations to test")
        
        reg_id = pending[0]["id"]
        reg_name = pending[0]["full_name"]
        
        # Approve it
        response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"status": "approved"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "approved"
        print(f"✓ Approved registration: {reg_name}")
        
        # Verify it's now approved
        verify_res = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_res.json()["approval_status"] == "approved"
        print("✓ Verified registration is now approved")
    
    def test_reject_registration(self, auth_token):
        """Test rejecting a pending registration"""
        # First get a pending registration
        pending_res = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "pending", "per_page": 1}
        )
        pending = pending_res.json()["data"]
        
        if not pending:
            pytest.skip("No pending registrations to test")
        
        reg_id = pending[0]["id"]
        
        # Reject it
        response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"status": "rejected"}
        )
        assert response.status_code == 200
        assert response.json()["new_status"] == "rejected"
        print("✓ Rejected registration successfully")


class TestRecycleBinWorkflow:
    """Test recycle bin (delete/restore) workflow"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_restore_from_recycle_bin(self, auth_token):
        """Test restoring a deleted registration"""
        # Get a deleted registration
        deleted_res = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "deleted", "per_page": 1}
        )
        deleted = deleted_res.json()["data"]
        
        if not deleted:
            pytest.skip("No deleted registrations to test restore")
        
        reg_id = deleted[0]["id"]
        reg_name = deleted[0]["full_name"]
        
        # Restore it (sets status to pending)
        response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"status": "pending"}
        )
        assert response.status_code == 200
        print(f"✓ Restored '{reg_name}' from recycle bin to pending")


class TestManualEntry:
    """Test manual entry creation"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_create_manual_entry(self, auth_token):
        """Test creating a manual entry"""
        unique_id = str(uuid.uuid4())[:8]
        entry = {
            "full_name": f"TEST_Manual Entry {unique_id}",
            "mobile": f"TEST{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "city": "Test City",
            "country": "India",
            "attendance_intent": "Yes",
            "arrival_date": "2026-05-28",
            "departure_date": "2026-06-03",
            "num_people": 2,
            "attendees": [
                {"name": "Person 1", "category": "Adult", "special_needs": ""},
                {"name": "Person 2", "category": "Child", "special_needs": ""}
            ],
            "message": "Test manual entry",
            "arrival_status": "Not Arrived",
            "room_assignment": "",
            "admin_notes": "Created by automated test"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/registrations/manual",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=entry
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["full_name"] == entry["full_name"]
        assert data["approval_status"] == "approved"  # Manual entries are auto-approved
        assert data["entry_type"] == "manual"
        print(f"✓ Created manual entry: {data['full_name']}")
        return data["id"]
    
    def test_duplicate_detection(self, auth_token):
        """Test duplicate mobile detection"""
        # First create an entry
        unique_id = str(uuid.uuid4())[:8]
        mobile = f"DUPE{unique_id}"
        
        entry = {
            "full_name": f"TEST_Dupe Test {unique_id}",
            "mobile": mobile,
            "city": "Test",
            "num_people": 1,
            "attendees": []
        }
        
        requests.post(f"{BASE_URL}/api/admin/registrations/manual",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=entry
        )
        
        # Check for duplicates
        response = requests.get(f"{BASE_URL}/api/admin/registrations/check-duplicate",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"mobile": mobile}
        )
        assert response.status_code == 200
        data = response.json()
        assert "duplicates" in data
        assert len(data["duplicates"]) > 0
        print(f"✓ Duplicate detection found {len(data['duplicates'])} match(es)")


class TestRoomManagement:
    """Test room CRUD operations"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_create_room(self, auth_token):
        """Test creating a room"""
        unique_id = str(uuid.uuid4())[:6]
        room = {
            "room_code": f"TEST-{unique_id}",
            "capacity": 2,
            "ac_type": "AC",
            "notes": "Test room"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/rooms",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=room
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["room_code"] == room["room_code"]
        assert data["status"] == "available"
        print(f"✓ Created room: {room['room_code']}")
        return room["room_code"]
    
    def test_get_rooms(self, auth_token):
        """Test fetching all rooms"""
        response = requests.get(f"{BASE_URL}/api/admin/rooms",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} rooms")
    
    def test_room_double_booking_prevention(self, auth_token):
        """Test that room double-booking returns 409"""
        # Create a room
        unique_id = str(uuid.uuid4())[:6]
        room_code = f"DBL-{unique_id}"
        
        requests.post(f"{BASE_URL}/api/admin/rooms",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"room_code": room_code, "capacity": 2, "ac_type": "Non-AC"}
        )
        
        # Create two manual entries
        entry1 = {
            "full_name": f"TEST_Guest1 {unique_id}",
            "mobile": f"G1{unique_id}",
            "num_people": 1,
            "attendees": [],
            "room_assignment": room_code
        }
        res1 = requests.post(f"{BASE_URL}/api/admin/registrations/manual",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=entry1
        )
        assert res1.status_code == 200
        
        # Try to assign same room to another guest
        entry2 = {
            "full_name": f"TEST_Guest2 {unique_id}",
            "mobile": f"G2{unique_id}",
            "num_people": 1,
            "attendees": [],
            "room_assignment": room_code
        }
        res2 = requests.post(f"{BASE_URL}/api/admin/registrations/manual",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=entry2
        )
        # Should fail with 400 (room already occupied)
        assert res2.status_code == 400, f"Expected 400 for double booking, got {res2.status_code}"
        print("✓ Room double-booking correctly prevented")
    
    def test_delete_room(self, auth_token):
        """Test deleting an unoccupied room"""
        # Create a room
        unique_id = str(uuid.uuid4())[:6]
        room_code = f"DEL-{unique_id}"
        
        requests.post(f"{BASE_URL}/api/admin/rooms",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"room_code": room_code, "capacity": 2, "ac_type": "Non-AC"}
        )
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/admin/rooms/{room_code}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✓ Deleted room: {room_code}")


class TestManagementUpdate:
    """Test management details update"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_update_arrival_status(self, auth_token):
        """Test updating arrival status"""
        # Get an approved registration
        approved_res = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "approved", "per_page": 1}
        )
        approved = approved_res.json()["data"]
        
        if not approved:
            pytest.skip("No approved registrations to test")
        
        reg_id = approved[0]["id"]
        
        # Update arrival status
        response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/management",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"arrival_status": "Arrived"}
        )
        assert response.status_code == 200
        print("✓ Updated arrival status to 'Arrived'")


class TestAuditLog:
    """Test audit log endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_audit_logs(self, auth_token):
        """Test fetching audit logs"""
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"page": 1, "per_page": 50}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Audit logs: {data['total']} entries")


class TestExports:
    """Test export endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_export_csv(self, auth_token):
        """Test CSV export"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ CSV export works")
    
    def test_export_pdf_guestlist(self, auth_token):
        """Test PDF export for guest list"""
        response = requests.get(f"{BASE_URL}/api/admin/export-pdf",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"report_type": "guestlist"}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        print("✓ PDF guest list export works")
    
    def test_export_pdf_rooms(self, auth_token):
        """Test PDF export for rooms"""
        response = requests.get(f"{BASE_URL}/api/admin/export-pdf",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"report_type": "rooms"}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        print("✓ PDF room allocation export works")


class TestBulkActions:
    """Test bulk action endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_bulk_approve(self, auth_token):
        """Test bulk approve action"""
        # Get pending registrations
        pending_res = requests.get(f"{BASE_URL}/api/admin/registrations", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "pending", "per_page": 2}
        )
        pending = pending_res.json()["data"]
        
        if len(pending) < 1:
            pytest.skip("Not enough pending registrations for bulk test")
        
        ids = [p["id"] for p in pending[:2]]
        
        response = requests.post(f"{BASE_URL}/api/admin/registrations/bulk-action",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"ids": ids, "action": "approve"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["affected"] > 0
        print(f"✓ Bulk approved {data['affected']} registrations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
