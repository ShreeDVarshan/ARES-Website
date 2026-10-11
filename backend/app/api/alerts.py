from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.alert import Alert, AlertStatus
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertOut(BaseModel):
    id: int
    machine_id: int
    severity: str
    status: str
    rule_name: str
    title: str
    message: Optional[str]
    evidence: dict
    threshold_value: Optional[float]
    observed_value: Optional[float]
    source_mode: str
    first_occurred_at: datetime
    last_occurred_at: datetime
    resolved_at: Optional[datetime]
    acknowledged_at: Optional[datetime]
    occurrence_count: int
    recommended_action: Optional[str]

    class Config:
        from_attributes = True


@router.get("", response_model=List[AlertOut])
def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    machine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Alert).filter(Alert.factory_id == current_user.factory_id)
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    if machine_id:
        q = q.filter(Alert.machine_id == machine_id)
    return q.order_by(Alert.last_occurred_at.desc()).limit(200).all()


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, current_user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id,
                                Alert.factory_id == current_user.factory_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return a


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int,
                            current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id,
                                Alert.factory_id == current_user.factory_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    if a.status == AlertStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Alert already resolved")
    a.status = AlertStatus.ACKNOWLEDGED
    a.acknowledged_at = datetime.now(timezone.utc)
    a.acknowledged_by_id = current_user.id
    db.commit()
    await ws_manager.broadcast_to_factory(current_user.factory_id,
        {"type": "alert_update", "alert_id": alert_id, "status": "acknowledged"})
    return {"status": "acknowledged"}


@router.post("/{alert_id}/assign")
async def assign_alert(alert_id: int, assigned_to_id: int,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id,
                                Alert.factory_id == current_user.factory_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.status = AlertStatus.ASSIGNED
    a.assigned_to_id = assigned_to_id
    db.commit()
    await ws_manager.broadcast_to_factory(current_user.factory_id,
        {"type": "alert_update", "alert_id": alert_id, "status": "assigned"})
    return {"status": "assigned"}


@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: int,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id,
                                Alert.factory_id == current_user.factory_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.status = AlertStatus.RESOLVED
    a.resolved_at = datetime.now(timezone.utc)
    db.commit()
    await ws_manager.broadcast_to_factory(current_user.factory_id,
        {"type": "alert_update", "alert_id": alert_id, "status": "resolved"})
    return {"status": "resolved"}
