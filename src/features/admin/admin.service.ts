// ====================================================================
// AlumniLoop — Administrative Management & Audit Service
// File: src/features/admin/admin.service.ts
// ====================================================================

import {
  Profile,
  SeniorVerificationRequest,
  Report,
  AdminAction,
} from '@/types/database.types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mockStore } from '@/lib/mockStore'
import { authService } from '@/features/auth/auth.service'
import { fetchFromAPI } from '@/lib/api'

export interface AdminStats {
  pendingMembersCount: number
  approvedMembersCount: number
  seniorRequestsCount: number
  pendingReportsCount: number
  totalPostsCount: number
  totalOpportunitiesCount: number
}

export const adminService = {
  async ensureAdmin(): Promise<{ adminId: string; adminProfile: Profile }> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile || !session.isAdmin) {
      throw new Error('Access denied: Administrator privileges required.')
    }
    return { adminId: session.user.id, adminProfile: session.profile }
  },

  async getStats(): Promise<AdminStats> {
    await this.ensureAdmin()

    if (isSupabaseConfigured() && supabase) {
      const [
        { count: pendingCount },
        { count: approvedCount },
        { count: seniorReqCount },
        { count: reportsCount },
        { count: postsCount },
        { count: oppsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved'),
        supabase.from('senior_verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }),
      ])

      return {
        pendingMembersCount: pendingCount || 0,
        approvedMembersCount: approvedCount || 0,
        seniorRequestsCount: seniorReqCount || 0,
        pendingReportsCount: reportsCount || 0,
        totalPostsCount: postsCount || 0,
        totalOpportunitiesCount: oppsCount || 0,
      }
    }

    const profiles = mockStore.getProfiles()
    const seniorRequests = mockStore.getSeniorRequests()
    const reports = mockStore.getReports()
    const posts = mockStore.getPosts()
    const opps = mockStore.getOpportunities()

    return {
      pendingMembersCount: profiles.filter((p) => p.account_status === 'pending').length,
      approvedMembersCount: profiles.filter((p) => p.account_status === 'approved').length,
      seniorRequestsCount: seniorRequests.filter((r) => r.status === 'pending').length,
      pendingReportsCount: reports.filter((r) => r.status === 'pending').length,
      totalPostsCount: posts.length,
      totalOpportunitiesCount: opps.length,
    }
  },

  async getPendingRegistrations(): Promise<Profile[]> {
    await this.ensureAdmin()

    // Query SQLite backend first
    const apiPending = await fetchFromAPI<Profile[]>('/admin/pending')
    if (apiPending) return apiPending

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data as Profile[]
    }

    return mockStore.getProfiles().filter((p) => p.account_status === 'pending')
  },

  async approveMember(userId: string, reason = 'Verified college credentials'): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'approved', updated_at: now })
        .eq('id', userId)
      if (error) throw new Error(error.message)

      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'approve_member',
        target_user_id: userId,
        target_type: 'profile',
        target_id: userId,
        reason,
      })
      return
    }

    // --- API Server (persists to server JSON DB and broadcasts via Socket.IO) ---
    const updated = await fetchFromAPI<Profile>(`/profiles/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: 'approved' }),
    })

    // Also update in-memory store so UI is instantly reactive
    const profiles = mockStore.getProfiles().map((p) =>
      p.id === userId ? { ...p, account_status: 'approved' as const, updated_at: now } : p
    )
    mockStore.setProfiles(profiles)

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: 'approve_member',
      target_user_id: userId,
      target_type: 'profile',
      target_id: userId,
      reason,
      created_at: now,
    })
    mockStore.setAdminActions(actions)

    // Notify user
    const notifs = mockStore.getNotifications()
    notifs.unshift({
      id: crypto.randomUUID(),
      recipient_id: userId,
      actor_id: adminId,
      event_type: 'status_approved',
      post_id: null,
      comment_id: null,
      message: 'Welcome to AlumniLoop! Your registration has been approved by the AI&DS department coordinator.',
      read_at: null,
      created_at: now,
    })
    mockStore.setNotifications(notifs)
  },

  async rejectMember(userId: string, reason: string): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    if (!reason?.trim()) throw new Error('A reason is required when rejecting registration.')
    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('profiles')
        .update({ account_status: 'rejected', updated_at: now })
        .eq('id', userId)

      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'reject_member',
        target_user_id: userId,
        target_type: 'profile',
        target_id: userId,
        reason,
      })
      return
    }

    // --- API Server ---
    await fetchFromAPI(`/profiles/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: 'rejected' }),
    })

    const profiles = mockStore.getProfiles().map((p) =>
      p.id === userId ? { ...p, account_status: 'rejected' as const, updated_at: now } : p
    )
    mockStore.setProfiles(profiles)

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: 'reject_member',
      target_user_id: userId,
      target_type: 'profile',
      target_id: userId,
      reason,
      created_at: now,
    })
    mockStore.setAdminActions(actions)
  },

  async suspendMember(userId: string, reason: string): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    if (!reason?.trim()) throw new Error('A reason is required to suspend an account.')
    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('profiles')
        .update({ account_status: 'suspended', updated_at: now })
        .eq('id', userId)

      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'suspend_member',
        target_user_id: userId,
        target_type: 'profile',
        target_id: userId,
        reason,
      })
      return
    }

    // --- API Server ---
    await fetchFromAPI(`/profiles/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: 'suspended' }),
    })

    const profiles = mockStore.getProfiles().map((p) =>
      p.id === userId ? { ...p, account_status: 'suspended' as const, updated_at: now } : p
    )
    mockStore.setProfiles(profiles)

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: 'suspend_member',
      target_user_id: userId,
      target_type: 'profile',
      target_id: userId,
      reason,
      created_at: now,
    })
    mockStore.setAdminActions(actions)
  },

  async reinstateMember(userId: string, reason = 'Account reinstated'): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('profiles')
        .update({ account_status: 'approved', updated_at: now })
        .eq('id', userId)

      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'reinstate_member',
        target_user_id: userId,
        target_type: 'profile',
        target_id: userId,
        reason,
      })
      return
    }

    const profiles = mockStore.getProfiles().map((p) =>
      p.id === userId ? { ...p, account_status: 'approved' as const, updated_at: now } : p
    )
    mockStore.setProfiles(profiles)

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: 'reinstate_member',
      target_user_id: userId,
      target_type: 'profile',
      target_id: userId,
      reason,
      created_at: now,
    })
    mockStore.setAdminActions(actions)
  },

  async getAllMembers(): Promise<Profile[]> {
    await this.ensureAdmin()

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data as Profile[]
    }

    return mockStore.getProfiles()
  },

  async getSeniorRequests(): Promise<SeniorVerificationRequest[]> {
    await this.ensureAdmin()

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('senior_verification_requests')
        .select('*, user:profiles(*)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data as SeniorVerificationRequest[]
    }

    const requests = mockStore.getSeniorRequests()
    const profiles = mockStore.getProfiles()
    return requests.map((r) => ({
      ...r,
      user: profiles.find((p) => p.id === r.user_id),
    }))
  },

  async approveSeniorRequest(requestId: string, reason = 'Verified placement credentials'): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    const now = new Date().toISOString()

    let targetUserId = ''

    if (isSupabaseConfigured() && supabase) {
      const { data: req } = await supabase
        .from('senior_verification_requests')
        .select('user_id, company_name, job_role')
        .eq('id', requestId)
        .single()

      if (!req) throw new Error('Request not found.')
      targetUserId = req.user_id

      await supabase
        .from('senior_verification_requests')
        .update({ status: 'approved', reviewed_by: adminId, updated_at: now })
        .eq('id', requestId)

      await supabase
        .from('profiles')
        .update({
          senior_verified: true,
          company_name: req.company_name,
          job_role: req.job_role,
          updated_at: now,
        })
        .eq('id', targetUserId)

      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'verify_senior',
        target_user_id: targetUserId,
        target_type: 'senior_request',
        target_id: requestId,
        reason,
      })
      return
    }

    const requests = mockStore.getSeniorRequests()
    const target = requests.find((r) => r.id === requestId)
    if (!target) throw new Error('Request not found.')
    targetUserId = target.user_id

    mockStore.setSeniorRequests(
      requests.map((r) =>
        r.id === requestId ? { ...r, status: 'approved' as const, reviewed_by: adminId, updated_at: now } : r
      )
    )

    mockStore.setProfiles(
      mockStore.getProfiles().map((p) =>
        p.id === targetUserId
          ? {
              ...p,
              senior_verified: true,
              company_name: target.company_name,
              job_role: target.job_role,
              updated_at: now,
            }
          : p
      )
    )

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: 'verify_senior',
      target_user_id: targetUserId,
      target_type: 'senior_request',
      target_id: requestId,
      reason,
      created_at: now,
    })
    mockStore.setAdminActions(actions)

    // Notify user
    const notifs = mockStore.getNotifications()
    notifs.unshift({
      id: crypto.randomUUID(),
      recipient_id: targetUserId,
      actor_id: adminId,
      event_type: 'senior_verified',
      post_id: null,
      comment_id: null,
      message: `Congratulations! Your Senior / Placed Alumni status at ${target.company_name} has been verified by the administrator.`,
      read_at: null,
      created_at: now,
    })
    mockStore.setNotifications(notifs)
  },

  async rejectSeniorRequest(requestId: string, reason: string): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    if (!reason?.trim()) throw new Error('A reason is required to reject verification.')
    const now = new Date().toISOString()

    const requests = mockStore.getSeniorRequests()
    const target = requests.find((r) => r.id === requestId)
    if (!target) throw new Error('Request not found.')

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('senior_verification_requests')
        .update({ status: 'rejected', rejection_reason: reason, reviewed_by: adminId, updated_at: now })
        .eq('id', requestId)

      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'revoke_senior',
        target_user_id: target.user_id,
        target_type: 'senior_request',
        target_id: requestId,
        reason,
      })
      return
    }

    mockStore.setSeniorRequests(
      requests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'rejected' as const, rejection_reason: reason, reviewed_by: adminId, updated_at: now }
          : r
      )
    )

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: 'revoke_senior',
      target_user_id: target.user_id,
      target_type: 'senior_request',
      target_id: requestId,
      reason,
      created_at: now,
    })
    mockStore.setAdminActions(actions)
  },

  async getReports(): Promise<Report[]> {
    await this.ensureAdmin()

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('reports')
        .select('*, reporter:profiles(*)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data as Report[]
    }

    const reports = mockStore.getReports()
    const profiles = mockStore.getProfiles()
    return reports.map((r) => ({
      ...r,
      reporter: profiles.find((p) => p.id === r.reporter_id),
    }))
  },

  async resolveReport(reportId: string, status: 'dismissed' | 'actioned', details?: string): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('reports')
        .update({ status, reviewed_by: adminId, updated_at: now })
        .eq('id', reportId)

      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'resolve_report',
        target_type: 'report',
        target_id: reportId,
        reason: details || `Marked report as ${status}`,
      })
      return
    }

    const reports = mockStore.getReports().map((r) =>
      r.id === reportId ? { ...r, status, reviewed_by: adminId, updated_at: now } : r
    )
    mockStore.setReports(reports)

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: 'resolve_report',
      target_user_id: null,
      target_type: 'report',
      target_id: reportId,
      reason: details || `Marked report as ${status}`,
      created_at: now,
    })
    mockStore.setAdminActions(actions)
  },

  async togglePinPost(postId: string, isPinned: boolean): Promise<void> {
    const { adminId } = await this.ensureAdmin()
    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('posts').update({ is_pinned: isPinned }).eq('id', postId)
      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: isPinned ? 'pin_post' : 'unpin_post',
        target_type: 'post',
        target_id: postId,
      })
      return
    }

    const posts = mockStore.getPosts().map((p) => (p.id === postId ? { ...p, is_pinned: isPinned } : p))
    mockStore.setPosts(posts)

    const actions = mockStore.getAdminActions()
    actions.unshift({
      id: crypto.randomUUID(),
      admin_id: adminId,
      action_type: isPinned ? 'pin_post' : 'unpin_post',
      target_user_id: null,
      target_type: 'post',
      target_id: postId,
      reason: null,
      created_at: now,
    })
    mockStore.setAdminActions(actions)
  },

  async getAuditLogs(): Promise<AdminAction[]> {
    await this.ensureAdmin()

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('admin_actions')
        .select('*, admin:profiles!admin_actions_admin_id_fkey(*), target_user:profiles!admin_actions_target_user_id_fkey(*)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data as AdminAction[]
    }

    const actions = mockStore.getAdminActions()
    const profiles = mockStore.getProfiles()
    return actions.map((a) => ({
      ...a,
      admin: profiles.find((p) => p.id === a.admin_id),
      target_user: a.target_user_id ? profiles.find((p) => p.id === a.target_user_id) : undefined,
    }))
  },

  // Aliases for AdminPage
  async getPendingMembers(): Promise<Profile[]> {
    return this.getPendingRegistrations()
  },
  async approveUser(userId: string, reason = 'Approved by administrator'): Promise<void> {
    return this.approveMember(userId, reason)
  },
  async rejectUser(userId: string, reason: string): Promise<void> {
    return this.rejectMember(userId, reason)
  },
  async suspendUser(userId: string, reason: string): Promise<void> {
    return this.suspendMember(userId, reason)
  },
  async getPendingSeniorRequests(): Promise<SeniorVerificationRequest[]> {
    const reqs = await this.getSeniorRequests()
    return reqs.filter((r) => r.status === 'pending')
  },
  async approveSeniorVerification(requestId: string, reason = 'Verified placement credentials'): Promise<void> {
    return this.approveSeniorRequest(requestId, reason)
  },
  async rejectSeniorVerification(requestId: string, reason: string): Promise<void> {
    return this.rejectSeniorRequest(requestId, reason)
  },
  async getPendingReports(): Promise<Report[]> {
    const reps = await this.getReports()
    return reps.filter((r) => r.status === 'pending')
  },
}
