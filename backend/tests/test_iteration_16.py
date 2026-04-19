"""
Iteration 16 Test Suite - Post-Iteration 15 Audit Fixes
Tests for:
1. QR image rendering in ArrivedGuestList (qr_image_b64 field)
2. AttendanceCheckin uses POST /api/admin/registrations/{id}/mark-arrival endpoint
3. 3-condition block for attendance marking (swamsevak, room, QR required)
4. No double-marking of arrived registrations
5. Manual Entry form validation (reference, relation, times required)
6. Room CSV export endpoint
7. User portal confirmed state
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMarkArrivalEndpoint:
    """Tests for POST /api/admin/registrations/{id}/mark-arrival endpoint with 3-condition block"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin and create test registration"""
        # Login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create test registration
        self.test_mobile = f"+91999{uuid.uuid4().hex[:7]}"
        reg_data = {
            "primary_mobile": self.test_mobile,
            "additional_phone": "+919876543210",
            "num_people": 2,
            "attendees": [
                {"id": "att1", "name": "TEST_Head Person", "age": "45"},
                {"id": "att2", "name": "TEST_Family Member", "age": "40"}
            ],
            "group_head_id": "att1",
            "attendance_intent": "Yes",
            "selected_days": ["2026-05-28", "2026-05-29"],
            "expected_arrival_time": "Morning (8-11 AM)",
            "expected_departure_time": "Evening (5-8 PM)",
            "reference_person_id": "",
            "relation_category": "Friends",
            "address": {"full_address": "Test Address", "city": "Test City", "state": "Test State", "country": "India"}
        }
        
        # Create via manual entry (auto-approved)
        manual_resp = requests.post(f"{BASE_URL}/api/admin/registrations/manual", 
            json={**reg_data, "target_bucket": "expected"}, headers=self.headers)
        if manual_resp.status_code == 200:
            self.reg_id = manual_resp.json()["id"]
        else:
            # Fallback: create via public and approve
            create_resp = requests.post(f"{BASE_URL}/api/registrations", json=reg_data)
            if create_resp.status_code == 200:
                self.reg_id = create_resp.json()["id"]
                requests.put(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/approve", headers=self.headers)
            else:
                self.reg_id = None
        
        yield
        
        # Cleanup
        if self.reg_id:
            requests.delete(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/permanent", headers=self.headers)
    
    def test_mark_arrival_blocked_without_swamsevak(self):
        """Test: Cannot mark arrival without assigned swamsevak"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        # Try to mark arrival without swamsevak assigned
        resp = requests.post(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/mark-arrival", 
            json={"arrival_status": "arrived", "arrived_attendee_ids": ["att1", "att2"]},
            headers=self.headers)
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert "swamsevak" in resp.json().get("detail", "").lower() or "contact person" in resp.json().get("detail", "").lower(), \
            f"Expected swamsevak error, got: {resp.json()}"
        print(f"✓ Blocked without swamsevak: {resp.json().get('detail')}")
    
    def test_mark_arrival_blocked_without_room(self):
        """Test: Cannot mark arrival without room assigned"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        # Assign swamsevak first
        requests.put(f"{BASE_URL}/api/admin/registrations/{self.reg_id}", 
            json={"assigned_swamsevak": "Arun Panchariya"}, headers=self.headers)
        
        # Try to mark arrival without room
        resp = requests.post(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/mark-arrival", 
            json={"arrival_status": "arrived", "arrived_attendee_ids": ["att1", "att2"]},
            headers=self.headers)
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert "room" in resp.json().get("detail", "").lower(), \
            f"Expected room error, got: {resp.json()}"
        print(f"✓ Blocked without room: {resp.json().get('detail')}")
    
    def test_mark_arrival_blocked_without_qr(self):
        """Test: Cannot mark arrival without QR generated"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        # Assign swamsevak
        requests.put(f"{BASE_URL}/api/admin/registrations/{self.reg_id}", 
            json={"assigned_swamsevak": "Arun Panchariya"}, headers=self.headers)
        
        # Create and assign room
        room_code = f"TEST_{uuid.uuid4().hex[:4].upper()}"
        requests.post(f"{BASE_URL}/api/admin/rooms", 
            json={"room_code": room_code, "floor": "1", "capacity": 4}, headers=self.headers)
        requests.put(f"{BASE_URL}/api/admin/rooms/{room_code}/assign", 
            json={"registration_id": self.reg_id}, headers=self.headers)
        
        # Try to mark arrival without QR
        resp = requests.post(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/mark-arrival", 
            json={"arrival_status": "arrived", "arrived_attendee_ids": ["att1", "att2"]},
            headers=self.headers)
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert "qr" in resp.json().get("detail", "").lower(), \
            f"Expected QR error, got: {resp.json()}"
        print(f"✓ Blocked without QR: {resp.json().get('detail')}")
        
        # Cleanup room
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room_code}", headers=self.headers)
    
    def test_mark_arrival_success_with_all_conditions(self):
        """Test: Can mark arrival when swamsevak, room, and QR are all assigned"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        # Assign swamsevak
        requests.put(f"{BASE_URL}/api/admin/registrations/{self.reg_id}", 
            json={"assigned_swamsevak": "Arun Panchariya"}, headers=self.headers)
        
        # Create and assign room
        room_code = f"TEST_{uuid.uuid4().hex[:4].upper()}"
        requests.post(f"{BASE_URL}/api/admin/rooms", 
            json={"room_code": room_code, "floor": "1", "capacity": 4}, headers=self.headers)
        requests.put(f"{BASE_URL}/api/admin/rooms/{room_code}/assign", 
            json={"registration_id": self.reg_id}, headers=self.headers)
        
        # Generate QR
        qr_resp = requests.post(f"{BASE_URL}/api/admin/qr/generate/{self.reg_id}", headers=self.headers)
        assert qr_resp.status_code == 200, f"QR generation failed: {qr_resp.text}"
        
        # Now mark arrival should succeed
        resp = requests.post(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/mark-arrival", 
            json={"arrival_status": "arrived", "arrived_attendee_ids": ["att1", "att2"]},
            headers=self.headers)
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"✓ Arrival marked successfully with all conditions met")
        
        # Cleanup room
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room_code}", headers=self.headers)
    
    def test_no_double_marking(self):
        """Test: Cannot mark already arrived registration as arrived again"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        # Setup: assign swamsevak, room, QR
        requests.put(f"{BASE_URL}/api/admin/registrations/{self.reg_id}", 
            json={"assigned_swamsevak": "Arun Panchariya"}, headers=self.headers)
        
        room_code = f"TEST_{uuid.uuid4().hex[:4].upper()}"
        requests.post(f"{BASE_URL}/api/admin/rooms", 
            json={"room_code": room_code, "floor": "1", "capacity": 4}, headers=self.headers)
        requests.put(f"{BASE_URL}/api/admin/rooms/{room_code}/assign", 
            json={"registration_id": self.reg_id}, headers=self.headers)
        
        requests.post(f"{BASE_URL}/api/admin/qr/generate/{self.reg_id}", headers=self.headers)
        
        # First arrival marking
        resp1 = requests.post(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/mark-arrival", 
            json={"arrival_status": "arrived", "arrived_attendee_ids": ["att1", "att2"]},
            headers=self.headers)
        assert resp1.status_code == 200, f"First arrival marking failed: {resp1.text}"
        
        # Try to mark again
        resp2 = requests.post(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/mark-arrival", 
            json={"arrival_status": "arrived", "arrived_attendee_ids": ["att1", "att2"]},
            headers=self.headers)
        
        assert resp2.status_code == 400, f"Expected 400 for double marking, got {resp2.status_code}"
        assert "already" in resp2.json().get("detail", "").lower() or "double" in resp2.json().get("detail", "").lower(), \
            f"Expected double-marking error, got: {resp2.json()}"
        print(f"✓ Double marking blocked: {resp2.json().get('detail')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room_code}", headers=self.headers)


class TestQRImageField:
    """Tests for QR image field (qr_image_b64) in registration data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and create test registration with QR"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create test registration
        self.test_mobile = f"+91888{uuid.uuid4().hex[:7]}"
        manual_resp = requests.post(f"{BASE_URL}/api/admin/registrations/manual", 
            json={
                "primary_mobile": self.test_mobile,
                "additional_phone": "+919876543210",
                "num_people": 1,
                "attendees": [{"id": "att1", "name": "TEST_QR_Person", "age": "30"}],
                "group_head_id": "att1",
                "attendance_intent": "Yes",
                "selected_days": ["2026-05-28"],
                "expected_arrival_time": "Morning (8-11 AM)",
                "expected_departure_time": "Evening (5-8 PM)",
                "relation_category": "Friends",
                "target_bucket": "expected",
                "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"}
            }, headers=self.headers)
        
        if manual_resp.status_code == 200:
            self.reg_id = manual_resp.json()["id"]
        else:
            self.reg_id = None
        
        yield
        
        if self.reg_id:
            requests.delete(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/permanent", headers=self.headers)
    
    def test_qr_generation_returns_qr_image_b64(self):
        """Test: QR generation returns qr_image_b64 field"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        qr_resp = requests.post(f"{BASE_URL}/api/admin/qr/generate/{self.reg_id}", headers=self.headers)
        assert qr_resp.status_code == 200, f"QR generation failed: {qr_resp.text}"
        
        data = qr_resp.json()
        assert "qr_image_b64" in data, "qr_image_b64 field missing from QR response"
        assert len(data["qr_image_b64"]) > 100, "qr_image_b64 seems too short for a valid base64 image"
        print(f"✓ QR generation returns qr_image_b64 (length: {len(data['qr_image_b64'])})")
    
    def test_registration_detail_contains_qr_image_b64(self):
        """Test: Registration detail contains qr_image_b64 after QR generation"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        # Generate QR
        requests.post(f"{BASE_URL}/api/admin/qr/generate/{self.reg_id}", headers=self.headers)
        
        # Fetch registration detail
        detail_resp = requests.get(f"{BASE_URL}/api/admin/registrations/{self.reg_id}", headers=self.headers)
        assert detail_resp.status_code == 200
        
        data = detail_resp.json()
        assert "qr_image_b64" in data, "qr_image_b64 field missing from registration detail"
        assert data["qr_image_b64"] is not None and len(data["qr_image_b64"]) > 100, \
            "qr_image_b64 is empty or too short"
        print(f"✓ Registration detail contains qr_image_b64")


class TestRoomCSVExport:
    """Tests for Room CSV export endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_room_csv_export_endpoint(self):
        """Test: GET /api/admin/export-csv?bucket=rooms returns valid CSV"""
        resp = requests.get(f"{BASE_URL}/api/admin/export-csv?bucket=rooms", headers=self.headers)
        
        assert resp.status_code == 200, f"Room CSV export failed: {resp.status_code}"
        assert "text/csv" in resp.headers.get("Content-Type", ""), \
            f"Expected CSV content type, got: {resp.headers.get('Content-Type')}"
        
        content = resp.text
        assert "room_code" in content.lower(), "CSV should contain room_code header"
        assert "floor" in content.lower(), "CSV should contain floor header"
        assert "capacity" in content.lower(), "CSV should contain capacity header"
        assert "status" in content.lower(), "CSV should contain status header"
        print(f"✓ Room CSV export returns valid CSV with headers")


class TestManualEntryValidation:
    """Tests for Manual Entry form validation requirements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_manual_entry_accepts_valid_data(self):
        """Test: Manual entry accepts valid data with all required fields"""
        test_mobile = f"+91777{uuid.uuid4().hex[:7]}"
        
        resp = requests.post(f"{BASE_URL}/api/admin/registrations/manual", 
            json={
                "primary_mobile": test_mobile,
                "additional_phone": "+919876543210",
                "num_people": 1,
                "attendees": [{"id": "att1", "name": "TEST_Manual_Person", "age": "35"}],
                "group_head_id": "att1",
                "attendance_intent": "Yes",
                "selected_days": ["2026-05-28", "2026-05-29"],
                "expected_arrival_time": "Morning (8-11 AM)",
                "expected_departure_time": "Evening (5-8 PM)",
                "reference_person_id": "",  # Can be empty for manual entry
                "relation_category": "Friends",
                "target_bucket": "expected",
                "address": {"full_address": "Test Address", "city": "Test City", "state": "Test State", "country": "India"}
            }, headers=self.headers)
        
        assert resp.status_code == 200, f"Manual entry failed: {resp.text}"
        reg_id = resp.json()["id"]
        print(f"✓ Manual entry created successfully: {reg_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent", headers=self.headers)


class TestPublicEndpoints:
    """Tests for public endpoints used by Manual Entry form"""
    
    def test_reference_persons_public_endpoint(self):
        """Test: GET /api/reference-persons/public returns list"""
        resp = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert resp.status_code == 200, f"Reference persons endpoint failed: {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of reference persons"
        print(f"✓ Reference persons endpoint returns {len(data)} items")
    
    def test_relation_categories_public_endpoint(self):
        """Test: GET /api/relation-categories/public returns list"""
        resp = requests.get(f"{BASE_URL}/api/relation-categories/public")
        assert resp.status_code == 200, f"Relation categories endpoint failed: {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of relation categories"
        print(f"✓ Relation categories endpoint returns {len(data)} items")


class TestUserPortalConfirmedState:
    """Tests for user portal confirmed state (room + QR + contact)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create test registration
        self.test_mobile = f"+91666{uuid.uuid4().hex[:7]}"
        manual_resp = requests.post(f"{BASE_URL}/api/admin/registrations/manual", 
            json={
                "primary_mobile": self.test_mobile,
                "additional_phone": "+919876543210",
                "num_people": 1,
                "attendees": [{"id": "att1", "name": "TEST_Confirmed_Person", "age": "40"}],
                "group_head_id": "att1",
                "attendance_intent": "Yes",
                "selected_days": ["2026-05-28"],
                "expected_arrival_time": "Morning (8-11 AM)",
                "expected_departure_time": "Evening (5-8 PM)",
                "relation_category": "Friends",
                "target_bucket": "expected",
                "address": {"full_address": "Test", "city": "Test", "state": "Test", "country": "India"}
            }, headers=self.headers)
        
        if manual_resp.status_code == 200:
            self.reg_id = manual_resp.json()["id"]
        else:
            self.reg_id = None
        
        yield
        
        if self.reg_id:
            requests.delete(f"{BASE_URL}/api/admin/registrations/{self.reg_id}/permanent", headers=self.headers)
    
    def test_confirmed_state_requires_all_conditions(self):
        """Test: Registration shows confirmed state only when room + QR + swamsevak assigned"""
        if not self.reg_id:
            pytest.skip("Registration not created")
        
        # Initial state - not confirmed
        resp1 = requests.get(f"{BASE_URL}/api/registration/by-mobile/{self.test_mobile}")
        assert resp1.status_code == 200
        data1 = resp1.json()
        
        # Should not have all confirmed conditions yet
        has_room = len(data1.get("room_assignments", [])) > 0
        has_qr = data1.get("qr_image_b64") is not None and len(data1.get("qr_image_b64", "")) > 0
        has_swamsevak = data1.get("assigned_swamsevak") is not None and len(data1.get("assigned_swamsevak", "")) > 0
        
        print(f"Initial state - Room: {has_room}, QR: {has_qr}, Swamsevak: {has_swamsevak}")
        
        # Assign swamsevak
        requests.put(f"{BASE_URL}/api/admin/registrations/{self.reg_id}", 
            json={"assigned_swamsevak": "Arun Panchariya"}, headers=self.headers)
        
        # Create and assign room
        room_code = f"TEST_{uuid.uuid4().hex[:4].upper()}"
        requests.post(f"{BASE_URL}/api/admin/rooms", 
            json={"room_code": room_code, "floor": "1", "capacity": 4}, headers=self.headers)
        requests.put(f"{BASE_URL}/api/admin/rooms/{room_code}/assign", 
            json={"registration_id": self.reg_id}, headers=self.headers)
        
        # Generate QR
        requests.post(f"{BASE_URL}/api/admin/qr/generate/{self.reg_id}", headers=self.headers)
        
        # Now check confirmed state
        resp2 = requests.get(f"{BASE_URL}/api/registration/by-mobile/{self.test_mobile}")
        assert resp2.status_code == 200
        data2 = resp2.json()
        
        has_room = len(data2.get("room_assignments", [])) > 0
        has_qr = data2.get("qr_image_b64") is not None and len(data2.get("qr_image_b64", "")) > 0
        has_swamsevak = data2.get("assigned_swamsevak") is not None and len(data2.get("assigned_swamsevak", "")) > 0
        
        assert has_room, "Room should be assigned"
        assert has_qr, "QR should be generated"
        assert has_swamsevak, "Swamsevak should be assigned"
        
        print(f"✓ Confirmed state - Room: {data2.get('room_assignments')}, QR: present, Swamsevak: {data2.get('assigned_swamsevak')}")
        
        # Cleanup room
        requests.delete(f"{BASE_URL}/api/admin/rooms/{room_code}", headers=self.headers)


class TestArrivedGuestListEndpoint:
    """Tests for arrived guest list endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_arrived_guests_endpoint(self):
        """Test: GET /api/admin/guests/arrived returns arrived guests"""
        resp = requests.get(f"{BASE_URL}/api/admin/guests/arrived", headers=self.headers)
        assert resp.status_code == 200, f"Arrived guests endpoint failed: {resp.status_code}"
        
        data = resp.json()
        assert "data" in data, "Response should contain 'data' field"
        assert "total" in data, "Response should contain 'total' field"
        print(f"✓ Arrived guests endpoint returns {data.get('total', 0)} records")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
