import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { AudioAnalysisData } from '@/types/visualizer';
import { WaveformData, FeatureMarker } from '@/components/stem-visualization/stem-waveform';

interface CachedStemAnalysis {
  id: string;
  fileMetadataId: string;
  stemType: string;
  analysisData: AudioAnalysisData;
  waveformData: WaveformData;
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
  };
}

interface UseCachedStemAnalysis {
  cachedAnalysis: CachedStemAnalysis[];
  isLoading: boolean;
  error: string | null;
  loadAnalysis: (fileIds: string[], stemType?: string) => Promise<void>;
}

export function useCachedStemAnalysis(): UseCachedStemAnalysis {
  const [cachedAnalysis, setCachedAnalysis] = useState<CachedStemAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryFileIds, setQueryFileIds] = useState<string[]>([]);
  const [queryStemType, setQueryStemType] = useState<string | undefined>(undefined);

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
    
    // Prevent unnecessary state updates if the same data is already being loaded
    const currentFileIds = queryFileIds.join(',');
    const newFileIds = fileIds.join(',');
    if (currentFileIds === newFileIds && queryStemType === stemType) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setQueryFileIds(fileIds);
    setQueryStemType(stemType);
  }, [queryFileIds, queryStemType]);

  useEffect(() => {
    if (data) {
      setCachedAnalysis(Array.isArray(data) ? data : [data]);
      setError(null);
      setIsLoading(false);
    } else if (queryLoading) {
      setIsLoading(true);
    } else if (queryFileIds.length > 0) {
      // Only clear data if we actually have a query running
      setCachedAnalysis([]);
      setIsLoading(false);
    }
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : String(queryError));
      setIsLoading(false);
    }
  }, [data, queryLoading, queryError, queryFileIds.length]);

  return {
    cachedAnalysis,
    isLoading,
    error,
    loadAnalysis,
  };
}