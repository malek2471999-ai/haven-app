'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const stages = [
  'Preparing image...',
  'Analyzing visual features...',
  'Searching public web...',
  'Receiving results...',
  'Removing duplicates...',
  'Comparing images...',
  'Calculating similarity...',
  'Ranking matches...',
  'Building results...',
]

interface AnalyzingScreenProps {
  status: string
  currentStage?: string
}

export function AnalyzingScreen({ status, currentStage }: AnalyzingScreenProps) {
  const [activeStage, setActiveStage] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage(prev => {
        if (prev < stages.length - 1) return prev + 1
        return prev
      })
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-dark-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-12">
        <div className="relative flex items-center justify-center">
          <motion.div
            className="w-32 h-32 rounded-full border-2 border-bab-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-24 h-24 rounded-full border border-bab-400/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-16 h-16 rounded-full bg-bab-500/10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute text-3xl font-bold text-bab-400">BAB</div>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">Analyzing Image</h2>
            <p className="text-white/40 text-sm">{status}</p>
          </div>

          <div className="space-y-2">
            {stages.map((stage, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: i <= activeStage ? 1 : 0.2,
                  x: 0,
                }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'flex items-center gap-3 py-2 px-3 rounded-xl text-sm transition-all',
                  i === activeStage && 'bg-bab-500/10 text-bab-400',
                  i < activeStage && 'text-white/40',
                  i > activeStage && 'text-white/20'
                )}
              >
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  i < activeStage && 'bg-emerald-500',
                  i === activeStage && 'bg-bab-500 animate-pulse',
                  i > activeStage && 'bg-white/10'
                )} />
                <span>{stage}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
