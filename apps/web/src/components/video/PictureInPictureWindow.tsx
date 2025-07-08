import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Layer } from '@/lib/stores/layerStore';

interface PictureInPictureWindowProps {
  onClose: () => void;
  layers: Layer[];
  currentFrame: number;
  fps?: number;
  onLayerToggle?: (layerId: string) => void;
  onLayerOpacityChange?: (layerId: string, opacity: number) => void;
  onLayerSelect?: (layerId: string) => void;
  selectedLayerId?: string;
  className?: string;
}

interface LayerInspectorItemProps {
  layer: Layer;
  currentFrame: number;
  fps: number;
  isSelected: boolean;
  onToggleVisibility?: (layerId: string) => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  onSelect?: (layerId: string) => void;
}

const LayerInspectorItem: React.FC<LayerInspectorItemProps> = ({
  layer,
  currentFrame,
  fps,
  isSelected,
  onToggleVisibility,
  onOpacityChange,
  onSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localOpacity, setLocalOpacity] = useState(layer.opacity * 100);
  
  // Sync local opacity with layer opacity
  useEffect(() => {
    setLocalOpacity(layer.opacity * 100);
  }, [layer.opacity]);
  
  const currentTime = currentFrame / fps;
  const isActive = currentTime >= layer.startTime && currentTime <= layer.endTime;
  const progressInLayer = isActive 
    ? (currentTime - layer.startTime) / (layer.endTime - layer.startTime)
    : 0;
  
  const handleOpacityChange = useCallback((values: number[]) => {
    const newOpacity = values[0];
    setLocalOpacity(newOpacity);
    if (onOpacityChange) {
      onOpacityChange(layer.id, newOpacity / 100);
    }
  }, [layer.id, onOpacityChange]);
  
  const getLayerTypeIcon = (type: Layer['type']) => {
    switch (type) {
      case 'video': return '🎬';
      case 'image': return '🖼️';
      case 'effect': return '✨';
      case 'three': return '🎯';
      case 'midi-trigger': return '🎹';
      default: return '📄';
    }
  };
  
  const getActiveKeyframes = () => {
    if (!layer.keyframes) return [];
    return layer.keyframes.filter(kf => 
      Math.abs(kf.time - currentTime) < 0.1 // Within 100ms
    );
  };
  
  const activeKeyframes = getActiveKeyframes();
  
  return (
    <div className={`
      p-2 rounded border text-xs transition-all duration-200
      ${isActive 
        ? isSelected 
          ? 'bg-blue-100 border-blue-400 shadow-sm' 
          : 'bg-green-100 border-green-300' 
        : isSelected
          ? 'bg-stone-200 border-stone-400'
          : 'bg-stone-100 border-stone-300'
      }
      ${isSelected ? 'ring-2 ring-blue-300' : ''}
    `}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 flex items-center gap-1 hover:bg-transparent"
              onClick={() => onSelect?.(layer.id)}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span className="text-base">{getLayerTypeIcon(layer.type)}</span>
              <span className="font-mono text-stone-700 truncate max-w-24">
                {layer.name}
              </span>
            </Button>
          </CollapsibleTrigger>
          
          <div className="flex items-center gap-1">
            {/* Active indicator */}
            {isActive && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
            
            {/* Opacity display */}
            <span className="text-stone-500 min-w-8 text-right">
              {Math.round(layer.opacity * 100)}%
            </span>
            
            {/* Visibility toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => onToggleVisibility?.(layer.id)}
            >
              {layer.visible ? <Eye size={10} /> : <EyeOff size={10} />}
            </Button>
          </div>
        </div>
        
        {/* Progress bar for active layers */}
        {isActive && (
          <div className="mt-1">
            <div className="w-full bg-stone-300 h-1 rounded">
              <div 
                className="bg-green-500 h-1 rounded transition-all duration-100"
                style={{ width: `${progressInLayer * 100}%` }}
              />
            </div>
          </div>
        )}
        
        <CollapsibleContent className="mt-2 space-y-2">
          {/* Layer details */}
          <div className="text-stone-600 space-y-1">
            <div className="flex justify-between">
              <span>Type:</span>
              <Badge variant="outline" className="text-xs h-4">
                {layer.type}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span>Blend:</span>
              <span className="text-stone-500">{layer.blendMode}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="text-stone-500 font-mono">
                {layer.startTime.toFixed(1)}s - {layer.endTime.toFixed(1)}s
              </span>
            </div>
            
            {layer.type === 'effect' && layer.effectType && (
              <div className="flex justify-between">
                <span>Effect:</span>
                <span className="text-stone-500">{layer.effectType}</span>
              </div>
            )}
          </div>
          
          {/* Opacity Control */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-stone-600">Opacity</span>
              <span className="text-stone-500 font-mono text-xs">
                {Math.round(localOpacity)}%
              </span>
            </div>
            <Slider
              value={[localOpacity]}
              max={100}
              step={1}
              onValueChange={handleOpacityChange}
              className="w-full"
            />
          </div>
          
          {/* Active Keyframes */}
          {activeKeyframes.length > 0 && (
            <div className="space-y-1">
              <span className="text-stone-600">Active Keyframes:</span>
              <div className="space-y-1">
                {activeKeyframes.map((kf, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-stone-500">{kf.property}</span>
                    <span className="text-stone-600 font-mono">
                      {typeof kf.value === 'number' ? kf.value.toFixed(2) : String(kf.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Transformations */}
          {layer.transformations && (
            <div className="space-y-1">
              <span className="text-stone-600">Transform:</span>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex justify-between">
                  <span>X:</span>
                  <span className="font-mono">{layer.transformations.x.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Y:</span>
                  <span className="font-mono">{layer.transformations.y.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scale:</span>
                  <span className="font-mono">
                    {layer.transformations.scaleX.toFixed(2)}x{layer.transformations.scaleY.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rotate:</span>
                  <span className="font-mono">{layer.transformations.rotation.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const PictureInPictureWindow: React.FC<PictureInPictureWindowProps> = ({
  onClose,
  layers,
  currentFrame,
  fps = 30,
  onLayerToggle,
  onLayerOpacityChange,
  onLayerSelect,
  selectedLayerId,
  className
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  
  // Filter and sort layers
  const activeLayers = layers.filter(layer => {
    const currentTime = currentFrame / fps;
    return currentTime >= layer.startTime && currentTime <= layer.endTime;
  });
  
  const inactiveLayers = layers.filter(layer => {
    const currentTime = currentFrame / fps;
    return currentTime < layer.startTime || currentTime > layer.endTime;
  });
  
  const sortedLayers = [...activeLayers, ...inactiveLayers].sort((a, b) => b.zIndex - a.zIndex);
  
  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const windowStyle = isExpanded 
    ? { 
        position: 'fixed' as const, 
        top: '10%', 
        left: '10%', 
        width: '80%', 
        height: '80%',
        zIndex: 100 
      }
    : {
        position: 'fixed' as const,
        bottom: '20px',
        right: '20px',
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 50
      };
  
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 rounded-full bg-stone-600 hover:bg-stone-700 shadow-lg"
        >
          <Maximize2 size={20} />
        </Button>
      </div>
    );
  }
  
  return (
    <div 
      ref={windowRef}
      className={`${className}`}
      style={windowStyle}
    >
      <Card className="bg-stone-200/95 backdrop-blur-md border-stone-400 w-full h-full flex flex-col shadow-lg">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-2 border-b border-stone-300 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-stone-700 uppercase tracking-wide">
              Layer Inspector
            </span>
            <Badge variant="outline" className="text-xs">
              {activeLayers.length}/{layers.length} active
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              <Maximize2 size={12} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0"
            >
              <Minimize2 size={12} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X size={12} />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {sortedLayers.length > 0 ? (
                sortedLayers.map((layer) => (
                  <LayerInspectorItem
                    key={layer.id}
                    layer={layer}
                    currentFrame={currentFrame}
                    fps={fps}
                    isSelected={selectedLayerId === layer.id}
                    onToggleVisibility={onLayerToggle}
                    onOpacityChange={onLayerOpacityChange}
                    onSelect={onLayerSelect}
                  />
                ))
              ) : (
                <div className="text-center text-stone-500 py-8">
                  <span className="text-2xl">📝</span>
                  <p className="mt-2 text-sm">No layers in composition</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Footer */}
        <div className="border-t border-stone-300 p-2">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <div>
              Frame: <span className="font-mono">{currentFrame}</span>
            </div>
            <div>
              Time: <span className="font-mono">
                {(currentFrame / fps).toFixed(2)}s
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PictureInPictureWindow;