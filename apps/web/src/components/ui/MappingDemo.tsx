'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Zap, Music, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';
import { useFeatureValue } from '@/hooks/use-feature-value';

interface MappingDemoProps {
  activeTrackId?: string;
  className?: string;
}

const categoryIcons = {
  rhythm: Activity,
  pitch: Music,
  intensity: Zap,
  timbre: Music,
};

const categoryColors = {
  rhythm: 'bg-red-500/20 text-red-300 border-red-500/30',
  pitch: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  intensity: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  timbre: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export function MappingDemo({ activeTrackId, className }: MappingDemoProps) {
  const features = useAudioFeatures(activeTrackId);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);

  const handleMapFeature = (parameterId: string, featureId: string) => {
    setMappings(prev => ({ ...prev, [parameterId]: featureId }));
    setSelectedParameter(null);
  };

  const handleUnmapFeature = (parameterId: string) => {
    setMappings(prev => ({ ...prev, [parameterId]: null }));
  };

  const getFeatureName = (featureId: string) => {
    return featureId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, AudioFeature[]>);

  // Demo parameters
  const demoParameters = [
    { id: 'metaballs-glow-intensity', label: 'Glow Intensity', value: 0.5 },
    { id: 'metaballs-scale', label: 'Scale', value: 0.3 },
    { id: 'particle-network-speed', label: 'Particle Speed', value: 0.7 },
    { id: 'midi-hud-opacity', label: 'HUD Opacity', value: 0.8 },
  ];

  return (
    <Card className={cn("bg-stone-800/50 border-stone-700", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-stone-300 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Feature Mapping Demo
        </CardTitle>
        <div className="text-xs text-stone-500">
          Click a parameter, then click a feature to map them
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parameters Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Effect Parameters
          </h4>
          {demoParameters.map((param) => {
            const mappedFeatureId = mappings[param.id];
            const mappedFeatureName = mappedFeatureId ? getFeatureName(mappedFeatureId) : null;
            const featureValue = useFeatureValue(mappedFeatureId);
            const isSelected = selectedParameter === param.id;
            const isMapped = !!mappedFeatureId;

            return (
              <div
                key={param.id}
                className={cn(
                  "space-y-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                  isMapped 
                    ? "bg-blue-500/10 border-blue-500/30" 
                    : "bg-stone-800/50 border-stone-700",
                  isSelected && "bg-blue-500/20 border-blue-500/50",
                  !isMapped && "hover:bg-stone-700/50"
                )}
                onClick={() => !isMapped && setSelectedParameter(param.id)}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-stone-300">
                    {param.label}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmapFeature(param.id);
                        }}
                        className="h-6 w-6 p-0 text-stone-400 hover:text-stone-200"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <Slider
                  value={[isMapped ? featureValue : param.value]}
                  onValueChange={([newValue]) => {
                    // In a real implementation, this would update the effect parameter
                    console.log(`Parameter ${param.id} value: ${newValue}`);
                  }}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={isMapped}
                  className={cn(
                    isMapped && "opacity-60"
                  )}
                />
                
                {isSelected && !isMapped && (
                  <div className="text-xs text-blue-300 text-center py-1">
                    Click a feature below to map
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        {selectedParameter && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              Available Features
            </h4>
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
                    {categoryFeatures.map((feature) => (
                      <div
                        key={feature.id}
                        onClick={() => handleMapFeature(selectedParameter, feature.id)}
                        className="cursor-pointer transition-all duration-200 hover:scale-105"
                        title={feature.description}
                      >
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "w-full text-left px-2 py-1 text-xs font-medium border rounded-md",
                            colorClass
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 