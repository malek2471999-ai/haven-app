'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading, fetchUser, setUser } = useAuth()
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setBio(user.bio || '')
      setLocation(user.location || '')
      setWebsite(user.website || '')
    }
  }, [user])

  const handleSave = async () => {
    if (!displayName.trim() || saving) return
    setSaving(true)

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        router.push('/profile')
      }
    } catch {}

    setSaving(false)
  }

  if (isLoading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">تعديل الملف الشخصي</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">الاسم المعروض *</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field w-full" maxLength={30} />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">النبذة التعريفية</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field w-full resize-none" rows={3} maxLength={160} placeholder=" kể về bản thân..." />
            <p className="text-xs text-dark-500 mt-1">{bio.length}/160</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">الموقع</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input-field w-full" placeholder="المدينة، البلد" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">الموقع الإلكتروني</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="input-field w-full" placeholder="https://example.com" />
          </div>
        </div>

        <Button onClick={handleSave} disabled={!displayName.trim() || saving} loading={saving} className="w-full">
          حفظ التغييرات
        </Button>
      </div>
    </MainLayout>
  )
}
