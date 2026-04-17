"""
Test Suite for Shrimad Bhagavat Katha Mahotsav 2026 - Admin Overhaul (Iteration 7)
Tests: Super Admin role, sidebar restructure, recycle bin, room management, filters, etc.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
REGULAR_ADMIN = {"username": "arunpanchariya", "password": "arunlondon123"}
REGULAR_ADMIN_2 = {"username": "ashokpanchariya", "password": "ashokahmedabad123"}
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}


class TestAuthAndRoles:
    """Test authentication and role-based access"""
    
    def test_regular_admin_login(self):
        """Regular admin login returns role='admin'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "admin", f"Expected role='admin', got {data['role']}"
        assert data["username"] == "arunpanchariya"
        print(f"✓ Regular admin login: role={data['role']}")
    
    def test_super_admin_login(self):
        """Super admin login returns role='superadmin'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "superadmin", f"Expected role='superadmin', got {data['role']}"
        print(f"✓ Super admin login: role={data['role']}")
    
    def test_auth_me_returns_role(self):
        """GET /api/auth/me returns role in response"""
        # Login as super admin
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        token = login_res.json()["token"]
        
        # Check /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert "role" in data, "Role not in /auth/me response"
        assert data["role"] == "superadmin"
        print(f"✓ /auth/me returns role: {data['role']}")
    
    def test_invalid_credentials(self):
        """Invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "wrong", "password": "wrong"})
        assert response.status_code == 401
        print("✓ Invalid credentials return 401")


class TestDashboard:
    """Test dashboard endpoint with new format"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_structure(self):
        """Dashboard returns correct structure with daily_schedule and arrival_summary"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check main fields
        assert "total_approved" in data, "Missing total_approved"
        assert "total_people" in data, "Missing total_people"
        assert "pending_count" in data, "Missing pending_count"
        
        # Check arrival_summary structure
        assert "arrival_summary" in data, "Missing arrival_summary"
        as_ = data["arrival_summary"]
        assert "arrived" in as_ and "families" in as_["arrived"] and "people" in as_["arrived"]
        assert "not_arrived" in as_ and "families" in as_["not_arrived"] and "people" in as_["not_arrived"]
        assert "not_coming" in as_ and "families" in as_["not_coming"] and "people" in as_["not_coming"]
        
        # Check daily_schedule
        assert "daily_schedule" in data, "Missing daily_schedule"
        assert len(data["daily_schedule"]) == 7, "Expected 7 days in daily_schedule"
        for day in data["daily_schedule"]:
            assert "date" in day
            assert "arrivals_families" in day
            assert "arrivals_people" in day
            assert "departures_families" in day
            assert "departures_people" in day
        
        print(f"✓ Dashboard structure correct: {len(data['daily_schedule'])} days, arrival_summary present")


class TestRegistrationFilters:
    """Test new filter parameters for registrations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_arrival_date_range_filter(self):
        """Test arrival_from and arrival_to filters"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", 
                               headers=self.headers,
                               params={"arrival_from": "2026-05-28", "arrival_to": "2026-05-30"})
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Arrival date range filter works: {len(data['data'])} results")
    
    def test_departure_date_range_filter(self):
        """Test departure_from and departure_to filters"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations",
                               headers=self.headers,
                               params={"departure_from": "2026-06-01", "departure_to": "2026-06-03"})
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Departure date range filter works: {len(data['data'])} results")
    
    def test_arrival_status_filter(self):
        """Test arrival_status filter"""
        for status in ["Not Arrived", "Arrived", "Not Coming"]:
            response = requests.get(f"{BASE_URL}/api/admin/registrations",
                                   headers=self.headers,
                                   params={"status": "approved", "arrival_status": status})
            assert response.status_code == 200
            print(f"✓ Arrival status filter '{status}' works")


class TestRecycleBinAndRestore:
    """Test recycle bin functionality and restore to 'approved' status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a test registration
        self.test_reg = {
            "full_name": f"TEST_RecycleBin_{uuid.uuid4().hex[:6]}",
            "mobile": f"+91{uuid.uuid4().hex[:10]}",
            "address": "Test City, Test Country",
            "num_people": 2,
            "arrival_date": "2026-05-29",
            "departure_date": "2026-06-01",
            "attendees": [{"name": "Test Person", "category": "Adult", "special_needs": ""}],
            "admin_notes": "Test entry for recycle bin"
        }
    
    def test_delete_moves_to_recycle_bin(self):
        """Deleting a registration moves it to 'deleted' status (recycle bin)"""
        # Create manual entry
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual", 
                                   json=self.test_reg, headers=self.headers)
        assert create_res.status_code == 200
        reg_id = create_res.json()["id"]
        
        # Delete it
        delete_res = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
                                  json={"status": "deleted"}, headers=self.headers)
        assert delete_res.status_code == 200
        
        # Verify it's in deleted status
        get_res = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}", headers=self.headers)
        assert get_res.status_code == 200
        assert get_res.json()["approval_status"] == "deleted"
        print(f"✓ Delete moves to recycle bin (status=deleted)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", 
                       headers={"Authorization": f"Bearer {requests.post(f'{BASE_URL}/api/auth/login', json=SUPER_ADMIN).json()['token']}"})
    
    def test_restore_sets_approved_status(self):
        """Restoring from recycle bin sets status to 'approved' (not 'pending')"""
        # Create and delete
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual",
                                   json=self.test_reg, headers=self.headers)
        reg_id = create_res.json()["id"]
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
                    json={"status": "deleted"}, headers=self.headers)
        
        # Restore
        restore_res = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
                                   json={"status": "approved"}, headers=self.headers)
        assert restore_res.status_code == 200
        
        # Verify status is 'approved'
        get_res = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}", headers=self.headers)
        assert get_res.json()["approval_status"] == "approved", "Restore should set status to 'approved'"
        print(f"✓ Restore sets status to 'approved' (not 'pending')")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent",
                       headers={"Authorization": f"Bearer {requests.post(f'{BASE_URL}/api/auth/login', json=SUPER_ADMIN).json()['token']}"})


