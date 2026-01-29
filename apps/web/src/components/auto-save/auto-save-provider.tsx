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

import type { EditState } from '@/hooks/use-auto-save'

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
            visualizerStore.setBaseParameterValues(visualizationParams.baseParameterValues)
            debugLog.log('✅ Restored baseParameterValues:', Object.keys(visualizationParams.baseParameterValues).length, 'effect instances')
          }
          if (visualizationParams.activeSliderValues) {
            visualizerStore.setActiveSliderValues(visualizationParams.activeSliderValues)
            debugLog.log('✅ Restored activeSliderValues:', Object.keys(visualizationParams.activeSliderValues).length, 'effect instances')
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
    let prevVisualizerState = useVisualizerStore.getState()

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

    // Subscribe to visualizer changes
    const unsubVisualizer = useVisualizerStore.subscribe((state) => {
      if (
        state.mappings !== prevVisualizerState.mappings ||
        state.selectedEffects !== prevVisualizerState.selectedEffects ||
        state.aspectRatio !== prevVisualizerState.aspectRatio ||
        state.baseParameterValues !== prevVisualizerState.baseParameterValues ||
        state.activeSliderValues !== prevVisualizerState.activeSliderValues ||
        state.audioAnalysisSettings !== prevVisualizerState.audioAnalysisSettings ||
        state.featureDecayTimes !== prevVisualizerState.featureDecayTimes ||
        state.featureSensitivities !== prevVisualizerState.featureSensitivities
      ) {
        prevVisualizerState = state
        debouncedSave()
      } else {
        prevVisualizerState = state
      }
    })

    return () => {
      unsubTimeline()
      unsubSettings()
      unsubVisualizer()
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
          const { timelineState, projectSettings, effectSettings, stemMappings, visualizationParams } = savedState.data

          // Hydrate Timeline Store
          if (timelineState) {
            if (timelineState.layers) {
              debugLog.log('✅ Restoring timeline layers:', timelineState.layers.length, 'layers')
              debugLog.log('  Layer types:', timelineState.layers.map((l: any) => `${l.effectType || l.type} (${l.id.slice(0, 20)}...)`))
              useTimelineStore.getState().setLayers(timelineState.layers)
            } else {
              debugLog.warn('⚠️ No timeline layers found in saved state')
            }
            if (timelineState.duration !== undefined) {
              useTimelineStore.getState().setDuration(timelineState.duration)
            }
            if (timelineState.zoom !== undefined) {
              useTimelineStore.getState().setZoom(timelineState.zoom)
            }
          } else {
            debugLog.warn('⚠️ No timeline state found in saved data')
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
              visualizerStore.setBaseParameterValues(visualizationParams.baseParameterValues)
              debugLog.log('✅ Restored baseParameterValues:', Object.keys(visualizationParams.baseParameterValues).length, 'effect instances')
            }
            if (visualizationParams.activeSliderValues) {
              visualizerStore.setActiveSliderValues(visualizationParams.activeSliderValues)
              debugLog.log('✅ Restored activeSliderValues:', Object.keys(visualizationParams.activeSliderValues).length, 'effect instances')
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

          debugLog.log('✅ Hydrated project state from version', savedState.version)
        }
      } catch (err) {
        debugLog.error('Failed to load saved state:', err)
      } finally {
        setIsHydrating(false)
      }
    }

    loadSavedState()
    // FIX: Only run on mount/project change. Excluding autoSave prevents infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

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