// ====================================================================
// AlumniLoop — Persistent Local Store (Emulates Supabase DB & Auth)
// File: src/lib/mockStore.ts
// ====================================================================

import {
  Profile,
  UserRole,
  Post,
  Comment,
  PostVote,
  Opportunity,
  Bookmark,
  Notification,
  Report,
  AdminAction,
  SeniorVerificationRequest,
} from '@/types/database.types'

const STORAGE_KEY_PREFIX = 'alumniloop_store_'

export interface DemoUserAccount {
  id: string
  email: string
  passwordHash: string
  profile: Profile
  role: 'admin' | 'moderator' | null
}

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'usr-admin-01',
    full_name: 'Campus Administrator',
    department: 'Training and Placement Cell',
    graduation_year: 2020,
    member_type: 'alumni',
    account_status: 'approved',
    senior_verified: true,
    company_name: 'Placement Directorate',
    job_role: 'Placement Administrator',
    bio: 'Platform administration and college community moderation.',
    avatar_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEMO_USERS: DemoUserAccount[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@gmail.com',
    passwordHash: 'admin123',
    profile: INITIAL_PROFILES[0],
    role: 'admin',
  },
]

const INITIAL_POSTS: Post[] = []
const INITIAL_COMMENTS: Comment[] = []
const INITIAL_OPPORTUNITIES: Opportunity[] = []
const INITIAL_SENIOR_REQUESTS: SeniorVerificationRequest[] = []
const INITIAL_ADMIN_ACTIONS: AdminAction[] = []

// Helper functions for reading and writing to localStorage
const isLocalStorageAvailable = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function' &&
      typeof window.localStorage.clear === 'function'
    )
  } catch {
    return false
  }
}

let memoryStore: Record<string, unknown> = {}

export function getStorageItem(key: string, fallback = ''): string {
  try {
    if (isLocalStorageAvailable()) {
      return window.localStorage.getItem(STORAGE_KEY_PREFIX + key) ?? fallback
    }
  } catch {}
  return (memoryStore[STORAGE_KEY_PREFIX + key] as string) ?? fallback
}

export function setStorageItem(key: string, val: string): void {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.setItem(STORAGE_KEY_PREFIX + key, val)
    }
  } catch {}
  memoryStore[STORAGE_KEY_PREFIX + key] = val
}

export function removeStorageItem(key: string): void {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.removeItem(STORAGE_KEY_PREFIX + key)
    }
  } catch {}
  delete memoryStore[STORAGE_KEY_PREFIX + key]
}

function getItem<T>(key: string, fallback: T): T {
  try {
    if (isLocalStorageAvailable()) {
      const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {}
  return (memoryStore[STORAGE_KEY_PREFIX + key] as T) ?? fallback
}

function setItem<T>(key: string, data: T): void {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data))
    }
  } catch {}
  memoryStore[STORAGE_KEY_PREFIX + key] = data
}

export const mockStore = {
  reset() {
    try {
      if (isLocalStorageAvailable()) {
        window.localStorage.clear()
      }
    } catch {}
    memoryStore = {}
  },

  getUsers(): DemoUserAccount[] {
    return getItem<DemoUserAccount[]>('users', DEMO_USERS)
  },

  setUsers(users: DemoUserAccount[]) {
    setItem('users', users)
  },

  getProfiles(): Profile[] {
    return getItem<Profile[]>('profiles', INITIAL_PROFILES)
  },

  setProfiles(profiles: Profile[]) {
    setItem('profiles', profiles)
  },

  getPosts(): Post[] {
    return getItem<Post[]>('posts', INITIAL_POSTS)
  },

  setPosts(posts: Post[]) {
    setItem('posts', posts)
  },

  getComments(): Comment[] {
    return getItem<Comment[]>('comments', INITIAL_COMMENTS)
  },

  setComments(comments: Comment[]) {
    setItem('comments', comments)
  },

  getVotes(): PostVote[] {
    return getItem<PostVote[]>('post_votes', [])
  },

  setVotes(votes: PostVote[]) {
    setItem('post_votes', votes)
  },

  getOpportunities(): Opportunity[] {
    return getItem<Opportunity[]>('opportunities', INITIAL_OPPORTUNITIES)
  },

  setOpportunities(opportunities: Opportunity[]) {
    setItem('opportunities', opportunities)
  },

  getBookmarks(): Bookmark[] {
    return getItem<Bookmark[]>('bookmarks', [])
  },

  setBookmarks(bookmarks: Bookmark[]) {
    setItem('bookmarks', bookmarks)
  },

  getNotifications(): Notification[] {
    return getItem<Notification[]>('notifications', [])
  },

  setNotifications(notifications: Notification[]) {
    setItem('notifications', notifications)
  },

  getReports(): Report[] {
    return getItem<Report[]>('reports', [])
  },

  setReports(reports: Report[]) {
    setItem('reports', reports)
  },

  getAdminActions(): AdminAction[] {
    return getItem<AdminAction[]>('admin_actions', INITIAL_ADMIN_ACTIONS)
  },

  setAdminActions(actions: AdminAction[]) {
    setItem('admin_actions', actions)
  },

  getSeniorRequests(): SeniorVerificationRequest[] {
    return getItem<SeniorVerificationRequest[]>('senior_requests', INITIAL_SENIOR_REQUESTS)
  },

  setSeniorRequests(requests: SeniorVerificationRequest[]) {
    setItem('senior_requests', requests)
  },
}
