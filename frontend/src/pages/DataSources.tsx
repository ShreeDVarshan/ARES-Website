import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSimulationScenarios, getSimulationStatus, controlSimulation } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Database, AlertTriangle, Wifi, Upload, Server, Check } from 'lucide-react'
import clsx from 'clsx'

const SCENARIO_ICONS: Record<string, string> = {
  normal: '✅', idle_waste: '⚡', temperature_anomaly: '🌡️',
  vibration_anomaly: '📳', combined: '⚠️', device_disconnect: '📡',
  sensor_fault: '🔧', post_maintenance: '✨',
}

export default function DataSources() {
  const [scenario, setScenario] = useState('normal')
  const qc = useQueryClient()

  const { data: scenariosData } = useQuery({ queryKey: ['sim-scenarios'], queryFn: () => getSimulationScenarios().then(r => r.data), retry: false })
  const { data: simStatus, refetch } = useQuery({ queryKey: ['sim-status'], queryFn: () => getSimulationStatus().then(r => r.data), retry: false, refetchInterval: 5000 })

  const ctrlMut = useMutation({
    mutationFn: ({ action, scenario }: { action: string; scenario?: string }) => controlSimulation(action, scenario),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sim-status', 'dashboard'] }); refetch() },
  })

  const isRunning = simStatus?.running || false
  const scenarios = scenariosData?.scenarios || [
    { id: 'normal', description: 'Normal operation — all machines within expected parameters' },
    { id: 'idle_waste', description: 'Excess idle consumption — motor drawing power when stopped' },
    { id: 'temperature_anomaly', description: 'Persistent temperature deviation on compressor' },
    { id: 'vibration_anomaly', description: 'Elevated vibration on pump (bearing issue pattern)' },
    { id: 'combined', description: 'Combined condition change — rising temperature and vibration' },
    { id: 'device_disconnect', description: 'Device disconnect — node goes offline mid-operation' },
    { id: 'sensor_fault', description: 'Sensor fault — temperature sensor reports implausible values' },
    { id: 'post_maintenance', description: 'Post-maintenance improvement — condition normalised' },
  ]

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen" style={{ background: 'linear-gradient(160deg, #040c08 0%, #060e0a 100%)' }}>
      <div className="fade-in"><h1 className="text-2xl font-black text-white mb-1">Data Sources</h1>
        <p className="text-white/40 text-sm">Live ingestion · CSV import · Simulation</p>
      </div>

      {/* Running banner */}
      <AnimatePresence>
        {isRunning && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card border border-violet-500/30 bg-violet-500/5">
            <div className="flex items-center gap-3">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Play size={14} className="text-violet-400" />
              </motion.div>
              <div>
                <p className="font-bold text-violet-300">SIMULATION ACTIVE — {simStatus?.scenario?.replace(/_/g, ' ')}</p>
                <p className="text-xs text-white/40">All readings tagged SIMULATION. Isolated from real data. Dashboard updating every 10s.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Simulation */}
        <div className="card-glow space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Server size={18} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Demo Simulation</h2>
              <p className="text-xs text-white/35">Runs through authenticated ingestion pipeline</p>
            </div>
            <span className="ml-auto badge-sim text-xs">Clearly labelled</span>
          </div>

          {/* Scenario grid */}
          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
            {scenarios.map((s: any) => (
              <label key={s.id} className={clsx(
                'flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all',
                scenario === s.id ? 'border-violet-500/40 bg-violet-500/8' : 'border-white/8 hover:border-white/15')}>
                <input type="radio" name="scenario" value={s.id} checked={scenario === s.id}
                  onChange={() => setScenario(s.id)} className="mt-0.5 accent-violet-500" />
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{SCENARIO_ICONS[s.id] || '📊'}</span>
                    <span className="capitalize">{s.id.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{s.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <button onClick={() => ctrlMut.mutate({ action: 'start', scenario })} disabled={ctrlMut.isPending}
                className="btn-primary flex-1 justify-center">
                <Play size={15} />Start simulation
              </button>
            ) : (
              <button onClick={() => ctrlMut.mutate({ action: 'pause' })} disabled={ctrlMut.isPending}
                className="btn-secondary flex-1 justify-center">
                <Pause size={15} />Pause
              </button>
            )}
            <button onClick={() => { if (confirm('Reset simulation data?')) ctrlMut.mutate({ action: 'reset' }) }}
              disabled={ctrlMut.isPending} className="btn-secondary px-3">
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Live ingestion */}
          <div className="card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 flex items-center justify-center">
                <Wifi size={16} className="text-emerald-400" />
              </div>
              <div><h2 className="font-bold text-white text-sm">Live Device Ingestion</h2>
                <p className="text-xs text-white/35">ESP32 REST API</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { method: 'POST', path: '/api/iot/readings',       desc: 'Single reading' },
                { method: 'POST', path: '/api/iot/readings/batch', desc: 'Batch (offline buffer)' },
                { method: 'POST', path: '/api/iot/heartbeat',      desc: 'Device heartbeat' },
                { method: 'GET',  path: '/api/iot/config/{id}',    desc: 'Fetch config' },
              ].map(e => (
                <div key={e.path} className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-2">
                  <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded font-mono',
                    e.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400')}>{e.method}</span>
                  <code className="text-xs font-mono text-white/50 flex-1 truncate">{e.path}</code>
                  <span className="text-[10px] text-white/25 shrink-0">{e.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-white/30 mb-1.5 font-bold uppercase tracking-widest">Required headers</p>
              <code className="text-xs font-mono text-white/50 block">X-Device-Id: NODE_001</code>
              <code className="text-xs font-mono text-white/50 block">X-Device-Credential: {'<credential>'}</code>
            </div>
          </div>

          {/* CSV import */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center">
                <Upload size={16} className="text-blue-400" />
              </div>
              <div><h2 className="font-bold text-white text-sm">CSV Import</h2>
                <p className="text-xs text-white/35">Historical energy & production data</p>
              </div>
            </div>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-white/20 transition-colors cursor-pointer">
              <Upload size={24} className="mx-auto text-white/20 mb-2" />
              <p className="text-sm text-white/40 font-medium">Drop CSV file here</p>
              <p className="text-xs text-white/20 mt-0.5">Column mapping · validation · duplicate detection</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Upload','Preview','Map columns','Validate','Import','History'].map(s => (
                <div key={s} className="flex items-center gap-1 text-xs text-white/30 bg-white/[0.03] px-2 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />{s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
