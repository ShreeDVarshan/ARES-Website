import { ReactNode } from 'react'
import { SourceModeBadge } from './StatusBadge'
import type { SourceMode } from '../../types'

interface Props {
  title: string
  subtitle?: string
  sourceMode?: SourceMode | null
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, sourceMode, actions }: Props) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-offwhite">{title}</h1>
          {sourceMode && <SourceModeBadge mode={sourceMode} />}
        </div>
        {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
