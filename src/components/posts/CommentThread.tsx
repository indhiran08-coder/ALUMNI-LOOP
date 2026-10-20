// ====================================================================
// AlumniLoop — Comment Thread Component
// File: src/components/posts/CommentThread.tsx
// ====================================================================

import React, { useState } from 'react'
import { MessageSquare, Send, Sparkles } from 'lucide-react'
import { Comment } from '@/types/database.types'
import { CommentItem } from './CommentItem'
import { useAuth } from '@/app/providers'
import { discussionsService } from '@/features/discussions/discussions.service'

interface CommentThreadProps {
  postId: string
  postAuthorId: string
  isQuestionPost: boolean
  comments: Comment[]
  onCommentAdded: () => void
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  postAuthorId,
  isQuestionPost,
  comments,
  onCommentAdded,
}) => {
  const { profile } = useAuth()
  const [commentBody, setCommentBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isApproved = profile?.account_status === 'approved' || profile?.role === 'admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentBody.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await discussionsService.createComment({
        postId,
        body: commentBody.trim(),
      })
      setCommentBody('')
      onCommentAdded()
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Root Comment Form */}
      {isApproved ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <label htmlFor="root-comment" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#2957A4]" />
              <span>{isQuestionPost ? 'Share an Answer or Experience' : 'Join Discussion'}</span>
            </label>
            {profile?.senior_verified && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Senior Verified Contributor
              </span>
            )}
          </div>

          <textarea
            id="root-comment"
            rows={3}
            placeholder={
              isQuestionPost
                ? 'Provide detailed technical advice, interview rounds breakdown, or problem-solving approaches...'
                : 'Write your perspective or follow-up question...'
            }
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4] transition-all"
            required
          />

          <div className="flex justify-between items-center pt-1">
            <span className="text-[11px] text-slate-400">
              Markdown formatting supported • Be respectful & constructive
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !commentBody.trim()}
              className="px-4 py-2 bg-[#2957A4] hover:bg-[#1f4482] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isQuestionPost ? 'Post Answer' : 'Submit Comment'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-xs font-bold text-amber-900">Member Approval Required</p>
          <p className="text-xs text-amber-700 mt-1">
            Only approved campus students and alumni can participate in community discussions.
          </p>
        </div>
      )}

      {/* Comment List */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <span>Community Discussions</span>
          <span className="text-xs font-normal text-slate-400">({comments.length})</span>
        </h3>

        {comments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-medium">No answers yet</p>
            <p className="text-xs text-slate-400">
              Be the first senior or batchmate to share knowledge!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postAuthorId={postAuthorId}
                isQuestionPost={isQuestionPost}
                onCommentUpdated={onCommentAdded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
