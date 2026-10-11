import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVerifications, createVerification, getMachines } from '../api'
import { MOCK_VERIFICATIONS, MOCK_MACHINES } from '../data/mock'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { CheckCircle, TrendingDown, TrendingUp, Minus, AlertCircle, Plus } from 'lucide-react'
import clsx from 'clsx'

const RESULT_CFG = {
  improved:         { icon: TrendingDown, color: '#22c55e', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Improved' },
  no_change:        { icon: Minus,        color: '#3b82f6', bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'No change' },
  tradeoff:         { icon: TrendingUp,   color: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Trade-off detected' },
  insufficient_data:{ icon: AlertCircle,  color: '#6b7280', bg: 'bg-white/5',        border: 'border-white/10',       label: 'Insufficient data' },
}

export default function Verification() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ machine_id: '', before_start: '', before_end: '', after_start: '', after_end: '', notes: '' })
  const qc = useQueryClient()

  const { data: apiRecs } = useQuery({ queryKey: ['verifications'], queryFn: () => getVerifications().then(r => r.data), retry: false })
  const records = (apiRecs?.length ? apiRecs : MOCK_VERIFICATIONS) as typeof MOCK_VERIFICATIONS
  const machineMap = Object.fromEntries(MOCK_MACHINES.map(m => [m.id, m]))

  const createMut = useMutation({
    mutationFn: (data: any) => createVerification(data).catch(() => {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['verifications'] }); setShowForm(false) },
  })

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen" style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>
      <div className="fade-in flex items-start justify-between">
        <div><h1 className="text-2xl font-black text-white mb-1">Verification</h1>
          <p className="text-white/40 text-sm">Before/after comparison · action-to-outcome tracking</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={15} />New comparison</button>
      </div>

      {/* Caution */}
      <div className="card border border-amber-500/15 bg-amber-500/5 text-sm fade-in-delay-1">
        <p className="text-amber-400 font-bold mb-0.5">Note on causality</p>
        <p className="text-white/50">Before/after comparisons show measured changes only. Many factors can differ between periods. "Improved" means the metric changed favourably — it does not confirm a causal relationship.</p>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="card border-[#0F6B3E]/30 bg-[#0F6B3E]/5">
              <h3 className="font-bold text-white mb-4">New before/after comparison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select className="select sm:col-span-2" value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}>
                  <option value="">Select machine</option>
                  {MOCK_MACHINES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {[['before_start','Before start'],['before_end','Before end'],['after_start','After start'],['after_end','After end']].map(([k, l]) => (
                  <div key={k}><label className="text-xs text-white/30 block mb-1">{l}</label>
                    <input type="datetime-local" className="input" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
                ))}
                <textarea className="input sm:col-span-2" rows={2} placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => createMut.mutate({ machine_id: Number(form.machine_id), before_period_start: form.before_start, before_period_end: form.before_end, after_period_start: form.after_start, after_period_end: form.after_end, notes: form.notes || undefined })}
                  disabled={!form.machine_id || !form.before_start} className="btn-primary">Run comparison</button>
                <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 fade-in-delay-2">
        {records.map((r, i) => {
          const cfg = RESULT_CFG[r.result as keyof typeof RESULT_CFG] || RESULT_CFG.insufficient_data
          const Icon = cfg.icon
          const machine = machineMap[r.machine_id]
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card-glow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">{machine?.name || `Machine ${r.machine_id}`}</h3>
                  <p className="text-xs text-white/35">{r.created_at ? format(parseISO(r.created_at), 'dd MMM yyyy HH:mm') : ''}</p>
                </div>
                <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-xl border', cfg.bg, cfg.border)}>
                  <Icon size={15} style={{ color: cfg.color }} />
                  <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {['Before','After'].map((period, pi) => {
                  const sec = pi === 0 ? r.before_sec : r.after_sec
                  const temp = pi === 0 ? r.before_avg_temp : r.after_avg_temp
                  const vib = pi === 0 ? r.before_avg_vibration : r.after_avg_vibration
                  const coverage = pi === 0 ? r.data_coverage_before : r.data_coverage_after
                  return (
                    <div key={period} className="bg-white/[0.04] rounded-xl p-3">
                      <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">{period}</p>
                      <div className="space-y-1.5">
                        <MetRow label="SEC" value={sec != null ? `${(sec as number).toFixed(4)} kWh/unit` : '—'} highlight={r.result === 'improved' && pi === 1} />
                        <MetRow label="Avg Temp" value={temp != null ? `${(temp as number).toFixed(1)}°C` : '—'} />
                        <MetRow label="Avg Vib" value={vib != null ? `${(vib as number).toFixed(2)} mm/s` : '—'} />
                        <MetRow label="Readings" value={coverage?.toString() || '—'} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {r.notes && <p className="text-sm text-white/50 mb-2">{r.notes}</p>}
              <p className="text-xs text-white/20 italic">{(r.analysis_details as any)?.caution}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function MetRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/35">{label}</span>
      <span className={clsx('font-mono font-semibold', highlight ? 'text-emerald-400' : 'text-white/60')}>{value}</span>
    </div>
  )
}