class TestRoomManagementSuperAdminOnly:
    """Test that room create/delete/bulk operations require super admin"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Regular admin token
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = login_res.json()["token"]
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
        
        # Super admin token
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_token = super_login.json()["token"]
        self.super_headers = {"Authorization": f"Bearer {self.super_token}"}
    
    def test_regular_admin_cannot_create_room(self):
        """Regular admin gets 403 when trying to create room"""
        response = requests.post(f"{BASE_URL}/api/admin/rooms",
                                json={"room_code": "TEST_R999", "capacity": 2, "ac_type": "AC"},
                                headers=self.regular_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Regular admin cannot create room (403)")
    
    def test_regular_admin_cannot_bulk_add_rooms(self):
        """Regular admin gets 403 when trying to bulk add rooms"""
        response = requests.post(f"{BASE_URL}/api/admin/rooms/bulk",
                                json={"rooms": [{"room_code": "TEST_B1", "capacity": 2, "ac_type": "AC"}]},
                                headers=self.regular_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Regular admin cannot bulk add rooms (403)")
    
    def test_regular_admin_cannot_delete_room(self):
        """Regular admin gets 403 when trying to delete room"""
        # First create a room as super admin
        create_res = requests.post(f"{BASE_URL}/api/admin/rooms",
                                   json={"room_code": "TEST_DEL1", "capacity": 2, "ac_type": "AC"},
                                   headers=self.super_headers)
        
        # Try to delete as regular admin
        response = requests.delete(f"{BASE_URL}/api/admin/rooms/TEST_DEL1", headers=self.regular_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Regular admin cannot delete room (403)")
        
        # Cleanup as super admin
        requests.delete(f"{BASE_URL}/api/admin/rooms/TEST_DEL1", headers=self.super_headers)
    
    def test_super_admin_can_create_room(self):
        """Super admin can create room"""
        room_code = f"TEST_SA_{uuid.uuid4().hex[:4]}"
        response = requests.post(f"{BASE_URL}/api/admin/rooms",
                                json={"room_code": room_code, "capacity": 3, "ac_type": "Non-AC", "notes": "Test room"},
                                headers=self.super_headers)
        assert response.status_code == 200, f"Super admin should create room: {response.text}"
        data = response.json()
        assert data["room_code"] == room_code
        assert data["capacity"] == 3
        assert data["ac_type"] == "Non-AC"
        print(f"✓ Super admin can create room: {room_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room_code}", headers=self.super_headers)


class TestRoomShift:
    """Test room shift functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_token = super_login.json()["token"]
        self.super_headers = {"Authorization": f"Bearer {self.super_token}"}
        
        regular_login = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = regular_login.json()["token"]
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_shift_to_unoccupied_room(self):
        """Can shift occupant to unoccupied room"""
        # Create two rooms
        room1 = f"TEST_SHIFT1_{uuid.uuid4().hex[:4]}"
        room2 = f"TEST_SHIFT2_{uuid.uuid4().hex[:4]}"
        requests.post(f"{BASE_URL}/api/admin/rooms", json={"room_code": room1, "capacity": 2, "ac_type": "AC"}, headers=self.super_headers)
        requests.post(f"{BASE_URL}/api/admin/rooms", json={"room_code": room2, "capacity": 2, "ac_type": "AC"}, headers=self.super_headers)
        
        # Create a guest and assign to room1
        guest = {
            "full_name": f"TEST_ShiftGuest_{uuid.uuid4().hex[:4]}",
            "mobile": f"+91{uuid.uuid4().hex[:10]}",
            "address": "Test City",
            "num_people": 1,
            "attendees": []
        }
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest, headers=self.regular_headers)
        guest_id = create_res.json()["id"]
        
        # Assign to room1
        requests.put(f"{BASE_URL}/api/admin/rooms/{room1}/assign", 
                    json={"registration_id": guest_id}, headers=self.regular_headers)
        
        # Shift to room2
        shift_res = requests.put(f"{BASE_URL}/api/admin/rooms/{room1}/shift",
                                json={"new_room_code": room2}, headers=self.regular_headers)
        assert shift_res.status_code == 200, f"Shift failed: {shift_res.text}"
        print(f"✓ Shift to unoccupied room works")
        
        # Cleanup
        requests.put(f"{BASE_URL}/api/admin/rooms/{room2}/unassign", headers=self.regular_headers)
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room1}", headers=self.super_headers)
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room2}", headers=self.super_headers)
        requests.delete(f"{BASE_URL}/api/admin/registrations/{guest_id}/permanent", headers=self.super_headers)
    
    def test_cannot_shift_to_occupied_room(self):
        """Cannot shift to an already occupied room"""
        # Create rooms and guests
        room1 = f"TEST_OCC1_{uuid.uuid4().hex[:4]}"
        room2 = f"TEST_OCC2_{uuid.uuid4().hex[:4]}"
        requests.post(f"{BASE_URL}/api/admin/rooms", json={"room_code": room1, "capacity": 2, "ac_type": "AC"}, headers=self.super_headers)
        requests.post(f"{BASE_URL}/api/admin/rooms", json={"room_code": room2, "capacity": 2, "ac_type": "AC"}, headers=self.super_headers)
        
        # Create two guests
        guest1 = {"full_name": f"TEST_G1_{uuid.uuid4().hex[:4]}", "mobile": f"+91{uuid.uuid4().hex[:10]}", "address": "City", "num_people": 1, "attendees": []}
        guest2 = {"full_name": f"TEST_G2_{uuid.uuid4().hex[:4]}", "mobile": f"+91{uuid.uuid4().hex[:10]}", "address": "City", "num_people": 1, "attendees": []}
        g1_id = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest1, headers=self.regular_headers).json()["id"]
        g2_id = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest2, headers=self.regular_headers).json()["id"]
        
        # Assign guests to rooms
        requests.put(f"{BASE_URL}/api/admin/rooms/{room1}/assign", json={"registration_id": g1_id}, headers=self.regular_headers)
        requests.put(f"{BASE_URL}/api/admin/rooms/{room2}/assign", json={"registration_id": g2_id}, headers=self.regular_headers)
        
        # Try to shift from room1 to room2 (occupied)
        shift_res = requests.put(f"{BASE_URL}/api/admin/rooms/{room1}/shift",
                                json={"new_room_code": room2}, headers=self.regular_headers)
        assert shift_res.status_code == 409, f"Expected 409 for occupied room, got {shift_res.status_code}"
        print("✓ Cannot shift to occupied room (409)")
        
        # Cleanup
        requests.put(f"{BASE_URL}/api/admin/rooms/{room1}/unassign", headers=self.regular_headers)
        requests.put(f"{BASE_URL}/api/admin/rooms/{room2}/unassign", headers=self.regular_headers)
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room1}", headers=self.super_headers)
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room2}", headers=self.super_headers)
        requests.delete(f"{BASE_URL}/api/admin/registrations/{g1_id}/permanent", headers=self.super_headers)
        requests.delete(f"{BASE_URL}/api/admin/registrations/{g2_id}/permanent", headers=self.super_headers)


