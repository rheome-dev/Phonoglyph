This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
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
- Only files matching these patterns are included: apps/api/src/routers/auto-save.ts, apps/api/src/services/auto-save.ts, apps/api/src/db/migrations/017_edit_states.sql, apps/web/src/hooks/use-auto-save.ts, apps/web/src/components/auto-save/auto-save-provider.tsx, apps/web/src/components/auto-save/auto-save-indicator.tsx, apps/web/src/components/auto-save/auto-save-settings.tsx, apps/web/src/components/auto-save/save-history.tsx, apps/web/src/components/auto-save/auto-save-top-bar.tsx, apps/web/src/components/auto-save/creative-visualizer-with-auto-save.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
apps/
  api/
    src/
      db/
        migrations/
          017_edit_states.sql
      routers/
        auto-save.ts
      services/
        auto-save.ts
  web/
    src/
      components/
        auto-save/
          auto-save-indicator.tsx
          auto-save-provider.tsx
          auto-save-settings.tsx
          auto-save-top-bar.tsx
          creative-visualizer-with-auto-save.tsx
          save-history.tsx
      hooks/
        use-auto-save.ts
```

# Files

## File: apps/api/src/db/migrations/017_edit_states.sql
```sql
-- Edit States Table for Auto-Save Functionality
-- Migration: 017_edit_states

-- Create edit_states table for storing auto-save data
CREATE TABLE "edit_states" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "project_id" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX "idx_edit_states_user_project" ON "edit_states" ("user_id", "project_id");
CREATE INDEX "idx_edit_states_current" ON "edit_states" ("is_current") WHERE "is_current" = true;
CREATE INDEX "idx_edit_states_timestamp" ON "edit_states" ("timestamp");
CREATE INDEX "idx_edit_states_version" ON "edit_states" ("version");

-- Enable RLS for edit_states table
ALTER TABLE "edit_states" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own edit states
CREATE POLICY "Users can access own edit states" ON "edit_states"
  FOR ALL 
  USING (user_id = auth.uid());

-- RLS Policy: Users can view edit states for projects they have access to
CREATE POLICY "Users can view project edit states" ON "edit_states"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "edit_states"."project_id" 
      AND (
        "projects"."user_id" = auth.uid() OR
        "projects"."privacy_setting" = 'public' OR
        (
          "projects"."privacy_setting" = 'unlisted' AND
          EXISTS (
            SELECT 1 FROM "project_shares"
            WHERE "project_shares"."project_id" = "projects"."id"
          )
        )
      )
    )
  );

