'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSocket, connectSocket } from '@/lib/socket'

type CallStatus = 'connecting' | 'ringing' | 'active' | 'ended' | 'error'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
]

export default function VoiceCallPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string
  const { user } = useAuth()

  const [status, setStatus] = useState<CallStatus>('connecting')
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(false)
  const [error, setError] = useState('')
  const [otherUserName, setOtherUserName] = useState('')
  const [otherUserAvatar, setOtherUserAvatar] = useState('')

  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const callIdRef = useRef<string | null>(null)
  const amICallerRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const endedRef = useRef(false)
  const gotOfferRef = useRef(false)
  const gotAnswerRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // Initialize call when user is available
  useEffect(() => {
    if (!conversationId || !user) return
    initCall()
  }, [conversationId, user])

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    peerRef.current?.close()
    peerRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    endedRef.current = true

    const socket = getSocket()
    if (socket && callIdRef.current) {
      socket.emit('call:leave', { callId: callIdRef.current, conversationId })
      socket.off('signal')
      socket.off('call:ended')
      socket.off('call:accepted')
    }
  }

  const initCall = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('المتصفح لا يدعم المكالمات')
        setStatus('error')
        return
      }

      // Ensure socket is connected
      const cookies = document.cookie.split(';').reduce((acc, c) => {
        const [k, v] = c.trim().split('=')
        acc[k] = v
        return acc
      }, {} as Record<string, string>)
      const token = cookies['haven_token']
      if (!token) {
        setError('غير مصرح')
        setStatus('error')
        return
      }
      connectSocket(token)

      // Get audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      // Fetch conversation info
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, { credentials: 'include' })
        const data = await res.json()
        setOtherUserName(data.other_user?.display_name || '')
        setOtherUserAvatar(data.other_user?.avatar_url || '')
      } catch {}

      // Check for existing ringing call (receiver)
      const checkRes = await fetch(`/api/calls/${conversationId}`, { credentials: 'include' })
      const checkData = await checkRes.json()

      if (checkData.call && checkData.call.status === 'ringing' && checkData.call.caller_id !== user?.id) {
        // I am the receiver
        amICallerRef.current = false
        callIdRef.current = checkData.call.id
        setStatus('ringing')
        setupSocketListeners()
        setupPeer()
        joinCallRoom()
      } else {
        // I am the caller - create new call
        amICallerRef.current = true
        await createCall()
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('يرجى السماح بالوصول للميكروفون')
      } else {
        setError(err.message || 'خطأ غير معروف')
      }
      setStatus('error')
    }
  }

  const createCall = async () => {
    try {
      const res = await fetch(`/api/calls/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'create' }),
      })
      const data = await res.json()
      if (!data.call) {
        setError('فشل إنشاء المكالمة')
        setStatus('error')
        return
      }

      callIdRef.current = data.call.id
      setStatus('ringing')

      // Setup socket
      setupSocketListeners()
      setupPeer()
      joinCallRoom()

      // Create and send offer
      const pc = peerRef.current!
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal('offer', { sdp: offer.sdp, type: offer.type })

      // Notify other user via socket
      const socket = getSocket()
      if (socket) {
        socket.emit('call:invite', { conversationId, callType: 'voice' })
      }
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء المكالمة')
      setStatus('error')
    }
  }

  const setupPeer = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
    }

    // Handle remote audio
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0]
      }
    }

    // Send ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal('ice-candidate', e.candidate.toJSON())
      }
    }

    // Connection state
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'connected') {
        setStatus('active')
        timerRef.current = setInterval(() => setDuration(p => p + 1), 1000)
      } else if (state === 'failed' || state === 'disconnected') {
        endCall()
      }
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      if (state === 'failed') {
        endCall()
      }
    }

    peerRef.current = pc
  }

  const joinCallRoom = () => {
    const socket = getSocket()
    if (socket && callIdRef.current) {
      socket.emit('call:join', { callId: callIdRef.current, conversationId })
    }
  }

  const setupSocketListeners = () => {
    const socket = getSocket()
    if (!socket) return

    socket.on('signal', async (data: { from: string; type: string; payload: any }) => {
      if (data.from === user?.id) return // ignore own signals
      const pc = peerRef.current
      if (!pc) return

      if (data.type === 'offer' && !gotOfferRef.current) {
        gotOfferRef.current = true
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal('answer', { sdp: answer.sdp, type: answer.type })

        // Mark call as answered
        await fetch(`/api/calls/${conversationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'answer', callId: callIdRef.current }),
        })
      } else if (data.type === 'answer' && !gotAnswerRef.current) {
        gotAnswerRef.current = true
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload))
      } else if (data.type === 'ice-candidate') {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.payload))
        } catch {}
      }
    })

    socket.on('call:ended', () => {
      endCall()
    })

    socket.on('call:declined', () => {
      endCall()
    })
  }

  const sendSignal = (type: string, data: any) => {
    const socket = getSocket()
    if (socket && callIdRef.current) {
      socket.emit('signal', { callId: callIdRef.current, type, payload: data })
    }
  }

  const endCall = async () => {
    if (endedRef.current) return
    endedRef.current = true

    // Notify other side
    const socket = getSocket()
    if (socket) {
      socket.emit('call:end', { conversationId })
    }

    // Update DB
    if (callIdRef.current) {
      try {
        await fetch(`/api/calls/${conversationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'end', callId: callIdRef.current }),
        })
      } catch {}
    }

    cleanup()
    setStatus('ended')
    setTimeout(() => router.back(), 500)
  }

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(!isMuted)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const getInitials = () => {
    return otherUserName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  }

  return (
    <div className="fixed inset-0 bg-[#0a0e17] flex flex-col items-center justify-between overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Glow */}
      <div className="absolute inset-0">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-1000 ${
          status === 'active' ? 'bg-haven-500/10' : 'bg-haven-500/5'
        }`} />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 pt-12 pb-4">
        <button onClick={endCall} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
          <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
          <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="text-xs font-medium text-white/60">مشفرة</span>
        </div>
        <div className="w-11" />
      </div>

      {/* Center */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6">
        <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-1000 ${
          status === 'active'
            ? 'bg-gradient-to-br from-haven-500/30 to-haven-600/20 shadow-[0_0_80px_rgba(22,179,120,0.15)]'
            : status === 'ringing'
            ? 'bg-gradient-to-br from-haven-500/20 to-haven-600/10'
            : 'bg-white/5'
        }`}>
          {otherUserAvatar ? (
            <img src={otherUserAvatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-white/80">{getInitials()}</span>
          )}
          {status === 'ringing' && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-haven-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-0 rounded-full border border-haven-500/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
            </>
          )}
          {status === 'active' && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-haven-500/20 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-haven-400 animate-pulse" />
              <span className="text-[11px] font-medium text-haven-400">{formatTime(duration)}</span>
            </div>
          )}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">{otherUserName || 'مكالمة صوتية'}</h1>
          <p className={`text-sm font-medium ${
            status === 'active' ? 'text-haven-400' :
            status === 'ringing' ? 'text-white/50' :
            status === 'connecting' ? 'text-white/40' :
            status === 'ended' ? 'text-white/30' :
            'text-red-400'
          }`}>
            {status === 'connecting' && 'جاري الاتصال...'}
            {status === 'ringing' && (amICallerRef.current ? 'رن...' : 'مكالمة واردة...')}
            {status === 'active' && 'متصل'}
            {status === 'ended' && 'انتهت المكالمة'}
            {status === 'error' && error}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full px-8 pb-12">
        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <button onClick={() => router.back()} className="w-full max-w-[280px] py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-all">
              العودة
            </button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-[3px] border-white/5 border-t-haven-500 animate-spin" />
            <p className="text-sm text-white/30">جاري الاتصال</p>
          </div>
        )}

        {status === 'ringing' && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-haven-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <button onClick={endCall} className="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all shadow-[0_8px_32px_rgba(239,68,68,0.4)] active:scale-95">
              <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </button>
          </div>
        )}

        {status === 'active' && (
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-5">
              <button onClick={toggleMute} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-white/10 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>
                {isMuted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                )}
              </button>
              <button onClick={endCall} className="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all shadow-[0_8px_32px_rgba(239,68,68,0.4)] active:scale-95">
                <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </button>
              <button onClick={() => setIsSpeaker(!isSpeaker)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isSpeaker ? 'bg-white/10 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
              </button>
            </div>
          </div>
        )}

        {status === 'ended' && (
          <button onClick={() => router.back()} className="w-full max-w-[280px] mx-auto block py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-all">
            العودة
          </button>
        )}
      </div>
    </div>
  )
}
