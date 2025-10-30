import React, { useMemo } from 'react';

export interface AudioFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
  isEvent?: boolean; // Added for transient features
}

/**
 * Provides a curated list of available audio features for the MappingSourcesPanel.
 * This hook acts as a filter on the full analysis data.
 * @param trackId The ID of the currently selected track.
 * @param stemType The type of stem currently selected.
 * @param cachedAnalysis The full analysis data for all stems.
 * @returns A memoized array of feature descriptors relevant to the stem type.
 */
export function useAudioFeatures(trackId?: string, stemType?: string, cachedAnalysis?: any[]): AudioFeature[] {
  const features = useMemo(() => {
    if (!trackId || !cachedAnalysis || cachedAnalysis.length === 0) {
      return [];
    }
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === trackId);
    if (!analysis) {
      return [];
    }

    const availableFeatures: AudioFeature[] = [];

    // INTENSITY
    if (analysis.analysisData?.rms) {
      availableFeatures.push({
        id: `${stemType}-volume`,
        name: 'Volume',
        description: 'Represents the loudness or intensity of the audio.',
        category: 'intensity',
        stemType: stemType,
      });
    }

    // PITCH
    if (analysis.analysisData?.chroma) {
      availableFeatures.push({
        id: `${stemType}-pitch`,
        name: 'Pitch',
        description: 'Represents the musical pitch center of the audio.',
        category: 'pitch',
        stemType: stemType,
      });
    }

    // RHYTHM (TRANSIENTS)
    if (analysis.analysisData?.transients && analysis.analysisData.transients.length > 0) {
      availableFeatures.push({
        id: `${stemType}-impact-all`,
        name: 'Impact (All)',
        description: 'Triggers on any detected rhythmic event.',
        category: 'rhythm',
        stemType: stemType,
        isEvent: true,
      });

      if (analysis.analysisData.transients.some((t: any) => t.type === 'kick')) {
        availableFeatures.push({
          id: `${stemType}-impact-kick`,
          name: 'Kick Impact',
          description: 'Triggers only on low-frequency kick drum hits.',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true,
        });
      }
      if (analysis.analysisData.transients.some((t: any) => t.type === 'snare')) {
        availableFeatures.push({
          id: `${stemType}-impact-snare`,
          name: 'Snare Impact',
          description: 'Triggers only on mid-frequency snare drum hits.',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true,
        });
      }
      if (analysis.analysisData.transients.some((t: any) => t.type === 'hat')) {
        availableFeatures.push({
          id: `${stemType}-impact-hat`,
          name: 'Hat Impact',
          description: 'Triggers only on high-frequency hi-hat or cymbal hits.',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true,
        });
      }
    }

    // BPM (constant)
    const bpm = analysis.bpm || analysis.metadata?.bpm || analysis.analysisData?.bpm;
    if (bpm) {
      availableFeatures.push({
        id: `${stemType}-bpm`,
        name: 'BPM',
        description: `The detected tempo of the track: ${Math.round(bpm)} BPM. This is a constant value.`,
        category: 'rhythm',
        stemType: stemType,
      });
    }

    return availableFeatures;
  }, [trackId, stemType, cachedAnalysis]);

  return features;
}