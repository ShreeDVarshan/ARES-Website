import { api } from './client'
import type { DashboardData, Machine, Alert, Device, MaintenanceAction, BlueprintData, VerificationRecord, SensorReading } from '../types'

// Auth
export const login = (username: string, password: string) => {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  return api.post('/api/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
export const getMe = () => api.get('/api/auth/me')
export const logout = () => api.post('/api/auth/logout')

// Dashboard
export const getDashboard = (hours = 24) =>
  api.get<DashboardData>(`/api/dashboard?hours=${hours}`)

// Machines
export const getMachines = () => api.get<Machine[]>('/api/machines')
export const getMachine = (id: number) => api.get<Machine>(`/api/machines/${id}`)
export const getMachineSummary = (id: number) => api.get(`/api/machines/${id}/summary`)
export const getMachineReadings = (id: number, hours = 24) =>
  api.get<SensorReading[]>(`/api/machines/${id}/readings?hours=${hours}`)
export const updateMachine = (id: number, data: Partial<Machine>) =>
  api.patch(`/api/machines/${id}`, data)
export const createMachine = (data: Partial<Machine>) => api.post('/api/machines', data)

// Alerts
export const getAlerts = (params?: { status?: string; severity?: string; machine_id?: number }) =>
  api.get<Alert[]>('/api/alerts', { params })
export const getAlert = (id: number) => api.get<Alert>(`/api/alerts/${id}`)
export const acknowledgeAlert = (id: number) => api.post(`/api/alerts/${id}/acknowledge`)
export const assignAlert = (id: number, assigned_to_id: number) =>
  api.post(`/api/alerts/${id}/assign?assigned_to_id=${assigned_to_id}`)
export const resolveAlert = (id: number) => api.post(`/api/alerts/${id}/resolve`)

// Devices
export const getDevices = () => api.get<Device[]>('/api/devices')
export const getDevice = (id: number) => api.get<Device>(`/api/devices/${id}`)
export const createDevice = (data: Partial<Device> & { device_id: string }) =>
  api.post('/api/devices', data)
export const rotateCredential = (id: number) => api.post(`/api/devices/${id}/rotate-credential`)
export const revokeDevice = (id: number) => api.post(`/api/devices/${id}/revoke`)

// Maintenance
export const getMaintenance = (machine_id?: number) =>
  api.get<MaintenanceAction[]>('/api/maintenance', { params: machine_id ? { machine_id } : {} })
export const createMaintenance = (data: Partial<MaintenanceAction>) =>
  api.post('/api/maintenance', data)
export const updateMaintenance = (id: number, data: Partial<MaintenanceAction>) =>
  api.patch(`/api/maintenance/${id}`, data)

// Analytics
export const getEnergyAnalytics = (hours = 168, machine_id?: number) =>
  api.get('/api/analytics/energy', { params: { hours, machine_id } })
export const getSECAnalytics = (hours = 168, machine_id?: number) =>
  api.get('/api/analytics/sec', { params: { hours, machine_id } })
export const getConditionAnalytics = (hours = 48, machine_id?: number) =>
  api.get('/api/analytics/condition', { params: { hours, machine_id } })

// Blueprint
export const getBlueprint = () => api.get('/api/blueprint')
export const saveBlueprint = (data: BlueprintData, note?: string) =>
  api.post('/api/blueprint', { data, note })
export const getBlueprintVersions = () => api.get('/api/blueprint/versions')

// Simulation
export const getSimulationScenarios = () => api.get('/api/simulation/scenarios')
export const getSimulationStatus = () => api.get('/api/simulation/status')
export const controlSimulation = (action: string, scenario?: string) =>
  api.post('/api/simulation/control', { action, scenario })

// Verification
export const getVerifications = (machine_id?: number) =>
  api.get<VerificationRecord[]>('/api/verification', { params: machine_id ? { machine_id } : {} })
export const createVerification = (data: Partial<VerificationRecord> & {
  machine_id: number
  before_period_start: string
  before_period_end: string
  after_period_start: string
  after_period_end: string
}) => api.post('/api/verification', data)

// Users
export const getUsers = () => api.get('/api/users')
export const createUser = (data: { username: string; email: string; password: string; role: string; full_name?: string }) =>
  api.post('/api/users', data)
