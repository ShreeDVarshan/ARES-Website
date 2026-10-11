import clsx from 'clsx'
import type { MachineStatus, AlertSeverity, SourceMode } from '../../types'

const STATUS_ICONS: Record<MachineStatus, string> = {
  running: '▶', idle: '⏸', stopped: '⏹', fault: '⚠', maintenance: '🔧', unknown: '?'
}

export function MachineStatusBadge({ status }: { status: MachineStatus }) {
  return (
    <span className={clsx('badge', `badge-${status}`)}>
      <span className="mr-1">{STATUS_ICONS[status]}</span>
      {status}
    </span>
  )
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const icons = { critical: '🔴', warning: '🟡', info: '🔵' }
  return (
    <span className={clsx('badge', `badge-${severity}`)}>
      <span className="mr-1">{icons[severity]}</span>
      {severity}
    </span>
  )
}

export function SourceModeBadge({ mode }: { mode: SourceMode }) {
  const labels = {
    live: 'Live',
    simulation: 'Simulation',
    imported: 'Imported',
    replay: 'Replay',
  }
  return (
    <span className={clsx('source', `source-${mode}`)}>
      {labels[mode] || mode}
    </span>
  )
}

export function DeviceStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-green-400',
    stale: 'bg-amber-400',
    offline: 'bg-red-400',
    unknown: 'bg-gray-400',
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className={clsx('w-2 h-2 rounded-full', colors[status] || 'bg-gray-400')} />
      <span className="text-sm capitalize text-white/70">{status}</span>
    </span>
  )
}
