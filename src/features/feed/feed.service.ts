// ====================================================================
// AlumniLoop — Community Feed & Posts Service
// File: src/features/feed/feed.service.ts
// ====================================================================

import { Post, PostCategory, PostType, Profile } from '@/types/database.types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mockStore } from '@/lib/mockStore'
import { authService } from '@/features/auth/auth.service'
import { fetchFromAPI } from '@/lib/api'

export interface GetPostsParams {
  category?: PostCategory | 'All'
  sort?: 'latest' | 'top' | 'unanswered'
  search?: string
  postType?: PostType | 'all'
  authorId?: string
}

export interface CreatePostInput {
  title: string
  body: string
  imageUrl?: string | null
  postType: PostType
  category: PostCategory
}

export const feedService = {
  async getPosts(params: GetPostsParams = {}): Promise<Post[]> {
    const session = await authService.getCurrentSession()
    const currentUserId = session.user?.id

    // Check Realtime Backend API first
    const queryParts: string[] = []
    if (currentUserId) queryParts.push(`userId=${encodeURIComponent(currentUserId)}`)
    if (params.category && params.category !== 'All') queryParts.push(`category=${encodeURIComponent(params.category)}`)
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`)
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''

    const apiPosts = await fetchFromAPI<Post[]>(`/posts${queryString}`)
    if (apiPosts) {
      let filtered = [...apiPosts]
      if (params.postType && params.postType !== 'all') {
        filtered = filtered.filter((p) => p.post_type === params.postType)
      }
      if (params.sort === 'top') {
        filtered.sort((a, b) => (b.upvotes_count - b.downvotes_count) - (a.upvotes_count - a.downvotes_count))
      } else {
        filtered.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1
          if (!a.is_pinned && b.is_pinned) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      }
      return filtered
    }

    if (isSupabaseConfigured() && supabase) {
      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)

      if (params.category && params.category !== 'All') {
        query = query.eq('category', params.category)
      }
      if (params.postType && params.postType !== 'all') {
        query = query.eq('post_type', params.postType)
      }
      if (params.authorId) {
        query = query.eq('author_id', params.authorId)
      }

      if (params.sort === 'top') {
        query = query.order('upvotes_count', { ascending: false })
      } else {
        query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data as Post[]
    }

    // Local Mock Feed Engine
    let posts = mockStore.getPosts()
    const profiles = mockStore.getProfiles()
    const votes = mockStore.getVotes()
    const bookmarks = mockStore.getBookmarks()
    const comments = mockStore.getComments()

    // 1. Filter by category
    if (params.category && params.category !== 'All') {
      posts = posts.filter((p) => p.category === params.category)
    }

    // 2. Filter by post type
    if (params.postType && params.postType !== 'all') {
      posts = posts.filter((p) => p.post_type === params.postType)
    }

    // 3. Filter by author
    if (params.authorId) {
      posts = posts.filter((p) => p.author_id === params.authorId)
    }

    // 4. Search filter across title, body, and category
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase()
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    }

    // 5. Unanswered filter
    if (params.sort === 'unanswered') {
      posts = posts.filter((p) => {
        if (p.post_type !== 'question') return false
        const postComments = comments.filter((c) => c.post_id === p.id)
        const hasAccepted = postComments.some((c) => c.is_accepted_answer)
        return !hasAccepted
      })
    }

    // 6. Sorting
    if (params.sort === 'top') {
      posts.sort((a, b) => b.upvotes_count - b.downvotes_count - (a.upvotes_count - a.downvotes_count))
    } else {
      // Latest (pinned first)
      posts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    // Populate relations
    return posts.map((post) => {
      const author = profiles.find((pr) => pr.id === post.author_id)
      const userVote = currentUserId
        ? votes.find((v) => v.post_id === post.id && v.user_id === currentUserId)?.value || 0
        : 0
      const isBookmarked = currentUserId
        ? bookmarks.some((b) => b.post_id === post.id && b.user_id === currentUserId)
        : false

      return {
        ...post,
        author,
        user_vote: userVote,
        is_bookmarked: isBookmarked,
      }
    })
  },

  async getPostById(postId: string): Promise<Post | null> {
    const session = await authService.getCurrentSession()
    const currentUserId = session.user?.id

    // Check Realtime Backend API first
    const apiPost = await fetchFromAPI<Post>(
      `/posts/${postId}${currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : ''}`
    )
    if (apiPost) return apiPost

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('id', postId)
        .single()
      if (error) return null
      return data as Post
    }

    const posts = mockStore.getPosts()
    const post = posts.find((p) => p.id === postId)
    if (!post) return null

    const profiles = mockStore.getProfiles()
    const votes = mockStore.getVotes()
    const bookmarks = mockStore.getBookmarks()

    const author = profiles.find((p) => p.id === post.author_id)
    const userVote = currentUserId
      ? votes.find((v) => v.post_id === post.id && v.user_id === currentUserId)?.value || 0
      : 0
    const isBookmarked = currentUserId
      ? bookmarks.some((b) => b.post_id === post.id && b.user_id === currentUserId)
      : false

    return {
      ...post,
      author,
      user_vote: userVote,
      is_bookmarked: isBookmarked,
    }
  },

  async createPost(input: CreatePostInput): Promise<Post> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) {
      throw new Error('Authentication required.')
    }
    if (session.profile.account_status !== 'approved' && !session.isAdmin) {
      throw new Error('Your account is pending administrator approval.')
    }

    if (input.title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters.')
    }
    if (input.body.trim().length < 3) {
      throw new Error('Body must be at least 3 characters.')
    }

    const newPostId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newPost: Post = {
      id: newPostId,
      author_id: session.profile.id,
      title: input.title.trim(),
      body: input.body.trim(),
      post_type: input.postType,
      category: input.category,
      is_pinned: false,
      upvotes_count: 0,
      downvotes_count: 0,
      comments_count: 0,
      created_at: now,
      updated_at: now,
      image_url: input.imageUrl || null,
      author: session.profile,
      user_vote: 0,
      is_bookmarked: false,
    }

    const createdViaAPI = await fetchFromAPI<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify({
        author_id: session.profile.id,
        title: input.title.trim(),
        body: input.body.trim(),
        image_url: input.imageUrl || null,
        post_type: input.postType,
        category: input.category,
      }),
    })
    if (createdViaAPI) {
      return createdViaAPI
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          id: newPostId,
          author_id: session.profile.id,
          title: newPost.title,
          body: newPost.body,
          post_type: newPost.post_type,
          category: newPost.category,
        })
        .select('*, author:profiles(*)')
        .single()
      if (error) throw new Error(error.message)
      return data as Post
    }

    const posts = mockStore.getPosts()
    mockStore.setPosts([newPost, ...posts])
    return newPost
  },

  async updatePost(postId: string, updates: { title?: string; body?: string }): Promise<Post> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Unauthorized')

    const currentPost = await this.getPostById(postId)
    if (!currentPost) throw new Error('Post not found.')

    if (currentPost.author_id !== session.user.id && !session.isAdmin) {
      throw new Error('You do not have permission to edit this post.')
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...(updates.title && { title: updates.title.trim() }),
          ...(updates.body && { body: updates.body.trim() }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select('*, author:profiles(*)')
        .single()
      if (error) throw new Error(error.message)
      return data as Post
    }

    const posts = mockStore.getPosts()
    const updated = posts.map((p) =>
      p.id === postId
        ? {
            ...p,
            ...(updates.title && { title: updates.title.trim() }),
            ...(updates.body && { body: updates.body.trim() }),
            updated_at: new Date().toISOString(),
          }
        : p
    )
    mockStore.setPosts(updated)
    return (await this.getPostById(postId))!
  },

  async deletePost(postId: string): Promise<void> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Unauthorized')

    const currentPost = await this.getPostById(postId)
    if (!currentPost) throw new Error('Post not found.')

    // Rule: Admin can delete anyone's post, but users can only delete their own post
    const isAuthor =
      currentPost.author_id === session.user.id ||
      currentPost.author_id === session.profile.id

    if (!isAuthor && !session.isAdmin) {
      throw new Error('You are only permitted to delete your own posts.')
    }

    // 1. Delete on Realtime API Server
    // fetchFromAPI now throws on 4xx/5xx, returns null only when server is offline
    try {
      const apiRes = await fetchFromAPI<{ success: boolean; message?: string }>(
        `/posts/${postId}?userId=${encodeURIComponent(session.user.id)}&isAdmin=${session.isAdmin}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ userId: session.user.id, isAdmin: session.isAdmin }),
        }
      )
      if (apiRes && apiRes.success) {
        // Clean up local mock store too (best effort)
        const posts = mockStore.getPosts().filter((p) => p.id !== postId)
        mockStore.setPosts(posts)
        return
      }
    } catch (err) {
      // API is reachable but returned an error (permission denied, etc.) — surface it
      throw err
    }

    // 2. Supabase fallback (only reached when API server is offline)
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) throw new Error(error.message)
      return
    }

    // 3. Local Mock Store fallback
    const posts = mockStore.getPosts().filter((p) => p.id !== postId)
    mockStore.setPosts(posts)
  },

  async vote(postId: string, value: 1 | -1 | 0): Promise<{ upvotes: number; downvotes: number; userVote: number }> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Must be logged in to vote.')
    if (session.profile.account_status !== 'approved' && !session.isAdmin) {
      throw new Error('Your account is not approved to vote.')
    }

    const userId = session.user.id

    if (value === 1 || value === -1) {
      const apiResult = await fetchFromAPI<{ post: Post; userVote: number }>(`/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ userId, value }),
      })
      if (apiResult) {
        return {
          upvotes: apiResult.post.upvotes_count,
          downvotes: apiResult.post.downvotes_count,
          userVote: apiResult.userVote,
        }
      }
    }

    if (isSupabaseConfigured() && supabase) {
      if (value === 0) {
        await supabase.from('post_votes').delete().eq('post_id', postId).eq('user_id', userId)
      } else {
        await supabase.from('post_votes').upsert({
          post_id: postId,
          user_id: userId,
          value,
          updated_at: new Date().toISOString(),
        })
      }
      const post = await this.getPostById(postId)
      return {
        upvotes: post?.upvotes_count || 0,
        downvotes: post?.downvotes_count || 0,
        userVote: value,
      }
    }

    let votes = mockStore.getVotes()
    const existingIndex = votes.findIndex((v) => v.post_id === postId && v.user_id === userId)

    if (value === 0) {
      if (existingIndex >= 0) {
        votes.splice(existingIndex, 1)
      }
    } else {
      if (existingIndex >= 0) {
        votes[existingIndex].value = value
        votes[existingIndex].updated_at = new Date().toISOString()
      } else {
        votes.push({
          id: crypto.randomUUID(),
          post_id: postId,
          user_id: userId,
          value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
    mockStore.setVotes(votes)

    // Recalculate post counts
    const upvotes = votes.filter((v) => v.post_id === postId && v.value === 1).length
    const downvotes = votes.filter((v) => v.post_id === postId && v.value === -1).length

    const posts = mockStore.getPosts().map((p) =>
      p.id === postId ? { ...p, upvotes_count: upvotes, downvotes_count: downvotes } : p
    )
    mockStore.setPosts(posts)

    return { upvotes, downvotes, userVote: value }
  },

  async toggleBookmark(postId: string): Promise<boolean> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Must be logged in to bookmark.')

    const userId = session.user.id

    const bmResult = await fetchFromAPI<{ postId: string; isBookmarked: boolean }>(`/posts/${postId}/bookmark`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
    if (bmResult) {
      return bmResult.isBookmarked
    }

    if (isSupabaseConfigured() && supabase) {
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        await supabase.from('bookmarks').delete().eq('id', existing.id)
        return false
      } else {
        await supabase.from('bookmarks').insert({ post_id: postId, user_id: userId })
        return true
      }
    }

    let bookmarks = mockStore.getBookmarks()
    const existingIndex = bookmarks.findIndex((b) => b.post_id === postId && b.user_id === userId)

    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1)
      mockStore.setBookmarks(bookmarks)
      return false
    } else {
      bookmarks.push({
        id: crypto.randomUUID(),
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      mockStore.setBookmarks(bookmarks)
      return true
    }
  },

  async getBookmarkedPosts(): Promise<Post[]> {
    const session = await authService.getCurrentSession()
    if (!session.user) return []

    const allPosts = await this.getPosts()
    return allPosts.filter((p) => p.is_bookmarked)
  },
}
