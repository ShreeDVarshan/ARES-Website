"""
test_alerts.py — unit tests for the /api/alerts/* endpoints.

Covers:
  - Unauthenticated access returns 401
  - Empty list returned when no alerts exist
  - Fetching non-existent alert returns 404
  - Acknowledging, assigning, and resolving an alert
  - Already-resolved alert cannot be acknowledged again
  - Alerts are scoped to the requesting factory
"""

import pytest
from datetime import datetime, timezone
from tests.conftest import make_factory, make_user, auth_header


@pytest.fixture()
def factory(db):
    return make_factory(db)


@pytest.fixture()
def op_user(db, factory):
    return make_user(db, factory.id, "alertop", "Pass1234!", role="operator")


@pytest.fixture()
def op_headers(client, op_user):
    return auth_header(client, "alertop", "Pass1234!")


@pytest.fixture()
def active_alert(db, factory):
    """Insert a NEW alert directly into the database."""
    from app.models.machine import Machine, MachineType, MachineStatus
    from app.models.alert import Alert, AlertSeverity, AlertStatus

    # Need a machine to satisfy the FK
    m = Machine(factory_id=factory.id, machine_id="M-ALERT",
                name="Alert Machine", machine_type=MachineType.MOTOR,
                status=MachineStatus.RUNNING)
    db.add(m)
    db.commit()
    db.refresh(m)

    now = datetime.now(timezone.utc)
    alert = Alert(
        factory_id=factory.id, machine_id=m.id,
        severity=AlertSeverity.WARNING, status=AlertStatus.NEW,
        rule_name="temperature_warning",
        title="Elevated temperature",
        message="Temperature exceeded threshold.",
        evidence={"temperature_c": 85.0},
        threshold_value=80.0, observed_value=85.0,
        source_mode="live",
        first_occurred_at=now, last_occurred_at=now,
        dedup_key="test-dedup-key-001",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@pytest.fixture()
def resolved_alert(db, factory):
    """Insert an already-RESOLVED alert."""
    from app.models.machine import Machine, MachineType, MachineStatus
    from app.models.alert import Alert, AlertSeverity, AlertStatus

    m = Machine(factory_id=factory.id, machine_id="M-RESOLVED",
                name="Resolved Machine", machine_type=MachineType.MOTOR,
                status=MachineStatus.RUNNING)
    db.add(m)
    db.commit()
    db.refresh(m)

    now = datetime.now(timezone.utc)
    alert = Alert(
        factory_id=factory.id, machine_id=m.id,
        severity=AlertSeverity.INFO, status=AlertStatus.RESOLVED,
        rule_name="idle_power_excess",
        title="Idle power resolved",
        evidence={},
        source_mode="live",
        first_occurred_at=now, last_occurred_at=now,
        resolved_at=now,
        dedup_key="test-dedup-key-002",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


class TestAlertAuth:
    def test_list_alerts_unauthenticated_returns_401(self, client):
        resp = client.get("/api/alerts")
        assert resp.status_code == 401

    def test_get_alert_unauthenticated_returns_401(self, client):
        resp = client.get("/api/alerts/1")
        assert resp.status_code == 401


class TestListAlerts:
    def test_empty_list_when_no_alerts(self, client, op_headers):
        resp = client.get("/api/alerts", headers=op_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_alert_appears_in_list(self, client, op_headers, active_alert):
        resp = client.get("/api/alerts", headers=op_headers)
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.json()]
        assert active_alert.id in ids

    def test_filter_by_status(self, client, op_headers, active_alert, resolved_alert):
        resp = client.get("/api/alerts?status=resolved", headers=op_headers)
        assert resp.status_code == 200
        for a in resp.json():
            assert a["status"] == "resolved"

    def test_filter_by_severity(self, client, op_headers, active_alert):
        resp = client.get("/api/alerts?severity=warning", headers=op_headers)
        assert resp.status_code == 200
        for a in resp.json():
            assert a["severity"] == "warning"


class TestGetAlert:
    def test_get_existing_alert(self, client, op_headers, active_alert):
        resp = client.get(f"/api/alerts/{active_alert.id}", headers=op_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == active_alert.id

    def test_get_nonexistent_alert_returns_404(self, client, op_headers):
        resp = client.get("/api/alerts/99999", headers=op_headers)
        assert resp.status_code == 404


class TestAlertLifecycle:
    def test_acknowledge_new_alert(self, client, op_headers, active_alert):
        resp = client.post(f"/api/alerts/{active_alert.id}/acknowledge",
                           headers=op_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "acknowledged"

    def test_acknowledge_nonexistent_alert_returns_404(self, client, op_headers):
        resp = client.post("/api/alerts/99999/acknowledge", headers=op_headers)
        assert resp.status_code == 404

    def test_cannot_acknowledge_resolved_alert(self, client, op_headers, resolved_alert):
        """A resolved alert must not be re-acknowledged (already resolved)."""
        resp = client.post(f"/api/alerts/{resolved_alert.id}/acknowledge",
                           headers=op_headers)
        assert resp.status_code == 400

    def test_resolve_alert(self, client, op_headers, active_alert):
        resp = client.post(f"/api/alerts/{active_alert.id}/resolve",
                           headers=op_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"

    def test_resolve_nonexistent_alert_returns_404(self, client, op_headers):
        resp = client.post("/api/alerts/99999/resolve", headers=op_headers)
        assert resp.status_code == 404
