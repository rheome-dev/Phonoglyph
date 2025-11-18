'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { featureDecayTimesRef } from '@/hooks/use-audio-analysis';

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
  // Initialize decayTime from shared ref if available, otherwise default to 0.5s
  const [decayTime, setDecayTime] = useState(featureDecayTimesRef.current[feature.id] ?? 0.5);
  const lastTransientRef = useRef<{ time: number; intensity: number } | null>(null);
  
  const isTransientFeature = feature.isEvent && feature.id.includes('peaks');
  
  // Initialize shared ref on mount
  useEffect(() => {
    if (isTransientFeature && !featureDecayTimesRef.current[feature.id]) {
      featureDecayTimesRef.current[feature.id] = decayTime;
    }
  }, [feature.id, isTransientFeature, decayTime]);

  useEffect(() => {
    if (!isPlaying || !feature.stemType) {
      setLiveValue(0);
      setIsActive(false);
      lastTransientRef.current = null; // Reset on stop/pause
      return;
    }

    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis?.analysisData) {
      return;
    }

    const { analysisData } = analysis;
    const time = currentTime;
    let featureValue = 0;
    
    // --- ENVELOPE LOGIC FOR TRANSIENTS ---
    if (isTransientFeature) {
        // *** FIX B: LOOP DETECTION FOR THE UI COMPONENT ***
        let storedTransient = lastTransientRef.current;
        if (storedTransient && (time < storedTransient.time - 0.5)) {
            lastTransientRef.current = null;
            storedTransient = null;
        }

        // All transients are generic now, no filtering needed
        const relevantTransients = analysisData.transients || [];

        const latestTransient = relevantTransients.reduce((latest: any, t: any) => {
            if (t.time <= time && (!latest || t.time > latest.time)) {
                return t;
            }
            return latest;
        }, null);

        if (latestTransient) {
            if (!storedTransient || latestTransient.time > storedTransient.time) {
                lastTransientRef.current = { time: latestTransient.time, intensity: latestTransient.intensity };
            }
        }

        const activeTransient = lastTransientRef.current;
        if (activeTransient) {
            const elapsedTime = time - activeTransient.time;
            if (elapsedTime >= 0 && elapsedTime < decayTime) {
                featureValue = activeTransient.intensity * (1 - (elapsedTime / decayTime));
            } else {
                featureValue = 0;
            }
        } else {
            featureValue = 0;
        }
    }
    // --- EXISTING LOGIC FOR PITCH ---
    else if (feature.isEvent && feature.id.includes('pitch')) {
      const times = analysisData.frameTimes;
      const chromaValues = analysisData.chroma;
      if (times && chromaValues && Array.isArray(times) && Array.isArray(chromaValues)) {
        let lo = 0, hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >>> 1;
          if (times[mid] <= time) lo = mid; else hi = mid - 1;
        }
        const chromaValue = chromaValues[lo] ?? 0;
        featureValue = chromaValue / 11;
      }
    } 
    // --- EXISTING LOGIC FOR TIME-SERIES ---
    else {
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

    const normalizedValue = Math.max(0, Math.min(1, featureValue));
    setLiveValue(normalizedValue);
    setIsActive(isPlaying && normalizedValue > 0.05); // Lowered threshold for active state
  }, [feature, currentTime, cachedAnalysis, isPlaying, decayTime]); // Add decayTime to dependencies

  const [{ isDragging }, dragRef] = useDrag({
    type: 'feature',
    item: () => ({ 
      id: feature.id, 
      name: feature.name, 
      stemType: feature.stemType
    }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const drag = React.useCallback((node: HTMLDivElement | null) => {
    dragRef(node);
  }, [dragRef]);
  
  const renderMeter = () => {
    if (isTransientFeature) return <ImpactMeter value={liveValue} />;
    if (feature.name === 'Pitch') return <PitchMeter value={liveValue} />;
    if (feature.name === 'Volume') return <VolumeMeter value={liveValue} />;
    return <div className="w-full bg-gray-800 rounded-sm h-1 mb-1" />;
  };

  return (
    // Main container is no longer draggable
    <div 
      className={cn(
        "w-full px-2 py-1.5 text-xs font-medium border border-gray-700 bg-gray-900/50 rounded-md transition-all duration-200",
        "hover:bg-gray-800",
        isActive && "ring-1 ring-opacity-70",
        isActive && feature.category === 'rhythm' && "ring-red-400",
        isActive && feature.category === 'pitch' && "ring-blue-400", 
        isActive && feature.category === 'intensity' && "ring-yellow-400",
        isActive && feature.category === 'timbre' && "ring-purple-400",
        isDragging && "opacity-40"
      )}
      title={feature.description}
    >
      {/* This inner div is now the draggable handle */}
      <div ref={drag} className="cursor-grab">
        <div className="flex items-center justify-between w-full mb-1.5">
          <span className="truncate font-medium text-gray-300">{feature.name}</span>
        </div>
        {renderMeter()}
      </div>
      {/* Slider is now outside the draggable handle */}
      {isTransientFeature && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-gray-400">Decay</Label>
            <span className="text-[10px] text-gray-300">{decayTime.toFixed(2)}s</span>
          </div>
            <Slider
              value={[decayTime]}
              onValueChange={(value) => {
                const newDecayTime = value[0];
                setDecayTime(newDecayTime);
                // Update shared ref so getFeatureValue uses this decayTime for envelope generation
                featureDecayTimesRef.current[feature.id] = newDecayTime;
              }}
              min={0.05}
              max={2.0}
              step={0.05}
              className="h-2"
            />
        </div>
      )}
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
