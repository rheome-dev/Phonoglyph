'use client';

import React, { useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Music, Activity } from 'lucide-react';

// Draggable FeatureNode component
const FeatureNode = ({ feature, category }: { feature: AudioFeature; category: string }) => {
  const colorClass = categoryColors[category as keyof typeof categoryColors];
  
  // Wrap useDrag in try-catch to handle context errors
  let dragState = { isDragging: false };
  let dragRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dragResult = useDrag({
      type: 'feature',
      item: { 
        id: feature.id, 
        name: feature.name, 
        stemType: feature.stemType 
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
    console.warn('Drag context not available for FeatureNode:', error);
  }
  
  return (
    <div 
      ref={dragRef}
      className={`cursor-grab transition-all duration-200 hover:scale-105 ${dragState.isDragging ? 'opacity-50 scale-95' : ''}`} 
      title={feature.description}
    >
      <Badge 
        variant="outline" 
        className={cn(
          "w-full text-left px-2 py-1 text-xs font-medium border rounded-md",
          colorClass,
          dragState.isDragging && "shadow-lg"
        )}
        style={{
          boxShadow: dragState.isDragging 
            ? '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 8px rgba(59, 130, 246, 0.3)' 
            : undefined
        }}
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
};
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';

interface MappingSourcesPanelProps {
  activeTrackId?: string;
  className?: string;
  selectedStemType?: string;
}

const categoryIcons = {
  rhythm: Activity,
  pitch: Music,
  intensity: Zap,
  timbre: Music, // Using Music as fallback for timbre
};

const categoryColors = {
  rhythm: 'bg-red-500/20 text-red-300 border-red-500/30',
  pitch: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  intensity: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  timbre: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export function MappingSourcesPanel({ activeTrackId, className, selectedStemType }: MappingSourcesPanelProps) {
  const features = useAudioFeatures(activeTrackId, selectedStemType);
  
  const featuresByCategory = useMemo(() => {
    return features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, AudioFeature[]>);
  }, [features]);

  if (!activeTrackId) {
    return (
      <Card className={cn("bg-stone-800/50 border-stone-700", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-300 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Audio Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-stone-500 text-center py-4">
            Select a track to see available features
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-stone-800/50 border-stone-700", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-300 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Audio Features
        </CardTitle>
        <div className="text-xs text-stone-500">
          Drag features to map to effect parameters
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const colorClass = categoryColors[category as keyof typeof categoryColors];
          
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-3 w-3 text-stone-400" />
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                  {category}
                </span>
                <Badge variant="outline" className={cn("text-xs", colorClass)}>
                  {categoryFeatures.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {(categoryFeatures as AudioFeature[]).map((feature) => (
                  <FeatureNode
                    key={feature.id}
                    feature={feature}
                    category={feature.category}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
} 