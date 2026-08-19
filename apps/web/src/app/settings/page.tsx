'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { HavenLogo } from '@/components/ui/haven-logo'
import { Avatar } from '@/components/ui/avatar'
import { LoadingPage } from '@/components/ui/loading'

const settingsSections = [
  {
    title: 'الحساب',
    items: [
      { label: 'الملف الشخصي', href: '/settings/profile', icon: '👤' },
      { label: 'اسم المستخدم', href: '/settings/username', icon: '@' },
      { label: 'كلمة المرور', href: '/settings/password', icon: '🔑' },
    ],
  },
  {
    title: 'الخصوصية',
    items: [
      { label: 'مركز الخصوصية', href: '/settings/privacy', icon: '🔒' },
      { label: 'الحسابات المحظورة', href: '/settings/blocked', icon: '🚫' },
      { label: 'الحسابات المكتومة', href: '/settings/muted', icon: '🔇' },
    ],
  },
  {
    title: 'الأمان',
    items: [
      { label: 'مركز الأمان', href: '/security', icon: '🛡️' },
      { label: 'التحقق بخطوتين', href: '/settings/2fa', icon: '📱' },
      { label: 'الأجهزة', href: '/settings/devices', icon: '💻' },
      { label: 'أكواد الاسترداد', href: '/settings/recovery-codes', icon: '🔑' },
    ],
  },
  {
    title: 'البيانات',
    items: [
      { label: 'تحميل بياناتي', href: '/settings/download', icon: '📥' },
      { label: 'حذف الحساب', href: '/settings/delete', icon: '⚠️' },
    ],
  },
]

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, fetchUser, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-dark-100">الإعدادات</h1>
        </div>

        <Link href="/profile" className="glass-card p-4 flex items-center gap-4 hover:bg-dark-800/50 transition-colors">
          <Avatar src={user.avatar_url} alt={user.display_name} fallback={user.display_name[0]} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-dark-100">{user.display_name}</p>
            <p className="text-sm text-dark-500">@{user.username}</p>
          </div>
          <svg className="w-5 h-5 text-dark-500 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {settingsSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h2 className="text-sm font-medium text-dark-400 px-2">{section.title}</h2>
            <div className="glass-card divide-y divide-dark-800/50">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/30 transition-colors"
                >
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className="flex-1 text-dark-100">{item.label}</span>
                  <svg className="w-4 h-4 text-dark-500 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={() => signOut()}
          className="w-full btn-danger text-center"
        >
          تسجيل الخروج
        </button>

        <p className="text-center text-xs text-dark-600 pb-8">
          HAVEN v0.1.0 · Your Safe Place to Connect
        </p>
      </div>
    </MainLayout>
  )
}
