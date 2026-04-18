"""
Iteration 18 - Testing Katha 2026 Event App
Focus: Edit/Delete controls, Status filters, Export params, Mobile sidebar, QR Scanner
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}
SWAMSEVAK = {"username": "arunpanchariya", "password": "arunlondon123"}


class TestAuthentication:
    """Test admin login functionality"""
    
    def test_super_admin_login(self):
        """Super admin login should return token with superadmin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("role") == "superadmin"
        print(f"✓ Super admin login successful, role: {data.get('role')}")
    
    def test_swamsevak_login(self):
        """Swamsevak login should return token with swamsevak role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SWAMSEVAK)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("role") == "swamsevak"
        print(f"✓ Swamsevak login successful, role: {data.get('role')}")


@pytest.fixture
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Super admin login failed")


@pytest.fixture
def swamsevak_token():
    """Get swamsevak auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SWAMSEVAK)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Swamsevak login failed")


class TestExpectedGuestList:
    """Test Expected Guest List endpoints"""
    
    def test_get_expected_guests_all(self, super_admin_token):
        """Get all expected guests (default filter)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guests/expected", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Expected guests endpoint works, total: {data.get('total')}")
    
    def test_get_expected_guests_not_coming_filter(self, super_admin_token):
        """Get expected guests with not_coming status filter"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guests/expected", 
                               headers=headers, params={"status_filter": "not_coming"})
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Expected guests with not_coming filter works, count: {len(data.get('data', []))}")
    
    def test_expected_csv_export_with_params(self, super_admin_token):
        """CSV export should accept search and status_filter params"""
        params = {
            "bucket": "expected",
            "token": super_admin_token,
            "search": "test",
            "status_filter": "all"
        }
        response = requests.get(f"{BASE_URL}/api/admin/export-csv", params=params)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Expected CSV export with search and status_filter params works")
    
    def test_expected_pdf_export_with_params(self, super_admin_token):
        """PDF export should accept search and status_filter params"""
        params = {
            "bucket": "expected",
            "token": super_admin_token,
            "search": "test",
            "status_filter": "not_coming"
        }
        response = requests.get(f"{BASE_URL}/api/admin/export-pdf", params=params)
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        print("✓ Expected PDF export with search and status_filter params works")


class TestArrivedGuestList:
    """Test Arrived Guest List endpoints"""
    
    def test_get_arrived_guests_all(self, super_admin_token):
        """Get all arrived guests (default filter)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guests/arrived", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Arrived guests endpoint works, total: {data.get('total')}")
    
    def test_get_arrived_guests_arrived_filter(self, super_admin_token):
        """Get arrived guests with arrived status filter"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guests/arrived", 
                               headers=headers, params={"status_filter": "arrived"})
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Arrived guests with arrived filter works, count: {len(data.get('data', []))}")
    
    def test_get_arrived_guests_departed_filter(self, super_admin_token):
        """Get arrived guests with departed status filter"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guests/arrived", 
                               headers=headers, params={"status_filter": "departed"})
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Arrived guests with departed filter works, count: {len(data.get('data', []))}")
    
    def test_arrived_csv_export_with_params(self, super_admin_token):
        """CSV export for arrived bucket should accept search and status_filter params"""
        params = {
            "bucket": "arrived",
            "token": super_admin_token,
            "search": "",
            "status_filter": "arrived"
        }
        response = requests.get(f"{BASE_URL}/api/admin/export-csv", params=params)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Arrived CSV export with status_filter params works")
    
    def test_arrived_pdf_export_with_params(self, super_admin_token):
        """PDF export for arrived bucket should accept search and status_filter params"""
        params = {
            "bucket": "arrived",
            "token": super_admin_token,
            "search": "",
            "status_filter": "departed"
        }
        response = requests.get(f"{BASE_URL}/api/admin/export-pdf", params=params)
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        print("✓ Arrived PDF export with status_filter params works")


class TestPendingApproval:
    """Test Pending Approval endpoints"""
    
    def test_get_pending_guests(self, super_admin_token):
        """Get pending approval registrations"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guests/pending", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Pending guests endpoint works, total: {data.get('total')}")
    
    def test_pending_csv_export_with_search(self, super_admin_token):
        """CSV export for pending bucket should accept search param"""
        params = {
            "bucket": "pending",
            "token": super_admin_token,
            "search": "test"
        }
        response = requests.get(f"{BASE_URL}/api/admin/export-csv", params=params)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Pending CSV export with search param works")
    
    def test_pending_pdf_export_with_search(self, super_admin_token):
        """PDF export for pending bucket should accept search param"""
        params = {
            "bucket": "pending",
            "token": super_admin_token,
            "search": "test"
        }
        response = requests.get(f"{BASE_URL}/api/admin/export-pdf", params=params)
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        print("✓ Pending PDF export with search param works")


