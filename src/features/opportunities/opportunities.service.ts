// ====================================================================
// AlumniLoop — Career Opportunities Board Service
// File: src/features/opportunities/opportunities.service.ts
// ====================================================================

import { Opportunity, OpportunityType, OpportunityStatus } from '@/types/database.types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mockStore } from '@/lib/mockStore'
import { authService } from '@/features/auth/auth.service'
import { fetchFromAPI } from '@/lib/api'

export interface GetOpportunitiesParams {
  type?: OpportunityType | 'all'
  status?: OpportunityStatus | 'all'
  search?: string
}

export interface CreateOpportunityInput {
  companyName: string
  title: string
  description: string
  location: string
  opportunityType: OpportunityType
  eligibility: string
  applicationUrl: string
  deadline?: string | null
}

export const opportunitiesService = {
  // Validate HTTP/HTTPS URL
  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  },

  async getOpportunities(params: GetOpportunitiesParams = {}): Promise<Opportunity[]> {
    const apiOpps = await fetchFromAPI<Opportunity[]>('/opportunities')
    if (apiOpps) {
      let filtered = [...apiOpps]
      if (params.type && params.type !== 'all') {
        filtered = filtered.filter((o) => o.opportunity_type === params.type)
      }
      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((o) => o.status === params.status)
      }
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase()
        filtered = filtered.filter(
          (o) =>
            o.title.toLowerCase().includes(q) ||
            o.company_name.toLowerCase().includes(q) ||
            o.location.toLowerCase().includes(q)
        )
      }
      return filtered
    }

    if (isSupabaseConfigured() && supabase) {
      let query = supabase
        .from('opportunities')
        .select(`
          *,
          author:profiles(*)
        `)
        .order('created_at', { ascending: false })

      if (params.type && params.type !== 'all') {
        query = query.eq('opportunity_type', params.type)
      }
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data as Opportunity[]
    }

    let items = mockStore.getOpportunities()
    const profiles = mockStore.getProfiles()

    if (params.type && params.type !== 'all') {
      items = items.filter((o) => o.opportunity_type === params.type)
    }

    if (params.status && params.status !== 'all') {
      items = items.filter((o) => o.status === params.status)
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase()
      items = items.filter(
        (o) =>
          o.company_name.toLowerCase().includes(q) ||
          o.title.toLowerCase().includes(q) ||
          o.location.toLowerCase().includes(q) ||
          o.eligibility.toLowerCase().includes(q)
      )
    }

    return items.map((item) => ({
      ...item,
      author: profiles.find((p) => p.id === item.author_id),
    }))
  },

  async getOpportunityById(id: string): Promise<Opportunity | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('id', id)
        .single()
      if (error) return null
      return data as Opportunity
    }

    const items = mockStore.getOpportunities()
    const item = items.find((o) => o.id === id)
    if (!item) return null

    const profiles = mockStore.getProfiles()
    return {
      ...item,
      author: profiles.find((p) => p.id === item.author_id),
    }
  },

  async createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) {
      throw new Error('Authentication required.')
    }

    // Role check: Only verified seniors or administrators can publish opportunities
    if (!session.profile.senior_verified && !session.isAdmin) {
      throw new Error(
        'Only verified seniors, alumni, or placement administrators can share opportunities.'
      )
    }

    if (!this.validateUrl(input.applicationUrl)) {
      throw new Error('Please provide a valid application URL beginning with http:// or https://')
    }

    const newId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newOpp: Opportunity = {
      id: newId,
      author_id: session.profile.id,
      company_name: input.companyName.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      opportunity_type: input.opportunityType,
      eligibility: input.eligibility.trim(),
      application_url: input.applicationUrl.trim(),
      deadline: input.deadline || null,
      status: 'open',
      created_at: now,
      updated_at: now,
      author: session.profile,
    }

    const createdViaAPI = await fetchFromAPI<Opportunity>('/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        author_id: session.profile.id,
        company_name: input.companyName.trim(),
        title: input.title.trim(),
        description: input.description.trim(),
        location: input.location.trim(),
        opportunity_type: input.opportunityType,
        eligibility: input.eligibility.trim(),
        application_url: input.applicationUrl.trim(),
        deadline: input.deadline,
      }),
    })
    if (createdViaAPI) return createdViaAPI

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          id: newId,
          author_id: session.profile.id,
          company_name: newOpp.company_name,
          title: newOpp.title,
          description: newOpp.description,
          location: newOpp.location,
          opportunity_type: newOpp.opportunity_type,
          eligibility: newOpp.eligibility,
          application_url: newOpp.application_url,
          deadline: newOpp.deadline,
          status: newOpp.status,
        })
        .select('*, author:profiles(*)')
        .single()
      if (error) throw new Error(error.message)
      return data as Opportunity
    }

    const all = mockStore.getOpportunities()
    mockStore.setOpportunities([newOpp, ...all])
    return newOpp
  },

  async updateOpportunityStatus(id: string, status: OpportunityStatus): Promise<Opportunity> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Unauthorized')

    const opp = await this.getOpportunityById(id)
    if (!opp) throw new Error('Opportunity not found.')

    if (opp.author_id !== session.user.id && !session.isAdmin) {
      throw new Error('You do not have permission to update this opportunity.')
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('opportunities')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, author:profiles(*)')
        .single()
      if (error) throw new Error(error.message)
      return data as Opportunity
    }

    const all = mockStore.getOpportunities().map((o) =>
      o.id === id ? { ...o, status, updated_at: new Date().toISOString() } : o
    )
    mockStore.setOpportunities(all)
    return (await this.getOpportunityById(id))!
  },

  async deleteOpportunity(id: string): Promise<void> {
    const session = await authService.getCurrentSession()
    if (!session.user || !session.profile) throw new Error('Unauthorized')

    const opp = await this.getOpportunityById(id)
    if (!opp) return

    if (opp.author_id !== session.user.id && !session.isAdmin) {
      throw new Error('You do not have permission to delete this listing.')
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('opportunities').delete().eq('id', id)
      if (error) throw new Error(error.message)
      return
    }

    mockStore.setOpportunities(mockStore.getOpportunities().filter((o) => o.id !== id))
  },
}
