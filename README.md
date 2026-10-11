# ARES — Adaptive Retrofit Efficiency System

> **Smart Retrofit Monitoring & Optimisation Platform for Industrial Machinery**

ARES is a full-stack industrial IoT monitoring platform designed to help factories reduce energy waste, detect machine anomalies in real time, and verify the measurable impact of retrofit interventions. It was developed as a College of Engineering (COE) final-year project.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Endpoint Reference](#api-endpoint-reference)
6. [Frontend Pages](#frontend-pages)
7. [Installation & Local Setup](#installation--local-setup)
8. [Environment Variables](#environment-variables)
9. [Running the Application](#running-the-application)
10. [Running Tests](#running-tests)
11. [Current Limitations & Future Work](#current-limitations--future-work)

---

## Problem Statement

Industrial machinery often runs inefficiently for extended periods before problems are noticed — wasting energy, increasing wear, and causing unplanned downtime. Traditional factory monitoring requires expensive hardware upgrades. ARES solves this by providing:

- **Real-time sensor ingestion** from low-cost retrofit IoT edge nodes (Raspberry Pi / Arduino) via a secure REST API.
- **Automatic anomaly detection** based on configurable thresholds for temperature, vibration, and idle-power consumption.
- **Alert lifecycle management** (New → Acknowledged → Assigned → Resolved) with WebSocket push notifications.
- **Maintenance workflow tracking** with post-retrofit verification of measurable improvement.
- **Specific Energy Consumption (SEC)** analytics comparing energy per unit of production before and after retrofits.
- **A demonstration simulation mode** that generates labelled synthetic data without affecting real readings.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                       │
│  Vite + TypeScript + TailwindCSS + Recharts + Three.js           │
│  Zustand (auth state) │ TanStack Query (server cache) │ Axios    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP REST + WebSocket
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend (Python 3.11+)                 │
│  uvicorn  │  SQLAlchemy ORM  │  Pydantic v2 validation           │
│  JWT Auth (python-jose)  │  bcrypt (passlib)                     │
│  Detection Engine  │  WebSocket broadcast (ws_manager)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ SQLAlchemy / psycopg2
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    PostgreSQL 16                                   │
│  Deployed via Docker Compose (local) or Railway (cloud)          │
└─────────────────────────────────────────────────────────────────┘

IoT Edge Nodes ──(HTTPS POST)──► /api/iot/readings
                                 /api/iot/heartbeat
```

**Deployment targets:**
- Local: Docker Compose (`docker-compose.yml` starts both PostgreSQL and FastAPI).
- Cloud: Backend on [Railway](https://railway.app) (`backend/railway.json`, `backend/nixpacks.toml`). Frontend on [Vercel](https://vercel.com) (`frontend/vercel.json`).

---

## Technology Stack

### Backend (`/backend`)

| Component | Library / Version |
|---|---|
| Web Framework | FastAPI 0.115.0 |
| ASGI Server | Uvicorn 0.32.0 |
| ORM | SQLAlchemy 2.0.36 |
| Migrations | Alembic 1.13.3 |
| Database Driver | psycopg2-binary 2.9.10 |
| Schema Validation | Pydantic 2.9.2 + pydantic-settings 2.5.2 |
| Authentication | JWT via python-jose 3.3.0 |
| Password Hashing | passlib 1.7.4 + bcrypt 4.0.1 |
| WebSockets | FastAPI built-in (websockets 13.1) |
| HTTP Client (tests) | httpx 0.27.2 |
| Data processing | pandas 2.2.3, numpy 2.1.3 |

### Frontend (`/frontend`)

| Component | Library / Version |
|---|---|
| Build Tool | Vite 5.3.1 |
| Framework | React 18.3.1 + TypeScript 5.4.5 |
| Styling | TailwindCSS 3.4.4 + vanilla CSS |
| Routing | React Router DOM 6.23.1 |
| Server State | TanStack React Query 5.40.0 |
| Global State | Zustand 4.5.2 |
| HTTP Client | Axios 1.7.2 |
| Charts | Recharts 2.12.7 |
| 3D Visualisation | Three.js 0.165.0 + @react-three/fiber + @react-three/drei |
| Animations | Framer Motion 11.2.10 |
| Icons | Lucide React 0.395.0 |

---

## Database Schema

> **Note:** All tables use `INTEGER` auto-increment primary keys. Foreign keys reference `id` columns. Timestamps are timezone-aware (`TIMESTAMPTZ` in PostgreSQL).

### `factories`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `name` | VARCHAR(255) NOT NULL | Factory display name |
| `location` | VARCHAR(255) | Physical location |
| `timezone` | VARCHAR(64) | Default `UTC` |
| `currency` | VARCHAR(8) | Default `GBP` |
| `tariff_config` | JSON | Energy tariff bands (nullable) |
| `emissions_factor` | VARCHAR(20) | kgCO₂/kWh (nullable) |
| `is_demo` | BOOLEAN | Marks demo tenants |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `factory_id` | INTEGER FK → `factories.id` | NOT NULL, indexed |
| `email` | VARCHAR(255) UNIQUE NOT NULL | Indexed |
| `username` | VARCHAR(64) UNIQUE NOT NULL | Indexed |
| `full_name` | VARCHAR(255) | |
| `hashed_password` | VARCHAR(255) NOT NULL | bcrypt hash |
| `role` | ENUM('admin','operator','maintenance') | NOT NULL |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `last_login` | TIMESTAMPTZ | Nullable |

### `machines`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `factory_id` | INTEGER FK → `factories.id` | NOT NULL, indexed |
| `machine_id` | VARCHAR(64) | Human-readable reference (e.g. `M-01`) |
| `name` | VARCHAR(255) NOT NULL | |
| `machine_type` | ENUM('motor','compressor','pump','conveyor','hvac','other') | |
| `zone` | VARCHAR(128) | Factory zone label |
| `rated_power_kw` | FLOAT | Nameplate power rating |
| `product_type` | VARCHAR(128) | Product being made (for SEC) |
| `unit_type` | VARCHAR(64) | Unit of production |
| `installed_sensors` | JSON | List of sensor types e.g. `["power","temperature"]` |
| `baseline_config` | JSON | Threshold overrides (nullable) |
| `has_plc` | BOOLEAN | Default `false` |
| `auto_control_permitted` | BOOLEAN | Default `false` |
| `blueprint_x`, `blueprint_y` | FLOAT | Position on floor plan canvas |
| `status` | ENUM('running','idle','stopped','fault','maintenance','unknown') | |
| `last_reading_at` | TIMESTAMPTZ | |
| `is_active` | BOOLEAN | Soft-delete flag |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

### `devices`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `factory_id` | INTEGER FK → `factories.id` | NOT NULL |
| `machine_id` | INTEGER FK → `machines.id` | Nullable (unassigned device) |
| `device_id` | VARCHAR(64) UNIQUE | Node identifier (e.g. `NODE_001`) |
| `name` | VARCHAR(255) | |
| `firmware_version` | VARCHAR(32) | |
| `hashed_credential` | VARCHAR(255) NOT NULL | bcrypt hash of the device secret |
| `credential_revoked` | BOOLEAN | Default `false` |
| `status` | ENUM('online','stale','offline','unknown') | |
| `last_heartbeat_at` | TIMESTAMPTZ | |
| `last_reading_at` | TIMESTAMPTZ | |
| `signal_strength_dbm` | FLOAT | Wi-Fi/LoRa RSSI |
| `sampling_interval_seconds` | INTEGER | Default 30 |
| `sensor_config` | JSON | Which sensors are active |
| `stale_threshold_seconds` | INTEGER | Default 120 |
| `is_active` | BOOLEAN | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

### `sensor_readings`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `factory_id` | INTEGER FK → `factories.id` | Indexed |
| `machine_id` | INTEGER FK → `machines.id` | Indexed |
| `device_id` | INTEGER FK → `devices.id` | Nullable |
| `message_id` | VARCHAR(128) | Deduplication key from device |
| `source_mode` | ENUM('live','imported','replay','simulation') | |
| `source_identifier` | VARCHAR(128) | Device ID string or import label |
| `observed_at` | TIMESTAMPTZ NOT NULL | Indexed — time the reading was taken |
| `ingested_at` | TIMESTAMPTZ | Time the backend received it |
| `power_kw` | FLOAT | Instantaneous active power |
| `energy_total_kwh` | FLOAT | Cumulative meter reading |
| `energy_delta_kwh` | FLOAT | Calculated interval energy |
| `energy_calculation_method` | VARCHAR(64) | `meter_delta`, `integrated`, `meter_reset` |
| `temperature_c` | FLOAT | Bearing / ambient temperature |
| `vibration_rms` | FLOAT | Root-mean-square vibration |
| `vibration_unit` | VARCHAR(16) | Default `mm/s` |
| `runtime_status` | VARCHAR(32) | `RUNNING`, `IDLE`, `STOPPED` |
| `runtime_total_seconds` | INTEGER | Cumulative run-time from device |
| `quality_flags` | JSON | e.g. `["STALE_OBSERVATION","METER_RESET_DETECTED"]` |
| `is_valid` | BOOLEAN | `false` if `FUTURE_TIMESTAMP` flag set |
| `meter_reset_detected` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| **Unique constraint** | `(device_id, message_id)` | Prevents duplicate ingestion |

### `alerts`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `factory_id` | INTEGER FK → `factories.id` | Indexed |
| `machine_id` | INTEGER FK → `machines.id` | Indexed |
| `severity` | ENUM('info','warning','critical') | |
| `status` | ENUM('new','acknowledged','assigned','in_progress','verification_pending','resolved') | |
| `rule_name` | VARCHAR(128) | e.g. `temperature_critical` |
| `title` | VARCHAR(255) NOT NULL | |
| `message` | VARCHAR(1024) | Human-readable description |
| `evidence` | JSON | Raw sensor values that triggered the alert |
| `threshold_value` | FLOAT | Threshold that was crossed |
| `observed_value` | FLOAT | Value that triggered the alert |
| `source_mode` | ENUM | Whether from live or simulation data |
| `first_occurred_at` | TIMESTAMPTZ | |
| `last_occurred_at` | TIMESTAMPTZ | Updated on re-trigger |
| `resolved_at` | TIMESTAMPTZ | |
| `acknowledged_at` | TIMESTAMPTZ | |
| `acknowledged_by_id` | INTEGER FK → `users.id` | Nullable |
| `assigned_to_id` | INTEGER FK → `users.id` | Nullable |
| `dedup_key` | VARCHAR(256) | MD5 of `machine_id:rule_name`, indexed |
| `occurrence_count` | INTEGER | How many times alert was re-triggered |
| `recommended_action` | VARCHAR(512) | Suggested remediation step |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

### `maintenance_actions`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `factory_id` | INTEGER FK → `factories.id` | |
| `machine_id` | INTEGER FK → `machines.id` | |
| `alert_id` | INTEGER FK → `alerts.id` | Nullable — links work order to alert |
| `assigned_to_id` | INTEGER FK → `users.id` | |
| `created_by_id` | INTEGER FK → `users.id` | |
| `title` | VARCHAR(255) NOT NULL | |
| `description` | TEXT | |
| `status` | ENUM('scheduled','in_progress','completed','cancelled') | |
| `scheduled_at` | TIMESTAMPTZ | |
| `started_at` | TIMESTAMPTZ | Auto-set when status → `in_progress` |
| `completed_at` | TIMESTAMPTZ | |
| `findings` | TEXT | Technician findings |
| `requires_verification` | BOOLEAN | Default `true` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

### `verification_records`

Stores before/after statistical comparison after a maintenance intervention.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `factory_id` | INTEGER FK → `factories.id` | |
| `machine_id` | INTEGER FK → `machines.id` | |
| `maintenance_action_id` | INTEGER FK → `maintenance_actions.id` | Nullable |
| `before_period_start`, `before_period_end` | TIMESTAMPTZ | Comparison period |
| `after_period_start`, `after_period_end` | TIMESTAMPTZ | |
| `before_sec`, `after_sec` | FLOAT | Specific Energy Consumption kWh/unit |
| `before_avg_temp`, `after_avg_temp` | FLOAT | |
| `before_avg_vibration`, `after_avg_vibration` | FLOAT | |
| `result` | ENUM('improved','no_change','tradeoff','insufficient_data') | |
| `analysis_details` | JSON | Energy totals and caveats |
| `created_by_id` | INTEGER FK → `users.id` | |
| `created_at` | TIMESTAMPTZ | |

### Other Tables (defined, less actively used in UI)

| Table | Purpose |
|---|---|
| `blueprints` | Factory floor plan metadata (canvas dimensions, background image) |
| `blueprint_versions` | Versioned JSON snapshots of zone + machine marker layout |
| `recommendations` | Auto-generated action suggestions from the detection engine |
| `production_records` | Manual or imported unit production records for SEC calculation |
| `audit_logs` | Timestamped record of user actions |
| `data_imports` | Tracks CSV/bulk data import jobs |
| `control_actions` | Records of remote PLC commands (structure defined, UI not yet built) |

---

## API Endpoint Reference

All endpoints are prefixed with `/api`. Authentication uses **Bearer JWT tokens** obtained from `/api/auth/login`.

**Authentication notation:**
- 🔓 — Public (no token required)
- 🔑 — Any authenticated user (valid Bearer token)
- 👑 — Admin role required

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | 🔓 | Liveness check — returns `{"status":"ok"}` |

### Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | 🔓 | Login with username/email + password (OAuth2 form). Returns access + refresh tokens. |
| `POST` | `/api/auth/refresh` | 🔓 | Exchange a refresh token for a new access token. |
| `GET` | `/api/auth/me` | 🔑 | Return the authenticated user's profile. |
| `POST` | `/api/auth/logout` | 🔑 | Client-side logout (stateless — invalidation via token expiry). |

### Machines (`/api/machines`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/machines` | 🔑 | List all active machines in the user's factory. |
| `POST` | `/api/machines` | 👑 | Create a new machine. |
| `GET` | `/api/machines/{id}` | 🔑 | Get a single machine by database ID. |
| `PATCH` | `/api/machines/{id}` | 👑 | Update machine fields (name, zone, blueprint position, etc.). |
| `GET` | `/api/machines/{id}/readings` | 🔑 | Sensor readings for a machine. Query: `?hours=24` (1–720). Returns up to 500 rows. |
| `GET` | `/api/machines/{id}/summary` | 🔑 | Latest reading, active alert count, stale data flag. |

### Alerts (`/api/alerts`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/alerts` | 🔑 | List alerts. Optional query filters: `?status=`, `?severity=`, `?machine_id=`. Returns up to 200. |
| `GET` | `/api/alerts/{id}` | 🔑 | Get a single alert. |
| `POST` | `/api/alerts/{id}/acknowledge` | 🔑 | Mark alert as acknowledged. |
| `POST` | `/api/alerts/{id}/assign` | 🔑 | Assign alert to a user. Query: `?assigned_to_id=`. |
| `POST` | `/api/alerts/{id}/resolve` | 🔑 | Mark alert as resolved. |

### Dashboard (`/api/dashboard`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | 🔑 | Aggregated factory overview: machine statuses, energy total, alert counts, device counts, energy trend. Query: `?hours=24`. |

### Analytics (`/api/analytics`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/analytics/energy` | 🔑 | Energy consumption totals and trend by machine. Query: `?hours=168&machine_id=`. |
| `GET` | `/api/analytics/sec` | 🔑 | Specific Energy Consumption (kWh/unit) per machine. Query: `?hours=168`. |
| `GET` | `/api/analytics/condition` | 🔑 | Average and max temperature and vibration per machine. Query: `?hours=48`. |

### Devices (`/api/devices`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/devices` | 🔑 | List all active IoT devices for the factory. |
| `POST` | `/api/devices` | 👑 | Register a new device. Returns device record + one-time plain-text credential. |
| `GET` | `/api/devices/{id}` | 🔑 | Get a device by database ID. |
| `POST` | `/api/devices/{id}/rotate-credential` | 👑 | Generate a new device credential (old one invalidated). |
| `POST` | `/api/devices/{id}/revoke` | 👑 | Revoke device access (marks offline). |

### IoT Ingestion (`/api/iot`) — Device-facing

These endpoints authenticate the **device** (not a user) using `X-Device-Id` and `X-Device-Credential` headers.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/iot/readings` | Device credential | Ingest a single sensor reading. Triggers detection engine. |
| `POST` | `/api/iot/readings/batch` | Device credential | Ingest a batch of readings. |
| `POST` | `/api/iot/heartbeat` | Device credential | Update device last-seen timestamp and firmware version. |
| `GET` | `/api/iot/config/{device_id}` | Device credential | Retrieve sampling config for the device. |

### Maintenance (`/api/maintenance`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/maintenance` | 🔑 | List maintenance actions. Optional: `?machine_id=`. |
| `POST` | `/api/maintenance` | 🔑 | Create a maintenance work order. |
| `GET` | `/api/maintenance/{id}` | 🔑 | Get a single maintenance action. |
| `PATCH` | `/api/maintenance/{id}` | 🔑 | Update status, findings, assigned user, completion time. |

### Verification (`/api/verification`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/verification` | 🔑 | List verification records. Optional: `?machine_id=`. |
| `POST` | `/api/verification` | 🔑 | Create a new before/after comparison. Computes SEC and condition stats from sensor data. |

### Blueprint (`/api/blueprint`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/blueprint` | 🔑 | Retrieve the latest blueprint version for the factory. |
| `POST` | `/api/blueprint` | 👑 | Save a new blueprint version. Auto-increments version number. |
| `GET` | `/api/blueprint/versions` | 🔑 | List all blueprint versions with timestamps. |

### Simulation (`/api/simulation`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/simulation/scenarios` | 🔑 | List available demo scenarios. |
| `GET` | `/api/simulation/status` | 🔑 | Current simulation state (running/stopped, active scenario). |
| `POST` | `/api/simulation/control` | 🔑 | Start, pause, or reset simulation. Body: `{"action":"start","scenario":"temperature_anomaly"}`. |

### Recommendations (`/api/recommendations`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/recommendations` | 🔑 | List active (non-dismissed) recommendations. Optional: `?machine_id=`. |
| `POST` | `/api/recommendations/{id}/dismiss` | 🔑 | Dismiss a recommendation. |
| `POST` | `/api/recommendations/{id}/action` | 🔑 | Mark a recommendation as actioned. |

### Users (`/api/users`) — Admin only

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | 👑 | List all users in the factory. |
| `POST` | `/api/users` | 👑 | Create a new user. |
| `PATCH` | `/api/users/{id}/deactivate` | 👑 | Deactivate a user account. |

### WebSocket

| Path | Auth | Description |
|---|---|---|
| `WS /ws/{factory_id}?token=<access_token>` | JWT via query param | Real-time push: `sensor_reading`, `alert_update` events. |

---

## Frontend Pages

| Route | Page | Status |
|---|---|---|
| `/login` | Login | ✅ Implemented |
| `/dashboard` | Factory overview — machine statuses, alerts, energy | ✅ Implemented |
| `/machines` | Machine list with readings and summaries | ✅ Implemented |
| `/alerts` | Alert management (acknowledge, assign, resolve) | ✅ Implemented |
| `/analytics` | Energy, SEC, and condition analytics with charts | ✅ Implemented |
| `/blueprint` | Interactive factory floor-plan editor | ✅ Implemented |
| `/maintenance` | Maintenance work order management | ✅ Implemented |
| `/verification` | Before/after retrofit comparison | ✅ Implemented |
| `/devices` | IoT device management and credential rotation | ✅ Implemented |
| `/data-sources` | Data import page | ✅ Implemented |
| `/recommendations` | Optimisation recommendation list | ✅ Implemented |
| `/reports` | Report generation | ✅ Implemented |
| `/settings` | Factory settings and user management | ✅ Implemented |
| `/audit-log` | Audit log viewer | 🚧 Placeholder — planned |

---

## Installation & Local Setup

### Prerequisites

- Docker Desktop ≥ 24 and Docker Compose v2
- Node.js ≥ 20 and npm ≥ 10
- Python 3.11+ (for running backend tests without Docker)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/ARES-Website.git
cd ARES-Website
```

### 2. Configure environment variables

#### Step 2a: Root Environment (`.env`) for Docker Compose & Backend

Create the root `.env` file from the provided `.env.example` template:

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder values with secure credentials before starting the application:

1. **`POSTGRES_PASSWORD` (Required):**
   Set a strong password for the PostgreSQL database container. Docker Compose enforces this via parameter validation (`${POSTGRES_PASSWORD:?...}`) and will refuse to start if left blank or unset.
   > **Note on Special Characters:** If your database password includes special characters (e.g., `@`, `#`, `:`, `/`, `%`, `?`), they must be **URL-encoded / percent-encoded** (for example, `@` becomes `%40`, `#` becomes `%23`) so that the resulting database URI parses correctly in SQLAlchemy / psycopg2. Alternatively, generate a 24-character alphanumeric password:
   > ```bash
   > openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24
   > ```

2. **`SECRET_KEY` (Required):**
   Set a 256-bit cryptographically secure random secret key used to sign JWT tokens. Docker Compose enforces this and will refuse to start without it. Generate one via:
   ```bash
   openssl rand -hex 32
   # or with Python:
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

3. **`DATABASE_URL` Wiring:**
   - **Inside Docker Compose:** The API container automatically connects to PostgreSQL using the Compose service hostname `db` on port `5432`:
     `postgresql://${POSTGRES_USER:-ares_user}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-ares_db}`
     Both the database container and API service share consistent `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values.
   - **Outside Docker (Host Development):** If running FastAPI directly on your host machine while PostgreSQL runs on Docker, set `DATABASE_URL` in `.env` to point to `localhost:5432`:
     `postgresql://ares_user:<password>@localhost:5432/ares_db`

#### Step 2b: Frontend Environment (`frontend/.env.local`)

```bash
cp frontend/.env.example frontend/.env.local
# Default points to local FastAPI backend:
# VITE_API_URL=http://localhost:8000
# VITE_WS_URL=ws://localhost:8000
```

### 3. Start with Docker Compose

```bash
docker compose up --build
```

This will:
- Start PostgreSQL 16 on port 5432
- Start the FastAPI backend on port 8000
- Auto-create all database tables on first start
- Seed a demo factory with three machines and three users

**Demo credentials (auto-seeded):**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ares.demo` | `AresDemo2024!` |
| Operator | `operator@ares.demo` | `Operator2024!` |
| Maintenance | `maintenance@ares.demo` | `Maint2024!` |

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 5. Verify the backend

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"ARES API"}
```

---

## Environment Variables

### Root Configuration (`.env`)

Used by Docker Compose and the backend application:

| Variable | Default / Fallback | Required | Description |
|---|---|---|---|
| `POSTGRES_USER` | `ares_user` | No | PostgreSQL database username |
| `POSTGRES_PASSWORD` | *None* | **Yes** | Database password. Enforced by Compose (`:?`); no insecure fallback. |
| `POSTGRES_DB` | `ares_db` | No | PostgreSQL database name |
| `DATABASE_URL` | *Derived in Compose* | Yes (if run outside Docker) | Connection string. In Compose, auto-connects to `db:5432`. On host machine, points to `localhost:5432`. |
| `SECRET_KEY` | *None* | **Yes** | 256-bit JWT secret. Enforced by Compose (`:?`); no insecure fallback. |
| `ALGORITHM` | `HS256` | No | JWT signing algorithm (default `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | No | Access token expiration lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | No | Refresh token expiration lifetime in days |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | No | Comma-separated allowed CORS origins |
| `ENVIRONMENT` | `development` | No | Runtime environment (`development` or `production`) |
| `LOG_LEVEL` | `INFO` | No | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `MAX_UPLOAD_SIZE_MB` | `10` | No | Maximum permitted file upload size in MB |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | FastAPI backend base URL for HTTP API calls |
| `VITE_WS_URL` | `ws://localhost:8000` | WebSocket endpoint URL for live sensor and alert streaming |

> ⚠️ **Security Notice:** Never commit `.env` or `.env.local` files to version control. Both are strictly ignored in `.gitignore`. Use `.env.example` as the safe template.

---

## Running the Application

### With Docker Compose (recommended for full-stack)

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View backend logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Remove volumes (wipes database)
docker-compose down -v
```

### Without Docker (development)

**Backend:**
```bash
cd backend

# Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Database migrations (Alembic)

```bash
cd backend
alembic upgrade head          # Apply all pending migrations
alembic revision --autogenerate -m "description"  # Create a new migration
```

---

## Running Tests

### Backend tests

The test suite uses **pytest** with an in-memory SQLite database, so no running PostgreSQL instance is required.

```bash
cd backend

# Install test dependencies (if not already installed)
pip install pytest pytest-asyncio httpx

# Run all tests with verbose output
python3 -m pytest tests/ -v

# Run a specific test file
python3 -m pytest tests/test_auth.py -v
python3 -m pytest tests/test_security.py -v
python3 -m pytest tests/test_machines.py -v
python3 -m pytest tests/test_alerts.py -v
```

**Test coverage areas:**
- `test_security.py` — JWT creation/decoding, device credential generation, detection threshold validation
- `test_auth.py` — Login (valid/invalid credentials, inactive users), token refresh, /me endpoint, logout
- `test_machines.py` — Machine CRUD, role-based access, factory isolation, input validation
- `test_alerts.py` — Alert listing, filtering, lifecycle (acknowledge/resolve), error cases

### Frontend lint check

```bash
cd frontend
npm run lint   # ESLint with zero max-warnings
```

### Frontend type check

```bash
cd frontend
npx tsc --noEmit
```

---

## Current Limitations & Future Work

### Known Limitations

| Area | Limitation |
|---|---|
| **Anomaly detection** | Rule-based threshold engine only. No ML-based baseline learning. Thresholds are global, not per-machine. |
| **Alert deduplication** | Alerts deduplicate by `machine_id + rule_name` only. Does not account for multiple simultaneous faults of the same type. |
| **Production records** | `production_records` table exists but no frontend UI for data entry. SEC analytics will show "no production data" without manual database inserts. |
| **PLC / remote control** | `control_actions` table and `has_plc` flag are defined but no write-back to physical PLCs is implemented. |
| **Audit log UI** | Route exists (`/audit-log`) but page is a placeholder. `audit_logs` table is created. |
| **Data import UI** | DataSources page exists but CSV import backend logic is not fully wired. |
| **Multi-tenant** | Each factory is isolated by `factory_id` in all queries. Cross-tenant admin is not implemented. |
| **Notifications** | WebSocket push is implemented. Email/SMS alerting is not. |
| **bcrypt on Python 3.14** | `bcrypt==4.0.1` (pinned in requirements.txt) has a known incompatibility with Python 3.14. Upgrade to `bcrypt>=4.2.1` if running on Python 3.14+. |

### Planned Future Work

- ML-based anomaly detection using LSTM or isolation forests trained on historical readings.
- Per-machine configurable alert thresholds stored in `baseline_config`.
- Email and push notification integration for critical alerts.
- Full CSV/Excel import pipeline for historical energy data.
- Audit log viewer frontend page.
- Role-based dashboard customisation.
- Multi-language support (i18n).
- Automated report generation (PDF export).
