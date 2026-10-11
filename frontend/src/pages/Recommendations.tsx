import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { MOCK_RECOMMENDATIONS, MOCK_MACHINES } from '../data/mock'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, CheckCircle, XCircle, AlertTriangle, TrendingDown, Zap, Brain } from 'lucide-react'
import clsx from 'clsx'

const PRIORITY_COLOR = ['', '#ef4444', '#f59e0b', '#C1A44D', '#3b82f6', '#6b7280']

export default function Recommendations() {
  const qc = useQueryClient()
  const { data: apiRecs } = useQuery({ queryKey: ['recommendations'], queryFn: () => api.get('/api/recommendations').then(r => r.data), retry: false })
  const recs = (apiRecs?.length ? apiRecs : MOCK_RECOMMENDATIONS) as typeof MOCK_RECOMMENDATIONS
  const machineMap = Object.fromEntries(MOCK_MACHINES.map(m => [m.id, m]))

  const dismissMut = useMutation({ mutationFn: (id: number) => api.post(`/api/recommendations/${id}/dismiss`).catch(() => {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }) })
  const actionMut = useMutation({ mutationFn: (id: number) => api.post(`/api/recommendations/${id}/action`).catch(() => {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }) })

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen" style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>
      <div className="fade-in">
        <h1 className="text-2xl font-black text-white mb-1">Recommendations</h1>
        <p className="text-white/40 text-sm">Evidence-backed actions derived from sensor readings and detection rules</p>
      </div>

      {recs.length === 0 ? (
        <div className="card text-center py-16">
          <Lightbulb size={40} className="mx-auto text-white/15 mb-3" />
          <p className="text-white/40">No active recommendations</p>
        </div>
      ) : (
        <div className="space-y-4 fade-in-delay-1">
          {recs.map((r, i) => {
            const machine = machineMap[r.machine_id]
            const pColor = PRIORITY_COLOR[r.priority] || '#6b7280'
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }} className="card-glow">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${pColor}18`, border: `1px solid ${pColor}30` }}>
                      <span className="text-base">{r.priority === 1 ? '🔴' : r.priority === 2 ? '🟡' : '🟢'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge border text-xs font-bold"
                          style={{ background: `${pColor}12`, color: pColor, borderColor: `${pColor}30` }}>
                          Priority {r.priority}
                        </span>
                        {r.is_actioned && <span className="badge-info text-xs">Actioned</span>}
                      </div>
                      <h3 className="font-bold text-white leading-snug">{r.title}</h3>
                      <p className="text-xs text-white/40 mt-0.5">{machine?.name || `Machine ${r.machine_id}`}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-white/60 mb-3">{r.description}</p>

                {/* Evidence */}
                {Object.keys(r.evidence).length > 0 && (
                  <div className="bg-white/[0.03] rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={12} className="text-[#12c26b]" />
                      <span className="text-xs font-bold text-[#12c26b] uppercase tracking-widest">Evidence</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(r.evidence).map(([k, v]) => (
                        <div key={k} className="bg-white/[0.04] rounded-lg px-2.5 py-2">
                          <div className="text-[9px] text-white/30 uppercase">{k.replace(/_/g, ' ')}</div>
                          <div className="text-sm font-mono font-bold text-white mt-0.5">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-white/8">
                  {!r.is_actioned && (
                    <button onClick={() => actionMut.mutate(r.id)} className="btn-primary text-xs py-1.5">
                      <CheckCircle size={12} />Mark actioned
                    </button>
                  )}
                  <button onClick={() => dismissMut.mutate(r.id)} className="btn-secondary text-xs py-1.5">
                    <XCircle size={12} />Dismiss
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
