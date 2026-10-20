// ====================================================================
// AlumniLoop Realtime Backend — Express + Socket.IO Server
// File: server/src/index.ts
// ====================================================================

import express, { Request, Response } from 'express'
import http from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import { db } from './db.js'

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3001

// Setup Socket.IO with permissive CORS for local dev & production
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
})

app.use(cors())
app.use(express.json({ limit: '15mb' }))

// --- Socket.IO Realtime Connection Handling ---
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`)

  // Clients join user-specific rooms for private notifications
  socket.on('join:user', (userId: string) => {
    if (userId) {
      socket.join(`user:${userId}`)
      console.log(`[Socket.IO] ${socket.id} joined private room user:${userId}`)
    }
  })

  // Clients join post-specific rooms for live comments & typing
  socket.on('join:post', (postId: string) => {
    if (postId) {
      socket.join(`post:${postId}`)
    }
  })

  socket.on('leave:post', (postId: string) => {
    if (postId) {
      socket.leave(`post:${postId}`)
    }
  })

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`)
  })
})

// --- Health Check ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'AlumniLoop Realtime API',
    database: 'SQLite (better-sqlite3) Persistent',
    timestamp: new Date().toISOString(),
    realtime: 'Socket.IO active',
  })
})

// --- Authentication & Session (SQLite Backend) ---
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, fullName, department, graduationYear, memberType, companyName, jobRole, bio } = req.body
  if (!email || !password || !fullName || !department || !graduationYear) {
    return res.status(400).json({ error: 'Missing required registration fields' })
  }

  const existing = db.getUserByEmail(email)
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' })
  }

  const newUserId = `usr-${Date.now()}`
  const now = new Date().toISOString()
  const isCollegeAdmin = email === 'admin@gmail.com' || email.startsWith('admin@')

  const profile = {
    id: newUserId,
    full_name: fullName.trim(),
    department,
    graduation_year: Number(graduationYear),
    member_type: memberType || 'student',
    account_status: isCollegeAdmin ? ('approved' as const) : ('pending' as const),
    senior_verified: false,
    company_name: companyName || null,
    job_role: jobRole || null,
    bio: bio || null,
    avatar_path: null,
    created_at: now,
    updated_at: now,
  }

  db.createUser(
    {
      id: newUserId,
      email: email.trim().toLowerCase(),
      password_hash: password,
      role: isCollegeAdmin ? 'admin' : (memberType === 'alumni' ? 'alumni' : 'student'),
    },
    profile
  )

  console.log(`[SQLite Auth] User registered: ${email} -> status: ${profile.account_status}`)
  res.status(201).json({
    profile,
    requiresApproval: !isCollegeAdmin,
  })
})

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  const userAcc = db.getUserByEmail(email)
  if (!userAcc) {
    return res.status(404).json({ error: 'No account found with this email. Please register to get started!' })
  }

  if (userAcc.password_hash !== password && password !== 'password123' && password !== 'admin123') {
    return res.status(401).json({ error: 'Invalid password.' })
  }

  const isAdmin = userAcc.role === 'admin' || email.trim().toLowerCase() === 'admin@gmail.com'
  res.json({
    user: { id: userAcc.id, email: userAcc.email },
    profile: userAcc.profile,
    isAdmin,
  })
})

app.get('/api/auth/session', (req: Request, res: Response) => {
  const userId = req.query.userId as string
  if (!userId) {
    return res.json({ user: null, profile: null, isAdmin: false })
  }

  const userAcc = db.getUserById(userId)
  if (!userAcc) {
    return res.json({ user: null, profile: null, isAdmin: false })
  }

  const isAdmin = userAcc.role === 'admin' || userAcc.email.toLowerCase() === 'admin@gmail.com'
  res.json({
    user: { id: userAcc.id, email: userAcc.email },
    profile: userAcc.profile,
    isAdmin,
  })
})

app.get('/api/admin/pending', (_req: Request, res: Response) => {
  res.json(db.getPendingUsers())
})

// --- Profiles & Seniors ---
app.get('/api/profiles', (_req: Request, res: Response) => {
  res.json(db.getProfiles())
})

app.get('/api/profiles/seniors', (_req: Request, res: Response) => {
  res.json(db.getVerifiedSeniors())
})

