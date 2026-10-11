"""Detect -> Diagnose -> Act -> Verify detection engine."""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.sensor_reading import SensorReading
from app.models.machine import Machine
from app.models.alert import Alert, AlertSeverity, AlertStatus
import hashlib

THRESHOLDS = {
    "temperature_warning_c": 80.0,
    "temperature_critical_c": 95.0,
    "vibration_warning_mm_s": 7.0,
    "vibration_critical_mm_s": 11.0,
    "idle_power_warning_kw": 1.5,
}


def _dedup_key(machine_id: int, rule: str) -> str:
    return hashlib.md5(f"{machine_id}:{rule}".encode()).hexdigest()


def _upsert_alert(db, factory_id, machine_id, rule_name, title, message,
                  severity, evidence, observed_value, threshold_value,
                  recommended_action, source_mode):
    dedup = _dedup_key(machine_id, rule_name)
    existing = db.query(Alert).filter(
        Alert.dedup_key == dedup,
        Alert.status.notin_([AlertStatus.RESOLVED]),
    ).first()
    now = datetime.now(timezone.utc)
    if existing:
        existing.last_occurred_at = now
        existing.occurrence_count += 1
        existing.observed_value = observed_value
        existing.evidence = evidence
        db.commit()
        return existing
    alert = Alert(
        factory_id=factory_id, machine_id=machine_id,
        severity=severity, status=AlertStatus.NEW,
        rule_name=rule_name, title=title, message=message,
        evidence=evidence, threshold_value=threshold_value,
        observed_value=observed_value, source_mode=source_mode,
        first_occurred_at=now, last_occurred_at=now,
        dedup_key=dedup, recommended_action=recommended_action,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def _auto_resolve(db, machine_id, rule_name):
    dedup = _dedup_key(machine_id, rule_name)
    a = db.query(Alert).filter(
        Alert.dedup_key == dedup,
        Alert.status.notin_([AlertStatus.RESOLVED]),
    ).first()
    if a:
        a.status = AlertStatus.RESOLVED
        a.resolved_at = datetime.now(timezone.utc)
        db.commit()


def run_detection(db: Session, factory_id: int, machine: Machine,
                  reading: SensorReading):
    sm = reading.source_mode

    if reading.temperature_c is not None:
        t = reading.temperature_c
        if t > THRESHOLDS["temperature_critical_c"]:
            _upsert_alert(db, factory_id, machine.id, "temperature_critical",
                f"{machine.name}: Critical temperature",
                f"{machine.name} temperature is {t:.1f}°C, above the critical threshold "
                f"of {THRESHOLDS['temperature_critical_c']}°C. Immediate inspection required.",
                AlertSeverity.CRITICAL,
                {"temperature_c": t, "threshold_c": THRESHOLDS["temperature_critical_c"]},
                t, THRESHOLDS["temperature_critical_c"],
                "Stop machine if safe. Inspect cooling system and lubrication immediately.", sm)
        elif t > THRESHOLDS["temperature_warning_c"]:
            _upsert_alert(db, factory_id, machine.id, "temperature_warning",
                f"{machine.name}: Elevated temperature",
                f"{machine.name} temperature has reached {t:.1f}°C, above the warning "
                f"threshold of {THRESHOLDS['temperature_warning_c']}°C.",
                AlertSeverity.WARNING,
                {"temperature_c": t, "threshold_c": THRESHOLDS["temperature_warning_c"]},
                t, THRESHOLDS["temperature_warning_c"],
                "Inspect cooling. Compare vibration before taking action.", sm)
        else:
            _auto_resolve(db, machine.id, "temperature_warning")
            _auto_resolve(db, machine.id, "temperature_critical")

    if reading.vibration_rms is not None:
        v = reading.vibration_rms
        if v > THRESHOLDS["vibration_critical_mm_s"]:
            _upsert_alert(db, factory_id, machine.id, "vibration_critical",
                f"{machine.name}: Critical vibration",
                f"{machine.name} vibration is {v:.2f} mm/s. Possible bearing or "
                "rotating component failure.",
                AlertSeverity.CRITICAL,
                {"vibration_rms": v, "unit": reading.vibration_unit,
                 "threshold": THRESHOLDS["vibration_critical_mm_s"]},
                v, THRESHOLDS["vibration_critical_mm_s"],
                "Schedule urgent inspection. Check bearing condition and alignment.", sm)
        elif v > THRESHOLDS["vibration_warning_mm_s"]:
            _upsert_alert(db, factory_id, machine.id, "vibration_warning",
                f"{machine.name}: Elevated vibration",
                f"{machine.name} vibration is {v:.2f} mm/s, above the warning threshold.",
                AlertSeverity.WARNING,
                {"vibration_rms": v, "unit": reading.vibration_unit},
                v, THRESHOLDS["vibration_warning_mm_s"],
                "Monitor vibration trend. Schedule inspection if sustained.", sm)
        else:
            _auto_resolve(db, machine.id, "vibration_warning")
            _auto_resolve(db, machine.id, "vibration_critical")

    if reading.runtime_status == "IDLE" and reading.power_kw is not None:
        p = reading.power_kw
        if p > THRESHOLDS["idle_power_warning_kw"]:
            _upsert_alert(db, factory_id, machine.id, "idle_power_excess",
                f"{machine.name}: Excess idle power",
                f"{machine.name} is drawing {p:.2f} kW while idle. Auxiliary system "
                "may not be shutting down correctly.",
                AlertSeverity.WARNING,
                {"power_kw": p, "runtime_status": "IDLE",
                 "threshold_kw": THRESHOLDS["idle_power_warning_kw"]},
                p, THRESHOLDS["idle_power_warning_kw"],
                "Inspect auxiliary systems. Check compressed air or cooling during idle.", sm)
        else:
            _auto_resolve(db, machine.id, "idle_power_excess")

    # Combined diagnosis
    if (reading.temperature_c and reading.vibration_rms and
            reading.temperature_c > THRESHOLDS["temperature_warning_c"] and
            reading.vibration_rms > THRESHOLDS["vibration_warning_mm_s"]):
        _upsert_alert(db, factory_id, machine.id, "combined_condition",
            f"{machine.name}: Combined temperature and vibration anomaly",
            f"{machine.name} shows both elevated temperature "
            f"({reading.temperature_c:.1f}°C) and vibration "
            f"({reading.vibration_rms:.2f} mm/s). Possible friction, lubrication "
            "or rotating-component issue.",
            AlertSeverity.CRITICAL,
            {"temperature_c": reading.temperature_c,
             "vibration_rms": reading.vibration_rms,
             "diagnosis": "Combined: possible friction, lubrication, or bearing issue"},
            None, None,
            "Inspect lubrication, bearing condition and cooling. "
            "Cross-reference with energy consumption trend.", sm)
