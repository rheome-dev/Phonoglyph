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
import { VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualEffect, AspectRatioConfig } from '@/types/visualizer';
import { PortalModal } from '@/components/ui/portal-modal';
import { EffectCarousel } from '@/components/ui/effect-carousel';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { getAspectRatioConfig, calculateCanvasSize } from '@/lib/visualizer/aspect-ratios';
import { BoundingBoxOverlay } from '@/components/ui/BoundingBoxOverlay';
import { Layer } from '@/types/video-composition';

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
  aspectRatio?: string; // Changed from 'mobile' | 'youtube' to string for modularity
  // Modal and mapping props
  openEffectModals: Record<string, boolean>;
  onCloseEffectModal: (effectId: string) => void;
  mappings: Record<string, string | null>;
  featureNames: Record<string, string>;
  onMapFeature: (parameterId: string, featureId: string) => void;
  onUnmapFeature: (parameterId: string) => void;
  activeSliderValues: Record<string, number>;
  setActiveSliderValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  visualizerRef?: React.RefObject<VisualizerManager> | ((instance: VisualizerManager | null) => void);
  layers: Layer[];
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
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
  aspectRatio = 'mobile',
  openEffectModals,
  onCloseEffectModal,
  mappings,
  featureNames,
  onMapFeature,
  onUnmapFeature,
  activeSliderValues,
  setActiveSliderValues,
  visualizerRef: externalVisualizerRef,
  layers,
  selectedLayerId,
  onLayerSelect
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVisualizerRef = useRef<VisualizerManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 711 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [boundingBoxes, setBoundingBoxes] = useState({
    metaballs: { x: 0, y: 0, width: 0, height: 0 },
    particles: { x: 0, y: 0, width: 0, height: 0 },
  });
  const [effects, setEffects] = useState<any[]>([]); // [{id, type, boundingBox, ...}]
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const metaballsEffectRef = useRef<MetaballsEffect | null>(null);
  const particleEffectRef = useRef<ParticleNetworkEffect | null>(null);
  
  // Get aspect ratio configuration
  const aspectRatioConfig = getAspectRatioConfig(aspectRatio);
  
  // Resize observer for container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Calculate canvas size when container size or aspect ratio changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newCanvasSize = calculateCanvasSize(
        containerSize.width,
        containerSize.height,
        aspectRatioConfig
      );
      setCanvasSize(newCanvasSize);
    }
  }, [containerSize, aspectRatioConfig]);
  
  // Update visualizer when canvas size changes
  useEffect(() => {
    if (internalVisualizerRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const visualizer = internalVisualizerRef.current;
      visualizer.handleViewportResize(canvasSize.width, canvasSize.height);
      debugLog.log('🎨 Canvas resized to:', canvasSize.width, 'x', canvasSize.height, 'aspect:', canvasSize.width / canvasSize.height);
    }
  }, [canvasSize]);

  // Initialize visualizer
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    try {
      debugLog.log('🎭 Initializing ThreeVisualizer with aspect ratio:', aspectRatio);
    
    const config: VisualizerConfig = {
      canvas: {
          width: canvasSize.width,
          height: canvasSize.height,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
        aspectRatio: aspectRatioConfig,
      performance: {
          targetFPS: 60,
          enableBloom: true,
          enableShadows: false
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

      internalVisualizerRef.current = new VisualizerManager(canvasRef.current, config);
      
      // Add default effects
      const metaballsEffect = new MetaballsEffect();
      const particleEffect = new ParticleNetworkEffect();
      metaballsEffectRef.current = metaballsEffect;
      particleEffectRef.current = particleEffect;
      
      internalVisualizerRef.current.addEffect(metaballsEffect);
      internalVisualizerRef.current.addEffect(particleEffect);
      
      // Enable selected effects
      Object.entries(selectedEffects).forEach(([effectId, enabled]) => {
        if (enabled) {
          internalVisualizerRef.current?.enableEffect(effectId);
        } else {
          internalVisualizerRef.current?.disableEffect(effectId);
        }
      });

      setIsInitialized(true);
      debugLog.log('✅ ThreeVisualizer initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      debugLog.error('❌ Failed to initialize ThreeVisualizer:', err);
    }
  }, [canvasSize, aspectRatioConfig]);

  // Update effect bounding boxes on change
  useEffect(() => {
    if (metaballsEffectRef.current) {
      metaballsEffectRef.current.setBoundingBox(boundingBoxes.metaballs);
    }
    if (particleEffectRef.current) {
      particleEffectRef.current.setBoundingBox(boundingBoxes.particles);
    }
  }, [boundingBoxes, canvasSize.width, canvasSize.height]);

  // Expose visualizer ref to parent
  useEffect(() => {
    if (externalVisualizerRef && internalVisualizerRef.current) {
      if (typeof externalVisualizerRef === 'function') {
        externalVisualizerRef(internalVisualizerRef.current);
      } else if (externalVisualizerRef && 'current' in externalVisualizerRef) {
        (externalVisualizerRef as any).current = internalVisualizerRef.current;
      }
    }
  }, [externalVisualizerRef, isInitialized]);

  // Handle play/pause
  useEffect(() => {
    if (!internalVisualizerRef.current) return;

    if (isPlaying) {
      internalVisualizerRef.current.play();
    } else {
      internalVisualizerRef.current.pause();
    }
  }, [isPlaying]);

  // Update MIDI data
  useEffect(() => {
    if (!internalVisualizerRef.current || !midiData) return;
    
         const liveMidiData: LiveMIDIData = {
       currentTime,
       activeNotes: midiData.tracks.flatMap(track => 
         track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).map(note => ({
           note: note.pitch,
           velocity: note.velocity,
           track: track.id,
           startTime: note.start
         }))
       ),
       tempo: 120, // Default tempo
       totalNotes: midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0),
       trackActivity: midiData.tracks.reduce((acc, track) => {
         acc[track.id] = track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).length > 0;
         return acc;
       }, {} as Record<string, boolean>)
     };
    
    internalVisualizerRef.current.updateMIDIData(liveMidiData);
  }, [midiData, currentTime]);

  // Update FPS
  useEffect(() => {
    if (!internalVisualizerRef.current || !onFpsUpdate) return;

    const interval = setInterval(() => {
      const fps = internalVisualizerRef.current?.getFPS() || 60;
      onFpsUpdate(fps);
    }, 1000);

    return () => clearInterval(interval);
  }, [onFpsUpdate]);

  // Set initial bounding boxes when canvas size changes
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      setBoundingBoxes(prev => ({
        metaballs: prev.metaballs.width === 0 ? {
          x: canvasSize.width * 0.2,
          y: canvasSize.height * 0.2,
          width: canvasSize.width * 0.6,
          height: canvasSize.height * 0.6,
        } : prev.metaballs,
        particles: prev.particles.width === 0 ? {
          x: canvasSize.width * 0.25,
          y: canvasSize.height * 0.25,
          width: canvasSize.width * 0.5,
          height: canvasSize.height * 0.5,
        } : prev.particles,
      }));
    }
  }, [canvasSize.width, canvasSize.height]);

  // Handle effect parameter changes
  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    if (!internalVisualizerRef.current) return;
    
    internalVisualizerRef.current.updateEffectParameter(effectId, paramName, value);
    
    // Update active slider values
      const paramKey = `${effectId}-${paramName}`;
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
  };

  // Handler to add an effect (stub, e.g., adds metaballs)
  // const handleAddEffect = (type: 'metaballs' | 'particles') => {
  //   const id = `${type}-${Date.now()}`;
  //   const box = {
  //     x: canvasSize.width * 0.2,
  //     y: canvasSize.height * 0.2,
  //     width: canvasSize.width * 0.6,
  //     height: canvasSize.height * 0.6,
  //   };
  //   setEffects(prev => [...prev, { id, type, boundingBox: box }]);
  //   setSelectedEffectId(id);
  //   // TODO: Actually instantiate and add the effect to the visualizer manager
  // };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (internalVisualizerRef.current) {
        internalVisualizerRef.current.dispose();
      }
    };
  }, []);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        className
      )}
      style={{
        minHeight: '200px',
        aspectRatio: `${aspectRatioConfig.width}/${aspectRatioConfig.height}`
      }}
    >
      {/* Canvas container with proper sizing */}
      <div 
        className="relative bg-stone-900 rounded-lg overflow-hidden shadow-lg"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            pointerEvents: 'none', // Allow overlays to receive events
            zIndex: 1
          }}
        />
        {/* Render bounding box overlays for each layer */}
        {layers.map(layer => (
          <BoundingBoxOverlay
            key={layer.id}
            x={layer.position.x}
            y={layer.position.y}
            width={layer.scale.x}
            height={layer.scale.y}
            selected={selectedLayerId === layer.id}
            parentWidth={canvasSize.width}
            parentHeight={canvasSize.height}
            onChange={box => {
              // You may want to call onLayerUpdate here
            }}
            onSelect={() => onLayerSelect?.(layer.id)}
          />
        ))}
        {/* Show prompt if no layers are present */}
        {layers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
            <span className="text-white/60 text-sm font-mono text-center select-none">
              Add an effect from the library
            </span>
          </div>
        )}
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