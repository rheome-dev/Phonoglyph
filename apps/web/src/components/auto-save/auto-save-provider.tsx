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
import { useVisualizerStore } from '@/stores/visualizerStore'
import { parseParamKey } from '@/lib/visualizer/paramKeys'

import type { EditState } from '@/hooks/use-auto-save'

/**
 * Convert legacy flat param maps (key -> number) to nested (effectId -> { paramName: value })
 *
 * Legacy format (pre-Dec 8, 2025): { "effectId-paramName": value, "effectId::paramName": value }
 * Current format: { "effectId": { "paramName": value } }
 *
 * Detection heuristic: If any value is an object, assume already nested.
 */
function toNestedParams(maybeFlat: any): Record<string, Record<string, any>> {
  if (!maybeFlat || typeof maybeFlat !== 'object') return {}

  // Heuristic: if any value is an object (not array), assume already nested format
  const values = Object.values(maybeFlat)
  const hasObjectValue = values.some(v => v && typeof v === 'object' && !Array.isArray(v))
  if (hasObjectValue) {
    return maybeFlat as Record<string, Record<string, any>>
  }

  // Convert flat format to nested
  debugLog.log('🔄 Converting legacy flat param format to nested format')
  const nested: Record<string, Record<string, any>> = {}

  Object.entries(maybeFlat as Record<string, any>).forEach(([key, value]) => {
    if (value === undefined) return

    // Try parsing with current delimiter (::)
    const parsed = parseParamKey(key)
    if (parsed) {
      const { effectInstanceId, paramName } = parsed
      nested[effectInstanceId] = { ...(nested[effectInstanceId] || {}), [paramName]: value }
    } else {
      // Fallback: try last '-' split (legacy format)
      const idx = key.lastIndexOf('-')
      if (idx !== -1) {
        const effectInstanceId = key.slice(0, idx)
        const paramName = key.slice(idx + 1)
        nested[effectInstanceId] = { ...(nested[effectInstanceId] || {}), [paramName]: value }
      }
    }
  })

  debugLog.log('✅ Converted', Object.keys(maybeFlat).length, 'flat keys to', Object.keys(nested).length, 'nested effect instances')
  return nested
}

interface AutoSaveContextType {
  saveCurrentState: () => Promise<void>
  restoreState: (stateId: string) => Promise<EditState>
  getCurrentState: () => Promise<EditState | null>
  isSaving: boolean
  lastSaved: Date | null
  config: any
  updateConfig: (config: any) => void
  showSettings?: boolean
  setShowSettings?: (show: boolean) => void
  showHistory?: boolean
  setShowHistory?: (show: boolean) => void
  error?: string | null
  isAuthenticated: boolean
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
  const [hasHydrated, setHasHydrated] = React.useState(false)

  const autoSave = useAutoSave(projectId)

  // Function to capture current visualization state from Zustand stores
  const captureCurrentState = useCallback(() => {
    // Access state non-reactively via getState() to avoid unnecessary re-renders during capture
    const timelineState = useTimelineStore.getState()
    const projectSettings = useProjectSettingsStore.getState()
    const visualizerState = useVisualizerStore.getState()

    const capturedState = {
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
      effectSettings: {
        selectedEffects: visualizerState.selectedEffects,
      },
      stemMappings: visualizerState.mappings,
      visualizationParams: {
        aspectRatio: visualizerState.aspectRatio,
        baseParameterValues: visualizerState.baseParameterValues,
        activeSliderValues: visualizerState.activeSliderValues,
        audioAnalysisSettings: visualizerState.audioAnalysisSettings,
        featureDecayTimes: visualizerState.featureDecayTimes,
        featureSensitivities: visualizerState.featureSensitivities,
      },
      schemaVersion: 1
    }

    // Debug logging for save operation
    debugLog.log('💾 Capturing state for save:', {
      layers: capturedState.timelineState.layers?.length || 0,
      layerTypes: capturedState.timelineState.layers?.map((l: any) => l.effectType || l.type) || [],
      baseParamEffects: Object.keys(capturedState.visualizationParams.baseParameterValues).length,
      activeParamEffects: Object.keys(capturedState.visualizationParams.activeSliderValues).length,
    })

    return capturedState
  }, [])


