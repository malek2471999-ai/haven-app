'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

export default function AdminLogs() {
  const [errors, setErrors] = useState<any[]>([])
  const [providerLogs, setProviderLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'errors' | 'providers'>('errors')

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const [e, p] = await Promise.all([api.getAdminLogs(), api.getProviderLogs()])
      setErrors(Array.isArray(e) ? e : [])
      setProviderLogs(Array.isArray(p) ? p : [])
    } catch {} finally { setLoading(false) }
  }

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'text-red-400 bg-red-500/20'
      case 'error': return 'text-red-400 bg-red-500/10'
      case 'warning': return 'text-amber-400 bg-amber-500/10'
      default: return 'text-white/40 bg-white/5'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Logs</h2>
        <Button onClick={loadLogs} variant="secondary" size="sm"><RefreshCw size={14} /> Refresh</Button>
      </div>

      <div className="flex gap-2">
        {(['errors', 'providers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-bab-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            {t === 'errors' ? 'Error Logs' : 'Provider Logs'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : tab === 'errors' ? (
        errors.length === 0 ? (
          <p className="text-white/30 text-center py-8">No error logs</p>
        ) : (
          <div className="space-y-2">
            {errors.map(e => (
              <div key={e.id} className="glass-card">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${severityColor(e.severity)}`}>{e.severity}</span>
                  <span className="text-white/60 text-xs">{e.service}</span>
                  <span className="text-white/30 text-xs">{e.error_code}</span>
                </div>
                <p className="text-white text-sm mt-2">{e.message}</p>
                <p className="text-white/30 text-xs mt-1">{formatDateTime(e.created_at)}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        providerLogs.length === 0 ? (
          <p className="text-white/30 text-center py-8">No provider logs</p>
        ) : (
          <div className="space-y-2">
            {providerLogs.map(l => (
              <div key={l.id} className="glass-card">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${l.response_status < 400 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {l.response_status || '—'}
                  </span>
                  <span className="text-white/60 text-xs font-mono">{l.request_method}</span>
                  <span className="text-white/40 text-xs truncate">{l.request_url}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-white/30 text-xs">
                  <span>{l.response_time_ms}ms</span>
                  <span>{formatDateTime(l.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
