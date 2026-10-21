// ====================================================================
// AlumniLoop — Admin Management Dashboard
// File: src/features/admin/pages/AdminPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Shield, Users, CheckCircle, XCircle, Clock, AlertTriangle,
  ClipboardList, Ban, ShieldCheck, Search, Eye,
  TrendingUp, MessageSquare, Briefcase, Flag,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { adminService } from '../admin.service'
import { useAuth } from '@/app/providers'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { mockStore } from '@/lib/mockStore'

type AdminTab = 'overview' | 'members' | 'seniors' | 'reports' | 'auditLog'

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  </div>
)

export const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const getTabFromPath = (path: string): AdminTab => {
    if (path.includes('/registrations')) return 'members'
    if (path.includes('/senior-verification')) return 'seniors'
    if (path.includes('/reports')) return 'reports'
    if (path.includes('/audit-log')) return 'auditLog'
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState<AdminTab>(() => getTabFromPath(location.pathname))

  React.useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname))
  }, [location.pathname])

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab)
    if (tab === 'overview') navigate('/admin')
    else if (tab === 'members') navigate('/admin/registrations')
    else if (tab === 'seniors') navigate('/admin/senior-verification')
    else if (tab === 'reports') navigate('/admin/reports')
    else if (tab === 'auditLog') navigate('/admin/audit-log')
  }

  const [memberSearch, setMemberSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { data: pendingMembers = [] } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () => adminService.getPendingMembers(),
    enabled: isAdmin,
  })

  const { data: allMembers = [] } = useQuery({
    queryKey: ['admin-all-members'],
    queryFn: () => adminService.getAllMembers(),
    enabled: isAdmin,
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminService.getAuditLogs(),
    enabled: isAdmin,
  })

  const { data: seniorRequests = [] } = useQuery({
    queryKey: ['admin-senior-requests'],
    queryFn: () => adminService.getPendingSeniorRequests(),
    enabled: isAdmin,
  })

  const { data: reports = [] } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminService.getPendingReports(),
    enabled: isAdmin,
  })

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="bg-white rounded-xl border border-rose-200 p-12 text-center space-y-3">
          <Shield className="w-12 h-12 text-rose-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Admin Access Only</h2>
          <p className="text-xs text-slate-500">You do not have administrator privileges.</p>
          <button onClick={() => navigate('/feed')} className="px-4 py-2 bg-[#33A1C9] text-white text-xs font-semibold rounded-lg">
            Back to Feed
          </button>
        </div>
      </AppShell>
    )
  }

  const performAction = async (action: () => Promise<void>, invalidates: string[]) => {
    await action()
    invalidates.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }))
    queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
  }

  const handleApprove = async (userId: string) => {
    setActionLoading(userId + '-approve')
    await performAction(() => adminService.approveUser(userId), ['admin-pending', 'admin-all-members'])
    setActionLoading(null)
  }

  const handleReject = async (userId: string) => {
    setActionLoading(userId + '-reject')
    await performAction(() => adminService.rejectUser(userId, 'Application did not meet criteria.'), ['admin-pending', 'admin-all-members'])
    setActionLoading(null)
  }

  const handleSuspend = async (userId: string) => {
    setActionLoading(userId + '-suspend')
    await performAction(() => adminService.suspendUser(userId, 'Violation of community guidelines.'), ['admin-all-members'])
    setActionLoading(null)
  }

  const handleVerifySenior = async (requestId: string) => {
    setActionLoading(requestId + '-verify')
    await performAction(() => adminService.approveSeniorVerification(requestId), ['admin-senior-requests'])
    setActionLoading(null)
  }

  const handleRejectSenior = async (requestId: string) => {
    setActionLoading(requestId + '-reject-senior')
    await performAction(() => adminService.rejectSeniorVerification(requestId, 'Unable to verify placement details.'), ['admin-senior-requests'])
    setActionLoading(null)
  }

  const handleResolveReport = async (reportId: string) => {
    setActionLoading(reportId + '-resolve')
    await performAction(() => adminService.resolveReport(reportId, 'actioned', 'Reviewed and resolved.'), ['admin-reports'])
    setActionLoading(null)
  }

  const filteredMembers = allMembers.filter(m =>
    m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.department?.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'members', label: 'Members', icon: <Users className="w-3.5 h-3.5" />, badge: pendingMembers.length || undefined },
    { key: 'seniors', label: 'Senior Requests', icon: <ShieldCheck className="w-3.5 h-3.5" />, badge: seniorRequests.length || undefined },
    { key: 'reports', label: 'Reports', icon: <Flag className="w-3.5 h-3.5" />, badge: reports.length || undefined },
    { key: 'auditLog', label: 'Audit Log', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  ]

  return (
    <AppShell showRightSidebar={false}>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#33A1C9] to-[#206882] rounded-xl p-5 text-white shadow-sm">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Administration Dashboard
          </h1>
          <p className="text-xs text-[#d6f0f8] mt-1">Manage community members, verifications, reports, and audit trails</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#33A1C9] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-600'}`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* TAB: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Members" value={allMembers.length} icon={<Users className="w-5 h-5 text-[#2681a3]" />} color="bg-[#eaf6fa]" />
              <StatCard label="Pending Approval" value={pendingMembers.length} icon={<Clock className="w-5 h-5 text-amber-600" />} color="bg-amber-50" />
              <StatCard label="Senior Requests" value={seniorRequests.length} icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" />
              <StatCard label="Pending Reports" value={reports.length} icon={<Flag className="w-5 h-5 text-rose-600" />} color="bg-rose-50" />
            </div>

            {pendingMembers.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {pendingMembers.length} member{pendingMembers.length > 1 ? 's' : ''} awaiting approval
                </p>
                <button onClick={() => setActiveTab('members')}
                  className="text-xs font-semibold text-[#33A1C9] hover:underline">
                  Review Pending Members →
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-400" />
                Recent Admin Actions
              </h2>
              {auditLogs.slice(0, 5).length === 0 ? (
                <p className="text-xs text-slate-400">No admin actions recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 capitalize">
                          {((log as any).action_type || (log as any).action || 'Action').replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] text-slate-500">{log.reason || (log as any).notes || 'Action recorded'}</p>
                      </div>
                      <p className="text-[11px] text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Members */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {pendingMembers.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-300 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
                  <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Pending Approval ({pendingMembers.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingMembers.map(member => (
                    <div key={member.id} className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <Link to={`/profile/${member.id}`} className="text-sm font-bold text-slate-900 hover:text-[#33A1C9]">
                          {member.full_name}
                        </Link>
                        <p className="text-xs text-slate-500">{member.department} · Class of {member.graduation_year}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{member.member_type}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(member.id)}
                          disabled={actionLoading === member.id + '-approve'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                        >
                          {actionLoading === member.id + '-approve'
                            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(member.id)}
                          disabled={actionLoading === member.id + '-reject'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                        >
                          {actionLoading === member.id + '-reject'
                            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />}
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Members Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 shrink-0">
                  <Users className="w-4 h-4 text-slate-400" /> All Members
                </h2>
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search by name or department..."
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#33A1C9]/20" />
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {filteredMembers.map(member => (
                  <div key={member.id} className="px-4 sm:px-5 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#eaf6fa] border border-[#bfe4f1] flex items-center justify-center text-xs font-bold text-[#2681a3]">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <Link to={`/profile/${member.id}`} className="text-xs font-bold text-slate-900 hover:text-[#33A1C9]">
                          {member.full_name}
                        </Link>
                        <p className="text-[11px] text-slate-500">{member.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.senior_verified && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                        member.account_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        member.account_status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        member.account_status === 'suspended' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>{member.account_status}</span>
                      {member.account_status === 'approved' && (
                        <button onClick={() => handleSuspend(member.id)}
                          disabled={actionLoading === member.id + '-suspend'}
                          title="Suspend User"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Senior Verification Requests */}
        {activeTab === 'seniors' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Senior Verification Requests
              </h2>
            </div>
            {seniorRequests.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No pending senior verification requests.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {seniorRequests.map(req => (
                  <div key={req.id} className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{req.user_id}</p>
                        <p className="text-xs text-slate-600">{req.job_role} @ <strong>{req.company_name}</strong></p>
                        <p className="text-[11px] text-slate-500">
                          Proof: {req.proof_type?.replace('_', ' ')} · {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleVerifySenior(req.id)}
                          disabled={actionLoading === req.id + '-verify'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60">
                          {actionLoading === req.id + '-verify'
                            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />}
                          Verify
                        </button>
                        <button onClick={() => handleRejectSenior(req.id)}
                          disabled={actionLoading === req.id + '-reject-senior'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                    {req.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">{req.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Reports */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-500" /> Community Reports
              </h2>
            </div>
            {reports.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No pending reports.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reports.map(report => (
                  <div key={report.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-900 capitalize">{(report.reason || 'Report').replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-slate-500">
                        Content: {report.target_type} · {new Date(report.created_at).toLocaleDateString()}
                      </p>
                      {report.details && (
                        <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded px-2 py-1">{report.details}</p>
                      )}
                    </div>
                    <button onClick={() => handleResolveReport(report.id)}
                      disabled={actionLoading === report.id + '-resolve'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white text-xs font-semibold rounded-lg shrink-0 disabled:opacity-60">
                      <Eye className="w-3.5 h-3.5" /> Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Audit Log */}
        {activeTab === 'auditLog' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-400" /> Audit Log
              </h2>
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No admin actions logged yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {auditLogs.map(log => (
                  <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-900 capitalize">{((log as any).action_type || (log as any).action || 'Action').replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-slate-500">{log.reason || (log as any).notes || 'Action recorded'}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 shrink-0">
                      {new Date(log.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
