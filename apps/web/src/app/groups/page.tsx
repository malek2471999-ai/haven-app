'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { formatNumber } from '@/lib/utils'

export default function GroupsPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/groups')
        .then(r => r.json())
        .then(data => { setGroups(data.groups || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [isAuthenticated, user])

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-dark-100">المجموعات</h1>
            <Button size="sm" onClick={() => router.push('/groups/create')}>إنشاء مجموعة</Button>
          </div>
        </div>

        <div className="divide-y divide-dark-800/30">
          {groups.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-haven-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark-100">لا توجد مجموعات بعد</h3>
              <p className="text-sm text-dark-400 max-w-xs mx-auto">انضم إلى مجموعة أو أنشئ مجموعة جديدة</p>
            </div>
          ) : (
            groups.map((group: any) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center gap-3 p-4 hover:bg-dark-800/20 transition-colors"
              >
                <div className="relative">
                  <Avatar src={group.avatar_url} alt={group.name} fallback={group.name[0]} size="md" />
                  {group.is_anonymous && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-haven-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-dark-100 truncate">{group.name}</span>
                    {group.is_anonymous && (
                      <span className="text-[10px] text-haven-400 bg-haven-500/10 px-1.5 py-0.5 rounded">مجهولة</span>
                    )}
                    {group.is_private && (
                      <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-dark-500">{formatNumber(group.members_count)} عضو</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
}
