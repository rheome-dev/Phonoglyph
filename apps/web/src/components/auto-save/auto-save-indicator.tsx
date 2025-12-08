"use client"

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaved: Date | null
  error?: string | null
  className?: string
  style?: React.CSSProperties
}

export function AutoSaveIndicator({ 
  isSaving, 
  lastSaved, 
  error, 
  className,
  style
}: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false)

  // Show "Saved" message briefly when save completes
  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSaved, isSaving])

  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (isSaving) {
      return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
    }
    if (showSaved) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <Save className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = () => {
    if (error) {
      return 'Save failed'
    }
    if (isSaving) {
      return 'Saving...'
    }
    if (showSaved) {
      return 'Saved'
    }
    if (lastSaved) {
      return `Last saved ${formatTimeAgo(lastSaved)}`
    }
    return 'Not saved'
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-gray-600",
      className
    )} style={style}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      {error && (
        <span className="text-xs text-red-500 ml-2">
          {error}
        </span>
      )}
    </div>
  )
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
} 