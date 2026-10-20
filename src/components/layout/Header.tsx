// ====================================================================
// AlumniLoop — Top Header Component
// File: src/components/layout/Header.tsx
// ====================================================================

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  Search,
  PlusCircle,
  Bell,
  ShieldCheck,
  User,
  LogOut,
  ChevronDown,
  Briefcase,
  Users,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { DEMO_USERS } from '@/lib/mockStore'
import { useQuery } from '@tanstack/react-query'
import { notificationsService } from '@/features/notifications/notifications.service'

interface HeaderProps {
  onSearch?: (query: string) => void
  currentSearch?: string
}

export const Header: React.FC<HeaderProps> = ({ onSearch, currentSearch = '' }) => {
  const { user, profile, isAdmin, logout, switchUser } = useAuth()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationsService.getNotifications(),
    enabled: Boolean(user),
    refetchInterval: 15000,
  })

  const unreadCount = notifications.filter((n) => !n.read_at).length

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchInput)
    } else {
      navigate(`/feed?q=${encodeURIComponent(searchInput)}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link to="/feed" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-[#2957A4] flex items-center justify-center text-white shadow-xs group-hover:bg-[#1f4482] transition-colors">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              AlumniLoop
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-sm bg-blue-50 text-[#2957A4] border border-blue-200">
                AI &amp; DS
              </span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium -mt-1 hidden sm:inline">
              Artificial Intelligence &amp; Data Science
            </span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search AI, ML, data science topics, interview experiences..."
              value={searchInput}

              onChange={(e) => {
                setSearchInput(e.target.value)
                if (onSearch) onSearch(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4] transition-all"
            />
          </div>
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Create Post Button */}
          {profile?.account_status === 'approved' && (
            <Link
              to="/ask"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2957A4] hover:bg-[#1f4482] text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Ask / Share</span>
            </Link>
          )}

          {/* Notifications Bell */}
          <Link
            to="/notifications"
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Quick Demo Role Switcher (For Pair-Programming & Testing All Roles) */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 border border-slate-300 transition-colors"
              title="Test application as different roles"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline">Role:</span>
              <span className="text-[#2957A4]">
                {isAdmin ? 'Admin' : profile?.senior_verified ? 'Senior' : profile?.account_status === 'pending' ? 'Pending' : 'Student'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {roleSwitcherOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setRoleSwitcherOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">Switch Persona for Testing</p>
                  <p className="text-[11px] text-slate-500">Instantly experience different permissions</p>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {DEMO_USERS.map((demo) => (
                    <button
                      key={demo.id}
                      onClick={() => switchUser(demo.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                        user?.id === demo.id ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{demo.profile.full_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {demo.role === 'admin'
                            ? 'Admin / Faculty'
                            : demo.profile.senior_verified
                            ? `Verified Senior (${demo.profile.company_name || 'Alumni'})`
                            : demo.profile.account_status === 'pending'
                            ? 'Pending Applicant'
                            : 'Approved Student'}
                        </p>
                      </div>
                      {user?.id === demo.id && (
                        <span className="text-[10px] font-bold text-[#2957A4] bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name || 'Guest'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  {profile?.senior_verified && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Senior
                    </span>
                  )}
                  {isAdmin && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3 text-purple-600" />
                      Administrator
                    </span>
                  )}
                </div>

                <div className="py-1">
                  {profile && (
                    <Link
                      to={`/profile/${profile.id}`}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      My Profile
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2957A4] hover:bg-blue-50"
                    >
                      <Briefcase className="w-4 h-4 text-[#2957A4]" />
                      Admin Dashboard
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