class TestSuperAdminControls:
    """Test super admin edit/delete controls"""
    
    def test_permanent_delete_endpoint_exists(self, super_admin_token):
        """Permanent delete endpoint should exist (even if no data to delete)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        # Test with a non-existent ID to verify endpoint exists
        response = requests.delete(f"{BASE_URL}/api/admin/registrations/nonexistent-id/permanent", headers=headers)
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 200], f"Unexpected status: {response.status_code}"
        print("✓ Permanent delete endpoint exists")
    
    def test_registration_update_endpoint(self, super_admin_token):
        """Registration update endpoint should exist"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        # Test with a non-existent ID to verify endpoint exists
        response = requests.put(f"{BASE_URL}/api/admin/registrations/nonexistent-id", 
                               headers=headers, json={"admin_notes": "test"})
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 200], f"Unexpected status: {response.status_code}"
        print("✓ Registration update endpoint exists")
    
    def test_not_coming_endpoint(self, super_admin_token):
        """Mark not coming endpoint should exist"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/registrations/nonexistent-id/not-coming", headers=headers)
        assert response.status_code in [404, 200, 403], f"Unexpected status: {response.status_code}"
        print("✓ Not coming endpoint exists")
    
    def test_undo_not_coming_endpoint(self, super_admin_token):
        """Undo not coming endpoint should exist"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/registrations/nonexistent-id/undo-not-coming", headers=headers)
        assert response.status_code in [404, 400, 200], f"Unexpected status: {response.status_code}"
        print("✓ Undo not coming endpoint exists")


class TestQRScanner:
    """Test QR Scanner endpoints"""
    
    def test_qr_scan_endpoint(self, super_admin_token):
        """QR scan endpoint should exist"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/qr/scan", 
                                headers=headers, json={"qr_token": "invalid-token"})
        # Should return 400/404 for invalid token, not 405
        assert response.status_code in [400, 404], f"Unexpected status: {response.status_code}"
        print("✓ QR scan endpoint exists")
    
    def test_qr_generate_endpoint(self, super_admin_token):
        """QR generate endpoint should exist"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/qr/generate/nonexistent-id", headers=headers)
        # Should return 404 for non-existent ID, not 405
        assert response.status_code in [404, 200], f"Unexpected status: {response.status_code}"
        print("✓ QR generate endpoint exists")
    
    def test_qr_bulk_generate_endpoint(self, super_admin_token):
        """QR bulk generate endpoint should exist"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/qr/generate-bulk", headers=headers)
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        print("✓ QR bulk generate endpoint works")
    
    def test_qr_management_endpoint(self, super_admin_token):
        """QR management list endpoint should exist"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/qr-management", headers=headers)
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        print("✓ QR management endpoint works")


class TestDashboard:
    """Test dashboard endpoint"""
    
    def test_dashboard_endpoint(self, super_admin_token):
        """Dashboard should return stats"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "pending_count" in data
        assert "approved_count" in data
        assert "arrival_summary" in data
        print(f"✓ Dashboard works - Pending: {data.get('pending_count')}, Approved: {data.get('approved_count')}")


class TestRejectedRegistrations:
    """Test rejected registrations endpoint"""
    
    def test_rejected_endpoint(self, super_admin_token):
        """Rejected registrations endpoint should work"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/registrations/rejected", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Rejected registrations endpoint works, count: {len(data.get('data', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
