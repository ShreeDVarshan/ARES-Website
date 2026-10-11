import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON, Boolean, Text
from datetime import datetime, timezone
from app.db.database import Base


class ImportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class DataImport(Base):
    __tablename__ = "data_imports"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True)
    imported_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    import_type = Column(String(64))
    status = Column(Enum(ImportStatus), default=ImportStatus.PENDING)
    total_rows = Column(Integer, default=0)
    imported_rows = Column(Integer, default=0)
    rejected_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    column_mapping = Column(JSON, nullable=True)
    validation_report = Column(JSON, nullable=True)
    rejected_row_details = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
