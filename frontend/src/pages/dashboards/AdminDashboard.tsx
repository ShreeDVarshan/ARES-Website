import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../../api'
import { MOCK_DASHBOARD, MOCK_ALERTS, MOCK_MACHINES, MOCK_ENERGY_TREND, MOCK_MACHINE_ENERGY } from '../../data/mock'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Zap, AlertTriangle, Cpu, Wrench, TrendingDown, Radio, Activity, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const STATUS_C: Record<string, string> = {
  running: '#00d084', idle: '#ffd166', stopped: '#6b7280',
  fault: '#ff6b6b', maintenance: '#a78bfa', unknown: '#4b5563',
}
const BAR_COLORS = ['#00d084','#ffd166','#a78bfa','#60a5fa','#ff6b6b']

/* Animated count-up number */
function CountUp({ to, duration = 1200, decimals = 0 }: { to: number; duration?: number; decimals?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0; const step = to / (duration / 16)
    const t = setInterval(() => { start = Math.min(start + step, to); setVal(start); if (start >= to) clearInterval(t) }, 16)
    return () => clearInterval(t)
  }, [to, duration])
  return <>{decimals > 0 ? val.toFixed(decimals) : Math.round(val)}</>
}

/* Glowing ring gauge */
function RingGauge({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  const pct = Math.min(value / max, 1)
  const r = 40; const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${pct * circ} ${(1 - pct) * circ}` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white">{value.toFixed(1)}</span>
          <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{unit}</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
    </div>
  )
}

/* Custom tooltip */
const TIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-2xl" style={{ background: '#0d2218', border: '1px solid rgba(0,208,132,0.25)' }}>
      <p className="mb-1.5 font-semibold" style={{ color: 'rgba(0,208,132,0.6)' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  )
}

/* Live ticker bar */
function LiveTicker({ machines }: { machines: typeof MOCK_MACHINES }) {
  const items = machines.flatMap(m => m.latest ? [
    `${m.machine_id}  ⚡ ${m.latest.power_kw?.toFixed(2)} kW`,
    `${m.machine_id}  🌡 ${m.latest.temperature_c?.toFixed(1)}°C`,
  ] : [])
  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ background: 'rgba(0,208,132,0.04)', border: '1px solid rgba(0,208,132,0.1)' }}>
      <div className="flex items-center gap-4 px-4 py-2.5">
        <div className="shrink-0 flex items-center gap-2">
          <motion.div className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          <span className="text-xs font-black tracking-widest uppercase" style={{ color: '#00d084' }}>Live</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex gap-12 ticker whitespace-nowrap" style={{ width: 'max-content' }}>
            {[...items, ...items].map((item, i) => (
              <span key={i} className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: apiData } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard(24).then(r => r.data), retry: false })
  const data = apiData || MOCK_DASHBOARD
  const isMock = !apiData
  const machines = (data.machines?.length ? data.machines : MOCK_MACHINES) as typeof MOCK_MACHINES
  const alerts = MOCK_ALERTS.filter(a => a.status !== 'resolved')
  const energyTrend = (data.energy_trend?.some((d: any) => d.energy_kwh > 0) ? data.energy_trend : MOCK_ENERGY_TREND).slice(-24)

  return (
    <div className="min-h-screen overflow-auto" style={{ background: 'linear-gradient(160deg, #040c08 0%, #081409 50%, #040c08 100%)' }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-6 py-4 backdrop-blur-xl"
        style={{ background: 'rgba(4,12,8,0.85)', borderBottom: '1px solid rgba(0,208,132,0.1)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black"
              style={{ background: 'linear-gradient(135deg, #ffffff, rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Factory Command
            </h1>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(0,208,132,0.6)' }}>
              {format(new Date(), 'EEEE, d MMM yyyy · HH:mm')} · Admin
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isMock && (
              <div className="badge-sim flex items-center gap-2 text-xs">
                <Activity size={11} />Demo data
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Ticker */}
        <div className="fade-up"><LiveTicker machines={machines} /></div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up-1">
          {[
            { icon: Cpu,           label: 'Machines',     val: data.total_machines ?? 5,         sub: `${data.machine_status_counts?.running ?? 2} running`, color: '#00d084' },
            { icon: Zap,           label: 'Energy Today', val: data.energy_total_kwh ?? 337.5,   sub: 'kWh consumed',  color: '#ffd166', decimals: 1 },
            { icon: AlertTriangle, label: 'Active Alerts',val: alerts.length,                    sub: `${data.alert_counts?.critical ?? 2} critical`, color: '#ff6b6b' },
            { icon: Wrench,        label: 'Pending Tasks',val: data.pending_maintenance ?? 2,    sub: 'maintenance',   color: '#a78bfa' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="relative rounded-2xl p-5 overflow-hidden group cursor-default"
              style={{
                background: `linear-gradient(135deg, ${s.color}08 0%, rgba(0,0,0,0.3) 100%)`,
                border: `1px solid ${s.color}18`,
                boxShadow: `0 0 40px ${s.color}08`,
                transition: 'all 0.2s ease',
              }}
              whileHover={{ borderColor: `${s.color}35`, boxShadow: `0 0 40px ${s.color}15`, y: -2 }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}15` }}>
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              </div>
              <div className="text-3xl font-black text-white mb-1">
                <CountUp to={typeof s.val === 'number' ? s.val : 0} decimals={(s as any).decimals || 0} />
                {(s as any).decimals && ' '}
              </div>
              <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
              <div className="text-xs mt-0.5" style={{ color: `${s.color}70` }}>{s.sub}</div>
              {/* Corner glow */}
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${s.color}12 0%, transparent 70%)` }} />
            </motion.div>
          ))}
        </div>

        {/* Device status row */}
        <div className="grid grid-cols-4 gap-3 fade-up-2">
          {[
            { label: 'Online',  val: data.device_counts?.online  ?? 3, color: '#00d084' },
            { label: 'Stale',   val: data.device_counts?.stale   ?? 1, color: '#ffd166' },
            { label: 'Offline', val: data.device_counts?.offline ?? 1, color: '#ff6b6b' },
            { label: 'Total',   val: data.device_counts?.total   ?? 5, color: '#60a5fa' },
          ].map((d, i) => (
            <motion.div key={d.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i + 0.2 }}
              className="metric-tile flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${d.color}12` }}>
                  <Radio size={16} style={{ color: d.color }} />
                </div>
                {d.label === 'Online' && (
                  <motion.div className="absolute inset-0 rounded-xl"
                    style={{ border: `1px solid ${d.color}50` }}
                    animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }} />
                )}
              </div>
              <div>
                <div className="text-xl font-black text-white">{d.val}</div>
                <div className="text-xs font-semibold" style={{ color: d.color }}>{d.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-up-2">
          {/* Energy area */}
          <div className="lg:col-span-2 card-vivid">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white">Energy Consumption</h3>
              <span className="text-xs font-semibold" style={{ color: 'rgba(0,208,132,0.5)' }}>24h · kWh/hr</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={energyTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d084" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00d084" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,208,132,0.06)" />
                <XAxis dataKey="time" tickFormatter={t => format(parseISO(t), 'HH:mm')}
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TIP />} labelFormatter={t => format(parseISO(t as string), 'HH:mm')} />
                <Area type="monotone" dataKey="energy_kwh" name="kWh" stroke="#00d084" strokeWidth={2}
                  fill="url(#eg)" dot={false} activeDot={{ r: 5, fill: '#00d084', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Bar chart */}
          <div className="card-vivid">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white">By Machine</h3>
              <span className="text-xs" style={{ color: 'rgba(0,208,132,0.5)' }}>24h</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={MOCK_MACHINE_ENERGY.filter(m => m.total_kwh > 0)} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,208,132,0.06)" />
                <XAxis dataKey="machine_ref" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TIP />} />
                <Bar dataKey="total_kwh" name="kWh" radius={[6, 6, 0, 0]}>
                  {MOCK_MACHINE_ENERGY.filter(m => m.total_kwh > 0).map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]}
                      style={{ filter: `drop-shadow(0 0 4px ${BAR_COLORS[i % BAR_COLORS.length]}60)` }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machines + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 fade-up-3">
          {/* Machines */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'rgba(0,208,132,0.6)' }}>Machine Status</h3>
            {machines.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                className="rounded-2xl p-4 relative overflow-hidden cursor-pointer"
                style={{ background: 'rgba(13,31,22,0.7)', border: `1px solid ${(m as any).active_alerts > 0 ? 'rgba(255,107,107,0.2)' : 'rgba(0,208,132,0.1)'}` }}
                whileHover={{ borderColor: `${STATUS_C[m.status]}35`, y: -2, transition: { duration: 0.15 } }}>
                <div className="flex items-center gap-4">
                  {/* Status icon */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${STATUS_C[m.status]}12` }}>
                      <Cpu size={20} style={{ color: STATUS_C[m.status] }} />
                    </div>
                    {m.status === 'running' && (
                      <motion.div className="absolute inset-0 rounded-xl"
                        style={{ border: `1px solid ${STATUS_C[m.status]}60` }}
                        animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }} />
                    )}
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                      style={{ background: STATUS_C[m.status], borderColor: '#040c08', boxShadow: `0 0 8px ${STATUS_C[m.status]}` }} />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-white text-sm">{m.name}</span>
                      <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.machine_id}</span>
                      {(m as any).active_alerts > 0 && <span className="badge-critical text-[10px]">{(m as any).active_alerts}</span>}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.zone} · {m.machine_type}</div>
                    {/* Load bar */}
                    {m.latest?.power_kw && (m as any).rated_power_kw && (
                      <div className="mt-2 progress-bar">
                        <motion.div className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((m.latest.power_kw / (m as any).rated_power_kw) * 100, 100)}%` }}
                          transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.05 + 0.3 }} />
                      </div>
                    )}
                  </div>
                  {/* Metrics */}
                  {m.latest && (
                    <div className="grid grid-cols-3 gap-2 shrink-0">
                      {[
                        { v: m.latest.power_kw?.toFixed(1), u: 'kW', c: '#00d084' },
                        { v: m.latest.temperature_c?.toFixed(0), u: '°C', c: m.latest.temperature_c! > 80 ? '#ff6b6b' : '#ffd166' },
                        { v: (m.latest as any).vibration_rms?.toFixed(1) ?? '—', u: 'mm/s', c: '#a78bfa' },
                      ].map((item, j) => (
                        <div key={j} className="text-center rounded-xl px-2 py-1.5"
                          style={{ background: `${item.c}08` }}>
                          <div className="text-sm font-black font-mono" style={{ color: item.c }}>{item.v}</div>
                          <div className="text-[9px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>{item.u}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={clsx('badge capitalize shrink-0', `badge-${m.status}`)}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_C[m.status] }} />
                    {m.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Alerts + Gauges */}
          <div className="lg:col-span-2 space-y-4">
            {/* Gauges */}
            <div className="card-vivid">
              <h3 className="font-black text-white text-sm mb-4">C-01 Live Condition</h3>
              <div className="flex justify-around">
                <RingGauge value={89.5} max={120} color="#ff6b6b" label="Temperature" unit="°C" />
                <RingGauge value={8.7}  max={15}  color="#ffd166" label="Vibration"   unit="mm/s" />
                <RingGauge value={8.81} max={11}  color="#00d084" label="Power"       unit="kW" />
              </div>
              <div className="mt-4 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.2)' }}>
                <p className="text-xs font-black" style={{ color: '#ff6b6b' }}>⚠ Critical — Air Compressor 1</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Combined temp + vibration anomaly active</p>
              </div>
            </div>

            {/* Alerts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'rgba(0,208,132,0.6)' }}>Alerts</h3>
                <span className="badge-critical text-xs">{alerts.length}</span>
              </div>
              {alerts.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 + 0.2 }}
                  className="rounded-2xl p-3.5 cursor-pointer"
                  style={{
                    background: a.severity === 'critical' ? 'rgba(20,5,5,0.9)' : 'rgba(18,13,4,0.9)',
                    border: `1px solid ${a.severity === 'critical' ? 'rgba(255,107,107,0.25)' : 'rgba(255,209,102,0.2)'}`,
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx('badge text-[10px]', `badge-${a.severity}`)}>{a.severity}</span>
                    {a.source_mode === 'simulation' && <span className="badge-sim text-[10px]">sim</span>}
                  </div>
                  <p className="text-sm font-black text-white leading-tight">{a.title}</p>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.message}</p>
                  <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {format(parseISO(a.last_occurred_at), 'HH:mm')} · ×{a.occurrence_count}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
