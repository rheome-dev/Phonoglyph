This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
apps/
  web/
    src/
      app/
        creative-visualizer/
          page.tsx
      components/
        auto-save/
          auto-save-provider.tsx
        ui/
          MappingSourcesPanel.tsx
      stores/
        visualizerStore.ts
```

# Files

## File: apps/web/src/stores/visualizerStore.ts
```typescript
'use client';

import { create } from 'zustand';

// Types
export interface FeatureMapping {
  featureId: string | null;
  modulationAmount: number; // 0-1, default 0.5 (50%)
}

export interface AudioAnalysisSettings {
  transientDecay: number;
  transientSensitivity: number;
}

interface VisualizerState {
  // Global Settings
  aspectRatio: string;
  selectedEffects: Record<string, boolean>;
  
  // Audio Analysis Configuration (per-feature settings)
  audioAnalysisSettings: AudioAnalysisSettings;
  featureDecayTimes: Record<string, number>;
  featureSensitivities: Record<string, number>;
  
  // Mappings & Parameters
  mappings: Record<string, FeatureMapping>;
  baseParameterValues: Record<string, number>;
  activeSliderValues: Record<string, number>;
}

interface VisualizerActions {
  // Setters
  setAspectRatio: (ratio: string) => void;
  setSelectedEffects: (effects: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setAudioAnalysisSettings: (settings: Partial<AudioAnalysisSettings>) => void;
  setFeatureDecayTime: (featureId: string, decayTime: number) => void;
  setFeatureSensitivity: (featureId: string, sensitivity: number) => void;
  setMappings: (mappings: Record<string, FeatureMapping> | ((prev: Record<string, FeatureMapping>) => Record<string, FeatureMapping>)) => void;
  setBaseParameterValues: (values: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setActiveSliderValues: (values: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  
  // Helper Actions
  updateMapping: (id: string, mapping: FeatureMapping) => void;
  removeMapping: (id: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: VisualizerState = {
  aspectRatio: 'mobile',
  selectedEffects: {},
  audioAnalysisSettings: {
    transientDecay: 0.5,
    transientSensitivity: 0.5,
  },
  featureDecayTimes: {},
  featureSensitivities: {},
  mappings: {},
  baseParameterValues: {},
  activeSliderValues: {},
};

export const useVisualizerStore = create<VisualizerState & VisualizerActions>((set) => ({
  ...DEFAULT_STATE,

  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  
  setSelectedEffects: (updater) => set((state) => ({ 
    selectedEffects: typeof updater === 'function' ? updater(state.selectedEffects) : updater 
  })),
  
  setAudioAnalysisSettings: (settings) => set((state) => ({
    audioAnalysisSettings: { ...state.audioAnalysisSettings, ...settings }
  })),

  setFeatureDecayTime: (featureId, decayTime) => set((state) => ({
    featureDecayTimes: { ...state.featureDecayTimes, [featureId]: decayTime }
  })),

  setFeatureSensitivity: (featureId, sensitivity) => set((state) => ({
    featureSensitivities: { ...state.featureSensitivities, [featureId]: sensitivity }
  })),

  setMappings: (updater) => set((state) => ({
    mappings: typeof updater === 'function' ? updater(state.mappings) : updater
  })),

  setBaseParameterValues: (updater) => set((state) => ({
    baseParameterValues: typeof updater === 'function' ? updater(state.baseParameterValues) : updater
  })),

  setActiveSliderValues: (updater) => set((state) => ({
    activeSliderValues: typeof updater === 'function' ? updater(state.activeSliderValues) : updater
  })),

  updateMapping: (id, mapping) => set((state) => ({
    mappings: { ...state.mappings, [id]: mapping }
  })),

  removeMapping: (id) => set((state) => {
    const newMappings = { ...state.mappings };
    delete newMappings[id];
    return { mappings: newMappings };
  }),

  reset: () => set(DEFAULT_STATE),
}));
```

## File: apps/web/src/components/auto-save/auto-save-provider.tsx
```typescript
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
          }
          if (visualizationParams.activeSliderValues) {
            visualizerStore.setActiveSliderValues(visualizationParams.activeSliderValues)
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
            }
            if (visualizationParams.activeSliderValues) {
              visualizerStore.setActiveSliderValues(visualizationParams.activeSliderValues)
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
```

## File: apps/web/src/components/ui/MappingSourcesPanel.tsx
```typescript
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { featureDecayTimesRef } from '@/hooks/use-audio-analysis';
import { useVisualizerStore } from '@/stores/visualizerStore';

// --- Meter Sub-Components ---

const VolumeMeter = ({ value }: { value: number }) => (
  <div className="w-full h-4 bg-neutral-800 rounded-sm overflow-hidden border border-neutral-600 relative">
    <div 
      className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-75 ease-out" 
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white mix-blend-difference">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  </div>
);

const PitchMeter = ({ value }: { value: number }) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = Math.floor(value * 12);
  const noteName = noteNames[noteIndex] || '...';
  
  // Piano keyboard layout: naturals (C, D, E, F, G, A, B) and accidentals (C#, D#, F#, G#, A#)
  const isNatural = (index: number) => [0, 2, 4, 5, 7, 9, 11].includes(index); // C, D, E, F, G, A, B
  const isAccidental = (index: number) => [1, 3, 6, 8, 10].includes(index); // C#, D#, F#, G#, A#

  return (
    <div className="w-full h-4 bg-neutral-900 border border-neutral-600 rounded-sm relative overflow-hidden flex items-center justify-center">
      {/* Piano keyboard background */}
      <div className="absolute inset-0 flex">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "flex-1 h-full border-r border-neutral-700",
              isNatural(i) ? "bg-neutral-300" : "bg-neutral-600"
            )} 
          />
        ))}
      </div>
      {/* Active note indicator */}
      <div 
        className="absolute top-0 bottom-0 w-[8.33%] bg-blue-400/60 transition-all duration-100 ease-out border-l border-r border-blue-300" 
        style={{ left: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
      />
      <span className="text-[10px] font-bold text-white mix-blend-difference z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {noteName}
      </span>
    </div>
  );
};

const ImpactMeter = ({ value }: { value: number }) => (
  <div className="w-full bg-neutral-800 rounded-sm h-4 overflow-hidden border border-neutral-600 relative">
    <div 
      className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-75 ease-out" 
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white mix-blend-difference">
        {value > 0.01 ? 'HIT' : '—'}
      </span>
    </div>
  </div>
);

// Helper to filter transients by sensitivity (1 = keep all, 0 = keep only strongest)
function filterTransientsBySensitivity(
  transients: Array<{ time: number; intensity: number }>,
  sensitivity: number
): Array<{ time: number; intensity: number }> {
  if (!transients.length) return transients;
  const clamped = Math.max(0, Math.min(1, sensitivity));
  if (clamped >= 0.999) return transients;

  const intensities = transients
    .map(t => t.intensity)
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!intensities.length) return transients;

  const index = Math.floor((1 - clamped) * (intensities.length - 1));
  const threshold = intensities[index];

  return transients.filter(t => (Number.isFinite(t.intensity) ? t.intensity : 0) >= threshold);
}

