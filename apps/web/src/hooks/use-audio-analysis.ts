import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/trpc';

export interface AnalysisFile {
  id: string;
  file: File | null;
  url?: string;
}

export function useAudioAnalysis() {
  const { toast } = useToast();
  const analysisWorkerRef = useRef<Worker | null>(null);
  const [analysisQueue, setAnalysisQueue] = useState<AnalysisFile[]>([]);
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  const saveAnalysisMutation = trpc.file.saveAudioAnalysis.useMutation();

  useEffect(() => {
    analysisWorkerRef.current = new Worker('/workers/audio-analysis-worker.js');
    
    analysisWorkerRef.current.onmessage = async (event) => {
      const { type, fileId, analysisData, error } = event.data;

      if (type === 'WORKER_READY') {
        setIsWorkerReady(true);
        console.log('Audio analysis worker is ready.');
        return;
      }
      
      if (type === 'success') {
        try {
          await saveAnalysisMutation.mutateAsync({ fileId, analysisData });
          toast({
            title: 'Analysis Complete',
            description: `Successfully analyzed file ${fileId}`,
          });
        } catch (saveError: any) {
          console.error(`Failed to save analysis for ${fileId}:`, saveError);
          toast({
            title: 'Save Failed',
            description: `Could not save analysis results: ${saveError.message}`,
            variant: 'destructive',
          });
        }
      } else if (type === 'error') {
        console.error(`Analysis failed for ${fileId}:`, error);
        toast({
          title: 'Analysis Failed',
          description: `Could not analyze file: ${error}`,
          variant: 'destructive',
        });
      }
      // Remove from queue regardless of outcome
      setAnalysisQueue(prev => prev.filter(f => f.id !== fileId));
    };

    return () => {
      analysisWorkerRef.current?.terminate();
      setIsWorkerReady(false);
    };
  }, [toast, saveAnalysisMutation]);

  const analyzeFile = useCallback((file: AnalysisFile) => {
    setAnalysisQueue(prev => [...prev, file]);
  }, []);
  
  useEffect(() => {
    if (isWorkerReady && analysisQueue.length > 0 && analysisWorkerRef.current) {
      const fileToAnalyze = analysisQueue[0];
      
      const messagePayload: any = {
        fileId: fileToAnalyze.id,
      };

      if (fileToAnalyze.file) {
        messagePayload.file = fileToAnalyze.file;
      } else if (fileToAnalyze.url) {
        messagePayload.url = fileToAnalyze.url;
      } else {
        console.error('Analysis job must have a file or a URL', fileToAnalyze);
        setAnalysisQueue(prev => prev.filter(f => f.id !== fileToAnalyze.id));
        return;
      }
      
      analysisWorkerRef.current.postMessage(messagePayload);
    }
  }, [analysisQueue, isWorkerReady]);

  return { analyzeFile };
} 