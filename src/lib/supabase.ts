// ====================================================================
// AlumniLoop — Supabase Client & Local Mock Fallback Adapter
// File: src/lib/supabase.ts
// ====================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project')
  )
}

// Real Supabase client instance when credentials are valid
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export const COLLEGE_EMAIL_DOMAIN = import.meta.env.VITE_COLLEGE_EMAIL_DOMAIN || 'college.edu'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'AlumniLoop'
