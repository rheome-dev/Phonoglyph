'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';

// --- Meter Sub-Components ---

const VolumeMeter = ({ value }: { value: number }) => (
  <div className="w-full h-4 bg-gray-800 rounded-sm overflow-hidden border border-gray-700 relative">
    <div 
      className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-75 ease-out" 
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white mix-blend-difference">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  </div>
);

const PitchMeter = ({ value }: { value: number }) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = Math.floor(value * 12);
  const noteName = noteNames[noteIndex] || '...';

  return (
    <div className="w-full h-4 bg-gray-900 border border-gray-700 rounded-sm relative overflow-hidden flex items-center justify-center">
      {/* Background represents a mini-keyboard */}
      <div className="absolute inset-0 flex">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`flex-1 h-full ${[1,3,6,8,10].includes(i) ? 'bg-gray-700' : 'bg-gray-800'}`} />
        ))}
      </div>
      <div 
        className="absolute top-0 bottom-0 w-1 bg-blue-400 transition-all duration-100 ease-out" 
        style={{ left: `calc(${Math.max(0, Math.min(1, value)) * 100}% - 2px)` }} 
      />
      <span className="text-[10px] font-bold text-white mix-blend-difference z-10">{noteName}</span>
    </div>
  );
};

const ImpactMeter = ({ value }: { value: number }) => (
  <div className="w-full bg-gray-800 rounded-sm h-4 overflow-hidden border border-gray-700 relative">
    <div 
      className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-75 ease-out" 
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white mix-blend-difference">
        {value > 0.01 ? 'HIT' : '—'}
      </span>
    </div>
  </div>
);

// --- Main FeatureNode Component ---

