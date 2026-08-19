'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Avatar } from '@/components/ui/avatar'
import { LoadingPage } from '@/components/ui/loading'
import { formatTime } from '@/lib/utils'

export default function StoriesPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStory, setActiveStory] = useState<any>(null)

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/stories')
        .then(r => r.json())
        .then(data => { setStories(data.stories || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [isAuthenticated, user])

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  const groupedStories: Record<string, any[]> = {}
  stories.forEach((story: any) => {
    if (!groupedStories[story.user_id]) groupedStories[story.user_id] = []
    groupedStories[story.user_id].push(story)
  })

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50 p-4">
          <h1 className="text-2xl font-bold text-dark-100">القصص</h1>
        </div>

        <div className="p-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            <button onClick={() => router.push('/stories/create')} className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center ring-2 ring-dark-700">
                <svg className="w-6 h-6 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-xs text-dark-400">قصتك</span>
            </button>

            {Object.entries(groupedStories).map(([userId, userStories]) => {
              const story = userStories[0]
              return (
                <button key={userId} onClick={() => setActiveStory(story)} className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-haven-400 to-haven-600">
                    <Avatar src={story.avatar_url} alt={story.display_name} fallback={story.display_name?.[0]} size="lg" className="ring-2 ring-dark-950" />
                  </div>
                  <span className="text-xs text-dark-300 truncate max-w-[64px]">{story.display_name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="divide-y divide-dark-800/30">
          {stories.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-haven-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark-100">لا توجد قصص جديدة</h3>
              <p className="text-sm text-dark-400">القصص تظهر هنا لمدة 24 ساعة</p>
            </div>
          ) : (
            stories.map((story: any) => (
              <button key={story.id} onClick={() => setActiveStory(story)} className="w-full flex items-center gap-3 p-4 hover:bg-dark-800/20 transition-colors text-right">
                <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-haven-400 to-haven-600">
                  <Avatar src={story.avatar_url} alt={story.display_name} fallback={story.display_name?.[0]} size="md" className="ring-2 ring-dark-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-dark-100">{story.display_name}</span>
                  <p className="text-xs text-dark-500">{formatTime(story.created_at)}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}
      </div>
    </MainLayout>
  )
}

function StoryViewer({ story, onClose }: { story: any; onClose: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => { if (prev >= 100) { onClose(); return 0 }; return prev + 2 })
    }, 100)
    return () => clearInterval(timer)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="absolute top-0 left-0 right-0 p-4">
        <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
          <div className="h-full bg-haven-500 transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Avatar src={story.avatar_url} alt={story.display_name} fallback={story.display_name?.[0]} size="sm" />
            <span className="text-sm font-medium text-white">{story.display_name}</span>
          </div>
          <button onClick={onClose} className="text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="w-full h-full flex items-center justify-center">
        {story.media_url ? (
          <img src={story.media_url} alt="" className="w-full h-full object-cover" />
        ) : story.content ? (
          <div className="p-8 text-center"><p className="text-xl text-white whitespace-pre-wrap">{story.content}</p></div>
        ) : (
          <div className="text-white text-4xl">🎬</div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="رد على القصة..." className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white placeholder:text-white/50 focus:outline-none" />
          <button className="text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
