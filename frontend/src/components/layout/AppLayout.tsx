import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useWSStore } from '../../store/ws'
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Info, X, Zap } from 'lucide-react'

interface Toast {
  id: number
  type: 'alert' | 'reading' | 'success' | 'info'
  title: string
  body: string
}

let _id = 0

export default function AppLayout() {
  useWebSocket()
  const { lastMessage } = useWSStore()
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = (t: Omit<Toast, 'id'>) => {
    const id = ++_id
    setToasts(prev => [...prev.slice(-4), { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 5000)
  }

  useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type === 'sensor_reading') {
      const d = lastMessage.data as any
      if (d?.temperature_c && d.temperature_c > 80) {
        push({ type: 'alert', title: 'High Temperature', body: `${d.machine_ref || 'Machine'} ${d.temperature_c.toFixed(1)}°C` })
      }
    }
    if (lastMessage.type === 'alert_update') {
      push({ type: 'success', title: 'Alert updated', body: `Alert #${lastMessage.alert_id} → ${lastMessage.status}` })
    }
    if (lastMessage.type === 'connected') {
      push({ type: 'info', title: 'Connected', body: 'Live WebSocket established' })
    }
  }, [lastMessage])

  const CFG = {
    alert:   { icon: AlertTriangle, color: '#ff6b6b',  bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.25)' },
    reading: { icon: Zap,           color: '#00d084',   bg: 'rgba(0,208,132,0.1)',   border: 'rgba(0,208,132,0.25)' },
    success: { icon: CheckCircle,   color: '#00d084',   bg: 'rgba(0,208,132,0.1)',   border: 'rgba(0,208,132,0.25)' },
    info:    { icon: Info,          color: '#60a5fa',   bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#060e0a' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 w-80 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const c = CFG[t.type]
            const Icon = c.icon
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="flex items-start gap-3 px-4 py-3 rounded-2xl pointer-events-auto"
                style={{ background: c.bg, border: `1px solid ${c.border}`, backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <Icon size={16} style={{ color: c.color }} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{t.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.body}</p>
                </div>
                <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
                  className="shrink-0 transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <X size={13} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
