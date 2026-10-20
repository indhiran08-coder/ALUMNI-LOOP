// ====================================================================
// AlumniLoop Realtime Backend — SQLite Database Engine (better-sqlite3)
// File: server/src/db.ts
// ====================================================================

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../data')
const SQLITE_FILE = path.join(DATA_DIR, 'alumniloop.sqlite')
const JSON_MIGRATION_FILE = path.join(DATA_DIR, 'alumniloop.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

export interface Profile {
  id: string
  full_name: string
  department: string
  graduation_year: number
  member_type: 'student' | 'alumni'
  account_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  senior_verified: boolean
  company_name: string | null
  job_role: string | null
  bio: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export interface UserAccount {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'moderator' | 'student' | 'alumni'
  created_at: string
}

export interface Post {
  id: string
  author_id: string
  title: string
  body: string
  image_url?: string | null
  post_type: 'question' | 'experience' | 'advice' | 'resource'
  category: string
  is_pinned: boolean
  upvotes_count: number
  downvotes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  author?: Profile
  user_vote?: number
  is_bookmarked?: boolean
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id: string | null
  body: string
  is_accepted_answer: boolean
  created_at: string
  updated_at: string
  author?: Profile
}

export interface Opportunity {
  id: string
  author_id: string
  company_name: string
  title: string
  description: string
  location: string
  opportunity_type: 'job' | 'internship' | 'referral'
  eligibility: string
  application_url: string
  deadline: string | null
  status: 'open' | 'closed' | 'expired'
  created_at: string
  updated_at: string
  author?: Profile
}

export class SQLiteDatabaseEngine {
  public db: Database.Database

  constructor() {
    this.db = new Database(SQLITE_FILE)
    this.init()
  }

  private init() {
    // Enable WAL mode for high concurrency & performance
    this.db.pragma('journal_mode = WAL')
    // Enable Foreign Keys with CASCADE deletes
    this.db.pragma('foreign_keys = ON')

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        department TEXT NOT NULL,
        graduation_year INTEGER NOT NULL,
        member_type TEXT NOT NULL,
        account_status TEXT NOT NULL DEFAULT 'pending',
        senior_verified INTEGER NOT NULL DEFAULT 0,
        company_name TEXT,
        job_role TEXT,
        bio TEXT,
        avatar_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        image_url TEXT,
        post_type TEXT NOT NULL,
        category TEXT NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        upvotes_count INTEGER NOT NULL DEFAULT 0,
        downvotes_count INTEGER NOT NULL DEFAULT 0,
        comments_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        parent_comment_id TEXT,
        body TEXT NOT NULL,
        is_accepted_answer INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS post_votes (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        value INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        post_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        opportunity_type TEXT NOT NULL,
        eligibility TEXT NOT NULL,
        application_url TEXT NOT NULL,
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipient_id TEXT NOT NULL,
        actor_id TEXT,
        event_type TEXT NOT NULL,
        entity_id TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
    `)

    try {
      this.db.exec(`ALTER TABLE posts ADD COLUMN image_url TEXT;`)
    } catch {
      // Column already exists
    }

    this.seedDefaultAdmin()
    this.migrateFromJsonIfPresent()
  }

  private seedDefaultAdmin() {
    const adminId = 'usr-admin-01'
    const existing = this.db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').get(adminId, 'admin@gmail.com')
    if (!existing) {
      const now = new Date().toISOString()
      const insertUser = this.db.prepare(`
        INSERT INTO users (id, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      const insertProfile = this.db.prepare(`
        INSERT INTO profiles (
          id, full_name, department, graduation_year, member_type,
          account_status, senior_verified, company_name, job_role,
          bio, avatar_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const tx = this.db.transaction(() => {
        insertUser.run(adminId, 'admin@gmail.com', 'admin123', 'admin', now)
        insertProfile.run(
          adminId,
          'Campus Administrator',
          'Training and Placement Cell',
          2020,
          'alumni',
          'approved',
          1,
          'Placement Directorate',
          'Placement Administrator',
          'Platform administration and college community moderation.',
          null,
          now,
          now
        )
      })
      tx()
      console.log('[SQLite] Seeded default administrator account: admin@gmail.com')
    }
  }

  private migrateFromJsonIfPresent() {
    try {
      if (!fs.existsSync(JSON_MIGRATION_FILE)) return
      const raw = fs.readFileSync(JSON_MIGRATION_FILE, 'utf-8')
      const json = JSON.parse(raw)

      const profileCount = (this.db.prepare('SELECT COUNT(*) as c FROM profiles').get() as { c: number }).c
      if (profileCount <= 1 && json.profiles && json.profiles.length > 0) {
        console.log('[SQLite] Migrating legacy records from JSON into SQLite...')
        const insertUser = this.db.prepare(`
          INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        const insertProfile = this.db.prepare(`
          INSERT OR IGNORE INTO profiles (
            id, full_name, department, graduation_year, member_type,
            account_status, senior_verified, company_name, job_role,
            bio, avatar_path, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const tx = this.db.transaction(() => {
          for (const p of json.profiles) {
            insertUser.run(p.id, `${p.id}@alumni.edu`, 'password123', p.id === 'usr-admin-01' ? 'admin' : 'student', p.created_at)
            insertProfile.run(
              p.id,
              p.full_name,
              p.department,
              p.graduation_year,
              p.member_type,
              p.account_status,
              p.senior_verified ? 1 : 0,
              p.company_name,
              p.job_role,
              p.bio,
              p.avatar_path,
              p.created_at,
              p.updated_at
            )
          }
        })
        tx()
      }
    } catch (err) {
      console.warn('[SQLite] Notice during JSON migration:', err)
    }
  }

  // ==========================================
  // Auth & Accounts
  // ==========================================

  getUserByEmail(email: string): (UserAccount & { profile: Profile }) | null {
    const row = this.db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.role, u.created_at,
             p.full_name, p.department, p.graduation_year, p.member_type,
             p.account_status, p.senior_verified, p.company_name, p.job_role,
             p.bio, p.avatar_path, p.created_at as prof_created_at, p.updated_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      WHERE u.email = ?
    `).get(email.trim().toLowerCase()) as any

    if (!row) return null

    const profile: Profile = {
      id: row.id,
      full_name: row.full_name,
      department: row.department,
      graduation_year: row.graduation_year,
      member_type: row.member_type,
      account_status: row.account_status,
      senior_verified: Boolean(row.senior_verified),
      company_name: row.company_name,
      job_role: row.job_role,
      bio: row.bio,
      avatar_path: row.avatar_path,
      created_at: row.prof_created_at,
      updated_at: row.updated_at,
    }

    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      created_at: row.created_at,
      profile,
    }
  }

  getUserById(id: string): (UserAccount & { profile: Profile }) | null {
    const row = this.db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.role, u.created_at,
             p.full_name, p.department, p.graduation_year, p.member_type,
             p.account_status, p.senior_verified, p.company_name, p.job_role,
             p.bio, p.avatar_path, p.created_at as prof_created_at, p.updated_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      WHERE u.id = ?
    `).get(id) as any

    if (!row) return null

    const profile: Profile = {
      id: row.id,
      full_name: row.full_name,
      department: row.department,
      graduation_year: row.graduation_year,
      member_type: row.member_type,
      account_status: row.account_status,
      senior_verified: Boolean(row.senior_verified),
      company_name: row.company_name,
      job_role: row.job_role,
      bio: row.bio,
      avatar_path: row.avatar_path,
      created_at: row.prof_created_at,
      updated_at: row.updated_at,
    }

    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      created_at: row.created_at,
      profile,
    }
  }

  createUser(user: { id: string; email: string; password_hash: string; role: string }, profile: Profile): Profile {
    const insertUser = this.db.prepare(`
      INSERT INTO users (id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    const insertProfile = this.db.prepare(`
      INSERT INTO profiles (
        id, full_name, department, graduation_year, member_type,
        account_status, senior_verified, company_name, job_role,
        bio, avatar_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = this.db.transaction(() => {
      insertUser.run(user.id, user.email.toLowerCase(), user.password_hash, user.role, profile.created_at)
      insertProfile.run(
        profile.id,
        profile.full_name,
        profile.department,
        profile.graduation_year,
        profile.member_type,
        profile.account_status,
        profile.senior_verified ? 1 : 0,
        profile.company_name,
        profile.job_role,
        profile.bio,
        profile.avatar_path,
        profile.created_at,
        profile.updated_at
      )
    })
    tx()

    return profile
  }

  // ==========================================
  // Profiles
  // ==========================================

  getProfiles(): Profile[] {
    const rows = this.db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all() as any[]
    return rows.map((r) => ({
      ...r,
      senior_verified: Boolean(r.senior_verified),
    }))
  }

  getProfileById(id: string): (Profile & { role?: string }) | undefined {
    const r = this.db.prepare(`
      SELECT p.*, u.role
      FROM profiles p
      LEFT JOIN users u ON p.id = u.id
      WHERE p.id = ?
    `).get(id) as any
    if (!r) return undefined
    return {
      ...r,
      senior_verified: Boolean(r.senior_verified),
    }
  }

  createProfile(profile: Profile): Profile {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO profiles (
        id, full_name, department, graduation_year, member_type,
        account_status, senior_verified, company_name, job_role,
        bio, avatar_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      profile.id,
      profile.full_name,
      profile.department,
      profile.graduation_year,
      profile.member_type,
      profile.account_status,
      profile.senior_verified ? 1 : 0,
      profile.company_name,
      profile.job_role,
      profile.bio,
      profile.avatar_path,
      profile.created_at,
      profile.updated_at
    )
    return profile
  }

  updateProfile(id: string, updates: Partial<Profile>): Profile | null {
    const current = this.getProfileById(id)
    if (!current) return null

    const updated = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const stmt = this.db.prepare(`
      UPDATE profiles
      SET full_name = ?, department = ?, graduation_year = ?,
          member_type = ?, account_status = ?, senior_verified = ?,
          company_name = ?, job_role = ?, bio = ?, avatar_path = ?,
          updated_at = ?
      WHERE id = ?
    `)
    stmt.run(
      updated.full_name,
      updated.department,
      updated.graduation_year,
      updated.member_type,
      updated.account_status,
      updated.senior_verified ? 1 : 0,
      updated.company_name,
      updated.job_role,
      updated.bio,
      updated.avatar_path,
      updated.updated_at,
      id
    )

    return updated
  }

  getVerifiedSeniors(): Profile[] {
    const rows = this.db.prepare('SELECT * FROM profiles WHERE senior_verified = 1').all() as any[]
    return rows.map((r) => ({
      ...r,
      senior_verified: true,
    }))
  }

  // ==========================================
  // Posts
  // ==========================================

  getPosts(userId?: string): Post[] {
    const rows = this.db.prepare('SELECT * FROM posts ORDER BY is_pinned DESC, created_at DESC').all() as any[]
    return rows.map((post) => this.hydratePost(post, userId))
  }

  getPostById(id: string, userId?: string): Post | undefined {
    const row = this.db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any
    if (!row) return undefined
    return this.hydratePost(row, userId)
  }

  private hydratePost(row: any, userId?: string): Post {
    const author = this.getProfileById(row.author_id)
    let userVote = 0
    let isBookmarked = false

    if (userId) {
      const v = this.db.prepare('SELECT value FROM post_votes WHERE post_id = ? AND user_id = ?').get(row.id, userId) as any
      if (v) userVote = v.value

      const b = this.db.prepare('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?').get(row.id, userId) as any
      if (b) isBookmarked = true
    }

    return {
      id: row.id,
      author_id: row.author_id,
      title: row.title,
      body: row.body,
      image_url: row.image_url || null,
      post_type: row.post_type,
      category: row.category,
      is_pinned: Boolean(row.is_pinned),
      upvotes_count: row.upvotes_count,
      downvotes_count: row.downvotes_count,
      comments_count: row.comments_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author,
      user_vote: userVote,
      is_bookmarked: isBookmarked,
    }
  }

  createPost(input: {
    author_id: string
    title: string
    body: string
    image_url?: string | null
    post_type: 'question' | 'experience' | 'advice' | 'resource'
    category: string
  }): Post {
    const postId = `post-${Date.now()}`
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO posts (
        id, author_id, title, body, image_url, post_type, category,
        is_pinned, upvotes_count, downvotes_count, comments_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
    `)
    stmt.run(postId, input.author_id, input.title, input.body, input.image_url || null, input.post_type, input.category, now, now)

    return this.getPostById(postId)!
  }

  deletePost(id: string): boolean {
    // Foreign key CASCADE will automatically delete comments, post_votes, and bookmarks!
    const info = this.db.prepare('DELETE FROM posts WHERE id = ?').run(id)
    return info.changes > 0
  }

  votePost(postId: string, userId: string, value: 1 | -1): { post: Post; userVote: number } {
    const post = this.getPostById(postId)
    if (!post) throw new Error('Post not found')

    const existingVote = this.db.prepare('SELECT * FROM post_votes WHERE post_id = ? AND user_id = ?').get(postId, userId) as any

    const tx = this.db.transaction(() => {
      let finalVote = 0
      if (existingVote) {
        if (existingVote.value === value) {
          // Toggle off
          this.db.prepare('DELETE FROM post_votes WHERE id = ?').run(existingVote.id)
          if (value === 1) {
            this.db.prepare('UPDATE posts SET upvotes_count = MAX(0, upvotes_count - 1) WHERE id = ?').run(postId)
          } else {
            this.db.prepare('UPDATE posts SET downvotes_count = MAX(0, downvotes_count - 1) WHERE id = ?').run(postId)
          }
          finalVote = 0
        } else {
          // Change vote
          this.db.prepare('UPDATE post_votes SET value = ?, updated_at = ? WHERE id = ?').run(value, new Date().toISOString(), existingVote.id)
          if (value === 1) {
            this.db.prepare('UPDATE posts SET upvotes_count = upvotes_count + 1, downvotes_count = MAX(0, downvotes_count - 1) WHERE id = ?').run(postId)
          } else {
            this.db.prepare('UPDATE posts SET downvotes_count = downvotes_count + 1, upvotes_count = MAX(0, upvotes_count - 1) WHERE id = ?').run(postId)
          }
          finalVote = value
        }
      } else {
        // Insert new vote
        const voteId = `pv-${Date.now()}`
        const now = new Date().toISOString()
        this.db.prepare('INSERT INTO post_votes (id, post_id, user_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(voteId, postId, userId, value, now, now)
        if (value === 1) {
          this.db.prepare('UPDATE posts SET upvotes_count = upvotes_count + 1 WHERE id = ?').run(postId)
        } else {
          this.db.prepare('UPDATE posts SET downvotes_count = downvotes_count + 1 WHERE id = ?').run(postId)
        }
        finalVote = value
      }
      return finalVote
    })

    const finalUserVote = tx()
    return {
      post: this.getPostById(postId, userId)!,
      userVote: finalUserVote,
    }
  }

  // ==========================================
  // Bookmarks
  // ==========================================

  toggleBookmark(postId: string, userId: string): boolean {
    const existing = this.db.prepare('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?').get(postId, userId) as any
    if (existing) {
      this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id)
      return false
    } else {
      const bmId = `bm-${Date.now()}`
      this.db.prepare('INSERT INTO bookmarks (id, user_id, post_id, created_at) VALUES (?, ?, ?, ?)').run(bmId, userId, postId, new Date().toISOString())
      return true
    }
  }

  getBookmarkedPosts(userId: string): Post[] {
    const rows = this.db.prepare(`
      SELECT p.* FROM posts p
      JOIN bookmarks b ON p.id = b.post_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId) as any[]
    return rows.map((post) => this.hydratePost(post, userId))
  }

  // ==========================================
  // Comments
  // ==========================================

  getCommentsByPostId(postId: string): Comment[] {
    const rows = this.db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY is_accepted_answer DESC, created_at ASC').all(postId) as any[]
    return rows.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      author_id: r.author_id,
      parent_comment_id: r.parent_comment_id,
      body: r.body,
      is_accepted_answer: Boolean(r.is_accepted_answer),
      created_at: r.created_at,
      updated_at: r.updated_at,
      author: this.getProfileById(r.author_id),
    }))
  }

  createComment(input: {
    post_id: string
    author_id: string
    body: string
    parent_comment_id?: string | null
  }): Comment {
    const commentId = `cmt-${Date.now()}`
    const now = new Date().toISOString()

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO comments (
          id, post_id, author_id, parent_comment_id, body,
          is_accepted_answer, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(commentId, input.post_id, input.author_id, input.parent_comment_id || null, input.body, now, now)

      this.db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(input.post_id)
    })
    tx()

    const r = this.db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as any
    return {
      id: r.id,
      post_id: r.post_id,
      author_id: r.author_id,
      parent_comment_id: r.parent_comment_id,
      body: r.body,
      is_accepted_answer: Boolean(r.is_accepted_answer),
      created_at: r.created_at,
      updated_at: r.updated_at,
      author: this.getProfileById(r.author_id),
    }
  }

  acceptAnswer(commentId: string, postId: string): Comment {
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE comments SET is_accepted_answer = 0 WHERE post_id = ?').run(postId)
      this.db.prepare('UPDATE comments SET is_accepted_answer = 1 WHERE id = ?').run(commentId)
    })
    tx()

    const r = this.db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as any
    return {
      id: r.id,
      post_id: r.post_id,
      author_id: r.author_id,
      parent_comment_id: r.parent_comment_id,
      body: r.body,
      is_accepted_answer: true,
      created_at: r.created_at,
      updated_at: r.updated_at,
      author: this.getProfileById(r.author_id),
    }
  }

  getCommentById(commentId: string): Comment | null {
    const r = this.db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as any
    if (!r) return null
    return {
      id: r.id,
      post_id: r.post_id,
      author_id: r.author_id,
      parent_comment_id: r.parent_comment_id,
      body: r.body,
      is_accepted_answer: Boolean(r.is_accepted_answer),
      created_at: r.created_at,
      updated_at: r.updated_at,
      author: this.getProfileById(r.author_id),
    }
  }

  deleteComment(commentId: string): boolean {
    const comment = this.db.prepare('SELECT post_id FROM comments WHERE id = ?').get(commentId) as any
    if (!comment) return false

    const tx = this.db.transaction(() => {
      // Also delete any child replies
      this.db.prepare('DELETE FROM comments WHERE parent_comment_id = ?').run(commentId)
      this.db.prepare('DELETE FROM comments WHERE id = ?').run(commentId)
      // Decrement post comment count
      this.db.prepare('UPDATE posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?').run(comment.post_id)
    })
    tx()
    return true
  }

  // ==========================================
  // Opportunities
  // ==========================================

  getOpportunities(): Opportunity[] {
    const rows = this.db.prepare("SELECT * FROM opportunities WHERE status = 'open' ORDER BY created_at DESC").all() as any[]
    return rows.map((r) => ({
      ...r,
      author: this.getProfileById(r.author_id),
    }))
  }

  createOpportunity(input: {
    author_id: string
    company_name: string
    title: string
    description: string
    location: string
    opportunity_type: 'job' | 'internship' | 'referral'
    eligibility: string
    application_url: string
    deadline?: string | null
  }): Opportunity {
    const id = `opp-${Date.now()}`
    const now = new Date().toISOString()

    this.db.prepare(`
      INSERT INTO opportunities (
        id, author_id, company_name, title, description,
        location, opportunity_type, eligibility, application_url,
        deadline, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(
      id,
      input.author_id,
      input.company_name,
      input.title,
      input.description,
      input.location,
      input.opportunity_type,
      input.eligibility,
      input.application_url,
      input.deadline || null,
      now,
      now
    )

    const r = this.db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id) as any
    return {
      ...r,
      author: this.getProfileById(r.author_id),
    }
  }

  // ==========================================
  // Admin Operations
  // ==========================================

  getPendingUsers(): Profile[] {
    const rows = this.db.prepare('SELECT * FROM profiles WHERE account_status = "pending" ORDER BY created_at DESC').all() as any[]
    return rows.map((r) => ({
      ...r,
      senior_verified: Boolean(r.senior_verified),
    }))
  }

  approveUser(userId: string): Profile | null {
    return this.updateProfile(userId, { account_status: 'approved' })
  }

  rejectUser(userId: string): Profile | null {
    return this.updateProfile(userId, { account_status: 'rejected' })
  }

  suspendUser(userId: string): Profile | null {
    return this.updateProfile(userId, { account_status: 'suspended' })
  }

  reinstateUser(userId: string): Profile | null {
    return this.updateProfile(userId, { account_status: 'approved' })
  }

  // Alias for getCommentsByPostId
  getComments(postId: string): Comment[] {
    return this.getCommentsByPostId(postId)
  }

  // ==========================================
  // Notifications
  // ==========================================

  getNotifications(userId: string): any[] {
    const rows = this.db.prepare('SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50').all(userId) as any[]
    return rows.map((r) => ({
      ...r,
      is_read: Boolean(r.is_read),
      actor: r.actor_id ? this.getProfileById(r.actor_id) : undefined,
    }))
  }

  markNotificationRead(id: string): void {
    this.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id)
  }

  markAllNotificationsRead(userId: string): void {
    this.db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?').run(userId)
  }
}

export const db = new SQLiteDatabaseEngine()
