import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { verifyToken } from './src/lib/jwt'
import { query } from './src/lib/db'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>()
// socketId -> userId
const socketUser = new Map<string, string>()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
  })

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token
      if (!token) return next(new Error('No token'))

      const payload = verifyToken(token as string)
      if (!payload) return next(new Error('Invalid token'))

      ;(socket as any).userId = payload.userId
      next()
    } catch {
      next(new Error('Auth failed'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = (socket as any).userId as string
    console.log(`[WS] ${userId} connected (${socket.id})`)

    // Track online user
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId)!.add(socket.id)
    socketUser.set(socket.id, userId)

    // Join user's private room for notifications
    socket.join(`user:${userId}`)

    // Emit online status
    io.emit('user:online', { userId, online: true })

    // --- CALL EVENTS ---

    socket.on('call:invite', async (data: { conversationId: string; callType: 'voice' | 'video' }) => {
      try {
        const { conversationId, callType } = data
        // Find other members
        const members = await query(
          `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
          [conversationId, userId]
        )
        // Notify each member
        for (const member of members.rows) {
          io.to(`user:${member.user_id}`).emit('call:incoming', {
            callerId: userId,
            conversationId,
            callType,
          })
        }
      } catch (err) {
        console.error('[WS] call:invite error', err)
      }
    })

    socket.on('call:accept', (data: { conversationId: string; callerId: string }) => {
      io.to(`user:${data.callerId}`).emit('call:accepted', {
        conversationId: data.conversationId,
        acceptorId: userId,
      })
    })

    socket.on('call:decline', (data: { conversationId: string; callerId: string }) => {
      io.to(`user:${data.callerId}`).emit('call:declined', {
        conversationId: data.conversationId,
        declinerId: userId,
      })
    })

    socket.on('call:end', (data: { conversationId: string }) => {
      socket.to(`room:${data.conversationId}`).emit('call:ended', {
        conversationId: data.conversationId,
        endedBy: userId,
      })
    })

    // Join a call room
    socket.on('call:join', (data: { callId: string; conversationId: string }) => {
      socket.join(`call:${data.callId}`)
      socket.join(`room:${data.conversationId}`)
    })

    socket.on('call:leave', (data: { callId: string; conversationId: string }) => {
      socket.leave(`call:${data.callId}`)
      socket.leave(`room:${data.conversationId}`)
    })

    // WebRTC signaling - forward to room
    socket.on('signal', (data: { callId: string; type: string; payload: any }) => {
      socket.to(`call:${data.callId}`).emit('signal', {
        from: userId,
        type: data.type,
        payload: data.payload,
      })
    })

    // --- MESSAGING ---

    socket.on('message:send', (data: { conversationId: string; message: any }) => {
      socket.to(`room:${data.conversationId}`).emit('message:new', data.message)
    })

    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`room:${data.conversationId}`).emit('typing:start', {
        userId,
        conversationId: data.conversationId,
      })
    })

    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`room:${data.conversationId}`).emit('typing:stop', {
        userId,
        conversationId: data.conversationId,
      })
    })

    // --- DISCONNECT ---

    socket.on('disconnect', () => {
      console.log(`[WS] ${userId} disconnected (${socket.id})`)
      const sockets = onlineUsers.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          onlineUsers.delete(userId)
          io.emit('user:online', { userId, online: false })
        }
      }
      socketUser.delete(socket.id)
    })
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
