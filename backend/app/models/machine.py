import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class MachineType(str, enum.Enum):
    MOTOR = "motor"
    COMPRESSOR = "compressor"
    PUMP = "pump"
    CONVEYOR = "conveyor"
    HVAC = "hvac"
    OTHER = "other"


class MachineStatus(str, enum.Enum):
    RUNNING = "running"
    IDLE = "idle"
    STOPPED = "stopped"
    FAULT = "fault"
    MAINTENANCE = "maintenance"
    UNKNOWN = "unknown"


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    machine_type = Column(Enum(MachineType), default=MachineType.OTHER)
    zone = Column(String(128))
    rated_power_kw = Column(Float, nullable=True)
    product_type = Column(String(128), nullable=True)
    unit_type = Column(String(64), nullable=True)
    installed_sensors = Column(JSON, default=list)
    baseline_config = Column(JSON, nullable=True)
    maintenance_schedule = Column(JSON, nullable=True)
    has_plc = Column(Boolean, default=False)
    auto_control_permitted = Column(Boolean, default=False)
    permitted_param_ranges = Column(JSON, nullable=True)
    blueprint_x = Column(Float, nullable=True)
    blueprint_y = Column(Float, nullable=True)
    status = Column(Enum(MachineStatus), default=MachineStatus.UNKNOWN)
    last_reading_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    factory = relationship("Factory", back_populates="machines")
    device = relationship("Device", back_populates="machine", uselist=False)
    sensor_readings = relationship("SensorReading", back_populates="machine")
    alerts = relationship("Alert", back_populates="machine")
    maintenance_actions = relationship("MaintenanceAction", back_populates="machine")
    verification_records = relationship("VerificationRecord", back_populates="machine")
    production_records = relationship("ProductionRecord", back_populates="machine")
