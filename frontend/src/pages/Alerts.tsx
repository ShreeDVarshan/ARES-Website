import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, acknowledgeAlert, resolveAlert, getMachines } from '../api'
import { MOCK_ALERTS, MOCK_MACHINES } from '../data/mock'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Brain, Zap, Thermometer, Activity, Clock, Filter } from 'lucide-react'
import clsx from 'clsx'

const SEV_CONFIG = {
  critical: { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/25', glow: '0 0 20px rgba(239,68,68,0.15)', label: '🔴 Critical' },
  warning:  { color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/25', glow: '0 0 20px rgba(245,158,11,0.1)', label: '🟡 Warning' },
  info:     { color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/25', glow: '0 0 20px rgba(59,130,246,0.1)', label: '🔵 Info' },
}
const STATUS_LABELS: Record<string, string> = {
  new: 'New', acknowledged: 'Acknowledged', assigned: 'Assigned',
  in_progress: 'In Progress', verification_pending: 'Pending Verify', resolved: 'Resolved',
}

/* AI diagnosis component */
function AIDiagnosis({ alert }: { alert: (typeof MOCK_ALERTS)[0] }) {
  const diagnoses: Record<string, { cause: string[]; risk: string; action: string }> = {
    combined_condition: {
      cause: ['Bearing deterioration (likely)', 'Insufficient lubrication', 'Shaft misalignment', 'Coolant flow restriction'],
      risk: 'If unaddressed: risk of bearing seizure, unplanned downtime (est. 8–24h), cascade damage to housing.',
      action: 'Inspect bearings and lubrication immediately. Do not operate above 70% load. Schedule replacement if bearing wear confirmed.',
    },
    temperature_critical: {
      cause: ['Cooling system failure', 'Blocked air vents', 'Bearing friction heat'],
      risk: 'Thermal damage to windings or seals. Winding insulation breakdown possible above 95°C.',
      action: 'Check coolant flow rate and temperature. Inspect fan operation. Allow machine to cool before restart.',
    },
    vibration_warning: {
      cause: ['Bearing wear (early stage)', 'Unbalance in rotating assembly', 'Loose mounting bolts'],
      risk: 'Vibration trending upward (+28% in 2h). If trend continues, could reach critical threshold within 4–6h.',
      action: 'Tighten mounting bolts. Check coupling condition. Schedule vibration analysis during next maintenance window.',
    },
    idle_power_excess: {
      cause: ['Auxiliary system not shutting down', 'Compressed air leak', 'Incorrect PLC timer value'],
      risk: 'Energy waste only — no immediate mechanical risk. Estimated 0.54 kWh wasted in last incident.',
      action: 'Review PLC shutdown sequence. Check for compressed air leaks. Verify auxiliary hold-off timer.',
    },
    stale_data: {
      cause: ['Wi-Fi signal degradation', 'Node power issue', 'Network congestion'],
      risk: 'Loss of monitoring coverage. Cannot detect machine faults without readings.',
      action: 'Check NODE_004 power supply and Wi-Fi signal strength. Restart node if accessible.',
    },
  }
  const d = diagnoses[alert.rule_name] || {
    cause: ['Threshold exceeded based on configured rules'],
    risk: 'Review observed values against baseline.',
    action: alert.recommended_action || 'Inspect machine.',
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 space-y-3">

      {/* Evidence */}
      {Object.keys(alert.evidence).length > 0 && (
        <div className="bg-white/[0.04] rounded-xl p-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Evidence</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(alert.evidence).map(([k, v]) => (
              <div key={k} className="bg-white/[0.04] rounded-lg px-2.5 py-2">
                <div className="text-[10px] text-white/30 uppercase tracking-wide">{k.replace(/_/g, ' ')}</div>
                <div className="text-sm font-mono font-bold text-white mt-0.5">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI diagnosis */}
      <div className="bg-[#0a1f17] border border-[#0F6B3E]/25 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-[#0F6B3E]/20 flex items-center justify-center">
            <Brain size={13} className="text-[#12c26b]" />
          </div>
          <p className="text-xs font-bold text-[#12c26b] uppercase tracking-wide">Diagnosis</p>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-white/30 mb-1 uppercase tracking-widest font-semibold">Probable causes</p>
            <ul className="space-y-0.5">
              {d.cause.map((c, i) => (
                <li key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                  <span className="text-[#12c26b] mt-0.5">→</span>{c}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg px-2.5 py-2">
            <p className="text-[10px] text-amber-400 font-semibold mb-0.5">Risk if unaddressed</p>
            <p className="text-xs text-white/50">{d.risk}</p>
          </div>
          <div className="bg-[#0F6B3E]/10 border border-[#0F6B3E]/20 rounded-lg px-2.5 py-2">
            <p className="text-[10px] text-[#12c26b] font-semibold mb-0.5">Recommended action</p>
            <p className="text-xs text-white/60">{d.action}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/[0.02] rounded-xl p-3">
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Timeline</p>
        <div className="space-y-1.5">
          <TimelineItem time={alert.first_occurred_at} event="First detected" color="#ef4444" />
          {alert.acknowledged_at && <TimelineItem time={alert.acknowledged_at} event="Acknowledged" color="#f59e0b" />}
          {alert.resolved_at && <TimelineItem time={alert.resolved_at} event="Resolved" color="#22c55e" />}
          {!alert.resolved_at && (
            <div className="flex items-center gap-2 text-xs text-white/25">
              <motion.div className="w-2 h-2 rounded-full bg-red-400"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              Ongoing · {alert.occurrence_count} occurrences
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function TimelineItem({ time, event, color }: { time: string; event: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-white/50 font-medium">{event}</span>
      <span className="text-white/25 ml-auto">{format(parseISO(time), 'HH:mm dd/MM')}</span>
    </div>
  )
}

export default function Alerts() {
  const [filter, setFilter] = useState<'active' | 'all' | 'resolved'>('active')
  const [expanded, setExpanded] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data: apiAlerts } = useQuery({
    queryKey: ['alerts', filter],
    queryFn: () => getAlerts(filter === 'active' ? {} : filter === 'resolved' ? { status: 'resolved' } : {}).then(r => r.data),
    retry: false,
  })
  const all = apiAlerts?.length ? apiAlerts : MOCK_ALERTS
  const displayed = filter === 'active' ? all.filter(a => a.status !== 'resolved')
    : filter === 'resolved' ? all.filter(a => a.status === 'resolved') : all

  const machineMap = Object.fromEntries(MOCK_MACHINES.map(m => [m.id, m]))

  const ackMut = useMutation({ mutationFn: (id: number) => acknowledgeAlert(id).catch(() => {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }) })
  const resMut = useMutation({ mutationFn: (id: number) => resolveAlert(id).catch(() => {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }) })

  const counts = { critical: displayed.filter(a => a.severity === 'critical').length, warning: displayed.filter(a => a.severity === 'warning').length, info: displayed.filter(a => a.severity === 'info').length }

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen"
      style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>

      {/* Header */}
      <div className="fade-in flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Alert System</h1>
          <p className="text-white/40 text-sm">Detect → Diagnose → Act → Verify</p>
        </div>
        <div className="flex gap-2">
          {(['active', 'all', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx('px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all',
                filter === f ? 'bg-[#0F6B3E] text-white shadow-[0_4px_14px_rgba(15,107,62,0.3)]'
                : 'bg-white/6 border border-white/10 text-white/50 hover:text-white hover:bg-white/10')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Severity counters */}
      <div className="grid grid-cols-3 gap-3 fade-in-delay-1">
        {[
          { label: 'Critical', count: counts.critical, color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { label: 'Warning',  count: counts.warning,  color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Info',     count: counts.info,     color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={clsx('metric-tile border flex items-center gap-3', s.bg, s.border)}>
            <div className="text-3xl font-black" style={{ color: s.color }}>{s.count}</div>
            <div className="text-sm text-white/50 font-medium">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3 fade-in-delay-2">
        <AnimatePresence>
          {displayed.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card text-center py-16">
              <CheckCircle size={48} className="mx-auto text-emerald-400/30 mb-3" />
              <p className="text-white/50 font-semibold">No alerts in this view</p>
            </motion.div>
          ) : displayed.map((a, i) => {
            const cfg = SEV_CONFIG[a.severity as keyof typeof SEV_CONFIG] || SEV_CONFIG.info
            const machine = machineMap[a.machine_id]
            const isExp = expanded === a.id
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                className={clsx('card border-l-4 cursor-pointer transition-all duration-200 hover:scale-[1.005]',
                  a.status === 'resolved' && 'opacity-60',
                  a.severity === 'critical' ? 'border-l-red-500' : a.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500')}
                style={{ boxShadow: isExp ? cfg.glow : undefined }}>

                <div className="flex items-start gap-3" onClick={() => setExpanded(isExp ? null : a.id)}>
                  {/* Severity icon */}
                  <motion.div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}
                    animate={a.status === 'new' && a.severity === 'critical' ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}>
                    <AlertTriangle size={16} style={{ color: cfg.color }} />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={clsx('badge border text-[10px]', cfg.bg, cfg.border)} style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className={clsx('badge text-[10px]',
                        a.status === 'new' ? 'badge-critical' : a.status === 'resolved' ? 'badge-info' : 'badge-warning')}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                      {a.source_mode === 'simulation' && <span className="badge-sim text-[10px]">simulation</span>}
                    </div>
                    <p className="font-bold text-white text-sm mb-0.5">{a.title}</p>
                    <p className="text-xs text-white/40">{machine?.name || `Machine ${a.machine_id}`} · {a.rule_name.replace(/_/g, ' ')}</p>
                    {!isExp && a.message && <p className="text-xs text-white/35 mt-1 line-clamp-1">{a.message}</p>}
                  </div>

                  <div className="flex items-start gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-white/25">{format(parseISO(a.last_occurred_at), 'HH:mm')}</div>
                      {a.occurrence_count > 1 && <div className="text-[10px] text-amber-400 font-bold mt-0.5">×{a.occurrence_count}</div>}
                    </div>
                    {isExp ? <ChevronUp size={14} className="text-white/30 mt-0.5" /> : <ChevronDown size={14} className="text-white/30 mt-0.5" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExp && <AIDiagnosis alert={a as any} />}
                </AnimatePresence>

                {isExp && a.status !== 'resolved' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/8">
                    {a.status === 'new' && (
                      <button onClick={e => { e.stopPropagation(); ackMut.mutate(a.id) }}
                        className="btn-secondary text-xs py-1.5">
                        <CheckCircle size={12} />Acknowledge
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); resMut.mutate(a.id) }}
                      className="btn-primary text-xs py-1.5">
                      <XCircle size={12} />Mark Resolved
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
