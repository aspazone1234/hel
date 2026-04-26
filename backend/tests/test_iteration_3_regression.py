"""Iteration 3 backend regression tests — tree CRUD + smoke endpoints."""
import os
import copy
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env", "r") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

SUPER = {"username": "superashwini", "password": "supersebhiupper123"}


@pytest.fixture(scope="module")
def super_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# Smoke
def test_login_super():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert j["role"] == "superadmin"
    assert isinstance(j["token"], str) and len(j["token"]) > 0


def test_public_reference_persons():
    r = requests.get(f"{BASE_URL}/api/reference-persons/public", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 50


def test_registrations_count():
    r = requests.get(f"{BASE_URL}/api/registrations/count", timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "total" in j or "count" in j


def test_admin_dashboard_stats(super_headers):
    r = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=super_headers, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert isinstance(j, dict) and len(j) > 0


# Reference tree
def test_admin_reference_tree_get(super_headers):
    r = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "root_id" in j and "nodes" in j and isinstance(j["nodes"], list)
    assert len(j["nodes"]) >= 50


def test_admin_reference_tree_put_noop(super_headers):
    r = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    tree = r.json()
    payload = copy.deepcopy(tree)
    r2 = requests.put(f"{BASE_URL}/api/admin/reference-tree", json=payload,
                      headers=super_headers, timeout=30)
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body.get("node_count") == len(tree["nodes"])
    # GET must return same shape
    r3 = requests.get(f"{BASE_URL}/api/admin/reference-tree", headers=super_headers, timeout=30)
    assert r3.status_code == 200
    assert len(r3.json()["nodes"]) == len(tree["nodes"])


def test_public_reference_tree():
    r = requests.get(f"{BASE_URL}/api/reference-tree/public", timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "root_id" in j and "nodes" in j
