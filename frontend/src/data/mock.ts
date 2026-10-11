/* ─────────────────────────────────────────────────────
   ARES Mock Data — used when backend returns no data
   All values are clearly labelled as demo/simulation
   ───────────────────────────────────────────────────── */
import { subHours, subDays, subMinutes, format, addMinutes } from 'date-fns'

const now = new Date()

/* ── Machines ── */
export const MOCK_MACHINES = [
  { id: 1, machine_id: 'M-01', name: 'Drive Motor 1',     machine_type: 'motor',      zone: 'Zone A',  rated_power_kw: 5.5,  status: 'running',  blueprint_x: 240, blueprint_y: 280, installed_sensors: ['power','temperature','vibration'], active_alerts: 1, data_stale: false, latest: { power_kw: 3.24, temperature_c: 62.3, vibration_rms: 2.1, runtime_status: 'RUNNING', observed_at: subMinutes(now,1).toISOString(), source_mode: 'simulation' } },
  { id: 2, machine_id: 'C-01', name: 'Air Compressor 1',  machine_type: 'compressor', zone: 'Zone B',  rated_power_kw: 11.0, status: 'fault',    blueprint_x: 600, blueprint_y: 200, installed_sensors: ['power','temperature','vibration'], active_alerts: 2, data_stale: false, latest: { power_kw: 8.81, temperature_c: 89.5, vibration_rms: 8.7, runtime_status: 'RUNNING', observed_at: subMinutes(now,1).toISOString(), source_mode: 'simulation' } },
  { id: 3, machine_id: 'P-01', name: 'Coolant Pump 1',    machine_type: 'pump',       zone: 'Zone B',  rated_power_kw: 2.2,  status: 'idle',     blueprint_x: 600, blueprint_y: 380, installed_sensors: ['power','temperature'],            active_alerts: 0, data_stale: false, latest: { power_kw: 0.82, temperature_c: 44.1, vibration_rms: null,  runtime_status: 'IDLE',    observed_at: subMinutes(now,2).toISOString(), source_mode: 'simulation' } },
  { id: 4, machine_id: 'M-02', name: 'Conveyor Motor 2',  machine_type: 'motor',      zone: 'Zone A',  rated_power_kw: 3.7,  status: 'running',  blueprint_x: 350, blueprint_y: 420, installed_sensors: ['power','temperature'],            active_alerts: 0, data_stale: false, latest: { power_kw: 2.91, temperature_c: 55.2, vibration_rms: null,  runtime_status: 'RUNNING', observed_at: subMinutes(now,1).toISOString(), source_mode: 'simulation' } },
  { id: 5, machine_id: 'H-01', name: 'HVAC Unit 1',       machine_type: 'hvac',       zone: 'Zone C',  rated_power_kw: 6.0,  status: 'stopped',  blueprint_x: 760, blueprint_y: 300, installed_sensors: ['power'],                          active_alerts: 0, data_stale: true,  latest: null },
]

/* ── Devices ── */
export const MOCK_DEVICES = [
  { id: 1, device_id: 'NODE_001', name: 'Motor Node 1',      machine_id: 1, status: 'online',  firmware_version: '1.3.2', last_heartbeat_at: subMinutes(now,1).toISOString(),  last_reading_at: subMinutes(now,1).toISOString(),  signal_strength_dbm: -58, sampling_interval_seconds: 30, sensor_config: { power: true, temperature: true, vibration: true }, stale_threshold_seconds: 120, credential_revoked: false, is_active: true },
  { id: 2, device_id: 'NODE_002', name: 'Compressor Node 2', machine_id: 2, status: 'online',  firmware_version: '1.3.2', last_heartbeat_at: subMinutes(now,2).toISOString(),  last_reading_at: subMinutes(now,1).toISOString(),  signal_strength_dbm: -62, sampling_interval_seconds: 30, sensor_config: { power: true, temperature: true, vibration: true }, stale_threshold_seconds: 120, credential_revoked: false, is_active: true },
  { id: 3, device_id: 'NODE_003', name: 'Pump Node 3',       machine_id: 3, status: 'online',  firmware_version: '1.3.1', last_heartbeat_at: subMinutes(now,3).toISOString(),  last_reading_at: subMinutes(now,2).toISOString(),  signal_strength_dbm: -71, sampling_interval_seconds: 30, sensor_config: { power: true, temperature: true, vibration: false }, stale_threshold_seconds: 120, credential_revoked: false, is_active: true },
  { id: 4, device_id: 'NODE_004', name: 'Conveyor Node 4',   machine_id: 4, status: 'stale',   firmware_version: '1.2.0', last_heartbeat_at: subMinutes(now,8).toISOString(),  last_reading_at: subMinutes(now,8).toISOString(),  signal_strength_dbm: -84, sampling_interval_seconds: 30, sensor_config: { power: true, temperature: true, vibration: false }, stale_threshold_seconds: 120, credential_revoked: false, is_active: true },
  { id: 5, device_id: 'NODE_005', name: 'HVAC Node 5',       machine_id: 5, status: 'offline', firmware_version: '1.1.0', last_heartbeat_at: subHours(now,4).toISOString(),    last_reading_at: subHours(now,4).toISOString(),    signal_strength_dbm: null, sampling_interval_seconds: 60, sensor_config: { power: true, temperature: false, vibration: false }, stale_threshold_seconds: 120, credential_revoked: false, is_active: true },
]

