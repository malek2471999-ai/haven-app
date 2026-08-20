'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import type { Socket } from 'socket.io-client'

export function useSocket(): Socket | null {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user) return

    // Get cookie token
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=')
      acc[k] = v
      return acc
    }, {} as Record<string, string>)

    const token = cookies['haven_token']
    if (!token) return

    const s = connectSocket(token)
    socketRef.current = s

    return () => {
      disconnectSocket()
      socketRef.current = null
    }
  }, [user?.id])

  return socketRef.current || getSocket()
}
