"use client"

import { useState } from 'react'
import { X, Star, Shield, Cloud, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

interface ConversionPromptProps {
  trigger?: 'project_save' | 'time_based' | 'feature_limit' | 'manual'
  title?: string
  description?: string
  benefits?: string[]
  onDismiss?: () => void
  compact?: boolean
}

export function ConversionPrompt({
  trigger = 'manual',
  title,
  description,
  benefits,
  onDismiss,
  compact = false
}: ConversionPromptProps) {
  const [isVisible, setIsVisible] = useState(true)
  const { isGuest } = useAuth()
  const router = useRouter()

  // Don't show if user is authenticated
  if (!isGuest || !isVisible) {
    return null
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const handleSignUp = () => {
    router.push('/auth/signup?source=conversion_prompt')
  }

  const handleSignIn = () => {
    router.push('/auth/login?source=conversion_prompt')
  }

  // Default content based on trigger
  const getDefaultContent = () => {
    switch (trigger) {
      case 'project_save':
        return {
          title: 'Save Your Work Forever! 💾',
          description: 'Your project is only saved locally. Create an account to save it to the cloud and access it from anywhere.',
          benefits: ['Unlimited projects', 'Cloud storage', 'Never lose your work']
        }
      case 'time_based':
        return {
          title: 'Unlock Full Features! ⭐',
          description: "You've been exploring for a while! Sign up to unlock unlimited access and premium features.",
          benefits: ['No limitations', 'Advanced tools', 'Priority support']
        }
      case 'feature_limit':
        return {
          title: 'Upgrade to Continue 🚀',
          description: "You've reached the guest limit for this feature. Sign up to continue with unlimited access.",
          benefits: ['Remove all limits', 'Premium features', 'Enhanced experience']
        }
      default:
        return {
          title: 'Join the Community! 🎵',
          description: 'Create an account to unlock all features and save your work permanently.',
          benefits: ['Unlimited projects', 'Cloud sync', 'Premium features']
        }
    }
  }

  const defaultContent = getDefaultContent()
  const finalTitle = title || defaultContent.title
  const finalDescription = description || defaultContent.description
  const finalBenefits = benefits || defaultContent.benefits

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{finalTitle}</h3>
            <p className="text-xs opacity-90 mt-1">{finalDescription}</p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleSignUp}
              className="bg-white text-indigo-600 hover:bg-gray-100"
            >
              Sign Up
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDismiss}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-indigo-900 flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            {finalTitle}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-gray-700">{finalDescription}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {finalBenefits.map((benefit, index) => {
            const icons = [Shield, Cloud, Zap]
            const Icon = icons[index % icons.length]
            
            return (
              <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                <Icon className="h-4 w-4 text-indigo-500" />
                <span>{benefit}</span>
              </div>
            )
          })}
        </div>
        
        <div className="flex space-x-3 pt-4">
          <Button onClick={handleSignUp} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            Create Account
          </Button>
          <Button variant="outline" onClick={handleSignIn} className="flex-1">
            Sign In
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Takes less than 30 seconds • No credit card required
        </p>
      </CardContent>
    </Card>
  )
}

// Hook for managing conversion prompt state
export function useConversionPrompt() {
  const [dismissed, setDismissed] = useState<string[]>([])
  const { isGuest, shouldShowConversionPrompt } = useAuth()

  const shouldShow = (trigger: string) => {
    return isGuest && shouldShowConversionPrompt && !dismissed.includes(trigger)
  }

  const dismiss = (trigger: string) => {
    setDismissed(prev => [...prev, trigger])
  }

  return {
    shouldShow,
    dismiss,
    isGuest,
    shouldShowConversionPrompt
  }
} 