-- Add trigger for updated_at (though we don't have an updated_at column, keeping consistent with other tables)
-- Note: edit_states uses timestamp field for tracking when the state was saved

-- Add comments for documentation
COMMENT ON TABLE "edit_states" IS 'Stores auto-save states for user editing sessions';
COMMENT ON COLUMN "edit_states"."user_id" IS 'Reference to authenticated user';
COMMENT ON COLUMN "edit_states"."project_id" IS 'Reference to the project being edited';
COMMENT ON COLUMN "edit_states"."timestamp" IS 'When this edit state was saved';
COMMENT ON COLUMN "edit_states"."data" IS 'JSONB containing visualization parameters, stem mappings, effect settings, and timeline state';
COMMENT ON COLUMN "edit_states"."version" IS 'Version number for conflict resolution';
COMMENT ON COLUMN "edit_states"."is_current" IS 'Indicates if this is the most recent state for the project';
```

## File: apps/api/src/services/auto-save.ts
```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { logger } from '../lib/logger'

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

export interface SaveStateOptions {
  projectId: string
  userId: string
  data: Record<string, any>
  version?: number
  compress?: boolean
}

export interface RestoreStateOptions {
  stateId: string
  userId: string
}

export class AutoSaveService {
  constructor(private supabase: SupabaseClient) {}

  // Save current edit state
  async saveState(options: SaveStateOptions): Promise<EditState> {
    try {
      // First, mark all existing states for this project as not current
      await this.supabase
        .from('edit_states')
        .update({ is_current: false })
        .eq('project_id', options.projectId)
        .eq('user_id', options.userId)

      // Get the next version number
      const { data: latestState } = await this.supabase
        .from('edit_states')
        .select('version')
        .eq('project_id', options.projectId)
        .eq('user_id', options.userId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      const nextVersion = (latestState?.version || 0) + 1

      // Prepare data for storage
      const stateData = options.compress 
        ? this.compressStateData(options.data)
        : options.data

      // Create new edit state
      const { data: editState, error } = await this.supabase
        .from('edit_states')
        .insert({
          user_id: options.userId,
          project_id: options.projectId,
          data: stateData,
          version: nextVersion,
          is_current: true,
        })
        .select()
        .single()

      if (error) {
        logger.error('Database error saving edit state:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save edit state',
        })
      }

      // Clean up old states if we exceed max history
      await this.cleanupOldStates(options.projectId, options.userId)

      return this.mapDatabaseToEditState(editState)
    } catch (error) {
      if (error instanceof TRPCError) throw error
      logger.error('Error saving edit state:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save edit state',
      })
    }
  }

  // Get current state for a project
  async getCurrentState(projectId: string, userId: string): Promise<EditState | null> {
    try {
      const { data: editState, error } = await this.supabase
        .from('edit_states')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('is_current', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No current state found, return null
          return null
        }
        logger.error('Database error fetching current state:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch current state',
        })
      }

      return this.mapDatabaseToEditState(editState)
    } catch (error) {
      if (error instanceof TRPCError) throw error
      logger.error('Error fetching current state:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch current state',
      })
    }
  }

  // Restore a specific edit state
  async restoreState(options: RestoreStateOptions): Promise<EditState> {
    try {
      // Get the state to restore
      const { data: editState, error: fetchError } = await this.supabase
        .from('edit_states')
        .select('*')
        .eq('id', options.stateId)
        .eq('user_id', options.userId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Edit state not found or access denied',
          })
        }
        logger.error('Database error fetching edit state:', fetchError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch edit state',
        })
      }

      // Mark all existing states for this project as not current
      await this.supabase
        .from('edit_states')
        .update({ is_current: false })
        .eq('project_id', editState.project_id)
        .eq('user_id', options.userId)

      // Create a new state based on the restored one
      const { data: newState, error: createError } = await this.supabase
        .from('edit_states')
        .insert({
          user_id: options.userId,
          project_id: editState.project_id,
          data: editState.data,
          version: editState.version + 1,
          is_current: true,
        })
        .select()
        .single()

      if (createError) {
        logger.error('Database error creating restored state:', createError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to restore edit state',
        })
      }

      return this.mapDatabaseToEditState(newState)
    } catch (error) {
      if (error instanceof TRPCError) throw error
      logger.error('Error restoring edit state:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to restore edit state',
      })
    }
  }

  // Get edit history for a project
  async getProjectStates(
    projectId: string, 
    userId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<EditState[]> {
    try {
      const { data: editStates, error } = await this.supabase
        .from('edit_states')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        logger.error('Database error fetching project states:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project states',
        })
      }

      return (editStates || []).map(state => this.mapDatabaseToEditState(state))
    } catch (error) {
      if (error instanceof TRPCError) throw error
      logger.error('Error fetching project states:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch project states',
      })
    }
  }

  // Delete a specific edit state
  async deleteState(stateId: string, userId: string): Promise<void> {
    try {
      // Check if this is the current state
      const { data: editState, error: fetchError } = await this.supabase
        .from('edit_states')
        .select('is_current, project_id')
        .eq('id', stateId)
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Edit state not found or access denied',
          })
        }
        logger.error('Database error fetching edit state:', fetchError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch edit state',
        })
      }

      // Delete the state
      const { error: deleteError } = await this.supabase
        .from('edit_states')
        .delete()
        .eq('id', stateId)
        .eq('user_id', userId)

      if (deleteError) {
        logger.error('Database error deleting edit state:', deleteError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete edit state',
        })
      }

      // If this was the current state, make the most recent state current
      if (editState.is_current) {
        const { data: latestState } = await this.supabase
          .from('edit_states')
          .select('id')
          .eq('project_id', editState.project_id)
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()

        if (latestState) {
          await this.supabase
            .from('edit_states')
            .update({ is_current: true })
            .eq('id', latestState.id)
        }
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      logger.error('Error deleting edit state:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete edit state',
      })
    }
  }

  // Clear all edit history for a project
  async clearProjectHistory(projectId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('edit_states')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (error) {
        logger.error('Database error clearing project history:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear project history',
        })
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      logger.error('Error clearing project history:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear project history',
      })
    }
  }

  // Clean up old states to maintain history limit
  private async cleanupOldStates(projectId: string, userId: string, maxHistory: number = 10): Promise<void> {
    try {
      // Get count of states for this project
      const { count } = await this.supabase
        .from('edit_states')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (count && count > maxHistory) {
        // Get IDs of states to delete (keep the most recent ones)
        const { data: statesToDelete } = await this.supabase
          .from('edit_states')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .order('timestamp', { ascending: true })
          .limit(count - maxHistory)

        if (statesToDelete && statesToDelete.length > 0) {
          const idsToDelete = statesToDelete.map(state => state.id)
          
          await this.supabase
            .from('edit_states')
            .delete()
            .in('id', idsToDelete)
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old states:', error)
      // Don't throw error for cleanup failures
    }
  }

  // Compress state data to reduce storage size
  private compressStateData(data: Record<string, any>): Record<string, any> {
    try {
      // Simple compression: remove null/undefined values and compress large objects
      const compressed = JSON.parse(JSON.stringify(data, (key, value) => {
        if (value === null || value === undefined) return undefined
        if (typeof value === 'object' && Object.keys(value).length === 0) return undefined
        return value
      }))
      
      return compressed
    } catch (error) {
      logger.error('Error compressing state data:', error)
      return data // Return original data if compression fails
    }
  }

  // Map database record to EditState interface
  private mapDatabaseToEditState(dbRecord: any): EditState {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      projectId: dbRecord.project_id,
      timestamp: new Date(dbRecord.timestamp),
      data: dbRecord.data,
      version: dbRecord.version,
      isCurrent: dbRecord.is_current,
    }
  }

  // Validate edit state data structure
  validateStateData(data: Record<string, any>): boolean {
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
      logger.error('Error validating state data:', error)
      return false
    }
  }

  // Get storage statistics for a project
  async getStorageStats(projectId: string, userId: string): Promise<{
    totalStates: number
    totalSizeBytes: number
    averageStateSizeBytes: number
    oldestState: Date | null
    newestState: Date | null
  }> {
    try {
      const { data: states, error } = await this.supabase
        .from('edit_states')
        .select('timestamp, data')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: true })

      if (error) {
        logger.error('Database error fetching storage stats:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch storage stats',
        })
      }

      if (!states || states.length === 0) {
        return {
          totalStates: 0,
          totalSizeBytes: 0,
          averageStateSizeBytes: 0,
          oldestState: null,
          newestState: null,
        }
      }

      const totalStates = states.length
      const totalSizeBytes = states.reduce((acc, state) => {
        return acc + JSON.stringify(state.data).length
      }, 0)
      const averageStateSizeBytes = Math.round(totalSizeBytes / totalStates)
      const oldestState = new Date(states[0]?.timestamp || new Date())
      const newestState = new Date(states[states.length - 1]?.timestamp || new Date())

      return {
        totalStates,
        totalSizeBytes,
        averageStateSizeBytes,
        oldestState,
        newestState,
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      logger.error('Error getting storage stats:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get storage stats',
      })
    }
  }
}
```

## File: apps/web/src/components/auto-save/auto-save-indicator.tsx
```typescript
"use client"

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaved: Date | null
  error?: string | null
  className?: string
  style?: React.CSSProperties
}

