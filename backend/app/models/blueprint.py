from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Blueprint(Base):
    __tablename__ = "blueprints"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    name = Column(String(255), default="Factory Blueprint")
    background_image_url = Column(String(512), nullable=True)
    scale_pixels_per_meter = Column(Integer, nullable=True)
    canvas_width = Column(Integer, default=1200)
    canvas_height = Column(Integer, default=800)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    factory = relationship("Factory", back_populates="blueprints")
    versions = relationship("BlueprintVersion", back_populates="blueprint",
                            order_by="BlueprintVersion.version_number.desc()")


class BlueprintVersion(Base):
    __tablename__ = "blueprint_versions"

    id = Column(Integer, primary_key=True, index=True)
    blueprint_id = Column(Integer, ForeignKey("blueprints.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    data = Column(JSON, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    note = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    blueprint = relationship("Blueprint", back_populates="versions")
