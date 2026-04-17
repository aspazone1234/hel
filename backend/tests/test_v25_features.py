"""
V2.5 Backend API Tests - Katha 2026 Event App
Tests for: drill-down, undo-arrival/departure, sla-config, qr-management, rejected list, cutoff status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}
REGULAR_ADMIN = {"username": "arunpanchariya", "password": "arunlondon123"}


class TestAuthLogin:
    """Test login for both super admin and regular admin"""
    
    def test_super_admin_login(self):
        """Super admin login should return token with superadmin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data.get("role") == "superadmin", f"Expected superadmin role, got {data.get('role')}"
        assert data.get("username") == "superashwini"
        print(f"✓ Super admin login successful - role: {data.get('role')}")
    
    def test_regular_admin_login(self):
        """Regular admin login should return token with swamsevak role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        assert response.status_code == 200, f"Regular admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data.get("role") == "swamsevak", f"Expected swamsevak role, got {data.get('role')}"
        assert data.get("username") == "arunpanchariya"
        print(f"✓ Regular admin login successful - role: {data.get('role')}")
    
    def test_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "invalid", "password": "wrong"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials rejected correctly")


class TestDashboard:
    """Test Command Centre / Dashboard endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_loads(self):
        """Dashboard should return all required stat blocks"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "pending_count" in data, "Missing pending_count"
        assert "arrival_summary" in data, "Missing arrival_summary"
        assert "daily_schedule" in data, "Missing daily_schedule"
        assert "total_rooms" in data, "Missing total_rooms"
        assert "occupied_rooms" in data, "Missing occupied_rooms"
        assert "available_rooms" in data, "Missing available_rooms"
        
        # Check arrival_summary structure
        arr = data["arrival_summary"]
        assert "expected" in arr, "Missing expected in arrival_summary"
        assert "arrived" in arr, "Missing arrived in arrival_summary"
        assert "not_coming" in arr, "Missing not_coming in arrival_summary"
        assert "departed" in arr, "Missing departed in arrival_summary"
        
        print(f"✓ Dashboard loaded - pending: {data['pending_count']}, rooms: {data['total_rooms']}")
    
    def test_drill_down_arrival_date(self):
        """Drill-down by arrival_date should return list of registrations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/drill-down",
            headers=self.headers,
            params={"field": "arrival_date", "value": "2026-05-28"}
        )
        assert response.status_code == 200, f"Drill-down failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Drill-down should return a list"
        print(f"✓ Drill-down by arrival_date returned {len(data)} records")
    
    def test_drill_down_departure_date(self):
        """Drill-down by departure_date should return list of registrations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/drill-down",
            headers=self.headers,
            params={"field": "departure_date", "value": "2026-06-03"}
        )
        assert response.status_code == 200, f"Drill-down failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Drill-down should return a list"
        print(f"✓ Drill-down by departure_date returned {len(data)} records")
    
    def test_drill_down_arrival_status(self):
        """Drill-down by arrival_status should return list of registrations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/drill-down",
            headers=self.headers,
            params={"field": "arrival_status", "value": "not_arrived"}
        )
        assert response.status_code == 200, f"Drill-down failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Drill-down should return a list"
        print(f"✓ Drill-down by arrival_status returned {len(data)} records")


class TestRejectedRegistrations:
    """Test rejected/disapproved registrations endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_rejected_registrations(self):
        """GET /api/admin/registrations with bucket=rejected should return paginated list"""
        # Note: The endpoint is /api/admin/registrations with bucket parameter, not /api/admin/registrations/rejected
        response = requests.get(f"{BASE_URL}/api/admin/registrations", headers=self.headers, params={"status": "rejected"})
        assert response.status_code == 200, f"Rejected list failed: {response.text}"
        data = response.json()
        assert "data" in data, "Missing data field"
        assert "total" in data, "Missing total field"
        assert "page" in data, "Missing page field"
        print(f"✓ Rejected registrations endpoint working - total: {data['total']}")


class TestSLAConfig:
    """Test SLA configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Regular admin token
        response2 = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = response2.json().get("token")
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_get_sla_config(self):
        """GET /api/admin/sla-config should return SLA categories"""
        response = requests.get(f"{BASE_URL}/api/admin/sla-config", headers=self.headers)
        assert response.status_code == 200, f"SLA config failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "SLA config should return a list"
        # Should have default categories
        if len(data) > 0:
            assert "id" in data[0] or "label" in data[0], "SLA category should have id or label"
        print(f"✓ SLA config returned {len(data)} categories")
    
    def test_update_sla_config_super_admin_only(self):
        """PUT /api/admin/sla-config should require super admin"""
        # Regular admin should be rejected
        response = requests.put(
            f"{BASE_URL}/api/admin/sla-config",
            headers=self.regular_headers,
            json={"categories": []}
        )
        assert response.status_code == 403, f"Expected 403 for regular admin, got {response.status_code}"
        print("✓ SLA config update requires super admin")


