import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function GlassCard({ children, className, onClick, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card',
        hover && 'cursor-pointer hover:bg-white/10 transition-all duration-200 active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}