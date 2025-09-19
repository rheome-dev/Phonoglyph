'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Zap, Music, Volume2, Play, Pause } from 'lucide-react';

interface AnalysisData {
  transients: Array<{
    time: number;
    intensity: number;
    frequency: number;
  }>;
  chroma: Array<{
    time: number;
    pitch: number;
    confidence: number;
    note: string;
  }>;
  rms: Array<{
    time: number;
    value: number;
  }>;
  waveform: number[];
}

interface AnalysisVisualizationProps {
  analysisData: AnalysisData;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
}

const CHROMA_COLORS = [
  '#ef4444', // C - Red
  '#f97316', // C# - Orange
  '#eab308', // D - Yellow
  '#84cc16', // D# - Lime
  '#22c55e', // E - Green
  '#10b981', // F - Emerald
  '#06b6d4', // F# - Cyan
  '#0ea5e9', // G - Sky
  '#3b82f6', // G# - Blue
  '#6366f1', // A - Indigo
  '#8b5cf6', // A# - Violet
  '#d946ef', // B - Fuchsia
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function AnalysisVisualization({
  analysisData,
  currentTime,
  duration,
  onSeek,
  isPlaying
}: AnalysisVisualizationProps) {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const chromaCanvasRef = useRef<HTMLCanvasElement>(null);
  const rmsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedView, setSelectedView] = useState<'waveform' | 'chroma' | 'rms' | 'all'>('all');

  // Draw waveform with transient markers
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !analysisData.waveform) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    
    const waveform = analysisData.waveform;
    for (let i = 0; i < waveform.length; i++) {
      const x = (i / (waveform.length - 1)) * width;
      const y = midY - (waveform[i] * midY * 0.8);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw transient markers
    if (analysisData.transients) {
      analysisData.transients.forEach(transient => {
        const x = (transient.time / duration) * width;
        const intensity = transient.intensity;
        const markerHeight = intensity * height * 0.6;
        
        // Draw vertical line
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.moveTo(x, midY - markerHeight / 2);
        ctx.lineTo(x, midY + markerHeight / 2);
        ctx.stroke();
        
        // Draw intensity circle
        ctx.beginPath();
        ctx.fillStyle = `rgba(239, 68, 68, ${intensity})`;
        ctx.arc(x, midY, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  }, [analysisData, currentTime, duration]);

  // Draw chroma visualization
  const drawChroma = useCallback(() => {
    const canvas = chromaCanvasRef.current;
    if (!canvas || !analysisData.chroma) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const noteHeight = height / 12;

    ctx.clearRect(0, 0, width, height);

    // Draw chroma data
    analysisData.chroma.forEach(chroma => {
      const x = (chroma.time / duration) * width;
      const y = (11 - chroma.pitch) * noteHeight; // Invert Y so C is at top
      const noteWidth = 4;
      const alpha = chroma.confidence;
      
      ctx.fillStyle = `${CHROMA_COLORS[chroma.pitch]}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fillRect(x - noteWidth / 2, y, noteWidth, noteHeight);
    });

    // Draw note labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i < 12; i++) {
      const y = (11 - i) * noteHeight + noteHeight / 2 + 4;
      ctx.fillText(NOTE_NAMES[i], 30, y);
    }

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  }, [analysisData, currentTime, duration]);

  // Draw RMS visualization
  const drawRMS = useCallback(() => {
    const canvas = rmsCanvasRef.current;
    if (!canvas || !analysisData.rms) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Draw RMS curve
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    
    analysisData.rms.forEach((rms, index) => {
      const x = (rms.time / duration) * width;
      const y = height - (rms.value * height);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill area under curve
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    
    analysisData.rms.forEach((rms, index) => {
      const x = (rms.time / duration) * width;
      const y = height - (rms.value * height);
      
      if (index === 0) {
        ctx.moveTo(x, height);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  }, [analysisData, currentTime, duration]);

  // Handle canvas click for seeking
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativePosition = x / rect.width;
    const seekTime = relativePosition * duration;
    onSeek(seekTime);
  }, [duration, onSeek]);

  // Redraw canvases when data changes
  useEffect(() => {
    if (selectedView === 'waveform' || selectedView === 'all') {
      drawWaveform();
    }
    if (selectedView === 'chroma' || selectedView === 'all') {
      drawChroma();
    }
    if (selectedView === 'rms' || selectedView === 'all') {
      drawRMS();
    }
  }, [selectedView, drawWaveform, drawChroma, drawRMS]);

  // Redraw on window resize
  useEffect(() => {
    const handleResize = () => {
      if (selectedView === 'waveform' || selectedView === 'all') {
        drawWaveform();
      }
      if (selectedView === 'chroma' || selectedView === 'all') {
        drawChroma();
      }
      if (selectedView === 'rms' || selectedView === 'all') {
        drawRMS();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedView, drawWaveform, drawChroma, drawRMS]);

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analysis Visualization
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedView === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={selectedView === 'waveform' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('waveform')}
              className="text-xs"
            >
              Waveform
            </Button>
            <Button
              variant={selectedView === 'chroma' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('chroma')}
              className="text-xs"
            >
              Chroma
            </Button>
            <Button
              variant={selectedView === 'rms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('rms')}
              className="text-xs"
            >
              RMS
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Waveform Visualization */}
        {(selectedView === 'waveform' || selectedView === 'all') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Waveform with Transients</h3>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {analysisData.transients?.length || 0} transients
              </Badge>
            </div>
            <div className="relative">
              <canvas
                ref={waveformCanvasRef}
                onClick={handleCanvasClick}
                className="w-full h-32 bg-slate-900/50 rounded-lg cursor-pointer"
              />
              <div className="absolute top-2 left-2 text-xs text-slate-400">
                Click to seek • Red markers = transients
              </div>
            </div>
          </div>
        )}

        {/* Chroma Visualization */}
        {(selectedView === 'chroma' || selectedView === 'all') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Chroma Analysis</h3>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {new Set(analysisData.chroma?.map(c => c.note) || []).size} unique notes
              </Badge>
            </div>
            <div className="relative">
              <canvas
                ref={chromaCanvasRef}
                onClick={handleCanvasClick}
                className="w-full h-48 bg-slate-900/50 rounded-lg cursor-pointer"
              />
              <div className="absolute top-2 left-2 text-xs text-slate-400">
                Click to seek • Colors = chroma classes
              </div>
            </div>
          </div>
        )}

        {/* RMS Visualization */}
        {(selectedView === 'rms' || selectedView === 'all') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-green-400" />
              <h3 className="text-lg font-semibold text-white">RMS Analysis</h3>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                Avg: {analysisData.rms?.length ? 
                  (analysisData.rms.reduce((sum, r) => sum + r.value, 0) / analysisData.rms.length).toFixed(3) : 
                  '0.000'
                }
              </Badge>
            </div>
            <div className="relative">
              <canvas
                ref={rmsCanvasRef}
                onClick={handleCanvasClick}
                className="w-full h-32 bg-slate-900/50 rounded-lg cursor-pointer"
              />
              <div className="absolute top-2 left-2 text-xs text-slate-400">
                Click to seek • Green area = RMS amplitude
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-600">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" />
              Transients
            </h4>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Onset detection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/50 rounded-full"></div>
                <span>Intensity = opacity</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-blue-400" />
              Chroma
            </h4>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>C</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>G</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>E</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-green-400" />
              RMS
            </h4>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Amplitude curve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500/20 rounded"></div>
                <span>Filled area</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


