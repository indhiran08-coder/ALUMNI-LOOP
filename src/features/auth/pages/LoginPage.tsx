// ====================================================================
// AlumniLoop — Login Page
// File: src/features/auth/pages/LoginPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { DEMO_USERS } from '@/lib/mockStore'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, switchUser } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const { profile } = await login(email, password) as any
      if (profile.account_status === 'pending') {
        navigate('/pending-approval')
      } else if (profile.account_status === 'rejected') {
        navigate('/registration-rejected')
      } else if (profile.account_status === 'suspended') {
        setError('Your account has been suspended. Contact the AI&DS department coordinator.')
      } else {
        navigate('/feed')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = async (userId: string) => {
    try {
      await switchUser(userId)
      const user = DEMO_USERS.find(u => u.id === userId)
      if (user?.profile.account_status === 'pending') {
        navigate('/pending-approval')
      } else {
        navigate('/feed')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#2957A4] flex items-center justify-center shadow-lg">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to AlumniLoop</h1>
          <p className="text-sm text-slate-500 mt-1">AI &amp; Data Science Department — Alumni Network</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-bold text-slate-800">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-slate-400 font-normal">(Gmail or College Email)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-[#2957A4] hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#2957A4] hover:bg-[#1f4482] text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#2957A4] font-semibold hover:underline">
              Create an account with Gmail
            </Link>
          </div>
        </div>

        {/* Quick Administrator Access */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-800 mb-2">⚡ Default Administrator Account</p>
          <div className="space-y-1.5">
            {DEMO_USERS.map(demo => (
              <button
                key={demo.id}
                onClick={() => handleQuickLogin(demo.id)}
                className="w-full text-left px-3 py-2 bg-white border border-slate-200 hover:border-[#2957A4] hover:bg-blue-50/50 rounded-lg transition-colors group shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{demo.profile.full_name}</p>
                    <p className="text-[11px] text-slate-500">{demo.email} · Password: {demo.passwordHash}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 group-hover:text-[#2957A4] font-semibold">Sign In →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
