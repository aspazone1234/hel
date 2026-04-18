"""
Smoke/E2E tests for Shrimad Bhagavat Katha Mahotsav 2026 / Swamsevak Portal
Tests basic auth and representative authenticated endpoints after GitHub import
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRootAndHealth:
    """Root endpoint tests"""
    
    def test_root_endpoint_returns_200(self):
        """GET /api/ should return 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print(f"✓ Root endpoint returned {response.status_code}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_superadmin_success(self):
        """POST /api/auth/login with superadmin credentials returns JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "token" in data
        assert "username" in data
        assert "name" in data
        assert "role" in data
        
        # Validate values
        assert data["username"] == "superashwini"
        assert data["role"] == "superadmin"
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"✓ Login successful: username={data['username']}, role={data['role']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials correctly rejected with 401")
    
    def test_auth_me_with_valid_token(self, auth_token):
        """GET /api/auth/me with valid token returns user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "username" in data
        assert "name" in data
        assert "role" in data
        assert data["username"] == "superashwini"
        assert data["role"] == "superadmin"
        print(f"✓ /api/auth/me returned: {data}")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ Unauthenticated request correctly rejected with 401")


class TestAuthenticatedEndpoints:
    """Tests for authenticated admin endpoints"""
    
    def test_admin_registrations(self, auth_token):
        """GET /api/admin/registrations returns paginated data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/registrations?page=1&per_page=10",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert isinstance(data["data"], list)
        print(f"✓ /api/admin/registrations: total={data['total']}, page={data['page']}")
    
    def test_admin_rooms(self, auth_token):
        """GET /api/admin/rooms returns room list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rooms",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ /api/admin/rooms: {len(data)} rooms found")
    
    def test_admin_reference_persons(self, auth_token):
        """GET /api/admin/reference-persons returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reference-persons",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ /api/admin/reference-persons: {len(data)} persons found")
    
    def test_admin_admins(self, auth_token):
        """GET /api/admin/admins returns list of custom admins"""
        response = requests.get(
            f"{BASE_URL}/api/admin/admins",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ /api/admin/admins: {len(data)} admins found")
    
    def test_admin_relation_categories(self, auth_token):
        """GET /api/admin/relation-categories returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/relation-categories",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ /api/admin/relation-categories: {len(data)} categories found")
    
    def test_admin_todos(self, auth_token):
        """GET /api/admin/todos returns paginated data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/todos",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Todos endpoint returns paginated response
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        print(f"✓ /api/admin/todos: total={data['total']}")
    
    def test_admin_tickets(self, auth_token):
        """GET /api/admin/tickets returns paginated data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets?page=1&per_page=10",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        print(f"✓ /api/admin/tickets: total={data['total']}")
    
    def test_admin_dashboard(self, auth_token):
        """GET /api/admin/dashboard returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "pending_count" in data
        assert "approved_count" in data
        assert "total_people" in data
        print(f"✓ /api/admin/dashboard: pending={data['pending_count']}, approved={data['approved_count']}, total_people={data['total_people']}")
    
    def test_admin_custom_fields(self, auth_token):
        """GET /api/admin/custom-fields returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/custom-fields",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ /api/admin/custom-fields: {len(data)} fields found")


class TestPublicEndpoints:
    """Tests for public (unauthenticated) endpoints"""
    
    def test_geo_countries(self):
        """GET /api/geo/countries returns country list"""
        response = requests.get(f"{BASE_URL}/api/geo/countries")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 100  # Should have many countries
        print(f"✓ /api/geo/countries: {len(data)} countries")
    
    def test_reference_persons_public(self):
        """GET /api/reference-persons/public returns list"""
        response = requests.get(f"{BASE_URL}/api/reference-persons/public")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ /api/reference-persons/public: {len(data)} persons")
    
    def test_relation_categories_public(self):
        """GET /api/relation-categories/public returns list"""
        response = requests.get(f"{BASE_URL}/api/relation-categories/public")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ /api/relation-categories/public: {len(data)} categories")
    
    def test_registrations_count(self):
        """GET /api/registrations/count returns total"""
        response = requests.get(f"{BASE_URL}/api/registrations/count")
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        print(f"✓ /api/registrations/count: total={data['total']}")


# Fixtures
@pytest.fixture
def auth_token():
    """Get authentication token for superadmin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "superashwini",
        "password": "supersebhiupper123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")
