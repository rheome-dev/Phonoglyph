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
    timelineState: {
      layers?: any[]
      duration?: number
      zoom?: number
    }
    projectSettings?: {
      backgroundColor?: string
      isBackgroundVisible?: boolean
    }
    schemaVersion?: number
  }
  version: number
  isCurrent: boolean
}

export interface UseAutoSave {
  isSaving: boolean
  lastSaved: Date | null
  saveHistory: EditState[]
  saveState: (stateData?: Record<string, any>) => Promise<void>
  restoreState: (stateId: string) => Promise<EditState>
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
  const currentStateRef = useRef<Record<string, any> | null>(null)

  // tRPC mutations and queries
  const saveStateMutation = trpc.autoSave.saveState.useMutation()
  const restoreStateMutation = trpc.autoSave.restoreState.useMutation()
  const clearHistoryMutation = trpc.autoSave.clearProjectHistory.useMutation()

  // Get current state query - always enabled, let backend handle auth
  // The backend protectedProcedure will return 401 if not authenticated
  // staleTime: 0 ensures we always fetch fresh data from the API
  const getCurrentStateQuery = trpc.autoSave.getCurrentState.useQuery(
    { projectId },
    { enabled: !!projectId, staleTime: 0, refetchOnWindowFocus: true }
  )

  // Get project states query - always enabled, let backend handle auth
  const getProjectStatesQuery = trpc.autoSave.getProjectStates.useQuery(
    { projectId, limit: config.maxHistory },
    { enabled: !!projectId, staleTime: 0, refetchOnWindowFocus: true }
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
      
      // If stateData is provided, store it in the ref for future use
      if (stateData) {
        currentStateRef.current = stateData
      }
      
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
  const restoreState = useCallback(async (stateId: string): Promise<EditState> => {
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
      
      // Map the database response to EditState format
      return {
        id: restoredState.id,
        userId: restoredState.user_id,
        projectId: restoredState.project_id,
        timestamp: new Date(restoredState.timestamp),
        data: restoredState.data,
        version: restoredState.version,
        isCurrent: restoredState.is_current
      }
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
    if (!projectId) {
      console.log('🔄 AUTOSAVE: No projectId, skipping')
      return null
    }

    try {
      // Check if already authenticated via Supabase session in trpc-links
      // The backend protectedProcedure will return 401 if not authenticated
      console.log('🔄 AUTOSAVE: Calling refetch...')
      const currentState = await getCurrentStateQuery.refetch()

      console.log('🔄 AUTOSAVE: refetch result, data:', currentState.data ? 'version ' + currentState.data.version : 'null')

      // If query was disabled due to auth failure (401), return null
      if (currentState.data === null || getCurrentStateQuery.status === 'error') {
        console.log('🔄 AUTOSAVE: No data or error, returning null')
        return null
      }

      if (!currentState.data) {
        console.log('🔄 AUTOSAVE: No data, returning null')
        return null
      }

      // Map the database response to EditState format
      return {
        id: currentState.data.id,
        userId: currentState.data.user_id,
        projectId: currentState.data.project_id,
        timestamp: new Date(currentState.data.timestamp),
        data: currentState.data.data,
        version: currentState.data.version,
        isCurrent: currentState.data.is_current
      }
    } catch (error) {
      console.error('🔄 AUTOSAVE: Failed to get current state:', error)
      return null
    }
  }, [projectId, getCurrentStateQuery])

  // Update config function
  const updateConfig = useCallback((newConfig: Partial<AutoSaveConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
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
      debugLog.warn('❌ Missing required keys in state data:', requiredKeys.filter(k => !(k in data)))
      return false
    }

    // Validate data types
    const isValid =
      typeof data.visualizationParams === 'object' &&
      typeof data.stemMappings === 'object' &&
      typeof data.effectSettings === 'object' &&
      typeof data.timelineState === 'object'

    if (!isValid) {
      debugLog.warn('❌ Invalid data types in state data')
      return false
    }

    // Validate timeline state structure
    if (data.timelineState) {
      if (data.timelineState.layers && !Array.isArray(data.timelineState.layers)) {
        debugLog.warn('❌ timelineState.layers is not an array')
        return false
      }
    }

    return true
  } catch (error) {
    debugLog.error('Error validating state data:', error)
    return false
  }
} 