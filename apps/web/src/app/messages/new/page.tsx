'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Avatar } from '@/components/ui/avatar'
import { LoadingPage } from '@/components/ui/loading'

export default function NewMessagePage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearching(true)
        fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
          .then(r => r.json())
          .then(data => { setUsers(data.users || []); setSearching(false) })
          .catch(() => setSearching(false))
      } else {
        setUsers([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const startConversation = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      })
      const data = await res.json()
      if (data.conversationId) {
        router.push(`/messages/${data.conversationId}`)
      }
    } catch {}
  }

  if (isLoading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
              <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-dark-100">محادثة جديدة</h1>
          </div>
          <div className="mt-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن شخص..."
              className="input-field w-full"
              autoFocus
            />
          </div>
        </div>

        <div className="divide-y divide-dark-800/30">
          {searching && (
            <div className="p-8 text-center"><p className="text-dark-500">جاري البحث...</p></div>
          )}
          {!searching && searchQuery && users.length === 0 && (
            <div className="p-8 text-center"><p className="text-dark-500">لا توجد نتائج</p></div>
          )}
          {users.map((u: any) => (
            <button
              key={u.id}
              onClick={() => startConversation(u.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/30 transition-colors text-right"
            >
              <Avatar src={u.avatar_url} alt={u.display_name} fallback={u.display_name[0]} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-dark-100 truncate">{u.display_name}</p>
                <p className="text-sm text-dark-500">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
