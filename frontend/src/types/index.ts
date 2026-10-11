export type UserRole = 'admin' | 'operator' | 'maintenance'

export interface AuthUser {
  user_id: number
  username: string
  role: UserRole
  factory_id: number
  access_token: string
  refresh_token: string
}

export type SourceMode = 'live' | 'simulation' | 'imported' | 'replay'

export type MachineStatus = 'running' | 'idle' | 'stopped' | 'fault' | 'maintenance' | 'unknown'
export type MachineType = 'motor' | 'compressor' | 'pump' | 'conveyor' | 'hvac' | 'other'

export interface Machine {
  id: number
  machine_id: string
  name: string
  machine_type: MachineType
  zone: string | null
  rated_power_kw: number | null
  product_type: string | null
  unit_type: string | null
  installed_sensors: string[]
  status: MachineStatus
  last_reading_at: string | null
  blueprint_x: number | null
  blueprint_y: number | null
  has_plc: boolean
  auto_control_permitted: boolean
}

export interface SensorReading {
  id: number
  observed_at: string
  power_kw: number | null
  energy_total_kwh: number | null
  energy_delta_kwh: number | null
  temperature_c: number | null
  vibration_rms: number | null
  vibration_unit: string
  runtime_status: string | null
  quality_flags: string[]
  source_mode: SourceMode
  is_valid: boolean
}

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'new' | 'acknowledged' | 'assigned' | 'in_progress' | 'verification_pending' | 'resolved'

export interface Alert {
  id: number
  machine_id: number
  severity: AlertSeverity
  status: AlertStatus
  rule_name: string
  title: string
  message: string | null
  evidence: Record<string, unknown>
  threshold_value: number | null
  observed_value: number | null
  source_mode: SourceMode
  first_occurred_at: string
  last_occurred_at: string
  resolved_at: string | null
  acknowledged_at: string | null
  occurrence_count: number
  recommended_action: string | null
}

export interface Device {
  id: number
  device_id: string
  name: string | null
  machine_id: number | null
  firmware_version: string | null
  status: 'online' | 'stale' | 'offline' | 'unknown'
  last_heartbeat_at: string | null
  last_reading_at: string | null
  signal_strength_dbm: number | null
  sampling_interval_seconds: number
  sensor_config: Record<string, boolean>
  stale_threshold_seconds: number
  credential_revoked: boolean
  is_active: boolean
}

export interface MaintenanceAction {
  id: number
  machine_id: number
  alert_id: number | null
  title: string
  description: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to_id: number | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  findings: string | null
  requires_verification: boolean
  created_at: string
}

export interface VerificationRecord {
  id: number
  machine_id: number
  maintenance_action_id: number | null
  before_period_start: string | null
  before_period_end: string | null
  after_period_start: string | null
  after_period_end: string | null
  before_sec: number | null
  after_sec: number | null
  before_avg_temp: number | null
  after_avg_temp: number | null
  before_avg_vibration: number | null
  after_avg_vibration: number | null
  result: 'improved' | 'no_change' | 'tradeoff' | 'insufficient_data'
  notes: string | null
  data_coverage_before: number | null
  data_coverage_after: number | null
  analysis_details: Record<string, unknown>
  created_at: string
}

export interface BlueprintMarker {
  id: string
  machine_id: number
  machine_ref: string
  name: string
  type: MachineType
  x: number
  y: number
}

export interface BlueprintZone {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface BlueprintData {
  zones: BlueprintZone[]
  markers: BlueprintMarker[]
  connections: unknown[]
}

export interface DashboardData {
  period_hours: number
  total_machines: number
  machine_status_counts: Record<MachineStatus, number>
  machines: MachineSummary[]
  energy_total_kwh: number | null
  active_alerts: AlertSummary[]
  alert_counts: { critical: number; warning: number; info: number }
  pending_maintenance: number
  data_freshness: { latest_reading_at: string | null; has_live_data: boolean }
  device_counts: { total: number; online: number; stale: number; offline: number }
  energy_trend: { time: string; energy_kwh: number }[]
  server_time: string
}

export interface MachineSummary {
  id: number
  machine_id: string
  name: string
  type: MachineType
  zone: string | null
  status: MachineStatus
  blueprint_x: number | null
  blueprint_y: number | null
  active_alerts: number
  data_stale: boolean
  latest: {
    power_kw: number | null
    temperature_c: number | null
    vibration_rms: number | null
    runtime_status: string | null
    observed_at: string | null
    source_mode: SourceMode | null
  } | null
}

export interface AlertSummary {
  id: number
  machine_id: number
  severity: AlertSeverity
  status: AlertStatus
  title: string
  message: string | null
  last_occurred_at: string
  source_mode: SourceMode
}

export interface WSMessage {
  type: 'connected' | 'pong' | 'sensor_reading' | 'alert_update'
  source_mode?: SourceMode
  data?: Record<string, unknown>
  alert_id?: number
  status?: string
  factory_id?: number
}
