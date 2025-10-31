'use client';

import { useMemo } from 'react';

export interface AudioFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
  isEvent?: boolean;
}

export function useAudioFeatures(
  trackId?: string,
  stemType?: string,
  cachedAnalysis?: any[]
): AudioFeature[] {
  return useMemo(() => {
    if (!trackId || !stemType || !cachedAnalysis || cachedAnalysis.length === 0) {
      return [];
    }
    
    // Find the specific analysis object for the selected track and stem type
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === trackId && a.stemType === stemType);
    
    if (!analysis || !analysis.analysisData) {
      return [];
    }

    const features: AudioFeature[] = [];
    const { analysisData } = analysis;

    // 1. --- Generate Core Features ---
    if (analysisData.rms || analysisData.volume) {
      features.push({
        id: `${stemType}-volume`,
        name: 'Volume',
        description: 'The root-mean-square value, representing overall loudness.',
        category: 'intensity',
        stemType: stemType,
        isEvent: false
      });
    }

    if (analysisData.chroma) {
      features.push({
        id: `${stemType}-pitch`,
        name: 'Pitch',
        description: 'The dominant musical pitch class (C, C#, D, etc.).',
        category: 'pitch',
        stemType: stemType,
        isEvent: true // It's event-like, changing on new note detections
      });
    }

    // 2. --- Generate Transient Features ---
    if (analysisData.transients && Array.isArray(analysisData.transients) && analysisData.transients.length > 0) {
      // Always add the "Impact (All)" feature for any stem with transients
      features.push({
        id: `${stemType}-impact-all`,
        name: 'Impact (All)',
        description: 'The intensity of any detected transient or onset.',
        category: 'rhythm',
        stemType: stemType,
        isEvent: true
      });

      // Conditionally add specialized drum features if they exist
      if (analysisData.transients.some((t: any) => t.type === 'kick')) {
        features.push({
          id: `${stemType}-impact-kick`,
          name: 'Kick Impact',
          description: 'Intensity of detected low-frequency onsets (kicks).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
      if (analysisData.transients.some((t: any) => t.type === 'snare')) {
        features.push({
          id: `${stemType}-impact-snare`,
          name: 'Snare Impact',
          description: 'Intensity of detected mid-frequency onsets (snares).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
      if (analysisData.transients.some((t: any) => t.type === 'hat')) {
        features.push({
          id: `${stemType}-impact-hat`,
          name: 'Hat Impact',
          description: 'Intensity of detected high-frequency onsets (hats/cymbals).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
    }

    return features;
  }, [trackId, stemType, cachedAnalysis]);
}
