import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDevices, rotateCredential, revokeDevice } from '../api'
import { MOCK_DEVICES, MOCK_MACHINES } from '../data/mock'
import { motion } from 'framer-motion'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { Radio, RefreshCw, XCircle, AlertTriangle, Wifi, WifiOff, Signal } from 'lucide-react'
import clsx from 'clsx'

const DEV_COLOR: Record<string, { color: string; bg: string; glow: string }> = {
  online:  { color: '#22c55e', bg: 'bg-emerald-500/12', glow: '0 0 12px rgba(34,197,94,0.2)' },
  stale:   { color: '#f59e0b', bg: 'bg-amber-500/12',   glow: '0 0 12px rgba(245,158,11,0.15)' },
  offline: { color: '#ef4444', bg: 'bg-red-500/12',     glow: '0 0 12px rgba(239,68,68,0.15)' },
  unknown: { color: '#6b7280', bg: 'bg-slate-500/10',   glow: 'none' },
}

function SignalBar({ dbm }: { dbm: number | null }) {
  if (!dbm) return <span className="text-white/25 text-xs">—</span>
  const pct = Math.max(0, Math.min(100, ((dbm + 100) / 60) * 100))
  const color = pct > 60 ? '#22c55e' : pct > 35 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[25, 50, 75, 100].map((t, i) => (
        <div key={i} className="w-1.5 rounded-sm transition-all"
          style={{ height: `${25 + i * 18}%`, background: pct >= t ? color : 'rgba(255,255,255,0.12)' }} />
      ))}
      <span className="ml-1.5 text-[10px] font-mono" style={{ color }}>{dbm} dBm</span>
    </div>
  )
}

export default function Devices() {
  const [newCred, setNewCred] = useState<{ id: string; cred: string } | null>(null)
  const qc = useQueryClient()

  const { data: apiDevices } = useQuery({ queryKey: ['devices'], queryFn: () => getDevices().then(r => r.data), retry: false, refetchInterval: 30000 })
  const devices = (apiDevices?.length ? apiDevices : MOCK_DEVICES) as typeof MOCK_DEVICES
  const machineMap = Object.fromEntries(MOCK_MACHINES.map(m => [m.id, m]))

  const rotateMut = useMutation({
    mutationFn: (id: number) => rotateCredential(id),
    onSuccess: (data, id) => {
      const d = devices.find(dev => dev.id === id)
      setNewCred({ id: d?.device_id || String(id), cred: data.data.credential || 'demo-credential-rotated' })
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
  const revokeMut = useMutation({
    mutationFn: (id: number) => revokeDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  const online = devices.filter(d => d.status === 'online').length
  const stale  = devices.filter(d => d.status === 'stale').length
  const offline = devices.filter(d => d.status === 'offline').length

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen" style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>
      <div className="fade-in"><h1 className="text-2xl font-black text-white mb-1">Devices</h1><p className="text-white/40 text-sm">ESP32 nodes · credentials · heartbeat monitoring</p></div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 fade-in-delay-1">
        {[['Total',devices.length,'#94a3b8'],['Online',online,'#22c55e'],['Stale',stale,'#f59e0b'],['Offline',offline,'#ef4444']].map(([l,v,c]) => (
          <div key={l as string} className="metric-tile flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${c}15` }}>
              {l === 'Online' ? <Wifi size={15} style={{ color: c as string }} /> : l === 'Offline' ? <WifiOff size={15} style={{ color: c as string }} /> : <Radio size={15} style={{ color: c as string }} />}
            </div>
            <div><div className="text-xl font-black" style={{ color: c as string }}>{v as number}</div><div className="text-xs text-white/30">{l as string}</div></div>
          </div>
        ))}
      </div>

      {/* New credential alert */}
      {newCred && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-amber-400 mb-1">New credential for {newCred.id} — save this now</p>
              <code className="text-xs font-mono bg-black/40 px-3 py-2 rounded-lg block break-all text-white/70">{newCred.cred}</code>
              <p className="text-xs text-white/30 mt-1.5">This credential will not be shown again.</p>
            </div>
            <button onClick={() => setNewCred(null)} className="btn-icon w-7 h-7 shrink-0">×</button>
          </div>
        </motion.div>
      )}

      {/* Device cards */}
      <div className="space-y-3 fade-in-delay-2">
        {devices.map((d, i) => {
          const cfg = DEV_COLOR[d.status] || DEV_COLOR.unknown
          const machine = machineMap[d.machine_id ?? -1]
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="card"
              style={{ boxShadow: cfg.glow !== 'none' ? cfg.glow : undefined }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Status icon */}
                  <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                    {d.status === 'online' ? <Wifi size={20} style={{ color: cfg.color }} /> :
                     d.status === 'offline' ? <WifiOff size={20} style={{ color: cfg.color }} /> :
                     <Signal size={20} style={{ color: cfg.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-white">{d.name || d.device_id}</h3>
                      <code className="text-xs text-white/35 font-mono">{d.device_id}</code>
                      <span className={clsx('text-xs font-bold capitalize px-2 py-0.5 rounded-full', cfg.bg, 'border')}
                        style={{ color: cfg.color, borderColor: `${cfg.color}30` }}>{d.status}</span>
                      {d.credential_revoked && <span className="badge-critical text-xs">Revoked</span>}
                    </div>
                    {machine && <p className="text-xs text-white/40">Linked to: <span className="text-white/60 font-medium">{machine.name}</span></p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div>
                        <div className="text-[10px] text-white/25 mb-0.5">Firmware</div>
                        <div className="text-xs font-mono text-white/60">{d.firmware_version || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/25 mb-0.5">Heartbeat</div>
                        <div className="text-xs text-white/60">{d.last_heartbeat_at ? formatDistanceToNow(parseISO(d.last_heartbeat_at), { addSuffix: true }) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/25 mb-0.5">Last reading</div>
                        <div className="text-xs text-white/60">{d.last_reading_at ? formatDistanceToNow(parseISO(d.last_reading_at), { addSuffix: true }) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/25 mb-1">Signal</div>
                        <SignalBar dbm={d.signal_strength_dbm} />
                      </div>
                    </div>
                    {/* Sensor config */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(d.sensor_config).map(([s, en]) => (
                        <span key={s} className={clsx('text-[10px] px-2 py-0.5 rounded-full border capitalize',
                          en ? 'bg-[#0F6B3E]/12 text-[#12c26b] border-[#0F6B3E]/25' : 'bg-white/[0.03] text-white/25 border-white/8')}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => rotateMut.mutate(d.id)} className="btn-secondary text-xs py-1.5 px-3" title="Rotate credential">
                    <RefreshCw size={12} />Rotate
                  </button>
                  {!d.credential_revoked && (
                    <button onClick={() => { if (confirm(`Revoke ${d.device_id}?`)) revokeMut.mutate(d.id) }} className="btn-danger text-xs py-1.5 px-3">
                      <XCircle size={12} />Revoke
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
