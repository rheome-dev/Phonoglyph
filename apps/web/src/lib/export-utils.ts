import { useTimelineStore } from '@/stores/timelineStore';
import type { RayboxCompositionProps } from '@/remotion/Root';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';
import { DEFAULT_VISUALIZATION_SETTINGS } from 'phonoglyph-types';
import type { VisualizationSettings } from 'phonoglyph-types';

/**
 * File object structure expected from project audio files.
 * Files should have at minimum: downloadUrl and is_master flag.
 */
interface ProjectAudioFile {
  id?: string;
  downloadUrl?: string;
  is_master?: boolean;
  file_name?: string;
  file_type?: string;
  upload_status?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Gathers all project data needed for Remotion export.
 * 
 * @param projectId - The project ID (currently unused but included for future use)
 * @param cachedAnalysis - Array of audio analysis data from useAudioAnalysis hook
 * @param projectAudioFiles - Array of file objects containing downloadUrl, is_master flag, etc.
 * @returns An object matching RayboxCompositionProps interface ready for Remotion export
 */
export function getProjectExportPayload(
  projectId: string,
  cachedAnalysis: AudioAnalysisData[],
  projectAudioFiles: ProjectAudioFile[]
): RayboxCompositionProps {
  // 1. Get Store State
  const timelineState = useTimelineStore.getState();

  // 2. Extract Data
  const layers = timelineState.layers;

  // Map visualizer store settings to VisualizationSettings
  // Since visualizer store doesn't directly store VisualizationSettings,
  // we use the default settings. In the future, these could be stored
  // in the project settings or passed as a parameter.
  const visualizationSettings: VisualizationSettings = {
    ...DEFAULT_VISUALIZATION_SETTINGS,
    // Could potentially map from visualizerState.aspectRatio or other settings
    // For now, using defaults as specified
  };

  const audioAnalysisData = cachedAnalysis;

  // 3. Find Master Audio
  let masterAudioUrl = '';
  
  // First, try to find the file where is_master === true
  const masterFile = projectAudioFiles.find(file => file.is_master === true);
  
  if (masterFile?.downloadUrl) {
    masterAudioUrl = masterFile.downloadUrl;
  } else if (projectAudioFiles.length > 0) {
    // Fallback to the first audio file's URL
    const firstAudioFile = projectAudioFiles.find(
      file => file.file_type === 'audio' || file.downloadUrl
    );
    masterAudioUrl = firstAudioFile?.downloadUrl || '';
  }

  // 4. Return Object
  return {
    layers,
    audioAnalysisData,
    visualizationSettings,
    masterAudioUrl,
  };
}

