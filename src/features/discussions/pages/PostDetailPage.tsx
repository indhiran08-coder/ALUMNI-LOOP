// ====================================================================
// AlumniLoop — Post Detail & Discussion Thread Page
// File: src/features/discussions/pages/PostDetailPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  Share2,
  Bookmark,
  Compass,
  Trash2,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { VoteControl } from '@/components/posts/VoteControl'
import { CommentThread } from '@/components/posts/CommentThread'
import { feedService } from '@/features/feed/feed.service'
import { discussionsService } from '../discussions.service'
import { useAuth } from '@/app/providers'

export const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, profile, isAdmin } = useAuth()
  const [copied, setCopied] = useState(false)

  const { data: post, isLoading: isPostLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => (id ? feedService.getPostById(id) : null),
    enabled: Boolean(id),
  })

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => (id ? discussionsService.getCommentsByPostId(id) : []),
    enabled: Boolean(id),
  })

  if (isPostLoading) {
    return (
      <AppShell>
        <div className="bg-white rounded-xl border border-slate-200 p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-32 bg-slate-100 rounded w-full" />
        </div>
      </AppShell>
    )
  }

  if (!post) {
    return (
      <AppShell>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Compass className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Discussion Not Found</h2>
          <p className="text-xs text-slate-500">This post may have been removed or does not exist.</p>
          <Link
            to="/feed"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2957A4] text-white text-xs font-semibold rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
        </div>
      </AppShell>
    )
  }

  const handleCommentAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['comments', id] })
    queryClient.invalidateQueries({ queryKey: ['post', id] })
    queryClient.invalidateQueries({ queryKey: ['feed'] })
  }

  const isAuthor = Boolean(
    (user?.id && user.id === post.author_id) ||
    (profile?.id && profile.id === post.author_id)
  )
  const canDelete = isAuthor || isAdmin

  const handleDelete = async () => {
    const confirmMsg = isAdmin && !isAuthor
      ? 'Are you sure you want to delete this discussion post as an administrator?'
      : 'Are you sure you want to delete your discussion post?'
    if (!window.confirm(confirmMsg)) return

    try {
      await feedService.deletePost(post.id)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      navigate('/feed')
    } catch (err: any) {
      alert(err.message || 'Failed to delete discussion.')
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#2957A4] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to discussions
          </button>
          <span className="text-xs text-slate-400 font-medium">
            Category: <strong className="text-slate-700">{post.category}</strong>
          </span>
        </div>

        {/* Main Post Card */}
        <article className="bg-white rounded-xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
          {/* Top metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-[#2957A4] flex items-center justify-center font-bold text-sm shrink-0">
                {post.author ? post.author.full_name.charAt(0) : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Link
                    to={post.author ? `/profile/${post.author.id}` : '#'}
                    className="font-bold text-slate-900 hover:text-[#2957A4] text-sm"
                  >
                    {post.author?.full_name || 'Anonymous Member'}
                  </Link>
                  {post.author?.senior_verified && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Senior
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                  {post.author?.company_name && (
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {post.author.company_name} ({post.author.job_role || 'Alumni'})
                    </span>
                  )}
                  <span>•</span>
                  <span>{post.author?.department}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-[#2957A4] border border-blue-200">
              {post.post_type}
            </span>
          </div>

          {/* Post Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            {post.title}
          </h1>

          {/* Post Full Body */}
          <div className="text-sm sm:text-base text-slate-800 whitespace-pre-line leading-relaxed pb-3">
            {post.body}
          </div>

          {/* Attached Photo */}
          {post.image_url && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center my-4 p-1">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-auto max-h-[500px] object-contain rounded-lg"
              />
            </div>
          )}

          {/* Vote and Share toolbar */}
          <div className="flex items-center justify-between pt-1">
            <VoteControl
              postId={post.id}
              initialUpvotes={post.upvotes_count}
              initialDownvotes={post.downvotes_count}
              initialUserVote={post.user_vote}
              orientation="horizontal"
            />

            <div className="flex items-center gap-2 text-xs text-slate-500">
              {canDelete && (
                <button
                  onClick={handleDelete}
                  title={isAdmin && !isAuthor ? 'Delete discussion as administrator' : 'Delete your discussion'}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isAdmin && !isAuthor ? 'Delete Post (Admin)' : 'Delete Post'}</span>
                </button>
              )}

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href)
                  } catch {
                    // Fallback for browsers that restrict clipboard
                    const el = document.createElement('input')
                    el.value = window.location.href
                    document.body.appendChild(el)
                    el.select()
                    document.execCommand('copy')
                    document.body.removeChild(el)
                  }
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2500)
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 font-medium transition-colors relative"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{copied ? 'Link Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
        </article>

        {/* Discussion Thread */}
        <CommentThread
          postId={post.id}
          postAuthorId={post.author_id}
          isQuestionPost={post.post_type === 'question'}
          comments={comments}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </AppShell>
  )
}
