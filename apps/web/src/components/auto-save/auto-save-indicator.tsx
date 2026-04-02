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

  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative flex items-center gap-1.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <span
        className={cn("inline-block w-2 h-2 rounded-full cursor-default", getDotColor(), className)}
        style={style}
      />
      {showTooltip && (
        <span className="absolute top-full left-0 mt-2 px-2 py-1 text-xs font-mono text-stone-200 bg-stone-800 border border-stone-600 rounded whitespace-nowrap pointer-events-none z-50">
          {getTooltip()}
        </span>
      )}
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