'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { ProjectDashboard } from '@/components/projects/project-dashboard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recentProjects, setRecentProjects] = useState<any[]>([])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }
    
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-stone-600 font-mono">LOADING DASHBOARD...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-stone-700 mb-4">
            ACCESS DENIED
          </h1>
          <p className="text-stone-600 font-mono mb-6">
            Please sign in to access the dashboard
          </p>
          <a 
            href="/login" 
            className="inline-block bg-stone-600 text-white px-6 py-3 rounded-md font-sans font-bold uppercase tracking-wider text-sm transition-colors hover:bg-stone-700"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navigation 
        user={user} 
        currentPath="/dashboard" 
        recentProjects={recentProjects}
        showBreadcrumbs={true}
      />
      <ProjectDashboard user={user} />
    </>
  )
} 