import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class VerificationResult(str, enum.Enum):
    IMPROVED = "improved"
    NO_CHANGE = "no_change"
    TRADEOFF = "tradeoff"
    INSUFFICIENT_DATA = "insufficient_data"


class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    maintenance_action_id = Column(Integer, ForeignKey("maintenance_actions.id"), nullable=True)
    before_period_start = Column(DateTime(timezone=True), nullable=True)
    before_period_end = Column(DateTime(timezone=True), nullable=True)
    after_period_start = Column(DateTime(timezone=True), nullable=True)
    after_period_end = Column(DateTime(timezone=True), nullable=True)
    before_sec = Column(Float, nullable=True)
    after_sec = Column(Float, nullable=True)
    before_avg_temp = Column(Float, nullable=True)
    after_avg_temp = Column(Float, nullable=True)
    before_avg_vibration = Column(Float, nullable=True)
    after_avg_vibration = Column(Float, nullable=True)
    before_throughput = Column(Float, nullable=True)
    after_throughput = Column(Float, nullable=True)
    result = Column(Enum(VerificationResult), default=VerificationResult.INSUFFICIENT_DATA)
    notes = Column(Text)
    data_coverage_before = Column(Float, nullable=True)
    data_coverage_after = Column(Float, nullable=True)
    analysis_details = Column(JSON, default=dict)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    machine = relationship("Machine", back_populates="verification_records")
    maintenance_action = relationship("MaintenanceAction", back_populates="verification_records")
