'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Settings, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface MIDINote {
  id: string;
  start: number;
  duration: number;
  pitch: number;
  velocity: number;
  track: string;
  noteName: string;
}

interface MIDITrack {
  id: string;
  name: string;
  instrument: string;
  channel: number;
  notes: MIDINote[];
  color: string;
  visible: boolean;
}

interface MIDIData {
  file: {
    name: string;
    size: number;
    duration: number;
    ticksPerQuarter: number;
    timeSignature: [number, number];
    keySignature: string;
  };
  tracks: MIDITrack[];
  tempoChanges: Array<{
    tick: number;
    bpm: number;
    microsecondsPerQuarter: number;
  }>;
}

interface VisualizationSettings {
  colorScheme: 'sage' | 'slate' | 'dusty-rose' | 'mixed';
  pixelsPerSecond: number;
  showTrackLabels: boolean;
  showVelocity: boolean;
  minKey: number;
  maxKey: number;
}

interface SimpleMidiVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onTimeChange: (time: number) => void;
  className?: string;
}

// Color schemes
const COLOR_SCHEMES = {
  sage: '#84a98c',
  slate: '#6b7c93', 
  'dusty-rose': '#b08a8a',
  mixed: ['#84a98c', '#6b7c93', '#b08a8a', '#a8a29e', '#8da3b0']
};

