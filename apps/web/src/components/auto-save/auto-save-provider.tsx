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
import { cn, debugLog } from '@/lib/utils'
import { useTimelineStore } from '@/stores/timelineStore'
import { useProjectSettingsStore } from '@/stores/projectSettingsStore'

import type { EditState } from '@/hooks/use-auto-save'

interface AutoSaveContextType {
  saveCurrentState: () => Promise<void>
  restoreState: (stateId: string) => Promise<EditState>
  getCurrentState: () => Promise<EditState | null>
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

// Simple debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T & { cancel: () => void }
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }
  
  return debounced
}

export function AutoSaveProvider({ projectId, children, className }: AutoSaveProviderProps) {
  const [showSettings, setShowSettings] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isHydrating, setIsHydrating] = React.useState(false)
  
  const autoSave = useAutoSave(projectId)

  // Function to capture current visualization state from Zustand stores
  const captureCurrentState = useCallback(() => {
    // Access state non-reactively via getState() to avoid unnecessary re-renders during capture
    const timelineState = useTimelineStore.getState()
    const projectSettings = useProjectSettingsStore.getState()

    return {
      // We structure this to match the EditState interface in schema
      timelineState: {
        layers: timelineState.layers,
        duration: timelineState.duration,
        zoom: timelineState.zoom,
        // We generally don't save currentTime or isPlaying as those are transient
      },
      projectSettings: {
        backgroundColor: projectSettings.backgroundColor,
        isBackgroundVisible: projectSettings.isBackgroundVisible,
      },
      // Placeholder for future effect-specific settings if not in layers
      effectSettings: {},
      stemMappings: {}, // If mappings are stored in a store, grab them here
      visualizationParams: {},
      schemaVersion: 1
    }
  }, [])

  // Save current state
  const saveCurrentState = useCallback(async () => {
    if (isHydrating) {
      // Don't save while hydrating to avoid race conditions
      return
    }
    
    try {
      setError(null)
      const stateData = captureCurrentState()
      await autoSave.saveState(stateData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save state')
      debugLog.error('Auto-save error:', err)
    }
  }, [autoSave, captureCurrentState, isHydrating])

  // Restore state
  const handleRestoreState = useCallback(async (stateId: string): Promise<EditState> => {
    try {
      setError(null)
      setIsHydrating(true)
      const restoredState = await autoSave.restoreState(stateId)
      
      // Apply the restored state to the stores
      if (restoredState && restoredState.data) {
        const { timelineState, projectSettings } = restoredState.data

        // Hydrate Timeline Store
        if (timelineState) {
          if (timelineState.layers) {
            useTimelineStore.getState().setLayers(timelineState.layers)
          }
          if (timelineState.duration !== undefined) {
            useTimelineStore.getState().setDuration(timelineState.duration)
          }
          if (timelineState.zoom !== undefined) {
            useTimelineStore.getState().setZoom(timelineState.zoom)
          }
        }

        // Hydrate Settings Store
        if (projectSettings) {
          if (projectSettings.backgroundColor) {
            useProjectSettingsStore.getState().setBackgroundColor(projectSettings.backgroundColor)
          }
          if (projectSettings.isBackgroundVisible !== undefined) {
            useProjectSettingsStore.getState().setIsBackgroundVisible(projectSettings.isBackgroundVisible)
          }
        }

        debugLog.log('✅ Restored project state from version', restoredState.version)
      }
      
      return restoredState
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore state')
      debugLog.error('Restore error:', err)
      throw err
    } finally {
      setIsHydrating(false)
    }
  }, [autoSave])

  // Delete state
  const handleDeleteState = useCallback(async (stateId: string) => {
    try {
      setError(null)
      // Note: The delete functionality is not implemented in the hook yet
      // This is a placeholder for future implementation
      debugLog.log('Delete state:', stateId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete state')
      debugLog.error('Delete error:', err)
    }
  }, [])

  // Clear history
  const handleClearHistory = useCallback(async () => {
    try {
      setError(null)
      await autoSave.clearHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history')
      debugLog.error('Clear history error:', err)
    }
  }, [autoSave])

  // Create debounced save function
  const debouncedSave = useRef(
    debounce(() => {
      saveCurrentState()
    }, autoSave.config.debounceTime)
  ).current

  // Reactive auto-save: Subscribe to store changes
  useEffect(() => {
    if (!autoSave.config.enabled || isHydrating) {
      return
    }

    // Track previous state for comparison
    let prevTimelineState = useTimelineStore.getState()
    let prevSettingsState = useProjectSettingsStore.getState()

    // Subscribe to timeline changes
    const unsubTimeline = useTimelineStore.subscribe((state) => {
      // Only trigger save on meaningful changes (not transient playback state)
      if (
        state.layers !== prevTimelineState.layers || 
        state.duration !== prevTimelineState.duration ||
        state.zoom !== prevTimelineState.zoom
      ) {
        prevTimelineState = state
        debouncedSave()
      } else {
        prevTimelineState = state
      }
    })

    // Subscribe to settings changes
    const unsubSettings = useProjectSettingsStore.subscribe((state) => {
      if (
        state.backgroundColor !== prevSettingsState.backgroundColor ||
        state.isBackgroundVisible !== prevSettingsState.isBackgroundVisible
      ) {
        prevSettingsState = state
        debouncedSave()
      } else {
        prevSettingsState = state
      }
    })

    return () => {
      unsubTimeline()
      unsubSettings()
      debouncedSave.cancel()
    }
  }, [autoSave.config.enabled, debouncedSave, isHydrating])

  // Load saved state on mount (hydration)
  useEffect(() => {
    const loadSavedState = async () => {
      if (!projectId) {
        return
      }

      try {
        setIsHydrating(true)
        const savedState = await autoSave.getCurrentState()
        
        if (savedState && savedState.data) {
          const { timelineState, projectSettings } = savedState.data

          // Hydrate Timeline Store
          if (timelineState) {
            if (timelineState.layers) {
              useTimelineStore.getState().setLayers(timelineState.layers)
            }
            if (timelineState.duration !== undefined) {
              useTimelineStore.getState().setDuration(timelineState.duration)
            }
            if (timelineState.zoom !== undefined) {
              useTimelineStore.getState().setZoom(timelineState.zoom)
            }
          }

          // Hydrate Settings Store
          if (projectSettings) {
            if (projectSettings.backgroundColor) {
              useProjectSettingsStore.getState().setBackgroundColor(projectSettings.backgroundColor)
            }
            if (projectSettings.isBackgroundVisible !== undefined) {
              useProjectSettingsStore.getState().setIsBackgroundVisible(projectSettings.isBackgroundVisible)
            }
          }

          debugLog.log('✅ Hydrated project state from version', savedState.version)
        }
      } catch (err) {
        debugLog.error('Failed to load saved state:', err)
      } finally {
        setIsHydrating(false)
      }
    }

    loadSavedState()
  }, [autoSave, projectId])

  // Wrapper for restoreState that matches the context interface
  const handleRestoreStateWrapper = useCallback(async (stateId: string): Promise<EditState> => {
    return await handleRestoreState(stateId)
  }, [handleRestoreState])

  const contextValue: AutoSaveContextType = {
    saveCurrentState,
    restoreState: handleRestoreStateWrapper,
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
              onRestore={async (stateId: string) => {
                await handleRestoreState(stateId)
              }}
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