'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, Upload, Settings } from 'lucide-react';
import { cn, debugLog } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { StemVisualizationController } from '@/lib/visualizer/core/StemVisualizationController';
import { MetaballsEffect } from '@/lib/visualizer/effects/MetaballsEffect';
import { MidiHudEffect } from '@/lib/visualizer/effects/MidiHudEffect';
import { ParticleNetworkEffect } from '@/lib/visualizer/effects/ParticleNetworkEffect';
import { DEFAULT_PRESETS } from '@/lib/default-visualization-mappings';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';

interface StemVisualizerProps {
  className?: string;
  projectFiles?: Array<{
    id: string;
    file_name: string;
    file_type: string;
    upload_status: string;
  }>;
}

export function StemVisualizer({ className, projectFiles }: StemVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerManager | null>(null);
  const controllerRef = useRef<StemVisualizationController | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFPS] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const stemAudio = useStemAudioController();

  const initializeVisualizer = async () => {
    debugLog.log('🎭 initializeVisualizer called');
    if (!canvasRef.current || visualizerRef.current) {
      debugLog.log('🎭 Skipping initialization - canvas or visualizer already exists');
      return;
    }

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
      debugLog.log('🎭 Creating VisualizerManager...');
      visualizerRef.current = new VisualizerManager(canvas, config);
      
      // Add effects
      debugLog.log('🎭 Creating effects...');
      const metaballs = new MetaballsEffect();
      const hud = new MidiHudEffect();
      const particles = new ParticleNetworkEffect();
      
      debugLog.log('🎨 Adding effects:', { metaballs: metaballs.id, hud: hud.id, particles: particles.id });
      
      visualizerRef.current.addEffect(metaballs);
      visualizerRef.current.addEffect(hud);
      visualizerRef.current.addEffect(particles);

      // Enable all effects
      visualizerRef.current.enableEffect(metaballs.id);
      visualizerRef.current.enableEffect(hud.id);
      visualizerRef.current.enableEffect(particles.id);
      
      debugLog.log('🎨 Effects added and enabled. Total effects:', visualizerRef.current.getAllEffects().length);
      debugLog.log('🎨 Active effects:', visualizerRef.current.getAllEffects().filter(e => e.enabled).length);

      // Initialize controller
      controllerRef.current = new StemVisualizationController(visualizerRef.current);
      controllerRef.current.applyPreset(DEFAULT_PRESETS[0]);
      
      debugLog.log('✅ Visualizer initialized with effects');
    } catch (error) {
      debugLog.error('❌ Failed to initialize visualizer:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !visualizerRef.current || !controllerRef.current) return;

    try {
      // Ensure effects are added to the current visualizer instance
      debugLog.log('🎨 Checking effects on current visualizer...');
      const currentEffects = visualizerRef.current.getAllEffects();
      debugLog.log('🎨 Current effects:', currentEffects.length);
      
      if (currentEffects.length === 0) {
        debugLog.log('🎨 Re-adding effects to visualizer...');
        // Re-add effects if they're missing
        const metaballs = new MetaballsEffect();
        const hud = new MidiHudEffect();
        const particles = new ParticleNetworkEffect();
        
        visualizerRef.current.addEffect(metaballs);
        visualizerRef.current.addEffect(hud);
        visualizerRef.current.addEffect(particles);

        visualizerRef.current.enableEffect(metaballs.id);
        visualizerRef.current.enableEffect(hud.id);
        visualizerRef.current.enableEffect(particles.id);
        
        debugLog.log('🎨 Effects re-added. Total effects:', visualizerRef.current.getAllEffects().length);
      }

      // Process each file as a stem
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const stemType = getStemTypeFromFilename(file.name);
        if (!stemType) continue;

        const buffer = await file.arrayBuffer();
        // Add detailed logging
        debugLog.log('Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size);
        debugLog.log('Buffer as string:', new TextDecoder().decode(buffer.slice(0, 200)));
        await visualizerRef.current.loadAudioBuffer(buffer);
        setIsPlaying(true);
      }
      debugLog.log('✅ Stem files loaded');
    } catch (error) {
      debugLog.error('❌ Failed to load stem files:', error);
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
      stemAudio.pause();
    } else {
      visualizerRef.current.play();
      stemAudio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Sync with stem audio controller
  useEffect(() => {
    if (stemAudio.isPlaying !== isPlaying) {
      setIsPlaying(stemAudio.isPlaying);
    }
  }, [stemAudio.isPlaying, isPlaying]);

  // Load stems from project files
  useEffect(() => {
    if (!projectFiles || !visualizerRef.current) return;

    const audioFiles = projectFiles.filter(file => 
      file.file_type === 'audio' && file.upload_status === 'completed'
    );

    if (audioFiles.length > 0) {
      const loadStems = async () => {
        try {
          for (const file of audioFiles) {
            // For now, we'll use a placeholder approach
            // In a real implementation, you'd get the download URL from the API
            debugLog.log('Loading stem:', file.file_name);
            // await visualizerRef.current!.loadAudioBuffer(buffer);
          }
          debugLog.log('✅ Project stems loaded:', audioFiles.length);
        } catch (error) {
          debugLog.error('❌ Failed to load project stems:', error);
          setError('Failed to load project stems');
        }
      };
      loadStems();
    }
  }, [projectFiles]);

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