class TestSuperAdminExclusiveFeatures:
    """Test features exclusive to super admin"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_token = super_login.json()["token"]
        self.super_headers = {"Authorization": f"Bearer {self.super_token}"}
        
        regular_login = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = regular_login.json()["token"]
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_super_admin_can_permanent_delete(self):
        """Super admin can permanently delete from recycle bin"""
        # Create and delete a registration
        guest = {"full_name": f"TEST_PermDel_{uuid.uuid4().hex[:4]}", "mobile": f"+91{uuid.uuid4().hex[:10]}", "address": "City", "num_people": 1, "attendees": []}
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest, headers=self.regular_headers)
        reg_id = create_res.json()["id"]
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status", json={"status": "deleted"}, headers=self.regular_headers)
        
        # Permanent delete as super admin
        perm_del_res = requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", headers=self.super_headers)
        assert perm_del_res.status_code == 200, f"Permanent delete failed: {perm_del_res.text}"
        
        # Verify it's gone
        get_res = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}", headers=self.super_headers)
        assert get_res.status_code == 404, "Registration should be permanently deleted"
        print("✓ Super admin can permanently delete")
    
    def test_regular_admin_cannot_permanent_delete(self):
        """Regular admin cannot permanently delete"""
        # Create and delete
        guest = {"full_name": f"TEST_NoPerm_{uuid.uuid4().hex[:4]}", "mobile": f"+91{uuid.uuid4().hex[:10]}", "address": "City", "num_people": 1, "attendees": []}
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest, headers=self.regular_headers)
        reg_id = create_res.json()["id"]
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status", json={"status": "deleted"}, headers=self.regular_headers)
        
        # Try permanent delete as regular admin
        perm_del_res = requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", headers=self.regular_headers)
        assert perm_del_res.status_code == 403, f"Expected 403, got {perm_del_res.status_code}"
        print("✓ Regular admin cannot permanently delete (403)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", headers=self.super_headers)
    
    def test_super_admin_can_clear_audit_logs(self):
        """Super admin can clear audit logs"""
        # First do some action to create audit log
        guest = {"full_name": f"TEST_Audit_{uuid.uuid4().hex[:4]}", "mobile": f"+91{uuid.uuid4().hex[:10]}", "address": "City", "num_people": 1, "attendees": []}
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest, headers=self.super_headers)
        reg_id = create_res.json()["id"]
        
        # Clear audit logs
        clear_res = requests.delete(f"{BASE_URL}/api/admin/audit-logs", headers=self.super_headers)
        assert clear_res.status_code == 200, f"Clear audit logs failed: {clear_res.text}"
        print("✓ Super admin can clear audit logs")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", headers=self.super_headers)
    
    def test_regular_admin_cannot_clear_audit_logs(self):
        """Regular admin cannot clear audit logs"""
        clear_res = requests.delete(f"{BASE_URL}/api/admin/audit-logs", headers=self.regular_headers)
        assert clear_res.status_code == 403, f"Expected 403, got {clear_res.status_code}"
        print("✓ Regular admin cannot clear audit logs (403)")


class TestAdminManagement:
    """Test super admin's ability to manage custom admins"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_token = super_login.json()["token"]
        self.super_headers = {"Authorization": f"Bearer {self.super_token}"}
        
        regular_login = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = regular_login.json()["token"]
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_super_admin_can_list_admins(self):
        """Super admin can list all admins"""
        response = requests.get(f"{BASE_URL}/api/admin/admins", headers=self.super_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should include system admins (excluding superadmin)
        usernames = [a["username"] for a in data]
        assert "arunpanchariya" in usernames
        print(f"✓ Super admin can list admins: {len(data)} admins")
    
    def test_regular_admin_cannot_list_admins(self):
        """Regular admin cannot list admins"""
        response = requests.get(f"{BASE_URL}/api/admin/admins", headers=self.regular_headers)
        assert response.status_code == 403
        print("✓ Regular admin cannot list admins (403)")
    
    def test_super_admin_can_create_custom_admin(self):
        """Super admin can create custom admin"""
        custom_admin = {
            "username": f"test_custom_{uuid.uuid4().hex[:6]}",
            "password": "testpass123",
            "name": "Test Custom Admin",
            "city": "Test City",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/admin/admins", json=custom_admin, headers=self.super_headers)
        assert response.status_code == 200, f"Create custom admin failed: {response.text}"
        print(f"✓ Super admin can create custom admin: {custom_admin['username']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/admins/{custom_admin['username']}", headers=self.super_headers)


class TestManualEntry:
    """Test manual entry dialog - no management details, room assignment, or arrival status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_headers = {"Authorization": f"Bearer {super_login.json()['token']}"}
    
    def test_manual_entry_creates_approved_status(self):
        """Manual entry creates with approval_status='approved'"""
        guest = {
            "full_name": f"TEST_Manual_{uuid.uuid4().hex[:4]}",
            "mobile": f"+91{uuid.uuid4().hex[:10]}",
            "address": "Test City, Country",
            "num_people": 2,
            "attendees": [{"name": "Person 1", "category": "Adult", "special_needs": ""}],
            "admin_notes": "Test notes"
        }
        response = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "approved"
        assert data["entry_type"] == "manual"
        assert data["arrival_status"] == "Not Arrived"  # Default
        assert data["room_assignment"] == ""  # No room assigned by default
        print("✓ Manual entry creates with approved status, no room, default arrival status")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{data['id']}/permanent", headers=self.super_headers)


class TestArrivalStatusToggle:
    """Test arrival status toggle with confirmation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_headers = {"Authorization": f"Bearer {super_login.json()['token']}"}
    
    def test_arrival_status_change(self):
        """Can change arrival status via management endpoint"""
        # Create guest
        guest = {"full_name": f"TEST_Arrival_{uuid.uuid4().hex[:4]}", "mobile": f"+91{uuid.uuid4().hex[:10]}", "address": "City", "num_people": 1, "attendees": []}
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest, headers=self.headers)
        reg_id = create_res.json()["id"]
        
        # Change to Arrived
        update_res = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/management",
                                  json={"arrival_status": "Arrived"}, headers=self.headers)
        assert update_res.status_code == 200
        
        # Verify
        get_res = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}", headers=self.headers)
        assert get_res.json()["arrival_status"] == "Arrived"
        
        # Change to Not Coming
        update_res = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/management",
                                  json={"arrival_status": "Not Coming"}, headers=self.headers)
        assert update_res.status_code == 200
        
        get_res = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}", headers=self.headers)
        assert get_res.json()["arrival_status"] == "Not Coming"
        print("✓ Arrival status toggle works (Not Arrived → Arrived → Not Coming)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", headers=self.super_headers)


