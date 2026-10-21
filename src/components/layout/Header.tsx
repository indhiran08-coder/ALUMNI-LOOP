// ====================================================================
// AlumniLoop — Top Header Component (Production & Mobile Optimized)
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
  X,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { useQuery } from '@tanstack/react-query'
import { notificationsService } from '@/features/notifications/notifications.service'

interface HeaderProps {
  onSearch?: (query: string) => void
  currentSearch?: string
}

export const Header: React.FC<HeaderProps> = ({ onSearch, currentSearch = '' }) => {
  const { user, profile, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

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

  const canPost = profile?.account_status === 'approved' || isAdmin

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <Link to="/feed" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#33A1C9] flex items-center justify-center text-white shadow-xs group-hover:bg-[#2681a3] transition-colors shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1 sm:gap-1.5 leading-tight">
              AlumniLoop
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold px-1 sm:px-1.5 py-0.5 rounded-sm bg-[#eaf6fa] text-[#2681a3] border border-[#bfe4f1]">
                AI &amp; DS
              </span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:inline">
              Artificial Intelligence &amp; Data Science
            </span>
          </div>
        </Link>

        {/* Global Search Bar (Desktop) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search AI &amp; DS discussions, questions, roadmaps..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                if (onSearch) onSearch(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9] transition-all"
            />
          </div>
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Mobile Search Toggle Icon */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Search discussions"
            aria-label="Search"
          >
            {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          {/* Create Post Button (Desktop & Tablet) */}
          {canPost && (
            <Link
              to="/ask"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#33A1C9] hover:bg-[#2681a3] text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Start Discussion</span>
            </Link>
          )}

          {/* Notifications Bell */}
          <Link
            to="/notifications"
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User Profile Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#eaf6fa] border border-[#bfe4f1] flex items-center justify-center font-bold text-xs text-[#2681a3]">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name || 'Member'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  {profile?.senior_verified && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Senior
                    </span>
                  )}
                  {isAdmin && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
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
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2681a3] hover:bg-[#eaf6fa]"
                    >
                      <Briefcase className="w-4 h-4 text-[#33A1C9]" />
                      Admin Dashboard
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Mobile Search Expandable Bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 py-2 bg-slate-50 border-t border-slate-200 animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics, questions, interview prep..."
                value={searchInput}
                autoFocus
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  if (onSearch) onSearch(e.target.value)
                }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#33A1C9]/20 focus:border-[#33A1C9]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    if (onSearch) onSearch('')
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </header>
  )
}
