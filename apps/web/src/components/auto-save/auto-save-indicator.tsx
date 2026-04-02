"use client"

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSaved, isSaving])

  const getDotColor = () => {
    if (error) return 'bg-red-500'
    if (isSaving) return 'bg-yellow-400 animate-pulse'
    if (showSaved) return 'bg-green-400'
    return 'bg-stone-500'
  }

  const getTooltip = () => {
    if (error) return `Save failed${error ? `: ${error}` : ''}`
    if (isSaving) return 'Saving...'
    if (showSaved) return 'Saved'
    if (lastSaved) return `Saved ${formatTimeAgo(lastSaved)}`
    return 'Not saved'
  }

  return (
    <div
      className={cn("flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-stone-400", className)}
      style={style}
      title={getTooltip()}
    >
      <span
        className={cn("inline-block w-2 h-2 rounded-full", getDotColor())}
      />
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
} 