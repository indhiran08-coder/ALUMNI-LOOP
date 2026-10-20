// ====================================================================
// AlumniLoop — Realtime WebSockets Client (Socket.IO)
// File: src/lib/socket.ts
// ====================================================================

import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
})

socket.on('connect', () => {
  console.log(`⚡ [AlumniLoop Realtime] Connected to backend WebSockets server (${socket.id})`)
})

socket.on('disconnect', (reason) => {
  console.log(`⚠️ [AlumniLoop Realtime] Disconnected:`, reason)
})

export const joinUserRoom = (userId: string) => {
  if (userId) {
    socket.emit('join:user', userId)
  }
}

export const joinPostRoom = (postId: string) => {
  if (postId) {
    socket.emit('join:post', postId)
  }
}

export const leavePostRoom = (postId: string) => {
  if (postId) {
    socket.emit('leave:post', postId)
  }
}
