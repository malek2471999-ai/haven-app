'use client'

import { useState } from 'react'
import { ArrowLeft, Trash2, Shield, Eye, Clock, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import Link from 'next/link'

export default function PrivacyPage() {
  const [autoDelete, setAutoDelete] = useState(true)
  const [privateMode, setPrivateMode] = useState(false)
  const [historyDisabled, setHistoryDisabled] = useState(false)

  const handleDeleteHistory = async () => {
    try {
      await api.clearHistory()
    } catch {}
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-40 glass-strong border-b border-white/10 px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2">
            <ArrowLeft size={20} className="text-white/60" />
          </Link>
          <h1 className="text-lg font-bold text-white">Privacy Center</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <div className="glass-card space-y-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-bab-400" />
            <h2 className="text-white font-semibold">Data Protection</h2>
          </div>
          <p className="text-white/50 text-sm">
            BAB collects the minimum data required to provide the service. Your images are processed securely and can be auto-deleted.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleRow
            icon={<Trash2 size={18} />}
            title="Auto Delete Images"
            description="Automatically delete uploaded images after search"
            enabled={autoDelete}
            onToggle={() => setAutoDelete(!autoDelete)}
          />
          <ToggleRow
            icon={<Lock size={18} />}
            title="Private Search Mode"
            description="Don't save search history or uploaded images"
            enabled={privateMode}
            onToggle={() => setPrivateMode(!privateMode)}
          />
          <ToggleRow
            icon={<Clock size={18} />}
            title="Disable Search History"
            description="Stop saving search history"
            enabled={historyDisabled}
            onToggle={() => setHistoryDisabled(!historyDisabled)}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-white/40 text-xs font-semibold uppercase tracking-wider px-1">Danger Zone</h2>
          <Button onClick={handleDeleteHistory} variant="danger" fullWidth>
            <Trash2 size={18} />
            Delete All Search History
          </Button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ icon, title, description, enabled, onToggle }: {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="glass-card flex items-center gap-4 w-full text-left hover:bg-white/10 transition-all"
    >
      <div className="text-white/40">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-white/40 text-xs">{description}</p>
      </div>
      <div className={`w-12 h-7 rounded-full p-1 transition-colors ${enabled ? 'bg-bab-600' : 'bg-white/10'}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  )
}