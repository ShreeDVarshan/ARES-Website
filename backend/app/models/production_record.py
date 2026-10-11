from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base
from .sensor_reading import SourceMode


class ProductionRecord(Base):
    __tablename__ = "production_records"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    product_type = Column(String(128), nullable=True)
    batch_id = Column(String(128), nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=False, index=True)
    period_end = Column(DateTime(timezone=True), nullable=False)
    total_count = Column(Integer, nullable=False)
    good_count = Column(Integer, nullable=False)
    reject_count = Column(Integer, nullable=False)
    unit_type = Column(String(64), default="units")
    is_cumulative = Column(Boolean, default=False)
    source_mode = Column(Enum(SourceMode), default=SourceMode.LIVE)
    source_identifier = Column(String(128), nullable=True)
    notes = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    machine = relationship("Machine", back_populates="production_records")
