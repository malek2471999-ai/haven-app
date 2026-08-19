'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Post } from '@/types'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
  }

  return (
    <article className="glass-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${post.user?.username}`}>
          <Avatar
            src={post.user?.avatar_url}
            alt={post.user?.display_name}
            fallback={post.user?.display_name?.[0]}
            size="md"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${post.user?.username}`}
              className="font-semibold text-dark-100 hover:underline truncate"
            >
              {post.user?.display_name}
            </Link>
            {post.user?.is_verified && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0">✓</Badge>
            )}
            <Link
              href={`/profile/${post.user?.username}`}
              className="text-sm text-dark-500 hover:underline truncate"
            >
              @{post.user?.username}
            </Link>
            <span className="text-dark-600">·</span>
            <time className="text-sm text-dark-500 whitespace-nowrap">
              {formatDate(post.created_at)}
            </time>
          </div>
          {post.content && (
            <p className="mt-2 text-dark-100 leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
            </p>
          )}
          {post.media && post.media.length > 0 && (
            <div className="mt-3 rounded-xl overflow-hidden">
              {post.media[0].type === 'image' && (
                <img
                  src={post.media[0].url}
                  alt={post.media[0].alt_text || ''}
                  className="w-full h-auto object-cover max-h-[500px]"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-dark-800/30">
        <button className="flex items-center gap-2 text-dark-400 hover:text-haven-400 transition-colors group">
          <div className="p-1.5 rounded-lg group-hover:bg-haven-500/10 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
          </div>
          <span className="text-sm">{formatNumber(post.comments_count)}</span>
        </button>

        <button className="flex items-center gap-2 text-dark-400 hover:text-green-400 transition-colors group">
          <div className="p-1.5 rounded-lg group-hover:bg-green-500/10 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
          </div>
          <span className="text-sm">{formatNumber(post.reposts_count)}</span>
        </button>

        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors group ${
            isLiked ? 'text-red-400' : 'text-dark-400 hover:text-red-400'
          }`}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${
            isLiked ? 'bg-red-500/10' : 'group-hover:bg-red-500/10'
          }`}>
            <svg
              className="w-5 h-5"
              fill={isLiked ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <span className="text-sm">{formatNumber(likesCount)}</span>
        </button>

        <button className="flex items-center gap-2 text-dark-400 hover:text-haven-400 transition-colors group">
          <div className="p-1.5 rounded-lg group-hover:bg-haven-500/10 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </div>
        </button>
      </div>
    </article>
  )
}
