'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, debugLog } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
import '@/lib/visualizer/effects/EffectDefinitions';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { VisualizerConfig, LiveMIDIData, VisualEffect } from '@/types/visualizer';
import { getAspectRatioConfig, calculateCanvasSize } from '@/lib/visualizer/aspect-ratios';
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
  aspectRatio?: string;
  // Data synchronization props (kept for data flow)
  activeSliderValues: Record<string, Record<string, any>>;
  baseParameterValues?: Record<string, Record<string, any>>;
  setActiveSliderValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>>>>;
  setBaseParam?: (effectId: string, paramName: string, value: any) => void;
  visualizerRef?: React.RefObject<VisualizerManager> | ((instance: VisualizerManager | null) => void);
  layers: Layer[];
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
  // Legacy props kept for compatibility - UI rendering moved to EffectsLibrarySidebar
  openEffectModals?: Record<string, boolean>;
  onCloseEffectModal?: (effectId: string) => void;
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  featureNames?: Record<string, string>;
  onMapFeature?: (parameterId: string, featureId: string) => void;
  onUnmapFeature?: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
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
  activeSliderValues,
  baseParameterValues = {},
  setActiveSliderValues,
  setBaseParam,
  visualizerRef: externalVisualizerRef,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVisualizerRef = useRef<VisualizerManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 711 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const effectInstancesRef = useRef<{ [id: string]: VisualEffect }>({});

  // Helper: apply parameter values from store to effect instances
  const syncParametersToEffects = useCallback(() => {
    const manager = internalVisualizerRef.current;
    if (!manager) {
      console.log('[ThreeVisualizer] syncParameters: manager not ready');
      return;
    }

    const activeCount = Object.keys(activeSliderValues).length;
    const baseCount = Object.keys(baseParameterValues).length;
    console.log('[ThreeVisualizer] syncParameters start', {
      activeCount,
      baseCount,
      isInitialized,
      effectCount: Object.keys(effectInstancesRef.current).length,
    });

    Object.entries(effectInstancesRef.current).forEach(([layerId, effect]) => {
      // IMPORTANT: Only look at params stored by the specific layer ID
      // Do NOT fall back to effect type - that would cause parameter sharing between instances
      const activeParams = activeSliderValues[layerId] || {};
      const baseParams = baseParameterValues[layerId] || {};
      const paramNames = new Set([
        ...Object.keys(activeParams),
        ...Object.keys(baseParams),
      ]);

      paramNames.forEach((paramName) => {
        const value = activeParams[paramName] ?? baseParams[paramName];
        const currentVal = (effect.parameters as any)[paramName];
        if (value === undefined) return;
        if (currentVal != value) {
          manager.updateEffectParameter(layerId, paramName, value);
        }
      });
    });
  }, [activeSliderValues, baseParameterValues, isInitialized]);
  
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

  // Sync visualizer with timeline state (layers and currentTime)
  useEffect(() => {
    const vizManager = internalVisualizerRef.current;
    if (vizManager) {
      vizManager.updateTimelineState(layers, currentTime);
    }
  }, [layers, currentTime]);

  // Dynamic scene synchronization
  useEffect(() => {
    if (!internalVisualizerRef.current) return;
    const manager = internalVisualizerRef.current;
    debugLog.log('[ThreeVisualizer] layers prop:', layers, layers.map(l => l.type));
    const effectLayers = layers.filter(l => l.type === 'effect');
    debugLog.log('[ThreeVisualizer] effectLayers:', effectLayers);
    const currentIds = Object.keys(effectInstancesRef.current);
    const newIds = effectLayers.map(l => l.id);

    // Remove effects not in layers
    for (const id of currentIds) {
      if (!newIds.includes(id)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance: ${id}`);
      }
    }

    // Add new effects from layers using registry system
    for (const layer of effectLayers) {
      if (!effectInstancesRef.current[layer.id]) {
        debugLog.log('[ThreeVisualizer] Creating effect for layer:', layer);
        const effect = EffectRegistry.createEffect(layer.effectType || 'metaballs', layer.settings);
        if (effect) {
          effectInstancesRef.current[layer.id] = effect;
          manager.addEffect(layer.id, effect);
          debugLog.log(`[ThreeVisualizer] Added effect instance: ${layer.id} (${layer.effectType}) with effect ID: ${effect.id}`);
          
          // Apply any saved parameter values from the store to the newly created effect
          // IMPORTANT: Only look for values stored by this specific layer ID, NOT by effect type
          // This prevents new instances from inheriting parameters from previous instances of the same effect type
          const activeParams = activeSliderValues[layer.id] || {};
          const baseParams = baseParameterValues[layer.id] || {};
          const paramNames = new Set([
            ...Object.keys(activeParams),
            ...Object.keys(baseParams),
          ]);
          paramNames.forEach((paramName) => {
            const value = activeParams[paramName] ?? baseParams[paramName];
            if (value !== undefined) {
          manager.updateEffectParameter(layer.id, paramName, value);
              debugLog.log(`[ThreeVisualizer] Applied saved param: ${layer.id}.${paramName} = ${value}`);
            }
          });
        } else {
          debugLog.warn(`[ThreeVisualizer] Failed to create effect: ${layer.effectType} for layer: ${layer.id}`);
        }
      }
    }

    // If no effect layers, remove all effects
    if (effectLayers.length === 0) {
      for (const id of Object.keys(effectInstancesRef.current)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance (all cleared): ${id}`);
      }
    }
  }, [layers, internalVisualizerRef.current]);

  // Sync parameters when store values or initialization/layers change
  useEffect(() => {
    syncParametersToEffects();
  }, [syncParametersToEffects, layers, isInitialized]);

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
       tempo: 120,
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

  // Handle effect parameter changes (data sync logic)
  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    if (!internalVisualizerRef.current) return;
    
    internalVisualizerRef.current.updateEffectParameter(effectId, paramName, value);
    
    // Update active slider values (nested by effect instance id)
    setActiveSliderValues(prev => ({
      ...prev,
      [effectId]: {
        ...(prev[effectId] || {}),
        [paramName]: value
      }
    }));
    
    // Update base parameter store so hydration uses the latest values
    if (setBaseParam) {
      setBaseParam(effectId, paramName, value);
    }
    
    // Also update layer settings for persistence
    const layer = layers.find(l => l.id === effectId && l.type === 'effect');
    if (layer && onLayerUpdate) {
      onLayerUpdate(layer.id, {
        ...layer,
        settings: {
          ...layer.settings,
          [paramName]: value
        }
      });
    }
  };

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

  // Helper: is the project truly empty (all layers are empty image lanes)?
  const allLayersEmpty = layers.length === 0 || layers.every(l => l.type === 'image' && !l.src);

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
          maxHeight: '100%',
          pointerEvents: 'auto',
          zIndex: 10
        }}
        >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
        {/* Show prompt if all layers are empty */}
        {allLayersEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
            <span className="text-white/60 text-sm font-mono text-center select-none">
              Add your first layer
            </span>
          </div>
        )}
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
      className="relative aspect-[9/16] max-w-sm mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-2xl"
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
