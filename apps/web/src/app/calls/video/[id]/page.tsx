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

export default function VideoCallPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string
  const { user } = useAuth()

  const [status, setStatus] = useState<CallStatus>('connecting')
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isFront, setIsFront] = useState(true)
  const [error, setError] = useState('')
  const [otherUserName, setOtherUserName] = useState('')
  const [otherUserAvatar, setOtherUserAvatar] = useState('')

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const callIdRef = useRef<string | null>(null)
  const amICallerRef = useRef(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const endedRef = useRef(false)
  const gotOfferRef = useRef(false)
  const gotAnswerRef = useRef(false)

  useEffect(() => {
    return () => { cleanup() }
  }, [])

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
        setError('المتصفح لا يدعم مكالمات الفيديو')
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

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      try {
        const res = await fetch(`/api/conversations/${conversationId}`, { credentials: 'include' })
        const data = await res.json()
        setOtherUserName(data.other_user?.display_name || '')
        setOtherUserAvatar(data.other_user?.avatar_url || '')
      } catch {}

      const checkRes = await fetch(`/api/calls/${conversationId}`, { credentials: 'include' })
      const checkData = await checkRes.json()

      if (checkData.call && checkData.call.status === 'ringing' && checkData.call.caller_id !== user?.id) {
        amICallerRef.current = false
        callIdRef.current = checkData.call.id
        setStatus('ringing')
        setupSocketListeners()
        setupPeer()
        joinCallRoom()
      } else {
        amICallerRef.current = true
        await createCall()
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('يرجى السماح بالوصول للكاميرا والميكروفون')
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

      setupSocketListeners()
      setupPeer()
      joinCallRoom()

      const pc = peerRef.current!
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal('offer', { sdp: offer.sdp, type: offer.type })

      const socket = getSocket()
      if (socket) {
        socket.emit('call:invite', { conversationId, callType: 'video' })
      }
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء المكالمة')
      setStatus('error')
    }
  }

  const setupPeer = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal('ice-candidate', e.candidate.toJSON())
      }
    }

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
      if (pc.iceConnectionState === 'failed') endCall()
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
      if (data.from === user?.id) return
      const pc = peerRef.current
      if (!pc) return

      if (data.type === 'offer' && !gotOfferRef.current) {
        gotOfferRef.current = true
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal('answer', { sdp: answer.sdp, type: answer.type })

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
        try { await pc.addIceCandidate(new RTCIceCandidate(data.payload)) } catch {}
      }
    })

    socket.on('call:ended', () => endCall())
    socket.on('call:declined', () => endCall())
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

    const socket = getSocket()
    if (socket) socket.emit('call:end', { conversationId })

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

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCameraOff })
    setIsCameraOff(!isCameraOff)
  }

  const switchCamera = async () => {
    if (!localStreamRef.current) return
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: isFront ? 'environment' : 'user' },
      })
      localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0])
      localStreamRef.current.addTrack(newStream.getVideoTracks()[0])
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
      setIsFront(!isFront)
    } catch {}
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
    <div className="fixed inset-0 bg-[#0a0e17] flex flex-col overflow-hidden">
      {/* Remote video background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1520] to-[#0a0e17]">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {status !== 'active' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center">
              {otherUserAvatar ? (
                <img src={otherUserAvatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-white/40">{getInitials()}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-12 pb-4">
        <button onClick={endCall} className="p-3 rounded-2xl bg-black/30 backdrop-blur-xl hover:bg-black/40 transition-all">
          <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-xl">
          <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="text-xs font-medium text-white/60">مشفرة</span>
        </div>
        <div className="w-11" />
      </div>

      {/* Info + Local video PiP */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-between pb-8">
        <div className="text-center space-y-2 mt-4">
          <h1 className="text-xl font-bold text-white drop-shadow-lg">{otherUserName || 'مكالمة فيديو'}</h1>
          <p className={`text-sm ${
            status === 'active' ? 'text-haven-400' : 'text-white/50'
          }`}>
            {status === 'connecting' && 'جاري الاتصال...'}
            {status === 'ringing' && (amICallerRef.current ? 'رن...' : 'مكالمة واردة...')}
            {status === 'active' && formatTime(duration)}
            {status === 'ended' && 'انتهت'}
            {status === 'error' && error}
          </p>
        </div>

        {/* Local video PiP */}
        {(status === 'active' || status === 'ringing') && (
          <div className="absolute top-20 right-6 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-black/50 z-30">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isCameraOff && (
              <div className="absolute inset-0 bg-[#0f1520] flex items-center justify-center">
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="w-full px-8">
          {(status === 'connecting' || status === 'error') && (
            <div className="flex flex-col items-center gap-4">
              {status === 'connecting' ? (
                <>
                  <div className="w-16 h-16 rounded-full border-[3px] border-white/5 border-t-haven-500 animate-spin" />
                  <p className="text-sm text-white/30">جاري الاتصال</p>
                </>
              ) : (
                <button onClick={() => router.back()} className="w-full max-w-[280px] py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-all">
                  العودة
                </button>
              )}
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
            <div className="flex items-center justify-center gap-5">
              <button onClick={toggleMute} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-white/10 text-white' : 'bg-black/30 backdrop-blur-xl text-white/60 hover:bg-white/10 hover:text-white'}`}>
                {isMuted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                )}
              </button>
              <button onClick={toggleCamera} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isCameraOff ? 'bg-white/10 text-white' : 'bg-black/30 backdrop-blur-xl text-white/60 hover:bg-white/10 hover:text-white'}`}>
                {isCameraOff ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                )}
              </button>
              <button onClick={endCall} className="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all shadow-[0_8px_32px_rgba(239,68,68,0.4)] active:scale-95">
                <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </button>
              <button onClick={switchCamera} className="w-14 h-14 rounded-2xl bg-black/30 backdrop-blur-xl text-white/60 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </button>
            </div>
          )}

          {status === 'ended' && (
            <button onClick={() => router.back()} className="w-full max-w-[280px] mx-auto block py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-all">
              العودة
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
