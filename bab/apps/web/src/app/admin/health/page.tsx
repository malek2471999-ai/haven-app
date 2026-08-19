'use client'

import { useState, useEffect } from 'react'
import { Activity, Database, HardDrive, Server, Cpu, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function AdminHealth() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadHealth() }, [])

  const loadHealth = async () => {
    setLoading(true)
    try { setHealth(await api.getSystemHealth()) } catch {} finally { setLoading(false) }
  }

  const services = [
    { name: 'API Server', status: health?.api_server, icon: Server },
    { name: 'Database', status: health?.database, icon: Database },
    { name: 'Storage', status: health?.storage, icon: HardDrive },
    { name: 'Similarity Engine', status: health?.similarity_engine, icon: Cpu },
  ]

  const statusConfig = (s: string) => {
    switch (s) {
      case 'operational': return { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Operational' }
      case 'degraded': return { color: 'bg-amber-500', text: 'text-amber-400', label: 'Degraded' }
      case 'down': return { color: 'bg-red-500', text: 'text-red-400', label: 'Down' }
      default: return { color: 'bg-white/20', text: 'text-white/40', label: 'Unknown' }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">System Health</h2>
        <Button onClick={loadHealth} variant="secondary" size="sm" loading={loading}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((s, i) => {
          const config = statusConfig(s.status || 'unknown')
          return (
            <motion.div key={s.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="glass-card">
                <div className="flex items-center gap-3">
                  <s.icon size={20} className="text-white/40" />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{s.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', config.color)} />
                    <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="glass-card">
        <h3 className="text-white font-semibold mb-4">Service Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/40 text-xs">Searches Today</p>
            <p className="text-2xl font-bold text-white">{health?.searches_today ?? '—'}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Active Providers</p>
            <p className="text-2xl font-bold text-white">{health?.active_providers ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
