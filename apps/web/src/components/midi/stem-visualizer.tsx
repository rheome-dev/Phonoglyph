'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, Upload, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { StemVisualizationController } from '@/lib/visualizer/core/StemVisualizationController';
import { MetaballsEffect } from '@/lib/visualizer/effects/MetaballsEffect';
import { MidiHudEffect } from '@/lib/visualizer/effects/MidiHudEffect';
import { ParticleNetworkEffect } from '@/lib/visualizer/effects/ParticleNetworkEffect';
import { DEFAULT_PRESETS } from '@/types/stem-visualization';

interface StemVisualizerProps {
  className?: string;
}

export function StemVisualizer({ className }: StemVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerManager | null>(null);
  const controllerRef = useRef<StemVisualizationController | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFPS] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

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

      // Initialize controller
      controllerRef.current = new StemVisualizationController(visualizerRef.current);
      controllerRef.current.applyPreset(DEFAULT_PRESETS[0]);
      
      console.log('✅ Visualizer initialized with effects');
    } catch (error) {
      console.error('❌ Failed to initialize visualizer:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !visualizerRef.current || !controllerRef.current) return;

    try {
      // Process each file as a stem
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const stemType = getStemTypeFromFilename(file.name);
        if (!stemType) continue;

        const buffer = await file.arrayBuffer();
        await visualizerRef.current.loadAudioBuffer(buffer);
        setIsPlaying(true);
      }
      console.log('✅ Stem files loaded');
    } catch (error) {
      console.error('❌ Failed to load stem files:', error);
      setError('Failed to load stem files');
    }
  };

  const getStemTypeFromFilename = (filename: string): string | null => {
    const stemTypes = ['drums', 'bass', 'vocals', 'other'];
    for (const type of stemTypes) {
      if (filename.toLowerCase().includes(type)) {
        return type;
      }
    }
    return null;
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
      if (controllerRef.current) {
        controllerRef.current.dispose();
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
            onClick={() => document.getElementById('stem-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <input
            id="stem-upload"
            type="file"
            accept="audio/*"
            multiple
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
        {showSettings && (
          <div className="absolute right-4 bottom-16 bg-black/80 p-4 rounded-lg w-64">
            <h3 className="text-white font-bold mb-4">Visualization Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-white">Global Intensity</Label>
                <Slider
                  defaultValue={[1.0]}
                  min={0}
                  max={2}
                  step={0.1}
                  onValueChange={([value]) => {
                    visualizerRef.current?.updateSettings({ globalIntensity: value });
                  }}
                />
              </div>
              <div>
                <Label className="text-white">Smoothing</Label>
                <Slider
                  defaultValue={[0.2]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={([value]) => {
                    visualizerRef.current?.updateSettings({ smoothingFactor: value });
                  }}
                />
              </div>
              <div>
                <Label className="text-white">Responsiveness</Label>
                <Slider
                  defaultValue={[0.8]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={([value]) => {
                    visualizerRef.current?.updateSettings({ responsiveness: value });
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 