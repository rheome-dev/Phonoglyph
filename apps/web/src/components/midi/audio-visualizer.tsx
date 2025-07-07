'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { MetaballsEffect } from '@/lib/visualizer/effects/MetaballsEffect';
import { MidiHudEffect } from '@/lib/visualizer/effects/MidiHudEffect';
import { ParticleNetworkEffect } from '@/lib/visualizer/effects/ParticleNetworkEffect';

interface AudioVisualizerProps {
  className?: string;
}

export function AudioVisualizer({ className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFPS] = useState(0);

  const initializeVisualizer = async () => {
    if (!canvasRef.current || visualizerRef.current) return;

    const canvas = canvasRef.current;
    const config = {
      effects: [],
      canvas: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
      performance: {
        targetFPS: 60,
        adaptiveQuality: true,
        maxParticles: 10000
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

    try {
      visualizerRef.current = new VisualizerManager(canvas, config);
      
      // Add effects
      const metaballs = new MetaballsEffect();
      const hud = new MidiHudEffect();
      const particles = new ParticleNetworkEffect();
      
      visualizerRef.current.addEffect(metaballs);
      visualizerRef.current.addEffect(hud);
      visualizerRef.current.addEffect(particles);
      
      console.log('✅ Visualizer initialized with effects');
    } catch (error) {
      console.error('❌ Failed to initialize visualizer:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !visualizerRef.current) return;

    try {
      const buffer = await file.arrayBuffer();
      await visualizerRef.current.loadAudioBuffer(buffer);
      setIsPlaying(true);
      console.log('✅ Audio file loaded');
    } catch (error) {
      console.error('❌ Failed to load audio file:', error);
      setError('Failed to load audio file');
    }
  };

  const togglePlayPause = () => {
    if (!visualizerRef.current) return;

    if (isPlaying) {
      visualizerRef.current.pause();
    } else {
      visualizerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    initializeVisualizer();
    return () => {
      if (visualizerRef.current) {
        visualizerRef.current.dispose();
      }
    };
  }, []);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ background: '#000' }}
        />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={togglePlayPause}
            disabled={!visualizerRef.current}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => document.getElementById('audio-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        {error && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded">
            {error}
          </div>
        )}
        <div className="absolute top-4 right-4 text-white">
          FPS: {fps}
        </div>
      </CardContent>
    </Card>
  );
} 