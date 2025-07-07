'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PianoRollCanvas } from './piano-roll-canvas';
import { MidiControls } from './midi-controls';
import { MidiTimeline } from './midi-timeline';
import { PianoKeys } from './piano-keys';
import { TrackList } from './track-list';
import { MIDIData, MIDITrack, VisualizationSettings } from '@/types/midi';
import { cn } from '@/lib/utils';

interface MidiVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  onSettingsChange: (settings: VisualizationSettings) => void;
  className?: string;
}

export function MidiVisualizer({ 
  midiData, 
  settings, 
  onSettingsChange, 
  className 
}: MidiVisualizerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(
    new Set(midiData.tracks.map(track => track.id))
  );
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate canvas dimensions based on MIDI data
  const canvasWidth = Math.max(1200, midiData.file.duration * settings.pixelsPerSecond);
  const keyRange = settings.maxKey - settings.minKey + 1;
  const canvasHeight = Math.max(400, keyRange * 12); // 12px per key

  // Filter visible tracks
  const visibleTracks = midiData.tracks.filter(track => 
    selectedTracks.has(track.id) && track.visible
  );

  // Handle track visibility toggle
  const handleTrackToggle = (trackId: string) => {
    const newSelection = new Set(selectedTracks);
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId);
    } else {
      newSelection.add(trackId);
    }
    setSelectedTracks(newSelection);
  };

  // Handle zoom changes
  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(0.1, Math.min(5, newZoom)));
  };

  // Handle playback control
  const handlePlayPause = () => {
    if (isPlaying) {
      // Stop playback
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    } else {
      // Start playback
      setIsPlaying(true);
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 0.1; // Advance by 100ms
          if (newTime >= midiData.file.duration) {
            // Stop at end
            setIsPlaying(false);
            if (playbackIntervalRef.current) {
              clearInterval(playbackIntervalRef.current);
              playbackIntervalRef.current = null;
            }
            return midiData.file.duration;
          }
          return newTime;
        });
      }, 100); // Update every 100ms
    }
  };

  // Handle timeline position changes
  const handleTimelineSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(midiData.file.duration, time)));
  };

  // Cleanup playback interval on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "midi-visualizer w-full h-full bg-gradient-to-br from-gray-50 to-gray-100",
        "border border-gray-200 rounded-2xl overflow-hidden",
        "shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {/* Header */}
      <div className="midi-visualizer-header p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-display">
                {midiData.file.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {midiData.tracks.length} tracks
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {midiData.file.duration.toFixed(1)}s
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {midiData.file.timeSignature[0]}/{midiData.file.timeSignature[1]}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {midiData.file.keySignature}
                </Badge>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="text-right">
            <div className="text-sm text-gray-600 font-mono">
              {(midiData.file.size / 1024).toFixed(1)} KB
            </div>
            <div className="text-xs text-gray-500">
              {midiData.file.ticksPerQuarter} PPQ
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualization Grid */}
      <div className="midi-visualizer-grid grid grid-cols-[300px_80px_1fr] grid-rows-[auto_1fr_40px] h-[600px]">
        {/* Track List */}
        <div className="track-list-container bg-white/70 backdrop-blur-sm border-r border-gray-200">
          <TrackList
            tracks={midiData.tracks}
            selectedTracks={selectedTracks}
            onTrackToggle={handleTrackToggle}
            settings={settings}
          />
        </div>

        {/* Piano Keys */}
        <div className="piano-keys-container bg-white/80 backdrop-blur-sm border-r border-gray-200">
          <PianoKeys
            minKey={settings.minKey}
            maxKey={settings.maxKey}
            height={canvasHeight}
            scrollY={scrollPosition.y}
          />
        </div>

        {/* Controls */}
        <div className="controls-container bg-white/70 backdrop-blur-sm border-b border-gray-200">
          <MidiControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={midiData.file.duration}
            zoom={zoom}
            settings={settings}
            onPlayPause={handlePlayPause}
            onTimeChange={handleTimelineSeek}
            onZoomChange={handleZoomChange}
            onSettingsChange={onSettingsChange}
          />
        </div>

        {/* Empty cell for grid alignment */}
        <div className="bg-white/50"></div>
        <div className="bg-white/50"></div>

        {/* Main Canvas Area */}
        <div className="canvas-container relative overflow-auto bg-gradient-to-br from-gray-900 to-gray-800">
          <PianoRollCanvas
            ref={canvasRef}
            midiData={midiData}
            tracks={visibleTracks}
            settings={settings}
            currentTime={currentTime}
            zoom={zoom}
            width={canvasWidth}
            height={canvasHeight}
            onScrollChange={setScrollPosition}
          />
        </div>

        {/* Timeline */}
        <div className="timeline-container col-span-3 bg-white/80 backdrop-blur-sm border-t border-gray-200">
          <MidiTimeline
            duration={midiData.file.duration}
            currentTime={currentTime}
            pixelsPerSecond={settings.pixelsPerSecond}
            zoom={zoom}
            tempoChanges={midiData.tempoChanges}
            onTimeChange={handleTimelineSeek}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="midi-visualizer-footer p-4 bg-white/60 backdrop-blur-sm border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
          <div className="flex items-center gap-4">
            <span>Notes: {visibleTracks.reduce((sum, track) => sum + track.notes.length, 0)}</span>
            <span>Tracks: {visibleTracks.length}/{midiData.tracks.length}</span>
            <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Time: {currentTime.toFixed(2)}s / {midiData.file.duration.toFixed(2)}s</span>
            <span>Range: {settings.minKey}-{settings.maxKey}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 