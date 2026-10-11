import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, acknowledgeAlert } from '../../api'
import { MOCK_DASHBOARD, MOCK_MACHINES, MOCK_ALERTS, MOCK_READINGS } from '../../data/mock'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Activity, CheckCircle, AlertTriangle, Cpu, Zap, Clock, ChevronRight, Eye } from 'lucide-react'
import clsx from 'clsx'

const STATUS_C: Record<string, string> = {
  running: '#00d084', idle: '#ffd166', stopped: '#6b7280',
  fault: '#ff6b6b', maintenance: '#a78bfa', unknown: '#4b5563',
}

function AnimatedGauge({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  const pct = Math.min(value / max, 1)
  const r = 38, circ = 2 * Math.PI * r
  const dash = pct * circ * 0.75  // 3/4 arc
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[135deg]">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
          <motion.circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${animated * circ * 0.75} ${circ - animated * circ * 0.75}` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white leading-none">{value}</span>
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{unit}</span>
        </div>
      </div>
      <span className="text-xs font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
    </div>
  )
}

const TIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl" style={{ background: '#0d2218', border: '1px solid rgba(0,208,132,0.2)' }}>
      <p style={{ color: 'rgba(0,208,132,0.6)' }} className="mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  )
}

export default function OperatorDashboard() {
  const qc = useQueryClient()
  const { data: apiData } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard(24).then(r => r.data), retry: false })
  const data = apiData || MOCK_DASHBOARD
  const machines = (data.machines?.length ? data.machines : MOCK_MACHINES) as typeof MOCK_MACHINES
  const openAlerts = MOCK_ALERTS.filter(a => a.status === 'new' || a.status === 'assigned')

  const [selectedId, setSelectedId] = useState<number>(machines[0]?.id || 1)
  const selectedM = machines.find(m => m.id === selectedId) || machines[0]
  const chartData = selectedM ? (MOCK_READINGS[selectedM.id] || []).slice(-32).reverse() : []

  const ackMut = useMutation({
    mutationFn: (id: number) => acknowledgeAlert(id).catch(() => {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const stats = [
    { label: 'Running',  val: data.machine_status_counts?.running ?? 2, icon: Cpu,           color: '#00d084' },
    { label: 'Alerts',   val: openAlerts.length,                         icon: AlertTriangle,  color: '#ff6b6b' },
    { label: 'kWh Today',val: Math.round(data.energy_total_kwh ?? 338),  icon: Zap,            color: '#ffd166' },
    { label: 'Tasks',    val: data.pending_maintenance ?? 2,             icon: Clock,          color: '#a78bfa' },
  ]

  return (
    <div className="min-h-screen overflow-auto bg-app-vivid">
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4 backdrop-blur-xl"
        style={{ background: 'rgba(6,14,10,0.85)', borderBottom: '1px solid rgba(0,208,132,0.1)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Operator Dashboard</h1>
            <p style={{ color: 'rgba(0,208,132,0.6)' }} className="text-sm font-medium">
              {format(new Date(), 'EEEE, d MMM · HH:mm')} · Plant floor monitoring
            </p>
          </div>
          {openAlerts.length > 0 && (
            <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
              style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-red-400" />
              {openAlerts.length} alert{openAlerts.length > 1 ? 's' : ''} need attention
            </motion.div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-up">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }} className="metric-tile flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}15` }}>
                <s.icon size={19} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-black text-white leading-none">{s.val}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Machine selector */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }} className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest px-1"
              style={{ color: 'rgba(0,208,132,0.6)' }}>Live Machines</h3>
            {machines.map(m => (
              <motion.button key={m.id} onClick={() => setSelectedId(m.id)}
                whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}
                className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-all relative overflow-hidden"
                style={{
                  background: selectedId === m.id
                    ? `linear-gradient(135deg, ${STATUS_C[m.status]}15 0%, rgba(0,0,0,0.2) 100%)`
                    : 'rgba(13,31,22,0.6)',
                  border: `1px solid ${selectedId === m.id ? STATUS_C[m.status] + '40' : 'rgba(0,208,132,0.1)'}`,
                  boxShadow: selectedId === m.id ? `0 0 20px ${STATUS_C[m.status]}18` : 'none',
                }}>
                {/* Animated status indicator */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${STATUS_C[m.status]}15` }}>
                    <Cpu size={20} style={{ color: STATUS_C[m.status] }} />
                  </div>
                  {m.status === 'running' && (
                    <motion.div className="absolute inset-0 rounded-xl"
                      style={{ border: `1px solid ${STATUS_C[m.status]}50` }}
                      animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity }} />
                  )}
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                    style={{ background: STATUS_C[m.status], borderColor: '#060e0a',
                             boxShadow: `0 0 6px ${STATUS_C[m.status]}` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-white truncate">{m.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold capitalize" style={{ color: STATUS_C[m.status] }}>{m.status}</span>
                    {m.latest && (
                      <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {m.latest.power_kw?.toFixed(1)} kW
                      </span>
                    )}
                  </div>
                  {/* Mini load bar */}
                  {m.latest?.power_kw && (m as any).rated_power_kw && (
                    <div className="progress-bar mt-2">
                      <motion.div className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((m.latest.power_kw / (m as any).rated_power_kw) * 100), 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
                    </div>
                  )}
                </div>
                {(m as any).active_alerts > 0 && (
                  <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ background: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)' }}>
                    {(m as any).active_alerts}
                  </div>
                )}
                <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} className="shrink-0" />
              </motion.button>
            ))}
          </motion.div>

          {/* Machine detail */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="wait">
              {selectedM && (
                <motion.div key={selectedM.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4">

                  {/* Live metrics */}
                  <div className="card-vivid">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-xl font-black text-white">{selectedM.name}</h3>
                        <p className="text-sm" style={{ color: 'rgba(0,208,132,0.5)' }}>
                          {selectedM.machine_id} · {selectedM.zone} · {selectedM.machine_type}
                        </p>
                      </div>
                      <div className={clsx('badge capitalize', `badge-${selectedM.status}`)}>
                        <motion.span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: STATUS_C[selectedM.status] }}
                          animate={{ scale: selectedM.status === 'running' ? [1, 1.5, 1] : 1 }}
                          transition={{ duration: 1.5, repeat: Infinity }} />
                        {selectedM.status}
                      </div>
                    </div>

                    {/* Gauges */}
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      <AnimatedGauge value={selectedM.latest?.power_kw ?? 0} max={(selectedM as any).rated_power_kw || 10}
                        label="Power" unit="kW" color="#00d084" />
                      <AnimatedGauge value={selectedM.latest?.temperature_c ?? 0} max={100}
                        label="Temperature" unit="°C"
                        color={(selectedM.latest?.temperature_c ?? 0) > 80 ? '#ff6b6b' : '#ffd166'} />
                      <AnimatedGauge value={(selectedM.latest as any)?.vibration_rms ?? 0} max={12}
                        label="Vibration" unit="mm/s" color="#a78bfa" />
                    </div>

                    {/* Trend chart */}
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <defs>
                            {[['p','#00d084'],['t','#ffd166'],['v','#a78bfa']].map(([id,c]) => (
                              <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,208,132,0.05)" />
                          <XAxis dataKey="observed_at" tickFormatter={t => format(parseISO(t), 'HH:mm')}
                            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<TIP />} labelFormatter={t => format(parseISO(t as string), 'HH:mm')} />
                          {selectedM.installed_sensors.includes('power') && (
                            <Area type="monotone" dataKey="power_kw" name="Power kW" stroke="#00d084" strokeWidth={1.5} fill="url(#gp)" dot={false} />
                          )}
                          {selectedM.installed_sensors.includes('temperature') && (
                            <Area type="monotone" dataKey="temperature_c" name="Temp °C" stroke="#ffd166" strokeWidth={1.5} fill="url(#gt)" dot={false} />
                          )}
                          {selectedM.installed_sensors.includes('vibration') && (
                            <Area type="monotone" dataKey="vibration_rms" name="Vib mm/s" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gv)" dot={false} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-36 flex items-center justify-center"
                        style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
                        No readings available
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <span className="badge-sim text-xs">Simulation data</span>
                      {selectedM.latest?.observed_at && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Updated {format(parseISO(selectedM.latest.observed_at), 'HH:mm:ss')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Machine alerts */}
                  {MOCK_ALERTS.filter(a => a.machine_id === selectedM.id && a.status !== 'resolved').map(a => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-4 relative overflow-hidden"
                      style={{
                        background: a.severity === 'critical' ? 'rgba(30,8,8,0.9)' : 'rgba(20,15,5,0.9)',
                        border: `1px solid ${a.severity === 'critical' ? 'rgba(255,107,107,0.3)' : 'rgba(255,209,102,0.25)'}`,
                        boxShadow: a.severity === 'critical' ? '0 0 30px rgba(255,107,107,0.08)' : 'none',
                      }}>
                      {/* Left accent */}
                      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                        style={{ background: a.severity === 'critical' ? '#ff6b6b' : '#ffd166' }} />
                      <div className="pl-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={clsx('badge', `badge-${a.severity}`)}>{a.severity}</span>
                            </div>
                            <p className="text-sm font-black text-white">{a.title}</p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{a.message}</p>
                          </div>
                          {a.status === 'new' && (
                            <button onClick={() => ackMut.mutate(a.id)} className="btn-secondary text-xs py-1.5 shrink-0">
                              <CheckCircle size={12} />Ack
                            </button>
                          )}
                        </div>
                        {a.recommended_action && (
                          <div className="mt-3 rounded-xl p-3"
                            style={{ background: 'rgba(0,208,132,0.06)', border: '1px solid rgba(0,208,132,0.15)' }}>
                            <p className="text-xs font-bold mb-0.5" style={{ color: '#00d084' }}>Recommended action</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{a.recommended_action}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
