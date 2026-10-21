// ====================================================================
// AlumniLoop — Registration Page
// File: src/features/auth/pages/RegisterPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, AlertCircle, CheckCircle, User, Mail, Lock, BookOpen, Calendar, Building2, Briefcase } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { MemberType } from '@/types/database.types'
import { COLLEGE_EMAIL_DOMAIN } from '@/lib/supabase'

// This platform is exclusively for the AI & Data Science department
const DEPARTMENT = 'Artificial Intelligence and Data Science'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 2)
  const [memberType, setMemberType] = useState<MemberType>('student')
  const [companyName, setCompanyName] = useState('')
  const [jobRole, setJobRole] = useState('')
  const [bio, setBio] = useState('')

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i)

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address (e.g. Gmail).')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    // Auto-set the department to AI&DS
    setDepartment(DEPARTMENT)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const requiresApproval = await register({
        fullName,
        email,
        password,
        department,
        graduationYear,
        memberType,
        companyName: memberType === 'alumni' ? companyName : undefined,
        jobRole: memberType === 'alumni' ? jobRole : undefined,
        bio,
      })
      // Non-admin users are set to pending — redirect to waiting page
      if (requiresApproval) {
        navigate('/pending-approval')
      } else {
        navigate('/feed')
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFFF0] via-[#eaf6fa]/30 to-[#FFFFF0] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#33A1C9] flex items-center justify-center shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Join AlumniLoop — AI&DS</h1>
          <p className="text-sm text-slate-500 mt-1">Exclusive community for Artificial Intelligence & Data Science students and alumni</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 justify-center">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? 'bg-[#33A1C9] text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-medium ${step === s ? 'text-[#33A1C9]' : 'text-slate-400'}`}>
                {s === 1 ? 'Account' : 'Academic Info'}
              </span>
              {s < 2 && <div className="w-12 h-px bg-slate-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Account Credentials</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="As per college records" value={fullName}
                    onChange={e => setFullName(e.target.value)} required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-slate-400 font-normal">(Gmail or College Email)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" placeholder="yourname@gmail.com" value={email}
                    onChange={e => setEmail(e.target.value)} required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="password" placeholder="Min. 6 characters" value={password}
                      onChange={e => setPassword(e.target.value)} required minLength={6}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="password" placeholder="Repeat password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} required
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
                  </div>
                </div>
              </div>

              <button type="submit"
                className="w-full py-2.5 bg-[#33A1C9] hover:bg-[#2681a3] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors">
                Continue →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Academic Information</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['student', 'alumni'] as MemberType[]).map(type => (
                    <button key={type} type="button" onClick={() => setMemberType(type)}
                      className={`py-2.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                        memberType === type
                          ? 'border-[#33A1C9] bg-[#eaf6fa] text-[#2681a3] ring-2 ring-[#33A1C9]/25'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      {type === 'student' ? '📚 Current Student' : '🎓 Alumni'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
                <div className="flex items-center gap-2.5 px-3 py-2.5 border border-[#33A1C9]/40 bg-[#eaf6fa] rounded-lg">
                  <BookOpen className="w-4 h-4 text-[#2681a3] shrink-0" />
                  <span className="text-sm font-semibold text-[#2681a3]">{DEPARTMENT}</span>
                </div>
                {/* Hidden input so form validation passes */}
                <input type="hidden" value={department || DEPARTMENT} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {memberType === 'student' ? 'Expected Graduation Year' : 'Graduation Year'}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select value={graduationYear} onChange={e => setGraduationYear(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9] appearance-none bg-white">
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {memberType === 'alumni' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Company (Optional)</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="text" placeholder="e.g. Google, Microsoft, Amazon" value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Job Role (Optional)</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="text" placeholder="e.g. Software Engineer (L4)" value={jobRole}
                        onChange={e => setJobRole(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Brief Bio (Optional)</label>
                <textarea rows={2} placeholder="Tell the community about yourself, your interests, and career goals..."
                  value={bio} onChange={e => setBio(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <strong>Note:</strong> Your application will be reviewed by the college placement coordinator. Access is granted only after administrator approval.
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  ← Back
                </button>
                <button type="submit" disabled={isLoading}
                  className="flex-1 py-2.5 bg-[#33A1C9] hover:bg-[#2681a3] text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                  {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  <span>{isLoading ? 'Submitting...' : 'Submit Application'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#33A1C9] font-semibold hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
