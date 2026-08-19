'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function PostComposer() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  if (!user) return null

  return (
    <div className="glass-card p-4">
      <div className="flex gap-3">
        <Avatar
          src={user.avatar_url}
          alt={user.display_name}
          fallback={user.display_name[0]}
          size="md"
        />
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="ماذا يدور في ذهنك؟"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            className="border-0 bg-transparent p-0 text-dark-100 placeholder:text-dark-500 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[60px] resize-none"
          />
          {isExpanded && (
            <div className="flex items-center justify-between pt-3 border-t border-dark-800/50">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-dark-800/50 text-dark-400 hover:text-haven-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                  </svg>
                </button>
                <button className="p-2 rounded-lg hover:bg-dark-800/50 text-dark-400 hover:text-haven-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                  </svg>
                </button>
                <button className="p-2 rounded-lg hover:bg-dark-800/50 text-dark-400 hover:text-haven-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </button>
              </div>
              <Button
                size="sm"
                disabled={!content.trim()}
                onClick={() => {
                  setContent('')
                  setIsExpanded(false)
                }}
              >
                نشر
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
