import { useState } from 'react'
import { motion } from 'framer-motion'
import { MOCK_DASHBOARD, MOCK_MACHINE_ENERGY, MOCK_SEC, MOCK_ALERTS, MOCK_MAINTENANCE } from '../data/mock'
import { format } from 'date-fns'
import { FileText, Download, BarChart3, AlertTriangle, Wrench, Zap } from 'lucide-react'
import clsx from 'clsx'

const PERIODS = [{ l: '24h', v: 24 }, { l: '7d', v: 168 }, { l: '30d', v: 720 }]

export default function Reports() {
  const [period, setPeriod] = useState(168)

  const exportCSV = () => {
    const rows = [
      ['Machine', 'Ref', 'Energy kWh', 'Avg Power kW', 'Readings'],
      ...MOCK_MACHINE_ENERGY.map(m => [m.machine_name, m.machine_ref, m.total_kwh, m.avg_power_kw, m.reading_count]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `ares-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen" style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>
      <div className="fade-in flex items-start justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-black text-white mb-1">Reports</h1>
          <p className="text-white/40 text-sm">Energy · alerts · maintenance · SEC · data provenance</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                period === p.v ? 'bg-[#0F6B3E] text-white' : 'bg-white/6 border border-white/10 text-white/50')}>
              {p.l}
            </button>
          ))}
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download size={14} />Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-in-delay-1">
        {[
          { icon: Zap,  label: 'Total Energy', val: `${MOCK_DASHBOARD.energy_total_kwh} kWh`, color: '#C1A44D', sub: 'All machines' },
          { icon: AlertTriangle, label: 'Alerts raised', val: MOCK_ALERTS.length, color: '#ef4444', sub: `${MOCK_ALERTS.filter(a=>a.severity==='critical').length} critical` },
          { icon: Wrench, label: 'Maintenance tasks', val: MOCK_MAINTENANCE.length, color: '#8b5cf6', sub: `${MOCK_MAINTENANCE.filter(t=>t.status==='completed').length} completed` },
          { icon: BarChart3, label: 'Machines monitored', val: MOCK_DASHBOARD.total_machines, color: '#00d084', sub: '3 with sensors' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card-glow">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-black text-white mb-0.5">{s.val}</div>
            <div className="text-xs text-white/40">{s.label}</div>
            <div className="text-xs text-white/25 mt-0.5">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-in-delay-2">
        {/* Energy table */}
        <div className="card-glow">
          <h3 className="font-bold text-white mb-4">Energy by Machine</h3>
          <table className="w-full tbl">
            <thead><tr>
              <th>Machine</th><th className="text-right">kWh</th><th className="text-right">Avg kW</th>
            </tr></thead>
            <tbody>
              {MOCK_MACHINE_ENERGY.map(m => (
                <tr key={m.machine_id}>
                  <td><div className="font-semibold text-white/80">{m.machine_name}</div><div className="text-xs text-white/30">{m.machine_ref}</div></td>
                  <td className="text-right font-mono text-[#C1A44D] font-bold">{m.total_kwh || '—'}</td>
                  <td className="text-right font-mono text-white/50">{m.avg_power_kw || '—'}</td>
                </tr>
              ))}
              <tr>
                <td className="font-bold text-white">Total</td>
                <td className="text-right font-mono font-black text-[#C1A44D]">{MOCK_MACHINE_ENERGY.reduce((s,m)=>s+m.total_kwh,0).toFixed(1)}</td>
                <td />
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-white/20 mt-3 italic">Simulation data · no tariff configured · cost estimates not shown</p>
        </div>

        {/* Alert summary */}
        <div className="card-glow">
          <h3 className="font-bold text-white mb-4">Alert Summary</h3>
          <table className="w-full tbl">
            <thead><tr><th>Alert</th><th>Severity</th><th>Status</th><th className="text-right">Count</th></tr></thead>
            <tbody>
              {MOCK_ALERTS.map(a => (
                <tr key={a.id}>
                  <td><div className="text-white/70 text-xs font-medium">{a.title.slice(0, 32)}…</div></td>
                  <td><span className={clsx('badge text-[10px]', `badge-${a.severity}`)}>{a.severity}</span></td>
                  <td><span className="text-xs capitalize text-white/40">{a.status}</span></td>
                  <td className="text-right text-white/50">{a.occurrence_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SEC */}
        <div className="card-glow">
          <h3 className="font-bold text-white mb-1">Specific Energy Consumption</h3>
          <p className="text-xs text-white/30 mb-4">kWh per good unit · requires production records</p>
          {MOCK_SEC.map(m => (
            <div key={m.machine_id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div><div className="font-medium text-white/80">{m.machine_name}</div>
                <div className="text-xs text-white/30">{m.machine_ref}</div></div>
              {m.sec_kwh_per_unit != null ? (
                <div className="text-right">
                  <div className="font-mono font-black text-[#C1A44D]">{m.sec_kwh_per_unit}</div>
                  <div className="text-xs text-white/25">kWh/{m.unit_type}</div>
                </div>
              ) : <span className="text-xs text-white/25">{m.sec_note}</span>}
            </div>
          ))}
        </div>

        {/* Data provenance */}
        <div className="card">
          <h3 className="font-bold text-white mb-4">Data Provenance</h3>
          <div className="space-y-3">
            {[
              { label: 'Source mode', value: 'Simulation (demo)', color: '#8b5cf6' },
              { label: 'Scenario', value: simStatus(), color: '#94a3b8' },
              { label: 'Machines', value: '5 configured, 4 with data', color: '#00d084' },
              { label: 'Period', value: `${period}h`, color: '#C1A44D' },
              { label: 'Report generated', value: format(new Date(), 'dd MMM yyyy HH:mm'), color: '#94a3b8' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-sm text-white/40">{row.label}</span>
                <span className="text-sm font-medium" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
function simStatus() { return 'Demo mode — 8 scenarios available' }
