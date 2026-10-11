from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.machine import Machine, MachineType, MachineStatus
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert, AlertStatus
from app.models.device import Device, DeviceStatus

router = APIRouter(prefix="/machines", tags=["machines"])


class MachineCreate(BaseModel):
    machine_id: str
    name: str
    machine_type: MachineType = MachineType.OTHER
    zone: Optional[str] = None
    rated_power_kw: Optional[float] = None
    product_type: Optional[str] = None
    unit_type: Optional[str] = None
    installed_sensors: List[str] = []


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    machine_type: Optional[MachineType] = None
    zone: Optional[str] = None
    rated_power_kw: Optional[float] = None
    product_type: Optional[str] = None
    unit_type: Optional[str] = None
    installed_sensors: Optional[List[str]] = None
    blueprint_x: Optional[float] = None
    blueprint_y: Optional[float] = None
    has_plc: Optional[bool] = None
    auto_control_permitted: Optional[bool] = None


class MachineOut(BaseModel):
    id: int
    machine_id: str
    name: str
    machine_type: str
    zone: Optional[str]
    rated_power_kw: Optional[float]
    product_type: Optional[str]
    unit_type: Optional[str]
    installed_sensors: List[str]
    status: str
    last_reading_at: Optional[datetime]
    blueprint_x: Optional[float]
    blueprint_y: Optional[float]
    has_plc: bool
    auto_control_permitted: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[MachineOut])
def list_machines(current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    return db.query(Machine).filter(
        Machine.factory_id == current_user.factory_id,
        Machine.is_active == True).all()


@router.post("", response_model=MachineOut)
def create_machine(data: MachineCreate,
                   current_user: User = Depends(require_admin),
                   db: Session = Depends(get_db)):
    m = Machine(factory_id=current_user.factory_id, **data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.get("/{machine_id}", response_model=MachineOut)
def get_machine(machine_id: int,
                current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    m = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.factory_id == current_user.factory_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    return m


@router.patch("/{machine_id}", response_model=MachineOut)
def update_machine(machine_id: int, data: MachineUpdate,
                   current_user: User = Depends(require_admin),
                   db: Session = Depends(get_db)):
    m = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.factory_id == current_user.factory_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.get("/{machine_id}/readings")
def get_machine_readings(
    machine_id: int,
    hours: int = Query(24, ge=1, le=720),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.factory_id == current_user.factory_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    readings = db.query(SensorReading).filter(
        SensorReading.machine_id == machine_id,
        SensorReading.observed_at >= since,
    ).order_by(SensorReading.observed_at.desc()).limit(500).all()
    return [
        {"id": r.id, "observed_at": r.observed_at.isoformat(),
         "power_kw": r.power_kw, "energy_total_kwh": r.energy_total_kwh,
         "energy_delta_kwh": r.energy_delta_kwh,
         "temperature_c": r.temperature_c,
         "vibration_rms": r.vibration_rms, "vibration_unit": r.vibration_unit,
         "runtime_status": r.runtime_status, "quality_flags": r.quality_flags,
         "source_mode": r.source_mode, "is_valid": r.is_valid}
        for r in readings
    ]


@router.get("/{machine_id}/summary")
def get_machine_summary(machine_id: int,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    m = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.factory_id == current_user.factory_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    latest = db.query(SensorReading).filter(
        SensorReading.machine_id == machine_id
    ).order_by(SensorReading.observed_at.desc()).first()
    active_alerts = db.query(Alert).filter(
        Alert.machine_id == machine_id,
        Alert.status.notin_([AlertStatus.RESOLVED]),
    ).count()
    device = db.query(Device).filter(Device.machine_id == machine_id).first()
    now = datetime.now(timezone.utc)
    stale = False
    if device and device.last_reading_at:
        stale = (now - device.last_reading_at).total_seconds() > (device.stale_threshold_seconds or 120)
    return {
        "machine_id": m.machine_id, "name": m.name, "status": m.status,
        "last_reading": {
            "power_kw": latest.power_kw if latest else None,
            "temperature_c": latest.temperature_c if latest else None,
            "vibration_rms": latest.vibration_rms if latest else None,
            "observed_at": latest.observed_at.isoformat() if latest else None,
            "source_mode": latest.source_mode if latest else None,
        },
        "active_alerts": active_alerts,
        "device_status": device.status if device else "no_device",
        "data_stale": stale,
    }
