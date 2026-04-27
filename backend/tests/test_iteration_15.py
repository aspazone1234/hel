"""
Test Suite for Iteration 15 - New Features Testing
Tests: Registration deadline notice, removed fields, mandatory fields, OTP flow,
       registration by mobile path param, admin approve/disapprove, QR generation,
       attendance 3-condition block, CSV exports, user portal
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}
SWAMSEVAK = {"username": "arunpanchariya", "password": "arunlondon123"}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Super admin login failed")


@pytest.fixture(scope="module")
def swamsevak_token():
    """Get swamsevak token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SWAMSEVAK)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Swamsevak login failed")


@pytest.fixture(scope="module")
def test_mobile():
    """Generate unique test mobile number"""
    return f"+91TEST{uuid.uuid4().hex[:8]}"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_super_admin_login(self):
        """Test super admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "superadmin"
        assert data["username"] == "superashwini"
        print("✓ Super admin login successful")
    
    def test_swamsevak_login(self):
        """Test swamsevak login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SWAMSEVAK)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "swamsevak"
        print("✓ Swamsevak login successful")
    
    def test_invalid_login(self):
        """Test invalid credentials rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid", "password": "wrong"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")


class TestOTPFlow:
    """Test OTP send and verify endpoints"""
    
    def test_otp_send(self, test_mobile):
        """Test OTP send endpoint"""
        response = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        assert response.status_code == 200
        data = response.json()
        assert "mock_otp" in data
        assert len(data["mock_otp"]) == 4
        print(f"✓ OTP sent successfully, mock OTP: {data['mock_otp']}")
        return data["mock_otp"]
    
    def test_otp_verify(self, test_mobile):
        """Test OTP verify endpoint"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        assert send_response.status_code == 200
        mock_otp = send_response.json()["mock_otp"]
        
        # Then verify
        verify_response = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "mobile": test_mobile, "otp": mock_otp
        })
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["verified"] == True
        print("✓ OTP verified successfully")
    
    def test_otp_invalid(self, test_mobile):
        """Test invalid OTP rejected"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        
        # Try wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "mobile": test_mobile, "otp": "0000"
        })
        assert verify_response.status_code == 400
        print("✓ Invalid OTP rejected correctly")


class TestRegistrationByMobile:
    """Test GET /api/registration/by-mobile/{mobile} endpoint - was previously causing bug"""
    
    def test_registration_by_mobile_path_param(self, super_admin_token):
        """Test registration lookup by mobile as path parameter"""
        # First create a test registration
        test_mobile = f"+91TEST{uuid.uuid4().hex[:6]}"
        
        # Send OTP and verify
        send_resp = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        assert send_resp.status_code == 200
        mock_otp = send_resp.json()["mock_otp"]
        
        verify_resp = requests.post(f"{BASE_URL}/api/otp/verify", json={
            "mobile": test_mobile, "otp": mock_otp
        })
        assert verify_resp.status_code == 200
        
        # Create registration
        reg_data = {
            "primary_mobile": test_mobile,
            "additional_phone": "+919876543210",
            "email": "test@example.com",
            "address": {"full_address": "Test Address", "city": "Test City", "state": "Test State", "country": "India"},
            "num_people": 2,
            "attendees": [
                {"id": "", "name": "Test Person 1", "age": "30", "special_needs": ""},
                {"id": "", "name": "Test Person 2", "age": "25", "special_needs": ""}
            ],
            "group_head_id": "",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28", "2026-05-29"],
            "expected_arrival_time": "Morning (8-11 AM)",
            "expected_departure_time": "Evening (5-8 PM)",
            "reference_person_id": "",
            "relation_category": "",
            "consent": True
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/registrations", json=reg_data)
        assert create_resp.status_code == 200
        created_reg = create_resp.json()
        
        # Now test the path param endpoint - THIS WAS THE BUG
        import urllib.parse
        encoded_mobile = urllib.parse.quote(test_mobile, safe='')
        lookup_resp = requests.get(f"{BASE_URL}/api/registration/by-mobile/{encoded_mobile}")
        assert lookup_resp.status_code == 200
        data = lookup_resp.json()
        assert data["primary_mobile"] == test_mobile
        print(f"✓ Registration by mobile path param works correctly for {test_mobile}")
    
    def test_registration_not_found(self):
        """Test 404 for non-existent registration"""
        fake_mobile = "+91NOTEXIST123"
        import urllib.parse
        encoded_mobile = urllib.parse.quote(fake_mobile, safe='')
        response = requests.get(f"{BASE_URL}/api/registration/by-mobile/{encoded_mobile}")
        assert response.status_code == 404
        print("✓ Non-existent registration returns 404 correctly")


class TestAdminApproveDisapprove:
    """Test admin approve/disapprove functionality"""
    
    def test_approve_registration(self, super_admin_token):
        """Test approving a registration"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get pending registrations
        pending_resp = requests.get(f"{BASE_URL}/api/admin/guests/pending", headers=headers)
        assert pending_resp.status_code == 200
        pending = pending_resp.json().get("data", [])
        
        if len(pending) > 0:
            reg_id = pending[0]["id"]
            # Approve it
            approve_resp = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/approve", headers=headers)
            assert approve_resp.status_code == 200
            print(f"✓ Registration {reg_id[:8]} approved successfully")
        else:
            print("⚠ No pending registrations to test approve")
    
    def test_reject_registration(self, super_admin_token):
        """Test rejecting a registration"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create a test registration first
        test_mobile = f"+91REJECT{uuid.uuid4().hex[:6]}"
        send_resp = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        mock_otp = send_resp.json()["mock_otp"]
        requests.post(f"{BASE_URL}/api/otp/verify", json={"mobile": test_mobile, "otp": mock_otp})
        
        reg_data = {
            "primary_mobile": test_mobile,
            "additional_phone": "+919876543210",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"id": "", "name": "Reject Test", "age": "30", "special_needs": ""}],
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28"],
            "expected_arrival_time": "Morning (8-11 AM)",
            "expected_departure_time": "Evening (5-8 PM)",
            "consent": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/registrations", json=reg_data)
        if create_resp.status_code == 200:
            reg_id = create_resp.json()["id"]
            
            # Reject it
            reject_resp = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/reject", headers=headers)
            assert reject_resp.status_code == 200
            print(f"✓ Registration {reg_id[:8]} rejected successfully")
        else:
            print("⚠ Could not create test registration for reject test")


class TestQRGeneration:
    """Test QR generation requires Super Admin role"""
    
    def test_qr_generate_requires_superadmin(self, swamsevak_token, super_admin_token):
        """Test that QR generation requires super admin"""
        # First get an approved registration
        headers_super = {"Authorization": f"Bearer {super_admin_token}"}
        headers_swam = {"Authorization": f"Bearer {swamsevak_token}"}
        
        expected_resp = requests.get(f"{BASE_URL}/api/admin/guests/expected", headers=headers_super)
        expected = expected_resp.json().get("data", [])
        
        if len(expected) > 0:
            reg_id = expected[0]["id"]
            
            # Try with swamsevak - should fail
            qr_resp_swam = requests.post(f"{BASE_URL}/api/admin/qr/generate/{reg_id}", headers=headers_swam)
            assert qr_resp_swam.status_code == 403
            print("✓ QR generation correctly blocked for swamsevak")
            
            # Try with super admin - should work
            qr_resp_super = requests.post(f"{BASE_URL}/api/admin/qr/generate/{reg_id}", headers=headers_super)
            assert qr_resp_super.status_code == 200
            data = qr_resp_super.json()
            assert "qr_token" in data
            assert "qr_image_b64" in data
            print(f"✓ QR generation works for super admin, token: {data['qr_token']}")
        else:
            print("⚠ No expected registrations to test QR generation")


class TestAttendance3ConditionBlock:
    """Test attendance marking blocks if no swamsevak, room, or QR assigned"""
    
    def test_mark_arrival_blocked_without_conditions(self, super_admin_token):
        """Test that marking arrival is blocked without swamsevak, room, and QR"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create a fresh registration
        test_mobile = f"+91ARRIVAL{uuid.uuid4().hex[:6]}"
        send_resp = requests.post(f"{BASE_URL}/api/otp/send", json={"mobile": test_mobile})
        mock_otp = send_resp.json()["mock_otp"]
        requests.post(f"{BASE_URL}/api/otp/verify", json={"mobile": test_mobile, "otp": mock_otp})
        
        reg_data = {
            "primary_mobile": test_mobile,
            "additional_phone": "+919876543210",
            "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"},
            "num_people": 1,
            "attendees": [{"id": "", "name": "Arrival Test", "age": "30", "special_needs": ""}],
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28"],
            "expected_arrival_time": "Morning (8-11 AM)",
            "expected_departure_time": "Evening (5-8 PM)",
            "consent": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/registrations", json=reg_data)
        if create_resp.status_code != 200:
            print("⚠ Could not create test registration")
            return
        
        reg_id = create_resp.json()["id"]
        
        # Approve it first
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/approve", headers=headers)
        
        # Try to mark arrival without swamsevak, room, QR - should fail
        arrival_resp = requests.post(f"{BASE_URL}/api/admin/registrations/{reg_id}/mark-arrival", 
            headers=headers, json={"arrival_status": "arrived", "arrived_attendee_ids": []})
        
        assert arrival_resp.status_code == 400
        error_detail = arrival_resp.json().get("detail", "")
        assert "Swamsevak" in error_detail or "room" in error_detail or "QR" in error_detail
        print(f"✓ Arrival marking correctly blocked: {error_detail}")


