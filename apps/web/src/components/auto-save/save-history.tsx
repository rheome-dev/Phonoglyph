"use client"

import { useState } from 'react'
import { Clock, RotateCcw, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, debugLog } from '@/lib/utils'
import type { EditState } from '@/hooks/use-auto-save'

export interface SaveHistoryProps {
  saveHistory: EditState[]
  onRestore: (stateId: string) => Promise<void>
  onDelete: (stateId: string) => Promise<void>
  onClearHistory: () => Promise<void>
  isLoading?: boolean
  className?: string
}

export function SaveHistory({
  saveHistory,
  onRestore,
  onDelete,
  onClearHistory,
  isLoading = false,
  className
}: SaveHistoryProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleRestore = async (stateId: string) => {
    try {
      setRestoringId(stateId)
      await onRestore(stateId)
    } catch (error) {
      debugLog.error('Failed to restore state:', error)
    } finally {
      setRestoringId(null)
    }
  }

  const handleDelete = async (stateId: string) => {
    try {
      setDeletingId(stateId)
      await onDelete(stateId)
    } catch (error) {
      debugLog.error('Failed to delete state:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const getStateSize = (data: any) => {
    const size = JSON.stringify(data).length
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  if (saveHistory.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Save History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No saved states yet</p>
            <p className="text-sm">Your changes will be automatically saved as you work</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Save History
            <Badge variant="secondary">{saveHistory.length}</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearHistory}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {saveHistory.map((state) => (
            <div
              key={state.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                state.isCurrent 
                  ? "bg-blue-50 border-blue-200" 
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {formatTimestamp(state.timestamp)}
                    </p>
                    {state.isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      v{state.version}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Size: {getStateSize(state.data)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {!state.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(state.id)}
                    disabled={isLoading || restoringId === state.id}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className={cn(
                      "h-4 w-4",
                      restoringId === state.id && "animate-spin"
                    )} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(state.id)}
                  disabled={isLoading || deletingId === state.id}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className={cn(
                    "h-4 w-4",
                    deletingId === state.id && "animate-spin"
                  )} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 