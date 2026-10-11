from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Factory(Base):
    __tablename__ = "factories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    timezone = Column(String(64), default="UTC")
    currency = Column(String(8), default="GBP")
    tariff_config = Column(JSON, nullable=True)
    emissions_factor = Column(String(20), nullable=True)
    emissions_factor_source = Column(String(255), nullable=True)
    emissions_factor_valid_date = Column(String(20), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="factory")
    machines = relationship("Machine", back_populates="factory")
    devices = relationship("Device", back_populates="factory")
    blueprints = relationship("Blueprint", back_populates="factory")
