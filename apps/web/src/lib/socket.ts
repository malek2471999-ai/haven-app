'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  })

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[WS] Connection error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}