class TestRegistrationForm:
    """Test public registration form fields"""
    
    def test_registration_with_additional_phone_and_address(self):
        """Registration accepts additional_phone and address fields"""
        reg = {
            "full_name": f"TEST_Form_{uuid.uuid4().hex[:4]}",
            "mobile": f"+91{uuid.uuid4().hex[:10]}",
            "additional_phone": "+91 9876543210",
            "email": "test@example.com",
            "address": "123 Test Street, Test City, Test Country",
            "attendance_intent": "Yes",
            "arrival_date": "2026-05-29",
            "departure_date": "2026-06-01",
            "num_people": 2,
            "attendees": [{"name": "Test Person", "category": "Adult", "special_needs": ""}],
            "message": "Test message",
            "consent": True
        }
        response = requests.post(f"{BASE_URL}/api/registrations", json=reg)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert data["additional_phone"] == "+91 9876543210"
        assert data["address"] == "123 Test Street, Test City, Test Country"
        assert data["approval_status"] == "pending"
        print("✓ Registration form accepts additional_phone and address")
        
        # Cleanup
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        super_headers = {"Authorization": f"Bearer {super_login.json()['token']}"}
        requests.delete(f"{BASE_URL}/api/admin/registrations/{data['id']}/permanent", headers=super_headers)


class TestEditGuestWithInternalNotes:
    """Test editing guest with internal notes field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        super_login = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_headers = {"Authorization": f"Bearer {super_login.json()['token']}"}
    
    def test_edit_guest_with_admin_notes(self):
        """Can edit guest and update admin_notes"""
        # Create guest
        guest = {"full_name": f"TEST_Edit_{uuid.uuid4().hex[:4]}", "mobile": f"+91{uuid.uuid4().hex[:10]}", "address": "City", "num_people": 1, "attendees": []}
        create_res = requests.post(f"{BASE_URL}/api/admin/registrations/manual", json=guest, headers=self.headers)
        reg_id = create_res.json()["id"]
        
        # Edit with admin_notes
        update_res = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}",
                                  json={"admin_notes": "VIP guest - special attention needed"}, headers=self.headers)
        assert update_res.status_code == 200
        
        # Verify
        get_res = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}", headers=self.headers)
        assert get_res.json()["admin_notes"] == "VIP guest - special attention needed"
        print("✓ Edit guest with internal notes works")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", headers=self.super_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
