"""Demo simulation generator — all data clearly labelled SIMULATION."""
from datetime import datetime, timezone
import random
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import SessionLocal, get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.machine import Machine, MachineStatus
from app.models.device import Device, DeviceStatus
from app.models.sensor_reading import SensorReading, SourceMode
from app.services.detection import run_detection
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/simulation", tags=["simulation"])

_sim_state = {"running": False, "scenario": "normal", "factory_id": None}

SCENARIOS = {
    "normal": "Normal operation — all machines within expected parameters",
    "idle_waste": "Excess idle consumption — motor drawing power when stopped",
    "temperature_anomaly": "Persistent temperature deviation on compressor",
    "vibration_anomaly": "Elevated vibration on pump (bearing issue pattern)",
    "combined": "Combined condition change — rising temperature and vibration",
    "device_disconnect": "Device disconnect — node goes offline mid-operation",
    "sensor_fault": "Sensor fault — temperature sensor reports implausible values",
    "post_maintenance": "Post-maintenance improvement — condition normalised",
}

MACHINE_BASES = {
    "motor": {"power_kw": 3.2, "idle_power": 0.4, "temp": 58.0, "vib": 2.1},
    "compressor": {"power_kw": 7.5, "idle_power": 0.8, "temp": 72.0, "vib": 3.5},
    "pump": {"power_kw": 2.1, "idle_power": 0.2, "temp": 45.0, "vib": 1.8},
}


def _reading_values(mtype: str, scenario: str, tick: int) -> Optional[dict]:
    base = MACHINE_BASES.get(mtype, MACHINE_BASES["motor"])
    n = lambda s=1.0: random.gauss(0, s * 0.05)
    power = base["power_kw"] * (1 + n(0.1))
    temp = base["temp"] + n(2)
    vib = base["vib"] * (1 + n(0.15))
    status = "RUNNING"

    if scenario == "idle_waste":
        status = "IDLE"
        power = base["idle_power"] * (1 + n(0.05))
    elif scenario == "temperature_anomaly":
        temp = base["temp"] + min(tick * 0.5, 25) + n(1)
    elif scenario == "vibration_anomaly":
        vib = base["vib"] + min(tick * 0.1, 8) + n(0.2)
    elif scenario == "combined":
        temp = base["temp"] + min(tick * 0.3, 15) + n(1)
        vib = base["vib"] + min(tick * 0.08, 5) + n(0.15)
    elif scenario == "device_disconnect" and tick > 10:
        return None
    elif scenario == "sensor_fault" and tick % 5 == 0:
        temp = 999.9
    elif scenario == "post_maintenance":
        if tick < 15:
            temp = base["temp"] + 18 + n(1)
            vib = base["vib"] + 4 + n(0.2)
        else:
            temp = base["temp"] - 2 + n(0.5)
            vib = base["vib"] - 1 + n(0.1)

    return {
        "power_kw": round(max(0, power), 3),
        "temperature_c": round(temp, 2),
        "vibration_rms": round(max(0, vib), 3),
        "runtime_status": status,
    }


async def _run_simulation(factory_id: int, scenario: str):
    tick = 0
    accum: dict = {}
    while _sim_state["running"]:
        try:
            db = SessionLocal()
            machines = db.query(Machine).filter(
                Machine.factory_id == factory_id, Machine.is_active == True).all()
            devices = {d.machine_id: d for d in db.query(Device).filter(
                Device.factory_id == factory_id).all()}
            for machine in machines:
                device = devices.get(machine.id)
                if not device:
                    continue
                mtype = machine.machine_type.value if machine.machine_type else "motor"
                vals = _reading_values(mtype, scenario, tick)
                if vals is None:
                    device.status = DeviceStatus.OFFLINE
                    db.commit()
                    continue
                interval_s = 10
                e_delta = vals["power_kw"] * (interval_s / 3600)
                accum[machine.id] = accum.get(machine.id, 0) + e_delta
                msg_id = f"SIM_{machine.machine_id}_{tick}_{int(datetime.now(timezone.utc).timestamp())}"
                reading = SensorReading(
                    factory_id=factory_id, machine_id=machine.id,
                    device_id=device.id, message_id=msg_id,
                    source_mode=SourceMode.SIMULATION,
                    source_identifier=f"DEMO_{scenario}",
                    observed_at=datetime.now(timezone.utc),
                    ingested_at=datetime.now(timezone.utc),
                    power_kw=vals["power_kw"],
                    energy_total_kwh=round(accum[machine.id], 4),
                    energy_delta_kwh=round(e_delta, 6),
                    energy_calculation_method="integrated",
                    temperature_c=vals["temperature_c"],
                    vibration_rms=vals["vibration_rms"],
                    vibration_unit="mm/s",
                    runtime_status=vals["runtime_status"],
                    quality_flags=["SIMULATION"],
                    is_valid=True,
                )
                db.add(reading)
                device.last_reading_at = datetime.now(timezone.utc)
                device.status = DeviceStatus.ONLINE
                machine.status = (MachineStatus.RUNNING
                                  if vals["runtime_status"] == "RUNNING" else MachineStatus.IDLE)
                machine.last_reading_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(reading)
                run_detection(db, factory_id, machine, reading)
                await ws_manager.broadcast_to_factory(factory_id, {
                    "type": "sensor_reading",
                    "source_mode": "simulation",
                    "data": {
                        "machine_id": machine.id,
                        "machine_ref": machine.machine_id,
                        "device_id": device.device_id,
                        **vals,
                        "energy_delta_kwh": round(e_delta, 6),
                        "observed_at": datetime.now(timezone.utc).isoformat(),
                    }
                })
            db.close()
            tick += 1
            await asyncio.sleep(10)
        except Exception as e:
            print(f"Simulation error: {e}")
            try:
                db.close()
            except Exception:
                pass
            await asyncio.sleep(5)


@router.get("/scenarios")
def list_scenarios(current_user: User = Depends(get_current_user)):
    return {"scenarios": [{"id": k, "description": v} for k, v in SCENARIOS.items()]}


@router.get("/status")
def get_status(current_user: User = Depends(get_current_user)):
    return {
        "running": _sim_state["running"],
        "scenario": _sim_state["scenario"],
        "note": "All simulation data is labelled SIMULATION and isolated from real readings.",
    }


class SimControl(BaseModel):
    action: str
    scenario: Optional[str] = "normal"


@router.post("/control")
async def control_simulation(
    payload: SimControl,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.action == "start":
        if _sim_state["running"]:
            return {"status": "already_running", "scenario": _sim_state["scenario"]}
        if payload.scenario not in SCENARIOS:
            raise HTTPException(status_code=400, detail=f"Unknown scenario: {payload.scenario}")
        _sim_state.update({"running": True, "scenario": payload.scenario,
                           "factory_id": current_user.factory_id})
        background_tasks.add_task(
            _run_simulation, current_user.factory_id, payload.scenario)
        return {
            "status": "started", "scenario": payload.scenario,
            "warning": "SIMULATION MODE — data is labelled and isolated from real readings",
        }
    elif payload.action == "pause":
        _sim_state["running"] = False
        return {"status": "paused"}
    elif payload.action == "reset":
        _sim_state["running"] = False
        db.query(SensorReading).filter(
            SensorReading.factory_id == current_user.factory_id,
            SensorReading.source_mode == SourceMode.SIMULATION,
        ).delete()
        db.commit()
        return {"status": "reset", "note": "Simulation readings cleared"}
    raise HTTPException(status_code=400, detail="Unknown action")
