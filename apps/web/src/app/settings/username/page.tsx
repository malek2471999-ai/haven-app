'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'

export default function UsernameSettingsPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login') }, [isAuthenticated, isLoading, router])
  useEffect(() => { if (user) setUsername(user.username || '') }, [user])

  useEffect(() => {
    if (!username || username === user?.username) { setAvailable(null); return }
    const timer = setTimeout(() => {
      setChecking(true)
      fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
        .then(r => r.json())
        .then(data => { setAvailable(data.available); setChecking(false) })
        .catch(() => setChecking(false))
    }, 500)
    return () => clearTimeout(timer)
  }, [username, user])

  if (isLoading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">اسم المستخدم</h1>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">اسم المستخدم</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="input-field w-full" maxLength={20} />
          {checking && <p className="text-xs text-dark-500 mt-1">جاري التحقق...</p>}
          {available === true && <p className="text-xs text-haven-400 mt-1">✓ متاح</p>}
          {available === false && <p className="text-xs text-red-400 mt-1">✕ غير متاح</p>}
        </div>
        <p className="text-sm text-dark-500">يجب أن يكون 3-20 حرف، أرقام، شرطة سفلية فقط</p>
        <Button disabled={!username || username === user.username || !available || checking} className="w-full">حفظ</Button>
      </div>
    </MainLayout>
  )
}
