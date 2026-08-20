'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSocket } from '@/lib/socket'

export function IncomingCallOverlay() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string
    conversationId: string
    callType: 'voice' | 'video'
  } | null>(null)
  const [callerInfo, setCallerInfo] = useState<any>(null)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)

  const fetchCallerInfo = useCallback(async (callerId: string) => {
    try {
      const res = await fetch(`/api/users/search?q=${callerId}`, { credentials: 'include' })
      const data = await res.json()
      const found = data.users?.find((u: any) => u.id === callerId)
      if (found) {
        setCallerInfo({
          id: found.id,
          display_name: found.display_name,
          avatar_url: found.avatar_url,
          username: found.username,
        })
      }
    } catch {
      setCallerInfo({ display_name: 'مجهول' })
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const socket = getSocket()
    if (!socket) return

    const handleIncoming = async (data: { callerId: string; conversationId: string; callType: 'voice' | 'video' }) => {
      // Don't show for our own calls
      if (data.callerId === user.id) return

      setIncomingCall(data)
      fetchCallerInfo(data.callerId)
    }

    const handleAccepted = (data: { conversationId: string; acceptorId: string }) => {
      // Someone accepted - remove overlay
      setIncomingCall(null)
      setCallerInfo(null)
    }

    const handleDeclined = () => {
      setIncomingCall(null)
      setCallerInfo(null)
    }

    const handleEnded = () => {
      setIncomingCall(null)
      setCallerInfo(null)
    }

    socket.on('call:incoming', handleIncoming)
    socket.on('call:accepted', handleAccepted)
    socket.on('call:declined', handleDeclined)
    socket.on('call:ended', handleEnded)

    return () => {
      socket.off('call:incoming', handleIncoming)
      socket.off('call:accepted', handleAccepted)
      socket.off('call:declined', handleDeclined)
      socket.off('call:ended', handleEnded)
    }
  }, [isAuthenticated, user, fetchCallerInfo])

  // Ringtone
  useEffect(() => {
    if (incomingCall) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIj2NysijaTkmTaLC1cpqRCs/l8fS0WVJJkKcxdHKY0IoRJvEz8diRStJmcPOxWBGLkya')
        audio.loop = true
        audio.volume = 0.5
        audio.play().catch(() => {})
        ringtoneRef.current = audio
      } catch {}
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause()
        ringtoneRef.current = null
      }
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause()
        ringtoneRef.current = null
      }
    }
  }, [incomingCall])

  const acceptCall = () => {
    if (!incomingCall) return
    const socket = getSocket()
    if (socket && user) {
      socket.emit('call:accept', {
        conversationId: incomingCall.conversationId,
        callerId: incomingCall.callerId,
      })
    }
    setIncomingCall(null)
    setCallerInfo(null)
    router.push(`/calls/${incomingCall.callType}/${incomingCall.conversationId}`)
  }

  const declineCall = () => {
    if (!incomingCall) return
    const socket = getSocket()
    if (socket && user) {
      socket.emit('call:decline', {
        conversationId: incomingCall.conversationId,
        callerId: incomingCall.callerId,
      })
    }
    setIncomingCall(null)
    setCallerInfo(null)
  }

  if (!incomingCall) return null

  const initials = (callerInfo?.display_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#0a0e17] animate-fade-in">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-haven-500/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Top info */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6">
        {/* Avatar with ring */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-haven-500/20 to-haven-600/10 flex items-center justify-center">
            {callerInfo?.avatar_url ? (
              <img src={callerInfo.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-white/80">{initials}</span>
            )}
          </div>
          {/* Pinging rings */}
          <div className="absolute inset-0 rounded-full border-2 border-haven-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-0 rounded-full border border-haven-500/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
        </div>

        {/* Name & type */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {callerInfo?.display_name || 'مجهول'}
          </h1>
          <p className="text-haven-400 text-sm font-medium">
            {incomingCall.callType === 'video' ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة'}
          </p>
        </div>

        {/* Encrypted badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
          <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="text-xs text-white/50">مشفرة من طرف لآخر</span>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 w-full px-8 pb-16">
        <div className="flex items-center justify-center gap-12">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={declineCall}
              className="w-[64px] h-[64px] rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all duration-200 shadow-[0_8px_32px_rgba(239,68,68,0.4)] active:scale-95"
            >
              <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </button>
            <span className="text-xs text-white/40">رفض</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptCall}
              className="w-[64px] h-[64px] rounded-full bg-haven-500 hover:bg-haven-400 flex items-center justify-center transition-all duration-200 shadow-[0_8px_32px_rgba(22,179,120,0.4)] active:scale-95 animate-pulse"
            >
              {incomingCall.callType === 'video' ? (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              )}
            </button>
            <span className="text-xs text-white/40">قبول</span>
          </div>
        </div>
      </div>
    </div>
  )
}
