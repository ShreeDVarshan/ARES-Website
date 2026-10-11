import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMaintenance, updateMaintenance } from '../../api'
import { MOCK_MAINTENANCE, MOCK_MACHINES, MOCK_ALERTS, MOCK_READINGS } from '../../data/mock'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Wrench, AlertTriangle, CheckCircle, PlayCircle, Clock, Cpu, Thermometer, Activity, HardHat } from 'lucide-react'
import clsx from 'clsx'

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  scheduled:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/25' },
  in_progress: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/25' },
  completed:   { bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/25' },
  cancelled:   { bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-slate-500/25' },
}

export default function MaintenanceDashboard() {
  const qc = useQueryClient()
  const { data: apiTasks } = useQuery({ queryKey: ['maintenance'], queryFn: () => getMaintenance().then(r => r.data), retry: false })
  const tasks = (apiTasks?.length ? apiTasks : MOCK_MAINTENANCE) as typeof MOCK_MAINTENANCE

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateMaintenance(id, data).catch(() => {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }),
  })

  const machineMap = Object.fromEntries(MOCK_MACHINES.map(m => [m.id, m]))
  const pending = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const critical_alerts = MOCK_ALERTS.filter(a => a.severity === 'critical' && a.status !== 'resolved')

  // Condition readings for machines with alerts
  const compReadings = MOCK_READINGS[2]?.slice(-12).reverse() || []

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0d1a14 0%, #0f1c17 100%)' }}>

      {/* Header */}
      <div className="fade-in flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <HardHat size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Maintenance View</h1>
              <p className="text-white/40 text-sm">{format(new Date(), 'EEEE, HH:mm')} · Condition monitoring & tasks</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {critical_alerts.length > 0 && (
            <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 bg-red-500/15 border border-red-500/25 text-red-400 rounded-xl px-3 py-2 text-sm font-semibold">
              <AlertTriangle size={14} />{critical_alerts.length} critical
            </motion.div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-in-delay-1">
        {[
          { icon: Wrench,       label: 'Total Tasks',     val: tasks.length,                              color: '#8b5cf6' },
          { icon: PlayCircle,   label: 'In Progress',     val: tasks.filter(t=>t.status==='in_progress').length, color: '#f59e0b' },
          { icon: Clock,        label: 'Scheduled',       val: tasks.filter(t=>t.status==='scheduled').length,   color: '#3b82f6' },
          { icon: CheckCircle,  label: 'Completed',       val: tasks.filter(t=>t.status==='completed').length,   color: '#22c55e' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="metric-tile flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${s.color}15` }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-xl font-black text-white">{s.val}</div>
              <div className="text-xs text-white/35">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Task list */}
        <div className="space-y-3 fade-in-delay-2">
          <h3 className="text-sm font-bold text-white/70 px-1">Work Orders</h3>
          {tasks.map((t, i) => {
            const m = machineMap[t.machine_id]
            const sc = STATUS_COLOR[t.status] || STATUS_COLOR.scheduled
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 + 0.15 }}
                className={clsx('card border-l-4', {
                  'border-l-amber-400': t.status === 'in_progress',
                  'border-l-blue-400': t.status === 'scheduled',
                  'border-l-emerald-400': t.status === 'completed',
                  'border-l-slate-600': t.status === 'cancelled',
                })}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={clsx('badge text-[10px] border', sc.bg, sc.text, sc.border, 'capitalize')}>
                        {t.status.replace('_', ' ')}
                      </span>
                      {m && <span className="text-xs text-white/30">{m.machine_id} · {m.zone}</span>}
                    </div>
                    <p className="text-sm font-bold text-white mb-0.5">{t.title}</p>
                    {t.description && <p className="text-xs text-white/40 line-clamp-1">{t.description}</p>}
                    {t.findings && (
                      <div className="mt-2 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] text-emerald-400 font-semibold mb-0.5">Findings recorded</p>
                        <p className="text-[10px] text-white/40">{t.findings}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/25">
                      {t.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={9} />
                          {t.status === 'scheduled' ? formatDistanceToNow(parseISO(t.scheduled_at), { addSuffix: true }) : format(parseISO(t.scheduled_at), 'dd/MM HH:mm')}
                        </span>
                      )}
                      {t.requires_verification && (
                        <span className="text-violet-400">Needs verification</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {t.status === 'scheduled' && (
                      <button onClick={() => updateMut.mutate({ id: t.id, data: { status: 'in_progress' } })}
                        className="btn-primary text-xs py-1.5 px-3">
                        <PlayCircle size={11} />Start
                      </button>
                    )}
                    {t.status === 'in_progress' && (
                      <button onClick={() => updateMut.mutate({ id: t.id, data: { status: 'completed', completed_at: new Date().toISOString() } })}
                        className="btn-primary text-xs py-1.5 px-3">
                        <CheckCircle size={11} />Done
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Condition monitoring panel */}
        <div className="space-y-4 fade-in-delay-2">

          {/* Critical condition alert */}
          {critical_alerts.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="card border border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-3">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-400" />
                </motion.div>
                <div>
                  <p className="font-bold text-red-400 text-sm mb-1">Critical Condition — Immediate Attention</p>
                  {critical_alerts.map(a => (
                    <div key={a.id} className="mb-2">
                      <p className="text-sm text-white font-semibold">{a.title}</p>
                      <p className="text-xs text-white/50 mt-0.5">{a.message}</p>
                      <p className="text-xs text-[#12c26b] mt-1.5 bg-[#0F6B3E]/10 border border-[#0F6B3E]/20 rounded-lg px-2.5 py-1.5">{a.recommended_action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* C-01 live condition trend */}
          <div className="card-glow">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-white text-sm">C-01 Condition Trend</h3>
                <p className="text-xs text-white/30">Air Compressor 1 · Last 6 hours</p>
              </div>
              <span className="badge-critical text-xs">Fault</span>
            </div>
            {compReadings.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={compReadings} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="observed_at" tickFormatter={t => format(parseISO(t), 'HH:mm')}
                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0d2218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                    labelFormatter={t => format(parseISO(t as string), 'HH:mm')} />
                  <Line type="monotone" dataKey="temperature_c" name="Temp °C" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="vibration_rms" name="Vib mm/s" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-white/20 text-sm">No data</div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 text-center">
                <div className="text-xs text-white/40 mb-1">Temperature</div>
                <div className="text-2xl font-black text-red-400">89.5°C</div>
                <div className="text-[10px] text-red-400/60">+17.5° above warning</div>
              </div>
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 text-center">
                <div className="text-xs text-white/40 mb-1">Vibration</div>
                <div className="text-2xl font-black text-amber-400">8.7 mm/s</div>
                <div className="text-[10px] text-amber-400/60">+1.7 above warning</div>
              </div>
            </div>
          </div>

          {/* All machine condition summary */}
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-3">Machine Condition Summary</h3>
            <div className="space-y-2">
              {MOCK_MACHINES.filter(m => m.latest).map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: { running: '#22c55e', idle: '#f59e0b', stopped: '#6b7280', fault: '#ef4444', maintenance: '#8b5cf6', unknown: '#4b5563' }[m.status] || '#4b5563' }} />
                  <span className="text-sm text-white/70 flex-1 font-medium">{m.name}</span>
                  {m.latest?.temperature_c != null && (
                    <span className={clsx('text-xs font-mono', m.latest.temperature_c > 80 ? 'text-red-400' : 'text-white/40')}>
                      {m.latest.temperature_c.toFixed(1)}°C
                    </span>
                  )}
                  {m.latest?.vibration_rms != null && (
                    <span className={clsx('text-xs font-mono', m.latest.vibration_rms > 7 ? 'text-amber-400' : 'text-white/40')}>
                      {m.latest.vibration_rms.toFixed(1)} mm/s
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
