'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Video, Image, Zap, Trash2, Settings } from 'lucide-react';
import { useDrop } from 'react-dnd';
import type { Layer, LayerType } from '@/types/video-composition';

interface VideoCompositionTimelineProps {
  layers: Layer[];
  currentTime: number;
  duration: number;
  onLayerAdd: (layer: Layer) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerSelect: (layerId: string) => void;
  selectedLayerId?: string;
  className?: string;
}

export const VideoCompositionTimeline: React.FC<VideoCompositionTimelineProps> = ({
  layers,
  currentTime,
  duration,
  onLayerAdd,
  onLayerUpdate,
  onLayerDelete,
  onLayerSelect,
  selectedLayerId,
  className
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Drop zone for dragging assets from file browser
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['VIDEO_FILE', 'IMAGE_FILE', 'EFFECT_CARD'],
    drop: (item: any) => {
      handleAssetDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleAssetDrop = (item: any) => {
    let newLayer: Layer;
    
    switch (item.type) {
      case 'VIDEO_FILE':
        newLayer = createVideoLayer(item);
        break;
      case 'IMAGE_FILE':
        newLayer = createImageLayer(item);
        break;
      case 'EFFECT_CARD':
        newLayer = createEffectLayer(item);
        break;
      default:
        return;
    }
    
    onLayerAdd(newLayer);
  };

  const createVideoLayer = (item: any): Layer => ({
    id: `video-${Date.now()}`,
    name: item.name || item.id || 'Video Layer',
    type: 'video',
    src: item.src,
    position: { x: 50, y: 50 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
    audioBindings: [],
    midiBindings: [],
    zIndex: layers.length,
    blendMode: 'normal',
    startTime: 0,
    endTime: duration,
    duration: duration
  });

  const createImageLayer = (item: any): Layer => ({
    id: `image-${Date.now()}`,
    name: item.name || item.id || 'Image Layer',
    type: 'image',
    src: item.src,
    position: { x: 50, y: 50 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
    audioBindings: [],
    midiBindings: [],
    zIndex: layers.length,
    blendMode: 'normal',
    startTime: 0,
    endTime: duration,
    duration: duration
  });

  const createEffectLayer = (item: any): Layer => {
    const isOverlay = item.category === 'Overlays';
    const base: Layer = {
      id: `${isOverlay ? 'overlay' : 'effect'}-${Date.now()}`,
      name: item.name || item.effectId || (isOverlay ? 'Overlay Layer' : 'Effect Layer'),
      type: isOverlay ? 'overlay' : 'effect',
      effectType: item.effectId || item.id,
      settings: item.settings || {},
      position: { x: 10, y: 10 },
      scale: isOverlay ? { x: 25, y: 20 } : { x: 1, y: 1 },
      rotation: 0,
      opacity: 1,
      audioBindings: [],
      midiBindings: [],
      zIndex: layers.length,
      blendMode: 'normal',
      startTime: 0,
      endTime: duration,
      duration: duration
    };
    return base;
  };

  const timeToX = (time: number) => {
    return (time / duration) * 100;
  };

  const xToTime = (x: number) => {
    return (x / 100) * duration;
  };

  const getLayerIcon = (type: LayerType) => {
    switch (type) {
      case 'video':
        return <Video className="h-3 w-3" />;
      case 'image':
        return <Image className="h-3 w-3" />;
      case 'effect':
        return <Zap className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getLayerColor = (type: LayerType) => {
    switch (type) {
      case 'video':
        return 'bg-blue-500';
      case 'image':
        return 'bg-green-500';
      case 'effect':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className={`bg-stone-900/70 border border-stone-700 rounded-lg overflow-hidden backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video Composition Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-stone-400">
              {layers.length} layers
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 space-y-2">
        {/* Drop zone */}
        <div
          ref={drop as unknown as React.Ref<HTMLDivElement>}
          className={`relative h-16 border-2 border-dashed rounded-lg transition-all ${
            isOver && canDrop 
              ? "border-emerald-400 bg-emerald-900/20" 
              : "border-stone-600 hover:border-stone-500"
          }`}
        >
          {isOver && canDrop && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-emerald-400 text-sm font-medium">
                Drop asset here
              </div>
            </div>
          )}
          
          {layers.length === 0 && !isOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-stone-500">
                <Plus className="h-6 w-6 mx-auto mb-2" />
                <div className="text-xs">Drag video/image assets here</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Layer tracks */}
        {layers.map((layer) => {
          const startX = timeToX(layer.startTime);
          const width = timeToX(layer.endTime - layer.startTime);
          const isActive = currentTime >= layer.startTime && currentTime <= layer.endTime;
          const isSelected = selectedLayerId === layer.id;
          
          return (
            <div
              key={layer.id}
              className={`relative h-12 rounded border-2 cursor-pointer transition-all group ${
                isSelected 
                  ? "bg-emerald-500/80 border-emerald-400 shadow-emerald-400/50" 
                  : isActive
                  ? "bg-stone-700/80 border-stone-600"
                  : "bg-stone-800/80 border-stone-700 hover:border-stone-500"
              }`}
              style={{
                left: `${startX}%`,
                width: `${width}%`,
                minWidth: '60px'
              }}
              onClick={() => onLayerSelect(layer.id)}
            >
              <div className="flex items-center justify-between h-full px-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`p-1 rounded ${getLayerColor(layer.type)}`}>
                    {getLayerIcon(layer.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{layer.name}</div>
                    <div className="text-xs text-stone-400">
                      {layer.startTime.toFixed(1)}s - {layer.endTime.toFixed(1)}s
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-stone-400 hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Note: Layer settings functionality pending implementation
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-stone-400 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerDelete(layer.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Current time indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none z-10"
          style={{ left: `${timeToX(currentTime)}%` }}
        />
      </CardContent>
    </Card>
  );
}; 