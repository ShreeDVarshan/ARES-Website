import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class DeviceStatus(str, enum.Enum):
    ONLINE = "online"
    STALE = "stale"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True, index=True)
    device_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255))
    firmware_version = Column(String(32), nullable=True)
    hashed_credential = Column(String(255), nullable=False)
    credential_revoked = Column(Boolean, default=False)
    status = Column(Enum(DeviceStatus), default=DeviceStatus.UNKNOWN)
    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True)
    last_reading_at = Column(DateTime(timezone=True), nullable=True)
    signal_strength_dbm = Column(Float, nullable=True)
    sampling_interval_seconds = Column(Integer, default=30)
    sensor_config = Column(JSON, default=dict)
    stale_threshold_seconds = Column(Integer, default=120)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    factory = relationship("Factory", back_populates="devices")
    machine = relationship("Machine", back_populates="device")
    sensor_readings = relationship("SensorReading", back_populates="device")
