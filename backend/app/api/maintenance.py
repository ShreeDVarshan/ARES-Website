from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.maintenance_action import MaintenanceAction, MaintenanceStatus

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


class MaintenanceCreate(BaseModel):
    machine_id: int
    alert_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    requires_verification: bool = True


class MaintenanceUpdate(BaseModel):
    status: Optional[str] = None
    findings: Optional[str] = None
    completed_at: Optional[datetime] = None
    assigned_to_id: Optional[int] = None


class MaintenanceOut(BaseModel):
    id: int
    machine_id: int
    alert_id: Optional[int]
    title: str
    description: Optional[str]
    status: str
    assigned_to_id: Optional[int]
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    findings: Optional[str]
    requires_verification: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[MaintenanceOut])
def list_maintenance(
    machine_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(MaintenanceAction).filter(
        MaintenanceAction.factory_id == current_user.factory_id)
    if machine_id:
        q = q.filter(MaintenanceAction.machine_id == machine_id)
    return q.order_by(MaintenanceAction.created_at.desc()).all()


@router.post("", response_model=MaintenanceOut)
def create_maintenance(data: MaintenanceCreate,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    action = MaintenanceAction(
        factory_id=current_user.factory_id,
        created_by_id=current_user.id,
        **data.model_dump(),
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@router.patch("/{action_id}", response_model=MaintenanceOut)
def update_maintenance(action_id: int, data: MaintenanceUpdate,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    action = db.query(MaintenanceAction).filter(
        MaintenanceAction.id == action_id,
        MaintenanceAction.factory_id == current_user.factory_id,
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Maintenance action not found")
    if data.status:
        action.status = data.status
        if data.status == MaintenanceStatus.IN_PROGRESS and not action.started_at:
            action.started_at = datetime.now(timezone.utc)
    if data.findings is not None:
        action.findings = data.findings
    if data.completed_at is not None:
        action.completed_at = data.completed_at
    if data.assigned_to_id is not None:
        action.assigned_to_id = data.assigned_to_id
    action.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(action)
    return action


@router.get("/{action_id}", response_model=MaintenanceOut)
def get_maintenance(action_id: int, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    action = db.query(MaintenanceAction).filter(
        MaintenanceAction.id == action_id,
        MaintenanceAction.factory_id == current_user.factory_id,
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Not found")
    return action
