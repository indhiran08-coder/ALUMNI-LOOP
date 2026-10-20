// ====================================================================
// AlumniLoop — Global Context Providers (Auth & React Query)
// File: src/app/providers.tsx
// ====================================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Profile } from '@/types/database.types'
import { authService, RegisterInput } from '@/features/auth/auth.service'
import { socket } from '@/lib/socket'

export interface AuthContextType {
  user: { id: string; email: string } | null
  profile: Profile | null
  isAdmin: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<boolean>
  logout: () => Promise<void>
  switchUser: (userId: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProfile = async () => {
    try {
      const session = await authService.getCurrentSession()
      setUser(session.user)
      setProfile(session.profile)
      setIsAdmin(session.isAdmin)
    } catch (err) {
      console.error('Session load failed', err)
      setUser(null)
      setProfile(null)
      setIsAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshProfile()
  }, [])

  // Real-time: when admin approves/rejects/suspends a user, auto-refresh session
  useEffect(() => {
    const handleProfileUpdate = (updatedProfile: Profile) => {
      if (user && updatedProfile.id === user.id) {
        console.log('[AlumniLoop] Profile updated via realtime:', updatedProfile.account_status)
        setProfile(updatedProfile)
        // Also invalidate any queries that depend on profile data
        queryClient.invalidateQueries()
      }
    }
    socket.on('profile:updated', handleProfileUpdate)
    return () => { socket.off('profile:updated', handleProfileUpdate) }
  }, [user])

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password)
    setProfile(res.profile)
    setIsAdmin(res.isAdmin)
    await refreshProfile()
  }

  const register = async (input: RegisterInput) => {
    const res = await authService.register(input)
    if (!res.requiresApproval) {
      // Admin accounts are immediately approved — set session
      setProfile(res.profile)
      await refreshProfile()
    }
    // Pending users are NOT logged in yet — they must wait for admin approval
    return res.requiresApproval
  }


  const logout = async () => {
    await authService.logout()
    setUser(null)
    setProfile(null)
    setIsAdmin(false)
    queryClient.clear()
  }

  const switchUser = async (userId: string) => {
    setIsLoading(true)
    await authService.switchDemoUser(userId)
    await refreshProfile()
    queryClient.invalidateQueries()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        switchUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
