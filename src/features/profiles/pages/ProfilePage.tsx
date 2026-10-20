// ====================================================================
// AlumniLoop — Member Profile Page
// File: src/features/profiles/pages/ProfilePage.tsx
// ====================================================================

import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Building2, GraduationCap, Calendar, BookOpen, Briefcase, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PostCard } from '@/components/posts/PostCard'
import { mockStore } from '@/lib/mockStore'
import { feedService } from '@/features/feed/feed.service'
import { useAuth } from '@/app/providers'

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { profile: myProfile } = useAuth()
  const queryClient = useQueryClient()

  const profileData = React.useMemo(() => {
    if (!id) return null
    return mockStore.getProfiles().find(p => p.id === id) || null
  }, [id])

  const { data: posts = [] } = useQuery({
    queryKey: ['profile-posts', id],
    queryFn: () => id ? feedService.getPosts({ authorId: id }) : Promise.resolve([]),
    enabled: Boolean(id),
  })

  const isOwnProfile = myProfile?.id === id

  if (!profileData) {
    return (
      <AppShell>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Profile Not Found</h2>
          <p className="text-xs text-slate-500">This member may not exist or their profile is not visible.</p>
          <Link to="/feed" className="inline-flex px-4 py-2 bg-[#2957A4] text-white text-xs font-semibold rounded-lg">Back to Feed</Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Cover Banner */}
          <div className="h-24 bg-gradient-to-r from-[#2957A4] to-blue-500" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-[#2957A4] bg-blue-50">
                {profileData.full_name.charAt(0)}
              </div>
              {isOwnProfile && (
                <Link to="/settings"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Edit Profile
                </Link>
              )}
            </div>

            {/* Name & Verification */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{profileData.full_name}</h1>
              {profileData.senior_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Placed Senior
                </span>
              )}
            </div>

            {/* Company & Role */}
            {profileData.company_name && (
              <div className="flex items-center gap-2 text-sm text-slate-700 font-medium mb-3">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{profileData.job_role || 'Engineer'}</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold">{profileData.company_name}</span>
              </div>
            )}

            {/* Info Chips */}
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                {profileData.department}
              </span>
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Class of {profileData.graduation_year}
              </span>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                profileData.member_type === 'alumni'
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-blue-50 border-blue-200 text-[#2957A4]'
              }`}>
                <GraduationCap className="w-3.5 h-3.5" />
                {profileData.member_type === 'alumni' ? 'Alumni' : 'Student'}
              </span>
            </div>

            {/* Bio */}
            {profileData.bio && (
              <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                {profileData.bio}
              </p>
            )}

            {/* Self-reported disclaimer for unverified seniors */}
            {profileData.company_name && !profileData.senior_verified && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                Company info is self-reported and pending senior verification.
              </div>
            )}
          </div>
        </div>

        {/* Posts by this member */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            Community Contributions ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              No posts yet.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={() => queryClient.invalidateQueries({ queryKey: ['profile-posts', id] })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
