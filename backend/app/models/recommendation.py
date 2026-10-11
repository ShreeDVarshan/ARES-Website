from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Float
from datetime import datetime, timezone
from app.db.database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2048))
    evidence = Column(JSON, default=dict)
    priority = Column(Integer, default=5)
    estimated_saving_kwh = Column(Float, nullable=True)
    is_dismissed = Column(Boolean, default=False)
    is_actioned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