/* ── Alerts ── */
export const MOCK_ALERTS = [
  { id: 1, machine_id: 2, severity: 'critical', status: 'new',          rule_name: 'combined_condition',    title: 'C-01: Combined temperature and vibration anomaly', message: 'Air Compressor 1 shows both elevated temperature (89.5°C) and vibration (8.7 mm/s). This pattern may indicate friction, lubrication or rotating-component issues.', evidence: { temperature_c: 89.5, vibration_rms: 8.7, diagnosis: 'Combined: possible friction, lubrication, or bearing issue' }, threshold_value: 80, observed_value: 89.5, source_mode: 'simulation', first_occurred_at: subMinutes(now,18).toISOString(), last_occurred_at: subMinutes(now,1).toISOString(), resolved_at: null, acknowledged_at: null, occurrence_count: 18, recommended_action: 'Inspect lubrication, bearing condition and cooling. Cross-reference with energy consumption trend.' },
  { id: 2, machine_id: 2, severity: 'critical', status: 'acknowledged', rule_name: 'temperature_critical',  title: 'C-01: Critical temperature',          message: 'Air Compressor 1 temperature is 89.5°C, above the critical threshold of 80°C.', evidence: { temperature_c: 89.5, threshold_c: 80 }, threshold_value: 80, observed_value: 89.5, source_mode: 'simulation', first_occurred_at: subMinutes(now,22).toISOString(), last_occurred_at: subMinutes(now,1).toISOString(), resolved_at: null, acknowledged_at: subMinutes(now,15).toISOString(), occurrence_count: 22, recommended_action: 'Stop machine if safe. Inspect cooling system and lubrication immediately.' },
  { id: 3, machine_id: 1, severity: 'warning',  status: 'assigned',     rule_name: 'vibration_warning',     title: 'M-01: Elevated vibration',            message: 'Drive Motor 1 vibration is 6.8 mm/s, approaching the warning threshold.', evidence: { vibration_rms: 6.8, unit: 'mm/s' }, threshold_value: 7.0, observed_value: 6.8, source_mode: 'simulation', first_occurred_at: subHours(now,2).toISOString(),    last_occurred_at: subMinutes(now,5).toISOString(),  resolved_at: null, acknowledged_at: subHours(now,1).toISOString(), occurrence_count: 7, recommended_action: 'Monitor vibration trend. Schedule inspection if sustained.' },
  { id: 4, machine_id: 3, severity: 'warning',  status: 'resolved',     rule_name: 'idle_power_excess',     title: 'P-01: Excess idle power',             message: 'Coolant Pump 1 was drawing 1.8 kW while idle. Resolved after auxiliary shutdown.', evidence: { power_kw: 1.8, runtime_status: 'IDLE' }, threshold_value: 1.5, observed_value: 1.8, source_mode: 'simulation', first_occurred_at: subHours(now,5).toISOString(),    last_occurred_at: subHours(now,3).toISOString(),    resolved_at: subHours(now,3).toISOString(), acknowledged_at: subHours(now,4).toISOString(), occurrence_count: 3, recommended_action: 'Inspect auxiliary systems.' },
  { id: 5, machine_id: 4, severity: 'info',     status: 'new',          rule_name: 'stale_data',            title: 'M-02: Data becoming stale',           message: 'NODE_004 last reported 8 minutes ago, approaching stale threshold.', evidence: { last_seen_minutes: 8 }, threshold_value: null, observed_value: null, source_mode: 'simulation', first_occurred_at: subMinutes(now,2).toISOString(),  last_occurred_at: subMinutes(now,2).toISOString(),  resolved_at: null, acknowledged_at: null, occurrence_count: 1, recommended_action: 'Check device connectivity and Wi-Fi signal.' },
]

