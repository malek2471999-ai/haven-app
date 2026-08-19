'use client'

import { useState, useEffect } from 'react'
import { Search, Users, CheckCircle, XCircle, Key, Database, HardDrive, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { GlassCard } from '@/components/ui/GlassCard'

export default function AdminOverview() {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    api.getSystemHealth().then(setHealth).catch(() => {})
  }, [])

  const stats = [
    { label: 'Searches Today', value: health?.searches_today ?? '—', icon: Search, color: 'text-bab-400' },
    { label: 'This Month', value: health?.searches_this_month ?? '—', icon: Search, color: 'text-blue-400' },
    { label: 'Successful', value: health?.successful_searches ?? '—', icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Failed', value: health?.failed_searches ?? '—', icon: XCircle, color: 'text-red-400' },
    { label: 'Active Providers', value: health?.active_providers ?? '—', icon: Key, color: 'text-amber-400' },
  ]

  const services = [
    { name: 'API Server', status: health?.api_server || 'unknown' },
    { name: 'Database', status: health?.database || 'unknown' },
    { name: 'Storage', status: health?.storage || 'unknown' },
    { name: 'Similarity Engine', status: health?.similarity_engine || 'unknown' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Overview</h2>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard>
              <stat.icon size={20} className={stat.color} />
              <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
              <p className="text-white/40 text-xs">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="glass-card">
        <h3 className="text-white font-semibold mb-4">System Status</h3>
        <div className="space-y-3">
          {services.map(s => (
            <div key={s.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : s.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-white text-sm">{s.name}</span>
              </div>
              <span className={`text-xs font-medium capitalize ${s.status === 'operational' ? 'text-emerald-400' : s.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
