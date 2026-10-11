import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, Float, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class SourceMode(str, enum.Enum):
    LIVE = "live"
    IMPORTED = "imported"
    REPLAY = "replay"
    SIMULATION = "simulation"


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        UniqueConstraint("device_id", "message_id", name="uq_device_message"),
    )

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True, index=True)
    message_id = Column(String(128), nullable=True)
    source_mode = Column(Enum(SourceMode), nullable=False, default=SourceMode.LIVE)
    source_identifier = Column(String(128), nullable=True)
    observed_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ingested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    power_kw = Column(Float, nullable=True)
    energy_total_kwh = Column(Float, nullable=True)
    energy_delta_kwh = Column(Float, nullable=True)
    energy_calculation_method = Column(String(64), nullable=True)
    temperature_c = Column(Float, nullable=True)
    vibration_rms = Column(Float, nullable=True)
    vibration_unit = Column(String(16), default="mm/s")
    runtime_status = Column(String(32), nullable=True)
    runtime_total_seconds = Column(Integer, nullable=True)
    quality_flags = Column(JSON, default=list)
    is_valid = Column(Boolean, default=True)
    validation_notes = Column(String(512), nullable=True)
    meter_reset_detected = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    machine = relationship("Machine", back_populates="sensor_readings")
    device = relationship("Device", back_populates="sensor_readings")
