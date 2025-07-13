'use client';

import React from 'react';
import type { AudioBinding, MIDIBinding } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { 
  calculateOpacity, 
  calculateScale, 
  calculateRotation, 
  calculatePosition 
} from '@/lib/video-composition/parameter-calculator';

interface ImageLayerProps {
  src: string;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
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
}

export const ImageLayer: React.FC<ImageLayerProps> = ({
  src,
  position,
  scale,
  rotation,
  opacity,
  audioBindings,
  midiBindings,
  zIndex,
  blendMode,
  startTime = 0,
  endTime,
  currentTime = 0,
  audioFeatures,
  midiData
}) => {
  // Check if this layer should be visible based on timeline
  const isVisible = !endTime || (currentTime >= startTime && currentTime <= endTime);
  
  // Real-time parameter calculation
  const currentOpacity = calculateOpacity(opacity, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentScale = calculateScale(scale, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentRotation = calculateRotation(rotation, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentPosition = calculatePosition(position, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className="image-layer absolute"
      style={{
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
        transform: `translate(-50%, -50%) scale(${currentScale.x}, ${currentScale.y}) rotate(${currentRotation}deg)`,
        opacity: currentOpacity,
        zIndex,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
        width: '200px', // Default size, can be made configurable
        height: '150px'
      }}
    >
      <img 
        src={src} 
        alt="Layer"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          borderRadius: '4px'
        }}
      />
    </div>
  );
}; 