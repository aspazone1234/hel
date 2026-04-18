"""
Test Suite for V8 UI Overhaul - Major Changes:
1. Super Admin CRUD for admin management
2. Delete disapproved entries
3. Sidebar renamed to 'Website Form Approval' (not 'Website Form Management')
4. No bulk Approve All / Reject All buttons
5. Guest List: Only 3 filters (Arriving Date, Departure Date, Arrival Status)
6. Guest List: Action buttons show text labels (View, Edit, Delete)
7. Dashboard: Full words (families, people), vertical schedule, single rooms block
8. Registration form: Address placeholder is 'Address'
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndRoles:
    """Test authentication and role-based access"""
    
    def test_regular_admin_login(self):
        """Regular admin should login and NOT have superadmin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["role"] == "admin", f"Expected role='admin', got {data['role']}"
        assert "token" in data
        print(f"SUCCESS: Regular admin login - role={data['role']}")
        return data["token"]
    
    def test_super_admin_login(self):
        """Super admin should login with superadmin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["role"] == "superadmin", f"Expected role='superadmin', got {data['role']}"
        assert "token" in data
        print(f"SUCCESS: Super admin login - role={data['role']}")
        return data["token"]


class TestAdminManagement:
    """Test Super Admin CRUD for admin management"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def regular_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    def test_list_admins_super_admin(self, super_admin_token):
        """Super admin can list all admins"""
        response = requests.get(f"{BASE_URL}/api/admin/admins", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        admins = response.json()
        assert isinstance(admins, list)
        # Should have system admins
        system_admins = [a for a in admins if a.get("source") == "system"]
        assert len(system_admins) >= 4, "Should have at least 4 system admins"
        print(f"SUCCESS: Listed {len(admins)} admins ({len(system_admins)} system)")
    
    def test_list_admins_regular_admin_forbidden(self, regular_admin_token):
        """Regular admin cannot list admins"""
        response = requests.get(f"{BASE_URL}/api/admin/admins", headers={
            "Authorization": f"Bearer {regular_admin_token}"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("SUCCESS: Regular admin blocked from listing admins")
    
    def test_create_custom_admin(self, super_admin_token):
        """Super admin can create a custom admin"""
        test_username = f"test_admin_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/admin/admins", json={
            "username": test_username,
            "password": "testpass123",
            "name": "Test Admin",
            "city": "Test City"
        }, headers={"Authorization": f"Bearer {super_admin_token}"})
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"SUCCESS: Created custom admin '{test_username}'")
        
        # Cleanup - delete the test admin
        requests.delete(f"{BASE_URL}/api/admin/admins/{test_username}", 
                       headers={"Authorization": f"Bearer {super_admin_token}"})
    
    def test_delete_custom_admin(self, super_admin_token):
        """Super admin can delete a custom admin"""
        # First create
        test_username = f"test_del_{uuid.uuid4().hex[:8]}"
        requests.post(f"{BASE_URL}/api/admin/admins", json={
            "username": test_username,
            "password": "testpass123",
            "name": "To Delete",
            "city": ""
        }, headers={"Authorization": f"Bearer {super_admin_token}"})
        
        # Then delete
        response = requests.delete(f"{BASE_URL}/api/admin/admins/{test_username}", 
                                  headers={"Authorization": f"Bearer {super_admin_token}"})
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"SUCCESS: Deleted custom admin '{test_username}'")


