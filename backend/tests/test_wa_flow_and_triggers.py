"""
Test suite for WA Flow Data Exchange and System Triggers
Tests the 5-screen Panchariya Seva Desk flow and trigger functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWAFlowPing:
    """Test WA Flow ping/health check"""
    
    def test_wa_flow_ping_returns_active(self):
        """POST /api/webhooks/wa-flow with action=ping returns {status: active}"""
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "ping",
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["data"]["status"] == "active"
        print(f"✓ Ping test passed: {data}")


class TestWAFlowInit:
    """Test WA Flow INIT action with eligibility gate"""
    
    def test_init_arrived_guest_returns_welcome(self):
        """POST /api/webhooks/wa-flow with action=INIT and arrived guest phone returns screen=WELCOME"""
        # Use the test flow session for arrived guest
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "INIT",
            "flow_token": "test_flow_123",
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"INIT arrived guest response: {data}")
        # Should return WELCOME screen for arrived guest
        assert data.get("screen") == "WELCOME", f"Expected WELCOME screen, got {data.get('screen')}"
        assert "welcome_text" in data.get("data", {})
        print(f"✓ INIT arrived guest test passed")
    
    def test_init_unknown_phone_returns_not_eligible(self):
        """POST /api/webhooks/wa-flow with action=INIT and unknown phone returns screen=NOT_ELIGIBLE"""
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "INIT",
            "flow_token": "test_unknown",
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"INIT unknown phone response: {data}")
        # Should return NOT_ELIGIBLE screen for unknown/not-arrived guest
        assert data.get("screen") == "NOT_ELIGIBLE", f"Expected NOT_ELIGIBLE screen, got {data.get('screen')}"
        assert "info_text" in data.get("data", {})
        print(f"✓ INIT unknown phone test passed")


class TestWAFlowScreenTransitions:
    """Test WA Flow screen transitions (data_exchange action)"""
    
    def test_welcome_to_guest_details(self):
        """WELCOME → GUEST_DETAILS returns auto-fetched guest details"""
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "data_exchange",
            "screen": "WELCOME",
            "flow_token": "test_flow_123",
            "data": {},
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"WELCOME→GUEST_DETAILS response: {data}")
        assert data.get("screen") == "GUEST_DETAILS"
        flow_data = data.get("data", {})
        # Should have guest details
        assert "guest_name" in flow_data
        assert "room_number" in flow_data
        assert "swamsevak_name" in flow_data
        print(f"✓ WELCOME→GUEST_DETAILS test passed: guest_name={flow_data.get('guest_name')}")
    
    def test_guest_details_to_category(self):
        """GUEST_DETAILS → CATEGORY returns 8 category options"""
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "data_exchange",
            "screen": "GUEST_DETAILS",
            "flow_token": "test_flow_123",
            "data": {},
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"GUEST_DETAILS→CATEGORY response: {data}")
        assert data.get("screen") == "CATEGORY"
        categories = data.get("data", {}).get("categories", [])
        assert len(categories) == 8, f"Expected 8 categories, got {len(categories)}"
        # Verify category structure
        for cat in categories:
            assert "id" in cat
            assert "title" in cat
        print(f"✓ GUEST_DETAILS→CATEGORY test passed: {len(categories)} categories")
    
    def test_category_to_issue_details(self):
        """CATEGORY → ISSUE_DETAILS returns issues for selected category"""
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "data_exchange",
            "screen": "CATEGORY",
            "flow_token": "test_flow_123",
            "data": {"selected_category": "water_chai"},
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"CATEGORY→ISSUE_DETAILS response: {data}")
        assert data.get("screen") == "ISSUE_DETAILS"
        flow_data = data.get("data", {})
        assert "category_label" in flow_data
        assert "issues" in flow_data
        issues = flow_data.get("issues", [])
        assert len(issues) > 0, "Expected at least one issue"
        print(f"✓ CATEGORY→ISSUE_DETAILS test passed: {len(issues)} issues for water_chai")
    
    def test_issue_details_to_summary(self):
        """ISSUE_DETAILS → SUMMARY returns compiled summary"""
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "data_exchange",
            "screen": "ISSUE_DETAILS",
            "flow_token": "test_flow_123",
            "data": {
                "selected_category": "water_chai",
                "selected_issue": "drinking_water",
                "additional_details": "Need water urgently"
            },
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"ISSUE_DETAILS→SUMMARY response: {data}")
        assert data.get("screen") == "SUMMARY"
        flow_data = data.get("data", {})
        assert "summary_text" in flow_data
        assert "guest_name" in flow_data
        assert "category_label" in flow_data
        assert "issue_label" in flow_data
        print(f"✓ ISSUE_DETAILS→SUMMARY test passed")
    
    def test_summary_to_success_creates_ticket(self):
        """SUMMARY → SUCCESS creates ticket in help center"""
        response = requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
            "action": "data_exchange",
            "screen": "SUMMARY",
            "flow_token": "test_flow_123",
            "data": {
                "selected_category": "water_chai",
                "selected_issue": "drinking_water",
                "additional_details": "Test ticket from pytest"
            },
            "version": "3.0"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"SUMMARY→SUCCESS response: {data}")
        assert data.get("screen") == "SUCCESS"
        flow_data = data.get("data", {})
        assert "success_text" in flow_data
        assert "ticket_id" in flow_data
        ticket_id = flow_data.get("ticket_id")
        assert ticket_id and len(ticket_id) > 0, "Expected ticket_id to be non-empty"
        print(f"✓ SUMMARY→SUCCESS test passed: ticket_id={ticket_id}")


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login works with superashwini/supersebhiupper123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "superadmin"
        print(f"✓ Admin login test passed: role={data.get('role')}")
        return data["token"]


class TestWATriggers:
    """Test WA Triggers API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_all_triggers(self, auth_token):
        """GET /api/admin/wa-triggers returns all triggers with proper delay_minutes (int type)"""
        response = requests.get(f"{BASE_URL}/api/admin/wa-triggers", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        triggers = data if isinstance(data, list) else data.get("data", [])
        print(f"Got {len(triggers)} triggers")
        
        # Check that delay_minutes is int type
        for trigger in triggers:
            if "delay_minutes" in trigger:
                assert isinstance(trigger["delay_minutes"], int), f"delay_minutes should be int, got {type(trigger['delay_minutes'])}"
        
        print(f"✓ GET triggers test passed: {len(triggers)} triggers, all delay_minutes are int")
    
    def test_update_trigger_delay_minutes(self, auth_token):
        """PUT /api/admin/wa-triggers/{key} with delay_minutes=10 saves and returns correctly on GET"""
        # First get a trigger key
        response = requests.get(f"{BASE_URL}/api/admin/wa-triggers", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        triggers = response.json() if isinstance(response.json(), list) else response.json().get("data", [])
        
        if not triggers:
            pytest.skip("No triggers found to test")
        
        test_trigger = triggers[0]
        trigger_key = test_trigger.get("key") or test_trigger.get("trigger_key")
        
        # Update with delay_minutes=10
        update_response = requests.put(f"{BASE_URL}/api/admin/wa-triggers/{trigger_key}", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "enabled": test_trigger.get("enabled", False),
                "template_id": test_trigger.get("template_id", ""),
                "template_name": test_trigger.get("template_name", ""),
                "delay_minutes": 10
            }
        )
        assert update_response.status_code == 200
        print(f"Update response: {update_response.json()}")
        
        # Verify by GET
        verify_response = requests.get(f"{BASE_URL}/api/admin/wa-triggers", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        updated_triggers = verify_response.json() if isinstance(verify_response.json(), list) else verify_response.json().get("data", [])
        updated_trigger = next((t for t in updated_triggers if (t.get("key") or t.get("trigger_key")) == trigger_key), None)
        
        assert updated_trigger is not None
        assert updated_trigger.get("delay_minutes") == 10, f"Expected delay_minutes=10, got {updated_trigger.get('delay_minutes')}"
        assert isinstance(updated_trigger.get("delay_minutes"), int)
        
        print(f"✓ Update trigger delay_minutes test passed: delay_minutes={updated_trigger.get('delay_minutes')}")
        
        # Reset to 0
        requests.put(f"{BASE_URL}/api/admin/wa-triggers/{trigger_key}", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "enabled": test_trigger.get("enabled", False),
                "template_id": test_trigger.get("template_id", ""),
                "template_name": test_trigger.get("template_name", ""),
                "delay_minutes": 0
            }
        )


class TestTicketCreation:
    """Test ticket creation from flow submission"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_ticket_has_correct_fields(self, auth_token):
        """Ticket creation from flow submission includes guest_name, category, priority, source_type=wa_flow"""
        # Get tickets
        response = requests.get(f"{BASE_URL}/api/admin/tickets", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        tickets = data.get("data", []) if isinstance(data, dict) else data
        
        # Find a ticket with source_type=wa_flow
        wa_flow_tickets = [t for t in tickets if t.get("source_type") == "wa_flow"]
        
        if not wa_flow_tickets:
            print("No wa_flow tickets found, creating one via flow submission...")
            # Create one via flow
            requests.post(f"{BASE_URL}/api/webhooks/wa-flow", json={
                "action": "data_exchange",
                "screen": "SUMMARY",
                "flow_token": "test_flow_123",
                "data": {
                    "selected_category": "medical",
                    "selected_issue": "first_aid",
                    "additional_details": "Test ticket for field verification"
                },
                "version": "3.0"
            })
            # Re-fetch tickets
            response = requests.get(f"{BASE_URL}/api/admin/tickets", headers={
                "Authorization": f"Bearer {auth_token}"
            })
            data = response.json()
            tickets = data.get("data", []) if isinstance(data, dict) else data
            wa_flow_tickets = [t for t in tickets if t.get("source_type") == "wa_flow"]
        
        assert len(wa_flow_tickets) > 0, "Expected at least one wa_flow ticket"
        
        ticket = wa_flow_tickets[0]
        print(f"Checking ticket: {ticket}")
        
        # Verify required fields
        assert ticket.get("source_type") == "wa_flow"
        assert "guest_name" in ticket
        assert "category" in ticket or "category_label" in ticket
        assert "priority" in ticket
        
        print(f"✓ Ticket fields test passed: source_type={ticket.get('source_type')}, priority={ticket.get('priority')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
