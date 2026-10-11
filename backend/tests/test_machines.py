"""
test_machines.py — unit tests for the /api/machines/* endpoints.

Covers:
  - Listing machines (authenticated vs unauthenticated)
  - Machine listing is scoped to the authenticated factory
  - Creating a machine (admin only)
  - Creating a machine as non-admin returns 403
  - Missing required fields returns 422
  - Fetching a single machine (found / not found)
  - Fetching a machine that belongs to another factory returns 404
  - Updating machine fields as admin
  - Updating as operator returns 403
  - Machine readings endpoint (empty list when no readings exist)
  - Machine summary endpoint structure
"""

import pytest
from tests.conftest import make_factory, make_user, auth_header


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def factory(db):
    from tests.conftest import make_factory
    return make_factory(db, "Factory Alpha")


@pytest.fixture()
def other_factory(db):
    return make_factory(db, "Factory Beta")


@pytest.fixture()
def admin_user(db, factory):
    return make_user(db, factory.id, "admin1", "AdminPass1!", role="admin")


@pytest.fixture()
def operator_user(db, factory):
    return make_user(db, factory.id, "op1", "OperPass1!", role="operator")


@pytest.fixture()
def admin_headers(client, admin_user):
    return auth_header(client, "admin1", "AdminPass1!")


@pytest.fixture()
def op_headers(client, operator_user):
    return auth_header(client, "op1", "OperPass1!")


@pytest.fixture()
def machine(client, admin_headers):
    """Create a machine via the API and return the response JSON."""
    resp = client.post("/api/machines", json={
        "machine_id": "M-TEST-01",
        "name": "Test Motor",
        "machine_type": "motor",
        "zone": "Zone A",
        "rated_power_kw": 5.5,
        "installed_sensors": ["power", "temperature"],
    }, headers=admin_headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Authentication guard
# ---------------------------------------------------------------------------

class TestMachineAuth:
    def test_list_machines_unauthenticated_returns_401(self, client):
        resp = client.get("/api/machines")
        assert resp.status_code == 401

    def test_get_machine_unauthenticated_returns_401(self, client):
        resp = client.get("/api/machines/1")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Listing
# ---------------------------------------------------------------------------

class TestListMachines:
    def test_list_machines_empty_initially(self, client, op_headers):
        """Factory starts with no machines; list should be empty."""
        resp = client.get("/api/machines", headers=op_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_machines_returns_created_machine(self, client, admin_headers, machine):
        resp = client.get("/api/machines", headers=admin_headers)
        assert resp.status_code == 200
        ids = [m["machine_id"] for m in resp.json()]
        assert "M-TEST-01" in ids

    def test_list_machines_cross_factory_isolation(self, client, db, other_factory, admin_headers):
        """Machines from a different factory must NOT be visible."""
        # Create a machine directly in the other factory
        from app.models.machine import Machine, MachineType, MachineStatus
        other_m = Machine(
            factory_id=other_factory.id, machine_id="M-OTHER",
            name="Other Machine", machine_type=MachineType.MOTOR,
            status=MachineStatus.UNKNOWN,
        )
        db.add(other_m)
        db.commit()

        resp = client.get("/api/machines", headers=admin_headers)
        assert resp.status_code == 200
        ids = [m["machine_id"] for m in resp.json()]
        assert "M-OTHER" not in ids


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class TestCreateMachine:
    def test_admin_can_create_machine(self, client, admin_headers):
        resp = client.post("/api/machines", json={
            "machine_id": "M-NEW-01",
            "name": "New Machine",
        }, headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["machine_id"] == "M-NEW-01"
        assert body["name"] == "New Machine"

    def test_operator_cannot_create_machine(self, client, op_headers):
        """Only admins may create machines — operators must get 403."""
        resp = client.post("/api/machines", json={
            "machine_id": "M-OP-01",
            "name": "Op Machine",
        }, headers=op_headers)
        assert resp.status_code == 403

    def test_create_machine_missing_name_returns_422(self, client, admin_headers):
        """machine_id and name are required; omitting name must give 422."""
        resp = client.post("/api/machines", json={
            "machine_id": "M-NNAME",
            # name is missing
        }, headers=admin_headers)
        assert resp.status_code == 422

    def test_create_machine_missing_machine_id_returns_422(self, client, admin_headers):
        resp = client.post("/api/machines", json={
            "name": "No ID Machine",
            # machine_id is missing
        }, headers=admin_headers)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Get single machine
# ---------------------------------------------------------------------------

class TestGetMachine:
    def test_get_existing_machine(self, client, admin_headers, machine):
        machine_db_id = machine["id"]
        resp = client.get(f"/api/machines/{machine_db_id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["machine_id"] == "M-TEST-01"

    def test_get_nonexistent_machine_returns_404(self, client, admin_headers):
        resp = client.get("/api/machines/99999", headers=admin_headers)
        assert resp.status_code == 404

    def test_get_machine_from_other_factory_returns_404(self, client, db, other_factory, admin_headers):
        """A machine in another factory must not be found by the requesting user."""
        from app.models.machine import Machine, MachineType, MachineStatus
        m = Machine(
            factory_id=other_factory.id, machine_id="M-ALIEN",
            name="Alien", machine_type=MachineType.PUMP,
            status=MachineStatus.UNKNOWN,
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        resp = client.get(f"/api/machines/{m.id}", headers=admin_headers)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

class TestUpdateMachine:
    def test_admin_can_update_machine_name(self, client, admin_headers, machine):
        mid = machine["id"]
        resp = client.patch(f"/api/machines/{mid}",
                            json={"name": "Updated Motor"},
                            headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Motor"

    def test_operator_cannot_update_machine(self, client, op_headers, machine):
        mid = machine["id"]
        resp = client.patch(f"/api/machines/{mid}",
                            json={"name": "Should Fail"},
                            headers=op_headers)
        assert resp.status_code == 403

    def test_update_nonexistent_machine_returns_404(self, client, admin_headers):
        resp = client.patch("/api/machines/99999",
                            json={"name": "Ghost"},
                            headers=admin_headers)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Readings and summary
# ---------------------------------------------------------------------------

class TestMachineReadings:
    def test_readings_empty_when_no_data(self, client, admin_headers, machine):
        mid = machine["id"]
        resp = client.get(f"/api/machines/{mid}/readings", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_readings_hours_validation(self, client, admin_headers, machine):
        """hours query param must be 1–720; out-of-range should return 422."""
        mid = machine["id"]
        resp = client.get(f"/api/machines/{mid}/readings?hours=0", headers=admin_headers)
        assert resp.status_code == 422

    def test_summary_endpoint_structure(self, client, admin_headers, machine):
        """Summary must include expected keys even when no readings exist."""
        mid = machine["id"]
        resp = client.get(f"/api/machines/{mid}/summary", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        for key in ("machine_id", "name", "status", "active_alerts", "data_stale"):
            assert key in body, f"Missing key: {key}"
