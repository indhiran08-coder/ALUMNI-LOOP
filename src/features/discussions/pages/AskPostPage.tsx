// ====================================================================
// AlumniLoop — Create Discussion Post Page
// File: src/features/discussions/pages/AskPostPage.tsx
// ====================================================================

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusCircle,
  HelpCircle,
  Award,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Send,
  AlertCircle,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { POST_CATEGORIES, PostCategory, PostType } from '@/types/database.types'
import { feedService } from '@/features/feed/feed.service'
import { useAuth } from '@/app/providers'

export const AskPostPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuth()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [postType, setPostType] = useState<PostType>('question')
  const [category, setCategory] = useState<PostCategory>('Placement Preparation')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP).')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Photo must be smaller than 15 MB.')
      return
    }
    setPhotoName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        // Scale down large camera photos (e.g. 4000x3000) to max 1200px width/height for fast load & storage
        const maxDim = 1200
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const optimized = canvas.toDataURL('image/jpeg', 0.85)
          setPhotoUrl(optimized)
        } else {
          setPhotoUrl(dataUrl)
        }
      }
      img.onerror = () => {
        setPhotoUrl(dataUrl)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoUrl(null)
    setPhotoName(null)
  }

  if (profile?.account_status !== 'approved' && !isAdmin) {
    return (
      <AppShell>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Account Pending Approval</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You will be able to publish discussions as soon as the college administrator approves your account registration.
          </p>
          <button
            onClick={() => navigate('/feed')}
            className="px-4 py-2 bg-[#2957A4] text-white text-xs font-semibold rounded-lg"
          >
            Back to Feed
          </button>
        </div>
      </AppShell>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (title.trim().length < 3) {
      setErrorMessage('Title must be at least 3 characters.')
      return
    }
    if (body.trim().length < 3) {
      setErrorMessage('Content must be at least 3 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await feedService.createPost({
        title: title.trim(),
        body: body.trim(),
        imageUrl: photoUrl,
        postType,
        category,
      })
      navigate(`/post/${created.id}`)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create discussion post.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const postTypeOptions: { type: PostType; label: string; icon: any; desc: string }[] = [
    {
      type: 'question',
      label: 'Ask a Question',
      icon: HelpCircle,
      desc: 'Ask seniors about interview rounds, coding topics, or resume tips',
    },
    {
      type: 'experience',
      label: 'Interview Experience',
      icon: Award,
      desc: 'Document your company recruitment journey, rounds, and test questions',
    },
    {
      type: 'advice',
      label: 'Preparation Advice',
      icon: Sparkles,
      desc: 'Share roadmaps, schedule strategies, and problem-solving best practices',
    },
    {
      type: 'resource',
      label: 'Learning Resource',
      icon: BookOpen,
      desc: 'Share verified study materials, cheatsheets, or DSA problem sets',
    },
  ]

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#2957A4]"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel & Return
        </button>

        {/* Composer Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-[#2957A4]" />
              Start a New Community Discussion
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your insights will remain accessible to all batchmates and juniors for future campus drives.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Post Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Discussion Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {postTypeOptions.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = postType === opt.type
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setPostType(opt.type)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#2957A4] bg-blue-50/60 ring-2 ring-[#2957A4]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#2957A4]' : 'text-slate-400'}`} />
                        <span>{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label htmlFor="post-category" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Topic Category
              </label>
              <select
                id="post-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PostCategory)}
                className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4]"
              >
                {POST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Post Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="post-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Discussion Title
                </label>
                <span className="text-[11px] text-slate-400">{title.length}/300</span>
              </div>
              <input
                id="post-title"
                type="text"
                maxLength={300}
                placeholder="e.g. Amazon SDE-1 On-Campus Rounds Breakdown & Tips (2025 Batch)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4]"
                required
              />
              {title.trim().length < 3 && title.length > 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  {3 - title.trim().length} more character{3 - title.trim().length !== 1 ? 's' : ''} needed for title
                </p>
              )}
            </div>

            {/* Post Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="post-body" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Content & Details
                </label>
                <span className="text-[11px] text-slate-400">{body.length} chars</span>
              </div>
              <textarea
                id="post-body"
                rows={10}
                placeholder={
                  postType === 'experience'
                    ? "Include details like:\n- Online Assessment questions (topics and constraints)\n- Technical Round 1 & 2 problem statements and expectations\n- Behavioral/HR questions\n- Preparation advice that helped you crack the interview..."
                    : "Write a comprehensive breakdown. Markdown formatting (headers, bullet points, code blocks) is supported..."
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2957A4]/20 focus:border-[#2957A4] font-mono text-xs sm:text-sm"
                required
              />
              {/* Helper: show min requirement */}
              {body.trim().length < 3 && body.length > 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  {3 - body.trim().length} more character{3 - body.trim().length !== 1 ? 's' : ''} needed for content
                </p>
              )}
            </div>

            {/* Optional Photo Attachment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Attach Photo / Diagram / Screenshot (Optional)
              </label>

              {!photoUrl ? (
                <label className="flex items-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg hover:border-[#2957A4] hover:bg-blue-50/30 transition-colors cursor-pointer text-xs font-semibold text-slate-600">
                  <ImageIcon className="w-4 h-4 text-[#2957A4]" />
                  <span>Choose Image from your device (PNG, JPG, WEBP, max 8MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={photoUrl}
                      alt="Attachment Preview"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="text-xs truncate">
                      <p className="font-semibold text-slate-800 truncate">{photoName || 'Attached Photo'}</p>
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium mt-0.5">
                        ✓ Image ready to publish
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    title="Remove Photo"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit Toolbar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Visible to all verified students & alumni
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || title.trim().length < 3 || body.trim().length < 3}
                  title={
                    title.trim().length < 3 || body.trim().length < 3
                      ? 'Please enter at least 3 characters for both title and content to publish'
                      : 'Publish discussion'
                  }
                  className="px-5 py-2.5 bg-[#2957A4] hover:bg-[#1f4482] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Discussion'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