export function AutoSaveIndicator({ 
  isSaving, 
  lastSaved, 
  error, 
  className,
  style
}: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false)

  // Show "Saved" message briefly when save completes
  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSaved, isSaving])

  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (isSaving) {
      return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
    }
    if (showSaved) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <Save className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = () => {
    if (error) {
      return 'Save failed'
    }
    if (isSaving) {
      return 'Saving...'
    }
    if (showSaved) {
      return 'Saved'
    }
    if (lastSaved) {
      return `Last saved ${formatTimeAgo(lastSaved)}`
    }
    return 'Not saved'
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-gray-600",
      className
    )} style={style}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      {error && (
        <span className="text-xs text-red-500 ml-2">
          {error}
        </span>
      )}
    </div>
  )
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}
```

## File: apps/web/src/components/auto-save/auto-save-settings.tsx
```typescript
"use client"

import { useState } from 'react'
import { Settings, Save, Clock, History, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { cn, debugLog } from '@/lib/utils'
import type { AutoSaveConfig } from '@/hooks/use-auto-save'

export interface AutoSaveSettingsProps {
  config: AutoSaveConfig
  onConfigChange: (config: Partial<AutoSaveConfig>) => void
  onSaveNow: () => Promise<void>
  isSaving?: boolean
  className?: string
}

export function AutoSaveSettings({
  config,
  onConfigChange,
  onSaveNow,
  isSaving = false,
  className
}: AutoSaveSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSaveNow = async () => {
    try {
      await onSaveNow()
    } catch (error) {
      debugLog.error('Failed to save now:', error)
    }
  }

  const formatInterval = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${ms / 1000}s`
    return `${ms / 60000}m`
  }

  const formatDebounce = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${ms / 1000}s`
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto-Save Settings
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-gray-500" />
            <Label htmlFor="auto-save-enabled">Enable Auto-Save</Label>
          </div>
          <Switch
            id="auto-save-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => onConfigChange({ enabled })}
          />
        </div>

        {/* Save Now Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Manual Save</span>
          </div>
          <Button
            size="sm"
            onClick={handleSaveNow}
            disabled={isSaving || !config.enabled}
          >
            {isSaving ? 'Saving...' : 'Save Now'}
          </Button>
        </div>

        {/* Current Settings Summary */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatInterval(config.interval)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            {config.maxHistory} states
          </Badge>
          <Badge variant="outline" className="text-xs">
            Debounce: {formatDebounce(config.debounceTime)}
          </Badge>
        </div>

        {/* Advanced Settings */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Auto-Save Interval
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[config.interval]}
                  onValueChange={([value]) => onConfigChange({ interval: value })}
                  min={1000}
                  max={30000}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1s</span>
                  <span>{formatInterval(config.interval)}</span>
                  <span>30s</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Max History States
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[config.maxHistory]}
                  onValueChange={([value]) => onConfigChange({ maxHistory: value })}
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span>{config.maxHistory}</span>
                  <span>50</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Debounce Time
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[config.debounceTime]}
                  onValueChange={([value]) => onConfigChange({ debounceTime: value })}
                  min={100}
                  max={5000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>100ms</span>
                  <span>{formatDebounce(config.debounceTime)}</span>
                  <span>5s</span>
                </div>
              </div>
            </div>

            {/* Preset Configurations */}
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigChange({
                    interval: 3000,
                    debounceTime: 500,
                    maxHistory: 10
                  })}
                >
                  Frequent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigChange({
                    interval: 10000,
                    debounceTime: 1000,
                    maxHistory: 15
                  })}
                >
                  Balanced
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigChange({
                    interval: 30000,
                    debounceTime: 2000,
                    maxHistory: 20
                  })}
                >
                  Conservative
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## File: apps/web/src/components/auto-save/auto-save-top-bar.tsx
```typescript
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
    </div>
  )
}
```

