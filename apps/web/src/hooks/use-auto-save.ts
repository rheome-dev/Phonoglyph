"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { trpc } from '@/lib/trpc'
import { useAuth } from './use-auth'
import { debugLog } from '@/lib/utils'

export interface AutoSaveConfig {
  enabled: boolean
  interval: number // milliseconds
  maxHistory: number // number of saved states to keep
  debounceTime: number // milliseconds
}

export interface EditState {
  id: string
  userId: string
  projectId: string
  timestamp: Date
  data: {
    visualizationParams: Record<string, any>
    stemMappings: Record<string, any>
    effectSettings: Record<string, any>
    timelineState: any
  }
  version: number
  isCurrent: boolean
}

export interface UseAutoSave {
  isSaving: boolean
  lastSaved: Date | null
  saveHistory: EditState[]
  saveState: () => Promise<void>
  restoreState: (stateId: string) => Promise<void>
  clearHistory: () => Promise<void>
  getCurrentState: () => Promise<EditState | null>
  config: AutoSaveConfig
  updateConfig: (config: Partial<AutoSaveConfig>) => void
}

const DEFAULT_CONFIG: AutoSaveConfig = {
  enabled: true,
  interval: 5000, // 5 seconds
  maxHistory: 10,
  debounceTime: 1000, // 1 second
}

