"use client"

import React from 'react'
import { useAutoSaveContext } from './auto-save-provider'
import { AutoSaveIndicator } from './auto-save-indicator'
import { Button } from '@/components/ui/button'
import { History, Save } from 'lucide-react'

export function AutoSaveTopBar() {
  const autoSave = useAutoSaveContext()

  if (!autoSave.setShowHistory) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <div className="mr-[-8px]">
        <AutoSaveIndicator
          isSaving={autoSave.isSaving}
          lastSaved={autoSave.lastSaved}
          error={autoSave.error || undefined}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => autoSave.setShowHistory?.(!autoSave.showHistory)}
        className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1"
        style={{ borderRadius: '6px' }}
      >
        <History className="h-3 w-3" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={autoSave.saveCurrentState}
        disabled={autoSave.isSaving}
        className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1"
        style={{ borderRadius: '6px' }}
      >
        <Save className="h-3 w-3" />
      </Button>
    </div>
  )
}

