// ====================================================================
// AlumniLoop — Community Discussion Feed Page
// File: src/features/feed/pages/FeedPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Compass,
  Sparkles,
  Flame,
  HelpCircle,
  Clock,
  Filter,
  PlusCircle,
  Search,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PostCard } from '@/components/posts/PostCard'
import { feedService } from '../feed.service'
import { POST_CATEGORIES, PostCategory } from '@/types/database.types'
import { useAuth } from '@/app/providers'
import { socket } from '@/lib/socket'

export const FeedPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const currentCategory = (searchParams.get('category') as PostCategory) || 'All'
  const currentSort = (searchParams.get('sort') as 'latest' | 'top' | 'unanswered') || 'latest'
  const currentSearch = searchParams.get('q') || ''

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['feed', currentCategory, currentSort, currentSearch],
    queryFn: () =>
      feedService.getPosts({
        category: currentCategory,
        sort: currentSort,
        search: currentSearch,
      }),
  })

  // Realtime WebSocket Listener for Zero-Lag Feed Updates
  React.useEffect(() => {
    const handleLiveUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    }

    socket.on('post:created', handleLiveUpdate)
    socket.on('post:voted', handleLiveUpdate)
    socket.on('post:comment_count_updated', handleLiveUpdate)
    socket.on('post:deleted', handleLiveUpdate)

    return () => {
      socket.off('post:created', handleLiveUpdate)
      socket.off('post:voted', handleLiveUpdate)
      socket.off('post:comment_count_updated', handleLiveUpdate)
      socket.off('post:deleted', handleLiveUpdate)
    }
  }, [queryClient])

  const setCategoryFilter = (cat: string) => {
    const next = new URLSearchParams(searchParams)
    if (cat === 'All') {
      next.delete('category')
    } else {
      next.set('category', cat)
    }
    setSearchParams(next)
  }

  const setSortFilter = (sort: 'latest' | 'top' | 'unanswered') => {
    const next = new URLSearchParams(searchParams)
    next.set('sort', sort)
    setSearchParams(next)
  }

  const handleSearch = (q: string) => {
    const next = new URLSearchParams(searchParams)
    if (!q.trim()) {
      next.delete('q')
    } else {
      next.set('q', q)
    }
    setSearchParams(next)
  }

  return (
    <AppShell onSearch={handleSearch} currentSearch={currentSearch}>
      <div className="space-y-4">
        {/* Feed Header Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="w-6 h-6 text-[#2957A4]" />
              {currentCategory === 'All' ? 'AI & DS Community Feed' : currentCategory}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Peer-to-peer AI, ML &amp; data science discussions, interview prep, and placement strategies.
            </p>
          </div>

          {profile?.account_status === 'approved' && (
            <Link
              to="/ask"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2957A4] hover:bg-[#1f4482] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ask or Share</span>
            </Link>
          )}
        </div>

        {/* Sort Controls & Active Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 sm:px-4 rounded-xl border border-slate-200 shadow-2xs">
          {/* Sorting Tabs */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setSortFilter('latest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                currentSort === 'latest'
                  ? 'bg-blue-50 text-[#2957A4]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Latest</span>
            </button>

            <button
              onClick={() => setSortFilter('top')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                currentSort === 'top'
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Top Voted</span>
            </button>

            <button
              onClick={() => setSortFilter('unanswered')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                currentSort === 'unanswered'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Unanswered</span>
            </button>
          </div>

          {/* Active search filter clear */}
          {currentSearch && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>"{currentSearch}"</span>
              <button
                onClick={() => handleSearch('')}
                className="text-slate-400 hover:text-slate-700 font-bold ml-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Category Horizontal Carousel/Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-colors ${
              currentCategory === 'All'
                ? 'bg-[#2957A4] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Topics
          </button>
          {POST_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-colors ${
                currentCategory === cat
                  ? 'bg-[#2957A4] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Discussions Feed List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="h-16 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
            <Compass className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="text-base font-bold text-slate-800">No discussions match your filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try choosing another topic, clearing your search query, or start a new discussion to help batchmates.
            </p>
            {profile?.account_status === 'approved' && (
              <Link
                to="/ask"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2957A4] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#1f4482]"
              >
                <PlusCircle className="w-4 h-4" />
                Start Discussion
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => queryClient.invalidateQueries({ queryKey: ['feed'] })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
