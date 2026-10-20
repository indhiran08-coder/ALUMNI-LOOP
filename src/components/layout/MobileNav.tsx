// ====================================================================
// AlumniLoop — Mobile Bottom Navigation (Safe Area & Touch Optimized)
// File: src/components/layout/MobileNav.tsx
// ====================================================================

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Compass, Plus, Briefcase, Bookmark, User, Shield } from 'lucide-react'
import { useAuth } from '@/app/providers'

export const MobileNav: React.FC = () => {
  const location = useLocation()
  const { profile, isAdmin } = useAuth()
  const path = location.pathname

  const canPost = profile?.account_status === 'approved' || isAdmin

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
      {/* Feed */}
      <Link
        to="/feed"
        className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[44px] text-[10px] transition-colors rounded-lg ${
          path === '/feed' ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
        }`}
      >
        <Compass className={`w-5 h-5 mb-0.5 ${path === '/feed' ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span>Feed</span>
      </Link>

      {/* Opportunities Board */}
      <Link
        to="/opportunities"
        className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[44px] text-[10px] transition-colors rounded-lg ${
          path.startsWith('/opportunities') ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
        }`}
      >
        <Briefcase className={`w-5 h-5 mb-0.5 ${path.startsWith('/opportunities') ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span>Jobs</span>
      </Link>

      {/* Floating Center Post Button */}
      {canPost && (
        <Link
          to="/ask"
          aria-label="Create Post"
          className="flex flex-col items-center justify-center -mt-4 group shrink-0"
        >
          <div className="w-11 h-11 rounded-full bg-[#2957A4] text-white flex items-center justify-center shadow-md shadow-[#2957A4]/30 active:scale-95 transition-transform group-hover:bg-[#1f4482]">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-semibold text-[#2957A4] mt-0.5">Post</span>
        </Link>
      )}

      {/* Admin Panel (if admin) or Bookmarks */}
      {isAdmin ? (
        <Link
          to="/admin"
          className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[44px] text-[10px] transition-colors rounded-lg ${
            path.startsWith('/admin') ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Shield className={`w-5 h-5 mb-0.5 ${path.startsWith('/admin') ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Admin</span>
        </Link>
      ) : (
        <Link
          to="/bookmarks"
          className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[44px] text-[10px] transition-colors rounded-lg ${
            path === '/bookmarks' ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Bookmark className={`w-5 h-5 mb-0.5 ${path === '/bookmarks' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Saved</span>
        </Link>
      )}

      {/* Profile */}
      <Link
        to={profile ? `/profile/${profile.id}` : '/login'}
        className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[44px] text-[10px] transition-colors rounded-lg ${
          path.startsWith('/profile') ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
        }`}
      >
        <User className={`w-5 h-5 mb-0.5 ${path.startsWith('/profile') ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span>Profile</span>
      </Link>
    </nav>
  )
}
