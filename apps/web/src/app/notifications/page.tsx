'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { LoadingPage } from '@/components/ui/loading'
import { formatDate } from '@/lib/utils'

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(data => { setNotifications(data.notifications || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [isAuthenticated, user])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  const tabs = [
    { id: 'all', label: 'الكل' },
    { id: 'social', label: 'اجتماعي' },
    { id: 'messages', label: 'الرسائل' },
    { id: 'security', label: 'الأمان' },
  ]

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter(n => {
        if (activeTab === 'social') return ['like', 'comment', 'follow', 'mention'].includes(n.type)
        if (activeTab === 'messages') return n.type === 'message'
        if (activeTab === 'security') return ['login_success', 'new_device', 'suspicious_login'].includes(n.type)
        return true
      })

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold text-dark-100">الإشعارات</h1>
            {notifications.some((n: any) => !n.is_read) && (
              <button onClick={markAllRead} className="text-sm text-haven-400 hover:text-haven-300">قراءة الكل</button>
            )}
          </div>
          <div className="flex px-4 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id ? 'text-haven-400 border-haven-400' : 'text-dark-500 border-transparent hover:text-dark-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-dark-800/30">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-dark-800/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark-100">لا توجد إشعارات</h3>
              <p className="text-sm text-dark-400 mt-1">ستظهر هنا عند وجود نشاط جديد</p>
            </div>
          ) : (
            filteredNotifications.map((notif: any) => (
              <NotificationItem key={notif.id} notification={notif} />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
}

function NotificationItem({ notification }: { notification: any }) {
  const getIcon = (type: string) => {
    const icons: Record<string, { icon: string; color: string }> = {
      like: { icon: '❤️', color: 'text-red-400' },
      comment: { icon: '💬', color: 'text-blue-400' },
      follow: { icon: '👤', color: 'text-haven-400' },
      mention: { icon: '@', color: 'text-purple-400' },
      message: { icon: '✉️', color: 'text-haven-400' },
      login_success: { icon: '✓', color: 'text-haven-400' },
      new_device: { icon: '💻', color: 'text-amber-400' },
      suspicious_login: { icon: '⚠️', color: 'text-red-400' },
    }
    return icons[type] || { icon: '•', color: 'text-dark-400' }
  }

  const getLabel = (type: string) => {
    const labels: Record<string, string> = {
      like: 'أعجب بمنشورك', comment: 'علق على منشورك', follow: 'بدأ بمتابعتك',
      mention: 'أشار إليك', message: 'أرسل لك رسالة', login_success: 'تسجيل دخول ناجح',
      new_device: 'جهاز جديد مسجل', suspicious_login: 'محاولة دخول مشبوهة',
    }
    return labels[type] || type
  }

  const { icon, color } = getIcon(notification.type)

  return (
    <div className={`flex items-start gap-3 p-4 hover:bg-dark-800/20 transition-colors ${!notification.is_read ? 'bg-haven-500/5' : ''}`}>
      <div className={`w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-lg ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {notification.from_avatar_url && (
            <img src={notification.from_avatar_url} alt="" className="w-5 h-5 rounded-full" />
          )}
          <p className="text-sm text-dark-100">
            <span className="font-medium">{notification.from_display_name || 'نظام'}</span>
            {' '}{getLabel(notification.type)}
          </p>
        </div>
        {notification.content && <p className="text-sm text-dark-500 mt-1 truncate">{notification.content}</p>}
        <p className="text-xs text-dark-600 mt-1">{formatDate(notification.created_at)}</p>
      </div>
      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-haven-500 mt-2 shrink-0" />}
    </div>
  )
}
