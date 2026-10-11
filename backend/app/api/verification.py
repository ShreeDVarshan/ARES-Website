from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.verification_record import VerificationRecord, VerificationResult
from app.models.sensor_reading import SensorReading
from app.models.production_record import ProductionRecord

router = APIRouter(prefix="/verification", tags=["verification"])


class VerificationCreate(BaseModel):
    machine_id: int
    maintenance_action_id: Optional[int] = None
    before_period_start: datetime
    before_period_end: datetime
    after_period_start: datetime
    after_period_end: datetime
    notes: Optional[str] = None


class VerificationOut(BaseModel):
    id: int
    machine_id: int
    maintenance_action_id: Optional[int]
    before_period_start: Optional[datetime]
    before_period_end: Optional[datetime]
    after_period_start: Optional[datetime]
    after_period_end: Optional[datetime]
    before_sec: Optional[float]
    after_sec: Optional[float]
    before_avg_temp: Optional[float]
    after_avg_temp: Optional[float]
    before_avg_vibration: Optional[float]
    after_avg_vibration: Optional[float]
    result: str
    notes: Optional[str]
    data_coverage_before: Optional[float]
    data_coverage_after: Optional[float]
    analysis_details: dict
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[VerificationOut])
def list_verifications(machine_id: Optional[int] = None,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    q = db.query(VerificationRecord).filter(
        VerificationRecord.factory_id == current_user.factory_id)
    if machine_id:
        q = q.filter(VerificationRecord.machine_id == machine_id)
    return q.order_by(VerificationRecord.created_at.desc()).all()


@router.post("", response_model=VerificationOut)
def create_verification(data: VerificationCreate,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    def stats(mid, start, end):
        e = db.query(func.sum(SensorReading.energy_delta_kwh)).filter(
            SensorReading.machine_id == mid,
            SensorReading.observed_at >= start,
            SensorReading.observed_at <= end,
            SensorReading.is_valid == True,
        ).scalar()
        t = db.query(func.avg(SensorReading.temperature_c)).filter(
            SensorReading.machine_id == mid,
            SensorReading.observed_at >= start,
            SensorReading.observed_at <= end,
        ).scalar()
        v = db.query(func.avg(SensorReading.vibration_rms)).filter(
            SensorReading.machine_id == mid,
            SensorReading.observed_at >= start,
            SensorReading.observed_at <= end,
        ).scalar()
        g = db.query(func.sum(ProductionRecord.good_count)).filter(
            ProductionRecord.machine_id == mid,
            ProductionRecord.period_start >= start,
            ProductionRecord.period_end <= end,
        ).scalar()
        n = db.query(func.count(SensorReading.id)).filter(
            SensorReading.machine_id == mid,
            SensorReading.observed_at >= start,
            SensorReading.observed_at <= end,
        ).scalar()
        return e, t, v, g, n

    be, bt, bv, bu, bn = stats(data.machine_id, data.before_period_start, data.before_period_end)
    ae, at_, av, au, an = stats(data.machine_id, data.after_period_start, data.after_period_end)
    bsec = (be / bu) if (be and bu and bu > 0) else None
    asec = (ae / au) if (ae and au and au > 0) else None

    if not bn or not an:
        result = VerificationResult.INSUFFICIENT_DATA
    elif asec and bsec:
        pct = (bsec - asec) / bsec * 100
        result = (VerificationResult.IMPROVED if pct > 2
                  else VerificationResult.TRADEOFF if pct < -2
                  else VerificationResult.NO_CHANGE)
    elif at_ and bt and av and bv:
        result = (VerificationResult.IMPROVED if at_ < bt and av < bv
                  else VerificationResult.NO_CHANGE)
    else:
        result = VerificationResult.INSUFFICIENT_DATA

    rec = VerificationRecord(
        factory_id=current_user.factory_id,
        machine_id=data.machine_id,
        maintenance_action_id=data.maintenance_action_id,
        before_period_start=data.before_period_start,
        before_period_end=data.before_period_end,
        after_period_start=data.after_period_start,
        after_period_end=data.after_period_end,
        before_sec=round(bsec, 4) if bsec else None,
        after_sec=round(asec, 4) if asec else None,
        before_avg_temp=round(bt, 2) if bt else None,
        after_avg_temp=round(at_, 2) if at_ else None,
        before_avg_vibration=round(bv, 3) if bv else None,
        after_avg_vibration=round(av, 3) if av else None,
        result=result, notes=data.notes,
        data_coverage_before=bn, data_coverage_after=an,
        analysis_details={
            "before_energy_kwh": round(be, 3) if be else None,
            "after_energy_kwh": round(ae, 3) if ae else None,
            "caution": "This comparison is not causal. Many factors may differ between periods.",
        },
        created_by_id=current_user.id,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
