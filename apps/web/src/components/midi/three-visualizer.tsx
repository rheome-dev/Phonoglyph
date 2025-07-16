'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Settings, Maximize, Download } from 'lucide-react';
import { cn, debugLog } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { MetaballsEffect } from '@/lib/visualizer/effects/MetaballsEffect';
import { ParticleNetworkEffect } from '@/lib/visualizer/effects/ParticleNetworkEffect';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualEffect } from '@/types/visualizer';
import { PortalModal } from '@/components/ui/portal-modal';
import { EffectCarousel } from '@/components/ui/effect-carousel';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DroppableParameter } from '@/components/ui/droppable-parameter';

interface ThreeVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onFpsUpdate?: (fps: number) => void;
  className?: string;
  selectedEffects: Record<string, boolean>;
  onSelectedEffectsChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  aspectRatio?: 'mobile' | 'youtube';
  // Modal and mapping props
  openEffectModals: Record<string, boolean>;
  onCloseEffectModal: (effectId: string) => void;
  mappings: Record<string, string | null>;
  featureNames: Record<string, string>;
  onMapFeature: (parameterId: string, featureId: string) => void;
  onUnmapFeature: (parameterId: string) => void;
  activeSliderValues: Record<string, number>;
  setActiveSliderValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  visualizerRef?: React.RefObject<any>;
}

