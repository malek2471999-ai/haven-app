'use client'

import { ExternalLink, Bookmark, Globe, Users, Newspaper, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { cn, getDomainFromUrl, truncate } from '@/lib/utils'
import type { SearchResult } from '@/lib/api'

interface ResultCardProps {
  result: SearchResult
  onSave?: (result: SearchResult) => void
  onOpen?: (result: SearchResult) => void
}

const sourceIcons: Record<string, any> = {
  social: Users,
  news: Newspaper,
  forum: MessageCircle,
  image: ImageIcon,
  website: Globe,
}

export function ResultCard({ result, onSave, onOpen }: ResultCardProps) {
  const domain = result.domain || getDomainFromUrl(result.source_url)
  const SourceIcon = sourceIcons[result.source_type || 'website'] || Globe

  return (
    <div
      className="glass-card hover:bg-white/10 transition-all duration-200 cursor-pointer active:scale-[0.98]"
      onClick={() => onOpen?.(result)}
    >
      <div className="flex gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
          {result.thumbnail_url || result.image_url ? (
            <img
              src={result.thumbnail_url || result.image_url || ''}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <SourceIcon size={24} className="text-white/20" />
            </div>
          )}
          <div className="absolute top-1 right-1">
            <ScoreBadge score={result.final_score} category={result.result_category} size="sm" showLabel={false} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-bab-400 text-xs font-medium">{domain}</p>
              <h3 className="text-white text-sm font-semibold mt-0.5 line-clamp-2">
                {truncate(result.page_title || 'Untitled Page', 80)}
              </h3>
            </div>
          </div>

          {result.page_description && (
            <p className="text-white/40 text-xs mt-1 line-clamp-1">
              {truncate(result.page_description, 100)}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <ScoreBadge score={result.final_score} category={result.result_category} size="sm" />
            <span className="text-white/20 text-[10px]">•</span>
            <div className="flex items-center gap-1 text-white/30 text-[10px]">
              <SourceIcon size={10} />
              <span className="capitalize">{result.source_type || 'web'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSave?.(result) }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Bookmark size={16} className="text-white/40" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); window.open(result.source_url, '_blank') }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={16} className="text-white/40" />
          </button>
        </div>
      </div>
    </div>
  )
}
