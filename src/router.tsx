// ====================================================================
// AlumniLoop — Application Router
// File: src/router.tsx
// ====================================================================

import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers'

// Auth pages
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { PendingApprovalPage, RejectedPage, ForgotPasswordPage } from '@/features/auth/pages/StatusPages'

// Core feature pages
import { FeedPage } from '@/features/feed/pages/FeedPage'
import { PostDetailPage } from '@/features/discussions/pages/PostDetailPage'
import { AskPostPage } from '@/features/discussions/pages/AskPostPage'
import { OpportunitiesPage } from '@/features/opportunities/pages/OpportunitiesPage'
import { NewOpportunityPage } from '@/features/opportunities/pages/NewOpportunityPage'
import { ProfilePage } from '@/features/profiles/pages/ProfilePage'
import { BookmarksPage, NotificationsPage, SettingsPage } from '@/features/misc/pages/MiscPages'
import { AdminPage } from '@/features/admin/pages/AdminPage'

// ─── Guard Components ──────────────────────────────────────────────

const FullPageSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-[#33A1C9]/20 border-t-[#33A1C9] rounded-full animate-spin" />
      <p className="text-sm font-medium text-slate-500">Loading AlumniLoop…</p>
    </div>
  </div>
)

/** Route accessible only to unauthenticated or non-approved users */
const PublicOnlyRoute: React.FC = () => {
  const { user, profile, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner />
  if (user && profile?.account_status === 'approved') return <Navigate to="/feed" replace />
  return <Outlet />
}

/** Route that requires the user to be logged in (any status) */
const AuthenticatedRoute: React.FC = () => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Route that requires approved account status */
const ApprovedRoute: React.FC = () => {
  const { user, profile, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.account_status === 'pending') return <Navigate to="/pending-approval" replace />
  if (profile?.account_status === 'rejected') return <Navigate to="/registration-rejected" replace />
  if (profile?.account_status === 'suspended') return <Navigate to="/login" replace />
  return <Outlet />
}

/** Route that requires admin privileges */
const AdminRoute: React.FC = () => {
  const { isAdmin, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner />
  if (!isAdmin) return <Navigate to="/feed" replace />
  return <Outlet />
}

// ─── Not Found Page ────────────────────────────────────────────────

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="text-center space-y-4">
      <p className="text-8xl font-black text-slate-200">404</p>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="text-sm text-slate-500">The page you're looking for doesn't exist or has been moved.</p>
      <a href="/feed" className="inline-flex px-5 py-2.5 bg-[#33A1C9] text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-[#2681a3]">
        Back to Community Feed
      </a>
    </div>
  </div>
)

// ─── Router ───────────────────────────────────────────────────────

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/feed" replace />} />

        {/* Public-only routes (redirect approved users away) */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Status pages — publicly accessible (no session required) */}
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/registration-rejected" element={<RejectedPage />} />

        {/* Approved members only */}
        <Route element={<ApprovedRoute />}>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/ask" element={<AskPostPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/new" element={<NewOpportunityPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin-only nested routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/registrations" element={<AdminPage />} />
            <Route path="/admin/senior-verification" element={<AdminPage />} />
            <Route path="/admin/reports" element={<AdminPage />} />
            <Route path="/admin/audit-log" element={<AdminPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)
