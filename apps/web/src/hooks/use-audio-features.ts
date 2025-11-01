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
      // Use a Set to find unique transient types present in the data
      const foundTypes = new Set(analysisData.transients.map((t: any) => t.type));

      // Always add the "Impact (All)" feature
      features.push({
        id: `${stemType}-impact-all`,
        name: 'Impact (All)',
        description: 'The intensity of any detected transient or onset.',
        category: 'rhythm',
        stemType: stemType,
        isEvent: true
      });

      // **FIX: Conditionally add features based on what was ACTUALLY found**
      if (foundTypes.has('kick')) {
        features.push({
          id: `${stemType}-impact-kick`,
          name: 'Kick Impact',
          description: 'Intensity of detected low-frequency onsets (kicks).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
      if (foundTypes.has('snare')) {
        features.push({
          id: `${stemType}-impact-snare`,
          name: 'Snare Impact',
          description: 'Intensity of detected mid-frequency onsets (snares).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
      if (foundTypes.has('hat')) {
        features.push({
          id: `${stemType}-impact-hat`,
          name: 'Hat Impact',
          description: 'Intensity of detected high-frequency onsets (hats/cymbals).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
      // **ADDITION: Add a fallback for "generic" transients**
      if (foundTypes.has('generic')) {
        features.push({
          id: `${stemType}-impact-generic`,
          name: 'Generic Impact',
          description: 'Intensity of unclassified onsets.',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
    }

    return features;
  }, [trackId, stemType, cachedAnalysis]);
}
