'use client'

import { useState, useEffect } from 'react'
import { Search, Clock, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

export default function AdminSearches() {
  const [searches, setSearches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAdminSearches().then(setSearches).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle size={14} className="text-emerald-400" />
    if (s === 'failed') return <XCircle size={14} className="text-red-400" />
    return <Clock size={14} className="text-amber-400 animate-spin" />
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Search Requests</h2>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-white/40 font-medium px-4 py-3">Search ID</th>
                  <th className="text-left text-white/40 font-medium px-4 py-3">Results</th>
                  <th className="text-left text-white/40 font-medium px-4 py-3">Duration</th>
                  <th className="text-left text-white/40 font-medium px-4 py-3">Providers</th>
                  <th className="text-left text-white/40 font-medium px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {searches.map(s => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 flex items-center gap-2">{statusIcon(s.status)} <span className="capitalize">{s.status}</span></td>
                    <td className="px-4 py-3 text-white/60 font-mono text-xs">{s.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-white">{s.total_results}</td>
                    <td className="px-4 py-3 text-white/60">{s.search_duration_ms ? `${s.search_duration_ms}ms` : '—'}</td>
                    <td className="px-4 py-3 text-white/60">{Array.isArray(s.providers_used) ? s.providers_used.length : 0}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{formatDateTime(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