## File: apps/web/src/components/auto-save/creative-visualizer-with-auto-save.tsx
```typescript
"use client"

import React from 'react'
import { AutoSaveProvider } from './auto-save-provider'

interface CreativeVisualizerWithAutoSaveProps {
  projectId: string
  children: React.ReactNode
}

export function CreativeVisualizerWithAutoSave({ 
  projectId, 
  children 
}: CreativeVisualizerWithAutoSaveProps) {
  return (
    <AutoSaveProvider projectId={projectId}>
      {children}
    </AutoSaveProvider>
  )
}
```

## File: apps/web/src/components/auto-save/save-history.tsx
```typescript
"use client"

import { useState } from 'react'
import { Clock, RotateCcw, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, debugLog } from '@/lib/utils'
import type { EditState } from '@/hooks/use-auto-save'

export interface SaveHistoryProps {
  saveHistory: EditState[]
  onRestore: (stateId: string) => Promise<void>
  onDelete: (stateId: string) => Promise<void>
  onClearHistory: () => Promise<void>
  isLoading?: boolean
  className?: string
}

export function SaveHistory({
  saveHistory,
  onRestore,
  onDelete,
  onClearHistory,
  isLoading = false,
  className
}: SaveHistoryProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleRestore = async (stateId: string) => {
    try {
      setRestoringId(stateId)
      await onRestore(stateId)
    } catch (error) {
      debugLog.error('Failed to restore state:', error)
    } finally {
      setRestoringId(null)
    }
  }

  const handleDelete = async (stateId: string) => {
    try {
      setDeletingId(stateId)
      await onDelete(stateId)
    } catch (error) {
      debugLog.error('Failed to delete state:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const getStateSize = (data: any) => {
    const size = JSON.stringify(data).length
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  if (saveHistory.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Save History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No saved states yet</p>
            <p className="text-sm">Your changes will be automatically saved as you work</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Save History
            <Badge variant="secondary">{saveHistory.length}</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearHistory}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {saveHistory.map((state) => (
            <div
              key={state.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                state.isCurrent 
                  ? "bg-blue-50 border-blue-200" 
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {formatTimestamp(state.timestamp)}
                    </p>
                    {state.isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      v{state.version}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Size: {getStateSize(state.data)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {!state.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(state.id)}
                    disabled={isLoading || restoringId === state.id}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className={cn(
                      "h-4 w-4",
                      restoringId === state.id && "animate-spin"
                    )} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(state.id)}
                  disabled={isLoading || deletingId === state.id}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className={cn(
                    "h-4 w-4",
                    deletingId === state.id && "animate-spin"
                  )} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

## File: apps/api/src/routers/auto-save.ts
```typescript
import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

