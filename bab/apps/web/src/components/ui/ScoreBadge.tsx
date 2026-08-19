import { cn, formatScore, getCategoryBadgeClass, getCategoryLabel } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | null | undefined
  category?: string | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ScoreBadge({ score, category, size = 'md', showLabel = true }: ScoreBadgeProps) {
  const badgeClass = getCategoryBadgeClass(category)
  const label = getCategoryLabel(category)

  return (
    <div className={cn('score-badge', badgeClass, {
      'text-[10px] px-1.5 py-0.5': size === 'sm',
      'text-xs px-2 py-1': size === 'md',
      'text-sm px-3 py-1.5': size === 'lg',
    })}>
      <span className="font-bold">{formatScore(score)}</span>
      {showLabel && <span className="opacity-80">{label}</span>}
    </div>
  )
}