import { useState, useCallback, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { AudioAnalysisDataForTrack } from '@/types/stem-audio-analysis';
import { WaveformData, FeatureMarker } from '@/components/stem-visualization/stem-waveform';
import { AnalysisParams, AnalysisMethod, TransientData, ChromaData, RMSData } from '@/types/audio-analysis';
import { useCachedStemAnalysis } from './use-cached-stem-analysis';

interface EnhancedAnalysisData {
  // Original analysis data
  original: AudioAnalysisDataForTrack;
  
  // New analysis data
  transients: TransientData[];
  chroma: ChromaData[];
  rms: RMSData[];
  
  // Analysis parameters used
  analysisParams: AnalysisParams;
}

interface CachedEnhancedAnalysis {
  id: string;
  fileMetadataId: string;
  stemType: string;
  analysisData: EnhancedAnalysisData;
  waveformData: WaveformData;
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
    analysisMethod: 'original' | 'enhanced' | 'both';
  };
}

interface AnalysisProgress {
  progress: number;
  message: string;
}

interface UseEnhancedAudioAnalysis {
  cachedAnalysis: CachedEnhancedAnalysis[];
  isLoading: boolean;
  error: string | null;
  analysisProgress: Record<string, AnalysisProgress | null>;
  analysisParams: AnalysisParams;
  loadAnalysis: (fileIds: string[], stemType?: string) => Promise<void>;
  analyzeAudioBuffer: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void;
  updateAnalysisParams: (params: Partial<AnalysisParams>) => void;
  getFeatureValue: (fileId: string, feature: string, time: number) => number;
}

