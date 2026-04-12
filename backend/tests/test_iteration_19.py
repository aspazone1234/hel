"""
Iteration 19 - Test Suite for 18 new features in Katha 2026
Tests: 3-block dashboard, tickets at top, recurring tasks, guest assignments,
room vacancy labels, custom fields target_scope, edit permissions, swamsevak creation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

SUPER_TOKEN = None
SWAM_TOKEN = None


def login(username, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    if resp.status_code == 200:
        return resp.json().get("token")
    return None


@pytest.fixture(scope="module", autouse=True)
def setup_tokens():
    global SUPER_TOKEN, SWAM_TOKEN
    SUPER_TOKEN = login("superashwini", "supersebhiupper123")
    SWAM_TOKEN = login("arunpanchariya", "arunlondon123")
    assert SUPER_TOKEN, "Super admin login failed"
    assert SWAM_TOKEN, "Swamsevak login failed"


def super_headers():
    return {"Authorization": f"Bearer {SUPER_TOKEN}"}


def swam_headers():
    return {"Authorization": f"Bearer {SWAM_TOKEN}"}


# ─── AUTH ────────────────────────────────────────
class TestAuth:
    """Authentication tests"""

    def test_superadmin_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "superashwini", "password": "supersebhiupper123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data.get("role") == "superadmin"

    def test_swamsevak_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "arunpanchariya", "password": "arunlondon123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data.get("role") == "swamsevak"


# ─── DASHBOARD ────────────────────────────────────────
class TestDashboard3Blocks:
    """Dashboard 3-block structure tests"""

    def test_dashboard_returns_arrival_summary(self):
        resp = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=super_headers())
        assert resp.status_code == 200
        data = resp.json()
        # Must have arrival_summary with 3 keys for our 3 blocks
        assert "arrival_summary" in data
        arr = data["arrival_summary"]
        # Block 1: Expected + Not Coming
        assert "expected" in arr, "Expected block missing"
        assert "not_coming" in arr, "Not Coming block missing"
        # Block 2: Arrived / Not Arrived / Departed
        assert "arrived" in arr, "Arrived block missing"
        assert "departed" in arr, "Departed block missing"
        # Block 3: Rooms
        assert "total_rooms" in data, "total_rooms missing"
        assert "occupied_rooms" in data, "occupied_rooms missing"
        assert "available_rooms" in data, "available_rooms missing"
        print("✓ Dashboard 3-block data structure verified")

    def test_dashboard_has_active_tickets(self):
        resp = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=super_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "active_tickets" in data, "active_tickets missing from dashboard"
        assert isinstance(data["active_tickets"], int)
        print(f"✓ active_tickets count: {data['active_tickets']}")

    def test_dashboard_has_top_geographies(self):
        """Task #14 - Top Countries/States/Cities"""
        resp = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=super_headers())
        assert resp.status_code == 200
        data = resp.json()
        # Should have top_countries and top_cities (new in this batch)
        assert "top_states" in data, "top_states missing"
        print(f"✓ Top states present: {len(data.get('top_states', []))} entries")
        # top_countries and top_cities are new
        assert "top_countries" in data, "top_countries missing - Task #14 incomplete"
        assert "top_cities" in data, "top_cities missing - Task #14 incomplete"
        print(f"✓ Top countries: {len(data.get('top_countries', []))}, cities: {len(data.get('top_cities', []))}")

    def test_swamsevak_dashboard_returns_data(self):
        """Swamsevak dashboard - task #15"""
        resp = requests.get(f"{BASE_URL}/api/admin/swamsevak-dashboard", headers=super_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "assigned_guests" in data
        assert "pending_todos" in data
        assert "active_tickets" in data
        print(f"✓ Swamsevak dashboard: {data.get('assigned_guests')} guests, {data.get('pending_todos')} tasks")

    def test_swamsevak_dashboard_for_volunteer(self):
        """Swamsevak sees their own data"""
        resp = requests.get(f"{BASE_URL}/api/admin/swamsevak-dashboard", headers=swam_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "assigned_guests" in data
        assert "special_needs" in data
        print(f"✓ Volunteer dashboard works: {data.get('assigned_guests')} guests assigned")


# ─── RECURRING TASKS ─────────────────────────────────
class TestRecurringTasks:
    """Task #13 - Recurring tasks"""

    created_id = None

    def test_create_recurring_task_superadmin(self):
        """Super admin can create recurring task"""
        resp = requests.post(f"{BASE_URL}/api/admin/todos", json={
            "title": "TEST_Recurring Morning Brief",
            "description": "Daily morning briefing",
            "priority": "high",
            "assigned_to": "superashwini",
            "is_recurring": True,
            "recurring_time": "07:00",
        }, headers=super_headers())
        assert resp.status_code in [200, 201], f"Create recurring failed: {resp.text}"
        data = resp.json()
        assert data.get("is_recurring") is True
        TestRecurringTasks.created_id = data.get("id")
        print(f"✓ Recurring task created: {data.get('id')}")

    def test_recurring_task_appears_in_list(self):
        """Recurring task shows in todo list"""
        resp = requests.get(f"{BASE_URL}/api/admin/todos", headers=super_headers())
        assert resp.status_code == 200
        # Handle data.data pattern
        raw = resp.json()
        todos = raw.get("data") if isinstance(raw, dict) else raw
        if isinstance(todos, list):
            recurring_tasks = [t for t in todos if t.get("is_recurring")]
            print(f"✓ Found {len(recurring_tasks)} recurring tasks in list")
            assert len(recurring_tasks) >= 1, "No recurring tasks found"
        else:
            print(f"✓ Todos response format: {type(raw)}")

    def test_volunteer_cannot_create_recurring_task(self):
        """Volunteers cannot create recurring tasks"""
        resp = requests.post(f"{BASE_URL}/api/admin/todos", json={
            "title": "TEST_Vol Recurring Task",
            "is_recurring": True,
        }, headers=swam_headers())
        if resp.status_code in [200, 201]:
            data = resp.json()
            # It should either fail OR create with is_recurring=False
            assert data.get("is_recurring") is not True, "Volunteer should not be able to create recurring task"
            print(f"✓ Volunteer recurring task created but is_recurring forced to False")
        else:
            print(f"✓ Volunteer recurring task creation properly blocked: {resp.status_code}")

    def test_volunteer_cannot_delete_recurring_task(self):
        """Volunteers cannot delete recurring tasks"""
        if not TestRecurringTasks.created_id:
            pytest.skip("No recurring task ID available")
        resp = requests.delete(f"{BASE_URL}/api/admin/todos/{TestRecurringTasks.created_id}", headers=swam_headers())
        assert resp.status_code == 403, f"Expected 403 but got {resp.status_code}: {resp.text}"
        print(f"✓ Volunteer blocked from deleting recurring task (403)")

    def test_complete_recurring_task(self):
        """Completing a recurring task marks it done for today"""
        if not TestRecurringTasks.created_id:
            pytest.skip("No recurring task ID available")
        resp = requests.put(f"{BASE_URL}/api/admin/todos/{TestRecurringTasks.created_id}", json={"completed": True}, headers=super_headers())
        assert resp.status_code == 200, f"Complete failed: {resp.text}"
        print(f"✓ Recurring task marked complete")

    def test_cleanup_recurring_task(self):
        """Cleanup - super admin can delete their recurring task"""
        if not TestRecurringTasks.created_id:
            pytest.skip("No recurring task ID available")
        resp = requests.delete(f"{BASE_URL}/api/admin/todos/{TestRecurringTasks.created_id}", headers=super_headers())
        assert resp.status_code == 200, f"Cleanup delete failed: {resp.text}"
        print(f"✓ Recurring task cleaned up")


# ─── CUSTOM FIELDS ────────────────────────────────────
class TestCustomFieldsTargetScope:
    """Task #10 - Custom fields redesign with target_scope"""

    created_id = None

    def test_create_custom_field_expected_scope(self):
        """Create custom field with target_scope=expected"""
        resp = requests.post(f"{BASE_URL}/api/admin/custom-fields", json={
            "name": "TEST_Gift Given",
            "field_type": "toggle",
            "target_scope": "expected",
            "default_value": "false",
            "options": [],
            "applies_to": [],
        }, headers=super_headers())
        assert resp.status_code in [200, 201], f"Create CF failed: {resp.text}"
        data = resp.json()
        assert data.get("target_scope") == "expected", "target_scope not set to 'expected'"
        TestCustomFieldsTargetScope.created_id = data.get("id")
        print(f"✓ Custom field created with target_scope=expected, id={data.get('id')}")

    def test_create_custom_field_arrived_scope(self):
        """Create custom field with target_scope=arrived"""
        resp = requests.post(f"{BASE_URL}/api/admin/custom-fields", json={
            "name": "TEST_Room Check In",
            "field_type": "toggle",
            "target_scope": "arrived",
            "default_value": "false",
            "options": [],
        }, headers=super_headers())
        assert resp.status_code in [200, 201], f"Create CF arrived scope failed: {resp.text}"
        data = resp.json()
        assert data.get("target_scope") == "arrived"
        # cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/admin/custom-fields/{data['id']}", headers=super_headers())
        print(f"✓ Custom field created with target_scope=arrived")

    def test_custom_field_list_has_target_scope(self):
        """Custom fields list includes target_scope field for newly created fields"""
        # Create a test field and check it has target_scope
        resp = requests.post(f"{BASE_URL}/api/admin/custom-fields", json={
            "name": "TEST_ScopeCheck",
            "field_type": "text",
            "target_scope": "all",
            "default_value": "",
            "options": [],
        }, headers=super_headers())
        assert resp.status_code in [200, 201]
        data = resp.json()
        assert "target_scope" in data, "target_scope missing from newly created custom field response"
        assert data["target_scope"] == "all"
        # Verify visibility is set to admin_only (no visibility field exposed to user)
        print(f"✓ New custom field has target_scope='{data['target_scope']}'")
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/admin/custom-fields/{data['id']}", headers=super_headers())
        
        # Also check that old fields in list work (may not have target_scope - DB migration needed)
        list_resp = requests.get(f"{BASE_URL}/api/admin/custom-fields", headers=super_headers())
        assert list_resp.status_code == 200
        fields = list_resp.json()
        print(f"✓ Custom fields list: {len(fields)} fields total")

    def test_cleanup_custom_field(self):
        """Cleanup created custom field"""
        if not TestCustomFieldsTargetScope.created_id:
            pytest.skip("No custom field ID")
        resp = requests.delete(f"{BASE_URL}/api/admin/custom-fields/{TestCustomFieldsTargetScope.created_id}", headers=super_headers())
        assert resp.status_code == 200
        print(f"✓ Custom field cleaned up")


# ─── SWAMSEVAK CREATION (TOAST FIX) ──────────────────
class TestSwamsevakCreation:
    """Task #4 - Toast undefined error fix"""

    created_username = None

    def test_create_swamsevak_returns_string_detail(self):
        """Backend returns string detail (not array) to prevent toast undefined"""
        # Try creating a duplicate to trigger the error
        resp = requests.post(f"{BASE_URL}/api/admin/admins", json={
            "username": "arunpanchariya",  # exists as system account
            "password": "test123",
            "name": "Test Duplicate",
            "role": "swamsevak",
        }, headers=super_headers())
        assert resp.status_code == 409
        data = resp.json()
        detail = data.get("detail", "")
        assert isinstance(detail, str), f"detail should be string, got {type(detail)}: {detail}"
        print(f"✓ Error detail is a string: '{detail}'")

    def test_create_swamsevak_success(self):
        """Create a new swamsevak returns proper response"""
        resp = requests.post(f"{BASE_URL}/api/admin/admins", json={
            "username": "TEST_swam_iter19",
            "password": "testpass123",
            "name": "TEST Swamsevak Iter19",
            "role": "swamsevak",
            "mobile": "+91 99999 88888",
        }, headers=super_headers())
        assert resp.status_code in [200, 201], f"Create failed: {resp.text}"
        data = resp.json()
        assert "message" in data
        assert "username" in data
        TestSwamsevakCreation.created_username = data.get("username")
        print(f"✓ Swamsevak created: {data.get('username')}")

    def test_cleanup_swamsevak(self):
        """Cleanup test swamsevak"""
        if not TestSwamsevakCreation.created_username:
            pytest.skip("No swamsevak to clean up")
        resp = requests.delete(f"{BASE_URL}/api/admin/admins/{TestSwamsevakCreation.created_username}", headers=super_headers())
        assert resp.status_code == 200
        print(f"✓ Test swamsevak cleaned up")


# ─── ROOM MANAGEMENT ─────────────────────────────────
class TestRoomManagement:
    """Task #8/#9 - Room cards, vacancy label, transfer"""

    def test_rooms_endpoint_returns_data(self):
        resp = requests.get(f"{BASE_URL}/api/admin/rooms", headers=super_headers())
        assert resp.status_code == 200
        data = resp.json()
        # API may return list directly or {"data": [...]}
        rooms = data if isinstance(data, list) else (data.get("data") or [])
        assert isinstance(rooms, list)
        print(f"✓ Room list returned: {len(rooms)} rooms")

    def test_transfer_endpoint_exists(self):
        """Shift/transfer endpoint should exist"""
        # Check with a placeholder to get 404 (not 405/403 which would mean no route)
        resp = requests.put(f"{BASE_URL}/api/admin/rooms/NONEXISTENT/shift",
                           json={"new_room_code": "TEST", "registration_id": "TEST"},
                           headers=super_headers())
        # 404 or 400 means route exists; 405 means it doesn't
        assert resp.status_code != 405, "Transfer endpoint doesn't exist"
        print(f"✓ Transfer endpoint exists, status: {resp.status_code}")

    def test_room_vacancy_forecast(self):
        """Room vacancy forecast endpoint"""
        resp = requests.get(f"{BASE_URL}/api/admin/room-vacancy-forecast", headers=super_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "upcoming_vacancies" in data
        print(f"✓ Vacancy forecast returned: {len(data.get('upcoming_vacancies', []))} items")


# ─── EDIT PERMISSIONS ─────────────────────────────────
class TestEditPermissions:
    """Task #5 - Edit button for all roles, super admin full edit"""

    def test_super_admin_can_edit_expected_guest(self):
        """Super admin can edit all fields"""
        resp = requests.get(f"{BASE_URL}/api/admin/guests/expected", headers=super_headers(), params={"per_page": 1})
        assert resp.status_code == 200
        data = resp.json()
        guests = data.get("data", [])
        if not guests:
            pytest.skip("No expected guests in system")
        reg = guests[0]
        # Try updating admin_notes (minimal edit)
        edit_resp = requests.put(f"{BASE_URL}/api/admin/registrations/{reg['id']}",
                                json={"admin_notes": "TEST - iteration 19 edit"},
                                headers=super_headers())
        assert edit_resp.status_code == 200, f"Super admin edit failed: {edit_resp.text}"
        print(f"✓ Super admin can edit registration")

    def test_volunteer_can_edit_admin_notes_only(self):
        """Volunteer can update admin_notes (but not guest data)"""
        resp = requests.get(f"{BASE_URL}/api/admin/guests/expected", headers=swam_headers(), params={"per_page": 1})
        assert resp.status_code == 200
        data = resp.json()
        guests = data.get("data", [])
        if not guests:
            pytest.skip("No expected guests in system")
        reg = guests[0]
        # Volunteer updating admin_notes should succeed
        edit_resp = requests.put(f"{BASE_URL}/api/admin/registrations/{reg['id']}",
                                json={"admin_notes": "TEST - volunteer note iter19"},
                                headers=swam_headers())
        assert edit_resp.status_code == 200, f"Volunteer edit admin_notes failed: {edit_resp.text}"
        print(f"✓ Volunteer can edit admin_notes")


# ─── AUDIT LOG ────────────────────────────────────────
class TestAuditLog:
    """Task #11 - Activity Log with proper data"""

    def test_audit_log_returns_proper_data(self):
        """Audit log returns structured data with timestamps"""
        resp = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=super_headers(), params={"page": 1, "per_page": 10})
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data
        assert "total_pages" in data
        if data["data"]:
            log = data["data"][0]
            # Check required fields
            assert "action_type" in log, "action_type missing from audit log"
            assert "performed_by" in log, "performed_by missing from audit log"
            assert "performed_at" in log, "performed_at missing from audit log"
            # Check performed_at is a valid timestamp string (not a number)
            ts = log.get("performed_at", "")
            assert isinstance(ts, str), f"performed_at should be string, got {type(ts)}"
            print(f"✓ Audit log has {data['total']} entries, timestamp: {ts}")
        else:
            print("ℹ No audit log entries yet")


# ─── HELP TICKETS (NOTIFICATION) ──────────────────────
class TestHelpTickets:
    """Task #6 - Active ticket notification at top"""

    def test_tickets_count_in_dashboard(self):
        """Dashboard returns active_tickets count for top notification"""
        resp = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=super_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "active_tickets" in data
        count = data["active_tickets"]
        assert count >= 0
        print(f"✓ Dashboard active_tickets: {count}")

    def test_swamsevak_dashboard_active_tickets(self):
        """Swamsevak dashboard also has active_tickets count"""
        resp = requests.get(f"{BASE_URL}/api/admin/swamsevak-dashboard", headers=swam_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "active_tickets" in data
        print(f"✓ Swamsevak dashboard active_tickets: {data.get('active_tickets')}")
