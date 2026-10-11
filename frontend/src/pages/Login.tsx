import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { login } from '../api'
import { useAuthStore } from '../store/auth'
import type { AuthUser } from '../types'

function AnimatedCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!; let raf: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 0.5, hue: Math.random() > 0.7 ? 280 : 160,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.hue === 160 ? 'rgba(0,208,132,0.6)' : 'rgba(167,139,250,0.5)'
        ctx.fill()
      })
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
          const alpha = (1 - d / 120) * 0.18
          ctx.strokeStyle = `rgba(0,208,132,${alpha})`; ctx.lineWidth = 0.7; ctx.stroke()
        }
      }))
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />
}

const DEMOS = [
  { role: 'Admin',       user: 'admin',       pass: 'AresDemo2024!',  color: '#ffd166', desc: 'Full access',        roleKey: 'admin' },
  { role: 'Operator',    user: 'operator',    pass: 'Operator2024!',  color: '#00d084', desc: 'Machine monitoring', roleKey: 'operator' },
  { role: 'Maintenance', user: 'maintenance', pass: 'Maint2024!',     color: '#a78bfa', desc: 'Condition & tasks',  roleKey: 'maintenance' },
]

// Local demo auth — used as fallback when backend is unreachable
function tryDemoLogin(username: string, password: string): AuthUser | null {
  const match = DEMOS.find(d =>
    (d.user === username.trim() || `${d.user}@ares.demo` === username.trim()) &&
    d.pass === password
  )
  if (!match) return null
  const fakeToken = `demo_${match.roleKey}_${Date.now()}`
  return {
    user_id: DEMOS.indexOf(match) + 1,
    username: match.user,
    role: match.roleKey as AuthUser['role'],
    factory_id: 1,
    access_token: fakeToken,
    refresh_token: fakeToken,
  }
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  // loginWithCreds can be called directly (e.g. from demo buttons)
  const loginWithCreds = async (u: string, p: string) => {
    setError(''); setLoading(true)
    // ── Step 1: Check demo credentials instantly (no network needed) ──
    const demo = tryDemoLogin(u, p)
    if (demo) {
      setAuth(demo)
      setLoading(false)
      navigate('/dashboard')
      return
    }
    // ── Step 2: Try the live backend ──
    try {
      const { data } = await login(u, p)
      setAuth({ user_id: data.user_id, username: data.username, role: data.role,
        factory_id: data.factory_id, access_token: data.access_token,
        refresh_token: data.refresh_token } as AuthUser)
      navigate('/dashboard')
    } catch (err: unknown) {
      const status = (err as any)?.response?.status
      if (status === 401 || status === 403) {
        setError('Login failed. Check credentials.')
      } else {
        setError('Backend offline. Only demo accounts are available.')
      }
    } finally { setLoading(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginWithCreds(username, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 20% 50%, #0a2518 0%, #060e0a 50%, #0a0a1a 100%)' }}>

      <AnimatedCanvas />
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,208,132,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)' }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }} className="w-full max-w-md z-10">

        {/* Logo */}
        <motion.div className="text-center mb-8"
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}>
          <div className="relative inline-block mb-5">
            <motion.div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #00d084, #00a866)', boxShadow: '0 0 60px rgba(0,208,132,0.5)' }}
              animate={{ boxShadow: ['0 0 40px rgba(0,208,132,0.3)', '0 0 80px rgba(0,208,132,0.6)', '0 0 40px rgba(0,208,132,0.3)'] }}
              transition={{ duration: 3, repeat: Infinity }}>
              <Zap size={44} className="text-black" strokeWidth={2.5} />
            </motion.div>
            <motion.div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-400"
              style={{ boxShadow: '0 0 12px rgba(52,211,153,0.8)' }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }} />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-2"
            style={{ background: 'linear-gradient(135deg, #00d084, #06d6a0, #ffd166)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ARES
          </h1>
          <p className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(0,208,132,0.5)' }}>
            Adaptive Retrofit Efficiency System
          </p>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(13,31,22,0.98) 0%, rgba(8,16,12,0.98) 100%)',
            border: '1px solid rgba(0,208,132,0.2)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,208,132,0.08), inset 0 1px 0 rgba(0,208,132,0.1)',
          }}>

          {/* Top shimmer line */}
          <div className="absolute top-0 left-8 right-8 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,208,132,0.6), transparent)' }} />

          <h2 className="text-xl font-black text-white mb-6">Sign in to your workspace</h2>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm overflow-hidden"
                style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
                <AlertCircle size={15} />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(0,208,132,0.5)' }}>Username or email</label>
              <input className="input" type="text" value={username}
                onChange={e => setUsername(e.target.value)} placeholder="Enter username"
                autoComplete="username" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(0,208,132,0.5)' }}>Password</label>
              <div className="relative">
                <input className="input pr-12" type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
              className="w-full btn-primary justify-center py-4 text-base rounded-xl mt-2">
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full" />
              ) : <Zap size={18} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </form>
        </motion.div>

        {/* Demo accounts */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-5">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(255,255,255,0.2)' }}>Quick demo access</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMOS.map(d => (
              <motion.button key={d.role}
                onClick={() => { setUsername(d.user); setPassword(d.pass); loginWithCreds(d.user, d.pass) }}
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                className="rounded-2xl p-3.5 text-left cursor-pointer relative overflow-hidden"
                style={{ background: `${d.color}08`, border: `1px solid ${d.color}20` }}>
                <div className="text-xs font-black mb-0.5" style={{ color: d.color }}>{d.role}</div>
                <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{d.user}</div>
                <div className="text-[9px] mt-1" style={{ color: `${d.color}60` }}>{d.desc}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <p className="text-center mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.1)' }}>
          ARES v0.1 · Prototype · Not for production use
        </p>
      </motion.div>
    </div>
  )
}
