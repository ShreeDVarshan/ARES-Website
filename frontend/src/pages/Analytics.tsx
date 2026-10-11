import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getEnergyAnalytics, getSECAnalytics, getConditionAnalytics } from '../api'
import { MOCK_ENERGY_TREND, MOCK_MACHINE_ENERGY, MOCK_SEC, MOCK_READINGS } from '../data/mock'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { BarChart3, TrendingDown, Zap, Thermometer, Activity } from 'lucide-react'
import clsx from 'clsx'

const COLORS = ['#00d084', '#C1A44D', '#8b5cf6', '#3b82f6', '#ec4899']

const TIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d2218] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/40 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  )
}

const PERIODS = [{ l: '24h', v: 24 }, { l: '7d', v: 168 }, { l: '30d', v: 720 }]

export default function Analytics() {
  const [period, setPeriod] = useState(168)
  const [tab, setTab] = useState<'energy' | 'sec' | 'condition' | 'power'>('energy')

  // Power demand chart combining all machines
  const powerData = MOCK_READINGS[2]?.slice(-24).reverse().map((r, i) => ({
    time: r.observed_at,
    'C-01': r.power_kw,
    'M-01': MOCK_READINGS[1]?.[i]?.power_kw,
    'P-01': MOCK_READINGS[3]?.[i]?.power_kw,
    'M-02': MOCK_READINGS[4]?.[i]?.power_kw,
  })) || []

  const radarData = [
    { metric: 'Energy',     M01: 74, C01: 100, P01: 20, M02: 58 },
    { metric: 'Load %',     M01: 59, C01: 80,  P01: 37, M02: 78 },
    { metric: 'Temp ratio', M01: 52, C01: 93,  P01: 37, M02: 46 },
    { metric: 'Uptime %',   M01: 92, C01: 88,  P01: 95, M02: 86 },
    { metric: 'Efficiency', M01: 85, C01: 62,  P01: 91, M02: 88 },
  ]

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen"
      style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>

      <div className="flex items-start justify-between flex-wrap gap-3 fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Analytics</h1>
          <p className="text-white/40 text-sm">Energy · SEC · Condition · Power demand</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                period === p.v ? 'bg-[#0F6B3E] text-white' : 'bg-white/6 border border-white/10 text-white/50 hover:text-white')}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.04] border border-white/8 rounded-2xl p-1 w-fit fade-in-delay-1">
        {[['energy','Energy'],['sec','SEC'],['condition','Condition'],['power','Power Demand']] .map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={clsx('px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === k ? 'bg-[#0F6B3E] text-white shadow-[0_4px_14px_rgba(15,107,62,0.25)]'
              : 'text-white/40 hover:text-white/70')}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Energy tab ── */}
      {tab === 'energy' && (
        <div className="space-y-4 fade-in-delay-2">
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MOCK_MACHINE_ENERGY.map((m, i) => (
              <motion.div key={m.machine_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-glow text-center">
                <div className="text-xs text-white/30 mb-1">{m.machine_ref}</div>
                <div className="text-2xl font-black" style={{ color: COLORS[i] }}>{m.total_kwh || '—'}</div>
                <div className="text-xs text-white/25">kWh</div>
                {m.avg_power_kw > 0 && <div className="text-xs text-white/40 mt-1">Avg {m.avg_power_kw} kW</div>}
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area chart */}
            <div className="lg:col-span-2 card-glow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm">Hourly Consumption</h3>
                <span className="text-xs text-white/25 badge-sim">simulation</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={MOCK_ENERGY_TREND.slice(-48)} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d084" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#00d084" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tickFormatter={t => format(parseISO(t), 'HH:mm')}
                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TIP />} labelFormatter={t => format(parseISO(t as string), 'HH:mm')} />
                  <Area type="monotone" dataKey="energy_kwh" name="kWh" stroke="#00d084" strokeWidth={2} fill="url(#eg2)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Bar chart */}
            <div className="card-glow">
              <h3 className="font-bold text-white text-sm mb-4">By Machine</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MOCK_MACHINE_ENERGY.filter(m => m.total_kwh > 0)} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="machine_ref" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TIP />} />
                  <Bar dataKey="total_kwh" name="kWh" radius={[4, 4, 0, 0]}>
                    {MOCK_MACHINE_ENERGY.filter(m => m.total_kwh > 0).map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── SEC tab ── */}
      {tab === 'sec' && (
        <div className="space-y-4 fade-in-delay-2">
          <div className="card border border-amber-500/15 bg-amber-500/5 text-sm text-white/50">
            <span className="text-amber-400 font-bold">Note: </span>
            SEC = energy ÷ good units. Only calculated when production records exist. Comparison periods may differ in operating conditions.
          </div>
          {MOCK_SEC.map((m, i) => (
            <motion.div key={m.machine_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }} className="card-glow">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-white">{m.machine_name}</h3>
                  <p className="text-xs text-white/35">{m.machine_ref} {m.product_type ? `· ${m.product_type}` : ''}</p>
                </div>
                {m.sec_kwh_per_unit != null ? (
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#C1A44D]">{m.sec_kwh_per_unit}</div>
                    <div className="text-xs text-white/30">kWh / {m.unit_type || 'unit'}</div>
                  </div>
                ) : (
                  <span className="text-xs text-white/30 bg-white/5 px-3 py-1.5 rounded-full">{m.sec_note}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/8">
                <div className="text-center bg-white/[0.04] rounded-xl p-2">
                  <div className="text-xs text-white/30 mb-0.5">Energy</div>
                  <div className="font-mono font-bold text-white">{m.energy_kwh?.toFixed(1) ?? '—'} kWh</div>
                </div>
                <div className="text-center bg-white/[0.04] rounded-xl p-2">
                  <div className="text-xs text-white/30 mb-0.5">Good units</div>
                  <div className="font-mono font-bold text-white">{m.good_units?.toLocaleString() ?? '—'}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Condition tab ── */}
      {tab === 'condition' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-in-delay-2">
          {/* Radar */}
          <div className="card-glow">
            <h3 className="font-bold text-white text-sm mb-4">Machine Performance Radar</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                {['M01','C01','P01','M02'].map((k, i) => (
                  <Radar key={k} name={k.replace(/(\w+)(\d+)/, '$1-$2')} dataKey={k}
                    stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.08} strokeWidth={1.5} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0d2218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Temp/Vib table */}
          <div className="card-glow">
            <h3 className="font-bold text-white text-sm mb-4">Condition Summary</h3>
            <table className="w-full tbl">
              <thead><tr>
                <th>Machine</th><th className="text-right">Avg Temp</th><th className="text-right">Max Temp</th><th className="text-right">Avg Vib</th>
              </tr></thead>
              <tbody>
                {[
                  { name: 'M-01 Motor',      avg_t: 58.2, max_t: 71.4, avg_v: 2.8 },
                  { name: 'C-01 Compressor', avg_t: 76.8, max_t: 89.5, avg_v: 5.9 },
                  { name: 'P-01 Pump',       avg_t: 44.3, max_t: 47.1, avg_v: null },
                  { name: 'M-02 Conveyor',   avg_t: 55.1, max_t: 58.4, avg_v: null },
                ].map(row => (
                  <tr key={row.name}>
                    <td className="text-white/80 font-medium">{row.name}</td>
                    <td className={clsx('text-right font-mono', row.avg_t > 75 ? 'text-amber-400' : 'text-white/60')}>{row.avg_t}°C</td>
                    <td className={clsx('text-right font-mono', row.max_t > 80 ? 'text-red-400' : 'text-white/50')}>{row.max_t}°C</td>
                    <td className={clsx('text-right font-mono', row.avg_v && row.avg_v > 5 ? 'text-amber-400' : 'text-white/50')}>
                      {row.avg_v != null ? `${row.avg_v} mm/s` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Power demand tab ── */}
      {tab === 'power' && (
        <div className="space-y-4 fade-in-delay-2">
          <div className="card-glow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Power Demand — All Machines</h3>
              <span className="text-xs text-white/25">kW vs time</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={powerData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tickFormatter={t => format(parseISO(t), 'HH:mm')}
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TIP />} labelFormatter={t => format(parseISO(t as string), 'HH:mm')} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {['C-01','M-01','M-02','P-01'].map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i]} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
