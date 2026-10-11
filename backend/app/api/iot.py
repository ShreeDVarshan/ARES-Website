from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.db.database import get_db
from app.core.security import verify_device_credential
from app.models.device import Device, DeviceStatus
from app.models.sensor_reading import SensorReading, SourceMode
from app.models.machine import Machine, MachineStatus
from app.core.websocket_manager import ws_manager
from app.services.detection import run_detection

router = APIRouter(prefix="/iot", tags=["iot"])


class ReadingPayload(BaseModel):
    device_id: str
    message_id: str
    timestamp: datetime
    power_kw: Optional[float] = None
    energy_total_kwh: Optional[float] = None
    temperature_c: Optional[float] = None
    vibration_rms: Optional[float] = None
    vibration_unit: str = "mm/s"
    runtime_status: Optional[str] = None
    runtime_total_seconds: Optional[int] = None
    quality_flags: List[str] = Field(default_factory=list)


class BatchReadingPayload(BaseModel):
    readings: List[ReadingPayload]


class HeartbeatPayload(BaseModel):
    device_id: str
    timestamp: datetime
    firmware_version: Optional[str] = None
    signal_strength_dbm: Optional[float] = None


def authenticate_device(
    x_device_id: str = Header(...),
    x_device_credential: str = Header(...),
    db: Session = Depends(get_db),
) -> Device:
    device = db.query(Device).filter(
        Device.device_id == x_device_id,
        Device.is_active == True,
        Device.credential_revoked == False,
    ).first()
    if not device or not verify_device_credential(x_device_credential, device.hashed_credential):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid device credentials")
    return device


def _store_reading(payload: ReadingPayload, device: Device, db: Session) -> SensorReading:
    if payload.timestamp.tzinfo is None:
        raise HTTPException(status_code=422,
                            detail=f"Timestamp must include timezone offset")
    now = datetime.now(timezone.utc)
    flags = list(payload.quality_flags)
    age_s = (now - payload.timestamp).total_seconds()
    if age_s > 3600:
        flags.append("STALE_OBSERVATION")
    if age_s < -60:
        flags.append("FUTURE_TIMESTAMP")

    # Deduplicate
    if payload.message_id:
        existing = db.query(SensorReading).filter(
            SensorReading.device_id == device.id,
            SensorReading.message_id == payload.message_id,
        ).first()
        if existing:
            return existing

    # Energy delta
    energy_delta = None
    energy_method = None
    if payload.energy_total_kwh is not None:
        last = db.query(SensorReading).filter(
            SensorReading.device_id == device.id,
            SensorReading.energy_total_kwh != None,
        ).order_by(SensorReading.observed_at.desc()).first()
        if last and last.energy_total_kwh is not None:
            delta = payload.energy_total_kwh - last.energy_total_kwh
            if delta < 0:
                flags.append("METER_RESET_DETECTED")
                energy_method = "meter_reset"
            else:
                energy_delta = delta
                energy_method = "meter_delta"

    reading = SensorReading(
        factory_id=device.factory_id,
        machine_id=device.machine_id,
        device_id=device.id,
        message_id=payload.message_id,
        source_mode=SourceMode.LIVE,
        source_identifier=device.device_id,
        observed_at=payload.timestamp,
        ingested_at=now,
        power_kw=payload.power_kw,
        energy_total_kwh=payload.energy_total_kwh,
        energy_delta_kwh=energy_delta,
        energy_calculation_method=energy_method,
        temperature_c=payload.temperature_c,
        vibration_rms=payload.vibration_rms,
        vibration_unit=payload.vibration_unit,
        runtime_status=payload.runtime_status,
        runtime_total_seconds=payload.runtime_total_seconds,
        quality_flags=flags,
        is_valid=not any(f in flags for f in ["FUTURE_TIMESTAMP"]),
        meter_reset_detected="METER_RESET_DETECTED" in flags,
    )
    db.add(reading)
    device.last_reading_at = now
    device.status = DeviceStatus.ONLINE
    if device.machine_id and payload.runtime_status:
        machine = db.query(Machine).filter(Machine.id == device.machine_id).first()
        if machine:
            s_map = {"RUNNING": MachineStatus.RUNNING,
                     "IDLE": MachineStatus.IDLE,
                     "STOPPED": MachineStatus.STOPPED}
            machine.status = s_map.get(payload.runtime_status, MachineStatus.UNKNOWN)
            machine.last_reading_at = now
    db.commit()
    db.refresh(reading)
    return reading


@router.post("/readings", status_code=201)
async def ingest_reading(
    payload: ReadingPayload,
    device: Device = Depends(authenticate_device),
    db: Session = Depends(get_db),
):
    if payload.device_id != device.device_id:
        raise HTTPException(status_code=422, detail="Payload device_id mismatch")
    reading = _store_reading(payload, device, db)
    machine = db.query(Machine).filter(Machine.id == device.machine_id).first()
    if machine:
        run_detection(db, device.factory_id, machine, reading)
    await ws_manager.broadcast_to_factory(device.factory_id, {
        "type": "sensor_reading",
        "data": {
            "machine_id": device.machine_id,
            "device_id": device.device_id,
            "power_kw": payload.power_kw,
            "temperature_c": payload.temperature_c,
            "vibration_rms": payload.vibration_rms,
            "runtime_status": payload.runtime_status,
            "observed_at": payload.timestamp.isoformat(),
        }
    })
    return {"status": "accepted", "reading_id": reading.id}


@router.post("/readings/batch", status_code=201)
async def ingest_batch(
    payload: BatchReadingPayload,
    device: Device = Depends(authenticate_device),
    db: Session = Depends(get_db),
):
    results = []
    for r in payload.readings:
        if r.device_id != device.device_id:
            results.append({"message_id": r.message_id, "status": "rejected",
                            "reason": "device_id mismatch"})
            continue
        reading = _store_reading(r, device, db)
        results.append({"message_id": r.message_id, "status": "accepted",
                        "reading_id": reading.id})
    return {"results": results}


@router.post("/heartbeat")
async def heartbeat(
    payload: HeartbeatPayload,
    device: Device = Depends(authenticate_device),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    device.last_heartbeat_at = now
    device.status = DeviceStatus.ONLINE
    if payload.firmware_version:
        device.firmware_version = payload.firmware_version
    if payload.signal_strength_dbm is not None:
        device.signal_strength_dbm = payload.signal_strength_dbm
    db.commit()
    return {"status": "ok", "server_time": now.isoformat()}


@router.get("/config/{device_id}")
def get_device_config(
    device_id: str,
    device: Device = Depends(authenticate_device),
    db: Session = Depends(get_db),
):
    if device.device_id != device_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "device_id": device.device_id,
        "sampling_interval_seconds": device.sampling_interval_seconds,
        "sensor_config": device.sensor_config,
        "stale_threshold_seconds": device.stale_threshold_seconds,
    }
