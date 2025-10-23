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