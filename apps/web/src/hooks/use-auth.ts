"use client"

import { useState, useEffect } from 'react'
import { AuthService } from '@/lib/auth'
import { guestUserService, type GuestUser } from '@/lib/guest-user'
import { trpc } from '@/lib/trpc'
import type { User } from '@/types/auth'

export type AuthUser = User | GuestUser

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user session on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true)
        
        // First try to get authenticated user
        const currentUser = await AuthService.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          setError(null)
          return
        }

        // If no authenticated user, check for guest user
        let guestUser = guestUserService.getCurrentGuestUser()
        if (!guestUser) {
          // Create new guest session if none exists
          guestUser = guestUserService.createGuestSession()
        }
        
        setUser(guestUser)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user')
        
        // Fall back to guest user on error
        try {
          const guestUser = guestUserService.createGuestSession()
          setUser(guestUser)
        } catch (guestErr) {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // Listen for auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // When user signs out, create a new guest session
        const guestUser = guestUserService.createGuestSession()
        setUser(guestUser)
      } else if (event === 'SIGNED_IN' && session?.user) {
        // When user signs in, check if they had guest data to transfer
        const currentGuestUser = user && 'isGuest' in user ? user as GuestUser : null
        
        const newUser: User = {
          id: session.user.id,
          email: session.user.email!,
          user_metadata: session.user.user_metadata || {},
          created_at: session.user.created_at || '',
          updated_at: session.user.updated_at || ''
        }

        setUser(newUser)

        // Transfer guest data if exists
        if (currentGuestUser) {
          try {
            const transferredData = guestUserService.transferGuestDataToUser(
              currentGuestUser.id,
              newUser.id
            )
            console.log('Transferred guest data:', transferredData)
            // TODO: Call API to save transferred data to user account
          } catch (error) {
            console.error('Failed to transfer guest data:', error)
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Refresh user session
  const refreshUser = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        setError(null)
        return currentUser
      }

      // If no authenticated user, maintain guest session
      const guestUser = guestUserService.getCurrentGuestUser() || guestUserService.createGuestSession()
      setUser(guestUser)
      setError(null)
      return guestUser
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh user')
      const guestUser = guestUserService.createGuestSession()
      setUser(guestUser)
      return guestUser
    } finally {
      setLoading(false)
    }
  }

  // Enhanced sign out that creates guest session
  const signOut = async () => {
    try {
      await AuthService.signOut()
      const guestUser = guestUserService.createGuestSession()
      setUser(guestUser)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  // Helper properties
  const isAuthenticated = user && !('isGuest' in user)
  const isGuest = user && 'isGuest' in user
  const shouldShowConversionPrompt = isGuest && user ? guestUserService.shouldShowConversionPrompt(user as GuestUser) : false

  return {
    user,
    loading,
    error,
    isAuthenticated: !!isAuthenticated,
    isGuest: !!isGuest,
    shouldShowConversionPrompt,
    refreshUser,
    signOut,
    // Re-export auth service methods for convenience
    getCurrentUser: AuthService.getCurrentUser,
  }
} 