'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'

export default function CreateStoryPage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  const handleCreate = async () => {
    if ((!content.trim() && !mediaUrl.trim()) || creating) return
    setCreating(true)

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim() || null,
          media_url: mediaUrl.trim() || null,
          type: mediaUrl.trim() ? 'image' : 'text',
        }),
      })
      const data = await res.json()
      if (data.story) {
        router.push('/stories')
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
          <h1 className="text-2xl font-bold text-dark-100">قصة جديدة</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">النص</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب قصتك..."
              className="input-field w-full resize-none"
              rows={6}
              maxLength={500}
            />
            <p className="text-xs text-dark-500 mt-1">{content.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">رابط الصورة (اختياري)</label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="input-field w-full"
            />
          </div>

          {mediaUrl && (
            <div className="glass-card p-2">
              <img src={mediaUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
            </div>
          )}
        </div>

        <Button onClick={handleCreate} disabled={(!content.trim() && !mediaUrl.trim()) || creating} loading={creating} className="w-full">
          نشر القصة
        </Button>

        <p className="text-center text-xs text-dark-500">القصة تظهر لمدة 24 ساعة</p>
      </div>
    </MainLayout>
  )
}
