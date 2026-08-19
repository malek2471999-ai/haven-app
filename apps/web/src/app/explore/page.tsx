'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { formatNumber } from '@/lib/utils'

export default function ExplorePage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/users/search')
        .then(r => r.json())
        .then(data => setSuggestedUsers(data.users || []))
        .catch(() => {})
    }
  }, [isAuthenticated])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearching(true)
        fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
          .then(r => r.json())
          .then(data => { setSearchResults(data.users || []); setSearching(false) })
          .catch(() => setSearching(false))
      } else {
        setSearchResults([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  if (isLoading) return <LoadingPage />
  if (!isAuthenticated) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50 p-4">
          <div className="relative">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن أشخاص..."
              className="input-field pr-10"
            />
          </div>
        </div>

        <div className="p-4 space-y-6">
          {searchQuery ? (
            <div className="space-y-2">
              {searching ? (
                <div className="p-8 text-center"><p className="text-dark-500">جاري البحث...</p></div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center"><p className="text-dark-500">لا توجد نتائج</p></div>
              ) : (
                searchResults.map((user: any) => <UserCard key={user.id} user={user} />)
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="font-semibold text-dark-100">أشخاص مقترحون</h2>
              {suggestedUsers.length === 0 ? (
                <p className="text-sm text-dark-500 text-center py-4">لا يوجد اقتراحات</p>
              ) : (
                <div className="space-y-2">
                  {suggestedUsers.slice(0, 5).map((user: any) => <UserCard key={user.id} user={user} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

function UserCard({ user }: { user: any }) {
  const [isFollowing, setIsFollowing] = useState(false)
  return (
    <Link href={`/profile/${user.username}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800/30 transition-colors">
      <Avatar src={user.avatar_url} alt={user.display_name} fallback={user.display_name[0]} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-dark-100 truncate">{user.display_name}</span>
          {user.is_verified && <Badge variant="success" className="text-[10px] px-1 py-0">✓</Badge>}
        </div>
        <p className="text-sm text-dark-500 truncate">@{user.username}</p>
      </div>
      <Button variant={isFollowing ? 'outline' : 'default'} size="sm" onClick={async (e) => {
        e.preventDefault()
        try {
          const res = await fetch('/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          })
          const data = await res.json()
          setIsFollowing(data.following)
        } catch {}
      }}>
        {isFollowing ? 'يتابع' : 'متابعة'}
      </Button>
    </Link>
  )
}
