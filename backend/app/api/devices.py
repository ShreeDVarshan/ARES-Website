from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.security import generate_device_credential, hash_device_credential
from app.models.user import User
from app.models.device import Device, DeviceStatus

router = APIRouter(prefix="/devices", tags=["devices"])


class DeviceCreate(BaseModel):
    device_id: str
    name: Optional[str] = None
    machine_id: Optional[int] = None
    sampling_interval_seconds: int = 30
    sensor_config: dict = {}
    stale_threshold_seconds: int = 120


class DeviceOut(BaseModel):
    id: int
    device_id: str
    name: Optional[str]
    machine_id: Optional[int]
    firmware_version: Optional[str]
    status: str
    last_heartbeat_at: Optional[datetime]
    last_reading_at: Optional[datetime]
    signal_strength_dbm: Optional[float]
    sampling_interval_seconds: int
    sensor_config: dict
    stale_threshold_seconds: int
    credential_revoked: bool
    is_active: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[DeviceOut])
def list_devices(current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    return db.query(Device).filter(Device.factory_id == current_user.factory_id,
                                    Device.is_active == True).all()


@router.post("")
def create_device(data: DeviceCreate,
                  current_user: User = Depends(require_admin),
                  db: Session = Depends(get_db)):
    if db.query(Device).filter(Device.device_id == data.device_id).first():
        raise HTTPException(status_code=400, detail="Device ID already exists")
    credential = generate_device_credential()
    device = Device(
        factory_id=current_user.factory_id,
        hashed_credential=hash_device_credential(credential),
        **data.model_dump(),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return {
        "device": DeviceOut.model_validate(device),
        "credential": credential,
        "warning": "Store this credential securely — it will not be shown again",
    }


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(device_id: int, current_user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id,
                                      Device.factory_id == current_user.factory_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.post("/{device_id}/rotate-credential")
def rotate_credential(device_id: int, current_user: User = Depends(require_admin),
                      db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id,
                                      Device.factory_id == current_user.factory_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    credential = generate_device_credential()
    device.hashed_credential = hash_device_credential(credential)
    device.credential_revoked = False
    db.commit()
    return {"credential": credential,
            "warning": "Store this credential securely — it will not be shown again"}


@router.post("/{device_id}/revoke")
def revoke_device(device_id: int, current_user: User = Depends(require_admin),
                  db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id,
                                      Device.factory_id == current_user.factory_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.credential_revoked = True
    device.status = DeviceStatus.OFFLINE
    db.commit()
    return {"status": "revoked"}
