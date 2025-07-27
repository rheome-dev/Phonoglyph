import React, { useEffect, useRef, useMemo } from 'react';
import { VisualizerManager } from '../visualizer/core/VisualizerManager';
import { VisualizerConfig } from '@/types/visualizer';
import { RemotionExportManager, FrameRenderData } from './RemotionExportManager';
import { Layer } from '@/types/video-composition';

// Conditional Remotion imports - only available when Remotion is installed
let useCurrentFrame: any, useVideoConfig: any, Img: any, Video: any, Audio: any;

try {
  const remotion = require('remotion');
  useCurrentFrame = remotion.useCurrentFrame;
  useVideoConfig = remotion.useVideoConfig;
  Img = remotion.Img;
  Video = remotion.Video;
  Audio = remotion.Audio;
} catch (error) {
  // Remotion not available - provide fallbacks
  console.warn('Remotion not available. Video export functionality will be limited.');
  useCurrentFrame = () => 0;
  useVideoConfig = () => ({ fps: 60, width: 1920, height: 1080 });
  Img = 'img';
  Video = 'video';
  Audio = 'audio';
}

/**
 * AudioReactiveComposition - Remotion component for high-quality video export
 * 
 * This component implements the modV analysis insight of having separate
 * preview and export pipelines. Unlike the real-time visualizer, this:
 * 
 * - Uses pre-computed frame data for perfect synchronization
 * - Renders at maximum quality without frame rate constraints
 * - Provides deterministic, reproducible output
 * - Integrates seamlessly with Remotion's video composition system
 */

export interface AudioReactiveCompositionProps {
  // Export manager with pre-computed data
  exportManager: RemotionExportManager;
  
  // Composition layers
  videoLayers: Layer[];
  imageLayers: Layer[];
  effectLayers: Layer[];
  
  // Audio source
  audioSrc: string;
  
  // Quality settings
  enableAntialiasing?: boolean;
  enableMotionBlur?: boolean;
  renderQuality?: 'draft' | 'medium' | 'high' | 'ultra';
}

