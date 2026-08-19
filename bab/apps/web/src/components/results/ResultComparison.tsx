'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

interface ResultComparisonProps {
  originalUrl: string
  foundUrl: string
  scores: {
    visual_similarity: number
    image_hash_similarity: number
    face_region_similarity: number
    final_score: number
  }
}

export function ResultComparison({ originalUrl, foundUrl, scores }: ResultComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50)

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden aspect-square bg-white/5">
        <img src={foundUrl} alt="Found" className="absolute inset-0 w-full h-full object-cover" />

        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img src={originalUrl} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
        </div>

        <div
          className="absolute inset-y-0 w-0.5 bg-white cursor-ew-resize"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={(e) => {
            const container = e.currentTarget.parentElement
            if (!container) return
            const onMove = (ev: MouseEvent) => {
              const rect = container.getBoundingClientRect()
              const x = ev.clientX - rect.left
              setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)))
            }
            const onUp = () => {
              window.removeEventListener('mousemove', onMove)
              window.removeEventListener('mouseup', onUp)
            }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white flex items-center justify-center">
            <div className="w-1 h-4 bg-white rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/40 px-2">
        <span>Original</span>
        <span>Found</span>
      </div>

      <div className="glass-card space-y-4">
        <h3 className="text-white font-semibold">Similarity Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Visual Similarity', value: scores.visual_similarity },
            { label: 'Image Hash Similarity', value: scores.image_hash_similarity },
            { label: 'Region Similarity', value: scores.face_region_similarity },
            { label: 'Overall Score', value: scores.final_score },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">{Math.round(value * 100)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-bab-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${value * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-xs">
          Similarity metrics measure visual resemblance only and do not confirm a person&apos;s identity.
        </p>
      </div>
    </div>
  )
}
