'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Video, Image, Zap } from 'lucide-react';
import type { Layer } from '@/types/video-composition';

interface TestVideoCompositionProps {
  onAddLayer: (layer: Layer) => void;
  className?: string;
}

export const TestVideoComposition: React.FC<TestVideoCompositionProps> = ({
  onAddLayer,
  className
}) => {
  const addSampleVideoLayer = () => {
    const layer: Layer = {
      id: `video-${Date.now()}`,
      name: 'Sample Video',
      type: 'video',
      src: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', // Sample video URL
      position: { x: 50, y: 50 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      opacity: 1,
      audioBindings: [
        {
          feature: 'volume',
          inputRange: [0, 1],
          outputRange: [0.5, 1],
          blendMode: 'multiply'
        }
      ],
      midiBindings: [
        {
          source: 'velocity',
          inputRange: [0, 127],
          outputRange: [0.8, 1.2],
          blendMode: 'multiply'
        }
      ],
      zIndex: 0,
      blendMode: 'normal',
      startTime: 0,
      endTime: 30,
      duration: 30
    };
    onAddLayer(layer);
  };

  const addSampleImageLayer = () => {
    const layer: Layer = {
      id: `image-${Date.now()}`,
      name: 'Sample Image',
      type: 'image',
      src: 'https://picsum.photos/400/300', // Random image
      position: { x: 25, y: 25 },
      scale: { x: 0.8, y: 0.8 },
      rotation: 15,
      opacity: 0.8,
      audioBindings: [
        {
          feature: 'bass',
          inputRange: [0, 1],
          outputRange: [0.5, 1.5],
          blendMode: 'multiply'
        }
      ],
      midiBindings: [],
      zIndex: 1,
      blendMode: 'multiply',
      startTime: 5,
      endTime: 25,
      duration: 20
    };
    onAddLayer(layer);
  };

  const addSampleEffectLayer = () => {
    const layer: Layer = {
      id: `effect-${Date.now()}`,
      name: 'Metaballs Effect',
      type: 'effect',
      effectType: 'metaballs',
      settings: {
        animationSpeed: 1.0,
        glowIntensity: 0.8
      },
      position: { x: 75, y: 75 },
      scale: { x: 1.2, y: 1.2 },
      rotation: 0,
      opacity: 0.9,
      audioBindings: [
        {
          feature: 'treble',
          inputRange: [0, 1],
          outputRange: [0.5, 2.0],
          blendMode: 'multiply'
        }
      ],
      midiBindings: [
        {
          source: 'velocity',
          inputRange: [0, 127],
          outputRange: [0.5, 1.5],
          blendMode: 'multiply'
        }
      ],
      zIndex: 2,
      blendMode: 'screen',
      startTime: 0,
      endTime: 30,
      duration: 30
    };
    onAddLayer(layer);
  };

  return (
    <div className={`flex items-center gap-2 p-2 bg-stone-800/50 rounded-lg border border-stone-600 ${className}`}>
      <span className="text-xs font-mono text-stone-400">TEST:</span>
      <Button
        size="sm"
        variant="outline"
        onClick={addSampleVideoLayer}
        className="h-6 px-2 text-xs bg-blue-900/20 border-blue-600 text-blue-300 hover:bg-blue-800/30"
      >
        <Video className="h-3 w-3 mr-1" />
        Video
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={addSampleImageLayer}
        className="h-6 px-2 text-xs bg-green-900/20 border-green-600 text-green-300 hover:bg-green-800/30"
      >
        <Image className="h-3 w-3 mr-1" />
        Image
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={addSampleEffectLayer}
        className="h-6 px-2 text-xs bg-purple-900/20 border-purple-600 text-purple-300 hover:bg-purple-800/30"
      >
        <Zap className="h-3 w-3 mr-1" />
        Effect
      </Button>
    </div>
  );
}; 