/* ── Recommendations ── */
export const MOCK_RECOMMENDATIONS = [
  { id: 1, machine_id: 2, alert_id: 1, priority: 1, title: 'Schedule urgent bearing inspection on C-01', description: 'Combined high temperature and vibration on Air Compressor 1 for 18+ minutes indicates possible bearing deterioration. Inspect before next production shift.', evidence: { temperature_c: 89.5, vibration_rms: 8.7, duration_min: 18 }, is_dismissed: false, is_actioned: false, created_at: subMinutes(now,18).toISOString() },
  { id: 2, machine_id: 3, alert_id: 4, priority: 2, title: 'Review auxiliary shutdown sequence on P-01', description: 'Pump auxiliary systems remained active during idle. Review PLC shutdown ladder or manual procedure to prevent energy waste.', evidence: { energy_wasted_kwh: 0.54, idle_power_kw: 1.8 }, is_dismissed: false, is_actioned: false, created_at: subHours(now,3).toISOString() },
  { id: 3, machine_id: 1, alert_id: 3, priority: 3, title: 'Trend monitoring — M-01 vibration rising', description: 'Vibration on Drive Motor 1 has increased 28% over 2 hours. Not yet at threshold but trending upward. Inspect at next scheduled maintenance window.', evidence: { current_mm_s: 6.8, two_hours_ago: 5.3, trend_pct: 28 }, is_dismissed: false, is_actioned: false, created_at: subHours(now,2).toISOString() },
]

/* ── Maintenance ── */
export const MOCK_MAINTENANCE = [
  { id: 1, machine_id: 2, alert_id: 2, title: 'Inspect C-01 cooling system and bearings',   description: 'High temperature alert — check coolant flow, fan operation and main bearing.', status: 'in_progress', assigned_to_id: 3, scheduled_at: subMinutes(now,30).toISOString(), started_at: subMinutes(now,10).toISOString(), completed_at: null, findings: null, requires_verification: true, created_at: subHours(now,1).toISOString() },
  { id: 2, machine_id: 1, alert_id: 3, title: 'Lubrication service — M-01 Drive Motor',     description: 'Scheduled lubrication. Check coupling alignment and vibration dampers.', status: 'scheduled',    assigned_to_id: 3, scheduled_at: addMinutes(now,120).toISOString(), started_at: null, completed_at: null, findings: null, requires_verification: true, created_at: subHours(now,3).toISOString() },
  { id: 3, machine_id: 3, alert_id: 4, title: 'P-01 auxiliary shutdown sequence review',    description: 'Operator to review PLC program for auxiliary hold-off on idle state transition.', status: 'completed',  assigned_to_id: 2, scheduled_at: subHours(now,4).toISOString(), started_at: subHours(now,4).toISOString(), completed_at: subHours(now,3).toISOString(), findings: 'Timer value corrected from 30s to 5s. Verified energy reduction.', requires_verification: true, created_at: subHours(now,5).toISOString() },
  { id: 4, machine_id: 5, alert_id: null, title: 'H-01 NODE_005 device reconnection',       description: 'HVAC node offline 4h. Check power supply and Wi-Fi signal.', status: 'scheduled', assigned_to_id: 3, scheduled_at: addMinutes(now,60).toISOString(), started_at: null, completed_at: null, findings: null, requires_verification: false, created_at: subHours(now,1).toISOString() },
]

/* ── Readings time-series (last 24h, 1 per 30min) ── */
function genReadings(machineId: number, baseP: number, baseT: number, baseV: number | null, anomaly?: 'temp'|'vib') {
  return Array.from({ length: 48 }, (_, i) => {
    const t = subHours(now, 24 - i * 0.5)
    const n = () => (Math.random() - 0.5) * 0.1
    const p = Math.max(0, baseP * (1 + n()))
    let temp = baseT + n() * 4
    let vib = baseV != null ? Math.max(0, baseV * (1 + n())) : null
    if (anomaly === 'temp' && i > 38) temp = baseT + (i - 38) * 2.2 + n() * 2
    if (anomaly === 'vib'  && i > 35) vib = baseV! + (i - 35) * 0.4 + n() * 0.5
    return { id: machineId * 1000 + i, observed_at: t.toISOString(), power_kw: +p.toFixed(3), temperature_c: +temp.toFixed(2), vibration_rms: vib != null ? +vib.toFixed(3) : null, vibration_unit: 'mm/s', runtime_status: p < 0.5 ? 'IDLE' : 'RUNNING', quality_flags: ['SIMULATION'], source_mode: 'simulation', is_valid: true }
  })
}
export const MOCK_READINGS: Record<number, ReturnType<typeof genReadings>> = {
  1: genReadings(1, 3.24, 58, 2.1, 'vib'),
  2: genReadings(2, 8.81, 72, 3.5, 'temp'),
  3: genReadings(3, 0.82, 44, null),
  4: genReadings(4, 2.91, 55, null),
  5: [],
}