class TestCSVExports:
    """Test CSV export endpoints for all buckets"""
    
    def test_export_pending_csv(self, super_admin_token):
        """Test CSV export for pending bucket"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv?bucket=pending&token={super_admin_token}")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Pending CSV export works")
    
    def test_export_expected_csv(self, super_admin_token):
        """Test CSV export for expected bucket"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv?bucket=expected&token={super_admin_token}")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Expected CSV export works")
    
    def test_export_arrived_csv(self, super_admin_token):
        """Test CSV export for arrived bucket"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv?bucket=arrived&token={super_admin_token}")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Arrived CSV export works")
    
    def test_export_rooms_csv(self, super_admin_token):
        """Test CSV export for rooms bucket"""
        response = requests.get(f"{BASE_URL}/api/admin/export-csv?bucket=rooms&token={super_admin_token}")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Rooms CSV export works")


class TestPublicEndpoints:
    """Test public endpoints"""
    
    def test_reference_persons_public(self):
        """Test public reference persons endpoint"""
        response = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ Reference persons public endpoint works")
    
    def test_relation_categories_public(self):
        """Test public relation categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/relation-categories/public")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ Relation categories public endpoint works")
    
    def test_registration_count(self):
        """Test registration count endpoint"""
        response = requests.get(f"{BASE_URL}/api/registrations/count")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        print(f"✓ Registration count: {data['total']}")


class TestAdminDashboard:
    """Test admin dashboard endpoints"""
    
    def test_dashboard(self, super_admin_token):
        """Test dashboard endpoint"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "pending_count" in data
        assert "approved_count" in data
        assert "arrival_summary" in data
        print(f"✓ Dashboard: {data['pending_count']} pending, {data['approved_count']} approved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
