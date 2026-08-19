'use client'

import { useState, useEffect } from 'react'
import { Clock, Trash2, Search, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { api, HistoryItem } from '@/lib/api'
import { formatDate, formatScore } from '@/lib/utils'
import Link from 'next/link'

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const data = await api.getHistory()
      setHistory(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteHistoryItem(id)
      setHistory(h => h.filter(item => item.id !== id))
    } catch {}
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-40 glass-strong border-b border-white/10 px-4 py-3 safe-top">
        <h1 className="text-lg font-bold text-white">History</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={<Clock size={48} />}
            title="No searches yet"
            description="Your search history will appear here"
            action={
              <Link href="/search">
                <Button size="sm">Start Searching</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {history.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Search size={20} className="text-white/20" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{formatDate(item.created_at)}</p>
                  <p className="text-white/40 text-xs">
                    {item.total_results} Results
                    {item.best_similarity && (
                      <> • Best: {formatScore(item.best_similarity)}</>
                    )}
                  </p>
                  <p className="text-white/30 text-[10px] capitalize mt-0.5">{item.status}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/search?replay=${item.id}`}>
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <RotateCcw size={16} className="text-white/40" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Trash2 size={16} className="text-white/40" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}