import { LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={28} className="text-white/30" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white/70 mb-2">{title}</h3>
      {description && <p className="text-sm text-white/40 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
