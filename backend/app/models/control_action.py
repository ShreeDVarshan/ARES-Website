import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON, Boolean, Float
from datetime import datetime, timezone
from app.db.database import Base


class ControlActionStatus(str, enum.Enum):
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"


class ControlAction(Base):
    __tablename__ = "control_actions"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    initiated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_simulated = Column(Boolean, default=True)
    parameter_name = Column(String(128), nullable=False)
    prior_value = Column(Float, nullable=True)
    requested_value = Column(Float, nullable=False)
    actual_value = Column(Float, nullable=True)
    permitted_min = Column(Float, nullable=True)
    permitted_max = Column(Float, nullable=True)
    status = Column(Enum(ControlActionStatus), default=ControlActionStatus.PENDING)
    failure_reason = Column(String(512), nullable=True)
    rollback_value = Column(Float, nullable=True)
    timeout_seconds = Column(Integer, default=30)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
