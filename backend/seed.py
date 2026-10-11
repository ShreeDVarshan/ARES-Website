"""
Seed the database with demo factory, users, machines and devices.
Run: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.models import *
from app.core.security import get_password_hash, generate_device_credential, hash_device_credential

Base.metadata.create_all(bind=engine)

db = SessionLocal()
if db.query(Factory).first():
    print("Already seeded.")
    db.close()
    sys.exit(0)

print("Seeding...")

factory = Factory(name="ARES Demo Factory", location="Demo Site",
                  timezone="UTC", currency="GBP", is_demo=True)
db.add(factory)
db.flush()

admin = User(factory_id=factory.id, email="admin@ares.demo", username="admin",
             full_name="Factory Admin", hashed_password=get_password_hash("AresDemo2024!"),
             role=UserRole.ADMIN, is_active=True)
operator = User(factory_id=factory.id, email="operator@ares.demo", username="operator",
                full_name="Plant Operator", hashed_password=get_password_hash("Operator2024!"),
                role=UserRole.OPERATOR, is_active=True)
maint = User(factory_id=factory.id, email="maintenance@ares.demo", username="maintenance",
             full_name="Maintenance Staff", hashed_password=get_password_hash("Maint2024!"),
             role=UserRole.MAINTENANCE, is_active=True)
db.add_all([admin, operator, maint])
db.flush()

motor = Machine(factory_id=factory.id, machine_id="M-01", name="Drive Motor 1",
                machine_type=MachineType.MOTOR, zone="Zone A - Production",
                rated_power_kw=5.5, product_type="Widget A", unit_type="units",
                installed_sensors=["power", "temperature", "vibration"],
                blueprint_x=250.0, blueprint_y=300.0, status=MachineStatus.UNKNOWN)
comp = Machine(factory_id=factory.id, machine_id="C-01", name="Air Compressor 1",
               machine_type=MachineType.COMPRESSOR, zone="Zone B - Utilities",
               rated_power_kw=11.0, installed_sensors=["power", "temperature", "vibration"],
               blueprint_x=600.0, blueprint_y=200.0, status=MachineStatus.UNKNOWN)
pump = Machine(factory_id=factory.id, machine_id="P-01", name="Coolant Pump 1",
               machine_type=MachineType.PUMP, zone="Zone B - Utilities",
               rated_power_kw=2.2, installed_sensors=["power", "temperature"],
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

dm, cm = make_device(factory.id, motor.id, "NODE_001", "Motor Node 1")
dc, cc = make_device(factory.id, comp.id,  "NODE_002", "Compressor Node 2")
dp, cp = make_device(factory.id, pump.id,  "NODE_003", "Pump Node 3")
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
             "x": 50, "y": 150, "width": 400, "height": 350, "color": "#1D292320"},
            {"id": "zone-b", "name": "Zone B - Utilities",
             "x": 500, "y": 100, "width": 450, "height": 400, "color": "#0F6B3E20"},
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

print("\n✅ Seeded successfully!")
print("\n── Demo Accounts ──────────────────────────────")
print(f"  Admin:       admin@ares.demo       / AresDemo2024!")
print(f"  Operator:    operator@ares.demo     / Operator2024!")
print(f"  Maintenance: maintenance@ares.demo  / Maint2024!")
print("\n── Device Credentials ─────────────────────────")
print(f"  NODE_001: {cm}")
print(f"  NODE_002: {cc}")
print(f"  NODE_003: {cp}")
print("\n  ⚠  Save credentials — not stored in plaintext.\n")
db.close()