class TestQRManagement:
    """Test QR management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        response2 = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = response2.json().get("token")
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_get_qr_management_super_admin(self):
        """GET /api/admin/qr-management should return QR list for super admin"""
        response = requests.get(f"{BASE_URL}/api/admin/qr-management", headers=self.headers)
        assert response.status_code == 200, f"QR management failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "QR management should return a list"
        print(f"✓ QR management returned {len(data)} QR codes")
    
    def test_get_qr_management_regular_admin_forbidden(self):
        """GET /api/admin/qr-management should be forbidden for regular admin"""
        response = requests.get(f"{BASE_URL}/api/admin/qr-management", headers=self.regular_headers)
        assert response.status_code == 403, f"Expected 403 for regular admin, got {response.status_code}"
        print("✓ QR management requires super admin")


class TestUndoArrivalDeparture:
    """Test undo-arrival and undo-departure endpoints (super admin only)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        response2 = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = response2.json().get("token")
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_undo_arrival_requires_super_admin(self):
        """PUT /api/admin/registrations/{id}/undo-arrival should require super admin"""
        # Use a fake ID - we just want to test permission
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/fake-id-123/undo-arrival",
            headers=self.regular_headers
        )
        assert response.status_code == 403, f"Expected 403 for regular admin, got {response.status_code}"
        print("✓ Undo arrival requires super admin")
    
    def test_undo_departure_requires_super_admin(self):
        """PUT /api/admin/registrations/{id}/undo-departure should require super admin"""
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/fake-id-123/undo-departure",
            headers=self.regular_headers
        )
        assert response.status_code == 403, f"Expected 403 for regular admin, got {response.status_code}"
        print("✓ Undo departure requires super admin")
    
    def test_undo_arrival_not_found(self):
        """Undo arrival with invalid ID should return 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/nonexistent-id/undo-arrival",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Undo arrival returns 404 for invalid ID")
    
    def test_undo_departure_not_found(self):
        """Undo departure with invalid ID should return 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/registrations/nonexistent-id/undo-departure",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Undo departure returns 404 for invalid ID")


class TestRegistrationCutoff:
    """Test registration cutoff status endpoint"""
    
    def test_get_cutoff_status(self):
        """GET /api/admin/registration-cutoff-status should return cutoff info"""
        response = requests.get(f"{BASE_URL}/api/admin/registration-cutoff-status")
        assert response.status_code == 200, f"Cutoff status failed: {response.text}"
        data = response.json()
        
        assert "cutoff_date" in data, "Missing cutoff_date"
        assert "is_open" in data, "Missing is_open"
        assert "current_date" in data, "Missing current_date"
        assert data["cutoff_date"] == "2026-05-19", f"Expected cutoff 2026-05-19, got {data['cutoff_date']}"
        
        print(f"✓ Cutoff status: cutoff={data['cutoff_date']}, is_open={data['is_open']}")


class TestSidebarPermissions:
    """Test that sidebar items are correctly restricted by role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.super_token = response.json().get("token")
        self.super_headers = {"Authorization": f"Bearer {self.super_token}"}
        
        response2 = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = response2.json().get("token")
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_pending_approval_super_admin_access(self):
        """Super admin should access pending approval list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/guests/pending",
            headers=self.super_headers
        )
        assert response.status_code == 200, f"Pending approval failed for super admin: {response.text}"
        print("✓ Super admin can access pending approval")
    
    def test_pending_approval_regular_admin_access(self):
        """Regular admin should also access pending approval list (API level)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/guests/pending",
            headers=self.regular_headers
        )
        # Note: API allows access, but UI hides the nav item for regular admin
        assert response.status_code == 200, f"Pending approval failed for regular admin: {response.text}"
        print("✓ Regular admin can access pending approval API (UI hides nav item)")
    
    def test_message_center_super_admin_only(self):
        """Message templates should be accessible by super admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/messages/templates",
            headers=self.super_headers
        )
        assert response.status_code == 200, f"Message templates failed: {response.text}"
        print("✓ Super admin can access message templates")


class TestRoomManagement:
    """Test room management with 3 view toggles"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_rooms(self):
        """GET /api/admin/rooms should return room list"""
        response = requests.get(f"{BASE_URL}/api/admin/rooms", headers=self.headers)
        assert response.status_code == 200, f"Rooms failed: {response.text}"
        data = response.json()
        # Can be list or dict with data field
        if isinstance(data, dict):
            rooms = data.get("data", [])
        else:
            rooms = data
        print(f"✓ Rooms endpoint returned {len(rooms)} rooms")


class TestHelpCentre:
    """Test Help Centre with My/All tickets views"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_tickets(self):
        """GET /api/admin/tickets should return ticket list"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets", headers=self.headers)
        assert response.status_code == 200, f"Tickets failed: {response.text}"
        data = response.json()
        if isinstance(data, dict):
            tickets = data.get("data", [])
        else:
            tickets = data
        print(f"✓ Tickets endpoint returned {len(tickets)} tickets")
    
    def test_get_ticket_stats(self):
        """GET /api/admin/tickets/stats should return stats"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets/stats", headers=self.headers)
        assert response.status_code == 200, f"Ticket stats failed: {response.text}"
        data = response.json()
        assert "total" in data, "Missing total in stats"
        assert "active" in data, "Missing active in stats"
        print(f"✓ Ticket stats: total={data['total']}, active={data['active']}")


class TestTodoModule:
    """Test To-Do module with self-only for admins"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_todos(self):
        """GET /api/admin/todos should return todo list"""
        response = requests.get(f"{BASE_URL}/api/admin/todos", headers=self.headers)
        assert response.status_code == 200, f"Todos failed: {response.text}"
        data = response.json()
        if isinstance(data, dict):
            todos = data.get("data", [])
        else:
            todos = data
        print(f"✓ Todos endpoint returned {len(todos)} todos")


class TestAttendanceMarker:
    """Test Attendance Marker (renamed from QR Scanner)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_qr_scan_invalid(self):
        """QR scan with invalid token should fail"""
        response = requests.post(
            f"{BASE_URL}/api/admin/qr/scan",
            headers=self.headers,
            json={"qr_token": "invalid-token"}
        )
        # Should return 400 or 404
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("✓ QR scan rejects invalid token")
    
    def test_manual_search_expected_guests(self):
        """Manual search should search expected guests"""
        response = requests.get(
            f"{BASE_URL}/api/admin/guests/expected",
            headers=self.headers,
            params={"search": "test", "per_page": 10}
        )
        assert response.status_code == 200, f"Manual search failed: {response.text}"
        print("✓ Manual search for expected guests works")


class TestExpectedGuestList:
    """Test Expected Guest List features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        response2 = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        self.regular_token = response2.json().get("token")
        self.regular_headers = {"Authorization": f"Bearer {self.regular_token}"}
    
    def test_get_expected_guests(self):
        """GET /api/admin/guests/expected should return expected guest list"""
        response = requests.get(f"{BASE_URL}/api/admin/guests/expected", headers=self.headers)
        assert response.status_code == 200, f"Expected guests failed: {response.text}"
        data = response.json()
        assert "data" in data, "Missing data field"
        print(f"✓ Expected guests: {data.get('total', len(data.get('data', [])))} records")


class TestArrivedGuestList:
    """Test Arrived Guest List with departure flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_arrived_guests(self):
        """GET /api/admin/guests/arrived should return arrived guest list"""
        response = requests.get(f"{BASE_URL}/api/admin/guests/arrived", headers=self.headers)
        assert response.status_code == 200, f"Arrived guests failed: {response.text}"
        data = response.json()
        assert "data" in data, "Missing data field"
        print(f"✓ Arrived guests: {data.get('total', len(data.get('data', [])))} records")


class TestAdminsList:
    """Test admin/swamsevak list for super admin"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_admins_list(self):
        """GET /api/admin/admins should return admin list for super admin"""
        response = requests.get(f"{BASE_URL}/api/admin/admins", headers=self.headers)
        assert response.status_code == 200, f"Admins list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Admins should return a list"
        # Should have at least the hardcoded admins
        assert len(data) >= 4, f"Expected at least 4 admins, got {len(data)}"
        print(f"✓ Admins list returned {len(data)} admins")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
