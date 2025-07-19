'use client';

import React, { useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { cn } from '@/lib/utils';
import { EventBasedFeature, EventBasedFeatureValue } from '@/hooks/use-event-based-features';

interface EventBasedFeatureNodeProps {
  feature: EventBasedFeature;
  category: string;
  currentTime: number;
  featureValue: EventBasedFeatureValue;
  isPlaying: boolean;
}

// Map stem types to intuitive display names
const getStemTypeDisplayName = (stemType: string): string => {
  const displayNames: Record<string, string> = {
    'drums': '🥁 Drums',
    'bass': '🎸 Bass',
    'vocals': '🎤 Vocals',
    'melody': '🎹 Melody',
    'other': '🎼 Other',
    'master': '🎵 Master',
  };
  return displayNames[stemType] || stemType;
};

// Envelope phase colors
const envelopePhaseColors = {
  attack: 'bg-red-500',
  decay: 'bg-orange-500',
  sustain: 'bg-yellow-500',
  release: 'bg-green-500',
  off: 'bg-gray-500',
};

// Category colors
const categoryColors = {
  rhythm: 'bg-red-500',
  pitch: 'bg-blue-500',
  intensity: 'bg-yellow-500',
  timbre: 'bg-purple-500',
};

export function EventBasedFeatureNode({ 
  feature, 
  category, 
  currentTime, 
  featureValue,
  isPlaying 
}: EventBasedFeatureNodeProps) {
  
  // Wrap useDrag in try-catch to handle context errors
  let dragState = { isDragging: false };
  let dragRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dragResult = useDrag({
      type: 'feature',
      item: { 
        id: feature.id, 
        name: feature.name, 
        stemType: feature.stemType,
        isEventBased: true,
        eventType: feature.eventType,
        envelope: feature.envelope,
        sensitivity: feature.sensitivity
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
    console.warn('Drag context not available for EventBasedFeatureNode:', error);
  }

  // Calculate envelope visualization
  const envelopeVisualization = useMemo(() => {
    if (!feature.envelope || feature.eventType !== 'transient') {
      return null;
    }

    const { attack, decay, sustain, release } = feature.envelope;
    const totalDuration = attack + decay + release;
    
    // Create envelope curve points
    const points = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const time = (i / steps) * totalDuration;
      let value = 0;
      
      if (time < attack) {
        value = time / attack;
      } else if (time < attack + decay) {
        const decayProgress = (time - attack) / decay;
        value = 1 - decayProgress * (1 - sustain);
      } else if (time < attack + decay + release) {
        const releaseProgress = (time - attack - decay) / release;
        value = sustain * (1 - releaseProgress);
      } else {
        value = 0;
      }
      
      points.push({ x: (i / steps) * 100, y: value * 100 });
    }
    
    return points;
  }, [feature.envelope, feature.eventType]);

  // Get current envelope phase color
  const currentPhaseColor = featureValue.envelopePhase 
    ? envelopePhaseColors[featureValue.envelopePhase]
    : categoryColors[category as keyof typeof categoryColors];

  return (
    <div 
      ref={dragRef}
      className={`cursor-grab transition-all duration-200 hover:bg-gray-800 ${dragState.isDragging ? 'opacity-50' : ''}`} 
      title={feature.description}
    >
      <div className={cn(
        "w-full px-2 py-1.5 text-xs font-medium border border-gray-700 transition-all duration-200",
        "bg-black hover:bg-gray-900",
        dragState.isDragging && "shadow-lg",
        featureValue.isActive && "ring-1 ring-opacity-50",
        featureValue.isActive && category === 'rhythm' && "ring-red-400",
        featureValue.isActive && category === 'pitch' && "ring-blue-400", 
        featureValue.isActive && category === 'intensity' && "ring-yellow-400",
        featureValue.isActive && category === 'timbre' && "ring-purple-400"
      )}>
        {/* Header with name and stem type */}
        <div className="flex items-center justify-between w-full mb-1">
          <span className="truncate font-medium text-gray-300">{feature.name}</span>
          {feature.stemType && (
            <span className="text-xs opacity-60 ml-1 text-gray-400">
              {getStemTypeDisplayName(feature.stemType)}
            </span>
          )}
        </div>
        
        {/* Event Type Badge */}
        <div className="flex items-center gap-1 mb-1">
          <span className={cn(
            "text-xs px-1 py-0.5 rounded border",
            feature.eventType === 'transient' && "bg-red-900/30 border-red-700 text-red-300",
            feature.eventType === 'chroma' && "bg-blue-900/30 border-blue-700 text-blue-300",
            feature.eventType === 'volume' && "bg-yellow-900/30 border-yellow-700 text-yellow-300",
            feature.eventType === 'brightness' && "bg-purple-900/30 border-purple-700 text-purple-300"
          )}>
            {feature.eventType}
          </span>
          
          {/* Sensitivity indicator */}
          {feature.sensitivity && (
            <span className="text-xs text-gray-500">
              {feature.sensitivity}%
            </span>
          )}
        </div>
        
        {/* Live Meter with Envelope Visualization */}
        <div className="w-full bg-gray-800 rounded-sm h-2 mb-1 overflow-hidden relative">
          {/* Envelope curve background (for transient events) */}
          {envelopeVisualization && featureValue.isActive && (
            <svg 
              className="absolute inset-0 w-full h-full opacity-20"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d={`M ${envelopeVisualization.map(p => `${p.x},${100 - p.y}`).join(' L ')}`}
                stroke="white"
                strokeWidth="0.5"
                fill="none"
              />
            </svg>
          )}
          
          {/* Live value meter */}
          <div 
            className={cn(
              "h-full rounded-sm transition-all duration-150 ease-out",
              featureValue.envelopePhase && envelopePhaseColors[featureValue.envelopePhase],
              !featureValue.envelopePhase && categoryColors[category as keyof typeof categoryColors]
            )}
            style={{ 
              width: `${featureValue.value * 100}%`,
              transform: featureValue.isActive ? 'scaleY(1.1)' : 'scaleY(1)',
              transition: 'width 150ms ease-out, transform 150ms ease-out'
            }}
          />
          
          {/* Envelope phase indicator */}
          {featureValue.envelopePhase && featureValue.envelopePhase !== 'off' && (
            <div className="absolute top-0 right-0 w-1 h-full bg-white/30">
              <div 
                className={cn(
                  "w-full transition-all duration-100",
                  envelopePhaseColors[featureValue.envelopePhase]
                )}
                style={{ 
                  height: `${featureValue.value * 100}%`,
                  transition: 'height 100ms ease-out'
                }}
              />
            </div>
          )}
        </div>
        
        {/* Value and Status Indicators */}
        <div className="flex items-center justify-between text-xs opacity-70 text-gray-400">
          <span>{(featureValue.value * 100).toFixed(0)}%</span>
          
          <div className="flex items-center gap-1">
            {/* Active indicator */}
            {featureValue.isActive && (
              <span className={cn(
                "w-1 h-1 rounded-full animate-pulse",
                featureValue.envelopePhase && envelopePhaseColors[featureValue.envelopePhase],
                !featureValue.envelopePhase && categoryColors[category as keyof typeof categoryColors]
              )} />
            )}
            
            {/* Envelope phase label */}
            {featureValue.envelopePhase && featureValue.envelopePhase !== 'off' && (
              <span className="text-xs uppercase tracking-wider">
                {featureValue.envelopePhase}
              </span>
            )}
            
            {/* Confidence indicator for chroma events */}
            {featureValue.confidence && feature.eventType === 'chroma' && (
              <span className="text-xs">
                {(featureValue.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        
        {/* Envelope Controls Preview (for transient events) */}
        {feature.envelope && feature.eventType === 'transient' && (
          <div className="mt-1 pt-1 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>A: {(feature.envelope.attack * 1000).toFixed(0)}ms</span>
              <span>D: {(feature.envelope.decay * 1000).toFixed(0)}ms</span>
              <span>S: {(feature.envelope.sustain * 100).toFixed(0)}%</span>
              <span>R: {(feature.envelope.release * 1000).toFixed(0)}ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 