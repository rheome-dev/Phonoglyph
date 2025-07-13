'use client';

import React from 'react';
import type { AudioBinding, MIDIBinding, EffectType } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { 
  calculateOpacity, 
  calculateScale, 
  calculatePosition 
} from '@/lib/video-composition/parameter-calculator';

interface EffectLayerProps {
  effectType: EffectType;
  settings: any; // Effect-specific settings
  position: { x: number; y: number };
  scale: { x: number; y: number };
  opacity: number;
  audioBindings: AudioBinding[];
  midiBindings: MIDIBinding[];
  zIndex: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  startTime?: number;
  endTime?: number;
  currentTime?: number;
  audioFeatures?: AudioAnalysisData;
  midiData?: LiveMIDIData;
  onEffectUpdate?: (effectId: string, settings: any) => void;
}

export const EffectLayer: React.FC<EffectLayerProps> = ({
  effectType,
  settings,
  position,
  scale,
  opacity,
  audioBindings,
  midiBindings,
  zIndex,
  blendMode,
  startTime = 0,
  endTime,
  currentTime = 0,
  audioFeatures,
  midiData,
  onEffectUpdate
}) => {
  // Check if this layer should be visible based on timeline
  const isVisible = !endTime || (currentTime >= startTime && currentTime <= endTime);
  
  // Real-time parameter calculation
  const currentOpacity = calculateOpacity(opacity, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentScale = calculateScale(scale, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentPosition = calculatePosition(position, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  
  // Get the appropriate Three.js effect component
  const getEffectComponent = (type: EffectType) => {
    // This would integrate with the existing Three.js effects
    // For now, return a placeholder div
    return () => (
      <div className="effect-placeholder bg-gradient-to-r from-purple-500 to-pink-500 w-full h-full rounded-lg flex items-center justify-center">
        <span className="text-white text-xs font-mono">{type}</span>
      </div>
    );
  };
  
  const EffectComponent = getEffectComponent(effectType);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className="effect-layer absolute"
      style={{
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
        transform: `translate(-50%, -50%) scale(${currentScale.x}, ${currentScale.y})`,
        opacity: currentOpacity,
        zIndex,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
        width: '200px', // Default size, can be made configurable
        height: '150px'
      }}
    >
      <EffectComponent />
    </div>
  );
}; 