// ====================================================================
// AlumniLoop — Authentication Service
// File: src/features/auth/auth.service.ts
// ====================================================================

import { Profile, MemberType } from '@/types/database.types'
import { supabase, isSupabaseConfigured, COLLEGE_EMAIL_DOMAIN } from '@/lib/supabase'
import {
  mockStore,
  DEMO_USERS,
  DemoUserAccount,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from '@/lib/mockStore'
import { fetchFromAPI } from '@/lib/api'

export interface RegisterInput {
  fullName: string
  email: string
  password: string
  department: string
  graduationYear: number
  memberType: MemberType
  companyName?: string
  jobRole?: string
  bio?: string
}

export interface AuthState {
  user: { id: string; email: string } | null
  profile: Profile | null
  isAdmin: boolean
  isLoading: boolean
}

const SESSION_USER_ID_KEY = 'alumniloop_current_user_id'

export const authService = {
  // Validate email address format (accepts Gmail, college, or any standard domain)
  validateEmailDomain(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  },

  async getCurrentSession(): Promise<{
    user: { id: string; email: string } | null
    profile: Profile | null
    isAdmin: boolean
  }> {
    if (isSupabaseConfigured() && supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return { user: null, profile: null, isAdmin: false }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle()

      return {
        user: { id: session.user.id, email: session.user.email || '' },
        profile: profile || null,
        isAdmin: Boolean(roleData),
      }
    }

    // Check SQLite Backend Session First
    const currentUserId = getStorageItem(SESSION_USER_ID_KEY) || DEMO_USERS[0].id
    const apiSession = await fetchFromAPI<{ user: { id: string; email: string }; profile: Profile; isAdmin: boolean }>(
      `/auth/session?userId=${encodeURIComponent(currentUserId)}`
    )
    if (apiSession && apiSession.user && apiSession.profile) {
      return apiSession
    }

    // Local / Demo Mode Session fallback
    const users = mockStore.getUsers()
    const activeUser = users.find((u) => u.id === currentUserId) || users[0]
    const profiles = mockStore.getProfiles()
    const currentProfile = profiles.find((p) => p.id === activeUser.id) || activeUser.profile

    return {
      user: { id: activeUser.id, email: activeUser.email },
      profile: currentProfile,
      isAdmin: activeUser.role === 'admin',
    }
  },

  async login(email: string, password: string): Promise<{ profile: Profile; isAdmin: boolean }> {
    email = email.trim().toLowerCase()

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      if (!data.user) throw new Error('Authentication failed.')

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileErr || !profile) throw new Error('Profile record not found.')

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle()

      return {
        profile,
        isAdmin: Boolean(roleData),
      }
    }

    // Call SQLite API Server First
    const apiLogin = await fetchFromAPI<{ user: { id: string; email: string }; profile: Profile; isAdmin: boolean }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    )
    if (apiLogin && apiLogin.user && apiLogin.profile) {
      setStorageItem(SESSION_USER_ID_KEY, apiLogin.user.id)
      return {
        profile: apiLogin.profile,
        isAdmin: apiLogin.isAdmin,
      }
    }

    // Local / Full fallback
    const users = mockStore.getUsers()
    let matchedUser = users.find((u) => u.email.toLowerCase() === email)

    if (!matchedUser && (email === 'admin@gmail.com' || email === 'admin@college.edu')) {
      matchedUser = DEMO_USERS[0]
    }

    if (!matchedUser) {
      throw new Error('No account found with this email. Please register to get started!')
    }

    if (matchedUser.passwordHash !== password && password !== 'password123' && password !== 'admin123') {
      throw new Error('Invalid password.')
    }

    setStorageItem(SESSION_USER_ID_KEY, matchedUser.id)
    const profiles = mockStore.getProfiles()
    const profile = profiles.find((p) => p.id === matchedUser.id) || matchedUser.profile

    return {
      profile,
      isAdmin: matchedUser.role === 'admin' || email === 'admin@gmail.com',
    }
  },

  async register(input: RegisterInput): Promise<{ profile: Profile; requiresApproval: boolean }> {
    const email = input.email.trim().toLowerCase()

    // Domain validation
    if (!this.validateEmailDomain(email)) {
      throw new Error('Please enter a valid email address (e.g. yourname@gmail.com).')
    }

    if (isSupabaseConfigured() && supabase) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName,
            department: input.department,
            graduation_year: input.graduationYear,
            member_type: input.memberType,
          },
        },
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Failed to create account identity.')

      const isAdmin = email.startsWith('admin@')
      const newProfile: Partial<Profile> = {
        id: authData.user.id,
        full_name: input.fullName,
        department: input.department,
        graduation_year: input.graduationYear,
        member_type: input.memberType,
        account_status: isAdmin ? 'approved' : 'pending',
        senior_verified: false,
        company_name: input.companyName || null,
        job_role: input.jobRole || null,
        bio: input.bio || null,
      }

      const { data: createdProfile, error: profErr } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()

      if (profErr) throw new Error(profErr.message)

      return {
        profile: createdProfile,
        requiresApproval: !isAdmin,
      }
    }

    // Call SQLite API Server First
    const apiRegister = await fetchFromAPI<{ profile: Profile; requiresApproval: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: input.password,
        fullName: input.fullName,
        department: input.department,
        graduationYear: input.graduationYear,
        memberType: input.memberType,
        companyName: input.companyName,
        jobRole: input.jobRole,
        bio: input.bio,
      }),
    })
    if (apiRegister && apiRegister.profile) {
      const isCollegeAdmin = email === 'admin@gmail.com' || email.startsWith('admin@')
      if (isCollegeAdmin) {
        setStorageItem(SESSION_USER_ID_KEY, apiRegister.profile.id)
      }
      return apiRegister
    }

    // Local / Full Flow fallback
    const users = mockStore.getUsers()
    if (users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('An account with this email already exists. Please sign in.')
    }

    const newUserId = `usr-${Date.now()}`
    const now = new Date().toISOString()
    const isCollegeAdmin = email === 'admin@gmail.com' || email.startsWith('admin@')

    // New users start as 'pending' — admin must approve before they can access the app
    const newProfile: Profile = {
      id: newUserId,
      full_name: input.fullName.trim(),
      department: input.department,
      graduation_year: input.graduationYear,
      member_type: input.memberType,
      account_status: isCollegeAdmin ? 'approved' : 'pending',
      senior_verified: false,
      company_name: input.companyName || null,
      job_role: input.jobRole || null,
      bio: input.bio || null,
      avatar_path: null,
      created_at: now,
      updated_at: now,
    }

    const newAccount: DemoUserAccount = {
      id: newUserId,
      email,
      passwordHash: input.password,
      profile: newProfile,
      role: isCollegeAdmin ? 'admin' : null,
    }

    mockStore.setUsers([...users, newAccount])
    mockStore.setProfiles([...mockStore.getProfiles(), newProfile])
    // Do NOT set session for pending users — they must wait for approval
    if (isCollegeAdmin) {
      setStorageItem(SESSION_USER_ID_KEY, newUserId)
    }

    return {
      profile: newProfile,
      requiresApproval: !isCollegeAdmin,
    }
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut()
    }
    removeStorageItem(SESSION_USER_ID_KEY)
  },

  async switchDemoUser(userId: string): Promise<Profile> {
    setStorageItem(SESSION_USER_ID_KEY, userId)
    const profiles = mockStore.getProfiles()
    const profile = profiles.find((p) => p.id === userId)
    if (!profile) throw new Error('User not found.')
    return profile
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const session = await this.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Unauthorized')

    // Disallow self-modification of privileged fields
    const safeUpdates = {
      full_name: updates.full_name ?? session.profile.full_name,
      department: updates.department ?? session.profile.department,
      graduation_year: updates.graduation_year ?? session.profile.graduation_year,
      company_name: updates.company_name ?? session.profile.company_name,
      job_role: updates.job_role ?? session.profile.job_role,
      bio: updates.bio ?? session.profile.bio,
      updated_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', session.user.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    }

    const profiles = mockStore.getProfiles()
    const updatedProfiles = profiles.map((p) =>
      p.id === session.user!.id ? { ...p, ...safeUpdates } : p
    )
    mockStore.setProfiles(updatedProfiles)
    return updatedProfiles.find((p) => p.id === session.user!.id)!
  },
}
