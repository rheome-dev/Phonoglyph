"use client"

import { User, Clock, Database, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

interface GuestBannerProps {
  showLimitations?: boolean
  compact?: boolean
}

export function GuestBanner({ showLimitations = true, compact = false }: GuestBannerProps) {
  const { isGuest, user } = useAuth()
  const router = useRouter()

  // Only show for guest users
  if (!isGuest || !user) {
    return null
  }

  const handleUpgrade = () => {
    router.push('/auth/signup?source=guest_banner')
  }

  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Guest Mode</span>
            <Badge variant="secondary" className="text-xs">
              Limited Access
            </Badge>
          </div>
          <Button size="sm" onClick={handleUpgrade} className="bg-amber-600 hover:bg-amber-700">
            Upgrade
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              <User className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-900">Guest Mode Active</h3>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                Temporary Session
              </Badge>
            </div>
            
            <p className="text-amber-800 mb-4">
              You're using midiViz as a guest. Your data is stored locally and will be lost when you clear your browser data.
            </p>

            {showLimitations && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-sm text-amber-700">
                  <Database className="h-4 w-4" />
                  <span>Max 3 projects</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-amber-700">
                  <Clock className="h-4 w-4" />
                  <span>7 days storage</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-amber-700">
                  <Zap className="h-4 w-4" />
                  <span>Basic features only</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button onClick={handleUpgrade} className="bg-amber-600 hover:bg-amber-700">
                Create Free Account
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/auth/login')}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-amber-200">
          <p className="text-xs text-amber-600">
            💡 <strong>Why create an account?</strong> Save your work permanently, access it from any device, 
            and unlock advanced features like premium visualizations and unlimited projects.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple guest status indicator
export function GuestStatusIndicator() {
  const { isGuest } = useAuth()

  if (!isGuest) {
    return null
  }

  return (
    <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
      <User className="h-3 w-3" />
      <span>Guest</span>
    </div>
  )
} 