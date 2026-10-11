from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.recommendation import Recommendation

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


class RecOut(BaseModel):
    id: int
    machine_id: int
    alert_id: Optional[int]
    title: str
    description: Optional[str]
    evidence: dict
    priority: int
    is_dismissed: bool
    is_actioned: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[RecOut])
def list_recommendations(machine_id: Optional[int] = None,
                          current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    q = db.query(Recommendation).filter(
        Recommendation.factory_id == current_user.factory_id,
        Recommendation.is_dismissed == False,
    )
    if machine_id:
        q = q.filter(Recommendation.machine_id == machine_id)
    return q.order_by(Recommendation.priority.asc(), Recommendation.created_at.desc()).all()


@router.post("/{rec_id}/dismiss")
def dismiss(rec_id: int, current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    r = db.query(Recommendation).filter(Recommendation.id == rec_id,
                                         Recommendation.factory_id == current_user.factory_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    r.is_dismissed = True
    db.commit()
    return {"status": "dismissed"}


@router.post("/{rec_id}/action")
def mark_actioned(rec_id: int, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    r = db.query(Recommendation).filter(Recommendation.id == rec_id,
                                         Recommendation.factory_id == current_user.factory_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    r.is_actioned = True
    db.commit()
    return {"status": "actioned"}