/* ── Energy trend (hourly, 48h) ── */
export const MOCK_ENERGY_TREND = Array.from({ length: 48 }, (_, i) => {
  const t = subHours(now, 48 - i)
  const isNight = t.getHours() < 7 || t.getHours() > 21
  const base = isNight ? 3.2 : 14.8
  return { time: t.toISOString(), energy_kwh: +(base + (Math.random() - 0.5) * 2).toFixed(2) }
})

/* ── Analytics energy by machine ── */
export const MOCK_MACHINE_ENERGY = [
  { machine_id: 1, machine_name: 'Drive Motor 1',    machine_ref: 'M-01', total_kwh: 67.8,  avg_power_kw: 3.18, reading_count: 1440 },
  { machine_id: 2, machine_name: 'Air Compressor 1', machine_ref: 'C-01', total_kwh: 198.4, avg_power_kw: 8.27, reading_count: 1440 },
  { machine_id: 3, machine_name: 'Coolant Pump 1',   machine_ref: 'P-01', total_kwh: 18.2,  avg_power_kw: 0.76, reading_count: 1440 },
  { machine_id: 4, machine_name: 'Conveyor Motor 2', machine_ref: 'M-02', total_kwh: 53.1,  avg_power_kw: 2.21, reading_count: 1380 },
  { machine_id: 5, machine_name: 'HVAC Unit 1',      machine_ref: 'H-01', total_kwh: 0,     avg_power_kw: 0,    reading_count: 0 },
]

/* ── SEC ── */
export const MOCK_SEC = [
  { machine_id: 1, machine_ref: 'M-01', machine_name: 'Drive Motor 1',    product_type: 'Widget A', unit_type: 'units', energy_kwh: 67.8,  good_units: 842,  sec_kwh_per_unit: 0.0805, sec_note: null },
  { machine_id: 2, machine_ref: 'C-01', machine_name: 'Air Compressor 1', product_type: null,        unit_type: null,    energy_kwh: 198.4, good_units: null, sec_kwh_per_unit: null,   sec_note: 'No production data for this period' },
  { machine_id: 4, machine_ref: 'M-02', machine_name: 'Conveyor Motor 2', product_type: 'Widget B', unit_type: 'units', energy_kwh: 53.1,  good_units: 1204, sec_kwh_per_unit: 0.0441, sec_note: null },
]

/* ── Verification records ── */
export const MOCK_VERIFICATIONS = [
  { id: 1, machine_id: 3, maintenance_action_id: 3, before_period_start: subDays(now,3).toISOString(), before_period_end: subDays(now,2).toISOString(), after_period_start: subHours(now,6).toISOString(), after_period_end: subHours(now,1).toISOString(), before_sec: null, after_sec: null, before_avg_temp: 44.1, after_avg_temp: 43.8, before_avg_vibration: null, after_avg_vibration: null, result: 'improved', notes: 'Auxiliary shutdown fix confirmed. Energy saved during idle.', data_coverage_before: 48, data_coverage_after: 10, analysis_details: { before_energy_kwh: 18.2, after_energy_kwh: 1.2, caution: 'Short after-period. Continue monitoring.' }, created_at: subHours(now,1).toISOString() },
]

/* ── Dashboard summary ── */
export const MOCK_DASHBOARD = {
  period_hours: 24,
  total_machines: 5,
  machine_status_counts: { running: 2, idle: 1, stopped: 1, fault: 1, maintenance: 0, unknown: 0 },
  machines: MOCK_MACHINES,
  energy_total_kwh: 337.5,
  active_alerts: MOCK_ALERTS.filter(a => a.status !== 'resolved').map(a => ({
    id: a.id, machine_id: a.machine_id, severity: a.severity, status: a.status,
    title: a.title, message: a.message, last_occurred_at: a.last_occurred_at,
    source_mode: a.source_mode,
  })),
  alert_counts: { critical: 2, warning: 1, info: 1 },
  pending_maintenance: 2,
  data_freshness: { latest_reading_at: subMinutes(now, 1).toISOString(), has_live_data: false },
  device_counts: { total: 5, online: 3, stale: 1, offline: 1 },
  energy_trend: MOCK_ENERGY_TREND,
  server_time: now.toISOString(),
}
