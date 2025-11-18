import { useState, useCallback, useEffect, useRef } from 'react';
import { analyze as detectBpm } from 'web-audio-beat-detector';
import { trpc } from '@/lib/trpc';
import { debugLog } from '@/lib/utils';
import type { WorkerResponse } from '@/types/worker-messages';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';

// Types moved to '@/types/audio-analysis-data'

// Shared decay time storage - allows FeatureNode slider to control envelope generation
export const featureDecayTimesRef = { current: {} as Record<string, number> };

export interface UseAudioAnalysis {
  // State
  cachedAnalysis: AudioAnalysisData[]; // Keep name for backward compatibility
  isLoading: boolean;
  analysisProgress: Record<string, { progress: number; message: string }>; // Keep name
  error: string | null;
  
  // Methods
  loadAnalysis: (fileIds: string[], stemType?: string) => Promise<void>; // Keep name
  analyze: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void;
  analyzeAudioBuffer: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void; // Alias
  getAnalysis: (fileId: string, stemType?: string) => AudioAnalysisData | null;
  getFeatureValue: (fileId: string, feature: string, time: number, stemType?: string) => number;
}

export function useAudioAnalysis(): UseAudioAnalysis {
  const [cachedAnalysis, setCachedAnalysis] = useState<AudioAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<Record<string, { progress: number; message: string }>>({});
  
  // Legacy worker ref no longer used; worker is created per-analysis for TS worker bundling
  const workerRef = useRef<Worker | null>(null);
  const [queryState, setQueryState] = useState<{ fileIds: string[]; stemType?: string }>({ fileIds: [] });
  
  // Track last transient for each peaks feature to generate envelope signals
  const lastTransientRefs = useRef<Record<string, { time: number; intensity: number }>>({});

  // tRPC hooks
  const {
    data: cachedData,
    isLoading: isQueryLoading,
    error: queryError,
  } = trpc.stem.getCachedAnalysis.useQuery(
    { fileIds: queryState.fileIds, stemType: queryState.stemType },
    { enabled: queryState.fileIds.length > 0 }
  );
  
  const cacheMutation = trpc.stem.cacheClientSideAnalysis.useMutation({
    onSuccess: (data) => {
      if (data.cached) {
        debugLog.log('✅ Analysis cached on server:', data);
      }
    },
    onError: (error) => {
      debugLog.error('❌ Failed to cache analysis:', error);
    }
  });

  // No global worker; we spin up a per-analysis TS worker when needed

  // Handle cached data from server
  useEffect(() => {
    setIsLoading(isQueryLoading);

    if (queryError) {
      setError(queryError.message);
    } else if (cachedData) {
      const newAnalyses = (Array.isArray(cachedData) ? cachedData : [cachedData])
        .filter(Boolean) as unknown as AudioAnalysisData[];
      
      setCachedAnalysis(prev => {
        const existingKeys = new Set(prev.map(a => `${a.fileMetadataId}-${a.stemType}`));
        const trulyNew = newAnalyses.filter(a => 
          a && a.fileMetadataId && !existingKeys.has(`${a.fileMetadataId}-${a.stemType}`)
        );
        
        if (trulyNew.length > 0) {
          debugLog.log('📥 Loaded from cache:', trulyNew.map(a => `${a.fileMetadataId} (${a.stemType})`));
          return [...prev, ...trulyNew];
        }
        return prev;
      });
      setError(null);
    }
  }, [cachedData, isQueryLoading, queryError]);

  // API methods
  const loadAnalysis = useCallback(async (fileIds: string[], stemType?: string) => {
    if (!fileIds || fileIds.length === 0) return;
    
    const idsToFetch = fileIds.filter(id => 
      !cachedAnalysis.some(a => a.fileMetadataId === id && (!stemType || a.stemType === stemType))
    );
    
    if (idsToFetch.length > 0) {
      debugLog.log('🔍 Loading from cache:', idsToFetch, stemType);
      setQueryState({ fileIds: idsToFetch, stemType });
    } else {
      debugLog.log('✅ All analyses already loaded');
    }
  }, [cachedAnalysis]);

  const analyze = useCallback(async (fileId: string, audioBuffer: AudioBuffer, stemType: string) => {
    // Skip if already in progress
    if (analysisProgress[fileId]) {
      debugLog.log('⏭️ Analysis already in progress:', fileId);
      return;
    }

    // Skip if already exists
    const existing = cachedAnalysis.find(a => a.fileMetadataId === fileId && a.stemType === stemType);
    if (existing) {
      debugLog.log('⏭️ Analysis already exists:', fileId, stemType);
      return;
    }

    debugLog.log('🎵 Starting analysis:', fileId, stemType);
    setAnalysisProgress(prev => ({
      ...prev,
      [fileId]: { progress: 0, message: 'Detecting BPM and analyzing...' }
    }));

    // 1) Calculate BPM on the main thread
    let bpm: number | null = null;
    try {
      const detected = await detectBpm(audioBuffer as unknown as AudioBuffer);
      if (Number.isFinite(detected)) bpm = detected as number;
    } catch (err) {
      // Some audio has no detectable beats; record as null without noisy errors
      debugLog.warn ? debugLog.warn('BPM detection unavailable for this audio') : debugLog.log('BPM detection unavailable for this audio');
      bpm = null;
    }

    // 2) Create the TS worker via module URL
    const worker = new Worker(new URL('../app/workers/audio-analysis.worker.ts', import.meta.url));

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, data } = (event.data as WorkerResponse) || ({} as any);
      if (type === 'ANALYSIS_COMPLETE') {
        const result = (data as any).result as AudioAnalysisData;
        // Merge BPM into analysis results
        const merged: AudioAnalysisData = {
          ...result,
          analysisData: bpm !== null ? { ...result.analysisData, bpm } : { ...result.analysisData },
          metadata: bpm !== null ? { ...result.metadata, bpm } : { ...result.metadata },
          ...(bpm !== null ? { bpm } : {}),
        };

        setCachedAnalysis(prev => [
          ...prev.filter(a => !(a.fileMetadataId === fileId && a.stemType === merged.stemType)),
          merged,
        ]);

        setAnalysisProgress(prev => {
          const { [fileId]: _removed, ...rest } = prev;
          return rest;
        });

        cacheMutation.mutate(merged as any);
        worker.terminate();
      } else if (type === 'ANALYSIS_PROGRESS') {
        setAnalysisProgress(prev => ({
          ...prev,
          [fileId]: { progress: data.progress, message: data.message }
        }));
      } else if (type === 'ANALYSIS_ERROR') {
        debugLog.error(`❌ Analysis error for ${fileId}:`, data.error);
        setAnalysisProgress(prev => ({
          ...prev,
          [fileId]: { progress: 1, message: `Error: ${data.error}` }
        }));
        setError(`Analysis failed for ${fileId}: ${data.error}`);
        worker.terminate();
      }
    };

    // 4) Post audio data to worker (without BPM responsibility)
    const channelDataCopy = new Float32Array(audioBuffer.getChannelData(0));
    worker.postMessage({
      type: 'ANALYZE_BUFFER',
      data: {
        fileId,
        channelData: channelDataCopy,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        stemType,
        enhancedAnalysis: true,
      }
    });
  }, [analysisProgress, cachedAnalysis, cacheMutation, debugLog]);

  const getAnalysis = useCallback((fileId: string, stemType?: string): AudioAnalysisData | null => {
    const targetStemType = stemType ?? 'master';
    return cachedAnalysis.find(a => 
      a.fileMetadataId === fileId && a.stemType === targetStemType
    ) ?? null;
  }, [cachedAnalysis]);
  
  const getFeatureValue = useCallback((
    fileId: string, 
    feature: string, 
    time: number,
    stemType?: string
  ): number => {
    const featureParts = feature.includes('-') ? feature.split('-') : [feature];
    const parsedStem = featureParts.length > 1 ? featureParts[0] : (stemType ?? 'master');
    const analysis = getAnalysis(fileId, parsedStem);
    
    if (!analysis?.analysisData || time < 0 || time > analysis.metadata.duration) {
      return 0;
    }

    const { analysisData } = analysis;
    const featureName = featureParts.length > 1 ? featureParts.slice(1).join('-') : feature;

    // --- ENVELOPE LOGIC FOR "PEAKS" FEATURES ---
    if (featureName === 'peaks') {
      const decayTime = featureDecayTimesRef.current[feature] ?? 0.5;
      
      // All transients are generic now, no filtering needed
      const relevantTransients = analysisData.transients || [];
      
      const envelopeKey = `${fileId}-${feature}`;
      let storedTransient: { time: number; intensity: number } | undefined = lastTransientRefs.current[envelopeKey];

      // *** FIX A: LOOP DETECTION & STATE RESET ***
      // If time is much smaller than the stored transient's time, we've looped. Reset state.
      if (storedTransient && (time < storedTransient.time - 0.5)) {
        delete lastTransientRefs.current[envelopeKey];
        storedTransient = undefined;
      }
      
      const latestTransient = relevantTransients.reduce((latest: any, t: any) => {
        if (t.time <= time && (!latest || t.time > latest.time)) {
          return t;
        }
        return latest;
      }, null);
      
      if (latestTransient) {
        if (!storedTransient || latestTransient.time > storedTransient.time) {
          lastTransientRefs.current[envelopeKey] = { time: latestTransient.time, intensity: latestTransient.intensity };
        }
      }
      
      const activeTransient = lastTransientRefs.current[envelopeKey];
      if (activeTransient) {
        const elapsedTime = time - activeTransient.time;
        if (elapsedTime >= 0 && elapsedTime < decayTime) {
          // This is the correct, enveloped modulation signal
          return activeTransient.intensity * (1 - (elapsedTime / decayTime));
        }
      }
      
      return 0;
    }
    
    // --- PITCH & TIME-SERIES LOGIC ---
    if (featureName === 'pitch') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.pitch ? chroma.pitch / 11 : 0;
    }

    if (featureName === 'brightness' || featureName === 'confidence') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.confidence ?? 0;
    }

    // Time-series features - timestamp-based indexing using analysisData.frameTimes
    const getTimeSeriesValue = (arr: Float32Array | number[] | undefined): number => {
      if (!arr || arr.length === 0) return 0;
      const times = (analysisData as any).frameTimes as Float32Array | number[] | undefined;
      if (!times || times.length === 0) return 0;
      // Binary search: find last index with times[idx] <= time
      let lo = 0;
      let hi = Math.min(times.length - 1, arr.length - 1);
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1; // upper mid to avoid infinite loop
        const tmid = (times as any)[mid];
        if (tmid <= time) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      const index = Math.max(0, Math.min(arr.length - 1, lo));
      return arr[index] ?? 0;
    };

    switch (featureName) {
      case 'rms':
        return getTimeSeriesValue(analysisData.rms);
      case 'volume':
        return getTimeSeriesValue(analysisData.volume ?? analysisData.rms);
      case 'loudness':
        return getTimeSeriesValue(analysisData.loudness);
      case 'spectral-centroid':
      case 'spectralcentroid':
        return getTimeSeriesValue(analysisData.spectralCentroid);
      case 'spectral-rolloff':
      case 'spectralrolloff':
        return getTimeSeriesValue(analysisData.spectralRolloff);
      case 'bass':
        return getTimeSeriesValue(analysisData.bass);
      case 'mid':
        return getTimeSeriesValue(analysisData.mid);
      case 'treble':
        return getTimeSeriesValue(analysisData.treble);
      default:
        return 0;
    }
  }, [getAnalysis]);

  return {
    cachedAnalysis,
    isLoading,
    analysisProgress,
    error,
    loadAnalysis,
    analyze,
    analyzeAudioBuffer: analyze, // Alias for backward compatibility
    getAnalysis,
    getFeatureValue,
  };
}
