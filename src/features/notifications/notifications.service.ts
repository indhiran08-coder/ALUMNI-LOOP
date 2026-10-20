// ====================================================================
// AlumniLoop — In-App Notifications & Reporting Service
// File: src/features/notifications/notifications.service.ts
// ====================================================================

import { Notification, Report, ReportTargetType } from '@/types/database.types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mockStore } from '@/lib/mockStore'
import { authService } from '@/features/auth/auth.service'

export interface CreateReportInput {
  targetType: ReportTargetType
  targetId: string
  reason: string
  details?: string
}

export const notificationsService = {
  async getNotifications(): Promise<Notification[]> {
    const session = await authService.getCurrentSession()
    if (!session.user) return []

    const currentUserId = session.user.id

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, actor:profiles(*)')
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data as Notification[]
    }

    const notifs = mockStore.getNotifications()
    const profiles = mockStore.getProfiles()
    return notifs
      .filter((n) => n.recipient_id === currentUserId)
      .map((n) => ({
        ...n,
        actor: n.actor_id ? profiles.find((p) => p.id === n.actor_id) : undefined,
      }))
  },

  async markAsRead(id: string): Promise<void> {
    const session = await authService.getCurrentSession()
    if (!session.user) return

    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('recipient_id', session.user.id)
      return
    }

    const notifs = mockStore.getNotifications().map((n) =>
      n.id === id ? { ...n, read_at: now } : n
    )
    mockStore.setNotifications(notifs)
  },

  async markAllAsRead(): Promise<void> {
    const session = await authService.getCurrentSession()
    if (!session.user) return

    const now = new Date().toISOString()

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('recipient_id', session.user.id)
        .is('read_at', null)
      return
    }

    const notifs = mockStore.getNotifications().map((n) =>
      n.recipient_id === session.user!.id ? { ...n, read_at: now } : n
    )
    mockStore.setNotifications(notifs)
  },

  async submitReport(input: CreateReportInput): Promise<Report> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Authentication required.')
    if (session.profile.account_status !== 'approved' && !session.isAdmin) {
      throw new Error('Only approved members can report content.')
    }

    if (!input.reason.trim()) {
      throw new Error('Please select or specify a reason for this report.')
    }

    const newId = crypto.randomUUID()
    const now = new Date().toISOString()

    const report: Report = {
      id: newId,
      reporter_id: session.profile.id,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      status: 'pending',
      reviewed_by: null,
      created_at: now,
      updated_at: now,
      reporter: session.profile,
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          id: newId,
          reporter_id: session.profile.id,
          target_type: report.target_type,
          target_id: report.target_id,
          reason: report.reason,
          details: report.details,
        })
        .select('*, reporter:profiles(*)')
        .single()
      if (error) throw new Error(error.message)
      return data as Report
    }

    const reports = mockStore.getReports()
    mockStore.setReports([report, ...reports])
    return report
  },
}
