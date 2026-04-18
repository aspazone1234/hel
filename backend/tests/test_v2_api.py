"""
V2 API Tests for Shrimad Bhagavat Katha Event Management System
Tests: OTP flow, Registration, Admin 3-bucket system, Reference Persons CRUD
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}
SWAMSEVAK = {"username": "arunpanchariya", "password": "arunlondon123"}

class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API Root: {data['message']}")


class TestOTPFlow:
    """OTP-based registration flow tests (MOCKED OTP)"""
    
    def test_send_otp_success(self):
        """Test sending OTP to a mobile number"""
        test_mobile = f"TEST_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        assert response.status_code == 200
        data = response.json()
        assert "mock_otp" in data, "Mock OTP should be returned for testing"
        assert len(data["mock_otp"]) == 4, "OTP should be 4 digits"
        print(f"OTP sent successfully, mock_otp: {data['mock_otp']}")
    
    def test_send_otp_invalid_mobile(self):
        """Test sending OTP with invalid mobile"""
        response = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": "123"})
        assert response.status_code == 400
        print("Invalid mobile correctly rejected")
    
    def test_verify_otp_success(self):
        """Test OTP verification flow"""
        test_mobile = f"TEST_{uuid.uuid4().hex[:8]}"
        
        # Send OTP
        send_resp = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        assert send_resp.status_code == 200
        mock_otp = send_resp.json()["mock_otp"]
        
        # Verify OTP
        verify_resp = requests.post(f"{BASE_URL}/api/otp/verify", json={"mobile": test_mobile, "otp": mock_otp})
        assert verify_resp.status_code == 200
        data = verify_resp.json()
        assert data["verified"] == True
        assert "has_existing_registration" in data
        print(f"OTP verified successfully, has_existing_registration: {data['has_existing_registration']}")
    
    def test_verify_otp_invalid(self):
        """Test OTP verification with wrong OTP"""
        test_mobile = f"TEST_{uuid.uuid4().hex[:8]}"
        
        # Send OTP
        requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        
        # Verify with wrong OTP
        verify_resp = requests.post(f"{BASE_URL}/api/otp/verify", json={"mobile": test_mobile, "otp": "0000"})
        assert verify_resp.status_code == 400
        print("Invalid OTP correctly rejected")


class TestPublicEndpoints:
    """Public endpoints for registration form"""
    
    def test_get_reference_persons_public(self):
        """Test public reference persons endpoint"""
        response = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Reference persons count: {len(data)}")
    
    def test_get_relation_categories_public(self):
        """Test public relation categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/relation-categories/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have seeded defaults
        if len(data) > 0:
            print(f"Relation categories: {[c['name'] for c in data]}")
        else:
            print("No relation categories found (may need seeding)")
    
    def test_get_registration_count(self):
        """Test registration count endpoint"""
        response = requests.get(f"{BASE_URL}/api/registrations/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        print(f"Total registrations: {data['total']}")


class TestRegistrationCRUD:
    """Registration create and update tests"""
    
    @pytest.fixture
    def test_mobile(self):
        return f"TEST_{uuid.uuid4().hex[:10]}"
    
    def test_create_registration(self, test_mobile):
        """Test creating a new V2 registration"""
        payload = {
            "primary_mobile": test_mobile,
            "additional_phone": "9876543210",
            "email": "test@example.com",
            "preferred_language": "hi",
            "address": {
                "full_address": "123 Test Street",
                "city": "Jaipur",
                "state": "Rajasthan",
                "country": "India"
            },
            "num_people": 2,
            "attendees": [
                {"name": "Test Person 1", "age": "35", "special_needs": ""},
                {"name": "Test Person 2", "age": "30", "special_needs": "Wheelchair"}
            ],
            "group_head_id": "",
            "family_special_request": "Ground floor room",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28", "2026-05-29", "2026-05-30"],
            "expected_arrival_time": "Morning (8-11 AM)",
            "expected_departure_time": "Evening (5-8 PM)",
            "reference_person_id": "",
            "relation_category": "Friends",
            "message": "Looking forward to the event",
            "consent": True
        }
        
        response = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["primary_mobile"] == test_mobile
        assert data["num_people"] == 2
        assert len(data["attendees"]) == 2
        assert data["approval_status"] == "pending"
        print(f"Registration created: {data['id']}")
        return data["id"]
    
    def test_create_duplicate_registration_fails(self, test_mobile):
        """Test that duplicate mobile registration fails"""
        payload = {
            "primary_mobile": test_mobile,
            "additional_phone": "",
            "email": "",
            "preferred_language": "hi",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"name": "Test", "age": "", "special_needs": ""}],
            "group_head_id": "",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28"],
            "consent": True
        }
        
        # First registration
        resp1 = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert resp1.status_code == 200
        
        # Duplicate should fail
        resp2 = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        assert resp2.status_code == 409
        print("Duplicate registration correctly rejected")
    
    def test_get_registration_by_mobile(self, test_mobile):
        """Test fetching registration by mobile"""
        # Create first
        payload = {
            "primary_mobile": test_mobile,
            "additional_phone": "",
            "email": "",
            "preferred_language": "hi",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"name": "Test User", "age": "", "special_needs": ""}],
            "group_head_id": "",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28"],
            "consent": True
        }
        requests.post(f"{BASE_URL}/api/registrations", json=payload)
        
        # Fetch by mobile
        response = requests.get(f"{BASE_URL}/api/registration/by-mobile", params={"mobile": test_mobile})
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert data["registration"]["primary_mobile"] == test_mobile
        print(f"Registration found by mobile: {data['registration']['id']}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_superadmin_login(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "superadmin"
        assert data["name"] == "Super Admin Ashwini"
        print(f"Super admin login successful: {data['username']}")
        return data["token"]
    
    def test_swamsevak_login(self):
        """Test swamsevak (regular admin) login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SWAMSEVAK)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "swamsevak"
        print(f"Swamsevak login successful: {data['username']}")
        return data["token"]
    
    def test_invalid_login(self):
        """Test invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "invalid", "password": "wrong"})
        assert response.status_code == 401
        print("Invalid login correctly rejected")
    
    def test_auth_me(self):
        """Test /auth/me endpoint"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        token = login_resp.json()["token"]
        
        # Get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "superashwini"
        assert data["role"] == "superadmin"
        print(f"Auth me: {data['name']}")


class TestAdminBuckets:
    """Admin 3-bucket system tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_get_pending_bucket(self, admin_token):
        """Test pending approval bucket"""
        response = requests.get(
            f"{BASE_URL}/api/admin/registrations",
            params={"bucket": "pending_approval"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"Pending bucket: {data['total']} registrations")
    
    def test_get_expected_bucket(self, admin_token):
        """Test expected guest list bucket"""
        response = requests.get(
            f"{BASE_URL}/api/admin/registrations",
            params={"bucket": "expected"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"Expected bucket: {data['total']} registrations")
    
    def test_get_arrived_bucket(self, admin_token):
        """Test arrived guest list bucket"""
        response = requests.get(
            f"{BASE_URL}/api/admin/registrations",
            params={"bucket": "arrived"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"Arrived bucket: {data['total']} registrations")
    
    def test_approve_registration(self, admin_token):
        """Test approving a registration (moves to expected)"""
        # Create a test registration
        test_mobile = f"TEST_APPROVE_{uuid.uuid4().hex[:6]}"
        payload = {
            "primary_mobile": test_mobile,
            "additional_phone": "",
            "email": "",
            "preferred_language": "hi",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"name": "Approve Test", "age": "", "special_needs": ""}],
            "group_head_id": "",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28"],
            "consent": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/registrations", json=payload)
        reg_id = create_resp.json()["id"]
        
        # Approve it
        approve_resp = requests.put(
            f"{BASE_URL}/api/admin/registrations/{reg_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_resp.status_code == 200
        
        # Verify it's now in expected bucket
        detail_resp = requests.get(
            f"{BASE_URL}/api/admin/registrations/{reg_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert detail_resp.json()["approval_status"] == "approved"
        print(f"Registration {reg_id} approved successfully")


class TestAdminDashboard:
    """Admin dashboard tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_get_dashboard(self, admin_token):
        """Test dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "pending_count" in data
        assert "approved_count" in data
        assert "arrival_summary" in data
        assert "daily_schedule" in data
        
        # Check arrival summary structure
        arr = data["arrival_summary"]
        assert "expected" in arr
        assert "arrived" in arr
        assert "not_coming" in arr
        assert "departed" in arr
        
        print(f"Dashboard: pending={data['pending_count']}, approved={data['approved_count']}")
        print(f"Arrival summary: expected={arr['expected']['families']}, arrived={arr['arrived']['families']}")


class TestReferencePersonCRUD:
    """Reference Person CRUD tests (Super Admin only)"""
    
    @pytest.fixture
    def superadmin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    @pytest.fixture
    def swamsevak_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SWAMSEVAK)
        return response.json()["token"]
    
    def test_list_reference_persons(self, superadmin_token):
        """Test listing reference persons"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reference-persons",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Reference persons: {len(data)}")
    
    def test_create_reference_person(self, superadmin_token):
        """Test creating a reference person"""
        test_name = f"TEST_REF_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": test_name, "description": "Test reference person"},
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_name
        assert "id" in data
        print(f"Reference person created: {data['id']}")
        return data["id"]
    
    def test_update_reference_person(self, superadmin_token):
        """Test updating a reference person"""
        # Create first
        test_name = f"TEST_REF_UPDATE_{uuid.uuid4().hex[:6]}"
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": test_name, "description": "Original"},
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        ref_id = create_resp.json()["id"]
        
        # Update
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            json={"name": f"{test_name}_UPDATED"},
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert update_resp.status_code == 200
        print(f"Reference person {ref_id} updated")
    
    def test_delete_reference_person(self, superadmin_token):
        """Test deleting a reference person"""
        # Create first
        test_name = f"TEST_REF_DELETE_{uuid.uuid4().hex[:6]}"
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": test_name, "description": "To delete"},
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        ref_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert delete_resp.status_code == 200
        print(f"Reference person {ref_id} deleted")
    
    def test_swamsevak_cannot_create_reference_person(self, swamsevak_token):
        """Test that swamsevak cannot create reference persons"""
        response = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": "Should Fail", "description": ""},
            headers={"Authorization": f"Bearer {swamsevak_token}"}
        )
        assert response.status_code == 403
        print("Swamsevak correctly denied reference person creation")


class TestManualEntry:
    """Manual entry tests for admin"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_manual_entry_to_expected(self, admin_token):
        """Test adding manual entry to expected bucket"""
        payload = {
            "primary_mobile": f"MANUAL_{uuid.uuid4().hex[:6]}",
            "additional_phone": "",
            "address": {"full_address": "Manual Entry", "city": "Test City", "state": "", "country": ""},
            "num_people": 1,
            "attendees": [{"name": "Manual Guest", "age": "", "special_needs": ""}],
            "group_head_id": "",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28"],
            "admin_notes": "Added manually for testing",
            "target_bucket": "expected"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/registrations/manual",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "approved"
        assert data["arrival_status"] == "not_arrived"
        assert data["entry_type"] == "manual"
        print(f"Manual entry to expected: {data['id']}")
    
    def test_manual_entry_to_arrived(self, admin_token):
        """Test adding manual entry to arrived bucket"""
        payload = {
            "primary_mobile": f"MANUAL_ARR_{uuid.uuid4().hex[:6]}",
            "additional_phone": "",
            "address": {"full_address": "Manual Entry", "city": "Test City", "state": "", "country": ""},
            "num_people": 1,
            "attendees": [{"name": "Walk-in Guest", "age": "", "special_needs": ""}],
            "group_head_id": "",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28"],
            "admin_notes": "Walk-in guest",
            "target_bucket": "arrived"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/registrations/manual",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "approved"
        assert data["arrival_status"] == "arrived"
        print(f"Manual entry to arrived: {data['id']}")


class TestRelationCategories:
    """Relation categories tests"""
    
    @pytest.fixture
    def superadmin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_list_relation_categories(self, superadmin_token):
        """Test listing relation categories"""
        response = requests.get(
            f"{BASE_URL}/api/admin/relation-categories",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Relation categories: {len(data)}")
        if len(data) > 0:
            print(f"Categories: {[c['name'] for c in data[:5]]}")
    
    def test_create_relation_category(self, superadmin_token):
        """Test creating a relation category"""
        test_name = f"TEST_CAT_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/admin/relation-categories",
            json={"name": test_name, "description": "Test category"},
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_name
        print(f"Relation category created: {data['id']}")
        return data["id"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
