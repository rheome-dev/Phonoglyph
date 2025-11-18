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

// Oscilloscope-style peaks display with left-scrolling waveform
const PeaksOscilloscope = ({ 
  envelopeValue, // Decayed envelope value for waveform
  transients, 
  currentTime,
  width = 200,
  height = 40
}: { 
  envelopeValue: number; // Decayed envelope value (for waveform display)
  transients: Array<{ time: number; intensity: number }>;
  currentTime: number;
  width?: number;
  height?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformBufferRef = useRef<number[]>([]);
  const transientBufferRef = useRef<Array<{ 
    bufferIndex: number; 
    intensity: number; 
    peakBufferIndex: number;
    framesUntilVisible?: number;
  }>>([]);
  const processedTransientTimesRef = useRef<Set<number>>(new Set());
  const lastUpdateTimeRef = useRef<number>(0);
  const lastCurrentTimeRef = useRef<number>(0);
  const maxBufferSize = width;
  const updateInterval = 16; // ~60fps

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Detect loop - if currentTime jumps backwards significantly, reset
    if (currentTime < lastCurrentTimeRef.current - 0.5) {
      processedTransientTimesRef.current.clear();
      transientBufferRef.current = [];
    }
    lastCurrentTimeRef.current = currentTime;

    const now = performance.now();
    // Update buffer at ~60fps
    if (now - lastUpdateTimeRef.current > updateInterval) {
      // Add new envelope value to buffer (left side) - this is the decayed signal
      waveformBufferRef.current.unshift(envelopeValue);
      // Keep buffer size limited
      if (waveformBufferRef.current.length > maxBufferSize) {
        waveformBufferRef.current = waveformBufferRef.current.slice(0, maxBufferSize);
      }
      
      // Check for new transients
      if (transients && transients.length > 0) {
        transients.forEach((transient) => {
          // Round time to nearest 0.01s for comparison (avoid floating point issues)
          const roundedTime = Math.round(transient.time * 100) / 100;
          
          // Only add if this transient hasn't been processed yet and is close to current time
          if (!processedTransientTimesRef.current.has(roundedTime) && 
              Math.abs(transient.time - currentTime) < 0.1) { // Within 100ms of current time
            // Wait a few frames to let the peak appear in the buffer before placing marker
            // The envelope peaks immediately, but we want to find the actual peak position
            // Delay by 2-3 frames to ensure peak is visible
            transientBufferRef.current.push({
              bufferIndex: -2, // Start 2 frames in the future (will be 0 after 2 updates)
              peakBufferIndex: -2,
              intensity: transient.intensity,
              framesUntilVisible: 2 // Wait 2 frames before making visible
            });
            processedTransientTimesRef.current.add(roundedTime);
            
            // Clean up old processed times (keep only recent ones)
            if (processedTransientTimesRef.current.size > 100) {
              const timesArray = Array.from(processedTransientTimesRef.current);
              processedTransientTimesRef.current = new Set(timesArray.slice(-50));
            }
          }
        });
      }
      
      // Update transient buffer positions and find peaks
      transientBufferRef.current = transientBufferRef.current
        .map(transient => {
          // Decrement framesUntilVisible if present
          const framesUntilVisible = transient.framesUntilVisible || 0;
          if (framesUntilVisible > 0) {
            return {
              ...transient,
              framesUntilVisible: framesUntilVisible - 1,
              bufferIndex: transient.bufferIndex + 1,
              peakBufferIndex: transient.peakBufferIndex + 1
            };
          }
          
          // Update buffer positions (increment indices as buffer scrolls)
          const newBufferIndex = transient.bufferIndex + 1;
          
          // Find the actual peak in the buffer - look back to find where peak occurred
          // Search from current position backwards to find the maximum
          const searchBack = 8; // Look back up to 8 samples
          const startIdx = Math.max(0, newBufferIndex - searchBack);
          const endIdx = Math.min(waveformBufferRef.current.length, newBufferIndex + 1);
          
          let peakIndex = newBufferIndex;
          let peakValue = waveformBufferRef.current[newBufferIndex] || 0;
          
          // Look backwards to find the peak (envelope decays after peak)
          for (let i = endIdx - 1; i >= startIdx; i--) {
            if (waveformBufferRef.current[i] > peakValue) {
              peakValue = waveformBufferRef.current[i];
              peakIndex = i;
            }
          }
          
          return {
            ...transient,
            bufferIndex: newBufferIndex,
            peakBufferIndex: peakIndex
          };
        })
        .filter(t => {
          // Only show if visible and within bounds
          const framesUntilVisible = t.framesUntilVisible || 0;
          return framesUntilVisible === 0 && t.bufferIndex < maxBufferSize;
        });
      
      lastUpdateTimeRef.current = now;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw waveform (left-scrolling, unipolar - shows envelope intensity from 0)
    if (waveformBufferRef.current.length > 1) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      
      const buffer = waveformBufferRef.current;
      for (let i = 0; i < buffer.length && i < width; i++) {
        const x = width - i - 1; // Right to left
        // Unipolar: envelope intensity from bottom (0) to top (1)
        const y = height - buffer[i] * height * 0.9; // Leave 10% margin at bottom
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw transient markers (scrolling at same rate as waveform)
    transientBufferRef.current.forEach((transient) => {
      // Use peakBufferIndex to position marker at actual peak location
      const x = width - transient.peakBufferIndex - 1; // Right to left, same calculation as waveform
      if (x >= 0 && x < width) {
        ctx.save();
        
        // Find the y position of the peak in the waveform at this x position
        const peakY = transient.peakBufferIndex < waveformBufferRef.current.length 
          ? height - waveformBufferRef.current[transient.peakBufferIndex] * height * 0.9
          : height;
        
        // Draw vertical line from peak to bottom
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, peakY);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // Draw downward-pointing triangle at top (at the peak position)
        const triangleSize = 6;
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.moveTo(x, peakY);
        ctx.lineTo(x - triangleSize / 2, peakY + triangleSize);
        ctx.lineTo(x + triangleSize / 2, peakY + triangleSize);
        ctx.closePath();
        ctx.fill();
        
        // Draw intensity indicator at the peak position
        const markerHeight = transient.intensity * height * 0.2;
        ctx.fillStyle = `rgba(255, 255, 0, ${0.3 + transient.intensity * 0.5})`;
        ctx.fillRect(x - 1, peakY - markerHeight, 2, markerHeight);
        
        ctx.restore();
      }
    });
  }, [envelopeValue, transients, currentTime, width, height, maxBufferSize, updateInterval]);

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
  // Initialize decayTime from shared ref if available, otherwise default to 0.5s
  const [decayTime, setDecayTime] = useState(featureDecayTimesRef.current[feature.id] ?? 0.5);
  const lastTransientRef = useRef<{ time: number; intensity: number } | null>(null);
  
  const isTransientFeature = feature.isEvent && feature.id.includes('peaks');
  
  // Get transients for oscilloscope display
  const transients = useMemo(() => {
    if (!isTransientFeature) return [];
    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    return analysis?.analysisData?.transients || [];
  }, [isTransientFeature, cachedAnalysis, feature.stemType]);
  
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
    if (isTransientFeature) {
      return (
        <div className="space-y-2">
          {/* Oscilloscope display (shows envelope waveform with transient markers) */}
          <div className="w-full h-10 bg-neutral-900 border border-neutral-600 rounded-sm overflow-hidden">
            <PeaksOscilloscope 
              envelopeValue={liveValue}
              transients={transients}
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
      {/* Slider is now outside the draggable handle */}
      {isTransientFeature && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-neutral-400 font-mono">Decay</Label>
            <span className="text-[10px] text-neutral-300 font-mono">{decayTime.toFixed(2)}s</span>
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
