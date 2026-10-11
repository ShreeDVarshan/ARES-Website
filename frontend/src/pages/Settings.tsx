import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/auth'
import { Settings as SettingsIcon, Users, Shield, Sliders, Plus, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'thresholds', label: 'Thresholds', icon: Sliders, adminOnly: true },
  { id: 'users', label: 'Users', icon: Users, adminOnly: true },
]

export default function Settings() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState('general')
  const tabs = TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen" style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>
      <div className="fade-in"><h1 className="text-2xl font-black text-white mb-1">Settings</h1></div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.04] border border-white/8 rounded-2xl p-1 w-fit fade-in-delay-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === t.id ? 'bg-[#0F6B3E] text-white' : 'text-white/40 hover:text-white/70')}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'general' && <GeneralTab />}
          {tab === 'thresholds' && isAdmin && <ThresholdsTab />}
          {tab === 'users' && isAdmin && <UsersTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function GeneralTab() {
  const { user } = useAuthStore()
  return (
    <div className="max-w-lg space-y-4">
      <div className="card-glow">
        <h3 className="font-bold text-white mb-4">Application</h3>
        <div className="space-y-1">
          {[
            ['System', 'ARES — Adaptive Retrofit Efficiency System'],
            ['Version', '0.1.0 (prototype)'],
            ['Backend API', import.meta.env.VITE_API_URL || 'http://localhost:8000'],
            ['Signed in as', user?.username || '—'],
            ['Role', user?.role || '—'],
            ['Factory ID', String(user?.factory_id || '—')],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <span className="text-sm text-white/40">{k}</span>
              <span className="text-sm text-white/80 font-medium capitalize">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold text-white mb-3">Source modes</h3>
        <div className="space-y-2">
          {[
            { mode: 'Live', desc: 'Authenticated device readings via REST API', color: '#22c55e', cls: 'badge-live' },
            { mode: 'Simulation', desc: 'Demo scenario generator — clearly isolated from real data', color: '#8b5cf6', cls: 'badge-sim' },
            { mode: 'Imported', desc: 'CSV historical data uploads', color: '#3b82f6', cls: 'badge-info' },
          ].map(s => (
            <div key={s.mode} className="flex items-center gap-3 py-2">
              <span className={clsx('badge text-xs', s.cls)}>{s.mode}</span>
              <span className="text-xs text-white/40">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ThresholdsTab() {
  const thresholds = [
    { label: 'Temperature warning', value: '80°C', color: '#f59e0b' },
    { label: 'Temperature critical', value: '95°C', color: '#ef4444' },
    { label: 'Vibration warning', value: '7.0 mm/s', color: '#f59e0b' },
    { label: 'Vibration critical', value: '11.0 mm/s', color: '#ef4444' },
    { label: 'Idle power warning', value: '1.5 kW', color: '#f59e0b' },
  ]
  return (
    <div className="max-w-lg">
      <div className="card-glow">
        <h3 className="font-bold text-white mb-1">Detection thresholds</h3>
        <p className="text-xs text-white/30 mb-4">Configurable via backend. UI editor coming next release.</p>
        <div className="space-y-2">
          {thresholds.map(t => (
            <div key={t.label} className="flex items-center justify-between bg-white/[0.04] rounded-xl px-4 py-3">
              <span className="text-sm text-white/60">{t.label}</span>
              <span className="font-mono font-bold text-sm" style={{ color: t.color }}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'operator', full_name: '' })

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => getUsers().then(r => r.data), retry: false })

  const createMut = useMutation({
    mutationFn: (data: any) => createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowForm(false); setForm({ username: '', email: '', password: '', role: 'operator', full_name: '' }) },
  })

  const ROLE_COLORS: Record<string, string> = { admin: '#C1A44D', operator: '#00d084', maintenance: '#8b5cf6' }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">Users ({users.length || 3})</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm"><Plus size={14} />New user</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="card border-[#0F6B3E]/30 bg-[#0F6B3E]/5">
              <h4 className="font-bold text-white mb-3">Create user</h4>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                <input className="input" placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                <input className="input" placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <div className="relative">
                  <input className="input pr-10" placeholder="Password" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <select className="select col-span-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="operator">Operator</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => createMut.mutate(form)} disabled={!form.username || !form.email || !form.password || createMut.isPending} className="btn-primary text-sm">Create</button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {(users.length ? users : [
          { id: 1, username: 'admin', email: 'admin@ares.demo', role: 'admin', is_active: true },
          { id: 2, username: 'operator', email: 'operator@ares.demo', role: 'operator', is_active: true },
          { id: 3, username: 'maintenance', email: 'maintenance@ares.demo', role: 'maintenance', is_active: true },
        ] as any[]).map((u: any) => (
          <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="card flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ROLE_COLORS[u.role]}15` }}>
              <Shield size={15} style={{ color: ROLE_COLORS[u.role] }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{u.username}</span>
                {!u.is_active && <span className="badge-critical text-xs">Disabled</span>}
              </div>
              <div className="text-xs text-white/35">{u.email}</div>
            </div>
            <span className="badge border text-xs capitalize font-bold"
              style={{ background: `${ROLE_COLORS[u.role]}12`, color: ROLE_COLORS[u.role], borderColor: `${ROLE_COLORS[u.role]}30` }}>
              {u.role}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
