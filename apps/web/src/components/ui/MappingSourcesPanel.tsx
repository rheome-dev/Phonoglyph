'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { featureDecayTimesRef } from '@/hooks/use-audio-analysis';
import { useVisualizerStore } from '@/stores/visualizerStore';

// --- Meter Sub-Components ---

const VolumeMeter = ({ value }: { value: number }) => (
  <div className="w-full h-4 bg-neutral-800 rounded-sm overflow-hidden border border-neutral-600 relative">
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
  
  // Piano keyboard layout: naturals (C, D, E, F, G, A, B) and accidentals (C#, D#, F#, G#, A#)
  const isNatural = (index: number) => [0, 2, 4, 5, 7, 9, 11].includes(index); // C, D, E, F, G, A, B
  const isAccidental = (index: number) => [1, 3, 6, 8, 10].includes(index); // C#, D#, F#, G#, A#

  return (
    <div className="w-full h-4 bg-neutral-900 border border-neutral-600 rounded-sm relative overflow-hidden flex items-center justify-center">
      {/* Piano keyboard background */}
      <div className="absolute inset-0 flex">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "flex-1 h-full border-r border-neutral-700",
              isNatural(i) ? "bg-neutral-300" : "bg-neutral-600"
            )} 
          />
        ))}
      </div>
      {/* Active note indicator */}
      <div 
        className="absolute top-0 bottom-0 w-[8.33%] bg-blue-400/60 transition-all duration-100 ease-out border-l border-r border-blue-300" 
        style={{ left: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
      />
      <span className="text-[10px] font-bold text-white mix-blend-difference z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {noteName}
      </span>
    </div>
  );
};

const ImpactMeter = ({ value }: { value: number }) => (
  <div className="w-full bg-neutral-800 rounded-sm h-4 overflow-hidden border border-neutral-600 relative">
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

// Helper to filter transients by sensitivity (1 = keep all, 0 = keep only strongest)
function filterTransientsBySensitivity(
  transients: Array<{ time: number; intensity: number }>,
  sensitivity: number
): Array<{ time: number; intensity: number }> {
  if (!transients.length) return transients;
  const clamped = Math.max(0, Math.min(1, sensitivity));
  if (clamped >= 0.999) return transients;

  const intensities = transients
    .map(t => t.intensity)
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!intensities.length) return transients;

  const index = Math.floor((1 - clamped) * (intensities.length - 1));
  const threshold = intensities[index];

  return transients.filter(t => (Number.isFinite(t.intensity) ? t.intensity : 0) >= threshold);
}

