import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Float, MeshDistortMaterial } from '@react-three/drei'
import { useQuery } from '@tanstack/react-query'
import { getMachines, getMachineReadings } from '../api'
import { MOCK_MACHINES, MOCK_READINGS, MOCK_ALERTS, MOCK_DEVICES } from '../data/mock'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Cpu, ChevronRight, Activity, Thermometer, Zap, Radio, AlertTriangle, Box } from 'lucide-react'
import clsx from 'clsx'
import * as THREE from 'three'

/* ── 3D Machine Model ── */
function MotorModel({ color }: { color: string }) {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.4}>
      <group>
        {/* Motor body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.7, 0.7, 1.4, 32]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Shaft */}
        <mesh position={[0, 0, 0.9]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 16]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* End caps */}
        {[-0.75, 0.75].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[0.72, 0.72, 0.08, 32]} />
            <meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        {/* Cooling fins */}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} rotation={[0, (i * Math.PI * 2) / 8, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.05, 1.3, 0.78]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        {/* Sensor dot */}
        <mesh position={[0.72, 0.3, 0]}>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color="#00d084" emissive="#00d084" emissiveIntensity={1.5} />
        </mesh>
      </group>
    </Float>
  )
}

function CompressorModel({ color }: { color: string }) {
  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.3}>
      <group>
        <mesh castShadow>
          <boxGeometry args={[1.4, 1.0, 1.1]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.4, 16]} />
          <meshStandardMaterial color="#333" metalness={0.6} />
        </mesh>
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.9, 16]} />
          <meshStandardMaterial color="#555" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Fault glow */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.42, 1.02, 1.12]} />
          <meshStandardMaterial color="#ef4444" transparent opacity={0.08} side={THREE.BackSide} />
        </mesh>
      </group>
    </Float>
  )
}

function PumpModel({ color }: { color: string }) {
  return (
    <Float speed={1.8} rotationIntensity={0.35} floatIntensity={0.5}>
      <group>
        <mesh castShadow>
          <torusGeometry args={[0.5, 0.25, 12, 32]} />
          <meshStandardMaterial color={color} metalness={0.75} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.28]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.7, 16]} />
          <meshStandardMaterial color="#555" metalness={0.8} />
        </mesh>
      </group>
    </Float>
  )
}

function Machine3DView({ machine }: { machine: typeof MOCK_MACHINES[0] }) {
  const isFault = machine.status === 'fault'
  const color = isFault ? '#ef4444' : machine.status === 'running' ? '#00d084' : '#4b5563'

  return (
    <div className="w-full h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-[#040c08] to-[#081409]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[3, 2, 4]} fov={45} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <pointLight position={[-3, 2, -2]} intensity={0.6} color={color} />
        <pointLight position={[0, -2, 0]} intensity={0.3} color="#C1A44D" />
        <Suspense fallback={null}>
          {machine.machine_type === 'motor' && <MotorModel color={color} />}
          {machine.machine_type === 'compressor' && <CompressorModel color={color} />}
          {machine.machine_type === 'pump' && <PumpModel color={color} />}
          {!['motor','compressor','pump'].includes(machine.machine_type) && <MotorModel color={color} />}
        </Suspense>
        <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={1.2}
          minDistance={3} maxDistance={8} />
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1.1, 0]} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color="#0a1510" metalness={0.1} roughness={1} transparent opacity={0.6} />
        </mesh>
        {/* Ground reflection */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1.08, 0]}>
          <planeGeometry args={[3, 3]} />
          <meshStandardMaterial color={color} transparent opacity={0.06} />
        </mesh>
        <fog attach="fog" args={['#0a1510', 8, 20]} />
      </Canvas>
      <div className="absolute bottom-2 right-2">
        <span className="text-[10px] text-white/20">3D concept · drag to rotate</span>
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  running: '#00d084', idle: '#ffd166', stopped: '#6b7280',
  fault: '#ff6b6b', maintenance: '#a78bfa', unknown: '#4b5563',
}

