import type { AudioAnalysisData } from './audio-analysis-data';

export type AnalysisCompletePayload = {
  result: AudioAnalysisData;
};

export type WorkerResponse =
  | { type: 'ANALYSIS_COMPLETE'; data: AnalysisCompletePayload }
  | { type: 'ANALYSIS_PROGRESS'; data: { progress: number; message: string } }
  | { type: 'ANALYSIS_ERROR'; data: { fileId?: string; error: string } };