// Time-aligned oscilloscope for spectral flux + transient markers
const PeaksOscilloscope = ({ 
  analysisData,
  currentTime,
  width = 200,
  height = 40,
  windowSec = 4.0,
}: { 
  analysisData: any | null;
  currentTime: number;
  width?: number;
  height?: number;
  windowSec?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameTimes = (analysisData.frameTimes as number[]) || [];
    const spectralFlux = (analysisData.spectralFlux as number[]) || [];
    const volume = (analysisData.volume as number[]) || [];
    // Use volume (RMS) for visual waveform when available, fall back to spectral flux
    const values =
      volume.length === frameTimes.length && volume.length > 0
        ? volume
        : spectralFlux;
    const transients = (analysisData.transients as Array<{ time: number; intensity: number }>) || [];

    if (!frameTimes.length || !values.length) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const duration = frameTimes[frameTimes.length - 1] ?? 0;
    const clampedCurrent = Math.max(0, Math.min(currentTime, duration));
    const halfWindow = windowSec;
    const tEnd = clampedCurrent;
    const tStart = Math.max(0, tEnd - halfWindow);
    const windowDuration = tEnd - tStart || 1e-3;

    const sampleAtTime = (t: number): number => {
      let lo = 0;
      let hi = frameTimes.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1;
        if (frameTimes[mid] <= t) lo = mid;
        else hi = mid - 1;
      }
      return values[lo] ?? 0;
    };

    // Use global max for stable height across time
    const globalMax = values.reduce((m: number, v: number) => {
      const av = Math.abs(v);
      if (!isFinite(av)) return m;
      return av > m ? av : m;
    }, 1e-6);

    const waveform: number[] = [];
    for (let x = 0; x < width; x++) {
      const t = tStart + (x / Math.max(1, width - 1)) * windowDuration;
      const v = sampleAtTime(t);
      waveform[x] = v;
    }

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw waveform (normalized volume / spectral flux)
    if (globalMax > 0) {
      // Unipolar envelope from near bottom to near top of scope
      const baselineY = height * 0.9; // 10% padding at bottom
      const scale = (height * 0.8) / globalMax; // leave ~10% headroom at top
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const v = Math.abs(waveform[x]) * scale;
        const y = baselineY - v;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw transient markers aligned in time
    ctx.strokeStyle = '#ff0';
    ctx.fillStyle = '#ff0';
    ctx.lineWidth = 1.5;
    const triangleSize = 6;

    transients.forEach(tr => {
      if (tr.time < tStart || tr.time > tEnd) return;
      const pos = (tr.time - tStart) / windowDuration;
      const x = Math.max(0, Math.min(width - 1, pos * width));

      // Full-height line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Downward-pointing triangle at top
      ctx.beginPath();
      ctx.moveTo(x - triangleSize / 2, 0);
      ctx.lineTo(x + triangleSize / 2, 0);
      ctx.lineTo(x, triangleSize);
      ctx.closePath();
      ctx.fill();
    });
  }, [analysisData, currentTime, width, height, windowSec]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

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
  const [liveValue, setLiveValue] = useState(0); // Decayed output value (for meter and oscilloscope waveform)
  const [isActive, setIsActive] = useState(false);
  const lastTransientRef = useRef<{ time: number; intensity: number } | null>(null);
  
  // Get sensitivity and decay from global store (persisted via auto-save)
  const { 
    featureSensitivities, 
    setFeatureSensitivity, 
    featureDecayTimes, 
    setFeatureDecayTime 
  } = useVisualizerStore();
  
  // Use store values with defaults
  const sensitivity = featureSensitivities[feature.id] ?? 0.5;
  const decayTime = featureDecayTimes[feature.id] ?? (featureDecayTimesRef.current[feature.id] ?? 0.5);
  
  const isTransientFeature = feature.isEvent && feature.id.includes('peaks');
  
  // Get transients for oscilloscope display
  const peaksAnalysisData = useMemo(() => {
    if (!isTransientFeature) return null;
    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis?.analysisData) return null;
    const data = analysis.analysisData;
    const allTransients = (data.transients as Array<{ time: number; intensity: number }> | undefined) || [];
    const filtered = filterTransientsBySensitivity(allTransients, sensitivity);
    return {
      ...data,
      transients: filtered,
    };
  }, [isTransientFeature, cachedAnalysis, feature.stemType, sensitivity]);
  
  // Initialize shared ref on mount and sync with store
  useEffect(() => {
    if (isTransientFeature) {
      // If store has a value, use it for the ref; otherwise initialize both
      const storeValue = featureDecayTimes[feature.id];
      if (storeValue !== undefined) {
        featureDecayTimesRef.current[feature.id] = storeValue;
      } else if (!featureDecayTimesRef.current[feature.id]) {
        featureDecayTimesRef.current[feature.id] = 0.5; // Default
        setFeatureDecayTime(feature.id, 0.5);
      }
    }
  }, [feature.id, isTransientFeature, featureDecayTimes, setFeatureDecayTime]);

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

        // Filter transients based on sensitivity for envelope generation
        const allTransients = (analysisData.transients as Array<{ time: number; intensity: number }> | undefined) || [];
        const relevantTransients = filterTransientsBySensitivity(allTransients, sensitivity);

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
            // Calculate decayed value for output signal (used for both meter and oscilloscope waveform)
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
  }, [feature, currentTime, cachedAnalysis, isPlaying, decayTime, sensitivity]); // decayTime and sensitivity from store

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
    if (isTransientFeature) {
      return (
        <div className="space-y-2">
          {/* Oscilloscope display (time-aligned spectral flux + transient markers) */}
          <div className="w-full h-10 bg-neutral-900 border border-neutral-600 rounded-sm overflow-hidden">
            <PeaksOscilloscope 
              analysisData={peaksAnalysisData}
              currentTime={currentTime}
              width={200}
              height={40}
            />
          </div>
          {/* Output signal meter (with decay applied) */}
          <ImpactMeter value={liveValue} />
        </div>
      );
    }
    if (feature.name === 'Pitch') return <PitchMeter value={liveValue} />;
    if (feature.name === 'Volume') return <VolumeMeter value={liveValue} />;
    return <div className="w-full bg-neutral-800 rounded-sm h-1 mb-1" />;
  };

  return (
    <div 
      className={cn(
        "w-full px-2 py-1.5 text-xs border border-neutral-600 bg-neutral-700 rounded-md transition-all duration-200",
        "hover:bg-neutral-600",
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
          <span className="truncate font-mono text-[10px] font-bold tracking-wide text-white uppercase">
            {feature.name}
          </span>
        </div>
        {renderMeter()}
      </div>
      {/* Controls outside the draggable handle */}
      {isTransientFeature && (
        <div className="mt-2 space-y-2">
          {/* Sensitivity slider (below HIT meter, above Decay) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-neutral-400 font-mono">Sensitivity</Label>
              <span className="text-[10px] text-neutral-300 font-mono">
                {(sensitivity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[sensitivity]}
              onValueChange={(value) => {
                const next = Math.max(0, Math.min(1, value[0] ?? 0));
                setFeatureSensitivity(feature.id, next);
              }}
              min={0}
              max={1}
              step={0.05}
              className="h-2"
            />
          </div>
          {/* Decay slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-neutral-400 font-mono">Decay</Label>
              <span className="text-[10px] text-neutral-300 font-mono">{decayTime.toFixed(2)}s</span>
            </div>
              <Slider
                value={[decayTime]}
                onValueChange={(value) => {
                  const newDecayTime = value[0];
                  setFeatureDecayTime(feature.id, newDecayTime);
                  // Update shared ref so getFeatureValue uses this decayTime for envelope generation
                  featureDecayTimesRef.current[feature.id] = newDecayTime;
                }}
                min={0.05}
                max={2.0}
                step={0.05}
                className="h-2"
              />
          </div>
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

  // Capitalize stem type
  const capitalizedStemType = selectedStemType 
    ? selectedStemType.charAt(0).toUpperCase() + selectedStemType.slice(1)
    : '';

  if (!activeTrackId || !selectedStemType) {
    return (
      <div className={cn("bg-black border-l border-neutral-800 flex flex-col", className)}>
        <div className="p-3 border-b border-neutral-800">
          <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider">
            Audio Features
          </h2>
        </div>
        <div className="p-4 text-center text-xs text-neutral-500">
          Select a track in the timeline to see its available modulation sources.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-black border-l border-neutral-800 flex flex-col", className)}>
      <div className="p-3 border-b border-neutral-800">
        <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider mb-2">
          {capitalizedStemType} Features
        </h2>
        <p className="text-xs text-neutral-500 font-mono">
          Drag a feature onto an effect parameter to create a mapping.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(featuresByCategory).length > 0 ? (
          Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
            const Icon = categoryIcons[category];
            return (
              <div key={category} className="space-y-1.5">
                {/* Category Header */}
                <div className="w-full flex items-center justify-between p-2 bg-neutral-900 border border-neutral-600">
                  <span className="font-mono text-xs font-semibold text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                    {Icon && <Icon size={12} />}
                    {categoryDisplayNames[category] || category}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    {categoryFeatures.length}
                  </span>
                </div>
                {/* Category Features */}
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
          <div className="text-xs text-neutral-500 text-center py-4 font-mono">
            No analysis data available for this stem yet. Press play to begin analysis.
          </div>
        )}
      </div>
    </div>
  );
}