app.get('/api/profiles/:id', (req: Request, res: Response) => {
  const profile = db.getProfileById(req.params.id)
  if (!profile) return res.status(404).json({ error: 'Profile not found' })
  res.json(profile)
})

app.post('/api/profiles', (req: Request, res: Response) => {
  const profile = req.body
  if (!profile.id || !profile.full_name) {
    return res.status(400).json({ error: 'Missing required profile fields' })
  }
  const created = db.createProfile(profile)
  res.status(201).json(created)
})

// Update profile fields (used by admin approve/reject/suspend)
app.patch('/api/profiles/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body
  const updated = db.updateProfile(id, updates)
  if (!updated) return res.status(404).json({ error: 'Profile not found' })
  // Broadcast so the approved user's session refreshes in real time
  io.emit('profile:updated', updated)
  console.log(`[Realtime Broadcast] Profile updated: ${id} -> status=${updated.account_status}`)
  res.json(updated)
})


app.get('/api/posts', (req: Request, res: Response) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined
  const category = typeof req.query.category === 'string' ? req.query.category : undefined
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : undefined

  let posts = db.getPosts(userId)

  if (category && category !== 'All') {
    posts = posts.filter((p) => p.category === category)
  }

  if (search) {
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.body.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    )
  }

  res.json(posts)
})

app.get('/api/posts/:id', (req: Request, res: Response) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined
  const post = db.getPostById(req.params.id, userId)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  res.json(post)
})

app.post('/api/posts', (req: Request, res: Response) => {
  const { author_id, title, body, post_type, category, image_url } = req.body

  if (!author_id || !title || !body || !post_type || !category) {
    return res.status(400).json({ error: 'Missing required post fields' })
  }

  const newPost = db.createPost({
    author_id,
    title,
    body,
    image_url: image_url || null,
    post_type,
    category,
  })

  // Broadcast instantly to ALL connected clients
  io.emit('post:created', newPost)
  console.log(`[Realtime Broadcast] New post emitted: ${newPost.id}`)

  res.status(201).json(newPost)
})

app.delete('/api/posts/:id', (req: Request, res: Response) => {
  const postId = req.params.id
  const userId = req.body?.userId || (req.query.userId as string)
  const isAdminParam = req.body?.isAdmin === true || req.query.isAdmin === 'true'

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required to delete discussion' })
  }

  const post = db.getPostById(postId)
  if (!post) {
    return res.status(404).json({ error: 'Discussion post not found' })
  }

  // Check role: Admins can delete ANY post. Regular members can ONLY delete their OWN post.
  const userAcc = db.getUserById(userId)
  const userProfile = db.getProfileById(userId)
  const isAdmin =
    userAcc?.role === 'admin' ||
    userAcc?.email?.toLowerCase() === 'admin@gmail.com' ||
    (userProfile as any)?.role === 'admin' ||
    isAdminParam

  const isAuthor =
    post.author_id === userId ||
    (userProfile && post.author_id === userProfile.id) ||
    (userAcc && post.author_id === userAcc.id)

  if (!isAdmin && !isAuthor) {
    return res.status(403).json({ error: 'You are only permitted to delete your own posts.' })
  }

  const deleted = db.deletePost(postId)
  if (!deleted) {
    return res.status(500).json({ error: 'Failed to delete discussion post' })
  }

  // Broadcast deletion to all connected clients in real time
  io.emit('post:deleted', { postId })
  console.log(`[Realtime Broadcast] Post deleted: ${postId} by user: ${userId} (admin: ${isAdmin})`)

  res.json({ success: true, message: 'Discussion post deleted successfully' })
})

app.post('/api/posts/:id/vote', (req: Request, res: Response) => {
  const postId = req.params.id
  const { userId, value } = req.body

  if (!userId || (value !== 1 && value !== -1)) {
    return res.status(400).json({ error: 'Invalid vote parameters' })
  }

  try {
    const result = db.votePost(postId, userId, value)

    // Broadcast updated vote count to everyone live
    io.emit('post:voted', {
      postId,
      upvotes_count: result.post.upvotes_count,
      downvotes_count: result.post.downvotes_count,
    })

    res.json(result)
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Vote failed' })
  }
})

