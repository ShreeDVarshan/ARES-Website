from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.sensor_reading import SensorReading
from app.models.production_record import ProductionRecord
from app.models.machine import Machine

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/energy")
def energy_analytics(
    hours: int = Query(168, ge=1, le=8760),
    machine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fid = current_user.factory_id
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    machines = {m.id: m for m in db.query(Machine).filter(Machine.factory_id == fid).all()}

    q = db.query(
        SensorReading.machine_id,
        func.sum(SensorReading.energy_delta_kwh).label("total_kwh"),
        func.avg(SensorReading.power_kw).label("avg_power_kw"),
        func.count(SensorReading.id).label("reading_count"),
    ).filter(
        SensorReading.factory_id == fid,
        SensorReading.observed_at >= since,
        SensorReading.is_valid == True,
    )
    if machine_id:
        q = q.filter(SensorReading.machine_id == machine_id)
    by_machine = q.group_by(SensorReading.machine_id).all()

    machine_energy = []
    for row in by_machine:
        m = machines.get(row.machine_id)
        machine_energy.append({
            "machine_id": row.machine_id,
            "machine_name": m.name if m else str(row.machine_id),
            "machine_ref": m.machine_id if m else None,
            "total_kwh": round(row.total_kwh, 3) if row.total_kwh else None,
            "avg_power_kw": round(row.avg_power_kw, 3) if row.avg_power_kw else None,
            "reading_count": row.reading_count,
        })

    bucket_hours = min(hours, 48)
    bucket_since = datetime.now(timezone.utc) - timedelta(hours=bucket_hours)
    trend = []
    for i in range(bucket_hours):
        bs = bucket_since + timedelta(hours=i)
        be = bs + timedelta(hours=1)
        vq = db.query(func.sum(SensorReading.energy_delta_kwh)).filter(
            SensorReading.factory_id == fid,
            SensorReading.observed_at >= bs,
            SensorReading.observed_at < be,
            SensorReading.is_valid == True,
        )
        if machine_id:
            vq = vq.filter(SensorReading.machine_id == machine_id)
        v = vq.scalar()
        trend.append({"time": bs.isoformat(), "energy_kwh": round(v, 3) if v else 0})

    return {"period_hours": hours, "machine_energy": machine_energy, "energy_trend": trend}


@router.get("/sec")
def sec_analytics(
    hours: int = Query(168, ge=1, le=8760),
    machine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fid = current_user.factory_id
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    machines = db.query(Machine).filter(Machine.factory_id == fid, Machine.is_active == True).all()
    if machine_id:
        machines = [m for m in machines if m.id == machine_id]
    results = []
    for m in machines:
        energy = db.query(func.sum(SensorReading.energy_delta_kwh)).filter(
            SensorReading.machine_id == m.id,
            SensorReading.observed_at >= since,
            SensorReading.is_valid == True,
        ).scalar()
        prod = db.query(func.sum(ProductionRecord.good_count)).filter(
            ProductionRecord.machine_id == m.id,
            ProductionRecord.period_start >= since,
        ).scalar()
        sec = None
        note = None
        if energy and prod and prod > 0:
            sec = round(energy / prod, 4)
        elif energy is not None and (not prod or prod == 0):
            note = "No production data for this period"
        else:
            note = "Insufficient energy data"
        results.append({
            "machine_id": m.id, "machine_ref": m.machine_id,
            "machine_name": m.name, "product_type": m.product_type,
            "unit_type": m.unit_type, "energy_kwh": round(energy, 3) if energy else None,
            "good_units": prod, "sec_kwh_per_unit": sec, "sec_note": note,
        })
    return {"period_hours": hours, "machines": results}


@router.get("/condition")
def condition_analytics(
    hours: int = Query(48, ge=1, le=720),
    machine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fid = current_user.factory_id
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    q = db.query(
        SensorReading.machine_id,
        func.avg(SensorReading.temperature_c).label("avg_temp"),
        func.max(SensorReading.temperature_c).label("max_temp"),
        func.avg(SensorReading.vibration_rms).label("avg_vib"),
        func.max(SensorReading.vibration_rms).label("max_vib"),
    ).filter(
        SensorReading.factory_id == fid,
        SensorReading.observed_at >= since,
        SensorReading.is_valid == True,
    )
    if machine_id:
        q = q.filter(SensorReading.machine_id == machine_id)
    rows = q.group_by(SensorReading.machine_id).all()
    machines = {m.id: m for m in db.query(Machine).filter(Machine.factory_id == fid).all()}
    return {
        "period_hours": hours,
        "machines": [{
            "machine_id": r.machine_id,
            "machine_name": machines[r.machine_id].name if r.machine_id in machines else str(r.machine_id),
            "avg_temp_c": round(r.avg_temp, 2) if r.avg_temp else None,
            "max_temp_c": round(r.max_temp, 2) if r.max_temp else None,
            "avg_vibration": round(r.avg_vib, 3) if r.avg_vib else None,
            "max_vibration": round(r.max_vib, 3) if r.max_vib else None,
        } for r in rows],
    }
