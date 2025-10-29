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
  duration: number;
  sampleRate: number;
  markers: FeatureMarker[];
}

export interface StemWaveformProps {
  waveformData: WaveformData | null;
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
  isPlaying: boolean;
  isLoading?: boolean;
  zoom: number;
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

const WaveformVisualizer: React.FC<StemWaveformProps> = ({
  waveformData,
  duration,
  currentTime,
  onSeek,
  isPlaying,
  isLoading,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !waveformData?.points) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    const points = waveformData.points;
    const numPoints = points.length;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // FIX: Use a continuous path for a filled waveform
    ctx.beginPath();
    ctx.moveTo(0, midY);

    const step = Math.max(1, Math.floor(1 / Math.max(zoom, 0.001)));

    // Draw top half
    for (let i = 0; i < numPoints; i += step) {
      const x = (i / (numPoints - 1)) * width;
      const pointHeight = points[i] * midY * 0.8;
      ctx.lineTo(x, midY - pointHeight);
    }

    // Draw bottom half in reverse
    for (let i = numPoints - 1; i >= 0; i -= step) {
      const x = (i / (numPoints - 1)) * width;
      const pointHeight = points[i] * midY * 0.8;
      ctx.lineTo(x, midY + pointHeight);
    }

    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

  }, [waveformData, zoom]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativePosition = x / rect.width;
    onSeek(relativePosition * duration);
  };
  
  if (isLoading) {
    return (
      <div className="h-[32px] flex items-center justify-center bg-stone-800/20">
        <p className="text-xs text-stone-400">Analyzing...</p>
      </div>
    );
  }

  if (!waveformData) {
    return (
      <div className="h-[32px] flex items-center justify-center bg-stone-800/20">
        <p className="text-xs text-stone-500">No analysis data available</p>
      </div>
    );
  }
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className="relative h-[32px] w-full cursor-pointer"
      onClick={handleSeek}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div 
        className="absolute top-0 left-0 h-full bg-white/20"
        style={{ width: `${progress}%` }}
      />
      <div 
        className="absolute top-0 w-px h-full bg-red-500"
        style={{ left: `${progress}%` }}
      />
    </div>
  );
};

export const StemWaveform = React.memo(WaveformVisualizer); 