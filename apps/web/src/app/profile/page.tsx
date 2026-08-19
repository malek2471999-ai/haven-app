'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { formatNumber, formatDate } from '@/lib/utils'

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/posts/user')
        .then(r => r.json())
        .then(data => { setPosts(data.posts || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [isAuthenticated, user])

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="relative h-48 bg-dark-800">
          {user.cover_url ? (
            <img src={user.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-haven-600/20 to-dark-900" />
          )}
          <div className="absolute -bottom-12 right-4">
            <Avatar src={user.avatar_url} alt={user.display_name} fallback={user.display_name[0]} size="xl" className="ring-4 ring-dark-950" />
          </div>
        </div>

        <div className="px-4 pt-16 pb-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-dark-100">{user.display_name}</h1>
                {user.is_verified && <Badge variant="success" className="text-xs">✓ موثق</Badge>}
              </div>
              <p className="text-sm text-dark-500">@{user.username}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>تعديل الملف</Button>
          </div>

          {user.bio && <p className="text-dark-200 leading-relaxed">{user.bio}</p>}

          <div className="flex items-center gap-4 text-sm text-dark-400">
            {user.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {user.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              انضم {formatDate(user.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <button className="hover:text-dark-100 transition-colors">
              <span className="font-bold text-dark-100">{formatNumber(user.following_count)}</span>{' '}
              <span className="text-dark-500">يتابع</span>
            </button>
            <button className="hover:text-dark-100 transition-colors">
              <span className="font-bold text-dark-100">{formatNumber(user.followers_count)}</span>{' '}
              <span className="text-dark-500">متابِع</span>
            </button>
            <span>
              <span className="font-bold text-dark-100">{formatNumber(user.posts_count)}</span>{' '}
              <span className="text-dark-500">منشور</span>
            </span>
          </div>
        </div>

        <div className="border-t border-dark-800/50">
          <div className="flex">
            <button className="flex-1 py-3 text-sm font-medium text-haven-400 border-b-2 border-haven-400">المنشورات</button>
            <button className="flex-1 py-3 text-sm font-medium text-dark-500 hover:text-dark-300">الوسائط</button>
            <button className="flex-1 py-3 text-sm font-medium text-dark-500 hover:text-dark-300">الإعجابات</button>
          </div>
        </div>

        <div className="divide-y divide-dark-800/30">
          {posts.length === 0 ? (
            <div className="p-12 text-center"><p className="text-dark-500">لا توجد منشورات بعد</p></div>
          ) : (
            posts.map((post: any) => (
              <div key={post.id} className="p-4 hover:bg-dark-800/20 transition-colors">
                <p className="text-dark-100 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                <p className="text-xs text-dark-500 mt-2">{formatDate(post.created_at)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
}
