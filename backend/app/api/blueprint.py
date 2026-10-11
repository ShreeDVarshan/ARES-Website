from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.blueprint import Blueprint, BlueprintVersion

router = APIRouter(prefix="/blueprint", tags=["blueprint"])


class BlueprintSave(BaseModel):
    data: dict
    note: Optional[str] = None


@router.get("")
def get_blueprint(current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    bp = db.query(Blueprint).filter(
        Blueprint.factory_id == current_user.factory_id,
        Blueprint.is_active == True).first()
    if not bp:
        return {"blueprint": None, "version": None,
                "data": {"zones": [], "markers": [], "connections": []}}
    latest = db.query(BlueprintVersion).filter(
        BlueprintVersion.blueprint_id == bp.id
    ).order_by(BlueprintVersion.version_number.desc()).first()
    return {
        "blueprint": {"id": bp.id, "name": bp.name,
                      "canvas_width": bp.canvas_width, "canvas_height": bp.canvas_height,
                      "background_image_url": bp.background_image_url},
        "version": latest.version_number if latest else None,
        "data": latest.data if latest else {"zones": [], "markers": [], "connections": []},
    }


@router.post("")
def save_blueprint(payload: BlueprintSave,
                   current_user: User = Depends(require_admin),
                   db: Session = Depends(get_db)):
    bp = db.query(Blueprint).filter(
        Blueprint.factory_id == current_user.factory_id,
        Blueprint.is_active == True).first()
    if not bp:
        bp = Blueprint(factory_id=current_user.factory_id)
        db.add(bp)
        db.flush()
    latest = db.query(BlueprintVersion).filter(
        BlueprintVersion.blueprint_id == bp.id
    ).order_by(BlueprintVersion.version_number.desc()).first()
    version_num = (latest.version_number + 1) if latest else 1
    v = BlueprintVersion(
        blueprint_id=bp.id, version_number=version_num,
        data=payload.data, created_by_id=current_user.id, note=payload.note)
    db.add(v)
    bp.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"blueprint_id": bp.id, "version": version_num, "saved": True}


@router.get("/versions")
def list_versions(current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    bp = db.query(Blueprint).filter(
        Blueprint.factory_id == current_user.factory_id,
        Blueprint.is_active == True).first()
    if not bp:
        return []
    versions = db.query(BlueprintVersion).filter(
        BlueprintVersion.blueprint_id == bp.id
    ).order_by(BlueprintVersion.version_number.desc()).all()
    return [{"version": v.version_number, "note": v.note,
             "created_at": v.created_at.isoformat()} for v in versions]
