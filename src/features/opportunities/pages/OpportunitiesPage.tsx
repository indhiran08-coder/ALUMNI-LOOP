// ====================================================================
// AlumniLoop — Opportunities Board Page
// File: src/features/opportunities/pages/OpportunitiesPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase, Building2, MapPin, Calendar, ExternalLink,
  Search, Plus, Clock, AlertTriangle, ShieldCheck, Filter, Users,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { opportunitiesService } from '../opportunities.service'
import { useAuth } from '@/app/providers'
import { Opportunity, OpportunityType } from '@/types/database.types'
import { socket } from '@/lib/socket'

const OPPORTUNITY_LABELS: Record<OpportunityType, { label: string; color: string }> = {
  job: { label: 'Full-Time Job', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  internship: { label: 'Internship', color: 'bg-blue-50 text-[#2957A4] border-blue-200' },
  referral: { label: 'Referral', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const OpportunityCard: React.FC<{ opp: Opportunity; onClose: () => void }> = ({ opp, onClose }) => {
  const { user, isAdmin } = useAuth()
  const isExpired = opp.deadline ? new Date(opp.deadline) < new Date() : false
  const daysLeft = opp.deadline
    ? Math.max(0, Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000))
    : null

  const isAuthor = user?.id === opp.author_id
  const badge = OPPORTUNITY_LABELS[opp.opportunity_type]

  return (
    <article className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 hover:shadow-md transition-all ${
      isExpired || opp.status !== 'open' ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-snug">{opp.title}</h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">{opp.company_name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
            {badge.label}
          </span>
          {(isExpired || opp.status !== 'open') && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
              Closed
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{opp.description}</p>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          {opp.location}
        </span>
        {daysLeft !== null && !isExpired && (
          <span className={`flex items-center gap-1 font-medium ${daysLeft <= 3 ? 'text-rose-600' : 'text-slate-500'}`}>
            <Clock className="w-3.5 h-3.5" />
            {daysLeft === 0 ? 'Deadline Today!' : `${daysLeft}d left`}
          </span>
        )}
        {opp.author && (
          <span className="flex items-center gap-1">
            <ShieldCheck className={`w-3.5 h-3.5 ${opp.author.senior_verified ? 'text-emerald-500' : 'text-slate-400'}`} />
            Posted by {opp.author.full_name}
          </span>
        )}
      </div>

      {opp.eligibility && (
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-[11px] text-slate-600">
            <strong className="text-slate-700">Eligibility: </strong>{opp.eligibility}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Verify details on official company website
        </p>

        {opp.status === 'open' && !isExpired ? (
          <a
            href={opp.application_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2957A4] hover:bg-[#1f4482] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Apply Now
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <span className="text-xs text-slate-400 font-medium">No longer accepting applications</span>
        )}
      </div>
    </article>
  )
}

export const OpportunitiesPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<OpportunityType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities', typeFilter, searchQuery],
    queryFn: () => opportunitiesService.getOpportunities({ type: typeFilter, search: searchQuery }),
  })

  // Realtime WebSocket Listener for Zero-Lag Opportunities Updates
  React.useEffect(() => {
    const handleLiveOpp = () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    }
    socket.on('opportunity:created', handleLiveOpp)
    return () => {
      socket.off('opportunity:created', handleLiveOpp)
    }
  }, [queryClient])

  return (
    <AppShell showRightSidebar={false}>
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#2957A4]" />
              Opportunities Board
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Jobs, internships, and alumni referrals — shared by verified campus seniors
            </p>
          </div>
          {(profile?.senior_verified || isAdmin || profile?.account_status === 'approved') && (
            <button
              onClick={() => navigate('/opportunities/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2957A4] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#1f4482] transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Post Opportunity
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong>Disclaimer:</strong> Opportunities shared here are posted by community members and have not been independently verified by the college. Always confirm details on the official employer website before applying.
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search companies, roles, locations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4]"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {(['all', 'internship', 'job', 'referral'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-full font-semibold border transition-colors capitalize ${
                  typeFilter === type
                    ? 'bg-[#2957A4] text-white border-[#2957A4]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {type === 'all' ? 'All Types' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-3">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="text-base font-bold text-slate-800">No opportunities match your filter</h3>
            <p className="text-xs text-slate-500">
              Verified seniors can post jobs, internships, and referrals directly from their profiles.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map(opp => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                onClose={() => queryClient.invalidateQueries({ queryKey: ['opportunities'] })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

