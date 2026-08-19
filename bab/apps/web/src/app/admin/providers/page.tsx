'use client'

import { useState, useEffect } from 'react'
import { Key, Plus, RefreshCw, Check, X, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function AdminProviders() {
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', slug: '', api_base_url: '', api_key: '', api_secret: '',
    daily_quota: 1000, timeout_ms: 30000, is_enabled: false,
  })

  useEffect(() => { loadProviders() }, [])

  const loadProviders = async () => {
    try { setProviders(await api.getProviders()) } catch {} finally { setLoading(false) }
  }

  const handleAdd = async () => {
    try {
      await api.createProvider(form)
      setShowAdd(false)
      setForm({ name: '', slug: '', api_base_url: '', api_key: '', api_secret: '', daily_quota: 1000, timeout_ms: 30000, is_enabled: false })
      loadProviders()
    } catch {}
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    try {
      const result = await api.testProvider(id)
      setProviders(ps => ps.map(p => p.id === id ? { ...p, health_status: result.status } : p))
    } catch {} finally { setTesting(null) }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'connected': return 'text-emerald-400 bg-emerald-500/20'
      case 'degraded': return 'text-amber-400 bg-amber-500/20'
      case 'rate_limited': return 'text-orange-400 bg-orange-500/20'
      case 'invalid_credentials': return 'text-red-400 bg-red-500/20'
      case 'offline': return 'text-red-400 bg-red-500/20'
      default: return 'text-white/40 bg-white/10'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Search Providers</h2>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus size={16} /> Add Provider
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : providers.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Key size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/60 font-semibold">No search provider configured</p>
          <p className="text-white/30 text-sm mt-1">Add a provider to enable image search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="glass-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{p.name}</h3>
                    <p className="text-white/40 text-xs mt-0.5">{p.api_base_url}</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-lg capitalize', statusColor(p.health_status))}>
                    {p.health_status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-white/40 text-xs">Requests Today</p>
                    <p className="text-white font-semibold">{p.requests_today}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Quota</p>
                    <p className="text-white font-semibold">{p.daily_quota}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Avg Latency</p>
                    <p className="text-white font-semibold">{p.avg_latency_ms}ms</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={() => handleTest(p.id)} variant="secondary" size="sm" loading={testing === p.id}>
                    <RefreshCw size={14} /> Test
                  </Button>
                  <Button onClick={() => api.updateProvider(p.id, { is_enabled: !p.is_enabled }).then(loadProviders)} variant={p.is_enabled ? 'danger' : 'primary'} size="sm">
                    {p.is_enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Search Provider">
        <div className="space-y-4">
          <Input label="Provider Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Google Visual Search" />
          <Input label="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g., google" />
          <Input label="API Base URL" value={form.api_base_url} onChange={e => setForm(f => ({ ...f, api_base_url: e.target.value }))} placeholder="https://api.example.com" />
          <Input label="API Key" type="password" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} placeholder="Your API key" />
          <Input label="API Secret" type="password" value={form.api_secret} onChange={e => setForm(f => ({ ...f, api_secret: e.target.value }))} placeholder="Your API secret" />
          <Input label="Daily Quota" type="number" value={form.daily_quota} onChange={e => setForm(f => ({ ...f, daily_quota: parseInt(e.target.value) || 1000 }))} />
          <Input label="Timeout (ms)" type="number" value={form.timeout_ms} onChange={e => setForm(f => ({ ...f, timeout_ms: parseInt(e.target.value) || 30000 }))} />
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={form.is_enabled} onChange={e => setForm(f => ({ ...f, is_enabled: e.target.checked }))} className="w-5 h-5 rounded bg-white/10" />
            <span className="text-white/60 text-sm">Enable immediately</span>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowAdd(false)} variant="secondary" fullWidth>Cancel</Button>
            <Button onClick={handleAdd} fullWidth>Add Provider</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
