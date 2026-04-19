"""
Backend API tests for Role-Gating and Reference Person features.
Tests TASK 1 (role-gated admin UX) and TASK 2 (reference persons own relation categories).
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from /app/memory/test_credentials.md
SUPER_ADMIN = {"username": "superashwini", "password": "supersebhiupper123"}
NORMAL_ADMIN = {"username": "testadmin", "password": "test1234"}


class TestAuthEndpoints:
    """Test authentication endpoints for both admin types"""
    
    def test_super_admin_login(self):
        """Super admin login should work and return superadmin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert data.get("role") == "superadmin", f"Expected superadmin role, got {data.get('role')}"
        assert "token" in data, "Token not returned"
        print(f"✓ Super admin login successful, role={data.get('role')}")
    
    def test_normal_admin_login(self):
        """Normal admin login should work and return swamsevak role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=NORMAL_ADMIN)
        assert response.status_code == 200, f"Normal admin login failed: {response.text}"
        data = response.json()
        assert data.get("role") == "swamsevak", f"Expected swamsevak role, got {data.get('role')}"
        assert "token" in data, "Token not returned"
        print(f"✓ Normal admin login successful, role={data.get('role')}")
    
    def test_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "invalid", "password": "wrong"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestReferencePersonsRoleGating:
    """Test TASK 1: Role-gated access to Reference Persons endpoints"""
    
    @pytest.fixture
    def super_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json().get("token")
    
    @pytest.fixture
    def normal_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=NORMAL_ADMIN)
        return response.json().get("token")
    
    def test_super_admin_can_list_reference_persons(self, super_token):
        """Super admin can list reference persons"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reference-persons",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert response.status_code == 200, f"Failed to list reference persons: {response.text}"
        print(f"✓ Super admin can list reference persons, count={len(response.json())}")
    
    def test_normal_admin_can_list_reference_persons(self, normal_token):
        """Normal admin can also list reference persons (view-only)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reference-persons",
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert response.status_code == 200, f"Failed to list reference persons: {response.text}"
        print(f"✓ Normal admin can list reference persons (view-only), count={len(response.json())}")
    
    def test_super_admin_can_create_reference_person(self, super_token):
        """Super admin can create reference persons"""
        payload = {
            "name": "TEST_RefPerson_Super",
            "description": "Test reference person",
            "relation_categories": ["Friend", "Family"]
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json=payload,
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert response.status_code == 200, f"Failed to create reference person: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_RefPerson_Super"
        assert "Friend" in data.get("relation_categories", [])
        assert "Family" in data.get("relation_categories", [])
        print(f"✓ Super admin created reference person with categories: {data.get('relation_categories')}")
        
        # Cleanup
        ref_id = data.get("id")
        if ref_id:
            requests.delete(
                f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
                headers={"Authorization": f"Bearer {super_token}"}
            )
    
    def test_normal_admin_cannot_create_reference_person(self, normal_token):
        """Normal admin should get 403 when trying to create reference person"""
        payload = {
            "name": "TEST_RefPerson_Normal",
            "description": "Should fail",
            "relation_categories": []
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json=payload,
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Normal admin correctly blocked from creating reference person (403)")
    
    def test_normal_admin_cannot_update_reference_person(self, super_token, normal_token):
        """Normal admin should get 403 when trying to update reference person"""
        # First create a reference person as super admin
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": "TEST_RefPerson_Update", "relation_categories": ["Test"]},
            headers={"Authorization": f"Bearer {super_token}"}
        )
        ref_id = create_resp.json().get("id")
        
        # Try to update as normal admin
        response = requests.put(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            json={"name": "Updated Name"},
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Normal admin correctly blocked from updating reference person (403)")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            headers={"Authorization": f"Bearer {super_token}"}
        )
    
    def test_normal_admin_cannot_delete_reference_person(self, super_token, normal_token):
        """Normal admin should get 403 when trying to delete reference person"""
        # First create a reference person as super admin
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": "TEST_RefPerson_Delete", "relation_categories": []},
            headers={"Authorization": f"Bearer {super_token}"}
        )
        ref_id = create_resp.json().get("id")
        
        # Try to delete as normal admin
        response = requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Normal admin correctly blocked from deleting reference person (403)")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            headers={"Authorization": f"Bearer {super_token}"}
        )


class TestReferencePersonRelationCategories:
    """Test TASK 2: Reference persons own their relation categories"""
    
    @pytest.fixture
    def super_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json().get("token")
    
    def test_create_reference_person_with_categories(self, super_token):
        """Create reference person with relation categories"""
        payload = {
            "name": "TEST_RefA_WithCats",
            "description": "Has categories",
            "relation_categories": ["Friend", "Family", "Colleague"]
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json=payload,
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("relation_categories", [])) == 3
        print(f"✓ Created reference person with 3 categories: {data.get('relation_categories')}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{data.get('id')}",
            headers={"Authorization": f"Bearer {super_token}"}
        )
    
    def test_create_reference_person_without_categories(self, super_token):
        """Create reference person with NO relation categories (valid)"""
        payload = {
            "name": "TEST_RefB_NoCats",
            "description": "No categories",
            "relation_categories": []
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json=payload,
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("relation_categories", [])) == 0
        print("✓ Created reference person with 0 categories (valid)")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{data.get('id')}",
            headers={"Authorization": f"Bearer {super_token}"}
        )
    
    def test_update_reference_person_categories(self, super_token):
        """Update relation categories for a reference person"""
        # Create
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": "TEST_RefC_UpdateCats", "relation_categories": ["Initial"]},
            headers={"Authorization": f"Bearer {super_token}"}
        )
        ref_id = create_resp.json().get("id")
        
        # Update categories
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            json={"relation_categories": ["Updated1", "Updated2"]},
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert update_resp.status_code == 200
        
        # Verify via GET
        get_resp = requests.get(
            f"{BASE_URL}/api/admin/reference-persons",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        persons = get_resp.json()
        updated_person = next((p for p in persons if p.get("id") == ref_id), None)
        assert updated_person is not None
        assert "Updated1" in updated_person.get("relation_categories", [])
        assert "Updated2" in updated_person.get("relation_categories", [])
        print(f"✓ Updated reference person categories: {updated_person.get('relation_categories')}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            headers={"Authorization": f"Bearer {super_token}"}
        )
    
    def test_public_endpoint_returns_relation_categories(self, super_token):
        """Public endpoint should return relation_categories per person"""
        # Create a reference person with categories
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/reference-persons",
            json={"name": "TEST_RefD_Public", "relation_categories": ["PublicCat1", "PublicCat2"]},
            headers={"Authorization": f"Bearer {super_token}"}
        )
        ref_id = create_resp.json().get("id")
        
        # Fetch public endpoint (no auth required)
        public_resp = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert public_resp.status_code == 200
        persons = public_resp.json()
        
        # Find our test person
        test_person = next((p for p in persons if p.get("id") == ref_id), None)
        assert test_person is not None, "Test person not found in public endpoint"
        assert "relation_categories" in test_person, "relation_categories field missing"
        assert "PublicCat1" in test_person.get("relation_categories", [])
        print(f"✓ Public endpoint returns relation_categories: {test_person.get('relation_categories')}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/reference-persons/{ref_id}",
            headers={"Authorization": f"Bearer {super_token}"}
        )


class TestNotificationsRoleGating:
    """Test role-gating for Notifications endpoints"""
    
    @pytest.fixture
    def super_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json().get("token")
    
    @pytest.fixture
    def normal_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=NORMAL_ADMIN)
        return response.json().get("token")
    
    def test_both_admins_can_view_otp_logs(self, super_token, normal_token):
        """Both admin types can view OTP logs (but normal admin sees masked data in UI)"""
        # Super admin
        super_resp = requests.get(
            f"{BASE_URL}/api/admin/otp-logs",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert super_resp.status_code == 200, f"Super admin OTP logs failed: {super_resp.text}"
        
        # Normal admin
        normal_resp = requests.get(
            f"{BASE_URL}/api/admin/otp-logs",
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert normal_resp.status_code == 200, f"Normal admin OTP logs failed: {normal_resp.text}"
        print("✓ Both admin types can access OTP logs endpoint")
    
    def test_both_admins_can_view_conversations(self, super_token, normal_token):
        """Both admin types can view conversations list"""
        # Super admin
        super_resp = requests.get(
            f"{BASE_URL}/api/admin/wa-conversations",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert super_resp.status_code == 200
        
        # Normal admin
        normal_resp = requests.get(
            f"{BASE_URL}/api/admin/wa-conversations",
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert normal_resp.status_code == 200
        print("✓ Both admin types can access conversations endpoint")


class TestWAFlowSettingsRoleGating:
    """Test role-gating for WA Flow Settings endpoints"""
    
    @pytest.fixture
    def super_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json().get("token")
    
    @pytest.fixture
    def normal_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=NORMAL_ADMIN)
        return response.json().get("token")
    
    def test_both_admins_can_list_wa_flows(self, super_token, normal_token):
        """Both admin types can list WA flows"""
        super_resp = requests.get(
            f"{BASE_URL}/api/admin/wa-flows",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert super_resp.status_code == 200
        
        normal_resp = requests.get(
            f"{BASE_URL}/api/admin/wa-flows",
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert normal_resp.status_code == 200
        print("✓ Both admin types can list WA flows")


class TestDashboardAndCoreFlows:
    """Test that existing admin flows still work (no regression)"""
    
    @pytest.fixture
    def super_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        return response.json().get("token")
    
    @pytest.fixture
    def normal_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=NORMAL_ADMIN)
        return response.json().get("token")
    
    def test_dashboard_loads(self, super_token):
        """Dashboard endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending_count" in data or "total_people" in data
        print(f"✓ Dashboard loads successfully")
    
    def test_registrations_list(self, super_token):
        """Registrations list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/registrations",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data or isinstance(data, list)
        print(f"✓ Registrations list works")
    
    def test_rooms_list(self, super_token):
        """Rooms list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rooms",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert response.status_code == 200
        print(f"✓ Rooms list works, count={len(response.json())}")
    
    def test_auth_me_endpoint(self, super_token, normal_token):
        """Auth /me endpoint returns correct user info"""
        # Super admin
        super_resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {super_token}"}
        )
        assert super_resp.status_code == 200
        assert super_resp.json().get("role") == "superadmin"
        
        # Normal admin
        normal_resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {normal_token}"}
        )
        assert normal_resp.status_code == 200
        assert normal_resp.json().get("role") == "swamsevak"
        print("✓ Auth /me endpoint returns correct roles")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
