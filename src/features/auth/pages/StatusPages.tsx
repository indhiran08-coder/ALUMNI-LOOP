// ====================================================================
// AlumniLoop — Auth Status Pages
// File: src/features/auth/pages/StatusPages.tsx
// ====================================================================

import React from 'react'
import { Link } from 'react-router-dom'
import { Clock, XCircle, GraduationCap, LogOut } from 'lucide-react'
import { useAuth } from '@/app/providers'

export const PendingApprovalPage: React.FC = () => {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/20 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center border-4 border-amber-200">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Under Review</h1>
          <p className="text-sm text-slate-600 mt-2">
            Hi <strong>{profile?.full_name || 'there'}</strong> — your registration is in the administrator review queue.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 text-left space-y-4">
          <h2 className="text-sm font-bold text-slate-800">What happens next?</h2>
          <ol className="space-y-3 text-xs text-slate-600">
            {[
              'The AI\u0026DS department coordinator reviews your credentials.',
              'Your enrollment status in the AI\u0026DS department is verified.',
              'You receive an in-app notification once approved.',
              'Full community access is unlocked after approval.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4" />
            <strong>Review typically completes within 24–48 hours.</strong>
          </div>
          <p>Contact the AI&amp;DS department coordinator if your application is pending beyond 3 business days.</p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export const RejectedPage: React.FC = () => {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-rose-100 rounded-full flex items-center justify-center border-4 border-rose-200">
          <XCircle className="w-10 h-10 text-rose-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Not Approved</h1>
          <p className="text-sm text-slate-600 mt-2">
            Hi <strong>{profile?.full_name || 'there'}</strong> — we were unable to verify your registration at this time.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-6 text-left space-y-3">
          <p className="text-xs text-slate-600">Common reasons for rejection include:</p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>Unrecognized or non-institutional email address</li>
            <li>Enrollment status could not be confirmed</li>
            <li>Duplicate registration with existing account</li>
            <li>Incomplete or inconsistent application information</li>
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          Contact the AI&amp;DS department coordinator with your enrollment ID to appeal this decision.
        </p>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = React.useState(false)
  const [email, setEmail] = React.useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#2957A4] flex items-center justify-center shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Reset Your Password</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
          {!submitted ? (
            <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }} className="space-y-4">
              <p className="text-xs text-slate-600">
                Enter your college email address and we'll send password reset instructions.
              </p>
              <input type="email" placeholder="yourname@college.edu" value={email}
                onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4]" />
              <button type="submit"
                className="w-full py-2.5 bg-[#2957A4] hover:bg-[#1f4482] text-white font-semibold text-sm rounded-lg transition-colors">
                Send Reset Instructions
              </button>
            </form>
          ) : (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-slate-900">Check your email</p>
              <p className="text-xs text-slate-500">
                If <strong>{email}</strong> is registered, password reset instructions will be delivered shortly.
              </p>
              <p className="text-xs text-slate-400">
                For Supabase-powered instances, use the Supabase Auth reset email link. In local dev mode, use your original password.
              </p>
            </div>
          )}

          <div className="text-center">
            <Link to="/login" className="text-xs text-[#2957A4] font-semibold hover:underline">← Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
