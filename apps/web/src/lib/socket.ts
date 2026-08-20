'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let signalingMode: 'websocket' | 'polling' = 'websocket'

export function getSocket(): Socket | null {
  return socket
}

export function getSignalingMode() {
  return signalingMode
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000,
    timeout: 5000,
  })

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket?.id)
    signalingMode = 'websocket'
  })

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason)
    if (reason === 'io server disconnect' || reason === 'transport close') {
      signalingMode = 'polling'
    }
  })

  socket.on('connect_error', (err) => {
    console.error('[WS] Connection error:', err.message)
    signalingMode = 'polling'
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  signalingMode = 'websocket'
}
