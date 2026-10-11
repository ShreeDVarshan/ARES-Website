import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Map, Cpu, Bell, Lightbulb, Wrench,
  BarChart3, CheckCircle, FileText, Radio, Database,
  Settings, Users, ClipboardList, LogOut, Zap,
  ChevronRight, Activity, Shield, HardHat, Wifi
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useWSStore } from '../../store/ws'
import { logout as apiLogout } from '../../api'
import { MOCK_ALERTS } from '../../data/mock'
import clsx from 'clsx'

const ALL_NAV = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',     roles: ['admin','operator','maintenance'] },
  { to: '/blueprint',     icon: Map,             label: 'Blueprint',     roles: ['admin','operator'] },
  { to: '/machines',      icon: Cpu,             label: 'Machines',      roles: ['admin','operator','maintenance'] },
  { to: '/alerts',        icon: Bell,            label: 'Alerts',        roles: ['admin','operator','maintenance'], badgeKey: 'alerts' },
  { to: '/recommendations',icon: Lightbulb,      label: 'Recommendations',roles: ['admin','operator'] },
  { to: '/maintenance',   icon: Wrench,          label: 'Maintenance',   roles: ['admin','operator','maintenance'] },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics',     roles: ['admin','operator'] },
  { to: '/verification',  icon: CheckCircle,     label: 'Verification',  roles: ['admin'] },
  { to: '/reports',       icon: FileText,        label: 'Reports',       roles: ['admin'] },
  { to: '/devices',       icon: Radio,           label: 'Devices',       roles: ['admin'] },
  { to: '/data-sources',  icon: Database,        label: 'Data Sources',  roles: ['admin','operator'] },
  { to: '/settings',      icon: Settings,        label: 'Settings',      roles: ['admin','operator','maintenance'] },
]
const ADMIN_NAV = [
  { to: '/users',     icon: Users,         label: 'Users' },
  { to: '/audit-log', icon: ClipboardList, label: 'Audit Log' },
]

const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string; Icon: React.ElementType }> = {
  admin:       { color: '#ffd166', bg: 'rgba(255,209,102,0.1)',  label: 'Factory Admin',    Icon: Shield },
  operator:    { color: '#00d084', bg: 'rgba(0,208,132,0.1)',    label: 'Plant Operator',   Icon: Activity },
  maintenance: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Maintenance Staff', Icon: HardHat },
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { connected } = useWSStore()
  const navigate = useNavigate()
  const role = (user?.role || 'operator') as string
  const rc = ROLE_CONFIG[role] || ROLE_CONFIG.operator
  const nav = ALL_NAV.filter(n => n.roles.includes(role))
  const activeAlerts = MOCK_ALERTS.filter(a => a.status !== 'resolved').length

  const handleLogout = async () => {
    try { await apiLogout() } catch { /* ok */ }
    logout(); navigate('/login')
  }

  return (
    <motion.aside
      initial={{ x: -260, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-64 min-h-screen flex flex-col shrink-0 relative"
      style={{ background: 'linear-gradient(180deg, #060e0a 0%, #08130d 100%)', borderRight: '1px solid rgba(0,208,132,0.1)' }}>

      {/* Subtle top accent */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,208,132,0.5), transparent)' }} />

      {/* Logo */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(0,208,132,0.08)' }}>
        <div className="flex items-center gap-3">
          <motion.div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 relative"
            style={{ background: 'linear-gradient(135deg, #00d084, #00a866)', boxShadow: '0 0 24px rgba(0,208,132,0.4)' }}
            animate={{ boxShadow: ['0 0 20px rgba(0,208,132,0.3)', '0 0 35px rgba(0,208,132,0.6)', '0 0 20px rgba(0,208,132,0.3)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}>
            <Zap size={22} className="text-black" strokeWidth={2.5} />
          </motion.div>
          <div>
            <div className="font-black text-white text-xl tracking-tight leading-none">ARES</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: 'rgba(0,208,132,0.5)', letterSpacing: '0.08em' }}>EFFICIENCY SYSTEM</div>
          </div>
        </div>
      </div>

      {/* User role card */}
      <div className="mx-3 mt-4 rounded-xl p-3" style={{ background: rc.bg, border: `1px solid ${rc.color}20` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${rc.color}20` }}>
            <rc.Icon size={15} style={{ color: rc.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{user?.username || '—'}</div>
            <div className="text-xs font-semibold" style={{ color: rc.color }}>{rc.label}</div>
          </div>
          <motion.div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: connected ? '#00d084' : '#ff6b6b', boxShadow: `0 0 8px ${connected ? '#00d084' : '#ff6b6b'}` }}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, label, badgeKey }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 3, transition: { duration: 0.1 } }}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer select-none transition-all duration-150 group',
                  isActive ? 'text-black' : 'text-white/50 hover:text-white/90'
                )}
                style={isActive ? {
                  background: `linear-gradient(135deg, ${rc.color}, ${rc.color}cc)`,
                  boxShadow: `0 4px 16px ${rc.color}30`,
                } : {}}>
                <Icon size={16} className={isActive ? 'text-black' : 'group-hover:text-white/90'} />
                <span className="flex-1">{label}</span>
                {badgeKey === 'alerts' && activeAlerts > 0 && (
                  <span className={clsx(
                    'text-xs font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    isActive ? 'bg-black/20 text-black' : 'bg-red-500/20 text-red-400'
                  )}>{activeAlerts}</span>
                )}
                {isActive && <ChevronRight size={12} className="text-black/60" />}
              </motion.div>
            )}
          </NavLink>
        ))}

        {role === 'admin' && (
          <>
            <div className="pt-4 pb-2 px-1 flex items-center gap-2">
              <div className="flex-1 h-px" style={{ background: 'rgba(0,208,132,0.1)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(0,208,132,0.35)' }}>Admin</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(0,208,132,0.1)' }} />
            </div>
            {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}>
                {({ isActive }) => (
                  <div className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    isActive ? 'text-black' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                  )} style={isActive ? { background: 'linear-gradient(135deg, #ffd166, #ffb830)', boxShadow: '0 4px 12px rgba(255,209,102,0.25)' } : {}}>
                    <Icon size={16} />
                    <span>{label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Status strip */}
      <div className="mx-3 mb-3 rounded-xl p-3" style={{ background: 'rgba(0,208,132,0.04)', border: '1px solid rgba(0,208,132,0.08)' }}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Wifi size={11} style={{ color: connected ? '#00d084' : '#ff6b6b' }} />
            <span style={{ color: connected ? '#00d084' : '#ff6b6b' }} className="font-bold">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <span className="text-white/25 font-medium">WebSocket</span>
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-5" style={{ borderTop: '1px solid rgba(0,208,132,0.06)' }}>
        <button onClick={handleLogout}
          className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-red-400 transition-all group"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <LogOut size={15} className="group-hover:translate-x-0.5 transition-transform" />
          <span>Sign out</span>
        </button>
      </div>
    </motion.aside>
  )
}
