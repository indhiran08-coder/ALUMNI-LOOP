// ====================================================================
// AlumniLoop — Right Sidebar (Spotlight & Campus Guidelines)
// File: src/components/layout/RightSidebar.tsx
// ====================================================================

import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ExternalLink, Sparkles, Building2 } from 'lucide-react'
import { mockStore } from '@/lib/mockStore'

export const RightSidebar: React.FC = () => {
  const profiles = mockStore.getProfiles().filter((p) => p.senior_verified).slice(0, 3)

  return (
    <aside className="w-80 shrink-0 hidden lg:block py-6 pl-4 space-y-6">
      {/* Verified Seniors Spotlight */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Placed Seniors
          </h3>
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          AI &amp; DS alumni who completed placement and are helping juniors with ML, data science, and tech careers:
        </p>
        <div className="space-y-3">
          {profiles.map((senior) => (
            <Link
              key={senior.id}
              to={`/profile/${senior.id}`}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-[#2957A4] flex items-center justify-center font-bold text-xs shrink-0">
                {senior.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-[#2957A4] truncate">
                    {senior.full_name}
                  </p>
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-600 flex items-center gap-1 font-medium truncate">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {senior.company_name} • {senior.job_role}
                </p>
                <p className="text-[10px] text-slate-400">
                  {senior.department} ('{senior.graduation_year % 100})
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Department Guidelines */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
        <h4 className="text-xs font-bold text-[#2957A4] uppercase tracking-wider mb-2">
          Community Guidelines
        </h4>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
          <li>Share ML, AI, and data science interview breakdowns with concepts and trade-offs.</li>
          <li>Help juniors with Python, ML pipelines, deep learning, and data roles.</li>
          <li>Never share confidential NDA assessment questions or company test papers.</li>
          <li>All registrations are reviewed by the AI&DS department coordinator.</li>
        </ul>
      </div>

      {/* Footer Info */}
      <div className="px-2 text-[11px] text-slate-400 space-y-1">
        <p>© 2026 AlumniLoop — AI &amp; DS Dept.</p>
        <p className="flex items-center gap-2">
          <span>Dept. of AI &amp; Data Science</span>
          <span>•</span>
          <Link to="/feed" className="hover:underline">Feed</Link>
          <span>•</span>
          <Link to="/opportunities" className="hover:underline">Board</Link>
        </p>
      </div>
    </aside>
  )
}