export function ThreeVisualizer({
  midiData,
  settings,
  currentTime,
  isPlaying,
  onPlayPause,
  onSettingsChange,
  onFpsUpdate,
  className,
  selectedEffects,
  onSelectedEffectsChange,
  aspectRatio,
  openEffectModals,
  onCloseEffectModal,
  mappings,
  featureNames,
  onMapFeature,
  onUnmapFeature,
  activeSliderValues,
  setActiveSliderValues,
  visualizerRef: externalVisualizerRef
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVisualizerRef = useRef<VisualizerManager | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Forward the ref to parent component
  React.useImperativeHandle(externalVisualizerRef, () => {
    console.log('🎛️ Visualizer ref requested:', {
      hasInternalRef: !!internalVisualizerRef.current,
      isInitialized,
      availableEffects: internalVisualizerRef.current?.getAllEffects?.()?.map((e: any) => e.id) || []
    });
    return internalVisualizerRef.current;
  }, [isInitialized]);
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

  const [availableEffects] = useState([
    { id: 'metaballs', name: 'Metaballs Effect', description: 'Ray marching-based fluid spheres that respond to MIDI notes with organic morphing and droplet-like behavior using SDFs.' },
    { id: 'midiHud', name: 'MIDI HUD Effect', description: 'Visual effects react to note velocity, track activity, and frequency content for dynamic color and motion responses.' },
    { id: 'particleNetwork', name: 'Particle Network Effect', description: 'Plugin-based architecture allows infinite visual effects to be added as creative coding modules and shaders.' }
  ]);

  // Initialize Three.js visualizer
  const initializeVisualizer = useCallback(() => {
    if (!canvasRef.current || !containerRef.current || internalVisualizerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Get container dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Set canvas dimensions based on aspect ratio preference
    let canvasWidth, canvasHeight;
    
    if (aspectRatio === 'youtube') {
      // YouTube dimensions (16:9 landscape) - fill the container width
      canvasWidth = containerWidth;
      canvasHeight = containerHeight;
      // The Three.js content will render at 16:9 within this space
    } else {
      // Mobile dimensions (9:16 portrait) - fit portrait within container
      const targetAspectRatio = 9 / 16;
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * targetAspectRatio;
      // Center horizontally if container is wider
      if (canvasWidth > containerWidth) {
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / targetAspectRatio;
      }
    }
    
    const config: VisualizerConfig = {
      effects: [],
      canvas: {
        width: Math.round(canvasWidth),
        height: Math.round(canvasHeight),
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
      performance: {
        targetFPS: 30, // Keep 30fps for performance
        adaptiveQuality: true,
        maxParticles: 2000 // Reduced from 5000 for better performance
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

    try {
      debugLog.log('🎬 Initializing Three.js visualizer...', { 
        aspectRatio, 
        containerWidth, 
        containerHeight, 
        canvasWidth: Math.round(canvasWidth), 
        canvasHeight: Math.round(canvasHeight) 
      });
      internalVisualizerRef.current = new VisualizerManager(canvas, config);
      debugLog.log('✅ VisualizerManager created');
      
      // Add all available effects to the visualizer
      const metaballs = new MetaballsEffect();
      const particles = new ParticleNetworkEffect();
      
      internalVisualizerRef.current.addEffect(metaballs);
      internalVisualizerRef.current.addEffect(particles);
      
      debugLog.log('🎨 Effects added to visualizer');
      
      // Don't start the visualizer immediately - wait for play button
      setIsInitialized(true);
      debugLog.log('✅ Visualizer initialization complete');
      console.log('🎛️ Visualizer initialized successfully:', {
        hasRef: !!internalVisualizerRef.current,
        availableEffects: internalVisualizerRef.current?.getAllEffects?.()?.map((e: any) => e.id) || [],
        canvasSize: { width: canvas.width, height: canvas.height }
      });

      // Force an initial resize so the renderer matches the container dimensions
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    } catch (error) {
      debugLog.error('❌ Failed to initialize visualizer:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      // Try to recover after a delay
      setTimeout(() => {
        debugLog.log('🔄 Attempting to recover WebGL context...');
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
  }, [aspectRatio]);

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
    const frequencies = new Array(256);
    const timeData = new Array(256);
    
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

  // Update visualizer with MIDI data and enhanced audio analysis
  useEffect(() => {
    if (!internalVisualizerRef.current || !isInitialized) return;

    const liveMIDI = convertToLiveMIDI(midiData, currentTime);
    
    // Fall back to generated data, as real-time analysis is now handled by the parent page
    const audioData = generateAudioData(midiData, currentTime);
    
    internalVisualizerRef.current.updateMIDIData(liveMIDI);
    internalVisualizerRef.current.updateAudioData(audioData);
  }, [midiData, currentTime, isInitialized, generateAudioData, convertToLiveMIDI]);

  // Handle play/pause
  useEffect(() => {
    if (!internalVisualizerRef.current) return;

    if (isPlaying) {
      internalVisualizerRef.current.play();
    } else {
      internalVisualizerRef.current.pause();
    }
  }, [isPlaying]);

  // Monitor FPS (reduced frequency)
  useEffect(() => {
    if (!internalVisualizerRef.current) return;

    const interval = setInterval(() => {
              const currentFps = internalVisualizerRef.current?.getFPS() || 0;
        setFPS(currentFps);
        onFpsUpdate?.(currentFps);
    }, 2000); // Reduced from 1000ms to 2000ms

    return () => clearInterval(interval);
  }, [isInitialized, onFpsUpdate]);

  // Initialize on mount
  useEffect(() => {
    const timer = setTimeout(initializeVisualizer, 100);
    return () => clearTimeout(timer);
  }, [initializeVisualizer]);

  // Effect enabling/disabling logic
  useEffect(() => {
    if (!internalVisualizerRef.current) return;
    
    const allEffects = internalVisualizerRef.current.getAllEffects();
    debugLog.log('🎨 Effect carousel selection changed:', selectedEffects);
    debugLog.log('🎨 Available effects:', allEffects.map((e: any) => ({ id: e.id, name: e.name, enabled: e.enabled })));
    
    allEffects.forEach((effect: any) => {
      const shouldBeEnabled = selectedEffects[effect.id];
      debugLog.log(`🎨 Effect ${effect.id}: ${effect.enabled ? 'enabled' : 'disabled'} -> ${shouldBeEnabled ? 'enabling' : 'disabling'}`);
      
      if (shouldBeEnabled) {
        internalVisualizerRef.current!.enableEffect(effect.id);
      } else {
        internalVisualizerRef.current!.disableEffect(effect.id);
      }
    });
  }, [selectedEffects]);

  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    internalVisualizerRef.current?.updateEffectParameter(effectId, paramName, value);
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
  }, [forceUpdate]);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <div className={cn("relative w-full h-full", className)} ref={containerRef}>
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

        {/* Modals are now rendered within the full-width edit canvas */}
        {Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
          if (!isOpen) return null;
          const effectInstance = internalVisualizerRef.current?.getAllEffects().find((e: any) => e.id === effectId);
          if (!effectInstance) return null;
          const sortedParams = Object.entries(effectInstance.parameters).sort(([, a], [, b]) => {
            if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
            if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
            return 0;
          });
          const initialPos = {
            x: 100 + (index * 50),
            y: 100 + (index * 50)
          };
          return (
            <PortalModal
              key={effectId}
              title={effectInstance.name.replace(' Effect', '')}
              isOpen={isOpen}
              onClose={() => onCloseEffectModal(effectId)}
              initialPosition={initialPos}
              bounds="#editor-bounds"
            >
              <div className="space-y-4">
                <div className="text-sm text-white/80 mb-4">{effectInstance.description}</div>
                {sortedParams.length === 0 ? (
                  <div className="text-white/60 text-xs font-mono text-center py-4">No configurable parameters.</div>
                ) : (
                  sortedParams.map(([paramName, value]) => {
                    if (typeof value === 'boolean') {
                      return (
                        <div key={paramName} className="flex items-center justify-between">
                          <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => handleParameterChange(effectId, paramName, checked)}
                          />
                        </div>
                      );
                    }
                    if (typeof value === 'number') {
                      const paramKey = `${effectId}-${paramName}`;
                      const mappedFeatureId = mappings[paramKey];
                      const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
                      return (
                        <DroppableParameter
                          key={paramKey}
                          parameterId={paramKey}
                          label={paramName}
                          mappedFeatureId={mappedFeatureId}
                          mappedFeatureName={mappedFeatureName}
                          onFeatureDrop={onMapFeature}
                          onFeatureUnmap={onUnmapFeature}
                          className="mb-2"
                          dropZoneStyle="inlayed"
                          showTagOnHover
                        >
                          <Slider
                            value={[activeSliderValues[paramKey] ?? value]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effectId, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                            className="w-full"
                          />
                        </DroppableParameter>
                      );
                    }
                    if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
                      const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
                      return (
                        <div key={paramName} className="space-y-2">
                          <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                            {displayName}
                            <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v) => Math.round(v * 255)).join(',')})` }} />
                          </Label>
                          <input
                            type="color"
                            value={`#${value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                            onChange={e => {
                              const hex = e.target.value;
                              const rgb = [
                                parseInt(hex.slice(1, 3), 16) / 255,
                                parseInt(hex.slice(3, 5), 16) / 255,
                                parseInt(hex.slice(5, 7), 16) / 255
                              ];
                              handleParameterChange(effectId, paramName, rgb);
                            }}
                            className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                          />
                        </div>
                      );
                    }
                    return null;
                  })
                )}
                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
                    <Switch 
                      checked={selectedEffects[effectId]}
                      onCheckedChange={(checked) => {
                        onSelectedEffectsChange(prev => ({
                          ...prev,
                          [effectId]: checked
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </PortalModal>
          );
        })}
    </div>
  );
}

// Custom hook to force re-render
const useForceUpdate = () => {
  const [, setValue] = useState(0);
  return () => setValue(value => value + 1); 
};

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-50">
      <Card className="bg-red-800/80 text-white p-4 max-w-md">
      <h3 className="text-lg font-semibold">An Error Occurred</h3>
      <p className="text-sm">{message}</p>
      <Button onClick={() => window.location.reload()} variant="secondary" className="mt-4">
        Refresh Page
      </Button>
      </Card>
    </div>
  );
}

function MainContent({ children, onMouseEnter, onMouseLeave }: { children: React.ReactNode, onMouseEnter: () => void, onMouseLeave: () => void }) {
  return (
    <div 
      className="relative aspect-[9/16] max-w-sm mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-2xl" // removed border
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function Canvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
}

// Utility: getSliderMax for effect parameter sliders
function getSliderMax(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 5.0;
    case 'noiseIntensity': return 2.0;
    case 'glowIntensity': return 2.0;
    case 'strength': return 2.0;
    case 'radius': return 2.0;
    case 'threshold': return 1.0;
    case 'particleLifetime': return 10;
    case 'particleSize': return 50;
    case 'glowSoftness': return 5;
    default: return 1;
  }
}

// Utility: getSliderStep for effect parameter sliders
function getSliderStep(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 0.05;
    case 'noiseIntensity': return 0.1;
    case 'glowIntensity': return 0.1;
    case 'strength': return 0.1;
    case 'radius': return 0.05;
    case 'threshold': return 0.01;
    case 'glowSoftness': return 0.1;
    default: return 0.01;
  }
} 