// ====================================================================
// AlumniLoop — Post Opportunity Page
// File: src/features/opportunities/pages/NewOpportunityPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, AlertCircle, ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { opportunitiesService } from '../opportunities.service'
import { OpportunityType } from '@/types/database.types'
import { useAuth } from '@/app/providers'

export const NewOpportunityPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    companyName: '',
    title: '',
    description: '',
    location: '',
    opportunityType: 'internship' as OpportunityType,
    eligibility: '',
    applicationUrl: '',
    deadline: '',
  })

  if (!profile?.senior_verified) {
    return (
      <AppShell>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Senior Verification Required</h2>
          <p className="text-xs text-slate-500">
            Only verified placed seniors and alumni can post opportunities. Request verification from Settings.
          </p>
          <button onClick={() => navigate('/opportunities')}
            className="px-4 py-2 bg-[#33A1C9] text-white text-xs font-semibold rounded-lg">
            Back to Board
          </button>
        </div>
      </AppShell>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await opportunitiesService.createOpportunity({
        companyName: form.companyName,
        title: form.title,
        description: form.description,
        location: form.location,
        opportunityType: form.opportunityType,
        eligibility: form.eligibility,
        applicationUrl: form.applicationUrl,
        deadline: form.deadline || null,
      })
      navigate('/opportunities')
    } catch (err: any) {
      setError(err.message || 'Failed to post opportunity.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#33A1C9]">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#33A1C9]" />
            Post an Opportunity
          </h1>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                <select value={form.opportunityType} onChange={e => update('opportunityType', e.target.value)}
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]">
                  <option value="internship">Internship</option>
                  <option value="job">Full-Time Job</option>
                  <option value="referral">Alumni Referral</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name *</label>
                <input type="text" value={form.companyName} onChange={e => update('companyName', e.target.value)}
                  placeholder="Google, Infosys, Startup..." required
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role / Position Title *</label>
              <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
                placeholder="Software Engineer Intern — Summer 2027" required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description *</label>
              <textarea rows={4} value={form.description} onChange={e => update('description', e.target.value)}
                placeholder="Role overview, team, work mode, compensation, key responsibilities..." required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location *</label>
                <input type="text" value={form.location} onChange={e => update('location', e.target.value)}
                  placeholder="Bengaluru / Remote / Hybrid" required
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Application Deadline</label>
                <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Eligibility Criteria *</label>
              <input type="text" value={form.eligibility} onChange={e => update('eligibility', e.target.value)}
                placeholder="B.Tech 2027 batch, CGPA 7.0+, CSE/IT branches" required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Application URL * (https://)</label>
              <input type="url" value={form.applicationUrl} onChange={e => update('applicationUrl', e.target.value)}
                placeholder="https://careers.company.com/apply/role-id" required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]" />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              By posting this opportunity you confirm all details are accurate and the application URL is legitimate.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => navigate(-1)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                Discard
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#33A1C9] hover:bg-[#2681a3] text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                <span>{isSubmitting ? 'Publishing...' : 'Publish Opportunity'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