  // Save current state
  const saveCurrentState = useCallback(async () => {
    if (isHydrating) {
      console.log('💾 AUTOSAVE: Skipping save - hydrating in progress')
      return
    }

    console.log('💾 AUTOSAVE: saveCurrentState triggered')

    try {
      setError(null)
      const stateData = captureCurrentState()
      await autoSave.saveState(stateData)
      console.log('💾 AUTOSAVE: saveCurrentState completed successfully')
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save state'
      console.error('💾 AUTOSAVE: saveCurrentState FAILED:', errorMessage, err)
      setError(errorMessage)
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
        const { timelineState, projectSettings, effectSettings, stemMappings, visualizationParams } = restoredState.data

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

        // Hydrate Visualizer Store
        const visualizerStore = useVisualizerStore.getState()
        
        if (effectSettings?.selectedEffects) {
          visualizerStore.setSelectedEffects(effectSettings.selectedEffects)
        }
        
        if (stemMappings && Object.keys(stemMappings).length > 0) {
          visualizerStore.setMappings(stemMappings)
        }
        
        if (visualizationParams) {
          if (visualizationParams.aspectRatio) {
            visualizerStore.setAspectRatio(visualizationParams.aspectRatio)
          }
          if (visualizationParams.baseParameterValues) {
            // Convert legacy flat format to nested format if needed
            const nestedBase = toNestedParams(visualizationParams.baseParameterValues)
            visualizerStore.setBaseParameterValues(nestedBase)
            debugLog.log('✅ Restored baseParameterValues:', Object.keys(nestedBase).length, 'effect instances')
          }
          if (visualizationParams.activeSliderValues) {
            // Convert legacy flat format to nested format if needed
            const nestedActive = toNestedParams(visualizationParams.activeSliderValues)
            visualizerStore.setActiveSliderValues(nestedActive)
            debugLog.log('✅ Restored activeSliderValues:', Object.keys(nestedActive).length, 'effect instances')
          }
          if (visualizationParams.audioAnalysisSettings) {
            visualizerStore.setAudioAnalysisSettings(visualizationParams.audioAnalysisSettings)
          }
          if (visualizationParams.featureDecayTimes) {
            Object.entries(visualizationParams.featureDecayTimes).forEach(([featureId, decayTime]) => {
              visualizerStore.setFeatureDecayTime(featureId, decayTime as number)
            })
          }
          if (visualizationParams.featureSensitivities) {
            Object.entries(visualizationParams.featureSensitivities).forEach(([featureId, sensitivity]) => {
              visualizerStore.setFeatureSensitivity(featureId, sensitivity as number)
            })
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
      console.log('💾 AUTOSAVE: debouncedSave triggered')
      saveCurrentState()
    }, autoSave.config.debounceTime)
  ).current

  // Track pending changes that occurred during hydration
  const pendingChangesRef = useRef<{
    hasChanges: boolean
    changeTime: number
  }>({ hasChanges: false, changeTime: 0 })

  // Reactive auto-save: Subscribe to store changes
  useEffect(() => {
    if (!autoSave.config.enabled) {
      console.log('💾 AUTOSAVE: Store subscriptions disabled (config)')
      return
    }

    console.log('💾 AUTOSAVE: Setting up store subscriptions, isHydrating:', isHydrating)

    // Track previous state for comparison
    let prevTimelineState = useTimelineStore.getState()
    let prevSettingsState = useProjectSettingsStore.getState()
    let prevVisualizerState = useVisualizerStore.getState()

    // Subscribe to timeline changes
    const unsubTimeline = useTimelineStore.subscribe((state) => {
      const hasChanges =
        state.layers !== prevTimelineState.layers ||
        state.duration !== prevTimelineState.duration ||
        state.zoom !== prevTimelineState.zoom

      if (hasChanges) {
        console.log('💾 AUTOSAVE: Timeline changes detected', {
          layerCount: state.layers?.length,
          duration: state.duration,
          zoom: state.zoom
        })
        prevTimelineState = state
        if (isHydrating) {
          console.log('💾 AUTOSAVE: Change during hydration - queuing')
          pendingChangesRef.current = { hasChanges: true, changeTime: Date.now() }
        } else {
          debouncedSave()
        }
      } else {
        prevTimelineState = state
      }
    })

    // Subscribe to settings changes
    const unsubSettings = useProjectSettingsStore.subscribe((state) => {
      const hasChanges =
        state.backgroundColor !== prevSettingsState.backgroundColor ||
        state.isBackgroundVisible !== prevSettingsState.isBackgroundVisible

      if (hasChanges) {
        console.log('💾 AUTOSAVE: Settings changes detected')
        prevSettingsState = state
        if (isHydrating) {
          pendingChangesRef.current = { hasChanges: true, changeTime: Date.now() }
        } else {
          debouncedSave()
        }
      } else {
        prevSettingsState = state
      }
    })

    // Subscribe to visualizer changes
    const unsubVisualizer = useVisualizerStore.subscribe((state) => {
      const hasChanges =
        state.mappings !== prevVisualizerState.mappings ||
        state.selectedEffects !== prevVisualizerState.selectedEffects ||
        state.aspectRatio !== prevVisualizerState.aspectRatio ||
        JSON.stringify(state.baseParameterValues) !== JSON.stringify(prevVisualizerState.baseParameterValues) ||
        JSON.stringify(state.activeSliderValues) !== JSON.stringify(prevVisualizerState.activeSliderValues) ||
        JSON.stringify(state.audioAnalysisSettings) !== JSON.stringify(prevVisualizerState.audioAnalysisSettings) ||
        JSON.stringify(state.featureDecayTimes) !== JSON.stringify(prevVisualizerState.featureDecayTimes) ||
        JSON.stringify(state.featureSensitivities) !== JSON.stringify(prevVisualizerState.featureSensitivities)

      if (hasChanges) {
        console.log('💾 AUTOSAVE: Visualizer changes detected', {
          mappingsCount: Object.keys(state.mappings || {}).length,
          effectCount: state.selectedEffects?.length
        })
        prevVisualizerState = state
        if (isHydrating) {
          pendingChangesRef.current = { hasChanges: true, changeTime: Date.now() }
        } else {
          debouncedSave()
        }
      } else {
        prevVisualizerState = state
      }
    })

    return () => {
      console.log('💾 AUTOSAVE: Cleaning up store subscriptions')
      unsubTimeline()
      unsubSettings()
      unsubVisualizer()
      debouncedSave.cancel()
    }
  }, [autoSave.config.enabled, debouncedSave, isHydrating])

  // Load saved state on mount (hydration)
  useEffect(() => {
    console.log('🔄 AUTOSAVE: Hydration effect triggered, projectId:', projectId, 'isAuthenticated:', autoSave.isAuthenticated, 'hasHydrated:', hasHydrated)

    const loadSavedState = async () => {
      if (!projectId) {
        console.log('⚠️ AUTOSAVE: No projectId, skipping')
        return
      }

      // Wait for authentication to be determined before hydrating
      if (!autoSave.isAuthenticated) {
        console.log('⏳ AUTOSAVE: Waiting for authentication...')
        return
      }

      // Prevent duplicate hydration
      if (hasHydrated) {
        console.log('⏭️ AUTOSAVE: Already hydrated, skipping')
        return
      }

      // Check for orphaned localStorage saves from before auth completed
      // This handles the race condition where saves went to localStorage
      // because auth wasn't ready yet
      const guestKey = `guest_auto_save_${projectId}`
      const guestData = localStorage.getItem(guestKey)
      if (guestData) {
        try {
          const parsed = JSON.parse(guestData)
          console.log('🔄 AUTOSAVE: Found localStorage data, migrating to database...')
          // Migrate to database
          await autoSave.saveState(parsed.data)
          // Clean up localStorage after successful migration
          localStorage.removeItem(guestKey)
          console.log('✅ AUTOSAVE: Successfully migrated localStorage data to database')
        } catch (migrationErr) {
          console.error('❌ AUTOSAVE: Failed to migrate localStorage data:', migrationErr)
          // Don't block hydration on migration failure
        }
      }

      console.log('🔄 AUTOSAVE: Fetching current state (authenticated)...')

      try {
        setIsHydrating(true)
        const savedState = await autoSave.getCurrentState()

        console.log('🔄 AUTOSAVE: Response received:', savedState ? 'HAS DATA' : 'NULL')

        if (!savedState || !savedState.data) {
          console.log('⚠️ AUTOSAVE: No saved state found - is this a new project?')
          setIsHydrating(false)
          setHasHydrated(true)
          return
        }

        console.log('🔄 AUTOSAVE: Found data, hydrating...')
        console.log('🔄 AUTOSAVE: timelineState.layers:', savedState.data.timelineState?.layers?.length || 0)

          if (savedState && savedState.data) {
          const { timelineState, projectSettings, effectSettings, stemMappings, visualizationParams } = savedState.data

          // Hydrate Timeline Store
          if (timelineState) {
            if (timelineState.layers) {
              console.log('✅ AUTOSAVE: Restoring', timelineState.layers.length, 'timeline layers')
              useTimelineStore.getState().setLayers(timelineState.layers)
            } else {
              console.warn('⚠️ AUTOSAVE: No timeline layers found in saved state')
            }
            if (timelineState.duration !== undefined) {
              useTimelineStore.getState().setDuration(timelineState.duration)
            }
            if (timelineState.zoom !== undefined) {
              useTimelineStore.getState().setZoom(timelineState.zoom)
            }
          } else {
            console.warn('⚠️ AUTOSAVE: No timeline state found')
          }

          // Hydrate Settings Store
          if (projectSettings) {
            console.log('✅ AUTOSAVE: Restoring project settings')
            if (projectSettings.backgroundColor) {
              useProjectSettingsStore.getState().setBackgroundColor(projectSettings.backgroundColor)
            }
            if (projectSettings.isBackgroundVisible !== undefined) {
              useProjectSettingsStore.getState().setIsBackgroundVisible(projectSettings.isBackgroundVisible)
            }
          }

          // Hydrate Visualizer Store
          const visualizerStore = useVisualizerStore.getState()
          
          if (effectSettings?.selectedEffects) {
            visualizerStore.setSelectedEffects(effectSettings.selectedEffects)
          }
          
          if (stemMappings && Object.keys(stemMappings).length > 0) {
            visualizerStore.setMappings(stemMappings)
          }
          
          if (visualizationParams) {
            if (visualizationParams.aspectRatio) {
              visualizerStore.setAspectRatio(visualizationParams.aspectRatio)
            }
            if (visualizationParams.baseParameterValues) {
              // Convert legacy flat format to nested format if needed
              const nestedBase = toNestedParams(visualizationParams.baseParameterValues)
              visualizerStore.setBaseParameterValues(nestedBase)
              console.log('✅ AUTOSAVE: Restored baseParameterValues for', Object.keys(nestedBase).length, 'effects')
            }
            if (visualizationParams.activeSliderValues) {
              // Convert legacy flat format to nested format if needed
              const nestedActive = toNestedParams(visualizationParams.activeSliderValues)
              visualizerStore.setActiveSliderValues(nestedActive)
              console.log('✅ AUTOSAVE: Restored activeSliderValues for', Object.keys(nestedActive).length, 'effects')
            }
            if (visualizationParams.audioAnalysisSettings) {
              visualizerStore.setAudioAnalysisSettings(visualizationParams.audioAnalysisSettings)
              console.log('✅ AUTOSAVE: Restored audioAnalysisSettings')
            }
            if (visualizationParams.featureDecayTimes) {
              Object.entries(visualizationParams.featureDecayTimes).forEach(([featureId, decayTime]) => {
                visualizerStore.setFeatureDecayTime(featureId, decayTime as number)
              })
            }
            if (visualizationParams.featureSensitivities) {
              Object.entries(visualizationParams.featureSensitivities).forEach(([featureId, sensitivity]) => {
                visualizerStore.setFeatureSensitivity(featureId, sensitivity as number)
              })
            }
          }

          console.log('✅ AUTOSAVE: Complete - restored from version', savedState.version)
        }
      } catch (err) {
        console.error('❌ AUTOSAVE: Failed to load saved state:', err)
      } finally {
        setIsHydrating(false)
        setHasHydrated(true)

        // Check for pending changes that occurred during hydration
        if (pendingChangesRef.current.hasChanges) {
          console.log('💾 AUTOSAVE: Saving pending changes from during hydration')
          pendingChangesRef.current = { hasChanges: false, changeTime: 0 }
          // Trigger a save with a small delay to ensure subscriptions are re-established
          setTimeout(() => {
            saveCurrentState()
          }, 100)
        }
      }
    }

    loadSavedState()
    // Run when projectId changes OR when authentication status changes
    // The hasHydrated flag prevents duplicate hydration
  }, [projectId, autoSave.isAuthenticated, hasHydrated])

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
    isAuthenticated: autoSave.isAuthenticated,
  }

  // Expose panel state setters for external use
  const contextValueWithPanels: AutoSaveContextType & {
    showSettings: boolean
    setShowSettings: (show: boolean) => void
    showHistory: boolean
    setShowHistory: (show: boolean) => void
    error: string | null
  } = {
    ...contextValue,
    showSettings,
    setShowSettings,
    showHistory,
    setShowHistory,
    error,
  }

  return (
    <AutoSaveContext.Provider value={contextValueWithPanels}>
      <div className={cn("relative", className)}>
        {/* Settings Panel - positioned relative to top bar */}
        {showSettings && (
          <div className="fixed top-14 right-4 z-50 w-80">
            <AutoSaveSettings
              config={autoSave.config}
              onConfigChange={autoSave.updateConfig}
              onSaveNow={saveCurrentState}
              isSaving={autoSave.isSaving}
            />
          </div>
        )}

        {/* History Panel - positioned relative to top bar */}
        {showHistory && (
          <div className="fixed top-14 right-4 z-50 w-96">
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