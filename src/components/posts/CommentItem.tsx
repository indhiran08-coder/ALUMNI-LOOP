// ====================================================================
// AlumniLoop — Nested Comment Item Component
// File: src/components/posts/CommentItem.tsx
// ====================================================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle,
  Reply,
  Trash2,
  Building2,
  Send,
  Flag,
} from 'lucide-react'
import { Comment } from '@/types/database.types'
import { useAuth } from '@/app/providers'
import { discussionsService } from '@/features/discussions/discussions.service'
import { notificationsService } from '@/features/notifications/notifications.service'

interface CommentItemProps {
  comment: Comment
  postAuthorId: string
  isQuestionPost: boolean
  onCommentUpdated: () => void
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postAuthorId,
  isQuestionPost,
  onCommentUpdated,
}) => {
  const { user, profile, isAdmin } = useAuth()
  const [isReplying, setIsReplying] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)

  const isPostAuthor = Boolean(
    (user?.id && user.id === postAuthorId) ||
    (profile?.id && profile.id === postAuthorId)
  )
  const isCommentAuthor = Boolean(
    (user?.id && user.id === comment.author_id) ||
    (profile?.id && profile.id === comment.author_id)
  )
  const canToggleAccepted = (isPostAuthor || isAdmin) && isQuestionPost
  const canDelete = isCommentAuthor || isAdmin

  const handleToggleAccepted = async () => {
    try {
      await discussionsService.toggleAcceptedAnswer(comment.id, comment.post_id)
      onCommentUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to toggle accepted status.')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await discussionsService.deleteComment(comment.id, comment.post_id)
      onCommentUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.')
    }
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyBody.trim() || isSubmittingReply) return

    setIsSubmittingReply(true)
    try {
      await discussionsService.createComment({
        postId: comment.post_id,
        parentCommentId: comment.id,
        body: replyBody.trim(),
      })
      setReplyBody('')
      setIsReplying(false)
      onCommentUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to post reply.')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const formattedDate = new Date(comment.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={`relative pl-3 sm:pl-4 border-l-2 transition-colors ${
        comment.is_accepted_answer
          ? 'border-emerald-500 bg-emerald-50/30 rounded-r-xl p-3 my-2'
          : 'border-slate-200 hover:border-slate-300 py-2'
      }`}
    >
      {/* Accepted Solution Banner */}
      {comment.is_accepted_answer && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-2 bg-emerald-100/70 border border-emerald-300/80 px-2.5 py-1 rounded-md w-fit">
          <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
          <span>Accepted Answer by Author</span>
        </div>
      )}

      {/* Comment Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
        <div className="flex items-center gap-2">
          <Link
            to={comment.author ? `/profile/${comment.author.id}` : '#'}
            className="font-bold text-slate-800 hover:text-[#2957A4] flex items-center gap-1"
          >
            <span>{comment.author?.full_name || 'Member'}</span>
            {comment.author?.senior_verified && (
              <span title="Verified Placed Senior / Alumni">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              </span>
            )}
          </Link>

          {comment.author?.company_name && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Building2 className="w-3 h-3 text-slate-400" />
              {comment.author.company_name}
            </span>
          )}

          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-400">{formattedDate}</span>
        </div>

        {/* Accepted toggle action */}
        {canToggleAccepted && (
          <button
            type="button"
            onClick={handleToggleAccepted}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
              comment.is_accepted_answer
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{comment.is_accepted_answer ? 'Accepted Solution' : 'Mark as Accepted'}</span>
          </button>
        )}
      </div>

      {/* Comment Body */}
      <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed mb-2">
        {comment.body}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {(profile?.account_status === 'approved' || isAdmin) && (
          <button
            type="button"
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1 text-slate-600 hover:text-[#2957A4] font-medium"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-slate-400 hover:text-rose-600 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        )}
      </div>

      {/* Inline Reply Composer */}
      {isReplying && (
        <form onSubmit={handleReplySubmit} className="mt-2.5 space-y-2">
          <textarea
            rows={2}
            placeholder={`Reply to ${comment.author?.full_name || 'this answer'}...`}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4]"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReplying(false)}
              className="text-xs px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingReply || !replyBody.trim()}
              className="text-xs px-3 py-1 bg-[#2957A4] hover:bg-[#1f4482] text-white font-medium rounded-md shadow-2xs flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>Submit Reply</span>
            </button>
          </div>
        </form>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2 ml-1 sm:ml-2">
          {comment.replies.map((nestedReply) => (
            <CommentItem
              key={nestedReply.id}
              comment={nestedReply}
              postAuthorId={postAuthorId}
              isQuestionPost={isQuestionPost}
              onCommentUpdated={onCommentUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