export default function Machines() {
  const [selected, setSelected] = useState<typeof MOCK_MACHINES[0] | null>(null)
  const [show3D, setShow3D] = useState(true)

  const { data: apiMachines } = useQuery({ queryKey: ['machines'], queryFn: () => getMachines().then(r => r.data), retry: false, refetchInterval: 30000 })
  const machines = (apiMachines?.length ? apiMachines : MOCK_MACHINES) as typeof MOCK_MACHINES

  const chartData = selected ? (MOCK_READINGS[selected.id] || []).slice(-48).reverse() : []
  const selectedAlerts = selected ? MOCK_ALERTS.filter(a => a.machine_id === selected.id && a.status !== 'resolved') : []
  const selectedDevice = selected ? MOCK_DEVICES.find(d => d.machine_id === selected.id) : null

  return (
    <div className="p-5 space-y-5 overflow-auto min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0d1a14 0%, #0f1c17 100%)' }}>

      <div className="flex items-center justify-between fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Machines</h1>
          <p className="text-white/40 text-sm">{machines.length} machines · sensor readings & 3D view</p>
        </div>
        <button onClick={() => setShow3D(!show3D)}
          className={clsx('btn-secondary text-sm', show3D && 'border-[#0F6B3E]/40 text-[#0F6B3E]')}>
          <Box size={14} />{show3D ? 'Hide 3D' : 'Show 3D'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <div className="space-y-2 fade-in-delay-1">
          {machines.map((m, i) => (
            <motion.button key={m.id} onClick={() => setSelected(m)}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
              className={clsx('w-full card text-left flex items-center gap-3 transition-all',
                selected?.id === m.id ? 'border-[#0F6B3E]/50 bg-[#0F6B3E]/6' : 'hover:border-white/15',
                m.status === 'fault' && selected?.id !== m.id && 'border-red-500/25')}>
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${STATUS_COLOR[m.status]}15` }}>
                  <Cpu size={18} style={{ color: STATUS_COLOR[m.status] }} />
                </div>
                <motion.div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1a14]"
                  style={{ background: STATUS_COLOR[m.status] }}
                  animate={m.status === 'running' ? { scale: [1, 1.4, 1] } : m.status === 'fault' ? { opacity: [1, 0.4, 1] } : {}}
                  transition={{ duration: m.status === 'fault' ? 1 : 2.5, repeat: Infinity }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{m.name}</div>
                <div className="text-xs text-white/35 flex items-center gap-2">
                  <span className="capitalize font-medium" style={{ color: STATUS_COLOR[m.status] }}>{m.status}</span>
                  {m.latest && <span>· {m.latest.power_kw?.toFixed(1)} kW</span>}
                </div>
              </div>
              {(m as any).active_alerts > 0 && <span className="badge-critical text-[10px]">{(m as any).active_alerts}</span>}
              <ChevronRight size={13} className="text-white/20 shrink-0" />
            </motion.button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 fade-in-delay-2">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} className="space-y-4">

                {/* 3D view */}
                {show3D && (
                  <div className="relative">
                    <Machine3DView machine={selected} />
                  </div>
                )}

                {/* Readings */}
                <div className="card-glow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white">{selected.name}</h3>
                      <p className="text-xs text-white/35">{selected.machine_id} · {selected.zone} · {selected.machine_type}</p>
                    </div>
                    <div className={clsx('badge capitalize', `badge-${selected.status}`)}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[selected.status] }} />
                      {selected.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Power', val: selected.latest?.power_kw?.toFixed(2) ?? '—', unit: 'kW', c: '#00d084' },
                      { label: 'Temp',  val: selected.latest?.temperature_c?.toFixed(1) ?? '—', unit: '°C', c: (selected.latest?.temperature_c ?? 0) > 80 ? '#ef4444' : '#f59e0b' },
                      { label: 'Vib',   val: (selected.latest as any)?.vibration_rms?.toFixed(2) ?? '—', unit: 'mm/s', c: '#8b5cf6' },
                      { label: 'Load',  val: (selected.latest?.power_kw && selected.rated_power_kw) ? `${((selected.latest.power_kw / selected.rated_power_kw) * 100).toFixed(0)}` : '—', unit: '%', c: '#C1A44D' },
                    ].map(item => (
                      <div key={item.label} className="bg-white/[0.04] rounded-xl p-3 text-center">
                        <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{item.label}</div>
                        <div className="text-xl font-black font-mono" style={{ color: item.c }}>{item.val}</div>
                        <div className="text-[9px] text-white/25">{item.unit}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sensor trend */}
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="observed_at" tickFormatter={t => format(parseISO(t), 'HH:mm')}
                          tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} interval={7} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0d2218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                          labelFormatter={t => format(parseISO(t as string), 'HH:mm')} />
                        {selected.installed_sensors.includes('power') && <Line type="monotone" dataKey="power_kw" name="Power kW" stroke="#00d084" strokeWidth={1.5} dot={false} />}
                        {selected.installed_sensors.includes('temperature') && <Line type="monotone" dataKey="temperature_c" name="Temp °C" stroke="#f59e0b" strokeWidth={1.5} dot={false} />}
                        {selected.installed_sensors.includes('vibration') && <Line type="monotone" dataKey="vibration_rms" name="Vib mm/s" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-white/25 text-sm">No readings</div>
                  )}
                </div>

                {/* Machine info row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="card">
                    <p className="text-xs font-bold text-white/30 mb-2 uppercase tracking-widest">Sensors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.installed_sensors.map(s => (
                        <span key={s} className="text-xs bg-[#0F6B3E]/15 text-[#12c26b] border border-[#0F6B3E]/20 px-2 py-0.5 rounded-full capitalize">{s}</span>
                      ))}
                    </div>
                    {selected.rated_power_kw && <p className="text-xs text-white/30 mt-2">Rated: {selected.rated_power_kw} kW</p>}
                  </div>
                  <div className="card">
                    <p className="text-xs font-bold text-white/30 mb-2 uppercase tracking-widest">Device</p>
                    {selectedDevice ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: selectedDevice.status === 'online' ? '#22c55e' : selectedDevice.status === 'stale' ? '#f59e0b' : '#ef4444' }} />
                          <span className="text-sm font-bold text-white">{selectedDevice.device_id}</span>
                        </div>
                        <p className="text-xs text-white/30">FW {selectedDevice.firmware_version} · {selectedDevice.sampling_interval_seconds}s interval</p>
                        {selectedDevice.signal_strength_dbm && <p className="text-xs text-white/30">Signal: {selectedDevice.signal_strength_dbm} dBm</p>}
                      </div>
                    ) : <p className="text-xs text-white/25">No device linked</p>}
                  </div>
                </div>

                {/* Alerts */}
                {selectedAlerts.length > 0 && (
                  <div className="space-y-2">
                    {selectedAlerts.map(a => (
                      <div key={a.id} className={clsx('card border-l-4', a.severity === 'critical' ? 'border-l-red-500' : 'border-l-amber-500')}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle size={13} style={{ color: a.severity === 'critical' ? '#ef4444' : '#f59e0b' }} />
                          <span className="text-sm font-bold text-white">{a.title}</span>
                        </div>
                        <p className="text-xs text-white/40">{a.recommended_action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card flex flex-col items-center justify-center h-64 text-center">
                <Cpu size={40} className="text-white/10 mb-3" />
                <p className="text-white/30 font-semibold">Select a machine</p>
                <p className="text-white/20 text-sm mt-1">View live readings, 3D model and diagnostics</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
