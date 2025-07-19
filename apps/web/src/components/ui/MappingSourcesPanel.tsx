'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventBasedFeatures, EventBasedFeature } from '@/hooks/use-event-based-features';
import { EventBasedFeatureNode } from './EventBasedFeatureNode';

// Legacy FeatureNode for backward compatibility (will be removed)
const FeatureNode = ({ 
  feature, 
  category, 
  currentTime, 
  cachedAnalysis,
  isPlaying 
}: { 
  feature: any; 
  category: string;
  currentTime: number;
  cachedAnalysis: any[];
  isPlaying: boolean;
}) => {
  // This is kept for backward compatibility but will be replaced by EventBasedFeatureNode
  return null;
};

interface MappingSourcesPanelProps {
  activeTrackId?: string;
  className?: string;
  selectedStemType?: string;
  currentTime?: number;
  cachedAnalysis?: any[];
  isPlaying?: boolean;
  projectId?: string; // Added for event-based mapping
}

const categoryIcons = {
  rhythm: Activity,
  pitch: Music,
  intensity: Zap,
  timbre: Music, // Using Music as fallback for timbre
};



// Map technical category names to intuitive display names
const categoryDisplayNames = {
  rhythm: 'Rhythm & Groove',
  pitch: 'Pitch & Tone',
  intensity: 'Energy & Impact',
  timbre: 'Texture & Character',
};

// Map stem types to intuitive display names
const getStemTypeDisplayName = (stemType: string): string => {
  const displayNames: Record<string, string> = {
    'drums': '🥁 Drums',
    'bass': '🎸 Bass',
    'vocals': '🎤 Vocals',
    'melody': '🎹 Melody',
    'other': '🎼 Other',
  };
  return displayNames[stemType] || stemType;
};

export function MappingSourcesPanel({ 
  activeTrackId, 
  className, 
  selectedStemType,
  currentTime = 0,
  cachedAnalysis = [],
  isPlaying = false,
  projectId
}: MappingSourcesPanelProps) {
  const { features, getFeatureValue } = useEventBasedFeatures(
    activeTrackId, 
    selectedStemType, 
    currentTime, 
    projectId
  );
  
  const featuresByCategory = useMemo(() => {
    return features.reduce((acc: Record<string, EventBasedFeature[]>, feature: EventBasedFeature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, EventBasedFeature[]>);
  }, [features]);

  if (!activeTrackId) {
    return (
      <div className={cn("bg-black border border-gray-800", className)}>
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-100">Audio Features</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-gray-500 text-center py-2">
            Select a track to see available features
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-black border border-gray-800 flex flex-col", className)}>
              <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-100">Event-Based Features</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Drag MIDI-like events to map to effect parameters
          </div>
        </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          
          return (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="h-3 w-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {categoryDisplayNames[category as keyof typeof categoryDisplayNames] || category}
                </span>
                <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                  {categoryFeatures.length}
                </span>
              </div>
              <div className="space-y-1">
                {(categoryFeatures as EventBasedFeature[]).map((feature) => {
                  const featureValue = getFeatureValue(feature.id);
                  return (
                    <EventBasedFeatureNode
                      key={feature.id}
                      feature={feature}
                      category={feature.category}
                      currentTime={currentTime}
                      featureValue={featureValue}
                      isPlaying={isPlaying}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 