// ====================================================================
// AlumniLoop — Vote Control Component
// File: src/components/posts/VoteControl.tsx
// ====================================================================

import React, { useState } from 'react'
import { ArrowBigUp, ArrowBigDown } from 'lucide-react'
import { feedService } from '@/features/feed/feed.service'

interface VoteControlProps {
  postId: string
  initialUpvotes: number
  initialDownvotes: number
  initialUserVote?: number // 1, -1, or 0
  orientation?: 'vertical' | 'horizontal'
  onVoteChange?: (score: number, userVote: number) => void
}

export const VoteControl: React.FC<VoteControlProps> = ({
  postId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote = 0,
  orientation = 'vertical',
  onVoteChange,
}) => {
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [userVote, setUserVote] = useState(initialUserVote)
  const [isVoting, setIsVoting] = useState(false)

  const score = upvotes - downvotes

  const handleVote = async (targetValue: 1 | -1) => {
    if (isVoting) return
    setIsVoting(true)

    // Toggle off if already voted the same
    const newValue: 1 | -1 | 0 = userVote === targetValue ? 0 : targetValue

    try {
      const res = await feedService.vote(postId, newValue)
      setUpvotes(res.upvotes)
      setDownvotes(res.downvotes)
      setUserVote(res.userVote)
      if (onVoteChange) {
        onVoteChange(res.upvotes - res.downvotes, res.userVote)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit vote.')
    } finally {
      setIsVoting(false)
    }
  }

  const isVertical = orientation === 'vertical'

  return (
    <div
      className={`flex items-center ${
        isVertical ? 'flex-col justify-center' : 'flex-row'
      } bg-slate-50/80 rounded-lg p-1 border border-slate-200/80`}
    >
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isVoting}
        aria-label="Upvote"
        className={`p-1 rounded-md transition-colors ${
          userVote === 1
            ? 'text-orange-600 bg-orange-100/70 hover:bg-orange-200/60'
            : 'text-slate-400 hover:text-orange-600 hover:bg-slate-100'
        }`}
      >
        <ArrowBigUp className={`w-5 h-5 ${userVote === 1 ? 'fill-orange-600' : ''}`} />
      </button>

      <span
        className={`text-xs font-bold px-1.5 select-none ${
          userVote === 1
            ? 'text-orange-600'
            : userVote === -1
            ? 'text-[#2681a3]'
            : 'text-slate-700'
        }`}
      >
        {score}
      </span>

      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        aria-label="Downvote"
        className={`p-1 rounded-md transition-colors ${
          userVote === -1
            ? 'text-[#2681a3] bg-[#eaf6fa] hover:bg-[#d6f0f8]'
            : 'text-slate-400 hover:text-[#2681a3] hover:bg-slate-100'
        }`}
      >
        <ArrowBigDown className={`w-5 h-5 ${userVote === -1 ? 'fill-[#2681a3]' : ''}`} />
      </button>
    </div>
  )
}
