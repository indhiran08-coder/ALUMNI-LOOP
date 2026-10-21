// ====================================================================
// AlumniLoop — Bookmarks, Notifications & Settings Pages
// File: src/features/misc/pages/MiscPages.tsx
// ====================================================================

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Bell, BellOff, Settings, CheckCircle, Inbox, ShieldCheck, GraduationCap } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PostCard } from '@/components/posts/PostCard'
import { feedService } from '@/features/feed/feed.service'
import { notificationsService } from '@/features/notifications/notifications.service'
import { useAuth } from '@/app/providers'
import { mockStore } from '@/lib/mockStore'

export const BookmarksPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => feedService.getBookmarkedPosts(),
  })

  return (
    <AppShell>
      <div className="space-y-5 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#33A1C9]" />
            Saved Discussions
          </h1>
          <p className="text-xs text-slate-500 mt-1">Discussions you've bookmarked for later reference</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-3">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-12 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Bookmark className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="text-base font-bold text-slate-800">No Saved Discussions Yet</h3>
            <p className="text-xs text-slate-500">
              Click the bookmark icon on any discussion post to save it for later.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => queryClient.invalidateQueries({ queryKey: ['bookmarks'] })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: () => notificationsService.getNotifications(),
  })

  const handleMarkAllRead = async () => {
    await notificationsService.markAllAsRead()
    queryClient.invalidateQueries({ queryKey: ['notifications-page'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const handleMarkRead = async (id: string) => {
    await notificationsService.markAsRead(id)
    queryClient.invalidateQueries({ queryKey: ['notifications-page'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'status_approved': return '✅'
      case 'senior_verified': return '🏆'
      case 'accepted_answer': return '✔️'
      case 'post_comment': return '💬'
      case 'comment_reply': return '↩️'
      default: return '🔔'
    }
  }

  return (
    <AppShell>
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#33A1C9]" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="text-xs font-semibold text-[#33A1C9] hover:underline flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="text-base font-bold text-slate-800">All Caught Up!</h3>
            <p className="text-xs text-slate-500">No new notifications yet. Engage with community discussions to get updates.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => !notif.read_at && handleMarkRead(notif.id)}
                className={`px-5 py-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  !notif.read_at ? 'bg-[#eaf6fa]/60 hover:bg-[#eaf6fa]' : 'hover:bg-[#FFFFF0]/80'
                }`}
              >
                <span className="text-xl">{getEventIcon(notif.event_type)}</span>
                <div className="flex-1">
                  <p className={`text-sm ${!notif.read_at ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!notif.read_at && <div className="w-2 h-2 rounded-full bg-[#33A1C9] mt-1.5 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export const SettingsPage: React.FC = () => {
  const { profile, user, logout } = useAuth()
  const seniorRequests = mockStore.getSeniorRequests()
  const hasPendingRequest = seniorRequests.some(r => r.user_id === profile?.id && r.status === 'pending')
  const [showVerifyForm, setShowVerifyForm] = useState(false)
  const [verifyForm, setVerifyForm] = useState({ companyName: '', jobRole: '', proofType: 'offer_letter', notes: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const requests = mockStore.getSeniorRequests()
    requests.push({
      id: crypto.randomUUID(),
      user_id: profile!.id,
      company_name: verifyForm.companyName,
      job_role: verifyForm.jobRole,
      proof_type: verifyForm.proofType as any,
      proof_url: null,
      notes: verifyForm.notes,
      status: 'pending',
      reviewed_by: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    mockStore.setSeniorRequests(requests)
    setSubmitted(true)
    setShowVerifyForm(false)
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#33A1C9]" />
            Settings
          </h1>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Account Information</h2>
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
            <div><p className="font-semibold text-slate-500 mb-1">Full Name</p><p className="font-medium text-slate-900">{profile?.full_name}</p></div>
            <div><p className="font-semibold text-slate-500 mb-1">Email</p><p className="font-medium text-slate-900">{user?.email}</p></div>
            <div><p className="font-semibold text-slate-500 mb-1">Department</p><p className="font-medium text-slate-900">{profile?.department}</p></div>
            <div><p className="font-semibold text-slate-500 mb-1">Graduation Year</p><p className="font-medium text-slate-900">{profile?.graduation_year}</p></div>
            <div><p className="font-semibold text-slate-500 mb-1">Account Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${
                profile?.account_status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                profile?.account_status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
              }`}>{profile?.account_status}</span>
            </div>
            <div><p className="font-semibold text-slate-500 mb-1">Senior Verified</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-xs ${
                profile?.senior_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {profile?.senior_verified ? <><ShieldCheck className="w-3 h-3" /> Verified</> : 'Not verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Senior Verification Request */}
        {profile?.account_status === 'approved' && !profile?.senior_verified && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#33A1C9]" />
              Request Senior Verification
            </h2>
            <p className="text-xs text-slate-600">
              If you have received a job offer or internship from campus recruitment, request verification to unlock senior posting privileges.
            </p>

            {submitted || hasPendingRequest ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Verification request submitted. Administrator will review within 2–3 business days.
              </div>
            ) : showVerifyForm ? (
              <form onSubmit={handleVerifySubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company *</label>
                    <input type="text" value={verifyForm.companyName} onChange={e => setVerifyForm(f => ({...f, companyName: e.target.value}))}
                      placeholder="Google, Amazon, etc." required
                      className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                    <input type="text" value={verifyForm.jobRole} onChange={e => setVerifyForm(f => ({...f, jobRole: e.target.value}))}
                      placeholder="Software Engineer Intern" required
                      className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proof Type</label>
                  <select value={verifyForm.proofType} onChange={e => setVerifyForm(f => ({...f, proofType: e.target.value}))}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none">
                    <option value="offer_letter">Offer Letter</option>
                    <option value="work_email">Work Email</option>
                    <option value="linkedin">LinkedIn Profile</option>
                    <option value="id_card">Company ID Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
                  <textarea rows={2} value={verifyForm.notes} onChange={e => setVerifyForm(f => ({...f, notes: e.target.value}))}
                    placeholder="Any context for the administrator..." className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowVerifyForm(false)} className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" className="text-xs px-3 py-1.5 bg-[#33A1C9] text-white font-semibold rounded-lg">Submit Request</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowVerifyForm(true)}
                className="px-4 py-2 bg-[#33A1C9] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#2681a3]">
                Request Senior Verification
              </button>
            )}
          </div>
        )}

        {/* Sign Out */}
        <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Account Actions</h2>
          <button onClick={logout}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors">
            Sign Out of AlumniLoop
          </button>
        </div>
      </div>
    </AppShell>
  )
}