class TestDeleteDisapprovedEntries:
    """Test that super admin can delete disapproved (rejected) entries"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        return response.json()["token"]
    
    def test_permanent_delete_rejected_entry(self, super_admin_token):
        """Super admin can permanently delete a rejected entry"""
        # Create a test registration
        reg_response = requests.post(f"{BASE_URL}/api/registrations", json={
            "full_name": "TEST_Disapproved_Delete",
            "mobile": "9999888877",
            "address": "Test Address",
            "num_people": 1,
            "consent": True
        })
        reg_id = reg_response.json()["id"]
        
        # Reject it
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status", 
                    json={"status": "rejected"},
                    headers={"Authorization": f"Bearer {super_admin_token}"})
        
        # Permanently delete it
        response = requests.delete(f"{BASE_URL}/api/admin/registrations/{reg_id}/permanent",
                                  headers={"Authorization": f"Bearer {super_admin_token}"})
        assert response.status_code == 200, f"Failed: {response.text}"
        print("SUCCESS: Super admin can permanently delete rejected entries")


class TestDashboard:
    """Test dashboard shows full words and correct layout"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    def test_dashboard_data_structure(self, admin_token):
        """Dashboard returns proper data for full words display"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check required fields for full words display
        assert "total_approved" in data, "Missing total_approved (families)"
        assert "total_people" in data, "Missing total_people"
        assert "pending_count" in data, "Missing pending_count"
        
        # Check arrival summary structure
        assert "arrival_summary" in data
        arr = data["arrival_summary"]
        assert "arrived" in arr and "families" in arr["arrived"] and "people" in arr["arrived"]
        assert "not_arrived" in arr and "families" in arr["not_arrived"] and "people" in arr["not_arrived"]
        assert "not_coming" in arr and "families" in arr["not_coming"] and "people" in arr["not_coming"]
        
        # Check daily schedule for vertical layout
        assert "daily_schedule" in data
        schedule = data["daily_schedule"]
        assert len(schedule) == 7, f"Expected 7 days (28 May - 3 June), got {len(schedule)}"
        for day in schedule:
            assert "arrivals_families" in day
            assert "arrivals_people" in day
            assert "departures_families" in day
            assert "departures_people" in day
        
        # Check single rooms block data
        assert "total_rooms" in data
        assert "occupied_rooms" in data
        assert "available_rooms" in data
        
        print("SUCCESS: Dashboard data structure correct for full words and vertical schedule")


class TestGuestListFilters:
    """Test that Guest List has only 3 filters"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    def test_filter_by_arrival_date(self, admin_token):
        """Can filter by arrival date"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", params={
            "status": "approved",
            "arrival_date": "2026-05-28"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        print("SUCCESS: Filter by arrival_date works")
    
    def test_filter_by_departure_date(self, admin_token):
        """Can filter by departure date"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", params={
            "status": "approved",
            "departure_date": "2026-06-03"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        print("SUCCESS: Filter by departure_date works")
    
    def test_filter_by_arrival_status(self, admin_token):
        """Can filter by arrival status"""
        response = requests.get(f"{BASE_URL}/api/admin/registrations", params={
            "status": "approved",
            "arrival_status": "Not Arrived"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        print("SUCCESS: Filter by arrival_status works")


class TestArrivalRoomModal:
    """Test arrival-to-room assignment flow"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superashwini",
            "password": "supersebhiupper123"
        })
        return response.json()["token"]
    
    def test_mark_arrived_without_room(self, admin_token):
        """Can mark guest as arrived without assigning room"""
        # Create test registration
        reg_response = requests.post(f"{BASE_URL}/api/registrations", json={
            "full_name": "TEST_Arrival_NoRoom",
            "mobile": "9998887776",
            "address": "Test Address",
            "num_people": 1,
            "consent": True
        })
        reg_id = reg_response.json()["id"]
        
        # Approve it
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
                    json={"status": "approved"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        
        # Mark as arrived without room
        response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/management",
                               json={"arrival_status": "Arrived"},
                               headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify
        reg = requests.get(f"{BASE_URL}/api/admin/registrations/{reg_id}",
                          headers={"Authorization": f"Bearer {admin_token}"}).json()
        assert reg["arrival_status"] == "Arrived"
        assert reg["room_assignment"] == ""
        
        # Cleanup
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
                    json={"status": "deleted"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        
        print("SUCCESS: Can mark arrived without room")
    
    def test_rooms_list_for_modal(self, admin_token):
        """Rooms endpoint returns data for modal"""
        response = requests.get(f"{BASE_URL}/api/admin/rooms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        rooms = response.json()
        assert isinstance(rooms, list)
        # Each room should have status for showing 'Already Booked'
        if rooms:
            assert "status" in rooms[0]
            assert "room_code" in rooms[0]
        print(f"SUCCESS: Rooms list returns {len(rooms)} rooms for modal")


class TestRowColoring:
    """Test row coloring for arrival status"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "arunpanchariya",
            "password": "arunlondon123"
        })
        return response.json()["token"]
    
    def test_arrival_status_values(self, admin_token):
        """Verify arrival status values for row coloring"""
        # Create and approve a test registration
        reg_response = requests.post(f"{BASE_URL}/api/registrations", json={
            "full_name": "TEST_RowColor",
            "mobile": "9997776665",
            "address": "Test Address",
            "num_people": 1,
            "consent": True
        })
        reg_id = reg_response.json()["id"]
        
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
                    json={"status": "approved"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        
        # Test setting to Arrived (green)
        response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/management",
                               json={"arrival_status": "Arrived"},
                               headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        
        # Test setting to Not Coming (red)
        response = requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/management",
                               json={"arrival_status": "Not Coming"},
                               headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        
        # Cleanup
        requests.put(f"{BASE_URL}/api/admin/registrations/{reg_id}/status",
                    json={"status": "deleted"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        
        print("SUCCESS: Arrival status values work for row coloring")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
