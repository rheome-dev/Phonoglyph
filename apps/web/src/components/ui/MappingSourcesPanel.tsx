'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';

// Enhanced FeatureNode with live meter
const FeatureNode = ({ 
  feature, 
  category, 
  currentTime, 
  cachedAnalysis,
  isPlaying 
}: { 
  feature: AudioFeature; 
  category: string;
  currentTime: number;
  cachedAnalysis: any[];
  isPlaying: boolean;
}) => {
  const [liveValue, setLiveValue] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  // Calculate live feature value from cached analysis
  useEffect(() => {
    if (!cachedAnalysis || cachedAnalysis.length === 0 || !feature.stemType) {
      setLiveValue(0);
      setIsActive(false);
      return;
    }

    // Find the analysis data for this feature's stem type
    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis || !analysis.analysisData) {
      setLiveValue(0);
      setIsActive(false);
      return;
    }

    // Map feature ID to analysis key
    const getAnalysisKey = (featureId: string): string => {
      const parts = featureId.split('-');
      if (parts.length >= 2) {
        const featureName = parts.slice(1).join('-');
        const featureMapping: Record<string, string> = {
          'impact': 'energy',
          'brightness': 'spectralCentroid',
          'harshness': 'spectralRolloff', // Using spectralRolloff as proxy for harshness
          'volume': 'rms', // Map volume to RMS for now
          'noisiness': 'zcr',
          'warmth': 'spectralCentroid', // Using spectralCentroid as proxy for warmth (lower = warmer)
          'pitch-height': 'spectralCentroid', // Using spectralCentroid as proxy for pitch height
          'harmonic-content': 'spectralFlatness', // Using spectralFlatness as proxy for harmonic content
          'loudness': 'loudness',
          'expression': 'rms', // Using RMS as proxy for expression
          'texture': 'zcr', // Using ZCR as proxy for texture
          'rms': 'rms', // Direct mapping for RMS
          'spectral-rolloff': 'spectralRolloff',
          'spectral-flatness': 'spectralFlatness',
          'spectral-spread': 'spectralSpread',
          'perceptual-spread': 'perceptualSpread',
          'perceptual-sharpness': 'perceptualSharpness',
        };
        return featureMapping[featureName] || featureName;
      }
      return featureId;
    };

    const analysisKey = getAnalysisKey(feature.id);
    const featureData = analysis.analysisData[analysisKey];
    

    
    if (!featureData || !Array.isArray(featureData) || featureData.length === 0) {
      setLiveValue(0);
      setIsActive(false);
      return;
    }

    // Calculate current value based on time
    const analysisDuration = analysis.metadata.duration;
    const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));
    
    // Convert time-based progress to frame-based index
    // Use consistent hop size and sample rate for accurate timing
    const hopSize = 512; // samples per frame
    const sampleRate = 44100; // Hz
    const frameTime = hopSize / sampleRate; // seconds per frame
    
    // Calculate frame index based on current time
    const frameIndex = Math.floor(currentTime / frameTime);
    const nextFrameIndex = Math.min(frameIndex + 1, featureData.length - 1);
    
    // Interpolate between frames for smooth values
    const frameProgress = (currentTime % frameTime) / frameTime;
    const currentValue = featureData[frameIndex] || 0;
    const nextValue = featureData[nextFrameIndex] || currentValue;
    
    const value = currentValue + (nextValue - currentValue) * frameProgress;
    
    // Values from audio analysis are already normalized between 0-1
    const normalizedValue = Math.max(0, Math.min(1, value));
    setLiveValue(normalizedValue);
    setIsActive(isPlaying && normalizedValue > 0.1); // Active if playing and has significant value
  }, [feature, currentTime, cachedAnalysis, isPlaying]);

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
      className={`cursor-grab transition-all duration-200 hover:bg-gray-800 ${dragState.isDragging ? 'opacity-50' : ''}`} 
      title={feature.description}
    >
      <div className={cn(
        "w-full px-2 py-1.5 text-xs font-medium border border-gray-700 transition-all duration-200",
        "bg-black hover:bg-gray-900",
        dragState.isDragging && "shadow-lg",
        isActive && "ring-1 ring-opacity-50",
        isActive && category === 'rhythm' && "ring-red-400",
        isActive && category === 'pitch' && "ring-blue-400", 
        isActive && category === 'intensity' && "ring-yellow-400",
        isActive && category === 'timbre' && "ring-purple-400"
      )}>
        <div className="flex items-center justify-between w-full mb-1">
          <span className="truncate font-medium text-gray-300">{feature.name}</span>
          {feature.stemType && (
            <span className="text-xs opacity-60 ml-1 text-gray-400">
              {getStemTypeDisplayName(feature.stemType)}
            </span>
          )}
        </div>
        
        {/* Live Meter */}
        <div className="w-full bg-gray-800 rounded-sm h-1 mb-1 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-sm transition-all duration-150 ease-out",
              category === 'rhythm' && "bg-red-500",
              category === 'pitch' && "bg-blue-500", 
              category === 'intensity' && "bg-yellow-500",
              category === 'timbre' && "bg-purple-500"
            )}
            style={{ 
              width: `${liveValue * 100}%`,
              transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)',
              transition: 'width 150ms ease-out, transform 150ms ease-out'
            }}
          />
        </div>
        
        {/* Value indicator */}
        <div className="flex items-center justify-between text-xs opacity-70 text-gray-400">
          <span>{(liveValue * 100).toFixed(0)}%</span>
          {isActive && (
            <span className={cn(
              "w-1 h-1 rounded-full animate-pulse",
              category === 'rhythm' && "bg-red-400",
              category === 'pitch' && "bg-blue-400",
              category === 'intensity' && "bg-yellow-400", 
              category === 'timbre' && "bg-purple-400"
            )} />
          )}
        </div>
      </div>
    </div>
  );
};

interface MappingSourcesPanelProps {
  activeTrackId?: string;
  className?: string;
  selectedStemType?: string;
  currentTime?: number;
  cachedAnalysis?: any[];
  isPlaying?: boolean;
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
  isPlaying = false
}: MappingSourcesPanelProps) {
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
          <span className="text-sm font-semibold text-gray-100">Audio Features</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Drag features to map to effect parameters
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
                {(categoryFeatures as AudioFeature[]).map((feature) => (
                  <FeatureNode
                    key={feature.id}
                    feature={feature}
                    category={feature.category}
                    currentTime={currentTime}
                    cachedAnalysis={cachedAnalysis}
                    isPlaying={isPlaying}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 