export const AudioReactiveComposition: React.FC<AudioReactiveCompositionProps> = ({
  exportManager,
  videoLayers,
  imageLayers,
  effectLayers,
  audioSrc,
  enableAntialiasing = true,
  enableMotionBlur = false,
  renderQuality = 'high'
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Canvas ref for Three.js effects
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerManager | null>(null);
  
  // Get pre-computed frame data
  const frameData = useMemo(() => {
    return exportManager.getFrameData(frame);
  }, [exportManager, frame]);
  
  // Initialize Three.js visualizer for effects rendering
  useEffect(() => {
    if (!canvasRef.current || visualizerRef.current) return;
    
    const config: VisualizerConfig = {
      canvas: {
        width,
        height,
        pixelRatio: renderQuality === 'ultra' ? 2 : 1
      },
      aspectRatio: {
        id: 'remotion-export',
        name: 'Remotion Export',
        width,
        height
      },
      performance: {
        targetFPS: fps,
        enableBloom: true,
        enableShadows: renderQuality === 'ultra'
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };
    
    try {
      visualizerRef.current = new VisualizerManager(canvasRef.current, config);
      console.log('✅ Remotion VisualizerManager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Remotion VisualizerManager:', error);
    }
    
    return () => {
      if (visualizerRef.current) {
        visualizerRef.current.dispose();
        visualizerRef.current = null;
      }
    };
  }, [width, height, fps, renderQuality, enableAntialiasing]);
  
  // Update visualizer with pre-computed frame data
  useEffect(() => {
    if (!visualizerRef.current || !frameData) return;
    
    // Convert pre-computed data to the format expected by effects
    const audioData = {
      frequencies: new Array(256).fill(0.5), // Placeholder - could be enhanced
      timeData: new Array(256).fill(0.5),    // Placeholder - could be enhanced
      volume: frameData.audioFeatures['master-rms'] || 0.5,
      bass: frameData.audioFeatures['bass-rms'] || 0.5,
      mid: frameData.audioFeatures['vocals-rms'] || 0.5,
      treble: frameData.audioFeatures['melody-spectralCentroid'] || 0.5
    };
    
    // Update visualizer with frame-perfect data
    visualizerRef.current.updateAudioData(audioData);
    visualizerRef.current.updateMidiData(frameData.midiData);
    
    // Apply pre-computed visual parameters directly to effects
    const effects = visualizerRef.current.getAllEffects();
    effects.forEach(effect => {
      const effectParams = frameData.visualParameters[effect.id];
      if (effectParams) {
        Object.entries(effectParams).forEach(([paramName, value]) => {
          if (typeof effect.updateParameter === 'function') {
            effect.updateParameter(paramName, value);
          }
        });
      }
    });
    
  }, [frameData]);
  
  // Render single frame (no animation loop needed - Remotion handles frame progression)
  useEffect(() => {
    if (!visualizerRef.current) return;
    
    // Force a single render for this frame
    // Unlike real-time rendering, we don't need requestAnimationFrame
    const deltaTime = 1 / fps; // Fixed delta time for consistent results
    
    // Manually trigger the render loop once
    if (typeof (visualizerRef.current as any).renderSingleFrame === 'function') {
      (visualizerRef.current as any).renderSingleFrame(deltaTime);
    }
  }, [frame, fps, frameData]);
  
  // Calculate layer visibility and transformations based on timeline
  const getLayerStyle = (layer: Layer, currentTime: number) => {
    const isVisible = currentTime >= layer.startTime && 
                     (!layer.endTime || currentTime <= layer.endTime);
    
    if (!isVisible) return { display: 'none' };
    
    // Apply audio and MIDI reactive transformations
    let { position, scale, rotation, opacity } = layer;
    
    if (frameData && layer.audioBindings) {
      layer.audioBindings.forEach(binding => {
        const featureValue = frameData.audioFeatures[binding.feature];
        if (featureValue !== undefined) {
          const mappedValue = mapRange(
            featureValue,
            binding.inputRange[0],
            binding.inputRange[1],
            binding.outputRange[0],
            binding.outputRange[1]
          );
          
          // Apply binding based on blend mode
          switch (binding.blendMode) {
            case 'multiply':
              if (binding.feature.includes('scale')) {
                scale = { x: scale.x * mappedValue, y: scale.y * mappedValue };
              } else if (binding.feature.includes('opacity')) {
                opacity *= mappedValue;
              }
              break;
            case 'add':
              if (binding.feature.includes('position')) {
                position = { x: position.x + mappedValue, y: position.y + mappedValue };
              }
              break;
          }
        }
      });
    }
    
    if (frameData && layer.midiBindings) {
      layer.midiBindings.forEach(binding => {
        const midiValue = getMidiValue(frameData.midiData, binding.source);
        if (midiValue !== undefined) {
          const mappedValue = mapRange(
            midiValue,
            binding.inputRange[0],
            binding.inputRange[1],
            binding.outputRange[0],
            binding.outputRange[1]
          );
          
          // Apply MIDI binding
          switch (binding.blendMode) {
            case 'multiply':
              scale = { x: scale.x * mappedValue, y: scale.y * mappedValue };
              break;
          }
        }
      });
    }
    
    return {
      position: 'absolute' as const,
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: `scale(${scale.x}, ${scale.y}) rotate(${rotation}deg)`,
      opacity,
      zIndex: layer.zIndex,
      mixBlendMode: layer.blendMode as any
    };
  };
  
  const currentTime = frame / fps;
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
      {/* Audio track */}
      <Audio src={audioSrc} />
      
      {/* Video layers */}
      {videoLayers.map(layer => (
        <Video
          key={layer.id}
          src={layer.src!}
          style={getLayerStyle(layer, currentTime)}
          startFrom={Math.max(0, (currentTime - layer.startTime) * fps)}
        />
      ))}
      
      {/* Image layers */}
      {imageLayers.map(layer => (
        <Img
          key={layer.id}
          src={layer.src!}
          style={getLayerStyle(layer, currentTime)}
        />
      ))}
      
      {/* Three.js effects canvas */}
      {effectLayers.length > 0 && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1000, // Render on top
            mixBlendMode: 'screen' // Blend with underlying layers
          }}
        />
      )}
      
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && frameData && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: 'white',
          fontSize: 12,
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: 8,
          borderRadius: 4,
          zIndex: 9999
        }}>
          Frame: {frame}<br/>
          Time: {currentTime.toFixed(2)}s<br/>
          Active Notes: {frameData.midiData.activeNotes.length}<br/>
          Audio Features: {Object.keys(frameData.audioFeatures).length}
        </div>
      )}
    </div>
  );
};

// Helper functions
function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function getMidiValue(midiData: any, source: string): number | undefined {
  switch (source) {
    case 'velocity':
      return midiData.activeNotes.length > 0 
        ? midiData.activeNotes.reduce((sum: number, note: any) => sum + note.velocity, 0) / midiData.activeNotes.length
        : 0;
    case 'noteCount':
      return midiData.activeNotes.length;
    case 'tempo':
      return midiData.tempo;
    default:
      return undefined;
  }
}

// Export configuration for Remotion
export const remotionConfig = {
  id: 'AudioReactiveComposition',
  component: AudioReactiveComposition,
  durationInFrames: 1800, // 30 seconds at 60fps - will be set dynamically
  fps: 60,
  width: 1920,
  height: 1080,
};
