// ====================================================================
// AlumniLoop — Discussion Post Card Component
// File: src/components/posts/PostCard.tsx
// ====================================================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Pin,
  MessageSquare,
  Bookmark,
  Share2,
  Flag,
  Trash2,
  Building2,
  CheckCircle2,
} from 'lucide-react'
import { Post } from '@/types/database.types'
import { VoteControl } from './VoteControl'
import { useAuth } from '@/app/providers'
import { feedService } from '@/features/feed/feed.service'
import { notificationsService } from '@/features/notifications/notifications.service'

interface PostCardProps {
  post: Post
  onDelete?: (postId: string) => void
  showFullBody?: boolean
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onDelete,
  showFullBody = false,
}) => {
  const { user, profile, isAdmin } = useAuth()
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked || false)
  const [copied, setCopied] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const isAuthor = Boolean(
    (user?.id && user.id === post.author_id) ||
    (profile?.id && profile.id === post.author_id)
  )
  const canDelete = isAuthor || isAdmin

  const handleBookmarkToggle = async () => {
    try {
      const state = await feedService.toggleBookmark(post.id)
      setIsBookmarked(state)
    } catch (err: any) {
      alert(err.message || 'Failed to toggle bookmark.')
    }
  }

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    const postUrl = `${window.location.origin}/post/${post.id}`
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl)
      } else {
        throw new Error('Clipboard API unavailable')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers with restricted clipboard
      try {
        const el = document.createElement('input')
        el.value = postUrl
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.focus()
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        alert(`Share this link: ${postUrl}`)
      }
    }
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportReason.trim()) return

    try {
      await notificationsService.submitReport({
        targetType: 'post',
        targetId: post.id,
        reason: reportReason,
      })
      alert('Report submitted for administrator review.')
      setReporting(false)
      setReportReason('')
    } catch (err: any) {
      alert(err.message || 'Failed to submit report.')
    }
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    const confirmMsg = isAdmin && !isAuthor
      ? 'Are you sure you want to delete this discussion post as an administrator?'
      : 'Are you sure you want to delete your discussion post?'
    if (!window.confirm(confirmMsg)) return
    try {
      await feedService.deletePost(post.id)
      if (onDelete) onDelete(post.id)
    } catch (err: any) {
      alert(err.message || 'Failed to delete post.')
    }
  }

  const getPostTypeBadge = () => {
    switch (post.post_type) {
      case 'experience':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'question':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'advice':
        return 'bg-blue-50 text-[#2957A4] border-blue-200'
      case 'resource':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const formattedDate = new Date(post.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <article className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all overflow-hidden flex flex-col sm:flex-row">
      {/* Left Vote Column on Desktop */}
      <div className="hidden sm:flex p-3 bg-slate-50/50 border-r border-slate-100 items-start justify-center">
        <VoteControl
          postId={post.id}
          initialUpvotes={post.upvotes_count}
          initialDownvotes={post.downvotes_count}
          initialUserVote={post.user_vote}
          orientation="vertical"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
        <div>
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Post Type Badge */}
              <span
                className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getPostTypeBadge()}`}
              >
                {post.post_type}
              </span>

              {/* Category Pill */}
              <Link
                to={`/feed?category=${encodeURIComponent(post.category)}`}
                className="text-xs font-medium text-slate-500 hover:text-[#2957A4] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors"
              >
                {post.category}
              </Link>

              {/* Pinned Marker */}
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Pin className="w-3 h-3 fill-amber-600" />
                  Pinned
                </span>
              )}
            </div>

            <time className="text-slate-400 text-[11px]">{formattedDate}</time>
          </div>

          {/* Post Title */}
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug mb-2 hover:text-[#2957A4] transition-colors">
            <Link to={`/post/${post.id}`}>{post.title}</Link>
          </h2>

          {/* Author Details */}
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-600">
            <Link
              to={post.author ? `/profile/${post.author.id}` : '#'}
              className="font-semibold text-slate-800 hover:text-[#2957A4] flex items-center gap-1"
            >
              <span>{post.author?.full_name || 'Anonymous Member'}</span>
              {post.author?.senior_verified && (
                <span title="Verified Placed Senior / Alumni">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                </span>
              )}
            </Link>

            {post.author?.company_name && (
              <span className="hidden sm:inline-flex items-center gap-1 text-slate-500 font-medium">
                <Building2 className="w-3 h-3 text-slate-400" />
                {post.author.company_name}
              </span>
            )}

            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              {post.author?.department} ('{post.author ? post.author.graduation_year % 100 : ''})
            </span>
          </div>

          {/* Post Snippet or Body */}
          <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-4">
            {showFullBody ? (
              post.body
            ) : (
              <>
                {post.body.length > 280 ? `${post.body.substring(0, 280)}...` : post.body}
                {post.body.length > 280 && (
                  <Link
                    to={`/post/${post.id}`}
                    className="ml-1 text-xs font-semibold text-[#2957A4] hover:underline"
                  >
                    Read full post
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Optional Attached Photo */}
          {post.image_url && (
            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50 max-h-80 flex items-center justify-center">
              <Link to={`/post/${post.id}`} className="w-full block">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-auto max-h-80 object-cover hover:scale-[1.01] transition-transform"
                  loading="lazy"
                />
              </Link>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Mobile Vote Control */}
          <div className="sm:hidden">
            <VoteControl
              postId={post.id}
              initialUpvotes={post.upvotes_count}
              initialDownvotes={post.downvotes_count}
              initialUserVote={post.user_vote}
              orientation="horizontal"
            />
          </div>

          {/* Discussion count */}
          <Link
            to={`/post/${post.id}`}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>{post.comments_count} Discussions</span>
          </Link>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 text-slate-500">
            {/* Bookmark button */}
            <button
              onClick={handleBookmarkToggle}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Discussion'}
              className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${
                isBookmarked ? 'text-[#2957A4]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#2957A4]' : ''}`} />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              title="Copy share link"
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors relative"
            >
              <Share2 className="w-4 h-4" />
              {copied && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-20">
                  Copied!
                </span>
              )}
            </button>

            {/* Report button */}
            <button
              onClick={() => setReporting(!reporting)}
              title="Report inappropriate content"
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <Flag className="w-4 h-4" />
            </button>

            {/* Delete button (author/admin) */}
            {canDelete && (
              <button
                onClick={handleDelete}
                title={isAdmin && !isAuthor ? 'Delete Post (Admin Moderation)' : 'Delete your post'}
                className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Inline Reporting Form */}
        {reporting && (
          <form onSubmit={handleReportSubmit} className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs font-bold text-rose-900 mb-1">Report Discussion</p>
            <input
              type="text"
              placeholder="Reason (e.g. offensive, spam, inaccurate placement claim)..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-rose-300 rounded mb-2 text-slate-800 placeholder-slate-400 focus:outline-hidden"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReporting(false)}
                className="text-xs px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs px-2.5 py-1 bg-rose-600 text-white font-medium rounded hover:bg-rose-700"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  )
}
