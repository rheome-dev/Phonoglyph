'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Settings, Maximize, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { MetaballsEffect } from '@/lib/visualizer/effects/MetaballsEffect';
import { MidiHudEffect } from '@/lib/visualizer/effects/MidiHudEffect';
import { ParticleNetworkEffect } from '@/lib/visualizer/effects/ParticleNetworkEffect';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualEffect } from '@/types/visualizer';
import { DraggableModal } from '@/components/ui/draggable-modal';
import { EffectCarousel } from '@/components/ui/effect-carousel';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ThreeVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onFpsUpdate?: (fps: number) => void;
  className?: string;
}

export function ThreeVisualizer({
  midiData,
  settings,
  currentTime,
  isPlaying,
  onPlayPause,
  onSettingsChange,
  onFpsUpdate,
  className
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fps, setFPS] = useState(60);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectsEnabled, setEffectsEnabled] = useState({
    metaballs: false,
    midiHud: false,
    particleNetwork: false,
    particles: false,
    waveforms: false
  });

  const [openModals, setOpenModals] = useState<Record<string, boolean>>({
    metaballs: false,
    midiHud: false,
    particleNetwork: false,
  });

  const [availableEffects] = useState([
    { id: 'metaballs', name: 'Metaballs Effect', description: 'Ray marching-based fluid spheres that respond to MIDI notes with organic morphing and droplet-like behavior using SDFs.' },
    { id: 'midiHud', name: 'MIDI HUD Effect', description: 'Visual effects react to note velocity, track activity, and frequency content for dynamic color and motion responses.' },
    { id: 'particleNetwork', name: 'Particle Network Effect', description: 'Plugin-based architecture allows infinite visual effects to be added as creative coding modules and shaders.' }
  ]);

  const [activeSliderValues, setActiveSliderValues] = useState<Record<string, number>>({});

  // Initialize Three.js visualizer
  const initializeVisualizer = useCallback(() => {
    if (!canvasRef.current || visualizerRef.current) return;

    const canvas = canvasRef.current;
    // Mobile aspect ratio (9:16 portrait) with medium resolution
    const mobileWidth = 400;
    const mobileHeight = 711;
    
    const config: VisualizerConfig = {
      effects: [],
      canvas: {
        width: mobileWidth,
        height: mobileHeight,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
      performance: {
        targetFPS: 30, // Keep 30fps for performance
        adaptiveQuality: true,
        maxParticles: 5000 // Keep reduced particles for performance
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

    try {
      console.log('🎬 Initializing Three.js visualizer...', { width: mobileWidth, height: mobileHeight });
      visualizerRef.current = new VisualizerManager(canvas, config);
      console.log('✅ VisualizerManager created (blank)');
      
      // Start the visualizer but don't add any effects yet
      visualizerRef.current.play();
      console.log('▶️ Animation started (blank scene)');
      
      setIsInitialized(true);
      console.log('✅ Visualizer initialization complete (blank)');
    } catch (error) {
      console.error('❌ Failed to initialize visualizer:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      // Try to recover after a delay
      setTimeout(() => {
        console.log('🔄 Attempting to recover WebGL context...');
        setError(null);
        // Clear existing canvas context
        if (canvasRef.current) {
          const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
          if (gl && gl.getExtension('WEBGL_lose_context')) {
            gl.getExtension('WEBGL_lose_context')?.loseContext();
          }
        }
        // Try to reinitialize after clearing context
        setTimeout(initializeVisualizer, 1000);
      }, 2000);
    }
  }, []);

  // Convert MIDI data to live format
  const convertToLiveMIDI = useCallback((midiData: MIDIData, currentTime: number): LiveMIDIData => {
    const activeNotes: Array<{
      note: number;
      velocity: number;
      startTime: number;
      track: string;
    }> = [];

    // Find notes that are currently playing
    midiData.tracks.forEach(track => {
      track.notes.forEach(note => {
        const noteStart = note.start;
        const noteEnd = note.start + note.duration;
        
        if (currentTime >= noteStart && currentTime <= noteEnd) {
          activeNotes.push({
            note: note.pitch,
            velocity: note.velocity,
            startTime: noteStart,
            track: track.id
          });
        }
      });
    });

    const trackActivity: Record<string, boolean> = {};
    midiData.tracks.forEach(track => {
      trackActivity[track.id] = activeNotes.some(note => note.track === track.id);
    });

    return {
      activeNotes,
      currentTime,
      tempo: 120, // Default tempo, would come from MIDI file
      totalNotes: midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0),
      trackActivity
    };
  }, []);

  // Generate mock audio data (would come from Web Audio API in production)
  const generateAudioData = useCallback((midiData: MIDIData, currentTime: number): AudioAnalysisData => {
    const frequencies = new Float32Array(256);
    const timeData = new Float32Array(256);
    
    // Calculate volume based on active notes
    const liveMIDI = convertToLiveMIDI(midiData, currentTime);
    const noteActivity = liveMIDI.activeNotes.length;
    const dynamicVolume = Math.min(noteActivity / 3.0, 1.0);
    
    // Generate frequency data that responds to MIDI activity
    for (let i = 0; i < 256; i++) {
      const intensity = dynamicVolume * (0.5 + Math.sin(currentTime * 2 + i * 0.1) * 0.3);
      frequencies[i] = intensity;
      timeData[i] = intensity * 0.8;
    }

    return {
      frequencies,
      timeData,
      volume: Math.max(0.1, dynamicVolume),
      bass: Math.max(0.1, dynamicVolume * 0.8),
      mid: Math.max(0.1, dynamicVolume * 0.9),
      treble: Math.max(0.1, dynamicVolume * 0.7)
    };
  }, [convertToLiveMIDI]);

  // Update visualizer with MIDI data
  useEffect(() => {
    if (!visualizerRef.current || !isInitialized) return;

    const liveMIDI = convertToLiveMIDI(midiData, currentTime);
    const audioData = generateAudioData(midiData, currentTime);
    
    visualizerRef.current.updateMIDIData(liveMIDI);
    visualizerRef.current.updateAudioData(audioData);
  }, [midiData, currentTime, isInitialized, convertToLiveMIDI, generateAudioData]);

  // Handle play/pause
  useEffect(() => {
    if (!visualizerRef.current) return;

    if (isPlaying) {
      visualizerRef.current.play();
    } else {
      visualizerRef.current.pause();
    }
  }, [isPlaying]);

  // Monitor FPS (reduced frequency)
  useEffect(() => {
    if (!visualizerRef.current) return;

    const interval = setInterval(() => {
              const currentFps = visualizerRef.current?.getFPS() || 0;
        setFPS(currentFps);
        onFpsUpdate?.(currentFps);
    }, 2000); // Reduced from 1000ms to 2000ms

    return () => clearInterval(interval);
  }, [isInitialized]);

  // Initialize on mount
  useEffect(() => {
    const timer = setTimeout(initializeVisualizer, 100);
    return () => clearTimeout(timer);
  }, [initializeVisualizer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visualizerRef.current) {
        visualizerRef.current.dispose();
        visualizerRef.current = null;
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !visualizerRef.current) return;
      
      // Use original mobile aspect ratio
      const mobileWidth = 360;
      const mobileHeight = 640;
      canvasRef.current.width = mobileWidth;
      canvasRef.current.height = mobileHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleEffect = (effectId: string) => {
    if (!visualizerRef.current) return;

    const isEnabling = !effectsEnabled[effectId as keyof typeof effectsEnabled];
    setEffectsEnabled(prev => ({ ...prev, [effectId]: isEnabling }));

    if (isEnabling) {
        let effect;
        switch (effectId) {
          case 'metaballs':
            effect = new MetaballsEffect({
              trailLength: 10,
              baseRadius: 0.15,
              smoothingFactor: 0.1,
              colorPalette: ['#6644AA', '#4488AA', '#AA6644'],
              animationSpeed: 1.2,
              noiseIntensity: 0.8
            });
            break;
          case 'midiHud':
            effect = new MidiHudEffect();
            break;
          case 'particleNetwork':
            effect = new ParticleNetworkEffect();
            break;
        }

        if (effect) {
          visualizerRef.current.addEffect(effect);
        }
    } else {
      visualizerRef.current.removeEffect(effectId);
    }
  };

  const toggleModal = (effectId: string) => {
    // Always toggle the modal state immediately
    setOpenModals(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
    
    // Also toggle the effect
    toggleEffect(effectId);
  };

  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    visualizerRef.current?.updateEffectParameter(effectId, paramName, value);
    if (typeof value === 'number') {
      const paramKey = `${effectId}-${paramName}`;
      setActiveSliderValues(prev => ({...prev, [paramKey]: value}));
    }
  };

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    const interval = setInterval(() => {
      // Force a re-render to get the latest parameters from the visualizer effects
      // This is a simple way to keep the UI in sync.
      // A more complex implementation might use a dedicated event bus.
      forceUpdate(); 
    }, 200); // Poll every 200ms

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      {/* Edit Canvas Container - extends full browser width */}
      <div id="edit-canvas" className="relative bg-stone-500 p-8 pb-4 min-h-[800px] w-full">
        {/* Visualizer Container - centered within edit canvas */}
        <div className="max-w-6xl mx-auto">
          <MainContent
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            <Canvas canvasRef={canvasRef} />



            {error && <ErrorDisplay message={error} />}
          </MainContent>
        </div>

        {/* Modals are now rendered within the full-width edit canvas */}
        {availableEffects.map((effect, index) => {
          // Center the modals with slight offsets so they don't overlap
          const positions = [
            { x: 50, y: 100 },   // Metaballs - top left
            { x: 400, y: 100 },  // MIDI HUD - top right  
            { x: 200, y: 300 },  // Particle Network - center
          ];
          const initialPos = positions[index % positions.length];
          
          return (
            <DraggableModal
              key={effect.id}
              title={effect.name.replace('MIDI ', '').replace(' Overlay', '').replace(' Effect', '')}
              isOpen={openModals[effect.id]}
              onClose={() => toggleModal(effect.id)}
              initialPosition={initialPos}
            >
              <div className="space-y-4">
                {(() => {
                  const activeEffect = visualizerRef.current?.getAllEffects().find((e: VisualEffect) => e.id === effect.id);
                  if (!activeEffect) {
                    return (
                      <div className="text-white/60 text-xs font-mono text-center py-4">
                        Effect not active.
                      </div>
                    );
                  }
                  
                  // Sort parameters to show booleans first
                  const sortedParams = Object.entries(activeEffect.parameters).sort(([, a], [, b]) => {
                    if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
                    if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
                    return 0;
                  });

                  if (sortedParams.length === 0) {
                    return (
                      <div className="text-white/60 text-xs font-mono text-center py-4">
                        No configurable parameters.
                      </div>
                    );
                  }

                  return sortedParams.map(([paramName, value]) => {
                    if (typeof value === 'boolean') {
                      return (
                        <div key={paramName} className="flex items-center justify-between">
                          <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked: boolean) => handleParameterChange(effect.id, paramName, checked)}
                          />
                        </div>
                      )
                    }
                    if (typeof value === 'number') {
                      const paramKey = `${effect.id}-${paramName}`;
                      const displayValue = activeSliderValues[paramKey] ?? value;

                      // Special handling for smoothingFactor slider
                      if (paramName === 'smoothingFactor') {
                        return (
                          <div key={paramKey} className="space-y-2">
                            <Label className="text-white/80 text-xs font-mono flex items-center justify-between">
                              <span>{paramName}</span>
                              <span className="ml-2 text-white/60">{displayValue.toFixed(2)}</span>
                            </Label>
                            <Slider
                              value={[displayValue]}
                              onValueChange={([val]) => {
                                setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                                handleParameterChange(effect.id, paramName, val);
                              }}
                              min={0.1}
                              max={5.0}
                              step={0.01}
                            />
                          </div>
                        );
                      }
                      // Default for other numeric sliders
                      return (
                        <div key={paramKey} className="space-y-2">
                          <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                          <Slider
                            value={[displayValue]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effect.id, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                          />
                        </div>
                      );
                    }
                    if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
                      // Show a color input for color array parameters
                      const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
                      return (
                        <div key={paramName} className="space-y-2">
                          <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                            {displayName}
                            <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v: number) => Math.round(v * 255)).join(',')})` }} />
                          </Label>
                          <input
                            type="color"
                            value={`#${value.map((v: number) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                            onChange={e => {
                              const hex = e.target.value;
                              const rgb = [
                                parseInt(hex.slice(1, 3), 16) / 255,
                                parseInt(hex.slice(3, 5), 16) / 255,
                                parseInt(hex.slice(5, 7), 16) / 255
                              ];
                              handleParameterChange(effect.id, paramName, rgb);
                            }}
                            className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                          />
                        </div>
                      );
                    }
                    return null;
                  });
                })()}
              </div>
            </DraggableModal>
          )
        })}
      </div>

      {/* Effects Library */}
      <div className="max-w-6xl mx-auto" style={{ marginTop: '16px' }}>
        <EffectCarousel
          effects={availableEffects}
          selectedEffects={effectsEnabled}
          onSelectEffect={toggleModal}
        />
      </div>
    </div>
  );
}



