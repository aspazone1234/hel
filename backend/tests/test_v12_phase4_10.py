"""
Test Suite for Phase 4-10 Features - Katha 2026 Event Management
Tests: QR Code System, Help Centre, Message Center, Todo Module, Custom Fields, Chatbot
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}
REGULAR_ADMIN = {"username": "arunpanchariya", "password": "arunlondon123"}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    assert response.status_code == 200, f"Super admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def regular_admin_token():
    """Get regular admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
    assert response.status_code == 200, f"Regular admin login failed: {response.text}"
    return response.json()["token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ─── ADMIN LOGIN TESTS ───
class TestAdminLogin:
    """Test admin login flow"""
    
    def test_super_admin_login(self):
        """Super admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "superadmin"
        assert data["username"] == "superashwini"
        print("✓ Super admin login successful")
    
    def test_regular_admin_login(self):
        """Regular admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "swamsevak"
        assert data["username"] == "arunpanchariya"
        print("✓ Regular admin login successful")
    
    def test_invalid_credentials(self):
        """Login with invalid credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "wrong", "password": "wrong"})
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")


# ─── HELP CENTRE / TICKETS TESTS ───
class TestHelpCentre:
    """Test Help Centre ticket management"""
    
    def test_get_ticket_categories(self, super_admin_token):
        """GET /api/admin/tickets/categories - list categories"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets/categories", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check expected categories exist
        category_ids = [c["id"] for c in data]
        assert "water" in category_ids
        assert "medical" in category_ids
        assert "wheelchair" in category_ids
        print(f"✓ Got {len(data)} ticket categories")
    
    def test_get_ticket_stats(self, super_admin_token):
        """GET /api/admin/tickets/stats - ticket statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets/stats", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "active" in data
        assert "resolved" in data
        assert "escalated" in data
        assert "by_priority" in data
        print(f"✓ Ticket stats: Total={data['total']}, Active={data['active']}, Resolved={data['resolved']}")
    
    def test_create_ticket(self, super_admin_token):
        """POST /api/admin/tickets - create new ticket"""
        ticket_data = {
            "title": f"TEST_Ticket_{uuid.uuid4().hex[:8]}",
            "description": "Test ticket description",
            "category": "water",
            "priority": "medium",
            "source_type": "admin",
            "resolution_time_minutes": 30
        }
        response = requests.post(f"{BASE_URL}/api/admin/tickets", json=ticket_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == ticket_data["title"]
        assert data["category"] == "water"
        assert data["status"] == "open"
        print(f"✓ Created ticket: {data['id']}")
        return data["id"]
    
    def test_get_tickets_list(self, super_admin_token):
        """GET /api/admin/tickets - list tickets with filters"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Got {len(data['data'])} tickets (total: {data['total']})")
    
    def test_get_tickets_with_status_filter(self, super_admin_token):
        """GET /api/admin/tickets?status=open - filter by status"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets?status=open", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        # All returned tickets should have status=open
        for ticket in data["data"]:
            assert ticket["status"] == "open"
        print(f"✓ Filtered tickets by status=open: {len(data['data'])} results")
    
    def test_resolve_ticket(self, super_admin_token):
        """PUT /api/admin/tickets/{id}/resolve - resolve ticket with closing note"""
        # First create a ticket
        ticket_data = {
            "title": f"TEST_ResolveTicket_{uuid.uuid4().hex[:8]}",
            "description": "Ticket to be resolved",
            "category": "other",
            "priority": "low"
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/tickets", json=ticket_data, headers=auth_headers(super_admin_token))
        assert create_resp.status_code == 200
        ticket_id = create_resp.json()["id"]
        
        # Resolve the ticket
        resolve_data = {"closing_note": "Issue resolved - test completion"}
        response = requests.put(f"{BASE_URL}/api/admin/tickets/{ticket_id}/resolve", json=resolve_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        print(f"✓ Resolved ticket {ticket_id}")
    
    def test_resolve_ticket_requires_closing_note(self, super_admin_token):
        """Resolve ticket without closing note should fail"""
        # Create a ticket
        ticket_data = {"title": f"TEST_NoNote_{uuid.uuid4().hex[:8]}", "category": "other", "priority": "low"}
        create_resp = requests.post(f"{BASE_URL}/api/admin/tickets", json=ticket_data, headers=auth_headers(super_admin_token))
        ticket_id = create_resp.json()["id"]
        
        # Try to resolve without closing note
        response = requests.put(f"{BASE_URL}/api/admin/tickets/{ticket_id}/resolve", json={"closing_note": ""}, headers=auth_headers(super_admin_token))
        assert response.status_code == 400
        print("✓ Resolve without closing note correctly rejected")


# ─── TODO MODULE TESTS ───
class TestTodoModule:
    """Test To-Do list functionality"""
    
    def test_get_todos(self, super_admin_token):
        """GET /api/admin/todos - list todos"""
        response = requests.get(f"{BASE_URL}/api/admin/todos", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Got {len(data['data'])} todos (total: {data['total']})")
    
    def test_create_todo(self, super_admin_token):
        """POST /api/admin/todos - create new todo"""
        todo_data = {
            "title": f"TEST_Todo_{uuid.uuid4().hex[:8]}",
            "description": "Test todo description",
            "priority": "high",
            "due_date": "2026-05-28",
            "todo_type": "manual"
        }
        response = requests.post(f"{BASE_URL}/api/admin/todos", json=todo_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == todo_data["title"]
        assert data["completed"] == False
        print(f"✓ Created todo: {data['id']}")
        return data["id"]
    
    def test_toggle_todo_complete(self, super_admin_token):
        """PUT /api/admin/todos/{id} - toggle completion"""
        # Create a todo
        todo_data = {"title": f"TEST_Toggle_{uuid.uuid4().hex[:8]}", "priority": "medium"}
        create_resp = requests.post(f"{BASE_URL}/api/admin/todos", json=todo_data, headers=auth_headers(super_admin_token))
        todo_id = create_resp.json()["id"]
        
        # Toggle to complete
        response = requests.put(f"{BASE_URL}/api/admin/todos/{todo_id}", json={"completed": True}, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        print(f"✓ Toggled todo {todo_id} to completed")
    
    def test_delete_todo(self, super_admin_token):
        """DELETE /api/admin/todos/{id} - delete todo"""
        # Create a todo
        todo_data = {"title": f"TEST_Delete_{uuid.uuid4().hex[:8]}", "priority": "low"}
        create_resp = requests.post(f"{BASE_URL}/api/admin/todos", json=todo_data, headers=auth_headers(super_admin_token))
        todo_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/admin/todos/{todo_id}", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        print(f"✓ Deleted todo {todo_id}")
    
    def test_filter_todos_by_completed(self, super_admin_token):
        """GET /api/admin/todos?completed=false - filter pending todos"""
        response = requests.get(f"{BASE_URL}/api/admin/todos?completed=false", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        for todo in data["data"]:
            assert todo["completed"] == False
        print(f"✓ Filtered pending todos: {len(data['data'])} results")


# ─── MESSAGE CENTER TESTS (Super Admin Only) ───
class TestMessageCenter:
    """Test Message Center functionality - Super Admin only"""
    
    def test_get_message_templates(self, super_admin_token):
        """GET /api/admin/messages/templates - list templates"""
        response = requests.get(f"{BASE_URL}/api/admin/messages/templates", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have seeded default templates
        assert len(data) >= 10, f"Expected at least 10 default templates, got {len(data)}"
        print(f"✓ Got {len(data)} message templates")
    
    def test_create_message_template(self, super_admin_token):
        """POST /api/admin/messages/templates - create template"""
        template_data = {
            "name": f"TEST_Template_{uuid.uuid4().hex[:8]}",
            "content_en": "Test English content",
            "content_hi": "Test Hindi content",
            "category": "shraddhalu",
            "trigger_type": "manual",
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/messages/templates", json=template_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == template_data["name"]
        print(f"✓ Created template: {data['id']}")
        return data["id"]
    
    def test_send_message_mocked(self, super_admin_token):
        """POST /api/admin/messages/send - send message (MOCKED)"""
        send_data = {
            "template_id": "",
            "custom_message_en": "Test broadcast message",
            "custom_message_hi": "टेस्ट संदेश",
            "target_type": "all_approved",
            "target_ids": []
        }
        response = requests.post(f"{BASE_URL}/api/admin/messages/send", json=send_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "campaign_id" in data
        assert "sent" in data
        print(f"✓ Message sent (MOCKED): campaign={data['campaign_id']}, sent={data['sent']}")
    
    def test_get_campaigns(self, super_admin_token):
        """GET /api/admin/messages/campaigns - list campaigns"""
        response = requests.get(f"{BASE_URL}/api/admin/messages/campaigns", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Got {len(data['data'])} campaigns (total: {data['total']})")
    
    def test_regular_admin_cannot_access_templates(self, regular_admin_token):
        """Regular admin should not access message templates (super admin only)"""
        response = requests.get(f"{BASE_URL}/api/admin/messages/templates", headers=auth_headers(regular_admin_token))
        assert response.status_code == 403
        print("✓ Regular admin correctly denied access to message templates")


# ─── CUSTOM FIELDS TESTS (Super Admin Only) ───
class TestCustomFields:
    """Test Custom Fields Manager - Super Admin only"""
    
    def test_get_custom_fields(self, super_admin_token):
        """GET /api/admin/custom-fields - list fields"""
        response = requests.get(f"{BASE_URL}/api/admin/custom-fields", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} custom fields")
    
    def test_create_custom_field_text(self, super_admin_token):
        """POST /api/admin/custom-fields - create text field"""
        field_data = {
            "name": f"TEST_TextField_{uuid.uuid4().hex[:8]}",
            "field_type": "text",
            "default_value": "",
            "options": [],
            "scope": "registration",
            "visibility": "admin_only"
        }
        response = requests.post(f"{BASE_URL}/api/admin/custom-fields", json=field_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["field_type"] == "text"
        print(f"✓ Created text field: {data['id']}")
        return data["id"]
    
    def test_create_custom_field_toggle(self, super_admin_token):
        """POST /api/admin/custom-fields - create toggle field"""
        field_data = {
            "name": f"TEST_ToggleField_{uuid.uuid4().hex[:8]}",
            "field_type": "toggle",
            "default_value": "No",
            "scope": "registration",
            "visibility": "admin_only"
        }
        response = requests.post(f"{BASE_URL}/api/admin/custom-fields", json=field_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert data["field_type"] == "toggle"
        print(f"✓ Created toggle field: {data['id']}")
    
    def test_create_custom_field_dropdown(self, super_admin_token):
        """POST /api/admin/custom-fields - create dropdown field"""
        field_data = {
            "name": f"TEST_DropdownField_{uuid.uuid4().hex[:8]}",
            "field_type": "select",
            "default_value": "Option1",
            "options": ["Option1", "Option2", "Option3"],
            "scope": "registration",
            "visibility": "admin_only"
        }
        response = requests.post(f"{BASE_URL}/api/admin/custom-fields", json=field_data, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert data["field_type"] == "select"
        assert len(data["options"]) == 3
        print(f"✓ Created dropdown field: {data['id']}")
    
    def test_delete_custom_field(self, super_admin_token):
        """DELETE /api/admin/custom-fields/{id} - delete field"""
        # Create a field first
        field_data = {"name": f"TEST_DeleteField_{uuid.uuid4().hex[:8]}", "field_type": "number"}
        create_resp = requests.post(f"{BASE_URL}/api/admin/custom-fields", json=field_data, headers=auth_headers(super_admin_token))
        field_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/admin/custom-fields/{field_id}", headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        print(f"✓ Deleted custom field {field_id}")
    
    def test_regular_admin_cannot_create_field(self, regular_admin_token):
        """Regular admin should not create custom fields (super admin only)"""
        field_data = {"name": "TEST_Unauthorized", "field_type": "text"}
        response = requests.post(f"{BASE_URL}/api/admin/custom-fields", json=field_data, headers=auth_headers(regular_admin_token))
        assert response.status_code == 403
        print("✓ Regular admin correctly denied creating custom fields")


# ─── QR CODE SYSTEM TESTS ───
class TestQRCodeSystem:
    """Test QR Code generation and scanning"""
    
    def test_bulk_qr_generate(self, super_admin_token):
        """POST /api/admin/qr/generate-bulk - bulk QR generation"""
        response = requests.post(f"{BASE_URL}/api/admin/qr/generate-bulk", json={}, headers=auth_headers(super_admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "generated" in data
        assert "skipped" in data
        print(f"✓ Bulk QR generation: generated={data['generated']}, skipped={data['skipped']}")
    
    def test_qr_scan_invalid_format(self, super_admin_token):
        """POST /api/admin/qr/scan - invalid QR format should fail"""
        response = requests.post(f"{BASE_URL}/api/admin/qr/scan", json={"qr_data": "INVALID_QR_CODE"}, headers=auth_headers(super_admin_token))
        assert response.status_code == 400
        print("✓ Invalid QR format correctly rejected")
    
    def test_qr_scan_empty_data(self, super_admin_token):
        """POST /api/admin/qr/scan - empty QR data should fail"""
        response = requests.post(f"{BASE_URL}/api/admin/qr/scan", json={"qr_data": ""}, headers=auth_headers(super_admin_token))
        assert response.status_code == 400
        print("✓ Empty QR data correctly rejected")
    
    def test_qr_scan_not_found(self, super_admin_token):
        """POST /api/admin/qr/scan - non-existent registration should fail"""
        response = requests.post(f"{BASE_URL}/api/admin/qr/scan", json={"qr_data": "KATHA2026:nonexistent-id:TOKEN123:v1"}, headers=auth_headers(super_admin_token))
        assert response.status_code == 404
        print("✓ Non-existent registration QR correctly rejected")


# ─── CHATBOT TESTS ───
class TestChatbot:
    """Test Panchariya AI chatbot endpoint"""
    
    def test_chatbot_default_response_english(self):
        """POST /api/chatbot/message - default response in English"""
        response = requests.post(f"{BASE_URL}/api/chatbot/message", json={"message": "hello", "language": "en"})
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "Panchariya AI" in data["response"]
        assert data["ticket_created"] == False
        print("✓ Chatbot default English response with Panchariya AI branding")
    
    def test_chatbot_default_response_hindi(self):
        """POST /api/chatbot/message - default response in Hindi"""
        response = requests.post(f"{BASE_URL}/api/chatbot/message", json={"message": "namaste", "language": "hi"})
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["ticket_created"] == False
        print("✓ Chatbot default Hindi response")
    
    def test_chatbot_water_request(self):
        """POST /api/chatbot/message - water request creates ticket"""
        response = requests.post(f"{BASE_URL}/api/chatbot/message", json={"message": "I need water please", "language": "en"})
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["ticket_created"] == True
        assert data["category"] == "water"
        print("✓ Chatbot water request creates ticket")
    
    def test_chatbot_medical_request(self):
        """POST /api/chatbot/message - medical request creates ticket"""
        response = requests.post(f"{BASE_URL}/api/chatbot/message", json={"message": "I need a doctor", "language": "en"})
        assert response.status_code == 200
        data = response.json()
        assert data["ticket_created"] == True
        assert data["category"] == "medical"
        print("✓ Chatbot medical request creates ticket")
    
    def test_chatbot_food_timing_no_ticket(self):
        """POST /api/chatbot/message - food timing query does not create ticket"""
        response = requests.post(f"{BASE_URL}/api/chatbot/message", json={"message": "what is food timing", "language": "en"})
        assert response.status_code == 200
        data = response.json()
        assert "Prasad" in data["response"] or "prasad" in data["response"].lower()
        assert data["ticket_created"] == False
        print("✓ Chatbot food timing query - no ticket created")


# ─── ADMIN ENDPOINT ACCESS TESTS ───
class TestAdminEndpointAccess:
    """Test admin endpoint access controls"""
    
    def test_regular_admin_can_access_tickets(self, regular_admin_token):
        """Regular admin can access tickets"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets", headers=auth_headers(regular_admin_token))
        assert response.status_code == 200
        print("✓ Regular admin can access tickets")
    
    def test_regular_admin_can_access_todos(self, regular_admin_token):
        """Regular admin can access todos"""
        response = requests.get(f"{BASE_URL}/api/admin/todos", headers=auth_headers(regular_admin_token))
        assert response.status_code == 200
        print("✓ Regular admin can access todos")
    
    def test_regular_admin_can_access_custom_fields_read(self, regular_admin_token):
        """Regular admin can read custom fields"""
        response = requests.get(f"{BASE_URL}/api/admin/custom-fields", headers=auth_headers(regular_admin_token))
        assert response.status_code == 200
        print("✓ Regular admin can read custom fields")
    
    def test_unauthenticated_cannot_access_admin(self):
        """Unauthenticated requests should be rejected"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets")
        assert response.status_code == 401
        print("✓ Unauthenticated access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
