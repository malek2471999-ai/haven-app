import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && <div className="text-white/20 mb-4">{icon}</div>}
      <h3 className="text-white/60 font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-white/30 text-sm mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}