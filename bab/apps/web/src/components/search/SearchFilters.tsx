'use client'

import { cn } from '@/lib/utils'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'very_similar', label: 'Very Similar' },
  { id: 'similar', label: 'Similar' },
  { id: 'possible', label: 'Possible' },
  { id: 'websites', label: 'Websites' },
  { id: 'social', label: 'Social' },
  { id: 'images', label: 'Images' },
]

const sorts = [
  { id: 'highest', label: 'Highest Similarity' },
  { id: 'newest', label: 'Newest' },
  { id: 'source', label: 'Source' },
]

interface SearchFiltersProps {
  activeFilter: string
  activeSort: string
  onFilterChange: (filter: string) => void
  onSortChange: (sort: string) => void
}

export function SearchFilters({
  activeFilter,
  activeSort,
  onFilterChange,
  onSortChange,
}: SearchFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all',
              activeFilter === f.id
                ? 'bg-bab-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {sorts.map(s => (
          <button
            key={s.id}
            onClick={() => onSortChange(s.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              activeSort === s.id
                ? 'bg-white/10 text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
