"use client"

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveIndicator } from './auto-save-indicator'
import { SaveHistory } from './save-history'
import { AutoSaveSettings } from './auto-save-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, History, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutoSaveContextType {
  saveCurrentState: () => Promise<void>
  restoreState: (stateId: string) => Promise<void>
  getCurrentState: () => Promise<any>
  isSaving: boolean
  lastSaved: Date | null
  config: any
  updateConfig: (config: any) => void
}

const AutoSaveContext = createContext<AutoSaveContextType | null>(null)

export function useAutoSaveContext() {
  const context = useContext(AutoSaveContext)
  if (!context) {
    throw new Error('useAutoSaveContext must be used within AutoSaveProvider')
  }
  return context
}

interface AutoSaveProviderProps {
  projectId: string
  children: React.ReactNode
  className?: string
}

export function AutoSaveProvider({ projectId, children, className }: AutoSaveProviderProps) {
  const [showSettings, setShowSettings] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const autoSave = useAutoSave(projectId)
  const stateRef = useRef<any>(null)

  // Function to capture current visualization state
  const captureCurrentState = useCallback(() => {
    // This function should be implemented to capture the current state
    // from the visualization components. For now, we'll use a placeholder
    const currentState = {
      visualizationParams: {
        // Capture visualization parameters
        effects: [], // Will be populated by child components
        settings: {}, // Will be populated by child components
      },
      stemMappings: {
        // Capture stem mappings
        mappings: [], // Will be populated by child components
      },
      effectSettings: {
        // Capture effect settings
        effects: {}, // Will be populated by child components
      },
      timelineState: {
        // Capture timeline state
        currentTime: 0,
        duration: 0,
        isPlaying: false,
      }
    }

    return currentState
  }, [])

  // Save current state
  const saveCurrentState = useCallback(async () => {
    try {
      setError(null)
      const stateData = captureCurrentState()
      await autoSave.saveState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save state')
      console.error('Auto-save error:', err)
    }
  }, [autoSave, captureCurrentState])

  // Restore state
  const handleRestoreState = useCallback(async (stateId: string) => {
    try {
      setError(null)
      const restoredState = await autoSave.restoreState(stateId)
      
      // Apply the restored state to the visualization
      // This will be implemented to restore the state to child components
      console.log('Restored state:', restoredState)
      
      // Trigger a re-render or state update in child components
      // This is a placeholder - actual implementation will depend on the child components
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore state')
      console.error('Restore error:', err)
    }
  }, [autoSave])

  // Delete state
  const handleDeleteState = useCallback(async (stateId: string) => {
    try {
      setError(null)
      // Note: The delete functionality is not implemented in the hook yet
      // This is a placeholder for future implementation
      console.log('Delete state:', stateId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete state')
      console.error('Delete error:', err)
    }
  }, [])

  // Clear history
  const handleClearHistory = useCallback(async () => {
    try {
      setError(null)
      await autoSave.clearHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history')
      console.error('Clear history error:', err)
    }
  }, [autoSave])

  // Auto-save on state changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (autoSave.config.enabled && stateRef.current) {
        saveCurrentState()
      }
    }, autoSave.config.interval)

    return () => clearInterval(interval)
  }, [autoSave.config.enabled, autoSave.config.interval, saveCurrentState])

  // Load saved state on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedState = await autoSave.getCurrentState()
        if (savedState) {
          // Apply the saved state to the visualization
          // This will be implemented to restore the state to child components
          console.log('Loaded saved state:', savedState)
        }
      } catch (err) {
        console.error('Failed to load saved state:', err)
      }
    }

    loadSavedState()
  }, [autoSave])

  const contextValue: AutoSaveContextType = {
    saveCurrentState,
    restoreState: handleRestoreState,
    getCurrentState: autoSave.getCurrentState,
    isSaving: autoSave.isSaving,
    lastSaved: autoSave.lastSaved,
    config: autoSave.config,
    updateConfig: autoSave.updateConfig,
  }

  return (
    <AutoSaveContext.Provider value={contextValue}>
      <div className={cn("relative", className)}>
        {/* Auto-save controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <AutoSaveIndicator
            isSaving={autoSave.isSaving}
            lastSaved={autoSave.lastSaved}
            error={error}
            className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg"
          />
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="bg-white/90 backdrop-blur-sm"
            >
              <History className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="bg-white/90 backdrop-blur-sm"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentState}
              disabled={autoSave.isSaving}
              className="bg-white/90 backdrop-blur-sm"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-16 right-4 z-50 w-80">
            <AutoSaveSettings
              config={autoSave.config}
              onConfigChange={autoSave.updateConfig}
              onSaveNow={saveCurrentState}
              isSaving={autoSave.isSaving}
            />
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="absolute top-16 right-4 z-50 w-96">
            <SaveHistory
              saveHistory={autoSave.saveHistory}
              onRestore={handleRestoreState}
              onDelete={handleDeleteState}
              onClearHistory={handleClearHistory}
              isLoading={autoSave.isSaving}
            />
          </div>
        )}

        {/* Main content */}
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    </AutoSaveContext.Provider>
  )
}

// Hook for child components to register their state
export function useAutoSaveState() {
  const context = useAutoSaveContext()
  const stateRef = useRef<any>(null)

  const registerState = useCallback((state: any) => {
    stateRef.current = state
  }, [])

  const updateState = useCallback((updates: any) => {
    if (stateRef.current) {
      stateRef.current = { ...stateRef.current, ...updates }
    }
  }, [])

  return {
    registerState,
    updateState,
    saveCurrentState: context.saveCurrentState,
    isSaving: context.isSaving,
    lastSaved: context.lastSaved,
  }
} 