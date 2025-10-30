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
    if (!trackId || !cachedAnalysis || cachedAnalysis.length === 0) return [];
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === trackId);
    if (!analysis || !analysis.analysisData) return [];

    const features: AudioFeature[] = [];

    // Core features
    if (analysis.analysisData.rms) {
      features.push({ id: `${stemType}-volume`, name: 'Volume', description: 'Loudness over time from RMS.', category: 'intensity', stemType });
    }
    if (analysis.analysisData.chroma) {
      features.push({ id: `${stemType}-pitch`, name: 'Pitch', description: 'Pitch estimate derived from chroma.', category: 'pitch', stemType });
    }

    // Transient features
    if (analysis.analysisData.transients && analysis.analysisData.transients.length > 0) {
      features.push({ id: `${stemType}-impact-all`, name: 'Impact (All)', description: 'All transient onsets with intensity.', category: 'rhythm', stemType, isEvent: true });
      if (analysis.analysisData.transients.some((t: any) => t.type === 'kick')) features.push({ id: `${stemType}-impact-kick`, name: 'Kick Impact', description: 'Low-frequency onsets (kicks).', category: 'rhythm', stemType, isEvent: true });
      if (analysis.analysisData.transients.some((t: any) => t.type === 'snare')) features.push({ id: `${stemType}-impact-snare`, name: 'Snare Impact', description: 'Mid-frequency onsets (snares).', category: 'rhythm', stemType, isEvent: true });
      if (analysis.analysisData.transients.some((t: any) => t.type === 'hat')) features.push({ id: `${stemType}-impact-hat`, name: 'Hat Impact', description: 'High-frequency onsets (hats/cymbals).', category: 'rhythm', stemType, isEvent: true });
    }

    // Explicitly omit BPM feature node per request

    return features;
  }, [trackId, stemType, cachedAnalysis]);
}


