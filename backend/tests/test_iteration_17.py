"""
Iteration 17 Test Suite - Critical Bug Fix Testing
Tests for approve/reject endpoints, PDF exports, delete buttons, QR functionality, and more.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}
SWAMSEVAK = {"username": "arunpanchariya", "password": "arunlondon123"}


class TestAuth:
    """Authentication tests"""
    
    def test_super_admin_login(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "superadmin"
        print(f"✓ Super admin login successful: {data['name']}")
        return data["token"]
    
    def test_swamsevak_login(self):
        """Test swamsevak login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SWAMSEVAK)
        assert response.status_code == 200, f"Swamsevak login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "swamsevak"
        print(f"✓ Swamsevak login successful: {data['name']}")
        return data["token"]


class TestApproveRejectEndpoints:
    """CRITICAL: Test that approve/reject endpoints actually change approval_status in DB"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_approve_endpoint_changes_db(self, super_admin_token):
        """CRITICAL: PUT /api/admin/registrations/{id}/approve actually changes approval_status to 'approved' in DB"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a pending registration
        response = requests.get(f"{BASE_URL}/api/admin/guests/pending", headers=headers, params={"per_page": 100})
        assert response.status_code == 200
        pending = response.json().get("data", [])
        
        if len(pending) == 0:
            pytest.skip("No pending registrations to test approve endpoint")
        
        reg_id = pending[0]["id"]
        original_status = pending[0].get("approval_status", "pending")
        print(f"Testing approve on registration {reg_id}, current status: {original_status}")
        
        # Call the approve endpoint
        approve_response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/approve", headers=headers)
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        
        # Verify the status changed in DB by fetching expected guests
        time.sleep(0.5)  # Small delay for DB write
        expected_response = requests.get(f"{BASE_URL}/api/admin/guests/expected", headers=headers, params={"per_page": 500})
        assert expected_response.status_code == 200
        expected = expected_response.json().get("data", [])
        
        # Find the registration in expected list
        found = next((r for r in expected if r["id"] == reg_id), None)
        assert found is not None, f"Registration {reg_id} not found in expected list after approval"
        assert found["approval_status"] == "approved", f"approval_status is '{found['approval_status']}' not 'approved'"
        print(f"✓ CRITICAL: Approve endpoint correctly changed approval_status to 'approved' in DB")
    
    def test_reject_endpoint_changes_db(self, super_admin_token):
        """CRITICAL: PUT /api/admin/registrations/{id}/reject actually changes approval_status to 'rejected' in DB"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a pending registration
        response = requests.get(f"{BASE_URL}/api/admin/guests/pending", headers=headers, params={"per_page": 100})
        assert response.status_code == 200
        pending = response.json().get("data", [])
        
        if len(pending) == 0:
            pytest.skip("No pending registrations to test reject endpoint")
        
        reg_id = pending[0]["id"]
        print(f"Testing reject on registration {reg_id}")
        
        # Call the reject endpoint
        reject_response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/reject", headers=headers)
        assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
        
        # Verify the status changed in DB by fetching rejected list
        time.sleep(0.5)
        rejected_response = requests.get(f"{BASE_URL}/api/admin/registrations/rejected", headers=headers, params={"per_page": 500})
        assert rejected_response.status_code == 200
        rejected = rejected_response.json().get("data", [])
        
        # Find the registration in rejected list
        found = next((r for r in rejected if r["id"] == reg_id), None)
        assert found is not None, f"Registration {reg_id} not found in rejected list after rejection"
        assert found["approval_status"] == "rejected", f"approval_status is '{found['approval_status']}' not 'rejected'"
        print(f"✓ CRITICAL: Reject endpoint correctly changed approval_status to 'rejected' in DB")


class TestPDFExport:
    """Test PDF export endpoints"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_pdf_export_pending(self, super_admin_token):
        """GET /api/admin/export-pdf?bucket=pending returns valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export-pdf",
            params={"bucket": "pending", "token": super_admin_token}
        )
        assert response.status_code == 200, f"PDF export pending failed: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 100, "PDF content too small"
        print(f"✓ PDF export for pending: {len(response.content)} bytes")
    
    def test_pdf_export_arrived(self, super_admin_token):
        """GET /api/admin/export-pdf?bucket=arrived returns valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export-pdf",
            params={"bucket": "arrived", "token": super_admin_token}
        )
        assert response.status_code == 200, f"PDF export arrived failed: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 100, "PDF content too small"
        print(f"✓ PDF export for arrived: {len(response.content)} bytes")
    
    def test_pdf_export_rooms(self, super_admin_token):
        """GET /api/admin/export-pdf?report_type=rooms returns valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export-pdf",
            params={"report_type": "rooms", "token": super_admin_token}
        )
        assert response.status_code == 200, f"PDF export rooms failed: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        print(f"✓ PDF export for rooms: {len(response.content)} bytes")


class TestCSVExport:
    """Test CSV export endpoints"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_csv_export_rooms(self, super_admin_token):
        """GET /api/admin/export-csv?bucket=rooms returns valid CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export-csv",
            params={"bucket": "rooms", "token": super_admin_token}
        )
        assert response.status_code == 200, f"CSV export rooms failed: {response.status_code}"
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "application/octet-stream" in content_type
        print(f"✓ CSV export for rooms: {len(response.content)} bytes")


class TestDeleteEndpoints:
    """Test delete functionality for super admin"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_permanent_delete_endpoint_exists(self, super_admin_token):
        """Verify DELETE /api/admin/registrations/{id}/permanent endpoint exists"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Try with a fake ID - should return 404 not 405 (method not allowed)
        response = requests.delete(f"{BASE_URL}/api/admin/registrations/fake-id-12345/permanent", headers=headers)
        assert response.status_code in [404, 200], f"Delete endpoint returned unexpected status: {response.status_code}"
        print(f"✓ Permanent delete endpoint exists and is accessible")


class TestQRFunctionality:
    """Test QR code generation and scanning"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_qr_scan_already_arrived(self, super_admin_token):
        """QR scan of already-arrived person shows already_arrived flag"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get arrived guests
        response = requests.get(f"{BASE_URL}/api/admin/guests/arrived", headers=headers, params={"per_page": 100})
        assert response.status_code == 200
        arrived = response.json().get("data", [])
        
        # Find one with QR token AND room assigned (required for QR scan)
        arrived_with_qr_and_room = [
            r for r in arrived 
            if r.get("qr_token") 
            and r.get("arrival_status") == "arrived"
            and r.get("room_assignments") and len(r.get("room_assignments", [])) > 0
            and r.get("assigned_swamsevak")
        ]
        
        if len(arrived_with_qr_and_room) == 0:
            # This is expected - the test data may not have fully configured arrived guests
            print("No arrived guests with QR token, room, and swamsevak assigned - skipping")
            pytest.skip("No arrived guests with QR token, room, and swamsevak to test")
        
        reg = arrived_with_qr_and_room[0]
        qr_token = reg["qr_token"]
        print(f"Testing QR scan for already-arrived guest: {reg.get('primary_mobile')}")
        
        # Scan the QR
        scan_response = requests.post(
            f"{BASE_URL}/api/admin/qr/scan",
            headers=headers,
            json={"qr_token": qr_token}
        )
        assert scan_response.status_code == 200, f"QR scan failed: {scan_response.text}"
        scan_data = scan_response.json()
        
        assert "already_arrived" in scan_data, "Response missing already_arrived field"
        assert scan_data["already_arrived"] == True, "already_arrived should be True for arrived guest"
        assert "registration" in scan_data, "Response missing registration data"
        print(f"✓ QR scan correctly returns already_arrived=True for arrived guest")


class TestMarkArrivalEndpoint:
    """Test mark-arrival endpoint"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_mark_arrival_endpoint_exists(self, super_admin_token):
        """POST /api/admin/registrations/{id}/mark-arrival endpoint exists"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Try with a fake ID - should return 404 not 405
        response = requests.post(
            f"{BASE_URL}/api/admin/registrations/fake-id-12345/mark-arrival",
            headers=headers,
            json={"arrival_status": "arrived", "arrived_attendee_ids": []}
        )
        assert response.status_code in [404, 400], f"Mark arrival endpoint returned unexpected status: {response.status_code}"
        print(f"✓ Mark arrival endpoint exists and is accessible")


class TestDashboardCounts:
    """Test dashboard counts after approve/reject"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_dashboard_counts(self, super_admin_token):
        """Verify dashboard returns correct counts"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "pending_count" in data
        assert "approved_count" in data
        assert "rejected_count" in data
        
        print(f"✓ Dashboard counts: pending={data['pending_count']}, approved={data['approved_count']}, rejected={data['rejected_count']}")


class TestAuditLog:
    """Test audit log functionality"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_audit_log_endpoint(self, super_admin_token):
        """Verify audit log endpoint returns data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=headers, params={"per_page": 10})
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        print(f"✓ Audit log endpoint working, {len(data.get('data', []))} entries returned")


class TestPublicEndpoints:
    """Test public endpoints"""
    
    def test_reference_persons_public(self):
        """GET /api/reference-persons/public returns list"""
        response = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Reference persons public endpoint: {len(data)} persons")
    
    def test_relation_categories_public(self):
        """GET /api/relation-categories/public returns list"""
        response = requests.get(f"{BASE_URL}/api/relation-categories/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Relation categories public endpoint: {len(data)} categories")


class TestUndoArrivalDeparture:
    """Test undo arrival/departure endpoints"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_undo_arrival_endpoint_exists(self, super_admin_token):
        """PUT /api/admin/registrations/{id}/undo-arrival endpoint exists"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.put(f"{BASE_URL}/api/admin/registrations/fake-id-12345/undo-arrival", headers=headers)
        assert response.status_code in [404, 400], f"Undo arrival endpoint returned unexpected status: {response.status_code}"
        print(f"✓ Undo arrival endpoint exists")
    
    def test_undo_departure_endpoint_exists(self, super_admin_token):
        """PUT /api/admin/registrations/{id}/undo-departure endpoint exists"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.put(f"{BASE_URL}/api/admin/registrations/fake-id-12345/undo-departure", headers=headers)
        assert response.status_code in [404, 400], f"Undo departure endpoint returned unexpected status: {response.status_code}"
        print(f"✓ Undo departure endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
