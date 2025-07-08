import React, { useRef, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from './ThreeCanvas';
import type { MIDIData, VisualizationSettings } from '../types';

interface ThreeJSLayerProps {
  midiData: MIDIData;
  settings?: VisualizationSettings;
  effectType: 'metaballs' | 'particles' | 'midihud' | 'bloom';
  opacity?: number;
}

export const ThreeJSLayer: React.FC<ThreeJSLayerProps> = ({
  midiData,
  settings,
  effectType,
  opacity = 1
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Convert frame to time for Three.js
  const currentTime = frame / fps;
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize Three.js scene with existing effect
    const threeCanvas = new ThreeCanvas(canvasRef.current, {
      midiData,
      settings: settings || {},
      effectType,
      currentTime,
      opacity
    });
    
    // Render current frame
    threeCanvas.render();
    
    return () => {
      threeCanvas.dispose();
    };
  }, [frame, midiData, settings, effectType, opacity]);
  
  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      style={{
        width: '100%',
        height: '100%',
        opacity
      }}
    />
  );
};