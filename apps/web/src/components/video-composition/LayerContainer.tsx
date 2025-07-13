'use client';

import React from 'react';
import { VideoLayer } from './VideoLayer';
import { ImageLayer } from './ImageLayer';
import { EffectLayer } from './EffectLayer';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';

interface LayerContainerProps {
  layers: Layer[];
  width: number;
  height: number;
  currentTime: number;
  isPlaying: boolean;
  audioFeatures?: AudioAnalysisData;
  midiData?: LiveMIDIData;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
  onLayerDelete?: (layerId: string) => void;
}

export const LayerContainer: React.FC<LayerContainerProps> = ({
  layers,
  width,
  height,
  currentTime,
  isPlaying,
  audioFeatures,
  midiData,
  onLayerUpdate,
  onLayerDelete
}) => {
  // Sort layers by z-index for proper stacking
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  
  return (
    <div 
      className="layer-container relative overflow-hidden"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: 'transparent'
      }}
    >
      {sortedLayers.map((layer) => {
        const commonProps = {
          key: layer.id,
          startTime: layer.startTime,
          endTime: layer.endTime,
          currentTime,
          isPlaying,
          audioFeatures,
          midiData,
          position: layer.position,
          scale: layer.scale,
          rotation: layer.rotation,
          opacity: layer.opacity,
          audioBindings: layer.audioBindings,
          midiBindings: layer.midiBindings,
          zIndex: layer.zIndex,
          blendMode: layer.blendMode
        };
        
        switch (layer.type) {
          case 'video':
            return (
              <VideoLayer
                {...commonProps}
                src={layer.src!}
              />
            );
          case 'image':
            return (
              <ImageLayer
                {...commonProps}
                src={layer.src!}
              />
            );
          case 'effect':
            return (
              <EffectLayer
                {...commonProps}
                effectType={layer.effectType!}
                settings={layer.settings}
                onEffectUpdate={(effectId, settings) => {
                  onLayerUpdate?.(layer.id, { settings });
                }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}; 