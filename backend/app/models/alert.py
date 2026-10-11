import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base
from .sensor_reading import SourceMode


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    VERIFICATION_PENDING = "verification_pending"
    RESOLVED = "resolved"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    severity = Column(Enum(AlertSeverity), nullable=False, default=AlertSeverity.WARNING)
    status = Column(Enum(AlertStatus), nullable=False, default=AlertStatus.NEW)
    rule_name = Column(String(128), nullable=False)
    rule_description = Column(String(512))
    title = Column(String(255), nullable=False)
    message = Column(String(1024))
    evidence = Column(JSON, default=dict)
    threshold_value = Column(Float, nullable=True)
    baseline_value = Column(Float, nullable=True)
    observed_value = Column(Float, nullable=True)
    source_mode = Column(Enum(SourceMode), default=SourceMode.LIVE)
    first_occurred_at = Column(DateTime(timezone=True), nullable=False)
    last_occurred_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    dedup_key = Column(String(256), index=True)
    occurrence_count = Column(Integer, default=1)
    suppressed_until = Column(DateTime(timezone=True), nullable=True)
    recommended_action = Column(String(512))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    machine = relationship("Machine", back_populates="alerts")
    maintenance_actions = relationship("MaintenanceAction", back_populates="alert")
