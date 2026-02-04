"use client"

import React, { useState } from 'react'
import { useAutoSaveContext } from './auto-save-provider'
import { AutoSaveIndicator } from './auto-save-indicator'
import { Button } from '@/components/ui/button'
import { History, Save, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { useTimelineStore } from '@/stores/timelineStore'
import { useVisualizerStore } from '@/stores/visualizerStore'

export function AutoSaveTopBar() {
  const autoSave = useAutoSaveContext()
  const [showDebug, setShowDebug] = useState(false)

  if (!autoSave.setShowHistory) {
    return null
  }

  // Get current store state for debugging
  const timelineState = useTimelineStore.getState()
  const visualizerState = useVisualizerStore.getState()

  return (
    <div className="flex items-center gap-2 relative">
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
        onClick={autoSave.saveCurrentState}
        disabled={autoSave.isSaving}
        className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1"
        style={{ borderRadius: '6px' }}
      >
        <Save className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDebug(!showDebug)}
        className="text-stone-400 hover:text-stone-200 hover:bg-stone-800"
      >
        <Bug className="h-3 w-3" />
        {showDebug ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
      </Button>

      {/* Debug Panel */}
      {showDebug && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-stone-900 border border-stone-700 rounded-lg p-3 text-xs font-mono text-stone-300 z-50 shadow-xl">
          <div className="font-bold text-stone-200 mb-2">Autosave Debug Info</div>
          <div className="space-y-1">
            <div>Auth: <span className={autoSave.isAuthenticated ? 'text-green-400' : 'text-red-400'}>{autoSave.isAuthenticated ? '✓' : '✗'}</span></div>
            <div>Enabled: <span className={autoSave.config.enabled ? 'text-green-400' : 'text-red-400'}>{autoSave.config.enabled ? '✓' : '✗'}</span></div>
            <div>Is Saving: <span className={autoSave.isSaving ? 'text-yellow-400' : 'text-stone-400'}>{autoSave.isSaving ? 'Yes' : 'No'}</span></div>
            <div>Last Saved: {autoSave.lastSaved ? new Date(autoSave.lastSaved).toLocaleTimeString() : 'Never'}</div>
            <div className="border-t border-stone-700 my-2 pt-2">
              <div className="font-bold text-stone-400 mb-1">Store State:</div>
              <div>Timeline Layers: <span className="text-yellow-400">{timelineState.layers?.length || 0}</span></div>
              <div>Unique Effect Types: <span className="text-yellow-400">{new Set(timelineState.layers?.map(l => l.effectType) || []).size}</span></div>
              <div>Base Params: <span className="text-yellow-400">{Object.keys(visualizerState.baseParameterValues || {}).length}</span></div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-700 text-stone-500">
            Check console for detailed logs
          </div>
        </div>
      )}
    </div>
  )
}