// Time-aligned oscilloscope for spectral flux + transient markers
const PeaksOscilloscope = ({ 
  analysisData,
  currentTime,
  width = 200,
  height = 40,
  windowSec = 4.0,
}: { 
  analysisData: any | null;
  currentTime: number;
  width?: number;
  height?: number;
  windowSec?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameTimes = (analysisData.frameTimes as number[]) || [];
    const spectralFlux = (analysisData.spectralFlux as number[]) || [];
    const volume = (analysisData.volume as number[]) || [];
    // Use volume (RMS) for visual waveform when available, fall back to spectral flux
    const values =
      volume.length === frameTimes.length && volume.length > 0
        ? volume
        : spectralFlux;
    const transients = (analysisData.transients as Array<{ time: number; intensity: number }>) || [];

    if (!frameTimes.length || !values.length) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const duration = frameTimes[frameTimes.length - 1] ?? 0;
    const clampedCurrent = Math.max(0, Math.min(currentTime, duration));
    const halfWindow = windowSec;
    const tEnd = clampedCurrent;
    const tStart = Math.max(0, tEnd - halfWindow);
    const windowDuration = tEnd - tStart || 1e-3;

    const sampleAtTime = (t: number): number => {
      let lo = 0;
      let hi = frameTimes.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1;
        if (frameTimes[mid] <= t) lo = mid;
        else hi = mid - 1;
      }
      return values[lo] ?? 0;
    };

    // Use global max for stable height across time
    const globalMax = values.reduce((m: number, v: number) => {
      const av = Math.abs(v);
      if (!isFinite(av)) return m;
      return av > m ? av : m;
    }, 1e-6);

    const waveform: number[] = [];
    for (let x = 0; x < width; x++) {
      const t = tStart + (x / Math.max(1, width - 1)) * windowDuration;
      const v = sampleAtTime(t);
      waveform[x] = v;
    }

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw waveform (normalized volume / spectral flux)
    if (globalMax > 0) {
      // Unipolar envelope from near bottom to near top of scope
      const baselineY = height * 0.9; // 10% padding at bottom
      const scale = (height * 0.8) / globalMax; // leave ~10% headroom at top
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const v = Math.abs(waveform[x]) * scale;
        const y = baselineY - v;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw transient markers aligned in time
    ctx.strokeStyle = '#ff0';
    ctx.fillStyle = '#ff0';
    ctx.lineWidth = 1.5;
    const triangleSize = 6;

    transients.forEach(tr => {
      if (tr.time < tStart || tr.time > tEnd) return;
      const pos = (tr.time - tStart) / windowDuration;
      const x = Math.max(0, Math.min(width - 1, pos * width));

      // Full-height line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Downward-pointing triangle at top
      ctx.beginPath();
      ctx.moveTo(x - triangleSize / 2, 0);
      ctx.lineTo(x + triangleSize / 2, 0);
      ctx.lineTo(x, triangleSize);
      ctx.closePath();
      ctx.fill();
    });
  }, [analysisData, currentTime, width, height, windowSec]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

// --- Main FeatureNode Component ---

const FeatureNode = ({ 
  feature, 
  currentTime, 
  cachedAnalysis,
  isPlaying 
}: { 
  feature: AudioFeature; 
  currentTime: number;
  cachedAnalysis: any[];
  isPlaying: boolean;
}) => {
  const [liveValue, setLiveValue] = useState(0); // Decayed output value (for meter and oscilloscope waveform)
  const [isActive, setIsActive] = useState(false);
  const lastTransientRef = useRef<{ time: number; intensity: number } | null>(null);
  
  // Get sensitivity and decay from global store (persisted via auto-save)
  const { 
    featureSensitivities, 
    setFeatureSensitivity, 
    featureDecayTimes, 
    setFeatureDecayTime 
  } = useVisualizerStore();
  
  // Use store values with defaults
  const sensitivity = featureSensitivities[feature.id] ?? 0.5;
  const decayTime = featureDecayTimes[feature.id] ?? (featureDecayTimesRef.current[feature.id] ?? 0.5);
  
  const isTransientFeature = feature.isEvent && feature.id.includes('peaks');
  
  // Get transients for oscilloscope display
  const peaksAnalysisData = useMemo(() => {
    if (!isTransientFeature) return null;
    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis?.analysisData) return null;
    const data = analysis.analysisData;
    const allTransients = (data.transients as Array<{ time: number; intensity: number }> | undefined) || [];
    const filtered = filterTransientsBySensitivity(allTransients, sensitivity);
    return {
      ...data,
      transients: filtered,
    };
  }, [isTransientFeature, cachedAnalysis, feature.stemType, sensitivity]);
  
  // Initialize shared ref on mount and sync with store
  useEffect(() => {
    if (isTransientFeature) {
      // If store has a value, use it for the ref; otherwise initialize both
      const storeValue = featureDecayTimes[feature.id];
      if (storeValue !== undefined) {
        featureDecayTimesRef.current[feature.id] = storeValue;
      } else if (!featureDecayTimesRef.current[feature.id]) {
        featureDecayTimesRef.current[feature.id] = 0.5; // Default
        setFeatureDecayTime(feature.id, 0.5);
      }
    }
  }, [feature.id, isTransientFeature, featureDecayTimes, setFeatureDecayTime]);

  useEffect(() => {
    if (!isPlaying || !feature.stemType) {
      setLiveValue(0);
      setIsActive(false);
      lastTransientRef.current = null; // Reset on stop/pause
      return;
    }

    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis?.analysisData) {
      return;
    }

    const { analysisData } = analysis;
    const time = currentTime;
    let featureValue = 0;
    
    // --- ENVELOPE LOGIC FOR TRANSIENTS ---
    if (isTransientFeature) {
        // *** FIX B: LOOP DETECTION FOR THE UI COMPONENT ***
        let storedTransient = lastTransientRef.current;
        if (storedTransient && (time < storedTransient.time - 0.5)) {
            lastTransientRef.current = null;
            storedTransient = null;
        }

        // Filter transients based on sensitivity for envelope generation
        const allTransients = (analysisData.transients as Array<{ time: number; intensity: number }> | undefined) || [];
        const relevantTransients = filterTransientsBySensitivity(allTransients, sensitivity);

        const latestTransient = relevantTransients.reduce((latest: any, t: any) => {
            if (t.time <= time && (!latest || t.time > latest.time)) {
                return t;
            }
            return latest;
        }, null);

        if (latestTransient) {
            if (!storedTransient || latestTransient.time > storedTransient.time) {
                lastTransientRef.current = { time: latestTransient.time, intensity: latestTransient.intensity };
            }
        }

        const activeTransient = lastTransientRef.current;
        if (activeTransient) {
            const elapsedTime = time - activeTransient.time;
            // Calculate decayed value for output signal (used for both meter and oscilloscope waveform)
            if (elapsedTime >= 0 && elapsedTime < decayTime) {
                featureValue = activeTransient.intensity * (1 - (elapsedTime / decayTime));
            } else {
                featureValue = 0;
            }
        } else {
            featureValue = 0;
        }
    }
    // --- EXISTING LOGIC FOR PITCH ---
    else if (feature.isEvent && feature.id.includes('pitch')) {
      const times = analysisData.frameTimes;
      const chromaValues = analysisData.chroma;
      if (times && chromaValues && Array.isArray(times) && Array.isArray(chromaValues)) {
        let lo = 0, hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >>> 1;
          if (times[mid] <= time) lo = mid; else hi = mid - 1;
        }
        const chromaValue = chromaValues[lo] ?? 0;
        featureValue = chromaValue / 11;
      }
    } 
    // --- EXISTING LOGIC FOR TIME-SERIES ---
    else {
      const times = analysisData.frameTimes;
      const values = analysisData.volume || analysisData.rms;
      if (times && values && Array.isArray(times) && Array.isArray(values)) {
        let lo = 0, hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >>> 1;
          if (times[mid] <= time) lo = mid; else hi = mid - 1;
        }
        featureValue = values[lo] ?? 0;
      }
    }

    const normalizedValue = Math.max(0, Math.min(1, featureValue));
    setLiveValue(normalizedValue);
    setIsActive(isPlaying && normalizedValue > 0.05); // Lowered threshold for active state
  }, [feature, currentTime, cachedAnalysis, isPlaying, decayTime, sensitivity]); // decayTime and sensitivity from store

  const [{ isDragging }, dragRef] = useDrag({
    type: 'feature',
    item: () => ({ 
      id: feature.id, 
      name: feature.name, 
      stemType: feature.stemType
    }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const drag = React.useCallback((node: HTMLDivElement | null) => {
    dragRef(node);
  }, [dragRef]);
  
  const renderMeter = () => {
    if (isTransientFeature) {
      return (
        <div className="space-y-2">
          {/* Oscilloscope display (time-aligned spectral flux + transient markers) */}
          <div className="w-full h-10 bg-neutral-900 border border-neutral-600 rounded-sm overflow-hidden">
            <PeaksOscilloscope 
              analysisData={peaksAnalysisData}
              currentTime={currentTime}
              width={200}
              height={40}
            />
          </div>
          {/* Output signal meter (with decay applied) */}
          <ImpactMeter value={liveValue} />
        </div>
      );
    }
    if (feature.name === 'Pitch') return <PitchMeter value={liveValue} />;
    if (feature.name === 'Volume') return <VolumeMeter value={liveValue} />;
    return <div className="w-full bg-neutral-800 rounded-sm h-1 mb-1" />;
  };

  return (
    <div 
      className={cn(
        "w-full px-2 py-1.5 text-xs border border-neutral-600 bg-neutral-700 rounded-md transition-all duration-200",
        "hover:bg-neutral-600",
        isActive && "ring-1 ring-opacity-70",
        isActive && feature.category === 'rhythm' && "ring-red-400",
        isActive && feature.category === 'pitch' && "ring-blue-400", 
        isActive && feature.category === 'intensity' && "ring-yellow-400",
        isActive && feature.category === 'timbre' && "ring-purple-400",
        isDragging && "opacity-40"
      )}
      title={feature.description}
    >
      {/* This inner div is now the draggable handle */}
      <div ref={drag} className="cursor-grab">
        <div className="flex items-center justify-between w-full mb-1.5">
          <span className="truncate font-mono text-[10px] font-bold tracking-wide text-white uppercase">
            {feature.name}
          </span>
        </div>
        {renderMeter()}
      </div>
      {/* Controls outside the draggable handle */}
      {isTransientFeature && (
        <div className="mt-2 space-y-2">
          {/* Sensitivity slider (below HIT meter, above Decay) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-neutral-400 font-mono">Sensitivity</Label>
              <span className="text-[10px] text-neutral-300 font-mono">
                {(sensitivity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[sensitivity]}
              onValueChange={(value) => {
                const next = Math.max(0, Math.min(1, value[0] ?? 0));
                setFeatureSensitivity(feature.id, next);
              }}
              min={0}
              max={1}
              step={0.05}
              className="h-2"
            />
          </div>
          {/* Decay slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-neutral-400 font-mono">Decay</Label>
              <span className="text-[10px] text-neutral-300 font-mono">{decayTime.toFixed(2)}s</span>
            </div>
              <Slider
                value={[decayTime]}
                onValueChange={(value) => {
                  const newDecayTime = value[0];
                  setFeatureDecayTime(feature.id, newDecayTime);
                  // Update shared ref so getFeatureValue uses this decayTime for envelope generation
                  featureDecayTimesRef.current[feature.id] = newDecayTime;
                }}
                min={0.05}
                max={2.0}
                step={0.05}
                className="h-2"
              />
          </div>
        </div>
      )}
    </div>
  );
};

// --- Panel and Category Components ---

const categoryIcons: Record<string, React.ElementType> = {
  rhythm: Activity,
  pitch: Music,
  intensity: Zap,
  timbre: BarChart2,
};

const categoryDisplayNames: Record<string, string> = {
  rhythm: 'Rhythm & Impact',
  pitch: 'Pitch & Melody',
  intensity: 'Energy & Loudness',
  timbre: 'Texture & Character',
};

export function MappingSourcesPanel({ 
  activeTrackId, 
  className, 
  selectedStemType,
  currentTime = 0,
  cachedAnalysis = [],
  isPlaying = false
}: {
  activeTrackId?: string;
  className?: string;
  selectedStemType?: string;
  currentTime?: number;
  cachedAnalysis?: any[];
  isPlaying?: boolean;
}) {
  const features = useAudioFeatures(activeTrackId, selectedStemType, cachedAnalysis);
  
  const featuresByCategory = useMemo(() => {
    return features.reduce((acc, feature) => {
      (acc[feature.category] = acc[feature.category] || []).push(feature);
      return acc;
    }, {} as Record<string, AudioFeature[]>);
  }, [features]);

  // Capitalize stem type
  const capitalizedStemType = selectedStemType 
    ? selectedStemType.charAt(0).toUpperCase() + selectedStemType.slice(1)
    : '';

  if (!activeTrackId || !selectedStemType) {
    return (
      <div className={cn("bg-black border-l border-neutral-800 flex flex-col", className)}>
        <div className="p-3 border-b border-neutral-800">
          <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider">
            Audio Features
          </h2>
        </div>
        <div className="p-4 text-center text-xs text-neutral-500">
          Select a track in the timeline to see its available modulation sources.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-black border-l border-neutral-800 flex flex-col", className)}>
      <div className="p-3 border-b border-neutral-800">
        <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider mb-2">
          {capitalizedStemType} Features
        </h2>
        <p className="text-xs text-neutral-500 font-mono">
          Drag a feature onto an effect parameter to create a mapping.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(featuresByCategory).length > 0 ? (
          Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
            const Icon = categoryIcons[category];
            return (
              <div key={category} className="space-y-1.5">
                {/* Category Header */}
                <div className="w-full flex items-center justify-between p-2 bg-neutral-900 border border-neutral-600">
                  <span className="font-mono text-xs font-semibold text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                    {Icon && <Icon size={12} />}
                    {categoryDisplayNames[category] || category}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    {categoryFeatures.length}
                  </span>
                </div>
                {/* Category Features */}
                <div className="space-y-1.5">
                  {categoryFeatures.map((feature) => (
                    <FeatureNode
                      key={feature.id}
                      feature={feature}
                      currentTime={currentTime}
                      cachedAnalysis={cachedAnalysis}
                      isPlaying={isPlaying}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-neutral-500 text-center py-4 font-mono">
            No analysis data available for this stem yet. Press play to begin analysis.
          </div>
        )}
      </div>
    </div>
  );
}
```

## File: apps/web/src/app/creative-visualizer/page.tsx
```typescript
'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, Palette, Settings2, Eye, EyeOff, Info, Map as MapIcon } from 'lucide-react';
import { ThreeVisualizer } from '@/components/midi/three-visualizer';
import { EffectsLibrarySidebar, EffectUIData } from '@/components/ui/EffectsLibrarySidebar';
import { CollapsibleEffectsSidebar } from '@/components/layout/collapsible-effects-sidebar';
import { FileSelector } from '@/components/midi/file-selector';
import { MIDIData, VisualizationSettings, DEFAULT_VISUALIZATION_SETTINGS } from '@/types/midi';
import { VisualizationPreset, StemVisualizationMapping } from '@/types/stem-visualization';
import { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { trpc } from '@/lib/trpc';
import { CollapsibleSidebar } from '@/components/layout/collapsible-sidebar';
import { ProjectPickerModal } from '@/components/projects/project-picker-modal';
import { debugLog } from '@/lib/utils';
import { ProjectCreationModal } from '@/components/projects/project-creation-modal';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import { useAudioAnalysis } from '@/hooks/use-audio-analysis';
import { PortalModal } from '@/components/ui/portal-modal';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MappingSourcesPanel } from '@/components/ui/MappingSourcesPanel';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { LayerContainer } from '@/components/video-composition/LayerContainer';
import { useTimelineStore } from '@/stores/timelineStore';
import { UnifiedTimeline } from '@/components/video-composition/UnifiedTimeline';
import { TestVideoComposition } from '@/components/video-composition/TestVideoComposition';
import type { Layer } from '@/types/video-composition';
import { useFeatureValue } from '@/hooks/use-feature-value';
import { HudOverlayProvider, useHudOverlayContext } from '@/components/hud/HudOverlayManager';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { getAspectRatioConfig } from '@/lib/visualizer/aspect-ratios';
import { useProjectSettingsStore } from '@/stores/projectSettingsStore';
import { useVisualizerStore } from '@/stores/visualizerStore';
import { CollectionManager } from '@/components/assets/CollectionManager';
import { AutoSaveProvider, useAutoSaveContext } from '@/components/auto-save/auto-save-provider';
import { AutoSaveIndicator } from '@/components/auto-save/auto-save-indicator';
import { AutoSaveTopBar } from '@/components/auto-save/auto-save-top-bar';

// Derived boolean: are stem URLs ready?
// const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0; // This line was moved

// Wrapper component that provides HUD overlay functionality to the sidebar
const EffectsLibrarySidebarWithHud: React.FC<{
  effects: any[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  onEffectDoubleClick: (effectId: string) => void;
  isVisible: boolean;
  stemUrlsReady: boolean;
}> = ({ effects, selectedEffects, onEffectToggle, onEffectDoubleClick, isVisible, stemUrlsReady }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const hudContext = useHudOverlayContext();
  
  const handleEffectDoubleClick = (effectId: string) => {
    if (!stemUrlsReady) {
      debugLog.warn('[EffectsLibrarySidebarWithHud] Overlay creation blocked: stem URLs not ready');
      return;
    }
    const effect = effects.find(e => e.id === effectId);
    if (effect && effect.category === 'Overlays' && isClient) {
      // Map effect ID to overlay type
      const overlayTypeMap: Record<string, string> = {
        'waveform': 'waveform',
        'spectrogram': 'spectrogram',
        'peakMeter': 'peakMeter',
        'stereometer': 'stereometer',
        'oscilloscope': 'oscilloscope',
        'spectrumAnalyzer': 'spectrumAnalyzer',
        'midiMeter': 'midiMeter'
      };
      
      const overlayType = overlayTypeMap[effectId];
      if (overlayType) {
        debugLog.log('🎯 Adding HUD overlay:', overlayType);
        hudContext.addOverlay(overlayType);
      }
    }
    onEffectDoubleClick(effectId);
  };
  
  return (
    <EffectsLibrarySidebar
      effects={effects}
      selectedEffects={selectedEffects}
      onEffectToggle={onEffectToggle}
      onEffectDoubleClick={handleEffectDoubleClick}
      isVisible={isVisible}
    />
  );
};

// Sample MIDI data for demonstration
const createSampleMIDIData = (): MIDIData => {
  const notes: any[] = [];
  const melodyPattern = [60, 64, 67, 72, 69, 65, 62, 60, 67, 64, 69, 72, 74, 67, 64, 60];
  for (let i = 0; i < melodyPattern.length; i++) {
    notes.push({
      id: `melody-${i}`,
      start: i * 0.5,
      duration: 0.4,
      pitch: melodyPattern[i],
      velocity: 60 + Math.random() * 40,
      track: 'melody',
      noteName: `Note${melodyPattern[i]}`,
    });
  }
  const chordTimes = [2, 4, 6, 8];
  chordTimes.forEach((time, idx) => {
    const chordNotes = [48, 52, 55];
    chordNotes.forEach((note, noteIdx) => {
      notes.push({
        id: `chord-${idx}-${noteIdx}`,
        start: time,
        duration: 1.5,
        pitch: note,
        velocity: 40 + Math.random() * 30,
        track: 'melody',
        noteName: `Chord${note}`,
      });
    });
  });

  return {
    file: {
      name: 'Creative Demo.mid',
      size: 1024,
      duration: 10.0,
      ticksPerQuarter: 480,
      timeSignature: [4, 4],
      keySignature: 'C Major'
    },
    tracks: [
      { id: 'melody', name: 'Synth Lead', instrument: 'Synthesizer', channel: 1, color: '#84a98c', visible: true, notes: notes },
      { id: 'bass', name: 'Bass Synth', instrument: 'Bass', channel: 2, color: '#6b7c93', visible: true, notes: [
          { id: 'b1', start: 0.0, duration: 1.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
          { id: 'b2', start: 1.0, duration: 1.0, pitch: 40, velocity: 95, track: 'bass', noteName: 'E2' },
          { id: 'b3', start: 2.0, duration: 1.0, pitch: 43, velocity: 90, track: 'bass', noteName: 'G2' },
          { id: 'b4', start: 3.0, duration: 1.0, pitch: 48, velocity: 85, track: 'bass', noteName: 'C3' },
          { id: 'b5', start: 4.0, duration: 2.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
        ]
      },
      { id: 'drums', name: 'Drums', instrument: 'Drum Kit', channel: 10, color: '#b08a8a', visible: true, notes: [
          { id: 'd1', start: 0.0, duration: 0.1, pitch: 36, velocity: 120, track: 'drums', noteName: 'Kick' },
          { id: 'd2', start: 0.5, duration: 0.1, pitch: 42, velocity: 80, track: 'drums', noteName: 'HiHat' },
          { id: 'd3', start: 1.0, duration: 0.1, pitch: 38, velocity: 100, track: 'drums', noteName: 'Snare' },
          { id: 'd4', start: 1.5, duration: 0.1, pitch: 42, velocity: 70, track: 'drums', noteName: 'HiHat' },
          { id: 'd5', start: 2.0, duration: 0.1, pitch: 36, velocity: 127, track: 'drums', noteName: 'Kick' },
          { id: 'd6', start: 2.5, duration: 0.1, pitch: 42, velocity: 85, track: 'drums', noteName: 'HiHat' },
          { id: 'd7', start: 3.0, duration: 0.1, pitch: 38, velocity: 110, track: 'drums', noteName: 'Snare' },
          { id: 'd8', start: 3.5, duration: 0.1, pitch: 42, velocity: 75, track: 'drums', noteName: 'HiHat' },
        ]
      }
    ],
    tempoChanges: [
      { tick: 0, bpm: 120, microsecondsPerQuarter: 500000 }
    ]
  };
};

// Transform backend MIDI data to frontend format
const transformBackendToFrontendMidiData = (backendData: any): MIDIData => {
  return {
    file: {
      name: backendData.file.name,
      size: backendData.file.size,
      duration: backendData.file.duration,
      ticksPerQuarter: backendData.file.ticksPerQuarter,
      timeSignature: backendData.file.timeSignature,
      keySignature: backendData.file.keySignature
    },
    tracks: backendData.tracks.map((track: any) => ({
      id: String(track.id),
      name: track.name,
      instrument: track.instrument,
      channel: track.channel,
      color: track.color,
      visible: true,
      notes: track.notes.map((note: any) => ({
        id: note.id,
        start: note.startTime, // Backend: startTime -> Frontend: start
        duration: note.duration,
        pitch: note.note,      // Backend: note -> Frontend: pitch
        velocity: note.velocity,
        track: String(track.id), // Backend: track (number) -> Frontend: track (string)
        noteName: note.name,   // Backend: name -> Frontend: noteName
      }))
    })),
    tempoChanges: backendData.tempoChanges
  };
};


function CreativeVisualizerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [settings, setSettings] = useState<VisualizationSettings>(DEFAULT_VISUALIZATION_SETTINGS);
  const {
    layers,
    currentTime,
    isPlaying,
    selectedLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    setCurrentTime,
    setDuration,
    togglePlay,
    setPlaying,
  } = useTimelineStore();
  const [fps, setFps] = useState(60);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset>({
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom',
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  });

  // Effects timeline has been merged into layers via store
  const [showVideoComposition, setShowVideoComposition] = useState(false);

  // Effects carousel state (now for timeline-based effects) - from store
  const { 
    selectedEffects, 
    setSelectedEffects,
    aspectRatio: visualizerAspectRatio,
    setAspectRatio: setVisualizerAspectRatio,
    mappings,
    setMappings,
    baseParameterValues,
    setBaseParameterValues,
    activeSliderValues,
    setActiveSliderValues
  } = useVisualizerStore();

  // Effect parameter modal state
  const [openEffectModals, setOpenEffectModals] = useState<Record<string, boolean>>({
    'metaballs': false,
    'midiHud': false,
    'particleNetwork': false
  });

  // Feature mapping state - now from visualizerStore
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | undefined>();
  // Base (user-set) parameter values from store, modulated values still local (transient)
  const [modulatedParameterValues, setModulatedParameterValues] = useState<Record<string, number>>({});

  // Real-time sync calibration offset in ms
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);

  // Performance monitoring for sync debugging
  const [syncMetrics, setSyncMetrics] = useState({
    audioLatency: 0,
    visualLatency: 0,
    syncDrift: 0,
    frameTime: 0,
    lastUpdate: 0
  });

  const [sampleMidiData] = useState<MIDIData>(createSampleMIDIData());
  const stemAudio = useStemAudioController();
  const audioAnalysis = useAudioAnalysis();
  
  // Sync performance monitoring
  useEffect(() => {
    if (!isPlaying) return;
    
    const updateSyncMetrics = () => {
      const now = performance.now();
      const audioTime = stemAudio.currentTime;
      const visualTime = currentTime;
      const audioLatency = stemAudio.getAudioLatency ? stemAudio.getAudioLatency() * 1000 : 0;
      const frameTime = now - syncMetrics.lastUpdate;
      
      setSyncMetrics({
        audioLatency,
        visualLatency: frameTime,
        syncDrift: Math.abs(audioTime - visualTime) * 1000, // Convert to ms
        frameTime,
        lastUpdate: now
      });
    };
    
    const interval = setInterval(updateSyncMetrics, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [isPlaying, stemAudio.currentTime, currentTime, syncMetrics.lastUpdate]);
  
  // Enhanced audio analysis data - This state is no longer needed, data comes from useCachedStemAnalysis
  // const [audioAnalysisData, setAudioAnalysisData] = useState<any>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isLoadingStemsRef = useRef(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  
  // Ref to track current analysis state to avoid stale closures
  const currentAnalysisRef = useRef(audioAnalysis.cachedAnalysis);
  
  // Update ref when analysis changes
  useEffect(() => {
    currentAnalysisRef.current = audioAnalysis.cachedAnalysis;
  }, [audioAnalysis.cachedAnalysis]);

  // Get download URL mutation
  const getDownloadUrlMutation = trpc.file.getDownloadUrl.useMutation();

  // Fetch current project information
  const { 
    data: projectData, 
    isLoading: projectLoading, 
    error: projectError 
  } = trpc.project.get.useQuery(
    { id: currentProjectId! },
    { enabled: !!currentProjectId }
  );

  // Fetch project files for general asset management / UI
  const { 
    data: projectFiles, 
    isLoading: projectFilesLoading 
  } = trpc.file.getUserFiles.useQuery(
    { 
      limit: 200, 
      fileType: 'all',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );

  // Dedicated query for audio files so they can never be paged out
  const { 
    data: projectAudioFiles 
  } = trpc.file.getUserFiles.useQuery(
    {
      limit: 1000,
      fileType: 'audio',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );

  // Fetch MIDI visualization data
  const { 
    data: fileData, 
    isLoading: fileLoading, 
    error: fileError 
  } = trpc.midi.getVisualizationData.useQuery(
    { fileId: selectedFileId! },
    { enabled: !!selectedFileId && !useDemoData }
  );

  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const projectId = searchParams.get('projectId');
    
    if (projectId) {
      setCurrentProjectId(projectId);
      setUseDemoData(false);
    }
    
    if (fileId) {
      setSelectedFileId(fileId);
      setUseDemoData(false);
    }

    // If no project or file is specified, default to demo mode
    if (!projectId && !fileId) {
      setUseDemoData(true);
    }

    const projectIdFromParams = searchParams.get('projectId');
    if (!projectIdFromParams) {
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }

    // Mark as initialized after processing URL params
    setIsInitialized(true);
  }, [searchParams]);

  // Helper to sort stems: non-master first, master last
  function sortStemsWithMasterLast(stems: any[]) {
    return [...stems].sort((a, b) => {
      if (a.is_master && !b.is_master) return 1;
      if (!a.is_master && b.is_master) return -1;
      return 0;
    });
  }

  // Load stems when project audio files are available
  useEffect(() => {
    // This effect now correctly handles both initial load and changes to project files
    if (projectAudioFiles?.files && currentProjectId && isInitialized && !audioAnalysis.isLoading) {
      let cancelled = false;
      
      const loadStemsWithUrls = async () => {
        // Prevent re-loading if already in progress
        if (isLoadingStemsRef.current) return;
        isLoadingStemsRef.current = true;

        try {
          const audioFiles = projectAudioFiles.files.filter(file => 
            file.file_type === 'audio' && file.upload_status === 'completed'
          );

          if (audioFiles.length > 0) {
            debugLog.log('Found audio files, preparing to load:', audioFiles.map(f => f.file_name));
            debugLog.log('Master stem info:', audioFiles.map(f => ({ name: f.file_name, is_master: f.is_master })));
            
            // Debug: Log file structure to see what fields are available
            debugLog.log('Audio file structure sample:', audioFiles[0]);
            
            // Sort so master is last
            const sortedAudioFiles = sortStemsWithMasterLast(audioFiles.map(f => ({
              ...f,
              stemType: f.stem_type || getStemTypeFromFileName(f.file_name)
            })));

            const stemsToLoad = await Promise.all(
              sortedAudioFiles.map(async file => {
                // Debug: Check if file.id exists
                if (!file.id) {
                  debugLog.error('File missing ID:', file);
                  throw new Error(`File missing ID: ${file.file_name}`);
                }
                
                debugLog.log('Getting download URL for file:', { id: file.id, name: file.file_name });
                const result = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
                return {
                  id: file.id,
                  url: result.downloadUrl,
                  label: file.file_name,
                  isMaster: file.is_master || false,
                  stemType: file.stemType
                };
              })
            );

            if (!cancelled) {
              // Process non-master first, then master
              const nonMasterStems = stemsToLoad.filter(s => !s.isMaster);
              const masterStems = stemsToLoad.filter(s => s.isMaster);
              await stemAudio.loadStems(nonMasterStems, (stemId, audioBuffer) => {
                const stem = nonMasterStems.find(s => s.id === stemId);
                // Use ref to get current state to avoid stale closure
                const currentAnalysis = currentAnalysisRef.current;
                const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                debugLog.log('🎵 Stem loaded callback:', { 
                  stemId, 
                  stemType: stem?.stemType, 
                  hasAnalysis,
                  cachedAnalysisCount: currentAnalysis.length,
                  cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                });
                if (stem && !hasAnalysis) {
                  debugLog.log('🎵 Triggering analysis for stem:', stemId, stem.stemType);
                  audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                } else {
                  debugLog.log('🎵 Skipping analysis for stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                }
              });
              if (masterStems.length > 0) {
                await stemAudio.loadStems(masterStems, (stemId, audioBuffer) => {
                  const stem = masterStems.find(s => s.id === stemId);
                  // Use ref to get current state to avoid stale closure
                  const currentAnalysis = currentAnalysisRef.current;
                  const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                  debugLog.log('🎵 Master stem loaded callback:', { 
                    stemId, 
                    stemType: stem?.stemType, 
                    hasAnalysis,
                    cachedAnalysisCount: currentAnalysis.length,
                    cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                  });
                  if (stem && !hasAnalysis) {
                    debugLog.log('🎵 Triggering analysis for master stem:', stemId, stem.stemType);
                    audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                  } else {
                    debugLog.log('🎵 Skipping analysis for master stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                  }
                });
              }
            }
          } else {
            debugLog.log('No completed audio files found in project.');
          }
        } catch (error) {
          if (!cancelled) {
            debugLog.error('Failed to load stems:', error);
          }
        } finally {
          if (!cancelled) {
            isLoadingStemsRef.current = false;
          }
        }
      };
      
      loadStemsWithUrls();
      return () => { 
        cancelled = true; 
        isLoadingStemsRef.current = false;
      };
    }
  }, [projectAudioFiles?.files, currentProjectId, isInitialized, audioAnalysis.isLoading]); // Removed audioAnalysis.cachedAnalysis from dependencies

  

  const availableStems = projectAudioFiles?.files?.filter(file => 
    file.file_type === 'audio' && file.upload_status === 'completed'
  ) || [];

  // Load all analyses when stems are available
  useEffect(() => {
    if (availableStems.length > 0) {
      const stemIds = availableStems.map(stem => stem.id);
      audioAnalysis.loadAnalysis(stemIds);
    }
  }, [availableStems.length]); // Only depend on stem count, not the analysis functions



  const midiData = useDemoData ? sampleMidiData : (fileData?.midiData ? transformBackendToFrontendMidiData(fileData.midiData) : undefined);
  const visualizationSettings = useDemoData ? DEFAULT_VISUALIZATION_SETTINGS : (fileData?.settings || DEFAULT_VISUALIZATION_SETTINGS);

  const handleFileSelected = (fileId: string) => {
    setSelectedFileId(fileId);
    setUseDemoData(false);
    setCurrentTime(0);
    setPlaying(false);
    
    const params = new URLSearchParams(searchParams);
    params.set('fileId', fileId);
    router.push(`/creative-visualizer?${params.toString()}`, { scroll: false });
  };

  const handleDemoModeChange = useCallback((demoMode: boolean) => {
    setUseDemoData(demoMode);
    setCurrentTime(0);
    setPlaying(false);
    
    if (demoMode) {
      const params = new URLSearchParams(searchParams);
      params.delete('fileId');
      const newUrl = params.toString() ? `/creative-visualizer?${params.toString()}` : '/creative-visualizer';
      router.push(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

  const handlePlayPause = async () => {
    // Control both MIDI visualization and stem audio
    if (isPlaying) {
      stemAudio.pause();
      setPlaying(false);
    } else {
      // Only start if we have stems loaded
      if (hasStems) {
        try {
          await stemAudio.play();
          setPlaying(true);
        } catch (error) {
          debugLog.error('Failed to start audio playback:', error);
          setPlaying(false);
        }
      } else {
        setPlaying(true);
      }
    }
  };

  const handleReset = () => {
    stemAudio.stop();
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setShowPicker(false);
    const params = new URLSearchParams(searchParams);
    params.set('projectId', projectId);
    router.push(`/creative-visualizer?${params.toString()}`);
  };

  const handleCreateNew = () => {
    setShowPicker(false);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  


  

  // Check if stems are actually loaded in the audio controller, not just available in the project
  const hasStems = availableStems.length > 0 && stemAudio.stemsLoaded;
  
  // Check if we're currently loading stems
  const stemLoadingState = availableStems.length > 0 && !stemAudio.stemsLoaded;

  // Effects data for new sidebar (with categories and rarity)
  const effects: EffectUIData[] = [
    { 
      id: 'metaballs', 
      name: 'Metaballs Effect', 
      description: 'Organic, fluid-like visualizations that respond to audio intensity',
      category: 'Generative',
      rarity: 'Rare',
      image: '/effects/generative/metaballs.png',
      parameters: {} // <-- Added
    },
    { 
      id: 'midiHud', 
      name: 'HUD Effect', 
      description: 'Technical overlay displaying real-time audio analysis and MIDI data',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {} // <-- Added
    },
    { 
      id: 'particleNetwork', 
      name: 'Particle Effect', 
      description: 'Dynamic particle systems that react to rhythm and pitch',
      category: 'Generative',
      rarity: 'Mythic',
      image: '/effects/generative/particles.png',
      parameters: {} // Empty - modal is handled by ThreeVisualizer
    },
    { 
      id: 'imageSlideshow', 
      name: 'Image Slideshow', 
      description: 'Rhythmic image slideshow triggered by audio transients',
      category: 'Generative',
      rarity: 'Common',
      image: '/effects/generative/imageSlideshow.png',
      parameters: {
         triggerValue: 0,
         threshold: 0.5,
         opacity: 1.0,
         position: { x: 0.5, y: 0.5 },
         size: { width: 1.0, height: 1.0 },
         images: [] 
      }
    },
    { 
      id: 'asciiFilter', 
      name: 'ASCII Filter', 
      description: 'Converts layers beneath to ASCII art with audio-reactive parameters',
      category: 'Filters',
      rarity: 'Rare',
      parameters: {
        textSize: 0.4,
        gamma: 1.2,
        opacity: 0.87,
        contrast: 1.4,
        invert: 0.0,
        hideBackground: false
      }
    },
    { 
      id: 'bloomFilter', 
      name: 'Bloom Filter', 
      description: 'Adds cinematic bloom glow to everything below this layer',
      category: 'Filters',
      rarity: 'Rare',
      parameters: {
        intensity: 0.75,
        threshold: 0.55,
        softness: 0.35,
        radius: 0.35
      }
    },
    // HUD Overlay Effects
    { 
      id: 'waveform', 
      name: 'Waveform Overlay', 
      description: 'Real-time audio waveform visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'spectrogram', 
      name: 'Spectrogram Overlay', 
      description: 'Frequency vs time visualization with color mapping',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'peakMeter', 
      name: 'Peak/LUFS Meter', 
      description: 'Professional audio level metering with peak and LUFS measurements',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'stereometer', 
      name: 'Stereometer Overlay', 
      description: 'Stereo field visualization and correlation meter',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'oscilloscope', 
      name: 'Oscilloscope Overlay', 
      description: 'Real-time waveform oscilloscope with pitch tracking',
      category: 'Overlays',
      rarity: 'Mythic',
      parameters: {}
    },
    { 
      id: 'spectrumAnalyzer', 
      name: 'Spectrum Analyzer', 
      description: 'FFT-based frequency spectrum visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'midiMeter', 
      name: 'MIDI Activity Meter', 
      description: 'Real-time MIDI note and velocity visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'vuMeter', 
      name: 'VU Meter', 
      description: 'Classic VU meter with needle and bar styles',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'chromaWheel', 
      name: 'Chroma Wheel', 
      description: '12-note chroma wheel for pitch class visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'consoleFeed', 
      name: 'Data Feed', 
      description: 'Live data feed for MIDI, LUFS, FFT, and more',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    }
  ];

  const handleSelectEffect = (effectId: string) => {
    // Toggle the effect selection
    setSelectedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
    
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  const handleEffectDoubleClick = (effectId: string) => {
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  // Effect clip timeline is merged into layers via store; per-effect UI remains via modals



  const handleCloseEffectModal = (effectId: string) => {
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: false
    }));
  };

  // Video composition handlers moved into store (addLayer, updateLayer, deleteLayer, selectLayer)





  // Feature mapping handlers
  const handleMapFeature = (parameterId: string, featureId: string, stemType?: string) => {
    console.log('🎛️ [page.tsx] handleMapFeature called:', {
      parameterId,
      featureId,
      stemType,
      timestamp: Date.now()
    });
    
    // Fix: parameterId format is "{layerId}-{paramName}" where layerId may contain hyphens
    // Split from the end to get the last segment as paramName
    const lastDashIndex = parameterId.lastIndexOf('-');
    if (lastDashIndex === -1) {
      console.error('❌ [page.tsx] Invalid parameterId format (no dash found):', parameterId);
      return;
    }
    
    const layerOrEffectId = parameterId.substring(0, lastDashIndex);
    const paramName = parameterId.substring(lastDashIndex + 1);
    
    console.log('🎛️ [page.tsx] Creating mapping:', {
      parameterId,
      featureId,
      parameterName: paramName,
      layerOrEffectId,
      parsedCorrectly: layerOrEffectId && paramName
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId, 
        modulationAmount: 0.5 // Default to 50% (noon)
      } 
    }));
    
    // Special handling for ImageSlideshow triggerValue: also save to layer.settings.triggerSourceId
    if (paramName === 'triggerValue') {
      const slideshowLayer = layers.find(l => l.id === layerOrEffectId && l.type === 'effect' && l.effectType === 'imageSlideshow');
      if (slideshowLayer) {
        console.log('🖼️ [page.tsx] Saving triggerSourceId to layer settings:', {
          layerId: layerOrEffectId,
          featureId,
          currentSettings: slideshowLayer.settings
        });
        updateLayer(slideshowLayer.id, {
          ...slideshowLayer,
          settings: {
            ...slideshowLayer.settings,
            triggerSourceId: featureId
          }
        });
        console.log('🖼️ [page.tsx] Layer updated, new settings should include triggerSourceId:', featureId);
      } else {
        console.warn('🖼️ [page.tsx] Could not find slideshow layer for triggerValue mapping:', {
          layerOrEffectId,
          availableLayers: layers.filter(l => l.type === 'effect').map(l => ({ id: l.id, effectType: l.effectType }))
        });
      }
    }
    
    // Store feature name for display
    const featureName = featureId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    setFeatureNames(prev => ({ ...prev, [featureId]: featureName }));
    
    debugLog.log('🎛️ Mapping created successfully');
  };

  const handleUnmapFeature = (parameterId: string) => {
    // Fix: parameterId format is "{layerId}-{paramName}" where layerId may contain hyphens
    // Split from the end to get the last segment as paramName
    const lastDashIndex = parameterId.lastIndexOf('-');
    if (lastDashIndex === -1) {
      console.error('❌ [page.tsx] Invalid parameterId format (no dash found) in handleUnmapFeature:', parameterId);
      return;
    }
    
    const layerOrEffectId = parameterId.substring(0, lastDashIndex);
    const paramName = parameterId.substring(lastDashIndex + 1);
    debugLog.log('🎛️ Removing mapping:', {
      parameterId,
      currentMapping: mappings[parameterId]
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId: null, 
        modulationAmount: 0.5 
      } 
    }));
    
    // Special handling for ImageSlideshow triggerValue: also remove from layer.settings.triggerSourceId
    if (paramName === 'triggerValue') {
      const slideshowLayer = layers.find(l => l.id === layerOrEffectId && l.type === 'effect' && l.effectType === 'imageSlideshow');
      if (slideshowLayer) {
        console.log('🖼️ Removing triggerSourceId from layer settings:', layerOrEffectId);
        updateLayer(slideshowLayer.id, {
          ...slideshowLayer,
          settings: {
            ...slideshowLayer.settings,
            triggerSourceId: undefined
          }
        });
      }
    }
    
    debugLog.log('🎛️ Mapping removed successfully');
  };

  const handleModulationAmountChange = (parameterId: string, amount: number) => {
    setMappings(prev => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        modulationAmount: amount
      }
    }));
  };

  // Handler for selecting a stem/track
  const handleStemSelect = (stemId: string) => {
    debugLog.log('🎛️ Selecting stem:', {
      stemId,
      previousActiveTrack: activeTrackId,
      availableAnalyses: audioAnalysis.cachedAnalysis?.map(a => ({
        id: a.fileMetadataId,
        stemType: a.stemType,
        hasData: !!a.analysisData,
        features: a.analysisData ? Object.keys(a.analysisData) : []
      })) || []
    });
    
    setActiveTrackId(stemId);
    
    // Log the analysis data for the selected stem
    const selectedAnalysis = audioAnalysis.cachedAnalysis?.find(a => a.fileMetadataId === stemId);
    if (selectedAnalysis) {
      debugLog.log('🎛️ Selected stem analysis:', {
        stemId,
        stemType: selectedAnalysis.stemType,
        duration: selectedAnalysis.metadata.duration,
        features: selectedAnalysis.analysisData ? Object.keys(selectedAnalysis.analysisData) : [],
        sampleValues: selectedAnalysis.analysisData ? 
          Object.entries(selectedAnalysis.analysisData).reduce((acc, [feature, data]) => {
            if (Array.isArray(data) && data.length > 0) {
              acc[feature] = {
                length: data.length,
                firstValue: data[0],
                lastValue: data[data.length - 1],
                sampleValues: data.slice(0, 5) // First 5 values
              };
            }
            return acc;
          }, {} as Record<string, any>) : {}
      });
    } else {
      debugLog.warn('🎛️ No analysis found for selected stem:', stemId);
    }
  };

  // activeSliderValues now comes from visualizerStore
  const visualizerRef = useRef<any>(null);
  const animationFrameId = useRef<number>();

  // Sync project-wide background settings to the visualizer engine
  const { backgroundColor, isBackgroundVisible } = useProjectSettingsStore();
  useEffect(() => {
    const manager = visualizerRef.current;
    if (!manager) return;
    try {
      if (typeof manager.setBackgroundColor === 'function') {
        manager.setBackgroundColor(backgroundColor);
      }
      if (typeof manager.setBackgroundVisibility === 'function') {
        manager.setBackgroundVisibility(isBackgroundVisible);
      }
    } catch {}
  }, [backgroundColor, isBackgroundVisible, visualizerRef]);

  // Function to convert frontend feature names to backend analysis keys
  const getAnalysisKeyFromFeatureId = (featureId: string): string => {
    // Frontend feature IDs are like "drums-rms-volume", "bass-loudness", etc.
    // Backend analysis data has keys like "rms", "loudness", etc.
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      // Remove the stem type prefix and get the feature name
      const featureName = parts.slice(1).join('-');
      
      // Map frontend feature names to backend analysis keys
      const featureMapping: Record<string, string> = {
        'rms-volume': 'rms',
        'loudness': 'loudness',
        'spectral-centroid': 'spectralCentroid',
        'spectral-rolloff': 'spectralRolloff',
        'spectral-flux': 'spectralFlux',
        'mfcc-1': 'mfcc_0', // Meyda uses 0-indexed MFCC
        'mfcc-2': 'mfcc_1',
        'mfcc-3': 'mfcc_2',
        'perceptual-spread': 'perceptualSpread',
        'energy': 'energy',
        'zcr': 'zcr',
        'beat-intensity': 'beatIntensity',
        'rhythm-pattern': 'rhythmPattern',
        'attack-time': 'attackTime',
        'chroma-vector': 'chromaVector',
        'harmonic-content': 'harmonicContent',
        'sub-bass': 'subBass',
        'warmth': 'warmth',
        'spectral-complexity': 'spectralComplexity',
        'texture': 'texture',
        'pitch-height': 'pitchHeight',
        'pitch-movement': 'pitchMovement',
        'melody-complexity': 'melodyComplexity',
        'expression': 'expression'
      };
      
      return featureMapping[featureName] || featureName;
    }
    return featureId; // Fallback to original if no prefix
  };

  // Function to get the stem type from a feature ID
  const getStemTypeFromFeatureId = (featureId: string): string | null => {
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      return parts[0]; // First part is the stem type
    }
    return null;
  };

  // Track when visualizer ref becomes available
  useEffect(() => {
    if (visualizerRef.current) {
      debugLog.log('🎛️ Visualizer ref available:', {
        hasRef: !!visualizerRef.current,
        availableEffects: visualizerRef.current?.getAllEffects?.()?.map((e: any) => e.id) || [],
        selectedEffects: Object.keys(selectedEffects).filter(k => selectedEffects[k])
      });
    } else {
      debugLog.log('🎛️ Visualizer ref not available yet');
    }
  }, [visualizerRef.current, selectedEffects]);

  // Refs to access latest state in animation loop without restarting it
  const layersRef = useRef(layers);
  const mappingsRef = useRef(mappings);
  const baseParameterValuesRef = useRef(baseParameterValues);
  const activeSliderValuesRef = useRef(activeSliderValues);
  const cachedAnalysisRef = useRef(audioAnalysis.cachedAnalysis);

  // Keep refs synced with state changes
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { baseParameterValuesRef.current = baseParameterValues; }, [baseParameterValues]);
  useEffect(() => { activeSliderValuesRef.current = activeSliderValues; }, [activeSliderValues]);
  useEffect(() => { cachedAnalysisRef.current = audioAnalysis.cachedAnalysis; }, [audioAnalysis.cachedAnalysis]);

  // Real-time feature mapping and visualizer update loop
  useEffect(() => {
    let cachedMappings: [string, string][] = [];
    let lastUpdateTime = 0;
    let frameCount = 0;

    const animationLoop = () => {
      if (!isPlaying || !visualizerRef.current) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      // 30FPS CAP
      const now = performance.now();
      const elapsed = now - lastUpdateTime;
      const targetFrameTime = 1000 / 30;
      
      if (elapsed < targetFrameTime) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      lastUpdateTime = now;
      frameCount++;
      
      // Use Refs to get latest state without closure staleness
      const currentLayers = layersRef.current;
      const currentMappings = mappingsRef.current;
      const currentBaseValues = baseParameterValuesRef.current;
      const currentActiveSliderValues = activeSliderValuesRef.current;
      const currentCachedAnalysis = cachedAnalysisRef.current;

      // Get current audio time
      const time = stemAudio.currentTime;
      setCurrentTime(time);
      
      // Sync calculation
      const audioContextTime = stemAudio.getAudioContextTime?.() || 0;
      const scheduledStartTime = stemAudio.scheduledStartTimeRef?.current || 0;
      const measuredLatency = stemAudio.getAudioLatency?.() || 0;
      const audioPlaybackTime = Math.max(0, audioContextTime - scheduledStartTime);
      let syncTime = Math.max(0, audioPlaybackTime - measuredLatency + (syncOffsetMs / 1000));
      
      // Handle audio looping by wrapping syncTime to analysis duration
      if (currentCachedAnalysis.length > 0) {
        const analysisDuration = currentCachedAnalysis[0]?.metadata?.duration || 1;
        if (analysisDuration > 0) {
          syncTime = syncTime % analysisDuration;
        }
      }

      // Cache mappings - only update when mappings actually change
      const newCachedMappings = Object.entries(currentMappings)
          .filter(([, mapping]) => mapping.featureId !== null)
          .map(([paramKey, mapping]) => [paramKey, mapping.featureId!]) as [string, string][];
        
      // Check if mappings actually changed by comparing keys and values
      const mappingsChanged = cachedMappings.length !== newCachedMappings.length ||
        cachedMappings.some(([key, val], idx) => {
          const newMapping = newCachedMappings[idx];
          return !newMapping || newMapping[0] !== key || newMapping[1] !== val;
        }) ||
        newCachedMappings.some(([key, val], idx) => {
          const oldMapping = cachedMappings[idx];
          return !oldMapping || oldMapping[0] !== key || oldMapping[1] !== val;
        });
      
      if (mappingsChanged) {
        const oldMappings = new Map(cachedMappings);
        cachedMappings = newCachedMappings;
        
        // Log when mappings are created or updated (only once)
        const newMappings = cachedMappings.filter(([key, featureId]) => 
          !oldMappings.has(key) || oldMappings.get(key) !== featureId
        );
        const opacityMappings = cachedMappings.filter(([key]) => key.includes('-opacity'));
        
        if (newMappings.length > 0) {
          console.log('🎯 Mappings updated:', {
            totalMappings: cachedMappings.length,
            newMappings: newMappings.map(([key, featureId]) => ({ paramKey: key, featureId })),
            opacityMappings: opacityMappings.map(([key, featureId]) => ({ paramKey: key, featureId }))
          });
        }
      }

      // General Audio Feature Mapping
      if (currentCachedAnalysis && currentCachedAnalysis.length > 0) {
        // Debug: log once per second if we have opacity mappings
        const hasOpacityMapping = cachedMappings.some(([key]) => key.includes('-opacity'));
        if (hasOpacityMapping && frameCount % 60 === 0) {
          console.log('🎚️ Audio mapping loop active:', {
            cachedMappingsCount: cachedMappings.length,
            opacityMappings: cachedMappings.filter(([key]) => key.includes('-opacity')).map(([key, id]) => ({ key, id })),
            cachedAnalysisCount: currentCachedAnalysis.length,
            syncTime: syncTime.toFixed(3),
            isPlaying
          });
        }
        
        for (const [paramKey, featureId] of cachedMappings) {
          if (!featureId) continue;

          const featureStemType = getStemTypeFromFeatureId(featureId);
          if (!featureStemType) {
            if (paramKey.includes('-opacity') && frameCount % 60 === 0) {
              console.warn('⚠️ Could not get stem type from featureId:', { paramKey, featureId });
            }
            continue;
          }

          const stemAnalysis = currentCachedAnalysis?.find(
            a => a.stemType === featureStemType
          );
          if (!stemAnalysis) {
            if (paramKey.includes('-opacity') && frameCount % 60 === 0) {
              console.warn('⚠️ Stem analysis not found:', { paramKey, featureId, featureStemType, availableStems: currentCachedAnalysis.map(a => a.stemType) });
            }
            continue;
          }

          const rawValue = audioAnalysis.getFeatureValue(
            stemAnalysis.fileMetadataId,
            featureId,
            syncTime,
            featureStemType
          );

          if (rawValue === null || rawValue === undefined) {
            if (paramKey.includes('-opacity') && frameCount % 60 === 0) {
              console.warn('⚠️ Raw value is null/undefined:', { paramKey, featureId, syncTime: syncTime.toFixed(3) });
            }
            continue;
          }

          const [effectId, ...paramParts] = paramKey.split('-');
          const paramName = paramParts.join('-');
          
          if (!effectId || !paramName) {
            if (paramKey.includes('-opacity') && frameCount % 60 === 0) {
              console.warn('⚠️ Could not parse paramKey:', { paramKey, effectId, paramName });
            }
            continue;
          }

          const maxValue = getSliderMax(paramName);
          const knobFull = (currentMappings[paramKey]?.modulationAmount ?? 0.5) * 2 - 1; 
          const knob = Math.max(-0.5, Math.min(0.5, knobFull));
          const baseValue = currentBaseValues[paramKey] ?? (currentActiveSliderValues[paramKey] ?? 0);
          const delta = rawValue * knob * maxValue;
          const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));

          // Log opacity mapping updates every 30 frames (~0.5 seconds at 60fps)
          if (paramName === 'opacity' && frameCount % 30 === 0) {
            console.log('🎚️ Audio mapping calculating opacity:', {
              paramKey,
              effectId,
              paramName,
              featureId,
              rawValue,
              baseValue,
              knob,
              delta,
              scaledValue,
              maxValue,
              syncTime: syncTime.toFixed(3)
            });
          }

          visualizerRef.current.updateEffectParameter(effectId, paramName, scaledValue);
          
          if (frameCount % 10 === 0) {
            setModulatedParameterValues(prev => ({ ...prev, [paramKey]: scaledValue }));
          }
        }
      } else {
        // Log when audio mapping loop doesn't run
        if (cachedMappings.length > 0 && frameCount % 120 === 0) {
          console.warn('⚠️ Audio mapping loop not running:', {
            cachedMappingsCount: cachedMappings.length,
            hasCachedAnalysis: !!currentCachedAnalysis,
            cachedAnalysisLength: currentCachedAnalysis?.length || 0,
            isPlaying
          });
        }
      }
      
      // Handle timeline-specific audio triggers (e.g., Image Slideshow trigger)
      if (currentLayers.length > 0 && currentCachedAnalysis.length > 0) {
        currentLayers.forEach(layer => {
          if (layer.settings && layer.settings.triggerSourceId) {
            const featureId = layer.settings.triggerSourceId;
            const featureStemType = getStemTypeFromFeatureId(featureId);
            
            if (featureStemType) {
              const stemAnalysis = currentCachedAnalysis?.find(
                a => a.stemType === featureStemType
              );
              
              if (stemAnalysis) {
                const rawValue = audioAnalysis.getFeatureValue(
                  stemAnalysis.fileMetadataId,
                  featureId,
                  syncTime,
                  featureStemType
                );
                
                if (rawValue !== undefined) {
                  // Debug log every 30 frames (roughly twice per second at 60fps)
                  if (frameCount % 30 === 0) {
                    console.log('🖼️ [page.tsx] Updating triggerValue:', {
                      layerId: layer.id,
                      featureId,
                      rawValue: rawValue.toFixed(4),
                      syncTime: syncTime.toFixed(2),
                      hasVisualizer: !!visualizerRef.current
                    });
                  }
                  visualizerRef.current?.updateEffectParameter(layer.id, 'triggerValue', rawValue);
                } else {
                  if (frameCount % 60 === 0) {
                    console.warn('🖼️ [page.tsx] rawValue is undefined for trigger:', { layerId: layer.id, featureId });
                  }
                }
              } else {
                if (frameCount % 60 === 0) {
                  console.warn('🖼️ [page.tsx] No stemAnalysis found for trigger:', { layerId: layer.id, featureId, featureStemType });
                }
              }
            } else {
              if (frameCount % 60 === 0) {
                console.warn('🖼️ [page.tsx] No featureStemType for trigger:', { layerId: layer.id, featureId });
              }
            }
          } else {
            // Log once per second if we have slideshow layers without triggerSourceId
            if (frameCount % 60 === 0 && layer.type === 'effect' && layer.effectType === 'imageSlideshow') {
              console.log('🖼️ [page.tsx] Slideshow layer has no triggerSourceId:', {
                layerId: layer.id,
                settings: layer.settings
              });
            }
          }
        });
      }

      animationFrameId.current = requestAnimationFrame(animationLoop);
    };

    animationFrameId.current = requestAnimationFrame(animationLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [
    isPlaying, 
    stemAudio, 
    syncOffsetMs
    // Removed 'layers', 'mappings', etc. from deps to prevent loop restarts.
    // They are accessed via refs inside the loop.
  ]);
  
  const getSliderMax = (paramName: string) => {
    if (paramName === 'base-radius') return 1.0;
    if (paramName === 'animation-speed') return 2.0;
    if (paramName === 'glow-intensity') return 3.0;
    if (paramName === 'hud-opacity') return 1.0;
    if (paramName === 'opacity') return 1.0; // For image slideshow and other effects
    if (paramName === 'max-particles') return 200;
    if (paramName === 'connection-distance') return 5.0;
    if (paramName === 'particle-size') return 50;
    // ASCII Filter parameters
    if (paramName === 'textSize') return 1.0;
    if (paramName === 'gamma') return 2.2;
    if (paramName === 'contrast') return 2.0;
    if (paramName === 'invert') return 1.0;
    // Bloom Filter parameters
    if (paramName === 'intensity') return 2.0;
    if (paramName === 'threshold') return 1.0;
    if (paramName === 'softness') return 1.0;
    if (paramName === 'radius') return 1.0;
    return 100; // Default max for other numeric parameters
  };

  const getSliderStep = (paramName: string) => {
    if (paramName === 'base-radius') return 0.1;
    if (paramName === 'animation-speed') return 0.1;
    if (paramName === 'glow-intensity') return 0.1;
    if (paramName === 'hud-opacity') return 0.1;
    if (paramName === 'opacity') return 0.01; // Fine-grained control for opacity
    if (paramName === 'max-particles') return 10;
    if (paramName === 'connection-distance') return 0.1;
    if (paramName === 'particle-size') return 5;
    // ASCII Filter parameters
    if (paramName === 'textSize') return 0.01;
    if (paramName === 'gamma') return 0.01;
    if (paramName === 'contrast') return 0.01;
    if (paramName === 'invert') return 1.0; // Binary toggle
    // Bloom Filter parameters
    if (paramName === 'intensity') return 0.01;
    if (paramName === 'threshold') return 0.01;
    if (paramName === 'softness') return 0.01;
    if (paramName === 'radius') return 0.01;
    return 1; // Default step for other numeric parameters
  };

  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    const paramKey = `${effectId}-${paramName}`;
    // Slider sets the base value regardless of mapping
    setBaseParameterValues(prev => ({ ...prev, [paramKey]: value }));
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
    
    // Update the effect instance directly
    if (visualizerRef.current) {
        visualizerRef.current.updateEffectParameter(effectId, paramName, value);
    }
    
    // Also update layer settings for persistence (especially for slideshow position/size/opacity)
    const layer = layers.find(l => l.id === effectId && l.type === 'effect');
    if (layer) {
      updateLayer(layer.id, {
        ...layer,
        settings: {
          ...layer.settings,
          [paramName]: value
        }
      });
    }
  };

  const effectModals = Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
    if (!isOpen) return null;
    const effectInstance = effects.find(e => e.id === effectId);
    if (!effectInstance) return null;

    // Special case for Image Slideshow to show Collection Manager
    if (effectId === 'imageSlideshow') {
      const initialPos = { x: 100 + (index * 50), y: 100 + (index * 50) };
      // Find the layer with this effect type - the effect instance uses the layer ID, not the effect type ID
      const slideshowLayer = layers.find(l => l.type === 'effect' && l.effectType === 'imageSlideshow');
      const layerId = slideshowLayer?.id || effectId; // Fallback to effectId if no layer found
      
      return (
        <PortalModal
          key={effectId}
          title="Slideshow Collections"
          isOpen={isOpen}
          onClose={() => handleCloseEffectModal(effectId)}
          initialPosition={initialPos}
          bounds="#editor-bounds"
          modalWidth={520}
          className="w-[520px]"
        >
          <div className="max-w-full">
            <CollectionManager
              projectId={currentProjectId || ''}
              availableFiles={projectFiles?.files || []}
              onSelectCollection={(imageUrls, collectionId) => {
                // Use layerId instead of effectId - the effect instance is keyed by layer ID
                console.log('🖼️ Collection selected, updating effect with layerId:', layerId, 'imageUrls count:', imageUrls.length);
                handleParameterChange(layerId, 'images', imageUrls);
                setActiveCollectionId(collectionId);
              }}
              selectedCollectionId={activeCollectionId}
            />
            <div className="mt-4 pt-4 border-t border-white/10">
                <Label className="text-xs uppercase text-stone-400 mb-2 block">Playback Settings</Label>
                
                <div className="space-y-4">
                  <DroppableParameter
                    parameterId={`${layerId}-triggerValue`}
                    label="Advance Trigger"
                    mappedFeatureId={slideshowLayer?.settings?.triggerSourceId || mappings[`${layerId}-triggerValue`]?.featureId}
                    mappedFeatureName={slideshowLayer?.settings?.triggerSourceId ? featureNames[slideshowLayer.settings.triggerSourceId] : (mappings[`${layerId}-triggerValue`]?.featureId ? featureNames[mappings[`${layerId}-triggerValue`]?.featureId!] : undefined)}
                    modulationAmount={mappings[`${layerId}-triggerValue`]?.modulationAmount ?? 0.5}
                    baseValue={baseParameterValues[`${layerId}-triggerValue`] ?? 0}
                    modulatedValue={modulatedParameterValues[`${layerId}-triggerValue`] ?? 0}
                    sliderMax={1}
                    onFeatureDrop={handleMapFeature}
                    onFeatureUnmap={handleUnmapFeature}
                    onModulationAmountChange={handleModulationAmountChange}
                    dropZoneStyle="inlayed"
                  >
                     <div className="h-2 bg-stone-800 rounded overflow-hidden mt-1">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-75"
                            style={{ width: `${(modulatedParameterValues[`${layerId}-triggerValue`] || 0) * 100}%` }}
                        />
                     </div>
                     <div className="text-[10px] text-stone-500 mt-1">
                        {(slideshowLayer?.settings?.triggerSourceId || mappings[`${layerId}-triggerValue`]?.featureId)
                            ? "Mapped to audio analysis" 
                            : "Drag 'Transients' here to trigger slides"}
                     </div>
                  </DroppableParameter>

                  <div className="space-y-1">
                    <Label className="text-xs">Threshold</Label>
                    <Slider
                        value={[activeSliderValues[`${layerId}-threshold`] ?? 0.5]}
                        onValueChange={([val]) => {
                            setActiveSliderValues(prev => ({ ...prev, [`${layerId}-threshold`]: val }));
                            handleParameterChange(layerId, 'threshold', val);
                        }}
                        min={0}
                        max={1.0}
                        step={0.01}
                    />
                    <div className="text-[10px] text-stone-500 mt-1">
                      Trigger fires when value exceeds threshold (current: {(activeSliderValues[`${layerId}-threshold`] ?? 0.5).toFixed(2)})
                    </div>
                  </div>

                  {(() => {
                    const paramKey = `${layerId}-opacity`;
                    const opacityMapping = mappings[paramKey];
                    const mappedFeatureId = opacityMapping?.featureId || null;
                    const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
                    const baseVal = baseParameterValues[paramKey] ?? (activeSliderValues[paramKey] ?? (slideshowLayer?.settings?.opacity ?? 1.0));
                    const modulatedVal = modulatedParameterValues[paramKey] ?? baseVal;
                    return (
                      <DroppableParameter
                        parameterId={paramKey}
                        label="Opacity"
                        mappedFeatureId={mappedFeatureId}
                        mappedFeatureName={mappedFeatureName}
                        modulationAmount={opacityMapping?.modulationAmount ?? 0.5}
                        baseValue={baseVal}
                        modulatedValue={modulatedVal}
                        sliderMax={1.0}
                        onFeatureDrop={handleMapFeature}
                        onFeatureUnmap={handleUnmapFeature}
                        onModulationAmountChange={handleModulationAmountChange}
                        className="mb-2"
                        dropZoneStyle="inlayed"
                        showTagOnHover
                      >
                        <div className="relative z-20">
                          <Slider
                            value={[baseVal]}
                            onValueChange={([val]) => {
                              // Update base value (not the modulated value)
                              setBaseParameterValues(prev => ({ ...prev, [paramKey]: val }));
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(layerId, 'opacity', val);
                            }}
                            min={0}
                            max={1.0}
                            step={0.01}
                            className="w-full"
                          />
                        </div>
                      </DroppableParameter>
                    );
                  })()}
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
                <Label className="text-xs uppercase text-stone-400 mb-2 block">Position & Size</Label>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Position X</Label>
                      <Slider
                          value={[activeSliderValues[`${layerId}-positionX`] ?? (slideshowLayer?.settings?.position?.x ?? 0.5)]}
                          onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [`${layerId}-positionX`]: val }));
                              const currentPos = slideshowLayer?.settings?.position || { x: 0.5, y: 0.5 };
                              handleParameterChange(layerId, 'position', { ...currentPos, x: val });
                          }}
                          min={0}
                          max={1.0}
                          step={0.01}
                      />
                      <div className="text-[10px] text-stone-500 mt-1">
                        {(activeSliderValues[`${layerId}-positionX`] ?? (slideshowLayer?.settings?.position?.x ?? 0.5)).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Position Y</Label>
                      <Slider
                          value={[activeSliderValues[`${layerId}-positionY`] ?? (slideshowLayer?.settings?.position?.y ?? 0.5)]}
                          onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [`${layerId}-positionY`]: val }));
                              const currentPos = slideshowLayer?.settings?.position || { x: 0.5, y: 0.5 };
                              handleParameterChange(layerId, 'position', { ...currentPos, y: val });
                          }}
                          min={0}
                          max={1.0}
                          step={0.01}
                      />
                      <div className="text-[10px] text-stone-500 mt-1">
                        {(activeSliderValues[`${layerId}-positionY`] ?? (slideshowLayer?.settings?.position?.y ?? 0.5)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Width</Label>
                      <Slider
                          value={[activeSliderValues[`${layerId}-sizeWidth`] ?? (slideshowLayer?.settings?.size?.width ?? 1.0)]}
                          onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [`${layerId}-sizeWidth`]: val }));
                              const currentSize = slideshowLayer?.settings?.size || { width: 1.0, height: 1.0 };
                              handleParameterChange(layerId, 'size', { ...currentSize, width: val });
                          }}
                          min={0.1}
                          max={1.0}
                          step={0.01}
                      />
                      <div className="text-[10px] text-stone-500 mt-1">
                        {(activeSliderValues[`${layerId}-sizeWidth`] ?? (slideshowLayer?.settings?.size?.width ?? 1.0)).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Height</Label>
                      <Slider
                          value={[activeSliderValues[`${layerId}-sizeHeight`] ?? (slideshowLayer?.settings?.size?.height ?? 1.0)]}
                          onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [`${layerId}-sizeHeight`]: val }));
                              const currentSize = slideshowLayer?.settings?.size || { width: 1.0, height: 1.0 };
                              handleParameterChange(layerId, 'size', { ...currentSize, height: val });
                          }}
                          min={0.1}
                          max={1.0}
                          step={0.01}
                      />
                      <div className="text-[10px] text-stone-500 mt-1">
                        {(activeSliderValues[`${layerId}-sizeHeight`] ?? (slideshowLayer?.settings?.size?.height ?? 1.0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </PortalModal>
      );
    }

    // All other effects are handled by three-visualizer.tsx
    // Return null to prevent duplicate modals
            return null;
  });

  // Helper to infer stem type from file name
  const getStemTypeFromFileName = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.includes('bass')) return 'bass';
    if (lower.includes('drum')) return 'drums';
    if (lower.includes('vocal')) return 'vocals';
    return 'other';
  };

  // Find the selected stem and its type
  const selectedStem = availableStems.find(stem => stem.id === activeTrackId);
  // Use the actual stem_type from the database, fallback to filename inference
  const selectedStemType = selectedStem 
    ? (selectedStem.stem_type || getStemTypeFromFileName(selectedStem.file_name))
    : undefined;

  // Helper to get the master stem (if available)
  const getMasterStem = () => availableStems.find(stem => stem.is_master);

  // Helper to get the correct duration (master audio if available, else fallback)
  const getCurrentDuration = () => {
    if (hasStems && stemAudio.duration && stemAudio.duration > 0) {
      return stemAudio.duration;
    }
    return (midiData || sampleMidiData).file.duration;
  };

  // Keep timeline store duration in sync with audio/midi duration
  useEffect(() => {
    try {
      const d = getCurrentDuration();
      if (typeof d === 'number' && isFinite(d) && d > 0) {
        setDuration(d);
      }
    } catch {}
  }, [hasStems, stemAudio.duration, midiData, sampleMidiData, setDuration]);

  // Update currentTime from stemAudio if stems are loaded
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const update = () => {
      if (hasStems) {
        const duration = getCurrentDuration();
        let displayTime = stemAudio.currentTime;
        
        // If looping is enabled, show position within the current loop cycle
        if (stemAudio.isLooping && duration > 0) {
          displayTime = stemAudio.currentTime % duration;
        }
        
        setCurrentTime(displayTime);
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, hasStems, stemAudio]);


  // In the render, use the sorted stems
  const sortedAvailableStems = sortStemsWithMasterLast(availableStems);

  // Log audio files before building stemUrlMap
  useEffect(() => {
    debugLog.log('[CreativeVisualizerPage] projectAudioFiles.files:', projectAudioFiles?.files);
  }, [projectAudioFiles?.files]);

  // State for asynchronously built stemUrlMap
  const [asyncStemUrlMap, setAsyncStemUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchUrls() {
      if (!projectAudioFiles?.files) return;
      const audioFiles = projectAudioFiles.files.filter(f => f.file_type === 'audio' && f.upload_status === 'completed');
      
      // Debug: Log file structure
      debugLog.log('fetchUrls - projectAudioFiles.files:', projectAudioFiles.files);
      debugLog.log('fetchUrls - audioFiles:', audioFiles);
      
      const entries = await Promise.all(audioFiles.map(async f => {
        let url = f.downloadUrl;
        if (!url && getDownloadUrlMutation) {
          try {
            // Debug: Check if f.id exists
            if (!f.id) {
              debugLog.error('fetchUrls - File missing ID:', f);
              return [f.id, null];
            }
            
            debugLog.log('fetchUrls - Getting download URL for file:', { id: f.id, name: f.file_name });
            const result = await getDownloadUrlMutation.mutateAsync({ fileId: f.id });
            url = result.downloadUrl;
          } catch (err) {
            debugLog.error('[CreativeVisualizerPage] Failed to fetch downloadUrl for', f.id, err);
          }
        }
        return [f.id, url];
      }));
      const map = Object.fromEntries(entries.filter(([id, url]) => !!url));
      setAsyncStemUrlMap(map);
      if (Object.keys(map).length > 0) {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap populated:', map);
      } else {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap is empty');
      }
    }
    fetchUrls();
  }, [projectAudioFiles?.files]);

  const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0;

  // Don't render anything until we're on the client side
  if (!isClient) {
    return (
      <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-sm text-stone-300">Loading...</div>
        </div>
      </div>
    );
  }

  // If no project is selected, show the picker
  if (!currentProjectId && !useDemoData) {
    return (
      <>
        {showPicker && (
          <ProjectPickerModal
            isOpen={showPicker}
            onClose={() => router.push('/dashboard')}
            onSelect={handleProjectSelect}
            onCreateNew={handleCreateNew}
          />
        )}
        {showCreateModal && (
          <ProjectCreationModal
            isOpen={showCreateModal}
            onClose={handleCloseCreateModal}
          />
        )}
        <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-sm text-stone-300">Please create or select a project.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <HudOverlayProvider 
      cachedAnalysis={audioAnalysis.cachedAnalysis}
      stemAudio={stemAudio}
      stemUrlMap={asyncStemUrlMap}
    >
      {showPicker && (
        <ProjectPickerModal
          isOpen={showPicker}
          onClose={() => router.push('/dashboard')}
          onSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
        />
      )}
      {showCreateModal && (
        <ProjectCreationModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
        />
      )}
      {currentProjectId ? (
        <AutoSaveProvider projectId={currentProjectId}>
          <DndProvider backend={HTML5Backend}>
            {/* Main visualizer UI */}
            <div className="flex h-screen bg-stone-800 text-white min-w-0 creative-visualizer-text">
          <CollapsibleSidebar>
            <div className="space-y-4">
              <MappingSourcesPanel 
                activeTrackId={activeTrackId || undefined}
                className="mb-4"
                selectedStemType={selectedStemType}
                currentTime={currentTime}
                cachedAnalysis={audioAnalysis.cachedAnalysis}
                isPlaying={isPlaying}
              />
              <FileSelector 
                onFileSelected={handleFileSelected}
                selectedFileId={selectedFileId || undefined}
                useDemoData={useDemoData}
                onDemoModeChange={handleDemoModeChange}
                projectId={currentProjectId || undefined}
                projectName={projectData?.name}
              />
            </div>
          </CollapsibleSidebar>
          <main className="flex-1 flex overflow-hidden min-w-0">
            {/* Editor bounds container with proper positioning context */}
            <div 
              id="editor-bounds" 
              className="relative flex-1 flex flex-col overflow-hidden min-w-0"
              style={{ 
                height: '100vh',
                position: 'relative',
                contain: 'layout'
              }}
            >
          {/* Top Control Bar */}
          <div className="p-2 bg-stone-900/50 border-b border-white/10">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <Button 
                  onClick={handlePlayPause} 
                  size="sm" 
                    disabled={stemLoadingState}
                  className={`font-mono text-xs uppercase tracking-wider px-4 py-2 transition-all duration-300 ${
                      stemLoadingState 
                      ? 'bg-stone-600 text-stone-400 cursor-not-allowed' 
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                    {stemLoadingState ? (
                    <>
                      <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                      LOADING
                    </>
                  ) : (
                    <>
                      {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                    disabled={stemLoadingState}
                  onClick={() => stemAudio.setLooping(!stemAudio.isLooping)}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-3 py-1 ${
                      stemLoadingState 
                      ? 'opacity-50 cursor-not-allowed' 
                      : stemAudio.isLooping ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  🔄 {stemAudio.isLooping ? 'LOOP' : 'LOOP'}
                </Button>
                <Button 
                  variant="outline" 
                    disabled={stemLoadingState}
                  onClick={handleReset} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 px-3 py-1 ${
                      stemLoadingState ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  RESET
                </Button>
                  
                  {/* Stats Section - Compact layout */}
                  <div className="flex items-center gap-1 overflow-hidden">
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <span className="font-creative-mono">{currentTime.toFixed(1)}</span><span className="font-creative-mono">S</span> / <span className="font-creative-mono">{getCurrentDuration().toFixed(1)}</span><span className="font-creative-mono">S</span>
                </div>
                {/* BPM on the left, FPS on the right */}
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  BPM: <span className="font-creative-mono">{(() => {
                    const masterId = projectAudioFiles?.files?.find(f => f.is_master)?.id;
                    const ca = audioAnalysis.cachedAnalysis || [];
                    const master = masterId ? ca.find((a: any) => a.fileMetadataId === masterId) : null;
                    const candidate: any = master ?? ca[0];
                    const bpmVal = candidate?.bpm ?? candidate?.metadata?.bpm ?? candidate?.analysisData?.bpm;
                    return typeof bpmVal === 'number' && isFinite(bpmVal) ? Math.round(bpmVal) : '—';
                  })()}</span>
                </div>
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  FPS: <span className="font-creative-mono">{fps}</span>
                </div>
                
              </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <AutoSaveTopBar />
                <AspectRatioSelector
                  currentAspectRatio={visualizerAspectRatio}
                  onAspectRatioChange={setVisualizerAspectRatio}
                  disabled={stemLoadingState}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowVideoComposition(!showVideoComposition)} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1 ${
                    showVideoComposition ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                    🎬 {showVideoComposition ? 'COMP' : 'VIDEO'}
                </Button>
                
                {/* Test Video Composition Controls */}
                {showVideoComposition && (
                  <TestVideoComposition
                    onAddLayer={addLayer}
                    className="ml-2"
                  />
                )}
                  
                </div>
              </div>
            </div>
            
            {/* Visualizer Area - Scrollable Layout */}
            <div className="flex-1 flex flex-col overflow-hidden bg-stone-900 relative">
              <div className="flex-1 flex flex-col min-h-0 px-4 overflow-y-auto">
                {/* Visualizer Container - Responsive with aspect ratio */}
                <div className="flex-shrink-0 mb-4">
                  <div 
                    className="relative mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-lg flex items-center justify-center"
                    style={{ 
                      height: 'min(calc(100vh - 400px), 60vh)', // Reduced height to make room for stem panel
                      minHeight: '200px',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                  <ThreeVisualizer
                      midiData={midiData || sampleMidiData}
                      settings={settings}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      onLayerSelect={selectLayer}
                      onPlayPause={handlePlayPause}
                      onSettingsChange={setSettings}
                      onFpsUpdate={setFps}
                      selectedEffects={selectedEffects}
                      aspectRatio={visualizerAspectRatio}
                          // Modal and mapping props
                          openEffectModals={openEffectModals}
                          onCloseEffectModal={handleCloseEffectModal}
                          mappings={mappings}
                          featureNames={featureNames}
                          onMapFeature={handleMapFeature}
                          onUnmapFeature={handleUnmapFeature}
                          onModulationAmountChange={handleModulationAmountChange}
                          activeSliderValues={activeSliderValues}
                          setActiveSliderValues={setActiveSliderValues}
                      onSelectedEffectsChange={() => {}} // <-- Added no-op
                      visualizerRef={visualizerRef}
                  />

                  {/* Video Composition Layer Container */}
                  {showVideoComposition && (
                    <LayerContainer
                      layers={layers}
                      width={visualizerAspectRatio === 'mobile' ? 400 : 1280}
                      height={visualizerAspectRatio === 'mobile' ? 711 : 720}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      audioFeatures={{
                        frequencies: new Array(256).fill(0.5),
                        timeData: new Array(256).fill(0.5),
                        volume: 0.5,
                        bass: 0.5,
                        mid: 0.5,
                        treble: 0.5
                      }}
                      midiData={{
                        activeNotes: [],
                        currentTime: currentTime,
                        tempo: 120,
                        totalNotes: 0,
                        trackActivity: {}
                      }}
                      onLayerUpdate={updateLayer}
                      onLayerDelete={deleteLayer}
                    />
                  )}

                  {/* HUD Overlays positioned relative to visualizer */}
                  <div id="hud-overlays" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                    {/* Overlays will be rendered here by the HudOverlayProvider */}
                  </div>

                      {/* Visualizer content only - no modals here */}
                </div>
                </div>
                
                {/* Unified Timeline */}
                <div className="flex-shrink-0 mb-4">
                  <UnifiedTimeline
                    stems={sortedAvailableStems}
                    masterStemId={projectAudioFiles?.files?.find(f => f.is_master)?.id ?? null}
                    onStemSelect={handleStemSelect}
                    activeTrackId={activeTrackId}
                    soloedStems={stemAudio.soloedStems}
                    onToggleSolo={stemAudio.toggleStemSolo}
                    analysisProgress={audioAnalysis.analysisProgress}
                    cachedAnalysis={audioAnalysis.cachedAnalysis || []}
                    stemLoadingState={audioAnalysis.isLoading}
                    stemError={audioAnalysis.error}
                    onSeek={useTimelineStore.getState().setCurrentTime}
                    className="bg-stone-800 border border-gray-700"
                  />
                </div>
            </div>
          </div>

              {/* Effect parameter modals - positioned relative to editor-bounds */}
              {effectModals}
            </div>

            {/* Right Effects Sidebar */}
            <CollapsibleEffectsSidebar>
              <EffectsLibrarySidebarWithHud
                effects={effects}
                selectedEffects={selectedEffects}
                onEffectToggle={handleSelectEffect}
                onEffectDoubleClick={handleEffectDoubleClick}
                isVisible={true}
                stemUrlsReady={stemUrlsReady}
              />
            </CollapsibleEffectsSidebar>



        </main>
      </div>
      </DndProvider>
        </AutoSaveProvider>
      ) : (
        <DndProvider backend={HTML5Backend}>
          {/* Main visualizer UI */}
          <div className="flex h-screen bg-stone-800 text-white min-w-0 creative-visualizer-text">
            <CollapsibleSidebar>
              <div className="space-y-4">
                <MappingSourcesPanel 
                  activeTrackId={activeTrackId || undefined}
                  className="mb-4"
                  selectedStemType={selectedStemType}
                  currentTime={currentTime}
                  cachedAnalysis={audioAnalysis.cachedAnalysis}
                  isPlaying={isPlaying}
                />
                <FileSelector 
                  onFileSelected={handleFileSelected}
                  selectedFileId={selectedFileId || undefined}
                  useDemoData={useDemoData}
                  onDemoModeChange={handleDemoModeChange}
                  projectId={currentProjectId || undefined}
                  projectName={projectData?.name}
                />
              </div>
            </CollapsibleSidebar>
            <main className="flex-1 flex overflow-hidden min-w-0">
              <div className="flex-1 flex items-center justify-center text-stone-400">
                <p>Please select or create a project to begin</p>
              </div>
            </main>
          </div>
        </DndProvider>
      )}
    </HudOverlayProvider>
  );
}

export default function CreativeVisualizerPageWithSuspense() {
  return (
    <Suspense>
      <CreativeVisualizerPage />
    </Suspense>
  );
}
```
