import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlueprint, saveBlueprint, getMachines } from '../api'
import { useAuthStore } from '../store/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { MOCK_MACHINES, MOCK_ALERTS, MOCK_DEVICES } from '../data/mock'
import { format, parseISO } from 'date-fns'
import { Save, ZoomIn, ZoomOut, Maximize2, Layers, Activity, AlertTriangle, Cpu, Radio, X } from 'lucide-react'
import clsx from 'clsx'

const STATUS_COLOR: Record<string, string> = {
  running: '#00d084', idle: '#ffd166', stopped: '#6b7280',
  fault: '#ff6b6b', maintenance: '#a78bfa', unknown: '#4b5563',
}
const TYPE_ICON: Record<string, string> = {
  motor: 'M', compressor: 'C', pump: 'P', conveyor: 'V', hvac: 'H', other: '?'
}
const ZONES = [
  { id: 'zone-a', name: 'Zone A — Production',  x: 60,  y: 140, w: 420, h: 360, color: 'rgba(15,107,62,0.06)' },
  { id: 'zone-b', name: 'Zone B — Utilities',   x: 530, y: 100, w: 430, h: 420, color: 'rgba(193,164,77,0.05)' },
  { id: 'zone-c', name: 'Zone C — HVAC',        x: 530, y: 530, w: 430, h: 160, color: 'rgba(139,92,246,0.05)' },
]
const PANELS = [
  { id: 'panel-1', x: 40, y: 60, label: 'MCC A' },
  { id: 'panel-2', x: 870, y: 60, label: 'MCC B' },
]

/* Animated machine marker */
function MachineMarker({ machine, isSelected, isAdmin, onSelect, onDragEnd }: any) {
  const color = STATUS_COLOR[machine.status] || '#4b5563'
  const alerts = MOCK_ALERTS.filter(a => a.machine_id === machine.id && a.status !== 'resolved')
  const device = MOCK_DEVICES.find(d => d.machine_id === machine.id)

  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onSelect(machine.id === isSelected ? null : machine.id)}>
      {/* Pulse ring for fault/running */}
      {(machine.status === 'fault' || machine.status === 'running') && (
        <motion.circle cx={machine.blueprint_x} cy={machine.blueprint_y} r="28" fill="none"
          stroke={color} strokeWidth="1" opacity={0.4}
          animate={{ r: [26, 36], opacity: [0.5, 0] }}
          transition={{ duration: machine.status === 'fault' ? 1.2 : 2.5, repeat: Infinity }} />
      )}
      {/* Selection ring */}
      {isSelected && (
        <circle cx={machine.blueprint_x} cy={machine.blueprint_y} r="32"
          fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 3" opacity={0.9} />
      )}
      {/* Background glow */}
      <circle cx={machine.blueprint_x} cy={machine.blueprint_y} r="24"
        fill={color} opacity={0.08} />
      {/* Main circle */}
      <circle cx={machine.blueprint_x} cy={machine.blueprint_y} r="18"
        fill="#0d2218" stroke={isSelected ? color : 'rgba(255,255,255,0.12)'} strokeWidth="1.5"
        style={{ filter: isSelected ? `drop-shadow(0 0 8px ${color}80)` : undefined }} />
      {/* Icon letter */}
      <text x={machine.blueprint_x} y={machine.blueprint_y + 1} textAnchor="middle"
        dominantBaseline="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">
        {TYPE_ICON[machine.machine_type] || '?'}
      </text>
      {/* Status dot */}
      <circle cx={machine.blueprint_x + 13} cy={machine.blueprint_y - 13} r="5"
        fill="#111816" stroke={color} strokeWidth="1.5" />
      <circle cx={machine.blueprint_x + 13} cy={machine.blueprint_y - 13} r="3" fill={color} />
      {/* Alert badge */}
      {alerts.length > 0 && (
        <>
          <circle cx={machine.blueprint_x - 13} cy={machine.blueprint_y - 13} r="8" fill="#ef4444" opacity={0.9} />
          <text x={machine.blueprint_x - 13} y={machine.blueprint_y - 12} textAnchor="middle"
            dominantBaseline="middle" fill="white" fontSize="8" fontWeight="800">{alerts.length}</text>
        </>
      )}
      {/* Label */}
      <text x={machine.blueprint_x} y={machine.blueprint_y + 32} textAnchor="middle"
        fill="rgba(255,255,255,0.7)" fontSize="9.5" fontFamily="Inter, sans-serif" fontWeight="600">
        {machine.name.length > 18 ? machine.name.slice(0, 17) + '…' : machine.name}
      </text>
      <text x={machine.blueprint_x} y={machine.blueprint_y + 44} textAnchor="middle"
        fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="Inter, sans-serif">
        {machine.machine_id}
      </text>
      {/* Device signal */}
      {device && (
        <text x={machine.blueprint_x} y={machine.blueprint_y + 54} textAnchor="middle"
          fill={device.status === 'online' ? '#22c55e' : device.status === 'stale' ? '#f59e0b' : '#ef4444'}
          fontSize="7.5" fontFamily="Inter, sans-serif">
          {device.status === 'online' ? `▲ ${device.signal_strength_dbm} dBm` : device.status.toUpperCase()}
        </text>
      )}
    </g>
  )
}

