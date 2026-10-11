from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.machine import Machine, MachineStatus
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.models.maintenance_action import MaintenanceAction, MaintenanceStatus
from app.models.device import Device, DeviceStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(
    hours: int = Query(24, ge=1, le=720),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fid = current_user.factory_id
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=hours)

    machines = db.query(Machine).filter(
        Machine.factory_id == fid, Machine.is_active == True).all()
    devices = {d.machine_id: d for d in db.query(Device).filter(
        Device.factory_id == fid).all()}

    status_counts = {}
    machine_summaries = []
    for m in machines:
        s = m.status.value if m.status else "unknown"
        status_counts[s] = status_counts.get(s, 0) + 1
        latest = db.query(SensorReading).filter(
            SensorReading.machine_id == m.id
        ).order_by(SensorReading.observed_at.desc()).first()
        device = devices.get(m.id)
        stale = False
        if device and device.last_reading_at:
            age = (now - device.last_reading_at).total_seconds()
            stale = age > (device.stale_threshold_seconds or 120)
        active_alerts = db.query(Alert).filter(
            Alert.machine_id == m.id,
            Alert.status.notin_([AlertStatus.RESOLVED]),
        ).count()
        machine_summaries.append({
            "id": m.id, "machine_id": m.machine_id, "name": m.name,
            "type": m.machine_type, "zone": m.zone, "status": m.status,
            "blueprint_x": m.blueprint_x, "blueprint_y": m.blueprint_y,
            "active_alerts": active_alerts, "data_stale": stale,
            "latest": {
                "power_kw": latest.power_kw if latest else None,
                "temperature_c": latest.temperature_c if latest else None,
                "vibration_rms": latest.vibration_rms if latest else None,
                "runtime_status": latest.runtime_status if latest else None,
                "observed_at": latest.observed_at.isoformat() if latest else None,
                "source_mode": latest.source_mode if latest else None,
            } if latest else None,
        })

    energy_total = db.query(func.sum(SensorReading.energy_delta_kwh)).filter(
        SensorReading.factory_id == fid,
        SensorReading.observed_at >= since,
        SensorReading.is_valid == True,
    ).scalar()

    active_alerts = db.query(Alert).filter(
        Alert.factory_id == fid,
        Alert.status.notin_([AlertStatus.RESOLVED]),
    ).order_by(Alert.severity.desc(), Alert.last_occurred_at.desc()).limit(10).all()

    alert_counts = {
        "critical": db.query(Alert).filter(Alert.factory_id == fid,
            Alert.status.notin_([AlertStatus.RESOLVED]),
            Alert.severity == AlertSeverity.CRITICAL).count(),
        "warning": db.query(Alert).filter(Alert.factory_id == fid,
            Alert.status.notin_([AlertStatus.RESOLVED]),
            Alert.severity == AlertSeverity.WARNING).count(),
        "info": db.query(Alert).filter(Alert.factory_id == fid,
            Alert.status.notin_([AlertStatus.RESOLVED]),
            Alert.severity == AlertSeverity.INFO).count(),
    }

    pending_maint = db.query(MaintenanceAction).filter(
        MaintenanceAction.factory_id == fid,
        MaintenanceAction.status.in_([MaintenanceStatus.SCHEDULED,
                                       MaintenanceStatus.IN_PROGRESS]),
    ).count()

    latest_reading = db.query(func.max(SensorReading.ingested_at)).filter(
        SensorReading.factory_id == fid).scalar()

    all_devices = db.query(Device).filter(
        Device.factory_id == fid, Device.is_active == True).all()

    # Energy trend (hourly)
    trend = []
    for i in range(min(hours, 48)):
        bs = since + timedelta(hours=i)
        be = bs + timedelta(hours=1)
        v = db.query(func.sum(SensorReading.energy_delta_kwh)).filter(
            SensorReading.factory_id == fid,
            SensorReading.observed_at >= bs,
            SensorReading.observed_at < be,
            SensorReading.is_valid == True,
        ).scalar()
        trend.append({"time": bs.isoformat(), "energy_kwh": round(v, 3) if v else 0})

    return {
        "period_hours": hours,
        "total_machines": len(machines),
        "machine_status_counts": status_counts,
        "machines": machine_summaries,
        "energy_total_kwh": round(energy_total, 3) if energy_total else None,
        "active_alerts": [
            {"id": a.id, "machine_id": a.machine_id, "severity": a.severity,
             "status": a.status, "title": a.title, "message": a.message,
             "last_occurred_at": a.last_occurred_at.isoformat(),
             "source_mode": a.source_mode}
            for a in active_alerts
        ],
        "alert_counts": alert_counts,
        "pending_maintenance": pending_maint,
        "data_freshness": {
            "latest_reading_at": latest_reading.isoformat() if latest_reading else None,
            "has_live_data": latest_reading is not None,
        },
        "device_counts": {
            "total": len(all_devices),
            "online": sum(1 for d in all_devices if d.status == DeviceStatus.ONLINE),
            "stale": sum(1 for d in all_devices if d.status == DeviceStatus.STALE),
            "offline": sum(1 for d in all_devices if d.status == DeviceStatus.OFFLINE),
        },
        "energy_trend": trend,
        "server_time": now.isoformat(),
    }