const FeatureNode = ({ 
  feature, 
  currentTime, 
  cachedAnalysis,
  isPlaying 
}: { 
  feature: AudioFeature; 
  currentTime: number;
  cachedAnalysis: any[];
  isPlaying: boolean;
}) => {
  const [liveValue, setLiveValue] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    if (!isPlaying || !feature.stemType) {
      setLiveValue(0);
      setIsActive(false);
      return;
    }

    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis?.analysisData) {
      return;
    }

    const { analysisData } = analysis;
    const time = currentTime;
    let featureValue = 0;

    // Time-series features (like Volume/RMS)
    if (!feature.isEvent) {
      const times = analysisData.frameTimes;
      const values = analysisData.volume || analysisData.rms;
      if (times && values && Array.isArray(times) && Array.isArray(values)) {
        let lo = 0, hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >>> 1;
          if (times[mid] <= time) lo = mid; else hi = mid - 1;
        }
        featureValue = values[lo] ?? 0;
      }
    } 
    // Event-based features (Impact, Pitch)
    else {
      if (feature.id.includes('impact')) {
        const transientType = feature.id.split('-').pop(); // 'all', 'kick', 'snare', 'hat'
        const relevantTransients = analysisData.transients?.filter((t: any) => 
          transientType === 'all' || t.type === transientType
        );
        const transient = relevantTransients?.find((t: any) => Math.abs(t.time - time) < 0.05); // 50ms window
        featureValue = transient?.intensity ?? 0;
      } else if (feature.id.includes('pitch')) {
        // Chroma is a time-series array, find the closest frame
        const times = analysisData.frameTimes;
        const chromaValues = analysisData.chroma;
        if (times && chromaValues && Array.isArray(times) && Array.isArray(chromaValues)) {
          let lo = 0, hi = times.length - 1;
          while (lo < hi) {
            const mid = (lo + hi + 1) >>> 1;
            if (times[mid] <= time) lo = mid; else hi = mid - 1;
          }
          const chromaValue = chromaValues[lo] ?? 0;
          // Normalize pitch from 0-11 to 0-1 for the meter
          featureValue = chromaValue / 11;
        }
      }
    }
    
    // Normalize to 0-1 range
    const normalizedValue = Math.max(0, Math.min(1, featureValue));
    setLiveValue(normalizedValue);
    setIsActive(isPlaying && normalizedValue > 0.1);
  }, [feature, currentTime, cachedAnalysis, isPlaying]);

  const [{ isDragging }, dragRef] = useDrag({
    type: 'feature',
    item: { id: feature.id, name: feature.name, stemType: feature.stemType },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const drag = React.useCallback((node: HTMLDivElement | null) => {
    dragRef(node);
  }, [dragRef]);
  
  const renderMeter = () => {
    if (feature.name.includes('Impact')) return <ImpactMeter value={liveValue} />;
    if (feature.name === 'Pitch') return <PitchMeter value={liveValue} />;
    if (feature.name === 'Volume') return <VolumeMeter value={liveValue} />;
    // Fallback meter
    return <div className="w-full bg-gray-800 rounded-sm h-1 mb-1" />;
  };

  return (
    <div 
      ref={drag}
      className={`cursor-grab transition-all duration-200 ${isDragging ? 'opacity-40' : ''}`} 
      title={feature.description}
    >
      <div className={cn(
        "w-full px-2 py-1.5 text-xs font-medium border border-gray-700 bg-gray-900/50 rounded-md transition-all duration-200",
        "hover:bg-gray-800",
        isActive && "ring-1 ring-opacity-70",
        isActive && feature.category === 'rhythm' && "ring-red-400",
        isActive && feature.category === 'pitch' && "ring-blue-400", 
        isActive && feature.category === 'intensity' && "ring-yellow-400",
        isActive && feature.category === 'timbre' && "ring-purple-400"
      )}>
        <div className="flex items-center justify-between w-full mb-1.5">
          <span className="truncate font-medium text-gray-300">{feature.name}</span>
        </div>
        {renderMeter()}
      </div>
    </div>
  );
};

// --- Panel and Category Components ---

const categoryIcons: Record<string, React.ElementType> = {
  rhythm: Activity,
  pitch: Music,
  intensity: Zap,
  timbre: BarChart2,
};

const categoryDisplayNames: Record<string, string> = {
  rhythm: 'Rhythm & Impact',
  pitch: 'Pitch & Melody',
  intensity: 'Energy & Loudness',
  timbre: 'Texture & Character',
};

export function MappingSourcesPanel({ 
  activeTrackId, 
  className, 
  selectedStemType,
  currentTime = 0,
  cachedAnalysis = [],
  isPlaying = false
}: {
  activeTrackId?: string;
  className?: string;
  selectedStemType?: string;
  currentTime?: number;
  cachedAnalysis?: any[];
  isPlaying?: boolean;
}) {
  const features = useAudioFeatures(activeTrackId, selectedStemType, cachedAnalysis);
  
  const featuresByCategory = useMemo(() => {
    return features.reduce((acc, feature) => {
      (acc[feature.category] = acc[feature.category] || []).push(feature);
      return acc;
    }, {} as Record<string, AudioFeature[]>);
  }, [features]);

  if (!activeTrackId || !selectedStemType) {
    return (
      <div className={cn("bg-black border border-gray-800 rounded-lg", className)}>
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2"><Zap size={16}/> Audio Features</h3>
        </div>
        <div className="p-4 text-center text-xs text-gray-500">
          Select a track in the timeline to see its available modulation sources.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-black border border-gray-800 rounded-lg flex flex-col", className)}>
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2"><Zap size={16}/> {selectedStemType} Features</h3>
        <p className="text-xs text-gray-500 mt-1">Drag a feature onto an effect parameter to create a mapping.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(featuresByCategory).length > 0 ? (
          Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
            const Icon = categoryIcons[category];
            return (
              <div key={category} className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {Icon && <Icon size={14} />}
                  {categoryDisplayNames[category] || category}
                </h4>
                <div className="space-y-1.5">
                  {categoryFeatures.map((feature) => (
                    <FeatureNode
                      key={feature.id}
                      feature={feature}
                      currentTime={currentTime}
                      cachedAnalysis={cachedAnalysis}
                      isPlaying={isPlaying}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-gray-500 text-center py-4">
            No analysis data available for this stem yet. Press play to begin analysis.
          </div>
        )}
      </div>
    </div>
  );
}
