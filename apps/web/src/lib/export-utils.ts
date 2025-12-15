import { useTimelineStore } from '@/stores/timelineStore';
import {
  type FeatureMapping,
  useVisualizerStore,
} from '@/stores/visualizerStore';
import type { RayboxCompositionProps } from '@/remotion/Root';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';
import { DEFAULT_VISUALIZATION_SETTINGS } from 'phonoglyph-types';
import type { VisualizationSettings } from 'phonoglyph-types';

/**
 * File object structure expected from project files.
 */
interface ProjectFile {
  id?: string;
  downloadUrl?: string;
  is_master?: boolean;
  file_name?: string;
  file_type?: string;
  upload_status?: string;
  [key: string]: any;
}

/**
 * Gathers all project data needed for Remotion export.
 * Actively hydrates layer assets with fresh URLs to ensure the export is self-healing.
 */
export function getProjectExportPayload(
  projectId: string,
  cachedAnalysis: AudioAnalysisData[],
  projectFiles: ProjectFile[],
  stemUrlMap: Record<string, string> = {},
): RayboxCompositionProps {
  // 1. Get Store State
  const timelineState = useTimelineStore.getState();
  const visualizerState = useVisualizerStore.getState();

  // 2. Extract and Hydrate Layers
  // Deep clone layers to avoid mutating the active store during hydration
  const rawLayers = timelineState.layers;
  const layers = JSON.parse(JSON.stringify(rawLayers)).map((layer: any) => {
    // Hydrate Image Slideshows with fresh URLs from stemUrlMap
    if (layer.effectType === 'imageSlideshow' && layer.settings) {
      const imageIds = layer.settings.imageIds as string[];

      // If we have IDs and a URL map, attempt to resolve fresh URLs
      if (Array.isArray(imageIds) && imageIds.length > 0) {
        const freshImages = imageIds
          .map((id) => stemUrlMap[id]) // Look up fresh signed URL
          .filter(Boolean); // Remove any that failed to resolve

        // Only update if we successfully resolved images
        if (freshImages.length > 0) {
          layer.settings.images = freshImages;
        }
      }
    }
    return layer;
  });

  const mappings: Record<string, FeatureMapping> = visualizerState.mappings;
  const baseParameterValues: Record<string, Record<string, any>> =
    visualizerState.baseParameterValues;

  const visualizationSettings: VisualizationSettings = {
    ...DEFAULT_VISUALIZATION_SETTINGS,
  };

  const audioAnalysisData = cachedAnalysis;

  // 3. Find Master Audio
  let masterAudioUrl = '';

  const masterFile = projectFiles.find((file) => file.is_master === true);

  if (masterFile?.id) {
    masterAudioUrl = stemUrlMap[masterFile.id] || '';
    if (!masterAudioUrl && masterFile.downloadUrl) {
      masterAudioUrl = masterFile.downloadUrl;
    }
  } else if (projectFiles.length > 0) {
    // Fallback: look for audio files
    const firstAudioFile = projectFiles.find(
      (file) => file.file_type === 'audio' || file.downloadUrl,
    );

    if (firstAudioFile?.id) {
      masterAudioUrl =
        stemUrlMap[firstAudioFile.id] || firstAudioFile.downloadUrl || '';
    } else if (firstAudioFile?.downloadUrl) {
      masterAudioUrl = firstAudioFile.downloadUrl;
    }
  }

  // 4. Return Object
  return {
    layers,
    audioAnalysisData,
    visualizationSettings,
    masterAudioUrl,
    mappings,
    baseParameterValues,
  };
}

