'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { formatTime } from '@/lib/utils'
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  storeKeys,
  getStoredPrivateKey,
  hasStoredKeys,
  rotateKeys,
  shouldRotateKeys,
  markKeysRotated,
} from '@/lib/crypto'

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '💯']

interface FileInfo {
  url: string
  name: string
  size: number
  type: string
}

export default function ConversationPage() {
  const params = useParams()
  const conversationId = params.id as string
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()

  const [messages, setMessages] = useState<any[]>([])
  const [displayMessages, setDisplayMessages] = useState<any[]>([])
  const [conversation, setConversation] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [otherUserPublicKey, setOtherUserPublicKey] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [encReady, setEncReady] = useState(false)

  // Typing & polling
  const [typingUsers, setTypingUsers] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<string>('')

  // Reactions
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)

  // Reply
  const [replyTo, setReplyTo] = useState<any>(null)

  // Pinned messages
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
  const [showPinnedBar, setShowPinnedBar] = useState(true)

  // Search
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Message context menu
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null)

  // Polling interval ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<(FileInfo & { _file?: File }) | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Menu
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
      if (contextMenu) {
        const target = e.target as HTMLElement
        if (!target.closest('.ctx-menu')) setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  // Init encryption keys
  useEffect(() => {
    if (!user) return
    const initKeys = async () => {
      if (!hasStoredKeys(user.id)) {
        const keys = await generateKeyPair()
        storeKeys(user.id, keys.publicKey, keys.privateKey)
        await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(keys),
        })
      }
      if (shouldRotateKeys(user.id)) {
        await rotateKeys(user.id)
        markKeysRotated(user.id)
      }
      setEncReady(true)
    }
    initKeys()
  }, [user])

  // Fetch conversation + other user's public key
  useEffect(() => {
    if (isAuthenticated && user && conversationId && encReady) {
      fetch(`/api/conversations/${conversationId}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json() })
        .then(async (data) => {
          setConversation(data.conversation)
          setOtherUser(data.other_user)
          setMessages(data.messages || [])
          lastFetchRef.current = new Date().toISOString()
          if (data.other_user?.id) {
            const keyRes = await fetch(`/api/keys?userId=${data.other_user.id}`)
            const keyData = await keyRes.json()
            setOtherUserPublicKey(keyData.publicKey)
          }
          setLoading(false)
        })
        .catch(() => router.replace('/messages'))
    }
  }, [isAuthenticated, user, conversationId, encReady, router])

  // Polling for new messages every 1.5 seconds
  useEffect(() => {
    if (!isAuthenticated || !user || !conversationId || !encReady) return

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages?since=${encodeURIComponent(lastFetchRef.current)}`)
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map((m: any) => m.id))
            const newMsgs = data.messages.filter((m: any) => !existingIds.has(m.id))
            if (newMsgs.length === 0) return prev
            // Show browser notification for messages from others
            const otherMsgs = newMsgs.filter((m: any) => m.user_id !== user.id)
            if (otherMsgs.length > 0 && document.hidden) {
              try {
                const msg = otherMsgs[otherMsgs.length - 1]
                const content = msg.content?.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content
                new Notification(msg.display_name || 'رسالة جديدة', {
                  body: content,
                  icon: msg.avatar_url || undefined,
                })
              } catch {}
            }
            return [...prev, ...newMsgs]
          })
        }
        lastFetchRef.current = new Date().toISOString()

        // Check typing status
        const typingRes = await fetch(`/api/conversations/${conversationId}/typing`)
        const typingData = await typingRes.json()
        setTypingUsers(typingData.typing || [])
        setUnreadCount(typingData.unreadCount || 0)

        // Fetch pinned messages
        const pinnedRes = await fetch(`/api/conversations/${conversationId}/pinned`)
        const pinnedData = await pinnedRes.json()
        setPinnedMessages(pinnedData.pinned || [])
      } catch {}
    }, 1500)

    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [isAuthenticated, user, conversationId, encReady])

  // Mark as read on focus
  useEffect(() => {
    if (!conversationId || !user) return
    fetch(`/api/conversations/${conversationId}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read' }),
    })
  }, [conversationId, user, messages])

  // Decrypt messages
  useEffect(() => {
    if (!user || messages.length === 0) { setDisplayMessages(messages); return }
    const privateKey = getStoredPrivateKey(user.id)
    if (!privateKey) { setDisplayMessages(messages); return }
    const decryptAll = async () => {
      const decrypted = await Promise.all(
        messages.map(async (msg: any) => {
          if (msg.type === 'voice') return { ...msg, decrypted: true }
          if (msg.type === 'file') {
            try {
              const fileInfo = JSON.parse(msg.content)
              if (fileInfo.url) return { ...msg, fileInfo, decrypted: true }
            } catch {}
            if (msg.content && otherUserPublicKey) {
              try {
                const plain = await decryptMessage(msg.content, otherUserPublicKey, privateKey)
                const parsed = JSON.parse(plain)
                if (parsed.url) return { ...msg, content: plain, fileInfo: parsed, decrypted: true }
              } catch {}
            }
            return { ...msg, decrypted: true }
          }
          if (msg.content && otherUserPublicKey) {
            try {
              const plain = await decryptMessage(msg.content, otherUserPublicKey, privateKey)
              return { ...msg, content: plain, decrypted: true }
            } catch {}
          }
          return { ...msg, decrypted: true }
        })
      )
      setDisplayMessages(decrypted)
    }
    decryptAll()
  }, [messages, user, otherUserPublicKey])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

  // Send typing indicator on keystroke
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      fetch(`/api/conversations/${conversationId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'typing' }),
      })
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
  }, [conversationId, isTyping])

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending || !user) return
    const content = newMessage.trim()
    setNewMessage('')
    setSending(true)
    try {
      let contentToSend = content
      if (otherUserPublicKey) contentToSend = await encryptMessage(content, otherUserPublicKey)
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToSend,
          type: 'text',
          replyToId: replyTo?.id || undefined,
        }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, data.message])
        setDisplayMessages(prev => [...prev, { ...data.message, content, decrypted: true }])
        setReplyTo(null)
        lastFetchRef.current = new Date().toISOString()
      }
    } catch {}
    setSending(false)
    inputRef.current?.focus()
  }

  // Search in conversation
  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const res = await fetch(`/api/conversations/${conversationId}/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.messages || [])
    } catch {}
  }

  // Add reaction
  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      setMessages(prev =>
        prev.map((m: any) => {
          if (m.id !== messageId) return m
          const existing = (m.reactions || []).find((r: any) => r.user_id === user.id && r.emoji === emoji)
          if (existing) {
            return { ...m, reactions: (m.reactions || []).filter((r: any) => r.id !== existing.id) }
          } else {
            return { ...m, reactions: [...(m.reactions || []), { id: 'temp', user_id: user.id, emoji, display_name: user.display_name }] }
          }
        })
      )
    } catch {}
    setShowReactionPicker(null)
  }

  // Pin message
  const pinMessage = async (messageId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/pinned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, pin: true }),
      })
      setContextMenu(null)
    } catch {}
  }

  // Reply to message
  const handleReply = (msg: any) => {
    setReplyTo(msg)
    setContextMenu(null)
    inputRef.current?.focus()
  }

  // Forward message
  const handleForward = (msg: any) => {
    setNewMessage(`> ${msg.content}\n\n`)
    setContextMenu(null)
    inputRef.current?.focus()
  }

  // Delete message
  const handleDelete = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, { method: 'DELETE' })
      setMessages(prev => prev.map((m: any) => m.id === messageId ? { ...m, is_deleted: true } : m))
      setContextMenu(null)
    } catch {}
  }

  // Upload file
  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        const fileInfo: FileInfo = { url: data.url, name: file.name, size: file.size, type: data.type }
        let contentStr = JSON.stringify(fileInfo)
        if (otherUserPublicKey) contentStr = await encryptMessage(contentStr, otherUserPublicKey)
        const msgRes = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: contentStr, type: 'file' }),
        })
        const msgData = await msgRes.json()
        if (msgData.message) {
          setMessages(prev => [...prev, msgData.message])
          setDisplayMessages(prev => [...prev, { ...msgData.message, fileInfo, decrypted: true }])
        }
      }
    } catch {}
    setPreviewFile(null)
    setUploading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    const fileInfo: FileInfo = {
      url: isImage ? URL.createObjectURL(file) : '',
      name: file.name, size: file.size,
      type: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document',
    }
    setPreviewFile({ ...fileInfo, _file: file } as any)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      setPreviewFile({
        url: isImage ? URL.createObjectURL(file) : '',
        name: file.name, size: file.size,
        type: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document',
        _file: file,
      } as any)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type: string) => {
    if (type === 'video') return '🎬'
    if (type === 'audio') return '🎵'
    if (type === 'image') return '🖼️'
    if (type === 'document') return '📄'
    return '📎'
  }

  // Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); sendVoiceMessage() }
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000)
    } catch { alert('لا يمكن الوصول إلى الميكروفون') }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    setIsRecording(false)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current.stop()
    }
    audioChunksRef.current = []
    setIsRecording(false)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }

  const sendVoiceMessage = async () => {
    if (audioChunksRef.current.length === 0) return
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1]
      let encryptedAudio = base64
      if (otherUserPublicKey) encryptedAudio = await encryptMessage(base64, otherUserPublicKey)
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: encryptedAudio, type: 'voice' }),
        })
        const data = await res.json()
        if (data.message) {
          setMessages(prev => [...prev, data.message])
          setDisplayMessages(prev => [...prev, { ...data.message, content: base64, decrypted: true }])
        }
      } catch {}
    }
    reader.readAsDataURL(blob)
  }

  const playVoice = (msgId: string, base64Audio: string) => {
    if (playingAudio === msgId) { setPlayingAudio(null); return }
    const audio = new Audio(`data:audio/webm;base64,${base64Audio}`)
    audio.onended = () => setPlayingAudio(null)
    audio.play()
    setPlayingAudio(msgId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const renderFileMessage = (msg: any, isSent: boolean) => {
    let fileInfo: FileInfo | undefined = msg.fileInfo
    if (!fileInfo) {
      try { const parsed = JSON.parse(msg.content); if (parsed.url) fileInfo = parsed } catch {}
    }
    if (!fileInfo || !fileInfo.url) return <p className="text-sm opacity-70">ملف غير معروف</p>

    if (fileInfo.type === 'image') {
      return (
        <div className="rounded-xl overflow-hidden max-w-[300px]">
          <img src={fileInfo.url} alt={fileInfo.name || ''} className="w-full h-auto" loading="lazy" />
          {fileInfo.name && <p className={`text-[11px] mt-1.5 ${isSent ? 'text-white/70' : 'text-dark-400'}`}>{fileInfo.name}</p>}
        </div>
      )
    }
    if (fileInfo.type === 'video') {
      return (
        <div className="rounded-xl overflow-hidden max-w-[320px]">
          <video src={fileInfo.url} controls className="w-full" preload="metadata" />
          {fileInfo.name && <p className={`text-[11px] mt-1.5 ${isSent ? 'text-white/70' : 'text-dark-400'}`}>{fileInfo.name}</p>}
        </div>
      )
    }
    if (fileInfo.type === 'audio') {
      return (
        <div className="min-w-[220px]">
          <audio src={fileInfo.url} controls className="w-full h-10" />
          {fileInfo.name && <p className={`text-[11px] mt-1 ${isSent ? 'text-white/70' : 'text-dark-400'}`}>{fileInfo.name}</p>}
        </div>
      )
    }
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl min-w-[200px] ${isSent ? 'bg-white/10' : 'bg-dark-700/50'}`}>
        <span className="text-2xl">{getFileIcon(fileInfo.type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileInfo.name}</p>
          <p className={`text-[11px] ${isSent ? 'text-white/60' : 'text-dark-500'}`}>{formatSize(fileInfo.size)}</p>
        </div>
        <a href={fileInfo.url} download={fileInfo.name} className={`p-2 rounded-lg ${isSent ? 'bg-white/10 hover:bg-white/20' : 'bg-dark-600 hover:bg-dark-500'} transition-colors`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </a>
      </div>
    )
  }

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-2xl border-b border-dark-800/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/messages')} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <Avatar src={otherUser?.avatar_url} alt={otherUser?.display_name} fallback={otherUser?.display_name?.[0]} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark-100 truncate">{otherUser?.display_name || 'محادثة'}</p>
            {typingUsers.length > 0 && (
              <p className="text-xs text-haven-400 animate-pulse">{typingUsers.map(u => u.display_name).join(', ')} يكتب...</p>
            )}
          </div>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg hover:bg-dark-800/50 text-dark-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <button onClick={() => router.push(`/calls/voice/${conversationId}`)} className="p-2 rounded-lg hover:bg-haven-500/10 text-haven-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </button>
          <button onClick={() => router.push(`/calls/video/${conversationId}`)} className="p-2 rounded-lg hover:bg-haven-500/10 text-haven-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-haven-500/10 text-haven-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[10px] font-medium">مشفرة</span>
          </div>
          <div ref={menuRef} className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-dark-800/50 text-dark-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute left-0 top-10 w-56 bg-dark-800 border border-dark-700/50 rounded-xl shadow-2xl shadow-black/50 py-1 z-50 animate-fade-in">
                <button onClick={() => { setShowMenu(false); router.push(`/calls/voice/${conversationId}`) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50">
                  <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  مكالمة صوتية
                </button>
                <button onClick={() => { setShowMenu(false); router.push(`/calls/video/${conversationId}`) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50">
                  <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                  مكالمة فيديو
                </button>
                <div className="border-t border-dark-700/50 my-1" />
                <button onClick={() => { setShowSearch(true); setShowMenu(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50">
                  <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                  بحث في المحادثة
                </button>
                <button onClick={() => { setShowMenu(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50">
                  <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  كتم الإشعارات
                </button>
                <div className="border-t border-dark-700/50 my-1" />
                {pinnedMessages.length > 0 && (
                  <button onClick={() => { setShowPinnedBar(!showPinnedBar); setShowMenu(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-100 hover:bg-dark-700/50">
                    <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-9V6a2.25 2.25 0 00-2.25-2.25H9.75m0 12h6m-6 0H6.75m12.75 0V8.25" /></svg>
                    الرسائل المثبتة ({pinnedMessages.length})
                  </button>
                )}
                <button onClick={() => { setShowMenu(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  حذف المحادثة
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="bg-dark-900/95 backdrop-blur-xl border-b border-dark-800/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-dark-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="ابحث في المحادثة..."
              className="flex-1 bg-dark-800 border border-dark-700/50 rounded-xl px-3 py-2 text-sm text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-haven-500/30"
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }} className="p-2 text-dark-400 hover:text-dark-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {searchResults.map((msg) => (
                <div key={msg.id} className="p-2 rounded-lg bg-dark-800/50 text-sm text-dark-200 cursor-pointer hover:bg-dark-700/50">
                  <span className="text-haven-400 text-xs">{msg.display_name}</span>
                  <p className="truncate">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="text-xs text-dark-500 mt-2 text-center">لا توجد نتائج</p>
          )}
        </div>
      )}

      {/* Pinned message bar */}
      {showPinnedBar && pinnedMessages.length > 0 && (
        <div className="bg-haven-500/10 border-b border-haven-500/20 px-4 py-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-haven-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-9V6a2.25 2.25 0 00-2.25-2.25H9.75m0 12h6m-6 0H6.75m12.75 0V8.25" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-haven-400 font-medium">رسالة مثبتة</p>
              <p className="text-xs text-dark-300 truncate">{pinnedMessages[0].content}</p>
            </div>
            <button onClick={() => setShowPinnedBar(false)} className="p-1 text-dark-400 hover:text-dark-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <main
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${dragOver ? 'bg-haven-500/5' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-dark-800 border-2 border-dashed border-haven-500/50 rounded-3xl p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-haven-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-lg font-medium text-white">أفلت الملف هنا</p>
              <p className="text-sm text-dark-400 mt-1">الصور والفيديوهات والملفات</p>
            </div>
          </div>
        )}

        <div className="text-center py-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-haven-500/10 text-haven-400 text-xs">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            الرسائل مشفرة من طرف لآخر
          </div>
        </div>

        {displayMessages.map((msg: any) => {
          const isSent = msg.user_id === user.id
          const hasReactions = msg.reactions && msg.reactions.length > 0
          const groupReactions = hasReactions
            ? Object.entries(
                msg.reactions.reduce((acc: any, r: any) => {
                  if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, hasMe: false }
                  acc[r.emoji].count++
                  if (r.user_id === user.id) acc[r.emoji].hasMe = true
                  return acc
                }, {})
              )
            : []

          return (
            <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
              <div
                className="relative max-w-[75%] group"
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY })
                }}
              >
                {/* Reply preview */}
                {msg.reply_to_id && msg.reply_content && (
                  <div className={`text-xs px-3 py-1.5 rounded-t-xl border-b ${isSent ? 'bg-white/5 border-white/10' : 'bg-haven-500/5 border-haven-500/10'}`}>
                    <p className="text-haven-400 font-medium">{msg.reply_user_name || 'رسالة'}</p>
                    <p className={`truncate ${isSent ? 'text-white/60' : 'text-dark-400'}`}>{msg.reply_content}</p>
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-2.5 ${
                  isSent
                    ? 'bg-gradient-to-br from-haven-500 to-haven-600 text-white rounded-br-md shadow-lg shadow-haven-500/10'
                    : 'bg-dark-800/80 text-dark-100 rounded-bl-md border border-dark-700/50'
                } ${msg.reply_to_id ? (isSent ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}>
                  {msg.is_deleted ? (
                    <p className="text-sm italic opacity-70">تم حذف الرسالة</p>
                  ) : msg.type === 'voice' ? (
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <button onClick={() => playVoice(msg.id, msg.content)} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSent ? 'bg-white/20 hover:bg-white/30' : 'bg-haven-500/20 hover:bg-haven-500/30'}`}>
                        {playingAudio === msg.id ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        ) : (
                          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex gap-0.5 items-end h-6">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className={`w-1 rounded-full ${isSent ? 'bg-white/40' : 'bg-haven-400/40'}`} style={{ height: `${Math.random() * 100}%`, minHeight: '3px' }} />
                          ))}
                        </div>
                        <p className={`text-[10px] mt-0.5 ${isSent ? 'text-white/60' : 'text-dark-500'}`}>🔒 صوت مشفر</p>
                      </div>
                    </div>
                  ) : msg.type === 'file' ? (
                    renderFileMessage(msg, isSent)
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}

                  {msg.expires_at && (
                    <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                      <svg className={`w-3 h-3 ${isSent ? 'text-white/40' : 'text-dark-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={`text-[10px] ${isSent ? 'text-white/40' : 'text-dark-500'}`}>تختفي تلقائياً</span>
                    </div>
                  )}

                  <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <p className={`text-[10px] ${isSent ? 'text-white/60' : 'text-dark-500'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                    {msg.forwarded && (
                      <span className={`text-[10px] ${isSent ? 'text-white/50' : 'text-dark-500'}`}>↗ مُوجَّهة</span>
                    )}
                    {isSent && (
                      <span className="flex items-center">
                        {(!msg.receiptStatus || msg.receiptStatus === 'sent') && (
                          <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {msg.receiptStatus === 'delivered' && (
                          <svg className="w-3.5 h-3.5 text-white/50" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M1.5 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {msg.receiptStatus === 'read' && (
                          <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M1.5 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {hasReactions && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    {groupReactions.map(([key, r]: [string, any]) => (
                      <button
                        key={key}
                        onClick={() => addReaction(msg.id, r.emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                          r.hasMe ? 'bg-haven-500/20 border border-haven-500/30' : 'bg-dark-800/80 border border-dark-700/50'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className={`${r.hasMe ? 'text-haven-400' : 'text-dark-400'}`}>{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reaction picker button */}
                <button
                  onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                  className={`absolute top-0 ${isSent ? 'left-0 -translate-x-full -ml-1' : 'right-0 translate-x-full mr-1'} p-1.5 rounded-full bg-dark-800 border border-dark-700/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dark-700`}
                >
                  <svg className="w-3.5 h-3.5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Reaction picker popup */}
                {showReactionPicker === msg.id && (
                  <div className={`absolute ${isSent ? 'left-0' : 'right-0'} -bottom-10 z-50 bg-dark-800 border border-dark-700/50 rounded-xl px-2 py-1.5 flex gap-1 shadow-xl animate-fade-in`}>
                    {REACTION_EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="text-lg hover:scale-125 transition-transform p-0.5">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="ctx-menu fixed z-50 bg-dark-800 border border-dark-700/50 rounded-xl shadow-2xl shadow-black/50 py-1 w-48 animate-fade-in"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={() => { const msg = displayMessages.find(m => m.id === contextMenu.msgId); if (msg) handleReply(msg) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-dark-100 hover:bg-dark-700/50">
              <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
              رد
            </button>
            <button onClick={() => { const msg = displayMessages.find(m => m.id === contextMenu.msgId); if (msg) handleForward(msg) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-dark-100 hover:bg-dark-700/50">
              <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              توجيه
            </button>
            <button onClick={() => pinMessage(contextMenu.msgId)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-dark-100 hover:bg-dark-700/50">
              <svg className="w-4 h-4 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-9V6a2.25 2.25 0 00-2.25-2.25H9.75m0 12h6m-6 0H6.75m12.75 0V8.25" /></svg>
              تثبيت
            </button>
            <div className="border-t border-dark-700/50 my-1" />
            {contextMenu && (() => {
              const msg = displayMessages.find(m => m.id === contextMenu.msgId)
              if (!msg || msg.user_id !== user.id) return null
              return (
                <button onClick={() => handleDelete(contextMenu.msgId)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  حذف
                </button>
              )
            })()}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt" onChange={handleFileSelect} />

      {/* File preview */}
      {previewFile && (
        <div className="sticky bottom-0 bg-dark-900/95 backdrop-blur-xl border-t border-dark-800/50 p-4 z-10">
          <div className="bg-dark-800 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dark-400">معاينة</span>
              <button onClick={() => setPreviewFile(null)} className="p-1 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {previewFile.type === 'image' && previewFile.url && <img src={previewFile.url} alt={previewFile.name} className="max-h-48 rounded-xl mx-auto" />}
            {['video', 'audio'].includes(previewFile.type) && (
              <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl">
                <span className="text-3xl">{previewFile.type === 'video' ? '🎬' : '🎵'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{previewFile.name}</p>
                  <p className="text-[11px] text-dark-400">{formatSize(previewFile.size)}</p>
                </div>
              </div>
            )}
            {!['image', 'video', 'audio'].includes(previewFile.type) && (
              <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl">
                <span className="text-3xl">{getFileIcon(previewFile.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{previewFile.name}</p>
                  <p className="text-[11px] text-dark-400">{formatSize(previewFile.size)}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreviewFile(null)} className="flex-1 py-3 rounded-xl bg-dark-800 text-dark-300 font-medium hover:bg-dark-700">إلغاء</button>
            <button onClick={() => { if (previewFile._file) uploadFile(previewFile._file) }} disabled={uploading} className="flex-1 py-3 rounded-xl bg-haven-500 text-white font-medium hover:bg-haven-600 disabled:opacity-50">
              {uploading ? 'جاري الرفع...' : 'إرسال'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="sticky bottom-0 bg-dark-950/80 backdrop-blur-xl border-t border-dark-800/50 p-4">
        {/* Reply preview */}
        {replyTo && (
          <div className="bg-dark-800/80 border-r-2 border-haven-500 rounded-xl px-3 py-2 mb-2 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-haven-400 font-medium">{replyTo.display_name || 'رد على'}</p>
              <p className="text-xs text-dark-300 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 text-dark-400 hover:text-dark-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 animate-pulse-glow">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400 font-medium flex-1">تسجيل... {formatRecTime(recordingTime)}</span>
            <button onClick={cancelRecording} className="p-2 text-dark-400 hover:text-red-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <button onClick={stopRecording} className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button onClick={startRecording} className="p-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-dark-400 hover:text-haven-400 hover:border-haven-500/30 transition-all shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>

            <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-dark-400 hover:text-haven-400 hover:border-haven-500/30 transition-all shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.939A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); handleTyping() }}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالة مشفرة..."
                rows={1}
                className="w-full bg-dark-900/80 border border-dark-700/50 rounded-2xl px-4 py-3 text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-haven-500/30 focus:border-haven-500/50 resize-none max-h-32 transition-all"
              />
            </div>

            <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon" className="shrink-0 rounded-full w-11 h-11 bg-gradient-to-br from-haven-500 to-haven-600 hover:from-haven-600 hover:to-haven-700 shadow-lg shadow-haven-500/20">
              <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </Button>
          </div>
        )}
      </footer>
    </div>
  )
}
