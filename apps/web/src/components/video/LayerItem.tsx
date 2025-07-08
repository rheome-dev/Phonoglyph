'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useLayerStore, Layer, EffectLayer } from '@/lib/stores/layerStore';
import { BlendModeSelector } from './BlendModeSelector';

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
}

export const LayerItem: React.FC<LayerItemProps> = ({ layer, isSelected }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });
  
  const {
    selectLayer,
    toggleLayerVisibility,
    toggleLayerMute,
    setLayerOpacity,
    setLayerBlendMode,
    draggedLayerId
  } = useLayerStore();
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case 'video': return '🎬';
      case 'image': return '🖼️';
      case 'effect': return '✨';
      case 'group': return '📁';
      default: return '📄';
    }
  };
  
  const getLayerTypeColor = (layer: Layer) => {
    switch (layer.type) {
      case 'video': return 'bg-blue-100 border-blue-300';
      case 'image': return 'bg-green-100 border-green-300';
      case 'effect': return 'bg-purple-100 border-purple-300';
      case 'group': return 'bg-yellow-100 border-yellow-300';
      default: return 'bg-stone-100 border-stone-300';
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || !(e.target as Element).closest('button, input')) {
      selectLayer(layer.id, e.metaKey || e.ctrlKey);
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative border rounded-lg p-2 transition-all cursor-pointer
        ${isSelected 
          ? 'ring-2 ring-stone-600 bg-stone-300' 
          : 'bg-stone-100 hover:bg-stone-150'
        }
        ${isDragging || draggedLayerId === layer.id ? 'opacity-50' : 'opacity-100'}
        ${getLayerTypeColor(layer)}
      `}
      onClick={handleClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={14} className="text-stone-500" />
      </div>
      
      {/* Layer Content */}
      <div className="ml-6 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm">{getLayerIcon(layer)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-stone-700 truncate">
              {layer.name}
            </p>
            <p className="text-xs text-stone-500 capitalize">
              {layer.type}
              {layer.type === 'effect' && ` (${(layer as EffectLayer).effectType})`}
            </p>
          </div>
        </div>
        
        {/* Layer Controls */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleLayerVisibility(layer.id);
            }}
          >
            {layer.visible ? (
              <Eye size={12} className="text-stone-600" />
            ) : (
              <EyeOff size={12} className="text-stone-400" />
            )}
          </Button>
          
          {(layer.type === 'video' || layer.type === 'effect') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerMute(layer.id);
              }}
            >
              {layer.muted ? (
                <VolumeX size={12} className="text-stone-400" />
              ) : (
                <Volume2 size={12} className="text-stone-600" />
              )}
            </Button>
          )}
          
          {layer.locked && (
            <Lock size={12} className="text-stone-400" />
          )}
        </div>
      </div>
      
      {/* Expanded Controls (when selected) */}
      {isSelected && (
        <div className="mt-2 space-y-2 border-t border-stone-300 pt-2">
          {/* Opacity Slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-600 w-12">Opacity</span>
            <Slider
              value={[layer.opacity * 100]}
              onValueChange={([value]) => setLayerOpacity(layer.id, value / 100)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-stone-600 w-8">
              {Math.round(layer.opacity * 100)}%
            </span>
          </div>
          
          {/* Blend Mode */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-600 w-12">Blend</span>
            <BlendModeSelector
              value={layer.blendMode}
              onChange={(blendMode) => setLayerBlendMode(layer.id, blendMode)}
            />
          </div>
          
          {/* Layer-specific controls */}
          {layer.type === 'effect' && (
            <div className="text-xs text-stone-600">
              <span>MIDI bindings: {(layer as EffectLayer).midiBindings?.length || 0}</span>
            </div>
          )}
          
          {layer.type === 'video' && (
            <div className="text-xs text-stone-600">
              <div>Asset: {(layer as any).assetId || 'None'}</div>
              <div>Playback: {((layer as any).playbackRate || 1) * 100}%</div>
            </div>
          )}
          
          {layer.type === 'image' && (
            <div className="text-xs text-stone-600">
              <div>Asset: {(layer as any).assetId || 'None'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};