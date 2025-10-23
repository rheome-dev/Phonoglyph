import { useState, useCallback, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { debugLog } from '@/lib/utils';
import { WaveformData } from '@/components/stem-visualization/stem-waveform';

interface TransientData {
  time: number;
  intensity: number;
  frequency?: number;
}

interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  chroma: number[];
}

// Consolidated data structure matching worker output
export interface AudioAnalysisData {
  id: string;
  fileMetadataId: string;
  stemType: string;
  
  // Keep as 'analysisData' to match worker output
  analysisData: {
    // Core time-series features
    rms: Float32Array;
    loudness: Float32Array;
    spectralCentroid: Float32Array;
    spectralRolloff?: Float32Array;
    spectralFlatness?: Float32Array;
    zcr?: Float32Array;
    
    // FFT data
    fft: Float32Array;
    fftFrequencies?: Float32Array;
    amplitudeSpectrum?: Float32Array;
    
    // Legacy/derived fields (for backward compatibility)
    volume?: Float32Array;
    bass?: Float32Array;
    mid?: Float32Array;
    treble?: Float32Array;
    features?: Float32Array;
    markers?: Float32Array;
    frequencies?: Float32Array;
    timeData?: Float32Array;
    
    // Stereo data
    stereoWindow_left?: Float32Array;
    stereoWindow_right?: Float32Array;
    
    // Enhanced features
    transients?: TransientData[];
    chroma?: ChromaData[];
  };
  
  waveformData: WaveformData;
  
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
  };
}

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
  
  const workerRef = useRef<Worker | null>(null);
  const [queryState, setQueryState] = useState<{ fileIds: string[]; stemType?: string }>({ fileIds: [] });

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

  // Worker initialization
  useEffect(() => {
    workerRef.current = new Worker('/workers/audio-analysis-worker.js');

    workerRef.current.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'ANALYSIS_PROGRESS':
          setAnalysisProgress(prev => ({ 
            ...prev, 
            [data.fileId]: { progress: data.progress, message: data.message } 
          }));
          break;
          
        case 'ANALYSIS_COMPLETE':
          debugLog.log('🎵 Analysis complete for:', data.fileId);
          const newAnalysis: AudioAnalysisData = data.result;
          
          setCachedAnalysis(prev => [
            ...prev.filter(a => !(a.fileMetadataId === data.fileId && a.stemType === newAnalysis.stemType)),
            newAnalysis
          ]);
          
          setAnalysisProgress(prev => {
            const { [data.fileId]: removed, ...rest } = prev;
            return rest;
          });
          
          // Cache to backend
          cacheMutation.mutate(newAnalysis as any);
          break;
          
        case 'ANALYSIS_ERROR':
          debugLog.error(`❌ Analysis error for ${data.fileId}:`, data.error);
          setAnalysisProgress(prev => ({ 
            ...prev, 
            [data.fileId]: { progress: 1, message: `Error: ${data.error}` } 
          }));
          setError(`Analysis failed for ${data.fileId}: ${data.error}`);
          break;
      }
    };

    return () => {
      if (workerRef.current) {
        debugLog.log('🧹 Terminating audio analysis worker');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Empty deps - worker should only init once on mount

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

  const analyze = useCallback((fileId: string, audioBuffer: AudioBuffer, stemType: string) => {
    if (!workerRef.current) {
      debugLog.error("❌ Analysis worker not initialized");
      return;
    }
    
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
      [fileId]: { progress: 0, message: 'Queued for analysis...' } 
    }));
    
    // Copy channel data to avoid detachment
    const channelData = audioBuffer.getChannelData(0);
    const channelDataCopy = new Float32Array(channelData);
    
    workerRef.current.postMessage({
      type: 'ANALYZE_BUFFER',
      data: { 
        fileId, 
        channelData: channelDataCopy,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        stemType,
      }
    });
  }, [analysisProgress, cachedAnalysis]);

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
    // Parse feature format: "drums-rms" or "rms"
    const [parsedStem, parsedFeature] = feature.includes('-') 
      ? feature.split('-', 2) 
      : [stemType ?? 'master', feature];
    
    const analysis = getAnalysis(fileId, parsedStem);
    if (!analysis?.analysisData || time < 0 || time > analysis.metadata.duration) {
      return 0;
    }

    const { analysisData, metadata } = analysis;
    const featureLower = parsedFeature.toLowerCase();

    // Event-based features (transients, chroma)
    if (featureLower === 'impact' || featureLower === 'transient') {
      const transient = analysisData.transients?.find(t => Math.abs(t.time - time) < 0.05);
      return transient?.intensity ?? 0;
    }
    
    if (featureLower === 'pitch-height' || featureLower === 'pitch') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.pitch ?? 0;
    }

    if (featureLower === 'brightness' || featureLower === 'confidence') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.confidence ?? 0;
    }

    // Time-series features - hop-based indexing using bufferSize/sampleRate
    const getTimeSeriesValue = (arr: Float32Array | undefined): number => {
      if (!arr || arr.length === 0) return 0;
      const sampleRate = metadata.sampleRate || 0;
      const bufferSize = metadata.bufferSize || 0;
      const hasHop = sampleRate > 0 && bufferSize > 0;
      if (hasHop) {
        const hopSeconds = bufferSize / sampleRate;
        const index = Math.min(arr.length - 1, Math.max(0, Math.floor(time / hopSeconds)));
        return arr[index] ?? 0;
      }
      // Fallback to derived fps if hop cannot be computed
      const fps = metadata.duration > 0 ? (arr.length / metadata.duration) : 0;
      const index = Math.min(arr.length - 1, Math.max(0, Math.floor(time * fps)));
      return arr[index] ?? 0;
    };

    switch (featureLower) {
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
