'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { HavenLogo } from '@/components/ui/haven-logo'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/ui/loading'
import { formatDate } from '@/lib/utils'

interface Device {
  id: string; name: string; browser: string | null; os: string | null; ip_address: string | null; is_trusted: boolean; last_active: string; created_at: string
}

interface SecurityEvent {
  id: string; type: string; ip_address: string | null; user_agent: string | null; created_at: string
}

export default function SecurityCenterPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/security')
        .then(r => r.json())
        .then(data => { setDevices(data.devices || []); setEvents(data.events || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [isAuthenticated])

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  const securityScore = calculateSecurityScore(user, devices)

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <HavenLogo size={28} />
          <h1 className="text-2xl font-bold text-dark-100">مركز الأمان</h1>
        </div>

        <div className="glass-card p-6 text-center space-y-3">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-dark-800" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${securityScore * 3.14} 314`} className="text-haven-500" strokeLinecap="round" />
            </svg>
            <div className="absolute text-center">
              <p className="text-3xl font-bold text-dark-100">{securityScore}</p>
              <p className="text-xs text-dark-400">من 100</p>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-dark-100">نقاط الأمان</h2>
          {securityScore < 100 && (
            <div className="text-sm text-dark-400 space-y-1">
              {securityScore < 80 && <p>• فعّل التحقق بخطوتين</p>}
              {securityScore < 90 && <p>• أضف طريقة استرداد</p>}
              {securityScore < 95 && <p>• راجع الأجهزة المتصلة</p>}
            </div>
          )}
        </div>

        <Section title="الأجهزة النشطة">
          {devices.length === 0 ? (
            <p className="text-sm text-dark-500 text-center py-4">لا توجد أجهزة مسجلة</p>
          ) : (
            <div className="divide-y divide-dark-800/50">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                    <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 7.41A2.25 2.25 0 012.25 5.495V5.25" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-dark-100 truncate">{device.name}</p>
                      {device.is_trusted && <Badge variant="success">موثوق</Badge>}
                    </div>
                    <p className="text-xs text-dark-500">{device.browser} · {device.os} · {formatDate(device.last_active)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="نشاط الأمان الأخير">
          {events.length === 0 ? (
            <p className="text-sm text-dark-500 text-center py-4">لا يوجد نشاط</p>
          ) : (
            <div className="divide-y divide-dark-800/50">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center">
                    <span className="text-sm">{getEventIcon(event.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-100">{getEventLabel(event.type)}</p>
                    <p className="text-xs text-dark-500">{formatDate(event.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="إجراءات سريعة">
          <button onClick={() => router.push('/settings/password')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/30 transition-colors text-right">
            <span className="text-dark-400">🔑</span>
            <span className="text-dark-100">تغيير كلمة المرور</span>
          </button>
          <button onClick={() => router.push('/settings/2fa')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/30 transition-colors text-right">
            <span className="text-dark-400">📱</span>
            <span className="text-dark-100">إعداد التحقق بخطوتين</span>
          </button>
          <button onClick={() => alert('قريباً')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/30 transition-colors text-right">
            <span className="text-dark-400">💻</span>
            <span className="text-dark-100">تسجيل الخروج من جميع الأجهزة</span>
          </button>
        </Section>
      </div>
    </MainLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-dark-400 px-2">{title}</h2>
      <div className="glass-card divide-y divide-dark-800/50">{children}</div>
    </div>
  )
}

function getEventIcon(type: string): string {
  const icons: Record<string, string> = {
    login_success: '✓', login_failure: '✕', new_device: '💻', session_revoked: '🔒',
    password_changed: '🔑', two_factor_enabled: '📱', suspicious_login: '⚠️',
  }
  return icons[type] || '•'
}

function getEventLabel(type: string): string {
  const labels: Record<string, string> = {
    login_success: 'تسجيل دخول ناجح', login_failure: 'محاولة دخول فاشلة', new_device: 'جهاز جديد',
    session_revoked: 'إلغاء جلسة', password_changed: 'تغيير كلمة المرور',
    two_factor_enabled: 'تفعيل التحقق بخطوتين', suspicious_login: 'محاولة دخول مشبوهة',
    username_changed: 'تغيير اسم المستخدم',
  }
  return labels[type] || type
}

function calculateSecurityScore(user: any, devices: Device[]): number {
  let score = 50
  if (user.avatar_url) score += 5
  if (user.bio) score += 5
  if (devices.length > 0) score += 10
  if (devices.some(d => d.is_trusted)) score += 10
  if (user.is_private) score += 10
  return Math.min(score, 100)
}
