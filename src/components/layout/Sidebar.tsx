// ====================================================================
// AlumniLoop — Left Sidebar Navigation
// File: src/components/layout/Sidebar.tsx
// ====================================================================

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Compass,
  MessageSquare,
  Briefcase,
  Bookmark,
  Shield,
  FileCheck,
  Flag,
  History,
  TrendingUp,
  Award,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { POST_CATEGORIES } from '@/types/database.types'

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { profile, isAdmin } = useAuth()

  const currentPath = location.pathname
  const searchParams = new URLSearchParams(location.search)
  const currentCategory = searchParams.get('category')

  const navItems = [
    { label: 'Community Feed', icon: Compass, to: '/feed', active: currentPath === '/feed' && !currentCategory },
    { label: 'Interview Experiences', icon: Award, to: '/feed?category=Interview%20Experiences', active: currentCategory === 'Interview Experiences' },
    { label: 'AI & ML Prep', icon: TrendingUp, to: '/feed?category=Placement%20Preparation', active: currentCategory === 'Placement Preparation' },
    { label: 'Python & DSA', icon: MessageSquare, to: '/feed?category=Data%20Structures%20and%20Algorithms', active: currentCategory === 'Data Structures and Algorithms' },
    { label: 'Opportunities Board', icon: Briefcase, to: '/opportunities', active: currentPath.startsWith('/opportunities') },
    { label: 'Saved Bookmarks', icon: Bookmark, to: '/bookmarks', active: currentPath === '/bookmarks' },
  ]

  const adminItems = [
    { label: 'Overview', icon: Shield, to: '/admin', active: currentPath === '/admin' },
    { label: 'Review Registrations', icon: FileCheck, to: '/admin/registrations', active: currentPath === '/admin/registrations' },
    { label: 'Senior Verification', icon: Award, to: '/admin/senior-verification', active: currentPath === '/admin/senior-verification' },
    { label: 'Content Reports', icon: Flag, to: '/admin/reports', active: currentPath === '/admin/reports' },
    { label: 'Audit Log', icon: History, to: '/admin/audit-log', active: currentPath === '/admin/audit-log' },
  ]

  return (
    <aside className="w-64 shrink-0 hidden md:block py-6 pr-4">
      <div className="sticky top-22 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Explore
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.active
                    ? 'bg-[#33A1C9] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.active ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Categories Quick Links */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Topics</span>
            <Sparkles className="w-3 h-3 text-slate-400" />
          </p>
          <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
            {POST_CATEGORIES.slice(0, 7).map((cat) => (
              <Link
                key={cat}
                to={`/feed?category=${encodeURIComponent(cat)}`}
                className={`block px-3 py-1.5 text-xs rounded-md truncate transition-colors ${
                  currentCategory === cat
                    ? 'text-[#2681a3] font-semibold bg-[#eaf6fa]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-[#faf9f0]'
                }`}
              >
                # {cat}
              </Link>
            ))}
          </div>
        </div>

        {/* Admin Navigation (When Admin) */}
        {isAdmin && (
          <div className="space-y-1 pt-4 border-t border-slate-200">
            <p className="px-3 text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Admin Controls
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    item.active
                      ? 'bg-purple-100 text-purple-900 font-semibold'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Status card when pending */}
        {profile?.account_status === 'pending' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-bold text-amber-900">Application Pending</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Your registration is under administrator review. Community participation will unlock upon approval.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
