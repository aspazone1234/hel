"""Tests for iteration 2: family reference-tree admin endpoints + regression smoke."""
import os
import copy
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback for local pytest run
    with open("/app/frontend/.env", "r") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

SUPER = {"username": "superashwini", "password": "supersebhiupper123"}
NORMAL = {"username": "test", "password": "test"}


@pytest.fixture(scope="module")
def super_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def normal_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=NORMAL, timeout=30)
    if r.status_code != 200:
        pytest.skip("Normal admin login unavailable")
    return r.json().get("token")


@pytest.fixture(scope="module")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}"}


# ------- Smoke / regression -------

def test_super_login_works():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "token" in j and j.get("role") == "superadmin"


def test_public_reference_persons():
    r = requests.get(f"{BASE_URL}/api/reference-persons/public", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 50


def test_registrations_count():
    r = requests.get(f"{BASE_URL}/api/registrations/count", timeout=30)
    assert r.status_code == 200
    assert "total" in r.json() or "count" in r.json()


# ------- GET admin reference tree -------

def test_get_admin_reference_tree(super_headers):
    r = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "root_id" in data
    assert "nodes" in data
    assert isinstance(data["nodes"], list)
    assert len(data["nodes"]) >= 50
    # root must exist
    root_ids = [n for n in data["nodes"] if n.get("id") == data["root_id"]]
    assert len(root_ids) == 1


def test_get_admin_reference_tree_requires_auth():
    r = requests.get(f"{BASE_URL}/api/admin/reference-tree", timeout=30)
    assert r.status_code in (401, 403)


# ------- PUT validation -------

@pytest.fixture(scope="module")
def current_tree(super_headers):
    r = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    return r.json()


def test_put_rejects_non_superadmin(normal_token, current_tree):
    h = {"Authorization": f"Bearer {normal_token}"}
    r = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=current_tree, headers=h, timeout=30)
    assert r.status_code == 403


def test_put_rejects_duplicate_ids(super_headers, current_tree):
    bad = copy.deepcopy(current_tree)
    bad["nodes"].append(copy.deepcopy(bad["nodes"][1]))  # duplicate id
    r = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=bad, headers=super_headers, timeout=30)
    assert r.status_code == 400
    assert "duplicate" in r.text.lower()


def test_put_rejects_missing_parent(super_headers, current_tree):
    bad = copy.deepcopy(current_tree)
    bad["nodes"].append({"id": "ft-orphan", "name": "Orphan", "name_hi": "", "parent_id": "ft-does-not-exist"})
    r = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=bad, headers=super_headers, timeout=30)
    assert r.status_code == 400
    assert "unknown parent" in r.text.lower() or "parent" in r.text.lower()


def test_put_rejects_multiple_roots(super_headers, current_tree):
    bad = copy.deepcopy(current_tree)
    bad["nodes"].append({"id": "ft-second-root", "name": "Other Root", "name_hi": "", "parent_id": None})
    r = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=bad, headers=super_headers, timeout=30)
    assert r.status_code == 400


def test_put_rejects_empty_name(super_headers, current_tree):
    bad = copy.deepcopy(current_tree)
    bad["nodes"].append({"id": "ft-empty-name", "name": "   ", "name_hi": "", "parent_id": bad["root_id"]})
    r = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=bad, headers=super_headers, timeout=30)
    assert r.status_code == 400
    assert "empty name" in r.text.lower() or "name" in r.text.lower()


def test_put_rejects_cycle(super_headers, current_tree):
    bad = copy.deepcopy(current_tree)
    # Find a node and set its parent to one of its descendants → cycle
    # Simple: pick any non-root node A and another node B not in A's ancestry. Easiest: swap root parent to a child.
    # Make root's parent_id point at a child
    children_of_root = [n for n in bad["nodes"] if n.get("parent_id") == bad["root_id"]]
    assert children_of_root
    target_id = children_of_root[0]["id"]
    for n in bad["nodes"]:
        if n["id"] == bad["root_id"]:
            n["parent_id"] = target_id
            break
    r = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=bad, headers=super_headers, timeout=30)
    assert r.status_code == 400


# ------- PUT happy path: add a TEST_ child, save, verify, remove, restore -------

def test_put_add_child_persists_and_public_reflects(super_headers, current_tree):
    payload = copy.deepcopy(current_tree)
    new_id = "ft-test-iter2-temp"
    payload["nodes"].append({
        "id": new_id,
        "name": "TEST_iter2_temp",
        "name_hi": "टेस्ट",
        "parent_id": payload["root_id"],
    })
    r = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=payload, headers=super_headers, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "message" in body
    assert body.get("node_count") == len(payload["nodes"])
    assert "removed" in body

    # GET back
    r2 = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    assert r2.status_code == 200
    ids = [n["id"] for n in r2.json()["nodes"]]
    assert new_id in ids

    # Public endpoint reflects
    r3 = requests.get(f"{BASE_URL}/api/reference-tree/public", timeout=30)
    assert r3.status_code == 200
    public_ids = [n["id"] for n in r3.json()["nodes"]]
    assert new_id in public_ids

    # Cleanup: restore original
    r4 = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=current_tree, headers=super_headers, timeout=30)
    assert r4.status_code == 200, r4.text
    cleanup_body = r4.json()
    assert cleanup_body.get("removed", 0) >= 1

    # Verify removed
    r5 = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    ids2 = [n["id"] for n in r5.json()["nodes"]]
    assert new_id not in ids2


# ------- Per-person PUT (relation_categories editor) -------

def test_admin_reference_person_update_relation_categories(super_headers):
    # Pick a leaf node
    r = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    nodes = r.json()["nodes"]
    target = nodes[-1]
    pid = target["id"]
    # Get original via /api/admin/reference-persons
    rr = requests.get(f"{BASE_URL}/api/admin/reference-persons", headers=super_headers, timeout=30)
    assert rr.status_code == 200
    persons = rr.json()
    cur_person = next((p for p in persons if p["id"] == pid), None)
    assert cur_person is not None
    orig_cats = cur_person.get("relation_categories", []) or []

    new_cats = list(orig_cats) + ["TEST_iter2_cat"]
    upd = requests.put(
        f"{BASE_URL}/api/admin/reference-persons/{pid}",
        json={
            "name": cur_person["name"],
            "name_hi": cur_person.get("name_hi", ""),
            "rank": cur_person.get("rank", 0),
            "description": cur_person.get("description", ""),
            "relation_categories": new_cats,
        },
        headers=super_headers,
        timeout=30,
    )
    assert upd.status_code == 200, upd.text

    # Verify
    rr2 = requests.get(f"{BASE_URL}/api/admin/reference-persons", headers=super_headers, timeout=30)
    persons2 = rr2.json()
    after = next((p for p in persons2 if p["id"] == pid), None)
    assert "TEST_iter2_cat" in (after.get("relation_categories") or [])

    # Cleanup
    requests.put(
        f"{BASE_URL}/api/admin/reference-persons/{pid}",
        json={
            "name": cur_person["name"],
            "name_hi": cur_person.get("name_hi", ""),
            "rank": cur_person.get("rank", 0),
            "description": cur_person.get("description", ""),
            "relation_categories": orig_cats,
        },
        headers=super_headers,
        timeout=30,
    )