export function useAutoSave(projectId: string): UseAutoSave {
  const { user, isAuthenticated } = useAuth()
  const [config, setConfig] = useState<AutoSaveConfig>(DEFAULT_CONFIG)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveHistory, setSaveHistory] = useState<EditState[]>([])
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()
  const currentStateRef = useRef<Record<string, any> | null>(null)

  // tRPC mutations and queries
  const saveStateMutation = trpc.autoSave.saveState.useMutation()
  const restoreStateMutation = trpc.autoSave.restoreState.useMutation()
  const clearHistoryMutation = trpc.autoSave.clearProjectHistory.useMutation()
  const getCurrentStateQuery = trpc.autoSave.getCurrentState.useQuery(
    { projectId },
    { enabled: !!projectId && isAuthenticated }
  )
  const getProjectStatesQuery = trpc.autoSave.getProjectStates.useQuery(
    { projectId, limit: config.maxHistory },
    { enabled: !!projectId && isAuthenticated }
  )

  // Update save history when query data changes
  useEffect(() => {
    if (getProjectStatesQuery.data) {
      setSaveHistory(getProjectStatesQuery.data.map((state: any) => ({
        ...state,
        timestamp: new Date(state.timestamp)
      })))
    }
  }, [getProjectStatesQuery.data])

  // Update last saved when current state changes
  useEffect(() => {
    if (getCurrentStateQuery.data) {
      setLastSaved(new Date(getCurrentStateQuery.data.timestamp))
    }
  }, [getCurrentStateQuery.data])

  // Save state function
  const saveState = useCallback(async (stateData?: Record<string, any>) => {
    if (!projectId || !isAuthenticated || !user || !config.enabled) {
      return
    }

    try {
      setIsSaving(true)
      
      const dataToSave = stateData || currentStateRef.current
      if (!dataToSave) {
        debugLog.warn('No state data to save')
        return
      }

      // Validate state data structure
      const isValidData = validateStateData(dataToSave)
      if (!isValidData) {
        debugLog.warn('Invalid state data structure')
        return
      }

      await saveStateMutation.mutateAsync({
        projectId,
        data: dataToSave
      })

      setLastSaved(new Date())
      
      // Refresh queries to get updated data
      await getCurrentStateQuery.refetch()
      await getProjectStatesQuery.refetch()
      
    } catch (error) {
      debugLog.error('Failed to save state:', error)
      // Don't throw error to avoid breaking the UI
    } finally {
      setIsSaving(false)
    }
  }, [projectId, isAuthenticated, user, config.enabled, saveStateMutation, getCurrentStateQuery, getProjectStatesQuery])

  // Restore state function
  const restoreState = useCallback(async (stateId: string) => {
    if (!projectId || !isAuthenticated || !user) {
      throw new Error('Authentication required to restore state')
    }

    try {
      setIsSaving(true)
      
      const restoredState = await restoreStateMutation.mutateAsync({ stateId })
      
      setLastSaved(new Date())
      
      // Refresh queries to get updated data
      await getCurrentStateQuery.refetch()
      await getProjectStatesQuery.refetch()
      
      return restoredState
    } catch (error) {
      debugLog.error('Failed to restore state:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [projectId, isAuthenticated, user, restoreStateMutation, getCurrentStateQuery, getProjectStatesQuery])

  // Clear history function
  const clearHistory = useCallback(async () => {
    if (!projectId || !isAuthenticated || !user) {
      throw new Error('Authentication required to clear history')
    }

    try {
      setIsSaving(true)
      
      await clearHistoryMutation.mutateAsync({ projectId })
      
      setSaveHistory([])
      setLastSaved(null)
      
    } catch (error) {
      debugLog.error('Failed to clear history:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [projectId, isAuthenticated, user, clearHistoryMutation])

  // Get current state function
  const getCurrentState = useCallback(async (): Promise<EditState | null> => {
    if (!projectId || !isAuthenticated) {
      return null
    }

    try {
      const currentState = await getCurrentStateQuery.refetch()
      return currentState.data || null
    } catch (error) {
      debugLog.error('Failed to get current state:', error)
      return null
    }
  }, [projectId, isAuthenticated, getCurrentStateQuery])

  // Update config function
  const updateConfig = useCallback((newConfig: Partial<AutoSaveConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  // Debounced save function
  const debouncedSave = useCallback((stateData: Record<string, any>) => {
    currentStateRef.current = stateData
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveState(stateData)
    }, config.debounceTime)
  }, [saveState, config.debounceTime])

  // Auto-save interval
  useEffect(() => {
    if (!config.enabled || !isAuthenticated || !projectId) {
      return
    }

    intervalRef.current = setInterval(() => {
      if (currentStateRef.current) {
        saveState(currentStateRef.current)
      }
    }, config.interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [config.enabled, config.interval, isAuthenticated, projectId, saveState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Guest user fallback using localStorage
  const saveStateGuest = useCallback(async (stateData?: Record<string, any>) => {
    if (!projectId || isAuthenticated) {
      return
    }

    try {
      setIsSaving(true)
      
      const dataToSave = stateData || currentStateRef.current
      if (!dataToSave) {
        return
      }

      const guestKey = `guest_auto_save_${projectId}`
      const timestamp = new Date().toISOString()
      
      const guestState = {
        id: `guest_${Date.now()}`,
        projectId,
        timestamp,
        data: dataToSave,
        version: 1,
        isCurrent: true
      }

      // Store in localStorage with expiry (24 hours)
      const guestData = {
        ...guestState,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      localStorage.setItem(guestKey, JSON.stringify(guestData))
      setLastSaved(new Date(timestamp))
      
    } catch (error) {
      debugLog.error('Failed to save guest state:', error)
    } finally {
      setIsSaving(false)
    }
  }, [projectId, isAuthenticated])

  const getCurrentStateGuest = useCallback(async (): Promise<EditState | null> => {
    if (!projectId || isAuthenticated) {
      return null
    }

    try {
      const guestKey = `guest_auto_save_${projectId}`
      const guestData = localStorage.getItem(guestKey)
      
      if (!guestData) {
        return null
      }

      const parsed = JSON.parse(guestData)
      const expiresAt = new Date(parsed.expiresAt)
      
      // Check if expired
      if (expiresAt < new Date()) {
        localStorage.removeItem(guestKey)
        return null
      }

      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp)
      }
    } catch (error) {
      debugLog.error('Failed to get guest state:', error)
      return null
    }
  }, [projectId, isAuthenticated])

  // Return appropriate functions based on authentication status
  const saveStateFn = isAuthenticated ? saveState : saveStateGuest
  const getCurrentStateFn = isAuthenticated ? getCurrentState : getCurrentStateGuest

  return {
    isSaving,
    lastSaved,
    saveHistory: isAuthenticated ? saveHistory : [],
    saveState: saveStateFn,
    restoreState: isAuthenticated ? restoreState : async () => { throw new Error('Restore not available for guest users') },
    clearHistory: isAuthenticated ? clearHistory : async () => { throw new Error('Clear history not available for guest users') },
    getCurrentState: getCurrentStateFn,
    config,
    updateConfig
  }
}

// Helper function to validate state data structure
function validateStateData(data: Record<string, any>): boolean {
  try {
    // Check for required top-level keys
    const requiredKeys = ['visualizationParams', 'stemMappings', 'effectSettings', 'timelineState']
    const hasRequiredKeys = requiredKeys.every(key => key in data)
    
    if (!hasRequiredKeys) {
      return false
    }

    // Validate data types
    const isValid = 
      typeof data.visualizationParams === 'object' &&
      typeof data.stemMappings === 'object' &&
      typeof data.effectSettings === 'object'

    return isValid
  } catch (error) {
    debugLog.error('Error validating state data:', error)
    return false
  }
} 