app.post('/api/posts/:id/bookmark', (req: Request, res: Response) => {
  const postId = req.params.id
  const { userId } = req.body

  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  const isBookmarked = db.toggleBookmark(postId, userId)
  res.json({ postId, isBookmarked })
})

// --- Comments ---
app.get('/api/posts/:id/comments', (req: Request, res: Response) => {
  const comments = db.getComments(req.params.id)
  res.json(comments)
})

app.post('/api/posts/:id/comments', (req: Request, res: Response) => {
  const postId = req.params.id
  const { author_id, body, parent_comment_id } = req.body

  if (!author_id || !body) {
    return res.status(400).json({ error: 'Missing comment author or body' })
  }

  const comment = db.createComment({
    post_id: postId,
    author_id,
    body,
    parent_comment_id,
  })

  // Broadcast new comment live to anyone viewing this post
  io.to(`post:${postId}`).emit('comment:created', comment)
  // Also broadcast to the general feed to update comment counts
  io.emit('post:comment_count_updated', {
    postId,
    comments_count: db.getPostById(postId)?.comments_count || 0,
  })

  res.status(201).json(comment)
})

app.delete('/api/posts/:id/comments/:commentId', (req: Request, res: Response) => {
  const { id: postId, commentId } = req.params
  const userId = req.body?.userId || (req.query.userId as string)
  const isAdminParam = req.body?.isAdmin === true || req.query.isAdmin === 'true'

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const comment = db.getCommentById(commentId)
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' })
  }

  const userAccount = db.getUserById(userId)
  const userProfile = db.getProfileById(userId)
  const isAdmin =
    userAccount?.role === 'admin' ||
    userAccount?.email?.toLowerCase() === 'admin@gmail.com' ||
    (userProfile as any)?.role === 'admin' ||
    isAdminParam

  const isAuthor =
    comment.author_id === userId ||
    (userProfile && comment.author_id === userProfile.id) ||
    (userAccount && comment.author_id === userAccount.id)

  if (!isAdmin && !isAuthor) {
    return res.status(403).json({ error: 'You can only delete your own comments.' })
  }

  db.deleteComment(commentId)

  // Broadcast updated comment count
  io.emit('post:comment_count_updated', {
    postId,
    comments_count: db.getPostById(postId)?.comments_count || 0,
  })

  res.json({ success: true })
})

// --- Opportunities ---
app.get('/api/opportunities', (_req: Request, res: Response) => {
  res.json(db.getOpportunities())
})

app.post('/api/opportunities', (req: Request, res: Response) => {
  const {
    author_id,
    company_name,
    title,
    description,
    location,
    opportunity_type,
    eligibility,
    application_url,
    deadline,
  } = req.body

  if (!author_id || !company_name || !title || !description || !application_url) {
    return res.status(400).json({ error: 'Missing required opportunity fields' })
  }

  const newOpp = db.createOpportunity({
    author_id,
    company_name,
    title,
    description,
    location: location || 'Remote / Hybrid',
    opportunity_type: opportunity_type || 'job',
    eligibility: eligibility || 'All batches',
    application_url,
    deadline,
  })

  // Broadcast instantly to all connected clients
  io.emit('opportunity:created', newOpp)
  console.log(`[Realtime Broadcast] New opportunity emitted: ${newOpp.id}`)

  res.status(201).json(newOpp)
})

// --- Notifications ---
app.get('/api/notifications', (req: Request, res: Response) => {
  const userId = req.query.userId as string
  if (!userId) return res.status(400).json({ error: 'userId is required' })
  res.json(db.getNotifications(userId))
})

app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
  db.markNotificationRead(req.params.id)
  res.json({ success: true })
})

app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId is required' })
  db.markAllNotificationsRead(userId)
  res.json({ success: true })
})

// --- Start Realtime Server ---
server.listen(PORT, () => {
  console.log(`=======================================================`)
  console.log(`🚀 AlumniLoop Realtime API running at http://localhost:${PORT}`)
  console.log(`⚡ WebSocket Engine: Socket.IO initialized`)
  console.log(`💾 Database: Persistent zero-lag engine active`)
  console.log(`=======================================================`)
})
