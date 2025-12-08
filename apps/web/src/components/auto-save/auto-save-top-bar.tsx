"use client"

import React from 'react'
import { useAutoSaveContext } from './auto-save-provider'
import { AutoSaveIndicator } from './auto-save-indicator'
import { Button } from '@/components/ui/button'
import { History, Settings, Save } from 'lucide-react'

export function AutoSaveTopBar() {
  const autoSave = useAutoSaveContext()
  
  if (!autoSave.setShowHistory || !autoSave.setShowSettings) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <AutoSaveIndicator
        isSaving={autoSave.isSaving}
        lastSaved={autoSave.lastSaved}
        error={autoSave.error || undefined}
        className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300"
        style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
      />
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
        onClick={() => autoSave.setShowSettings?.(!autoSave.showSettings)}
        className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1"
        style={{ borderRadius: '6px' }}
      >
        <Settings className="h-3 w-3" />
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

