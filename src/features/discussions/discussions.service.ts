// ====================================================================
// AlumniLoop — Discussions & Nested Comments Service
// File: src/features/discussions/discussions.service.ts
// ====================================================================

import { Comment } from '@/types/database.types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mockStore } from '@/lib/mockStore'
import { authService } from '@/features/auth/auth.service'
import { feedService } from '@/features/feed/feed.service'
import { fetchFromAPI } from '@/lib/api'

export interface CreateCommentInput {
  postId: string
  body: string
  parentCommentId?: string | null
}

export const discussionsService = {
  async getCommentsByPostId(postId: string): Promise<Comment[]> {
    // Check Realtime API Server First
    const apiComments = await fetchFromAPI<Comment[]>(`/posts/${postId}/comments`)
    if (apiComments) {
      return this.organizeNestedComments(apiComments)
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw new Error(error.message)
      return this.organizeNestedComments(data as Comment[])
    }

    const allComments = mockStore.getComments()
    const profiles = mockStore.getProfiles()
    const postComments = allComments.filter((c) => c.post_id === postId)

    const populated: Comment[] = postComments.map((c) => ({
      ...c,
      author: profiles.find((p) => p.id === c.author_id),
    }))

    return this.organizeNestedComments(populated)
  },

  organizeNestedComments(flatList: Comment[]): Comment[] {
    const map = new Map<string, Comment>()
    const rootComments: Comment[] = []

    // Clone and initialize replies array
    flatList.forEach((comment) => {
      map.set(comment.id, { ...comment, replies: [] })
    })

    flatList.forEach((comment) => {
      const item = map.get(comment.id)!
      if (comment.parent_comment_id && map.has(comment.parent_comment_id)) {
        const parent = map.get(comment.parent_comment_id)!
        parent.replies = parent.replies || []
        parent.replies.push(item)
      } else {
        rootComments.push(item)
      }
    })

    return rootComments
  },

  async createComment(input: CreateCommentInput): Promise<Comment> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) {
      throw new Error('Authentication required.')
    }
    if (session.profile.account_status !== 'approved' && !session.isAdmin) {
      throw new Error('Only approved members can participate in discussions.')
    }

    if (!input.body.trim()) {
      throw new Error('Comment cannot be empty.')
    }

    const post = await feedService.getPostById(input.postId)
    if (!post) throw new Error('Post not found.')

    const newCommentId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newComment: Comment = {
      id: newCommentId,
      post_id: input.postId,
      author_id: session.profile.id,
      parent_comment_id: input.parentCommentId || null,
      body: input.body.trim(),
      is_accepted_answer: false,
      created_at: now,
      updated_at: now,
      author: session.profile,
      replies: [],
    }

    // Call Realtime Backend API First
    const apiComment = await fetchFromAPI<Comment>(`/posts/${input.postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        author_id: session.profile.id,
        body: input.body.trim(),
        parent_comment_id: input.parentCommentId || null,
      }),
    })
    if (apiComment) {
      return apiComment
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          id: newCommentId,
          post_id: input.postId,
          author_id: session.profile.id,
          parent_comment_id: input.parentCommentId || null,
          body: newComment.body,
        })
        .select('*, author:profiles(*)')
        .single()
      if (error) throw new Error(error.message)
      return data as Comment
    }

    const comments = mockStore.getComments()
    mockStore.setComments([...comments, newComment])

    // Update post comments count
    const posts = mockStore.getPosts().map((p) =>
      p.id === input.postId ? { ...p, comments_count: p.comments_count + 1 } : p
    )
    mockStore.setPosts(posts)

    // Create simulated notification for post author if different
    if (post.author_id !== session.user.id) {
      const notifs = mockStore.getNotifications()
      notifs.unshift({
        id: crypto.randomUUID(),
        recipient_id: post.author_id,
        actor_id: session.user.id,
        event_type: 'post_comment',
        post_id: post.id,
        comment_id: newCommentId,
        message: `${session.profile.full_name} commented on your post: "${post.title.substring(0, 45)}..."`,
        read_at: null,
        created_at: now,
        actor: session.profile,
      })
      mockStore.setNotifications(notifs)
    }

    return newComment
  },

  async toggleAcceptedAnswer(commentId: string, postId: string): Promise<boolean> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Unauthorized')

    const post = await feedService.getPostById(postId)
    if (!post) throw new Error('Post not found.')

    // Security check: Only post author or admin can mark accepted answer
    if (post.author_id !== session.user.id && !session.isAdmin) {
      throw new Error('Only the question author or an administrator can accept an answer.')
    }

    if (isSupabaseConfigured() && supabase) {
      // First, get target comment status
      const { data: target } = await supabase
        .from('comments')
        .select('is_accepted_answer')
        .eq('id', commentId)
        .single()

      const willBeAccepted = !target?.is_accepted_answer

      // Unmark any currently accepted answer for this post
      await supabase
        .from('comments')
        .update({ is_accepted_answer: false })
        .eq('post_id', postId)

      if (willBeAccepted) {
        await supabase
          .from('comments')
          .update({ is_accepted_answer: true })
          .eq('id', commentId)
      }
      return willBeAccepted
    }

    const comments = mockStore.getComments()
    const target = comments.find((c) => c.id === commentId)
    if (!target) throw new Error('Comment not found.')

    const willBeAccepted = !target.is_accepted_answer

    const updated = comments.map((c) => {
      if (c.post_id === postId) {
        if (c.id === commentId) {
          return { ...c, is_accepted_answer: willBeAccepted }
        }
        return { ...c, is_accepted_answer: false }
      }
      return c
    })
    mockStore.setComments(updated)

    // Notify comment author if accepted
    if (willBeAccepted && target.author_id !== session.user.id) {
      const notifs = mockStore.getNotifications()
      notifs.unshift({
        id: crypto.randomUUID(),
        recipient_id: target.author_id,
        actor_id: session.user.id,
        event_type: 'accepted_answer',
        post_id: post.id,
        comment_id: commentId,
        message: `Your answer was marked as the accepted solution by ${session.profile.full_name}!`,
        read_at: null,
        created_at: new Date().toISOString(),
        actor: session.profile,
      })
      mockStore.setNotifications(notifs)
    }

    return willBeAccepted
  },

  async deleteComment(commentId: string, postId: string): Promise<void> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Unauthorized')

    // Call backend API first
    const apiRes = await fetchFromAPI<{ success: boolean }>(`/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId: session.user.id, isAdmin: session.isAdmin }),
    })
    if (apiRes && apiRes.success) return

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('comments').delete().eq('id', commentId)
      if (error) throw new Error(error.message)
      return
    }

    const comments = mockStore.getComments()
    const target = comments.find((c) => c.id === commentId)
    if (!target) return

    if (target.author_id !== session.user.id && !session.isAdmin) {
      throw new Error('You do not have permission to delete this comment.')
    }

    mockStore.setComments(comments.filter((c) => c.id !== commentId && c.parent_comment_id !== commentId))
  },
}