export function SimpleMidiVisualizer({ 
  midiData, 
  settings, 
  currentTime,
  onSettingsChange, 
  onTimeChange,
  className 
}: SimpleMidiVisualizerProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(
    new Set(midiData.tracks.map(track => track.id))
  );
  const [showSettings, setShowSettings] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate canvas dimensions
  const canvasWidth = Math.max(1200, midiData.file.duration * settings.pixelsPerSecond * zoom);
  const keyRange = settings.maxKey - settings.minKey + 1;
  const canvasHeight = Math.max(400, keyRange * 12);

  // Filter visible tracks
  const visibleTracks = midiData.tracks.filter(track => 
    selectedTracks.has(track.id) && track.visible
  );

  // Convert MIDI note to Y position
  const noteToY = useCallback((pitch: number) => {
    const keyIndex = settings.maxKey - pitch;
    return keyIndex * 12;
  }, [settings.maxKey]);

  // Convert time to X position
  const timeToX = useCallback((time: number) => {
    return time * settings.pixelsPerSecond * zoom;
  }, [settings.pixelsPerSecond, zoom]);

  // Get note color
  const getNoteColor = useCallback((track: MIDITrack, note: MIDINote) => {
    let baseColor = track.color;
    
    if (settings.colorScheme !== 'mixed') {
      baseColor = COLOR_SCHEMES[settings.colorScheme];
    }
    
    if (settings.showVelocity) {
      const opacity = Math.max(0.3, note.velocity / 127);
      return `${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    }
    
    return baseColor;
  }, [settings.colorScheme, settings.showVelocity]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    // Horizontal lines for keys
    for (let key = settings.minKey; key <= settings.maxKey; key++) {
      const y = noteToY(key);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();

      // Highlight black keys
      const noteInOctave = key % 12;
      const isBlackKey = [1, 3, 6, 8, 10].includes(noteInOctave);
      if (isBlackKey) {
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, y, canvas.width, 12);
      }
    }

    // Vertical time lines
    ctx.strokeStyle = '#2a2a2a';
    for (let time = 0; time <= midiData.file.duration; time += 1) {
      const x = timeToX(time);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw notes
    visibleTracks.forEach(track => {
      track.notes.forEach(note => {
        if (note.pitch < settings.minKey || note.pitch > settings.maxKey) {
          return;
        }

        const x = timeToX(note.start);
        const y = noteToY(note.pitch);
        const noteWidth = Math.max(2, timeToX(note.duration));
        const noteHeight = 10;

        // Note color with active state
        const isActive = currentTime >= note.start && currentTime <= (note.start + note.duration);
        let noteColor = getNoteColor(track, note);
        
        if (isActive) {
          // Brighten active notes
          noteColor = noteColor.replace(/[89ab]/g, 'f');
        }

        ctx.fillStyle = noteColor;
        ctx.fillRect(x, y + 1, noteWidth, noteHeight);

        // Note border
        ctx.strokeStyle = isActive ? '#fff' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.strokeRect(x, y + 1, noteWidth, noteHeight);
      });
    });

    // Draw playhead
    const playheadX = timeToX(currentTime);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvas.height);
    ctx.stroke();

    // Playhead triangle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 10);
    ctx.closePath();
    ctx.fill();
  }, [canvasWidth, canvasHeight, settings, visibleTracks, currentTime, noteToY, timeToX, getNoteColor]);

  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle track toggle
  const handleTrackToggle = (trackId: string) => {
    const newSelection = new Set(selectedTracks);
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId);
    } else {
      newSelection.add(trackId);
    }
    setSelectedTracks(newSelection);
  };

  // Handle canvas click for seeking
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = x / (settings.pixelsPerSecond * zoom);
    
    onTimeChange(Math.max(0, Math.min(midiData.file.duration, time)));
  };

  return (
    <div className={cn("simple-midi-visualizer bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl overflow-hidden shadow-lg", className)}>
      {/* Header */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{midiData.file.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{midiData.tracks.length} tracks</Badge>
              <Badge variant="secondary" className="text-xs">{midiData.file.duration.toFixed(1)}s</Badge>
              <Badge variant="secondary" className="text-xs">{midiData.file.timeSignature[0]}/{midiData.file.timeSignature[1]}</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.1, z / 1.2))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="font-mono text-xs min-w-[60px] text-center">
              {(zoom * 100).toFixed(0)}%
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(5, z * 1.2))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex">
        {/* Track List */}
        <div className="w-64 bg-white/70 backdrop-blur-sm border-r border-gray-200 p-4 max-h-[500px] overflow-y-auto">
          <h4 className="font-semibold text-sm mb-3">Tracks</h4>
          {midiData.tracks.map((track, index) => (
            <div
              key={track.id}
              className={`p-2 rounded border mb-2 cursor-pointer transition-all ${
                selectedTracks.has(track.id) ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => handleTrackToggle(track.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color }} />
                  <span className="text-sm font-medium">{track.name || `Track ${index + 1}`}</span>
                </div>
                {selectedTracks.has(track.id) ? (
                  <Eye className="h-4 w-4 text-blue-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">{track.notes.length} notes</div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 p-4 max-h-[500px] overflow-auto">
          <canvas
            ref={canvasRef}
            className="border border-gray-600 rounded cursor-pointer"
            onClick={handleCanvasClick}
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              maxWidth: '100%'
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-white/60 backdrop-blur-sm border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
          <div>Notes: {visibleTracks.reduce((sum, track) => sum + track.notes.length, 0)} | Tracks: {visibleTracks.length}/{midiData.tracks.length}</div>
          <div>Time: {currentTime.toFixed(2)}s / {midiData.file.duration.toFixed(2)}s</div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 w-80 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-50">
          <h4 className="font-semibold text-gray-900 mb-3">Settings</h4>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
            <div className="grid grid-cols-2 gap-2">
              {(['sage', 'slate', 'dusty-rose', 'mixed'] as const).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => onSettingsChange({ ...settings, colorScheme: scheme })}
                  className={`p-2 text-sm rounded border text-left capitalize ${
                    settings.colorScheme === scheme ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {scheme}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Scale: {settings.pixelsPerSecond}px/s
            </label>
            <input
              type="range"
              min={10}
              max={200}
              value={settings.pixelsPerSecond}
              onChange={(e) => onSettingsChange({ ...settings, pixelsPerSecond: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowSettings(false)} className="w-full">
            Close
          </Button>
        </div>
      )}
    </div>
  );
} 