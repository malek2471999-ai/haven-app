'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Avatar } from '@/components/ui/avatar'
import { LoadingPage } from '@/components/ui/loading'
import { formatTime, truncate } from '@/lib/utils'

export default function MessagesPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/conversations')
        .then(r => r.json())
        .then(data => { setConversations(data.conversations || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-2xl border-b border-dark-800/30">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-2xl font-bold text-dark-100">الرسائل</h1>
              <p className="text-xs text-dark-500 mt-0.5">مشفرة من طرف لآخر</p>
            </div>
            <button
              onClick={() => router.push('/messages/new')}
              className="p-2.5 rounded-xl bg-haven-500/10 text-haven-400 hover:bg-haven-500/20 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="divide-y divide-dark-800/20">
          {conversations.length === 0 ? (
            <div className="p-16 text-center space-y-5 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-haven-500/20 to-haven-600/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-100">لا توجد محادثات بعد</h3>
                <p className="text-sm text-dark-500 max-w-xs mx-auto mt-1">ابدأ محادثة مشفرة مع أصدقائك</p>
              </div>
              <button
                onClick={() => router.push('/messages/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-haven-500 to-haven-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-haven-500/20 hover:shadow-xl hover:shadow-haven-500/30 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                محادثة جديدة
              </button>
            </div>
          ) : (
            conversations.map((conv: any) => (
              <div key={conv.id} className="relative group">
                <button
                  onClick={() => router.push(`/messages/${conv.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/20 active:bg-dark-800/30 transition-all duration-150 text-right"
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={conv.other_user?.avatar_url}
                      alt={conv.other_user?.display_name}
                      fallback={conv.other_user?.display_name?.[0] || '?'}
                      size="md"
                    />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-dark-900 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-dark-100 truncate">
                        {conv.type === 'direct' ? conv.other_user?.display_name || 'محادثة' : conv.name || 'مجموعة'}
                      </span>
                      {conv.last_message && (
                        <span className="text-[11px] text-dark-600 mr-auto whitespace-nowrap">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-dark-500 truncate mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3 text-haven-500/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        {conv.last_message.is_deleted ? 'تم حذف الرسالة' : truncate(conv.last_message.content || '📎 مرفق', 45)}
                      </p>
                    )}
                  </div>
                </button>

                <div ref={menuRef} className="absolute top-3 left-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === conv.id ? null : conv.id) }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-dark-700/50 text-dark-500 hover:text-dark-300 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </button>
                  {openMenu === conv.id && (
                    <div className="absolute left-0 top-8 w-48 bg-dark-800 border border-dark-700/50 rounded-xl shadow-2xl shadow-black/50 py-1 z-50 animate-fade-in">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/messages/${conv.id}`); setOpenMenu(null) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97" /></svg>
                        فتح المحادثة
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/calls/voice/${conv.id}`); setOpenMenu(null) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                        مكالمة صوتية
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/calls/video/${conv.id}`); setOpenMenu(null) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                        مكالمة فيديو
                      </button>
                      <div className="border-t border-dark-700/50 my-1" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(null) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        حذف المحادثة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
}
