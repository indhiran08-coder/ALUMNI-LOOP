// ====================================================================
// AlumniLoop — Mobile Bottom Navigation
// File: src/components/layout/MobileNav.tsx
// ====================================================================

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Compass, PlusCircle, Briefcase, Bookmark, User } from 'lucide-react'
import { useAuth } from '@/app/providers'

export const MobileNav: React.FC = () => {
  const location = useLocation()
  const { profile } = useAuth()
  const path = location.pathname

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      <Link
        to="/feed"
        className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition-colors ${
          path === '/feed' ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Compass className="w-5 h-5 mb-0.5" />
        Feed
      </Link>

      <Link
        to="/opportunities"
        className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition-colors ${
          path.startsWith('/opportunities') ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Briefcase className="w-5 h-5 mb-0.5" />
        Board
      </Link>

      {profile?.account_status === 'approved' && (
        <Link
          to="/ask"
          className="flex flex-col items-center py-1 px-3 text-[10px] font-medium text-[#2957A4]"
        >
          <div className="w-8 h-8 rounded-full bg-[#2957A4] text-white flex items-center justify-center -mt-3 shadow-md">
            <PlusCircle className="w-5 h-5" />
          </div>
          Post
        </Link>
      )}

      <Link
        to="/bookmarks"
        className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition-colors ${
          path === '/bookmarks' ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Bookmark className="w-5 h-5 mb-0.5" />
        Saved
      </Link>

      <Link
        to={profile ? `/profile/${profile.id}` : '/login'}
        className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition-colors ${
          path.startsWith('/profile') ? 'text-[#2957A4] font-bold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <User className="w-5 h-5 mb-0.5" />
        Profile
      </Link>
    </nav>
  )
}