export function useEnhancedAudioAnalysis(): UseEnhancedAudioAnalysis {
  const [cachedAnalysis, setCachedAnalysis] = useState<CachedEnhancedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<Record<string, AnalysisProgress | null>>({});
  const [analysisParams, setAnalysisParams] = useState<AnalysisParams>({
    transientThreshold: 0.3,
    onsetThreshold: 0.2,
    chromaSmoothing: 0.8,
    rmsWindowSize: 1024,
    pitchConfidence: 0.7,
    minNoteDuration: 0.1
  });

  const workerRef = useRef<Worker | null>(null);
  const cachedStemAnalysis = useCachedStemAnalysis();

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined' && !workerRef.current) {
      workerRef.current = new Worker('/workers/audio-analysis-worker.js');
      
      workerRef.current.onmessage = (event) => {
        const { type, data } = event.data;
        
        if (type === 'ANALYSIS_PROGRESS') {
          setAnalysisProgress(prev => ({
            ...prev,
            [data.fileId]: { progress: data.progress, message: data.message }
          }));
        } else if (type === 'ANALYSIS_COMPLETE') {
          const { fileId, result } = data;
          
          // Process the enhanced analysis result
          const enhancedAnalysis = processEnhancedAnalysis(result, analysisParams);
          
          setCachedAnalysis(prev => {
            const existing = prev.find(a => a.fileMetadataId === fileId);
            if (existing) {
              return prev.map(a => 
                a.fileMetadataId === fileId 
                  ? { ...a, analysisData: enhancedAnalysis }
                  : a
              );
            } else {
              return [...prev, {
                id: result.id,
                fileMetadataId: fileId,
                stemType: result.stemType,
                analysisData: enhancedAnalysis,
                waveformData: result.waveformData,
                metadata: {
                  ...result.metadata,
                  analysisMethod: 'enhanced' as const
                }
              }];
            }
          });
          
          setAnalysisProgress(prev => ({
            ...prev,
            [fileId]: null
          }));
        } else if (type === 'ANALYSIS_ERROR') {
          const { fileId, error: analysisError } = data;
          setError(`Analysis failed for ${fileId}: ${analysisError}`);
          setAnalysisProgress(prev => ({
            ...prev,
            [fileId]: null
          }));
        }
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [analysisParams]);

  // Process enhanced analysis result
  const processEnhancedAnalysis = useCallback((result: any, params: AnalysisParams): EnhancedAnalysisData => {
    // For enhanced analysis, the result structure is different
    if (result.transients && result.chroma && result.rms) {
      // This is enhanced analysis result
      return {
        original: {
          features: new Float32Array(0),
          markers: new Float32Array(0),
          frequencies: new Float32Array(0),
          timeData: new Float32Array(0),
          volume: new Float32Array(0),
          bass: new Float32Array(0),
          mid: new Float32Array(0),
          treble: new Float32Array(0),
          stereoWindow_left: new Float32Array(0),
          stereoWindow_right: new Float32Array(0),
          fft: new Float32Array(0),
          fftFrequencies: new Float32Array(0),
        },
        transients: result.transients || [],
        chroma: result.chroma || [],
        rms: result.rms || [],
        analysisParams: params
      };
    } else {
      // This is regular analysis result - extract original analysis data
      const original: AudioAnalysisDataForTrack = {
        features: result.analysisData?.features || new Float32Array(0),
        markers: result.analysisData?.markers || new Float32Array(0),
        frequencies: result.analysisData?.frequencies || new Float32Array(0),
        timeData: result.analysisData?.timeData || new Float32Array(0),
        volume: result.analysisData?.volume || new Float32Array(0),
        bass: result.analysisData?.bass || new Float32Array(0),
        mid: result.analysisData?.mid || new Float32Array(0),
        treble: result.analysisData?.treble || new Float32Array(0),
        stereoWindow_left: result.analysisData?.stereoWindow_left || new Float32Array(0),
        stereoWindow_right: result.analysisData?.stereoWindow_right || new Float32Array(0),
        fft: result.analysisData?.fft || new Float32Array(0),
        fftFrequencies: result.analysisData?.fftFrequencies || new Float32Array(0),
      };

      // Extract enhanced analysis data
      const transients = result.analysisData?.transients || [];
      const chroma = result.analysisData?.chroma || [];
      const rms = result.analysisData?.rms || [];

      return {
        original,
        transients,
        chroma,
        rms,
        analysisParams: params
      };
    }
  }, []);

  // Load analysis from cache
  const loadAnalysis = useCallback(async (fileIds: string[], stemType?: string) => {
    if (fileIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Start with original analysis as base - get current value without dependency
      const originalAnalysis = cachedStemAnalysis.cachedAnalysis;
      
      // Create enhanced analysis structure with original data
      const combinedAnalysis: CachedEnhancedAnalysis[] = originalAnalysis.map((orig: any) => ({
        id: orig.id,
        fileMetadataId: orig.fileMetadataId,
        stemType: orig.stemType,
        analysisData: {
          original: orig.analysisData,
          transients: [],
          chroma: [],
          rms: [],
          analysisParams
        },
        waveformData: orig.waveformData,
        metadata: {
          ...orig.metadata,
          analysisMethod: 'enhanced' as const
        }
      }));

      setCachedAnalysis(combinedAnalysis);
      
      console.log('Enhanced analysis structure created, ready for audio buffer analysis');
    } catch (err) {
      console.error('Failed to load analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setIsLoading(false);
    }
  }, [analysisParams]);

  // Analyze audio buffer with enhanced analysis
  const analyzeAudioBuffer = useCallback((fileId: string, audioBuffer: AudioBuffer, stemType: string) => {
    if (!workerRef.current) {
      console.error("Analysis worker not ready.");
      return;
    }

    // Check if enhanced analysis is already in progress
    if (analysisProgress[fileId]) {
      console.log('🎵 Skipping enhanced analysis - already in progress:', fileId);
      return;
    }

    // Check if enhanced analysis already has real data (not just empty arrays)
    const existingAnalysis = cachedAnalysis.find(a => a.fileMetadataId === fileId);
    if (existingAnalysis && 
        existingAnalysis.analysisData.transients.length > 0 && 
        existingAnalysis.analysisData.chroma.length > 0 && 
        existingAnalysis.analysisData.rms.length > 0) {
      console.log('🎵 Skipping enhanced analysis - already has real data:', fileId);
      return;
    }

    console.log('Starting enhanced analysis for:', fileId, stemType);
    setAnalysisProgress(prev => ({ ...prev, [fileId]: { progress: 0, message: 'Queued for enhanced analysis...' } }));
    
    // Create a completely independent copy of the channel data to avoid ArrayBuffer detachment issues
    const channelData = audioBuffer.getChannelData(0);
    const channelDataCopy = new Float32Array(channelData.length);
    channelDataCopy.set(channelData);
    
    workerRef.current.postMessage({
      type: 'ANALYZE_BUFFER',
      data: { 
        fileId, 
        channelData: channelDataCopy,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        stemType,
        analysisParams, // Pass the enhanced analysis parameters
        enhancedAnalysis: true // Flag to indicate enhanced analysis
      }
    }, [channelDataCopy.buffer]);
  }, [cachedAnalysis, analysisProgress, analysisParams]);

  // Get feature value using enhanced analysis
  const getFeatureValue = useCallback((fileId: string, feature: string, time: number): number => {
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === fileId);
    if (!analysis) return 0;

    const { analysisData } = analysis;

    // Map enhanced analysis features to existing audio features
    switch (feature) {
      // Transient-based features
      case 'impact':
        const transient = analysisData.transients.find(t => Math.abs(t.time - time) < 0.1);
        return transient?.intensity || 0;
      
      // Chroma-based features  
      case 'pitch-height':
        const pitch = analysisData.chroma.find(c => Math.abs(c.time - time) < 0.1);
        return pitch?.pitch || 0;
      
      case 'brightness':
        const chroma = analysisData.chroma.find(c => Math.abs(c.time - time) < 0.1);
        return chroma?.confidence || 0;
      
      // RMS-based features
      case 'rms':
      case 'volume':
      case 'loudness':
        const rms = analysisData.rms.find(r => Math.abs(r.time - time) < 0.1);
        return rms?.value || 0;
      
      // Fall back to original analysis for other features
      default:
        // Use original analysis data if available
        if (analysisData.original && analysisData.original[feature]) {
          const featureData = analysisData.original[feature];
          if (Array.isArray(featureData) && featureData.length > 0) {
            // Find the closest time point
            const timeIndex = Math.round(time * 10); // Assuming 10fps data
            return featureData[timeIndex] || 0;
          }
        }
        return 0;
    }
  }, [cachedAnalysis]);

  // Update analysis parameters
  const updateAnalysisParams = useCallback((newParams: Partial<AnalysisParams>) => {
    setAnalysisParams(prev => ({ ...prev, ...newParams }));
  }, []);

  return {
    cachedAnalysis,
    isLoading,
    error,
    analysisProgress,
    analysisParams,
    loadAnalysis,
    analyzeAudioBuffer,
    updateAnalysisParams,
    getFeatureValue
  };
}
