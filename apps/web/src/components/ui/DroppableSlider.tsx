'use client';

import React from 'react';
import { useDrop } from 'react-dnd';
import { Slider } from './slider';
import { Label } from './label';
import { Button } from './button';
import { X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { debugLog } from '@/lib/utils';

interface DroppableSliderProps {
  parameterId: string;
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  onMapFeature: (parameterId: string, featureId: string) => void;
  onUnmapFeature: (parameterId: string) => void;
  mappedFeatureName?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function DroppableSlider({
  parameterId,
  label,
  value,
  onValueChange,
  onMapFeature,
  onUnmapFeature,
  mappedFeatureName,
  className,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
}: DroppableSliderProps) {
  // Wrap useDrop in try-catch to handle context errors
  let dropState = { isOver: false, canDrop: false };
  let dropRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dropResult = useDrop({
      accept: 'FEATURE_NODE',
      drop: (item: { id: string; name: string }) => {
        onMapFeature(parameterId, item.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });
    
    dropState = dropResult[0];
    const drop = dropResult[1];
    
    const dropFunction = drop;
    dropRef = React.useCallback((node: HTMLDivElement | null) => {
      dropFunction(node);
    }, [dropFunction]);
  } catch (error) {
    // If drop context is not available, just use a no-op
    debugLog.warn('Drop context not available for DroppableSlider:', error);
  }

  const isMapped = !!mappedFeatureName;
  const isDragOver = dropState.isOver && dropState.canDrop;

  return (
    <div
      ref={dropRef}
      className={cn(
        "space-y-2 p-3 rounded-lg border transition-all duration-200",
        isMapped 
          ? "bg-blue-500/10 border-blue-500/30" 
          : "bg-stone-800/50 border-stone-700",
        isDragOver && "bg-blue-500/20 border-blue-500/50 scale-105",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-stone-300">
          {label}
        </Label>
        {isMapped && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300">
              <Zap className="h-3 w-3" />
              {mappedFeatureName}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnmapFeature(parameterId)}
              className="h-6 w-6 p-0 text-stone-400 hover:text-stone-200"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onValueChange(newValue)}
        min={min}
        max={max}
        step={step}
        disabled={disabled || isMapped}
        className={cn(
          isMapped && "opacity-60",
          isDragOver && "ring-2 ring-blue-500/50"
        )}
      />
      
      {isDragOver && !isMapped && (
        <div className="text-xs text-blue-300 text-center py-1">
          Drop to map feature
        </div>
      )}
    </div>
  );
} 