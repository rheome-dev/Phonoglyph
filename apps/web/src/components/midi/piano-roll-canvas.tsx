'use client';

import React, { forwardRef, useRef, useEffect, useCallback } from 'react';

// Import types from main component
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

interface PianoRollCanvasProps {
  midiData: MIDIData;
  tracks: MIDITrack[];
  settings: VisualizationSettings;
  currentTime: number;
  zoom: number;
  width: number;
  height: number;
  onScrollChange?: (position: { x: number; y: number }) => void;
}

// Color scheme mappings
const COLOR_SCHEMES = {
  sage: '#84a98c',
  slate: '#6b7c93', 
  'dusty-rose': '#b08a8a',
  mixed: ['#84a98c', '#6b7c93', '#b08a8a', '#a8a29e', '#8da3b0']
};

export const PianoRollCanvas = forwardRef<HTMLCanvasElement, PianoRollCanvasProps>(
  ({ midiData, tracks, settings, currentTime, zoom, width, height, onScrollChange }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalCanvasRef;
    const animationFrameRef = useRef<number>();

    // Convert MIDI note number to canvas Y position
    const noteToY = useCallback((pitch: number) => {
      const keyIndex = settings.maxKey - pitch;
      return keyIndex * 12; // 12 pixels per key
    }, [settings.maxKey]);

    // Convert time to canvas X position
    const timeToX = useCallback((time: number) => {
      return time * settings.pixelsPerSecond * zoom;
    }, [settings.pixelsPerSecond, zoom]);

    // Get note color based on track and velocity
    const getNoteColor = useCallback((track: MIDITrack, note: MIDINote) => {
      let baseColor = track.color;
      
      if (settings.colorScheme !== 'mixed') {
        baseColor = COLOR_SCHEMES[settings.colorScheme];
      }
      
      if (settings.showVelocity) {
        // Adjust opacity based on velocity (0-127)
        const opacity = Math.max(0.3, note.velocity / 127);
        return `${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
      }
      
      return baseColor;
    }, [settings.colorScheme, settings.showVelocity]);

    // Draw piano roll grid
    const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw horizontal lines for keys
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      
      for (let key = settings.minKey; key <= settings.maxKey; key++) {
        const y = noteToY(key);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        // Highlight black keys with darker background
        const keyType = getKeyType(key);
        if (keyType === 'black') {
          ctx.fillStyle = '#0f0f0f';
          ctx.fillRect(0, y, canvas.width, 12);
        }
      }

      // Draw vertical lines for time
      ctx.strokeStyle = '#2a2a2a';
      const timeInterval = 1; // 1 second intervals
      for (let time = 0; time <= midiData.file.duration; time += timeInterval) {
        const x = timeToX(time);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw beat lines (stronger)
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 2;
      const beatInterval = 60 / 120; // Assuming 120 BPM for now
      for (let time = 0; time <= midiData.file.duration; time += beatInterval) {
        const x = timeToX(time);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
    }, [settings, midiData.file.duration, noteToY, timeToX]);

    // Draw MIDI notes
    const drawNotes = useCallback((ctx: CanvasRenderingContext2D) => {
      tracks.forEach(track => {
        track.notes.forEach(note => {
          // Skip notes outside visible range
          if (note.pitch < settings.minKey || note.pitch > settings.maxKey) {
            return;
          }

          const x = timeToX(note.start);
          const y = noteToY(note.pitch);
          const noteWidth = timeToX(note.duration);
          const noteHeight = 10; // Leave 2px gap between notes

          // Draw note rectangle
          ctx.fillStyle = getNoteColor(track, note);
          ctx.fillRect(x, y + 1, Math.max(1, noteWidth), noteHeight);

          // Draw note border for definition
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y + 1, Math.max(1, noteWidth), noteHeight);

          // Draw note name if zoomed in enough
          if (zoom > 2 && noteWidth > 30) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '8px monospace';
            ctx.fillText(note.noteName, x + 2, y + 8);
          }
        });
      });
    }, [tracks, settings, timeToX, noteToY, zoom, getNoteColor]);

    // Draw playhead
    const drawPlayhead = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const x = timeToX(currentTime);
      
      // Draw playhead line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();

      // Draw playhead triangle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(x - 5, 0);
      ctx.lineTo(x + 5, 0);
      ctx.lineTo(x, 10);
      ctx.closePath();
      ctx.fill();
    }, [currentTime, timeToX]);

    // Main render function
    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Clear and draw
      drawGrid(ctx, canvas);
      drawNotes(ctx);
      drawPlayhead(ctx, canvas);
    }, [width, height, drawGrid, drawNotes, drawPlayhead]);

    // Handle resize and re-render
    useEffect(() => {
      render();
    }, [render]);

    // Animation loop for smooth playhead movement
    useEffect(() => {
      const animate = () => {
        render();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [render]);

    return (
      <canvas
        ref={canvasRef}
        className="piano-roll-canvas block"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          cursor: 'crosshair'
        }}
        onScroll={(e) => {
          if (onScrollChange) {
            const target = e.target as HTMLElement;
            onScrollChange({
              x: target.scrollLeft,
              y: target.scrollTop
            });
          }
        }}
      />
    );
  }
);

PianoRollCanvas.displayName = 'PianoRollCanvas';

// Helper function to determine key type (black/white)
function getKeyType(midiNote: number): 'black' | 'white' {
  const noteInOctave = midiNote % 12;
  const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
  return blackKeys.includes(noteInOctave) ? 'black' : 'white';
} 