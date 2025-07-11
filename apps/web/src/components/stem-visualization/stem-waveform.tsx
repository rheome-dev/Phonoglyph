'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FeatureMarker {
  time: number;
  type: 'beat' | 'onset' | 'peak' | 'drop';
  intensity: number;
  frequency?: number;
}

export interface WaveformData {
  points: number[];
  sampleRate: number;
  duration: number;
  markers: FeatureMarker[];
}

export interface StemWaveformProps {
  stemType: string;
  waveformData: WaveformData;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onMute?: (muted: boolean) => void;
  isMuted?: boolean;
  className?: string;
}

const MARKER_COLORS = {
  beat: '#ef4444',      // red
  onset: '#3b82f6',     // blue
  peak: '#10b981',      // green
  drop: '#8b5cf6',      // purple
};

const MARKER_LABELS = {
  beat: 'Beat',
  onset: 'Onset',
  peak: 'Peak',
  drop: 'Drop',
};

export function StemWaveform({
  stemType,
  waveformData,
  isPlaying = false,
  currentTime = 0,
  onPlayPause,
  onSeek,
  onMute,
  isMuted = false,
  className
}: StemWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  // Stable drawing function
  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear canvas
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);

    if (!waveformData || waveformData.points.length === 0) return;

    // Add padding to prevent edge clipping
    const padding = 8;
    const startX = padding;
    const drawWidth = width - (padding * 2);

    // Draw edge lines to define track boundaries
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(width, 0.5);
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.moveTo(startX - 0.5, 0);
    ctx.lineTo(startX - 0.5, height);
    ctx.moveTo(startX + drawWidth + 0.5, 0);
    ctx.lineTo(startX + drawWidth + 0.5, height);
    ctx.stroke();

    // Draw center line (dashed)
    const centerY = height / 2;
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, Math.round(centerY) + 0.5);
    ctx.lineTo(startX + drawWidth, Math.round(centerY) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw waveform bars
    ctx.fillStyle = '#8db4e2';
    const barWidth = Math.max(1, drawWidth / waveformData.points.length);
    const maxAmplitude = height * 0.6; // 120% of available height for fuller appearance

    waveformData.points.forEach((amplitude, index) => {
      const x = startX + (index / (waveformData.points.length - 1)) * drawWidth;
      const barHeight = Math.abs(amplitude) * maxAmplitude;
      
      // Draw both positive and negative parts for each bar
      const y = Math.round(centerY - barHeight);
      const h = Math.round(barHeight * 2); // Full height above and below center
      
      if (h > 0) {
        ctx.fillRect(Math.round(x - barWidth/2), y, Math.round(barWidth), h);
      }
    });

    // Draw analysis markers (beats, onsets, etc.)
    if (waveformData.markers && waveformData.markers.length > 0) {
      const markerColors = {
        beat: '#ff6b6b',
        onset: '#4dabf7', 
        peak: '#51cf66',
        drop: '#9775fa'
      };
      
      waveformData.markers.forEach((marker) => {
        const markerX = startX + (marker.time / waveformData.duration) * drawWidth;
        
        if (markerX >= startX && markerX <= startX + drawWidth) {
          ctx.fillStyle = markerColors[marker.type] || '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          
          const markerSize = 2.5;
          const markerY = height - 15; // Position near bottom
          
          // Draw marker with dark outline
          ctx.beginPath();
          ctx.arc(Math.round(markerX), markerY, markerSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    }

    // Draw progress marker
    if (waveformData.points.length > 0) {
      const duration = waveformData.duration; // Use actual duration from waveformData
      const progressX = startX + (currentTime / duration) * drawWidth;
      
      // Ensure marker is within bounds
      if (progressX >= startX && progressX <= startX + drawWidth) {
        ctx.fillStyle = '#ff6b6b';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        const markerSize = 3;
        const markerY = 10;
        
        // Draw marker with dark outline
        ctx.beginPath();
        ctx.arc(Math.round(progressX), markerY, markerSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw hover marker and label
    if (hoveredTime !== null && waveformData.points.length > 0) {
      const duration = waveformData.duration;
      const hoverX = startX + (hoveredTime / duration) * drawWidth;
      
      if (hoverX >= startX && hoverX <= startX + drawWidth) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        const markerSize = 2.5;
        const markerY = 10;
        
        // Draw hover marker
        ctx.beginPath();
        ctx.arc(Math.round(hoverX), markerY, markerSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw time label with outline
        const timeText = `${hoveredTime.toFixed(1)}s`;
        ctx.font = '10px monospace';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(timeText, Math.round(hoverX) + 5, markerY - 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(timeText, Math.round(hoverX) + 5, markerY - 5);
      }
    }
  }, [waveformData, currentTime, hoveredTime]);

  // Handle canvas resizing and redrawing with debouncing
  const updateCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 50;

    // Set display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Set actual canvas size for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale context for device pixel ratio
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    drawWaveform(ctx, width, height);
  }, [drawWaveform]);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      updateCanvas();
    }, 16); // ~60fps debouncing
  }, [updateCanvas]);

  // Setup resize listener and initial draw
  useEffect(() => {
    updateCanvas();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - setup only once

  // Redraw when data changes
  useEffect(() => {
    updateCanvas();
  }, [updateCanvas]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = 8;
    const startX = padding;
    const drawWidth = rect.width - (padding * 2);
    
    if (x >= startX && x <= startX + drawWidth && waveformData) {
      const duration = waveformData.duration;
      const time = ((x - startX) / drawWidth) * duration;
      setHoveredTime(time);
    } else {
      setHoveredTime(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTime(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = 8;
    const startX = padding;
    const drawWidth = rect.width - (padding * 2);
    
    if (x >= startX && x <= startX + drawWidth && waveformData && onSeek) {
      const duration = waveformData.duration;
      const time = ((x - startX) / drawWidth) * duration;
      onSeek(time);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${className || ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: '50px', display: 'block' }}
      />
    </div>
  );
} 