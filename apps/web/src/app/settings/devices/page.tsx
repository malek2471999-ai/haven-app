'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/ui/loading'
import { formatDate } from '@/lib/utils'

export default function DevicesPage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login') }, [isAuthenticated, isLoading, router])
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/security').then(r => r.json()).then(d => { setDevices(d.devices || []); setLoading(false) }).catch(() => setLoading(false))
    }
  }, [isAuthenticated])

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">الأجهزة</h1>
        </div>
        {devices.length === 0 ? (
          <div className="p-12 text-center"><p className="text-dark-500">لا توجد أجهزة مسجلة</p></div>
        ) : (
          <div className="glass-card divide-y divide-dark-800/50">
            {devices.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 7.41A2.25 2.25 0 012.25 5.495V5.25" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-dark-100 truncate">{d.name}</p>
                    {d.is_trusted && <Badge variant="success">موثوق</Badge>}
                  </div>
                  <p className="text-xs text-dark-500">{d.browser} · {d.os} · {formatDate(d.last_active)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
