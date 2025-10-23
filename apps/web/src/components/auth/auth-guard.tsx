"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { useAuth } from '@/hooks/use-auth'
import { debugLog } from '@/lib/utils';

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
  fallback?: React.ReactNode
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login',
  fallback 
}: AuthGuardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If we don't require auth, just show the content
        if (!requireAuth) {
          setIsChecking(false)
          return
        }

        // If we require auth but user is not logged in
        if (requireAuth && !user && !loading) {
          const currentPath = window.location.pathname
          const redirectUrl = new URL(redirectTo, window.location.origin)
          
          // Preserve the current path for redirect after login
          if (currentPath !== redirectTo) {
            redirectUrl.searchParams.set('redirectTo', currentPath)
          }
          
          router.push(redirectUrl.toString())
          return
        }

        // If we have a user and they're trying to access auth pages, redirect to dashboard
        if (user && (window.location.pathname.startsWith('/auth/login') || 
                     window.location.pathname.startsWith('/auth/signup'))) {
          const redirectTo = searchParams.get('redirectTo') || '/dashboard'
          router.push(redirectTo)
          return
        }

        setIsChecking(false)
      } catch (error) {
        debugLog.error('Auth guard error:', error)
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [user, loading, requireAuth, redirectTo, router, searchParams])

  // Show loading state while checking authentication
  if (loading || isChecking) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div 
          className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"
          data-testid="auth-loading-spinner"
        ></div>
      </div>
    )
  }

  // If auth is required and user is not authenticated, don't render children
  if (requireAuth && !user) {
    return null
  }

  // If auth is not required or user is authenticated, render children
  return <>{children}</>
}

// Higher-order component for protecting pages
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

// Loading component for auth states
export function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Loading...</p>
      </div>
    </div>
  )
} 