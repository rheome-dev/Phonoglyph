'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { AudioBinding, MIDIBinding } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { 
  calculateOpacity, 
  calculateScale, 
  calculateRotation, 
  calculatePosition 
} from '@/lib/video-composition/parameter-calculator';
import { debugLog } from '@/lib/utils';

interface VideoLayerProps {
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
  isPlaying?: boolean;
  audioFeatures?: AudioAnalysisData;
  midiData?: LiveMIDIData;
}

export const VideoLayer: React.FC<VideoLayerProps> = ({
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
  isPlaying = false,
  audioFeatures,
  midiData
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Check if this layer should be visible based on timeline
  const isVisible = !endTime || (currentTime >= startTime && currentTime <= endTime);
  
  // Real-time parameter calculation
  const currentOpacity = calculateOpacity(opacity, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentScale = calculateScale(scale, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentRotation = calculateRotation(rotation, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentPosition = calculatePosition(position, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => setVideoCurrentTime(video.currentTime);
    const handleLoadedData = () => setIsLoaded(true);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);
  
  // Sync video playback with timeline
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;
    
    if (isPlaying) {
      video.play().catch(debugLog.error);
    } else {
      video.pause();
    }
  }, [isPlaying, isLoaded]);
  
  // Sync video time with timeline
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;
    
    const targetTime = currentTime - startTime;
    if (Math.abs(video.currentTime - targetTime) > 0.1) {
      video.currentTime = Math.max(0, targetTime);
    }
  }, [currentTime, startTime, isLoaded]);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className="video-layer absolute"
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
      <video 
        ref={videoRef}
        src={src} 
        autoPlay={false}
        loop 
        muted 
        playsInline
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