// Validation schemas
const saveStateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  data: z.record(z.any()).refine((data) => {
    // Validate that data contains expected structure
    return data && typeof data === 'object';
  }, 'Invalid edit state data'),
  version: z.number().min(1, 'Version must be at least 1').optional(),
});

const restoreStateSchema = z.object({
  stateId: z.string().min(1, 'State ID is required'),
});

const getProjectStatesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  limit: z.number().min(1).max(50).default(10),
  offset: z.number().min(0).default(0),
});

const deleteStateSchema = z.object({
  stateId: z.string().min(1, 'State ID is required'),
});

const clearProjectHistorySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export const autoSaveRouter = router({
  // Save current edit state
  saveState: protectedProcedure
    .input(saveStateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // First, mark all existing states for this project as not current
        await ctx.supabase
          .from('edit_states')
          .update({ is_current: false })
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id);

        // Get the next version number
        const { data: latestState } = await ctx.supabase
          .from('edit_states')
          .select('version')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        const nextVersion = (latestState?.version || 0) + 1;

        // Create new edit state
        const { data: editState, error } = await ctx.supabase
          .from('edit_states')
          .insert({
            user_id: ctx.user.id,
            project_id: input.projectId,
            data: input.data,
            version: nextVersion,
            is_current: true,
          })
          .select()
          .single();

        if (error) {
          logger.error('Database error saving edit state:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save edit state',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.save_state',
          p_resource_type: 'edit_state',
          p_resource_id: editState.id,
          p_metadata: { project_id: input.projectId, version: nextVersion },
        });

        return editState;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error saving edit state:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save edit state',
        });
      }
    }),

  // Get current state for a project
  getCurrentState: protectedProcedure
    .input(z.object({ projectId: z.string().min(1, 'Project ID is required') }))
    .query(async ({ input, ctx }) => {
      try {
        // First, try to get the current state marked as is_current
        const { data: editState, error } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .eq('is_current', true)
          .single();

        if (editState) {
          logger.log(`[autoSave] getCurrentState: found is_current=true, version=${editState.version}, id=${editState.id}`);
          return editState;
        }

        // If no current state found (or error), fallback to the latest by timestamp
        if (error && error.code !== 'PGRST116') {
          logger.error('[autoSave] getCurrentState: error fetching is_current state:', error);
        }

        logger.log(`[autoSave] getCurrentState: no is_current found, fallback to latest by timestamp`);

        const { data: latestState, error: latestError } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (latestError) {
          logger.error('[autoSave] getCurrentState: error fetching latest state:', latestError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch current state',
          });
        }

        if (!latestState) {
          logger.log(`[autoSave] getCurrentState: no states found for project`);
          return null;
        }

        logger.log(`[autoSave] getCurrentState: fallback returned version=${latestState.version}, id=${latestState.id}`);

        return latestState;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('[autoSave] getCurrentState: unexpected error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch current state',
        });
      }
    }),

  // Restore a specific edit state
  restoreState: protectedProcedure
    .input(restoreStateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the state to restore
        const { data: editState, error: fetchError } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('id', input.stateId)
          .eq('user_id', ctx.user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Edit state not found or access denied',
            });
          }
          logger.error('Database error fetching edit state:', fetchError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch edit state',
          });
        }

        // Mark all existing states for this project as not current
        await ctx.supabase
          .from('edit_states')
          .update({ is_current: false })
          .eq('project_id', editState.project_id)
          .eq('user_id', ctx.user.id);

        // Create a new state based on the restored one
        const { data: newState, error: createError } = await ctx.supabase
          .from('edit_states')
          .insert({
            user_id: ctx.user.id,
            project_id: editState.project_id,
            data: editState.data,
            version: editState.version + 1,
            is_current: true,
          })
          .select()
          .single();

        if (createError) {
          logger.error('Database error creating restored state:', createError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to restore edit state',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.restore_state',
          p_resource_type: 'edit_state',
          p_resource_id: newState.id,
          p_metadata: { 
            original_state_id: input.stateId,
            project_id: editState.project_id,
            version: newState.version 
          },
        });

        return newState;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error restoring edit state:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to restore edit state',
        });
      }
    }),

  // Get edit history for a project
  getProjectStates: protectedProcedure
    .input(getProjectStatesSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { data: editStates, error } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .order('timestamp', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          logger.error('Database error fetching project states:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch project states',
          });
        }

        return editStates || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error fetching project states:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project states',
        });
      }
    }),

  // Delete a specific edit state
  deleteState: protectedProcedure
    .input(deleteStateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if this is the current state
        const { data: editState, error: fetchError } = await ctx.supabase
          .from('edit_states')
          .select('is_current, project_id')
          .eq('id', input.stateId)
          .eq('user_id', ctx.user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Edit state not found or access denied',
            });
          }
          logger.error('Database error fetching edit state:', fetchError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch edit state',
          });
        }

        // Delete the state
        const { error: deleteError } = await ctx.supabase
          .from('edit_states')
          .delete()
          .eq('id', input.stateId)
          .eq('user_id', ctx.user.id);

        if (deleteError) {
          logger.error('Database error deleting edit state:', deleteError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete edit state',
          });
        }

        // If this was the current state, make the most recent state current
        if (editState.is_current) {
          const { data: latestState } = await ctx.supabase
            .from('edit_states')
            .select('id')
            .eq('project_id', editState.project_id)
            .eq('user_id', ctx.user.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          if (latestState) {
            await ctx.supabase
              .from('edit_states')
              .update({ is_current: true })
              .eq('id', latestState.id);
          }
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.delete_state',
          p_resource_type: 'edit_state',
          p_resource_id: input.stateId,
          p_metadata: { 
            was_current: editState.is_current,
            project_id: editState.project_id 
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error deleting edit state:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete edit state',
        });
      }
    }),

  // Clear all edit history for a project
  clearProjectHistory: protectedProcedure
    .input(clearProjectHistorySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Delete all edit states for this project
        const { error } = await ctx.supabase
          .from('edit_states')
          .delete()
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id);

        if (error) {
          logger.error('Database error clearing project history:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to clear project history',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.clear_history',
          p_resource_type: 'project',
          p_resource_id: input.projectId,
          p_metadata: { action: 'clear_edit_history' },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error clearing project history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear project history',
        });
      }
    }),
});
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
    console.log('🔄 AUTOSAVE: Starting hydration for project:', projectId)

    const loadSavedState = async () => {
      if (!projectId) {
        console.log('⚠️ AUTOSAVE: No projectId, skipping')
        return
      }

      console.log('🔄 AUTOSAVE: Fetching current state...')

      try {
        setIsHydrating(true)
        const savedState = await autoSave.getCurrentState()

        console.log('🔄 AUTOSAVE: Response received:', savedState ? 'HAS DATA' : 'NULL')

        if (!savedState || !savedState.data) {
          console.log('⚠️ AUTOSAVE: No saved state found - is this a new project?')
          setIsHydrating(false)
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

## File: apps/web/src/hooks/use-auto-save.ts
```typescript
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc'
import { supabase } from '@/lib/supabase'
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
  const queryClient = useQueryClient()
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

      // Invalidate queries to get updated data on next access
      await queryClient.invalidateQueries({ queryKey: ['autoSave', 'getCurrentState'] })
      await getProjectStatesQuery.refetch()

    } catch (error) {
      debugLog.error('Failed to save state:', error)
      // Don't throw error to avoid breaking the UI
    } finally {
      setIsSaving(false)
    }
  }, [projectId, isAuthenticated, user, config.enabled, saveStateMutation, getProjectStatesQuery, queryClient])

  // Restore state function
  const restoreState = useCallback(async (stateId: string): Promise<EditState> => {
    if (!projectId || !isAuthenticated || !user) {
      throw new Error('Authentication required to restore state')
    }

    try {
      setIsSaving(true)
      
      const restoredState = await restoreStateMutation.mutateAsync({ stateId })

      setLastSaved(new Date())

      // Invalidate queries to get updated data on next access
      await queryClient.invalidateQueries({ queryKey: ['autoSave', 'getCurrentState'] })
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
  }, [projectId, isAuthenticated, user, restoreStateMutation, getProjectStatesQuery, queryClient])

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

  // Get current state function - bypass memoization issues with direct fetch
  const getCurrentState = useCallback(async (): Promise<EditState | null> => {
    console.log('🔄 AUTOSAVE: getCurrentState DIRECT CALLED, projectId:', projectId)

    if (!projectId) {
      console.log('🔄 AUTOSAVE: getCurrentState - no projectId')
      return null
    }

    try {
      console.log('🔄 AUTOSAVE: getCurrentState - making direct API call')

      // Get the current session for auth
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Direct API call bypassing React Query cache
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.phonoglyph.rheome.tools'
      const trpcInput = JSON.stringify({
        "0": {
          "json": {
            "projectId": projectId
          }
        }
      })
      const response = await fetch(`${apiUrl}/api/trpc/autoSave.getCurrentState?batch=1&input=${encodeURIComponent(trpcInput)}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        console.log('🔄 AUTOSAVE: getCurrentState - API error:', response.status)
        return null
      }

      const json = await response.json()
      console.log('🔄 AUTOSAVE: getCurrentState - API response received')

      // tRPC batch response format
      const result = json[0]?.result?.data
      console.log('🔄 AUTOSAVE: getCurrentState - direct call version:', result?.version || 'null')

      if (!result) {
        console.log('🔄 AUTOSAVE: getCurrentState - no result in API response')
        return null
      }

      // Map the database response to EditState format
      return {
        id: result.id,
        userId: result.user_id,
        projectId: result.project_id,
        timestamp: new Date(result.timestamp),
        data: result.data,
        version: result.version,
        isCurrent: result.is_current
      }
    } catch (error) {
      console.error('🔄 AUTOSAVE: getCurrentState - error:', error)
      return null
    }
  }, [projectId])

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
```