function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 bg-destructive/80 text-destructive-foreground flex flex-col items-center justify-center p-4 text-center z-20">
      <h3 className="text-lg font-semibold">An Error Occurred</h3>
      <p className="text-sm">{message}</p>
      <Button onClick={() => window.location.reload()} variant="secondary" className="mt-4">
        Refresh Page
      </Button>
    </div>
  );
}

function MainContent({ children, onMouseEnter, onMouseLeave }: { children: React.ReactNode, onMouseEnter: () => void, onMouseLeave: () => void }) {
  return (
    <div 
      className="relative aspect-[9/16] w-full max-w-[400px] mx-auto bg-slate-900 rounded-lg overflow-hidden shadow-2xl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}

function Canvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full rounded-lg"
    />
  )
}

const getSliderMax = (paramName: string) => {
  switch (paramName) {
    case 'baseRadius': return 1;
    case 'animationSpeed': return 2;
    case 'noiseIntensity': return 5;
    case 'glowIntensity': return 3;
    case 'strength': return 3;
    case 'radius': return 2;
    case 'threshold': return 1;
    case 'maxParticles': return 200;
    case 'connectionDistance': return 5;
    case 'particleLifetime': return 10;
    case 'particleSize': return 50;
    case 'glowSoftness': return 5;
    default: return 1;
  }
}

const getSliderStep = (paramName: string) => {
  switch (paramName) {
    case 'baseRadius':
    case 'animationSpeed':
    case 'noiseIntensity':
    case 'glowIntensity':
    case 'strength':
    case 'radius':
    case 'threshold':
    case 'particleSize':
    case 'glowSoftness':
      return 0.01;
    default: return 1;
  }
}

const useForceUpdate = () => {
  const [, setValue] = useState(0);
  return () => setValue(value => value + 1);
} 