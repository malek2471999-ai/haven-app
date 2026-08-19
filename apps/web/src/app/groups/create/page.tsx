'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'

export default function CreateGroupPage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  const handleCreate = async () => {
    if (!name.trim() || creating) return
    setCreating(true)

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
          is_anonymous: isAnonymous,
        }),
      })
      const data = await res.json()
      if (data.group) {
        router.push(`/groups/${data.group.id}`)
      }
    } catch {}

    setCreating(false)
  }

  if (isLoading) return <LoadingPage />
  if (!isAuthenticated) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">إنشاء مجموعة</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">اسم المجموعة *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المجموعة"
              className="input-field w-full"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المجموعة (اختياري)"
              className="input-field w-full resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Private Group Toggle */}
          <div className="flex items-center justify-between glass-card p-4">
            <div>
              <p className="text-dark-100">مجموعة خاصة</p>
              <p className="text-xs text-dark-500">يجب الموافقة للانضمام</p>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPrivate ? 'bg-haven-500' : 'bg-dark-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? 'right-0.5' : 'right-[22px]'}`} />
            </button>
          </div>

          {/* Anonymous Group Toggle */}
          <div className={`glass-card p-4 transition-all ${isAnonymous ? 'border-haven-500/30 bg-haven-500/5' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <p className="text-dark-100 font-medium">مجموعة مشفرة (مجهولة الهوية)</p>
                </div>
                <p className="text-xs text-dark-500 mt-1 mr-7">
                  لا يعرف أحد مَن في المجموعة — فقط عدد الأعضاء ظاهر
                </p>
              </div>
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isAnonymous ? 'bg-haven-500' : 'bg-dark-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isAnonymous ? 'right-0.5' : 'right-[22px]'}`} />
              </button>
            </div>

            {isAnonymous && (
              <div className="mt-3 p-3 rounded-xl bg-dark-800/50 border border-dark-700/30 space-y-2">
                <p className="text-xs text-dark-400 font-medium">ما الذي سيختفي:</p>
                <div className="space-y-1.5">
                  {[
                    'الأسماء في الرسائل (يظهر "عضو")',
                    'قائمة الأعضاء',
                    'مؤشر مَن يكتب',
                    'الأفاتار والصور',
                    'الأدوار (مالك/مدير)',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-xs text-dark-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleCreate} disabled={!name.trim() || creating} loading={creating} className="w-full">
          إنشاء المجموعة
        </Button>
      </div>
    </MainLayout>
  )
}
