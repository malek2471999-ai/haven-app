'use client'

import { useState, useEffect } from 'react'
import { Bookmark, Plus, Trash2, Folder } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function SavedPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      const data = await api.getCollections()
      setCollections(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const collection = await api.createCollection({ name: newName.trim() })
      setCollections(c => [collection, ...c])
      setNewName('')
      setShowCreate(false)
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCollection(id)
      setCollections(c => c.filter(col => col.id !== id))
    } catch {}
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-40 glass-strong border-b border-white/10 px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Saved</h1>
          <button onClick={() => setShowCreate(true)} className="p-2 rounded-lg hover:bg-white/10">
            <Plus size={20} className="text-bab-400" />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={48} />}
            title="You haven't saved any results"
            description="Create a collection to organize your saved results"
            action={
              <Button onClick={() => setShowCreate(true)} size="sm">
                <Plus size={16} /> Create Collection
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {collections.map((col, i) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-bab-600/20 flex items-center justify-center">
                  <Folder size={24} className="text-bab-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">{col.name}</h3>
                  <p className="text-white/40 text-xs">{col.result_count} results</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(col.id) }}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <Trash2 size={16} className="text-white/40" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Collection">
        <div className="space-y-4">
          <Input
            label="Collection Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Profile Pictures"
            autoFocus
          />
          <div className="flex gap-3">
            <Button onClick={() => setShowCreate(false)} variant="secondary" fullWidth>Cancel</Button>
            <Button onClick={handleCreate} fullWidth>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}