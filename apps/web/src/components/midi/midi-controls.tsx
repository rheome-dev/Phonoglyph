'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, SkipBack, SkipForward, Settings, ZoomIn, ZoomOut } from 'lucide-react';

interface VisualizationSettings {
  colorScheme: 'sage' | 'slate' | 'dusty-rose' | 'mixed';
  pixelsPerSecond: number;
  showTrackLabels: boolean;
  showVelocity: boolean;
  minKey: number;
  maxKey: number;
}

interface MidiControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  settings: VisualizationSettings;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
}

export function MidiControls({
  isPlaying,
  currentTime,
  duration,
  zoom,
  settings,
  onPlayPause,
  onTimeChange,
  onZoomChange,
  onSettingsChange
}: MidiControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleStop = () => {
    onTimeChange(0);
  };

  const handleSkipBack = () => {
    onTimeChange(Math.max(0, currentTime - 10));
  };

  const handleSkipForward = () => {
    onTimeChange(Math.min(duration, currentTime + 10));
  };

  const handleZoomIn = () => {
    onZoomChange(zoom * 1.2);
  };

  const handleZoomOut = () => {
    onZoomChange(zoom / 1.2);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="midi-controls flex items-center justify-between p-4 h-full">
      {/* Transport Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipBack}
          className="h-8 w-8 p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPause}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipForward}
          className="h-8 w-8 p-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Time Display */}
        <div className="ml-4 font-mono text-sm text-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Badge variant="secondary" className="font-mono text-xs min-w-[60px] text-center">
          {(zoom * 100).toFixed(0)}%
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8 p-0 ml-2"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-50">
          <h4 className="font-semibold text-gray-900 mb-3">Visualization Settings</h4>
          
          {/* Color Scheme */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Scheme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['sage', 'slate', 'dusty-rose', 'mixed'] as const).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => onSettingsChange({ ...settings, colorScheme: scheme })}
                  className={`p-2 text-sm rounded border text-left capitalize ${
                    settings.colorScheme === scheme
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {scheme}
                </button>
              ))}
            </div>
          </div>

          {/* Pixels Per Second */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Scale: {settings.pixelsPerSecond}px/s
            </label>
            <input
              type="range"
              min={10}
              max={200}
              value={settings.pixelsPerSecond}
              onChange={(e) => onSettingsChange({ 
                ...settings, 
                pixelsPerSecond: parseInt(e.target.value) 
              })}
              className="w-full"
            />
          </div>

          {/* Toggle Options */}
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showTrackLabels}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  showTrackLabels: e.target.checked 
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Show Track Labels</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showVelocity}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  showVelocity: e.target.checked 
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Show Velocity</span>
            </label>
          </div>

          {/* Key Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Key Range: {settings.minKey} - {settings.maxKey}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Key</label>
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.minKey}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    minKey: Math.min(parseInt(e.target.value), settings.maxKey)
                  })}
                  className="w-full p-1 text-sm border border-gray-200 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Key</label>
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.maxKey}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    maxKey: Math.max(parseInt(e.target.value), settings.minKey)
                  })}
                  className="w-full p-1 text-sm border border-gray-200 rounded"
                />
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
} 