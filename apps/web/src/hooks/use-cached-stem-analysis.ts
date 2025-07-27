import { useState, useCallback, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { AudioAnalysisDataForTrack } from '@/types/stem-audio-analysis';
import { WaveformData } from '@/components/stem-visualization/stem-waveform';

// Define StemType locally to match the type used in StemAnalysis
type StemType = 'drums' | 'bass' | 'vocals' | 'other' | 'piano' | 'master';

interface CachedStemAnalysis {
  id: string;
  fileMetadataId: string;
  stemType: StemType;
  analysisData: AudioAnalysisDataForTrack;
  waveformData: WaveformData;
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
  };
}

interface AnalysisProgress {
  progress: number;
  message: string;
}

interface UseCachedStemAnalysis {
  cachedAnalysis: CachedStemAnalysis[];
  isLoading: boolean;
  error: string | null;
  analysisProgress: Record<string, AnalysisProgress | null>;
  loadAnalysis: (fileIds: string[], stemType?: string) => Promise<void>;
  analyzeAudioBuffer: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void;
}

export function useCachedStemAnalysis(): UseCachedStemAnalysis {
  const [cachedAnalysis, setCachedAnalysis] = useState<CachedStemAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [queryFileIds, setQueryFileIds] = useState<string[]>([]);
  const [queryStemType, setQueryStemType] = useState<string | undefined>(undefined);
  const workerRef = useRef<Worker | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<Record<string, AnalysisProgress | null>>({});

  const cacheAnalysisMutation = trpc.stem.cacheClientSideAnalysis.useMutation({
    onSuccess: (data) => {
      if (data.cached) {
        console.log('Client-side analysis cached successfully:', data);
      }
    },
    onError: (error) => {
      console.error('Failed to cache client-side analysis:', error);
      // We could potentially set an error state for the specific file here
    }
  });
  
  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker('/workers/audio-analysis-worker.js');

    workerRef.current.onmessage = (event) => {
      const { type, data } = event.data;
      switch (type) {
        case 'ANALYSIS_PROGRESS':
          setAnalysisProgress(prev => ({ ...prev, [data.fileId]: { progress: data.progress, message: data.message } }));
          break;
        case 'ANALYSIS_COMPLETE':
          console.log('Analysis complete for file:', data.fileId);
          console.log('Analysis result data:', data.result);
          setCachedAnalysis(prev => {
            const newAnalysis = [...prev, data.result];
            console.log('Updated cached analysis:', newAnalysis.map(a => ({ id: a.fileMetadataId, stemType: a.stemType })));
            return newAnalysis;
          });
          setAnalysisProgress(prev => ({ ...prev, [data.fileId]: null })); // Clear progress
          // Cache the result in the background
          cacheAnalysisMutation.mutate(data.result);
          break;
        case 'ANALYSIS_ERROR':
          console.error(`Analysis error for ${data.fileId}:`, data.error);
          console.error('Analysis error details:', data.details);

          // Provide user-friendly error message
          const userMessage = data.error.includes('Meyda')
            ? 'Audio analysis unavailable. Please refresh the page and try again.'
            : `Analysis failed: ${data.error}`;

          setAnalysisProgress(prev => ({ ...prev, [data.fileId]: { progress: 1, message: `Error: ${userMessage}` } }));
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);


  const {
    data,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = trpc.stem.getCachedAnalysis.useQuery(
    { fileIds: queryFileIds, stemType: queryStemType },
    { enabled: queryFileIds.length > 0 }
  );

  const loadAnalysis = useCallback(async (fileIds: string[], stemType?: string) => {
    if (!fileIds || fileIds.length === 0) return;

    const newFileIds = fileIds.filter(id => !cachedAnalysis.some(a => a.fileMetadataId === id));

    if (newFileIds.length === 0) {
      return;
    }

    // Prevent unnecessary state updates if the same data is already being loaded
    const currentFileIds = queryFileIds.join(',');
    const newFileIdsStr = newFileIds.join(',');
    if (currentFileIds === newFileIdsStr && queryStemType === stemType) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setQueryFileIds(newFileIds);
    setQueryStemType(stemType);
  }, [queryFileIds, queryStemType, cachedAnalysis]);

  const analyzeAudioBuffer = useCallback((fileId: string, audioBuffer: AudioBuffer, stemType: string) => {
    console.log('🎵 analyzeAudioBuffer called:', { fileId, stemType, duration: audioBuffer.duration });
    
    if (!workerRef.current) {
      console.error("Analysis worker not ready.");
      return;
    }
    
    // Check if already cached or in progress
    if (cachedAnalysis.some(a => a.fileMetadataId === fileId) || analysisProgress[fileId]) {
      console.log('🎵 Skipping analysis - already cached or in progress');
      return;
    }

    // Direct analysis without fallback system
    console.log('🎵 Starting analysis for:', fileId, stemType);
    setAnalysisProgress(prev => ({ ...prev, [fileId]: { progress: 0, message: 'Starting analysis...' } }));
    
    const channelData = audioBuffer.getChannelData(0);
    workerRef.current.postMessage({
      type: 'ANALYZE_BUFFER',
      data: { 
        fileId, 
        channelData,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        stemType,
      }
    }, [channelData.buffer]);
  }, [cachedAnalysis, analysisProgress]);

  useEffect(() => {
    if (queryLoading) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);

    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : String(queryError));
    } else if (data) {
      setCachedAnalysis(prev => {
        const newAnalyses = (Array.isArray(data) ? data : [data]).filter(Boolean);
        const existingIds = new Set(prev.map(a => a.fileMetadataId));
        
        const trulyNew = newAnalyses.filter(a => {
          if (!a || !a.fileMetadataId || existingIds.has(a.fileMetadataId)) {
            return false;
          }
          // Type guard to filter out old data from backend cache.
          // The new format from client-side worker won't have a `volume` property on analysisData.
          if (a.analysisData && 'volume' in a.analysisData && typeof (a.analysisData as Record<string, unknown>).volume !== 'undefined') {
            console.warn(`Skipping cached analysis for ${a.fileMetadataId} due to outdated format.`);
            return false;
          }
          return true;
        }) as unknown as CachedStemAnalysis[];

        if (trulyNew.length > 0) {
          return [...prev, ...trulyNew];
        }
        return prev;
      });
      setError(null);
    }
  }, [data, queryLoading, queryError]);

  return {
    cachedAnalysis,
    isLoading,
    error,
    analysisProgress,
    loadAnalysis,
    analyzeAudioBuffer,
  };
}
