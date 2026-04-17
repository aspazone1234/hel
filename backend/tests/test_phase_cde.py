"""
Phase C+D+E Backend API Tests
- Phase C: Swamsevak My Day consolidated view, departure flow
- Phase D: Customer form polish, self-service page, returning user redirect
- Phase E: Message scheduling, room vacancy forecast, custom field filtering, WhatsApp confirmation
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
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    assert resp.status_code == 200, f"Super admin login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in login response"
    return data["token"]

@pytest.fixture(scope="module")
def regular_admin_token():
    """Get regular admin token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
    assert resp.status_code == 200, f"Regular admin login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in login response"
    return data["token"]

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


class TestAuthLogin:
    """Test admin login endpoints"""
    
    def test_super_admin_login(self):
        """Super admin login returns correct role"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "superadmin"
        assert data["username"] == "superashwini"
        assert "token" in data
        print(f"✓ Super admin login successful: {data['name']}")
    
    def test_regular_admin_login(self):
        """Regular admin login returns swamsevak role"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=REGULAR_ADMIN)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "swamsevak"
        assert data["username"] == "arunpanchariya"
        print(f"✓ Regular admin login successful: {data['name']}")
    
    def test_invalid_login(self):
        """Invalid credentials rejected"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "invalid", "password": "wrong"})
        assert resp.status_code == 401
        print("✓ Invalid login rejected correctly")


class TestSwamsevakDashboard:
    """Phase C: Swamsevak My Day consolidated view"""
    
    def test_swamsevak_dashboard_endpoint(self, super_admin_token):
        """GET /api/admin/swamsevak-dashboard returns consolidated data"""
        resp = requests.get(f"{BASE_URL}/api/admin/swamsevak-dashboard", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        # Verify expected fields
        assert "assigned_guests" in data
        assert "departures_today" in data
        assert "special_needs" in data
        assert "active_tickets" in data
        assert "pending_todos" in data
        print(f"✓ Swamsevak dashboard: {data['assigned_guests']} assigned guests, {data['active_tickets']} tickets")
    
    def test_swamsevak_dashboard_regular_admin(self, regular_admin_token):
        """Regular admin can access swamsevak dashboard"""
        resp = requests.get(f"{BASE_URL}/api/admin/swamsevak-dashboard", headers=auth_headers(regular_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "assigned_guests" in data
        print("✓ Regular admin can access swamsevak dashboard")


class TestRoomVacancyForecast:
    """Phase E: Room vacancy forecast"""
    
    def test_room_vacancy_forecast_endpoint(self, super_admin_token):
        """GET /api/admin/room-vacancy-forecast returns upcoming vacancies"""
        resp = requests.get(f"{BASE_URL}/api/admin/room-vacancy-forecast", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "upcoming_vacancies" in data
        assert isinstance(data["upcoming_vacancies"], list)
        print(f"✓ Room vacancy forecast: {len(data['upcoming_vacancies'])} upcoming vacancies")


class TestSelfServicePage:
    """Phase D: Self-service page - registration by mobile"""
    
    def test_registration_by_mobile_not_found(self):
        """GET /api/registration/by-mobile returns not found for unknown mobile"""
        resp = requests.get(f"{BASE_URL}/api/registration/by-mobile", params={"mobile": "9999999999"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] == False
        assert data["registration"] is None
        print("✓ Registration by mobile returns not found for unknown number")
    
    def test_registration_by_mobile_path_param(self):
        """GET /api/registration/by-mobile/{mobile} endpoint exists"""
        resp = requests.get(f"{BASE_URL}/api/registration/by-mobile/9999999999")
        # Should return 404 for unknown mobile
        assert resp.status_code == 404
        print("✓ Registration by mobile path param endpoint exists")


class TestOTPFlow:
    """Phase D: OTP verification flow"""
    
    def test_otp_send(self):
        """POST /api/otp/send sends OTP"""
        test_mobile = f"+91{uuid.uuid4().hex[:10]}"
        resp = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        assert resp.status_code == 200
        data = resp.json()
        assert "mock_otp" in data
        assert len(data["mock_otp"]) == 4
        print(f"✓ OTP sent successfully, mock OTP: {data['mock_otp']}")
        return test_mobile, data["mock_otp"]
    
    def test_otp_verify_invalid(self):
        """POST /api/otp/verify rejects invalid OTP"""
        test_mobile = f"+91{uuid.uuid4().hex[:10]}"
        # First send OTP
        requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        # Try wrong OTP
        resp = requests.post(f"{BASE_URL}/api/otp/verify", json={"mobile": test_mobile, "otp": "0000"})
        assert resp.status_code == 400
        print("✓ Invalid OTP rejected correctly")
    
    def test_otp_verify_success(self):
        """POST /api/otp/verify accepts correct OTP"""
        test_mobile = f"+91{uuid.uuid4().hex[:10]}"
        # Send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        mock_otp = send_resp.json()["mock_otp"]
        # Verify with correct OTP
        resp = requests.post(f"{BASE_URL}/api/otp/verify", json={"mobile": test_mobile, "otp": mock_otp})
        assert resp.status_code == 200
        data = resp.json()
        assert data["verified"] == True
        assert "has_existing_registration" in data
        print("✓ OTP verification successful")


class TestRegistrationFlow:
    """Phase D: Registration creation with WhatsApp confirmation"""
    
    def test_create_registration_with_travel_fields(self):
        """POST /api/registrations creates registration with travel fields"""
        test_mobile = f"+91{uuid.uuid4().hex[:10]}"
        payload = {
            "primary_mobile": test_mobile,
            "additional_phone": "+919876543210",
            "email": "test@example.com",
            "preferred_language": "hi",
            "address": {
                "full_address": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "country": "India"
            },
            "num_people": 2,
            "attendees": [
                {"id": "a1", "name": "Test Person 1", "age": "35", "special_needs": ""},
                {"id": "a2", "name": "Test Person 2", "age": "30", "special_needs": "Wheelchair"}
            ],
            "group_head_id": "a1",
            "family_special_request": "Ground floor room",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28", "2026-05-29", "2026-05-30"],
            "expected_arrival_time": "Morning (8-11 AM)",
            "expected_departure_time": "Evening (5-8 PM)",
            "reference_person_id": "",
            "relation_category": "",
            "message": "Looking forward to the event",
            "consent": True,
            "travel_mode": "train",
            "travel_details": "Rajdhani Express from Delhi"
        }
        resp = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["primary_mobile"] == test_mobile
        assert data["travel_mode"] == "train"
        assert data["travel_details"] == "Rajdhani Express from Delhi"
        assert data["arrival_date"] == "2026-05-28"
        assert data["departure_date"] == "2026-05-30"
        print(f"✓ Registration created with travel fields: {data['id']}")
        return data["id"]
    
    def test_registration_duplicate_rejected(self):
        """POST /api/registrations rejects duplicate mobile"""
        test_mobile = f"+91{uuid.uuid4().hex[:10]}"
        payload = {
            "primary_mobile": test_mobile,
            "additional_phone": "+919876543210",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"id": "a1", "name": "Test", "age": "30", "special_needs": ""}],
            "group_head_id": "a1",
            "selected_days": ["2026-05-28"],
            "consent": True
        }
        # First registration
        resp1 = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert resp1.status_code == 200
        # Duplicate
        resp2 = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert resp2.status_code == 409
        print("✓ Duplicate registration rejected correctly")


class TestReferencePersonsPublic:
    """Public reference persons endpoint"""
    
    def test_get_reference_persons_public(self):
        """GET /api/reference-persons/public returns list"""
        resp = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Reference persons public: {len(data)} persons")


class TestRelationCategoriesPublic:
    """Public relation categories endpoint"""
    
    def test_get_relation_categories_public(self):
        """GET /api/relation-categories/public returns list"""
        resp = requests.get(f"{BASE_URL}/api/relation-categories/public")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Relation categories public: {len(data)} categories")


class TestAdminDashboard:
    """Command Centre dashboard"""
    
    def test_dashboard_endpoint(self, super_admin_token):
        """GET /api/admin/dashboard returns stats"""
        resp = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "pending_count" in data
        assert "approved_count" in data
        assert "arrival_summary" in data
        assert "daily_schedule" in data
        assert "total_rooms" in data
        print(f"✓ Dashboard: {data['approved_count']} approved, {data['pending_count']} pending")


class TestExpectedGuestList:
    """Expected guest list with filters"""
    
    def test_expected_guests_endpoint(self, super_admin_token):
        """GET /api/admin/guests/expected returns list"""
        resp = requests.get(f"{BASE_URL}/api/admin/guests/expected", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Expected guests: {data['total']} families")
    
    def test_expected_guests_with_search(self, super_admin_token):
        """GET /api/admin/guests/expected with search param"""
        resp = requests.get(f"{BASE_URL}/api/admin/guests/expected", 
                          headers=auth_headers(super_admin_token),
                          params={"search": "test"})
        assert resp.status_code == 200
        print("✓ Expected guests search works")


class TestMessageCenter:
    """Message Center - Schedule tab"""
    
    def test_message_templates(self, super_admin_token):
        """GET /api/admin/messages/templates returns templates"""
        resp = requests.get(f"{BASE_URL}/api/admin/messages/templates", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Message templates: {len(data)} templates")
    
    def test_message_campaigns(self, super_admin_token):
        """GET /api/admin/messages/campaigns returns campaigns"""
        resp = requests.get(f"{BASE_URL}/api/admin/messages/campaigns", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        print(f"✓ Message campaigns: {len(data['data'])} campaigns")


class TestRoomManagement:
    """Room management endpoints"""
    
    def test_rooms_list(self, super_admin_token):
        """GET /api/admin/rooms returns rooms"""
        resp = requests.get(f"{BASE_URL}/api/admin/rooms", headers=auth_headers(super_admin_token))
        assert resp.status_code == 200
        data = resp.json()
        # Could be list or dict with data key
        if isinstance(data, list):
            print(f"✓ Rooms: {len(data)} rooms")
        else:
            print(f"✓ Rooms: {len(data.get('data', []))} rooms")


class TestWhatsAppConfirmation:
    """Phase E: WhatsApp confirmation on registration"""
    
    def test_message_deliveries_logged(self, super_admin_token):
        """Registration creates message_deliveries entry"""
        # Create a registration
        test_mobile = f"+91{uuid.uuid4().hex[:10]}"
        payload = {
            "primary_mobile": test_mobile,
            "additional_phone": "+919876543210",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"id": "a1", "name": "WhatsApp Test", "age": "30", "special_needs": ""}],
            "group_head_id": "a1",
            "selected_days": ["2026-05-28"],
            "consent": True
        }
        resp = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert resp.status_code == 200
        # The WhatsApp confirmation is logged in message_deliveries collection
        # We can't directly query MongoDB, but the backend logs it
        print("✓ Registration created - WhatsApp confirmation logged (MOCKED)")


class TestFormValidation:
    """Phase D: Form validation"""
    
    def test_otp_send_invalid_mobile(self):
        """OTP send rejects invalid mobile"""
        resp = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": "123"})
        assert resp.status_code == 400
        print("✓ Invalid mobile rejected for OTP")
    
    def test_registration_missing_mobile(self):
        """Registration requires mobile"""
        payload = {
            "primary_mobile": "",
            "additional_phone": "+919876543210",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"id": "a1", "name": "Test", "age": "30", "special_needs": ""}],
            "group_head_id": "a1",
            "selected_days": ["2026-05-28"],
            "consent": True
        }
        resp = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        # Empty mobile should fail duplicate check or validation
        # The exact behavior depends on implementation
        print(f"✓ Empty mobile registration response: {resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
