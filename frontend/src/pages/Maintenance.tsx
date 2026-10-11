import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMaintenance, createMaintenance, updateMaintenance, getMachines } from '../api'
import { MOCK_MAINTENANCE, MOCK_MACHINES } from '../data/mock'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { Wrench, Plus, PlayCircle, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

const SC: Record<string, { pill: string; dot: string }> = {
  scheduled:   { pill: 'bg-blue-500/12 text-blue-400 border border-blue-500/20', dot: '#3b82f6' },
  in_progress: { pill: 'bg-amber-500/12 text-amber-400 border border-amber-500/20', dot: '#f59e0b' },
  completed:   { pill: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20', dot: '#22c55e' },
  cancelled:   { pill: 'bg-slate-500/10 text-slate-400 border border-slate-500/15', dot: '#6b7280' },
}

export default function Maintenance() {
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({ machine_id: '', title: '', description: '', scheduled_at: '' })
  const qc = useQueryClient()

  const { data: apiTasks } = useQuery({ queryKey: ['maintenance'], queryFn: () => getMaintenance().then(r => r.data), retry: false })
  const tasks = (apiTasks?.length ? apiTasks : MOCK_MAINTENANCE) as typeof MOCK_MAINTENANCE
  const machineMap = Object.fromEntries(MOCK_MACHINES.map(m => [m.id, m]))

  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => updateMaintenance(id, data).catch(() => {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }) })
  const createMut = useMutation({ mutationFn: (d: any) => createMaintenance(d).catch(() => {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); setShowForm(false); setForm({ machine_id: '', title: '', description: '', scheduled_at: '' }) } })

  const stats = { total: tasks.length, scheduled: tasks.filter(t => t.status === 'scheduled').length, in_progress: tasks.filter(t => t.status === 'in_progress').length, completed: tasks.filter(t => t.status === 'completed').length }

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen" style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>
      <div className="fade-in flex items-start justify-between">
        <div><h1 className="text-2xl font-black text-white">Maintenance</h1><p className="text-white/40 text-sm">Work orders · inspection records · verification</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={15} />New task</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 fade-in-delay-1">
        {[['Total',stats.total,'#94a3b8'],['Scheduled',stats.scheduled,'#3b82f6'],['In Progress',stats.in_progress,'#f59e0b'],['Completed',stats.completed,'#22c55e']].map(([l,v,c]) => (
          <div key={l as string} className="metric-tile text-center">
            <div className="text-2xl font-black" style={{ color: c as string }}>{v}</div>
            <div className="text-xs text-white/35">{l as string}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="card border-[#0F6B3E]/30 bg-[#0F6B3E]/5 fade-in">
              <h3 className="font-bold text-white mb-4">New maintenance task</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select className="select" value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}>
                  <option value="">Select machine</option>
                  {MOCK_MACHINES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input className="input" placeholder="Task title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <textarea className="input sm:col-span-2" rows={2} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <input className="input" type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => createMut.mutate({ machine_id: Number(form.machine_id), title: form.title, description: form.description || undefined, scheduled_at: form.scheduled_at || undefined })}
                  disabled={!form.machine_id || !form.title} className="btn-primary">Create</button>
                <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks */}
      <div className="space-y-3 fade-in-delay-2">
        {tasks.map((t, i) => {
          const m = machineMap[t.machine_id]
          const sc = SC[t.status] || SC.scheduled
          const isExp = expandedId === t.id
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={clsx('card border-l-4 transition-all', {
                'border-l-amber-400': t.status === 'in_progress',
                'border-l-blue-400': t.status === 'scheduled',
                'border-l-emerald-400': t.status === 'completed',
                'border-l-slate-600': t.status === 'cancelled',
              })}>
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpandedId(isExp ? null : t.id)}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${sc.dot}18` }}>
                  <Wrench size={16} style={{ color: sc.dot }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', sc.pill)}>
                      {t.status.replace('_', ' ')}
                    </span>
                    {m && <span className="text-xs text-white/30">{m.machine_id} · {m.zone}</span>}
                    {t.requires_verification && <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">Needs verify</span>}
                  </div>
                  <p className="font-bold text-white text-sm">{t.title}</p>
                  {t.description && !isExp && <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{t.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.scheduled_at && (
                    <span className="text-xs text-white/25 hidden sm:block">
                      {t.status === 'scheduled' ? formatDistanceToNow(parseISO(t.scheduled_at), { addSuffix: true }) : format(parseISO(t.scheduled_at), 'dd/MM')}
                    </span>
                  )}
                  {isExp ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                </div>
              </div>

              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-3 pt-3 border-t border-white/8 space-y-3">
                      {t.description && <p className="text-sm text-white/50">{t.description}</p>}
                      <div className="grid grid-cols-2 gap-3 text-xs text-white/40">
                        {t.scheduled_at && <span className="flex items-center gap-1"><Clock size={11} />Scheduled: {format(parseISO(t.scheduled_at), 'dd/MM/yyyy HH:mm')}</span>}
                        {t.started_at && <span className="flex items-center gap-1 text-amber-400"><PlayCircle size={11} />Started: {format(parseISO(t.started_at), 'dd/MM HH:mm')}</span>}
                        {t.completed_at && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11} />Completed: {format(parseISO(t.completed_at), 'dd/MM HH:mm')}</span>}
                      </div>
                      {t.findings && (
                        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3">
                          <p className="text-xs font-bold text-emerald-400 mb-1">Findings recorded</p>
                          <p className="text-xs text-white/50">{t.findings}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {t.status === 'scheduled' && (
                          <button onClick={() => updateMut.mutate({ id: t.id, data: { status: 'in_progress' } })} className="btn-primary text-xs py-1.5">
                            <PlayCircle size={12} />Start
                          </button>
                        )}
                        {t.status === 'in_progress' && (
                          <button onClick={() => updateMut.mutate({ id: t.id, data: { status: 'completed', completed_at: new Date().toISOString() } })} className="btn-primary text-xs py-1.5">
                            <CheckCircle size={12} />Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
