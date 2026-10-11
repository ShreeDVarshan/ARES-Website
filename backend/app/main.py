from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api import (auth, machines, alerts, dashboard, devices,
                     maintenance, analytics, blueprint, simulation,
                     users, recommendations, verification)
from app.api.websocket_api import router as ws_router
from app.api.iot import router as iot_router

app = FastAPI(
    title="ARES — Adaptive Retrofit Efficiency System",
    version="0.1.0",
    description="Industrial monitoring, detection, and retrofit management API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(machines.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(blueprint.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(verification.router, prefix="/api")
app.include_router(iot_router, prefix="/api")
app.include_router(ws_router)


@app.on_event("startup")
async def startup_event():
    """Auto-seed database on first deploy if empty. Retries with backoff."""
    import asyncio
    for attempt in range(1, 8):
        try:
            from app.db.database import SessionLocal, Base, engine
            from app.models import Factory
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            if not db.query(Factory).first():
                db.close()
                print(f"🌱 No data found (attempt {attempt}) — running auto-seed...")
                _auto_seed()
            else:
                db.close()
                print(f"✅ Database ready (attempt {attempt}).")
            return
        except Exception as e:
            wait = min(2 ** attempt, 30)
            print(f"⚠️  DB not ready (attempt {attempt}): {e} — retrying in {wait}s")
            await asyncio.sleep(wait)
    print("❌ Could not connect to database after retries. Continuing anyway.")


def _auto_seed():
    """Seed demo factory, users, machines and devices."""
    try:
        from app.db.database import SessionLocal, Base, engine
        from app.models import (Factory, User, UserRole, Machine, MachineType,
                                MachineStatus, Device, DeviceStatus, Blueprint,
                                BlueprintVersion)
        from app.core.security import (get_password_hash, generate_device_credential,
                                       hash_device_credential)
        db = SessionLocal()

        factory = Factory(name="ARES Demo Factory", location="Demo Site",
                          timezone="UTC", currency="GBP", is_demo=True)
        db.add(factory)
        db.flush()

        admin = User(factory_id=factory.id, email="admin@ares.demo",
                     username="admin", full_name="Factory Admin",
                     hashed_password=get_password_hash("AresDemo2024!"),
                     role=UserRole.ADMIN, is_active=True)
        operator = User(factory_id=factory.id, email="operator@ares.demo",
                        username="operator", full_name="Plant Operator",
                        hashed_password=get_password_hash("Operator2024!"),
                        role=UserRole.OPERATOR, is_active=True)
        maint = User(factory_id=factory.id, email="maintenance@ares.demo",
                     username="maintenance", full_name="Maintenance Staff",
                     hashed_password=get_password_hash("Maint2024!"),
                     role=UserRole.MAINTENANCE, is_active=True)
        db.add_all([admin, operator, maint])
        db.flush()

        motor = Machine(factory_id=factory.id, machine_id="M-01",
                        name="Drive Motor 1", machine_type=MachineType.MOTOR,
                        zone="Zone A - Production", rated_power_kw=5.5,
                        product_type="Widget A", unit_type="units",
                        installed_sensors=["power", "temperature", "vibration"],
                        blueprint_x=250.0, blueprint_y=300.0, status=MachineStatus.UNKNOWN)
        comp = Machine(factory_id=factory.id, machine_id="C-01",
                       name="Air Compressor 1", machine_type=MachineType.COMPRESSOR,
                       zone="Zone B - Utilities", rated_power_kw=11.0,
                       installed_sensors=["power", "temperature", "vibration"],
                       blueprint_x=600.0, blueprint_y=200.0, status=MachineStatus.UNKNOWN)
        pump = Machine(factory_id=factory.id, machine_id="P-01",
                       name="Coolant Pump 1", machine_type=MachineType.PUMP,
                       zone="Zone B - Utilities", rated_power_kw=2.2,
                       installed_sensors=["power", "temperature"],
                       blueprint_x=600.0, blueprint_y=380.0, status=MachineStatus.UNKNOWN)
        db.add_all([motor, comp, pump])
        db.flush()

        def make_device(fid, mid, did, name):
            cred = generate_device_credential()
            d = Device(factory_id=fid, machine_id=mid, device_id=did, name=name,
                       hashed_credential=hash_device_credential(cred),
                       sampling_interval_seconds=30,
                       sensor_config={"power": True, "temperature": True, "vibration": True},
                       stale_threshold_seconds=120, status=DeviceStatus.UNKNOWN)
            return d, cred

        dm, _ = make_device(factory.id, motor.id, "NODE_001", "Motor Node 1")
        dc, _ = make_device(factory.id, comp.id, "NODE_002", "Compressor Node 2")
        dp, _ = make_device(factory.id, pump.id, "NODE_003", "Pump Node 3")
        db.add_all([dm, dc, dp])

        bp = Blueprint(factory_id=factory.id, name="Demo Factory Floor",
                       canvas_width=1000, canvas_height=600)
        db.add(bp)
        db.flush()

        bpv = BlueprintVersion(
            blueprint_id=bp.id, version_number=1,
            created_by_id=admin.id, note="Initial blueprint",
            data={
                "zones": [
                    {"id": "zone-a", "name": "Zone A - Production",
                     "x": 60, "y": 140, "width": 420, "height": 360, "color": "rgba(0,208,132,0.06)"},
                    {"id": "zone-b", "name": "Zone B - Utilities",
                     "x": 530, "y": 100, "width": 430, "height": 420, "color": "rgba(255,209,102,0.05)"},
                ],
                "markers": [
                    {"id": "m-m01", "machine_id": motor.id, "machine_ref": "M-01",
                     "name": "Drive Motor 1", "type": "motor", "x": 250, "y": 300},
                    {"id": "m-c01", "machine_id": comp.id, "machine_ref": "C-01",
                     "name": "Air Compressor 1", "type": "compressor", "x": 600, "y": 200},
                    {"id": "m-p01", "machine_id": pump.id, "machine_ref": "P-01",
                     "name": "Coolant Pump 1", "type": "pump", "x": 600, "y": 380},
                ],
                "connections": [],
            }
        )
        db.add(bpv)
        db.commit()
        print("✅ Auto-seed complete — admin@ares.demo / AresDemo2024!")
        db.close()
    except Exception as e:
        print(f"❌ Auto-seed failed: {e}")
        import traceback
        traceback.print_exc()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ARES API"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )
