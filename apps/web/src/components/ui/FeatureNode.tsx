'use client';

import React from 'react';
import { useDrag, ConnectDragSource } from 'react-dnd';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { debugLog } from '@/lib/utils';

interface AudioFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
}

interface FeatureNodeProps {
  feature: AudioFeature;
  category: string;
}

const categoryColors = {
  rhythm: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
  pitch: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
  intensity: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30',
  timbre: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30',
};

export function FeatureNode({ feature, category }: FeatureNodeProps) {
  // Wrap useDrag in try-catch to handle context errors
  let dragState = { isDragging: false };
  let dragRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dragResult = useDrag({
      type: 'FEATURE_NODE',
      item: {
        id: feature.id,
        name: feature.name,
        description: feature.description,
        category: feature.category,
        stemType: feature.stemType,
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });
    
    dragState = dragResult[0];
    const drag = dragResult[1];
    
    dragRef = React.useCallback((node: HTMLDivElement | null) => {
      drag(node);
    }, [drag]);
  } catch (error) {
    // If drag context is not available, just use a no-op
    debugLog.warn('Drag context not available for FeatureNode:', error);
  }

  const colorClass = categoryColors[category as keyof typeof categoryColors];

  return (
    <div
      ref={dragRef}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200",
        dragState.isDragging && "opacity-50 scale-95"
      )}
      title={feature.description}
    >
      <Badge 
        variant="outline" 
        className={cn(
          "w-full text-left px-2 py-1 text-xs font-medium border rounded-md",
          colorClass,
          dragState.isDragging && "shadow-lg"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <span className="truncate">{feature.name}</span>
          {feature.stemType && (
            <span className="text-xs opacity-70 ml-1">
              {feature.stemType}
            </span>
          )}
        </div>
      </Badge>
    </div>
  );
} 