/* Connection lines */
function ConnectionLines() {
  const lines = [
    { from: MOCK_MACHINES[0], to: MOCK_MACHINES[3], label: 'Process', color: 'rgba(15,107,62,0.25)' },
    { from: MOCK_MACHINES[1], to: MOCK_MACHINES[2], label: 'Comms', color: 'rgba(193,164,77,0.2)' },
  ]
  return (
    <>
      {lines.map((l, i) => (
        <g key={i}>
          <line x1={l.from.blueprint_x} y1={l.from.blueprint_y}
            x2={l.to.blueprint_x} y2={l.to.blueprint_y}
            stroke={l.color} strokeWidth="1.5" strokeDasharray="5 4" />
        </g>
      ))}
    </>
  )
}

export default function Blueprint() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isDirty, setIsDirty] = useState(false)
  const [showLayers, setShowLayers] = useState(true)
  const [showDevices, setShowDevices] = useState(true)

  const { data: bp } = useQuery({ queryKey: ['blueprint'], queryFn: () => getBlueprint().then(r => r.data), retry: false })
  const { data: apiMachines } = useQuery({ queryKey: ['machines'], queryFn: () => getMachines().then(r => r.data), retry: false, refetchInterval: 15000 })
  const machines = (apiMachines?.length ? apiMachines : MOCK_MACHINES) as typeof MOCK_MACHINES

  const saveMut = useMutation({
    mutationFn: (data: any) => saveBlueprint(data, 'Manual save'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blueprint'] }); setIsDirty(false) },
  })

  const selected = machines.find(m => m.id === selectedId)
  const selectedAlerts = selectedId ? MOCK_ALERTS.filter(a => a.machine_id === selectedId && a.status !== 'resolved') : []
  const selectedDevice = selectedId ? MOCK_DEVICES.find(d => d.machine_id === selectedId) : null

  const activeAlerts = MOCK_ALERTS.filter(a => a.status !== 'resolved')

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d1a14 0%, #0f1c17 100%)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 shrink-0">
        <div>
          <h1 className="text-lg font-black text-white">Factory Blueprint</h1>
          <p className="text-xs text-white/35">Interactive 2D floorplan · {machines.length} machines · {activeAlerts.length} active alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDevices(!showDevices)}
            className={clsx('btn-icon text-xs', showDevices && 'border-[#0F6B3E]/40 text-[#0F6B3E]')}>
            <Radio size={14} />
          </button>
          <button onClick={() => setShowLayers(!showLayers)}
            className={clsx('btn-icon text-xs', showLayers && 'border-[#0F6B3E]/40 text-[#0F6B3E]')}>
            <Layers size={14} />
          </button>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1">
            <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="p-1.5 text-white/50 hover:text-white"><ZoomOut size={13} /></button>
            <span className="text-xs text-white/40 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2.5, +(z + 0.15).toFixed(2)))} className="p-1.5 text-white/50 hover:text-white"><ZoomIn size={13} /></button>
          </div>
          <button onClick={() => setZoom(1)} className="btn-icon"><Maximize2 size={13} /></button>
          {isAdmin && isDirty && (
            <button onClick={() => saveMut.mutate({ zones: [], markers: [], connections: [] })}
              className="btn-primary text-sm py-2">
              <Save size={13} />Save
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-[#060e0a] relative">
          <svg width={1000 * zoom} height={720 * zoom} viewBox="0 0 1000 720"
            style={{ display: 'block', minWidth: '100%', minHeight: '100%' }}>

            {/* Background */}
            <defs>
              <pattern id="gridp" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(15,107,62,0.06)" strokeWidth="0.5" />
              </pattern>
              <pattern id="gridp2" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="rgba(15,107,62,0.1)" strokeWidth="1" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <rect width="1000" height="720" fill="#060e0a" />
            <rect width="1000" height="720" fill="url(#gridp)" />
            <rect width="1000" height="720" fill="url(#gridp2)" opacity="0.5" />

            {/* Zones */}
            {showLayers && ZONES.map(z => (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" rx="8" />
                <text x={z.x + 12} y={z.y + 22} fill="rgba(255,255,255,0.3)"
                  fontSize="11" fontFamily="Inter" fontWeight="600">{z.name}</text>
              </g>
            ))}

            {/* Electrical panels */}
            {PANELS.map(p => (
              <g key={p.id}>
                <rect x={p.x} y={p.y} width="60" height="36" rx="4"
                  fill="#0d2218" stroke="rgba(193,164,77,0.4)" strokeWidth="1.5" />
                <text x={p.x + 30} y={p.y + 22} textAnchor="middle" fill="#C1A44D"
                  fontSize="10" fontFamily="Inter" fontWeight="700">{p.label}</text>
              </g>
            ))}

            {/* Connection lines */}
            <ConnectionLines />

            {/* Machines */}
            {machines.map(m => (
              <MachineMarker key={m.id} machine={m} isSelected={selectedId === m.id}
                isAdmin={isAdmin} onSelect={setSelectedId} />
            ))}

            {/* Device gateway icon */}
            {showDevices && (
              <g>
                <rect x="450" y="60" width="100" height="42" rx="6"
                  fill="#0d2218" stroke="rgba(15,107,62,0.35)" strokeWidth="1.5" />
                <text x="500" y="80" textAnchor="middle" fill="rgba(255,255,255,0.6)"
                  fontSize="9" fontFamily="Inter" fontWeight="700">Wi-Fi Gateway</text>
                <text x="500" y="93" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="Inter">●  Online</text>
                {machines.map(m => {
                  const d = MOCK_DEVICES.find(dev => dev.machine_id === m.id)
                  if (!d) return null
                  const col = d.status === 'online' ? '#22c55e' : d.status === 'stale' ? '#f59e0b' : '#ef4444'
                  return (
                    <line key={m.id} x1="500" y1="102" x2={m.blueprint_x} y2={m.blueprint_y - 18}
                      stroke={col} strokeWidth="0.8" strokeDasharray="3 5" opacity={0.4} />
                  )
                })}
              </g>
            )}

            {/* Legend */}
            <g transform="translate(20,640)">
              <rect width="360" height="60" rx="6" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <text x="10" y="16" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="Inter" fontWeight="700" textAnchor="start" letterSpacing="1">STATUS LEGEND</text>
              {[['#22c55e','Running'],['#f59e0b','Idle'],['#ef4444','Fault'],['#6b7280','Stopped'],['#8b5cf6','Maintenance']].map(([c,l], i) => (
                <g key={i} transform={`translate(${i * 68 + 10}, 28)`}>
                  <circle r="5" fill={c as string} />
                  <text x="8" y="4" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="Inter">{l as string}</text>
                </g>
              ))}
              <text x="10" y="52" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="Inter">Concept visualisation · {isAdmin ? 'Admin: drag markers to reposition' : 'Click markers to view details'}</text>
            </g>
          </svg>
        </div>

        {/* Side panel */}
        <div className="w-72 border-l border-white/8 flex flex-col overflow-hidden bg-[#0f1c17]">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-white">{selected.name}</h3>
                    <p className="text-xs text-white/35">{selected.machine_id} · {selected.zone}</p>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="btn-icon w-7 h-7">
                    <X size={12} />
                  </button>
                </div>
                {/* Status */}
                <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border capitalize',
                  `bg-${selected.status === 'running' ? 'emerald' : selected.status === 'fault' ? 'red' : 'amber'}-500/10`,
                  `border-${selected.status === 'running' ? 'emerald' : selected.status === 'fault' ? 'red' : 'amber'}-500/20`)}>
                  <motion.div className="w-2 h-2 rounded-full"
                    style={{ background: STATUS_COLOR[selected.status] }}
                    animate={{ scale: selected.status === 'running' ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 2, repeat: Infinity }} />
                  <span className="text-sm font-bold" style={{ color: STATUS_COLOR[selected.status] }}>{selected.status}</span>
                </div>
                {/* Live readings */}
                {selected.latest && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Power', val: selected.latest.power_kw?.toFixed(2), unit: 'kW', color: '#00d084' },
                      { label: 'Temp',  val: selected.latest.temperature_c?.toFixed(1), unit: '°C', color: (selected.latest.temperature_c ?? 0) > 80 ? '#ef4444' : '#f59e0b' },
                      { label: 'Vibration', val: (selected.latest as any).vibration_rms?.toFixed(2) ?? '—', unit: 'mm/s', color: '#8b5cf6' },
                      { label: 'Mode',  val: selected.latest.runtime_status, unit: '', color: '#94a3b8' },
                    ].map(item => (
                      <div key={item.label} className="bg-white/[0.04] rounded-xl p-2.5 text-center">
                        <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{item.label}</div>
                        <div className="font-mono font-black text-sm" style={{ color: item.color }}>{item.val ?? '—'}</div>
                        {item.unit && <div className="text-[9px] text-white/20">{item.unit}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {/* Sensors */}
                <div>
                  <p className="text-xs text-white/30 mb-2 font-semibold">Sensors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.installed_sensors.map(s => (
                      <span key={s} className="bg-[#0F6B3E]/15 text-[#12c26b] border border-[#0F6B3E]/25 px-2.5 py-1 rounded-full text-xs capitalize">{s}</span>
                    ))}
                  </div>
                </div>
                {/* Device */}
                {selectedDevice && (
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-xs text-white/30 mb-2 font-semibold">Device</p>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full"
                        style={{ background: selectedDevice.status === 'online' ? '#22c55e' : selectedDevice.status === 'stale' ? '#f59e0b' : '#ef4444' }} />
                      <span className="text-sm font-bold text-white">{selectedDevice.device_id}</span>
                      <span className="text-xs capitalize" style={{ color: selectedDevice.status === 'online' ? '#22c55e' : '#f59e0b' }}>{selectedDevice.status}</span>
                    </div>
                    {selectedDevice.signal_strength_dbm && (
                      <p className="text-xs text-white/35">Signal: {selectedDevice.signal_strength_dbm} dBm · FW {selectedDevice.firmware_version}</p>
                    )}
                  </div>
                )}
                {/* Alerts */}
                {selectedAlerts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/30 font-semibold">Active Alerts ({selectedAlerts.length})</p>
                    {selectedAlerts.map(a => (
                      <div key={a.id} className={clsx('border-l-2 pl-2 py-1',
                        a.severity === 'critical' ? 'border-l-red-500' : 'border-l-amber-500')}>
                        <p className="text-xs font-semibold text-white">{a.title}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{a.recommended_action}</p>
                      </div>
                    ))}
                  </div>
                )}
                {selected.latest?.observed_at && (
                  <p className="text-[10px] text-white/20">Updated {format(parseISO(selected.latest.observed_at), 'HH:mm:ss')} ·{' '}
                    <span className="badge-sim text-[9px]">simulation</span>
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex-1 flex flex-col">
                {/* Alert list in sidebar */}
                <div className="p-4 border-b border-white/8">
                  <h3 className="text-sm font-bold text-white mb-3">Active Alerts</h3>
                  <div className="space-y-2">
                    {activeAlerts.slice(0, 4).map(a => (
                      <button key={a.id} onClick={() => setSelectedId(a.machine_id)}
                        className={clsx('w-full text-left p-2.5 rounded-xl border transition-all hover:border-white/20 text-xs',
                          a.severity === 'critical' ? 'bg-red-500/8 border-red-500/20' : 'bg-amber-500/8 border-amber-500/15')}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.severity === 'critical' ? '#ef4444' : '#f59e0b' }} />
                          <span style={{ color: a.severity === 'critical' ? '#ef4444' : '#f59e0b' }} className="font-bold capitalize">{a.severity}</span>
                          <span className="text-white/25 ml-auto">{format(parseISO(a.last_occurred_at), 'HH:mm')}</span>
                        </div>
                        <p className="text-white/60 line-clamp-1">{a.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 flex-1 flex items-center justify-center">
                  <p className="text-white/20 text-sm text-center">Click a machine marker<br />to view details</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
