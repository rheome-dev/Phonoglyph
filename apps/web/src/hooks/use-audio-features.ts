import { useState, useEffect, useMemo } from 'react';

export interface AudioFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
}

/**
 * Provides a list of available audio/MIDI features for a given track and stem type.
 * @param trackId The ID of the currently selected track.
 * @param stemType The type of stem currently selected (e.g., 'bass', 'drums', 'vocals', 'other').
 * @returns An array of available feature descriptors relevant to the stem type.
 */
export function useAudioFeatures(trackId?: string, stemType?: string): AudioFeature[] {
  // Use useMemo to compute features without state updates during render
  const features = useMemo(() => {
    if (!trackId) {
      return [];
    }

    // Create features for ALL stem types, not just the selected one
    // This prevents mappings from changing when switching stems
    const allFeatures: AudioFeature[] = [
      // Rhythm features for all stem types
      { id: 'bass-rms-volume', name: 'Bass RMS Volume', description: 'Bass frequency energy level', category: 'rhythm', stemType: 'bass' },
      { id: 'drums-rms-volume', name: 'Drums RMS Volume', description: 'Drum frequency energy level', category: 'rhythm', stemType: 'drums' },
      { id: 'vocals-rms-volume', name: 'Vocals RMS Volume', description: 'Vocal frequency energy level', category: 'rhythm', stemType: 'vocals' },
      { id: 'other-rms-volume', name: 'Other RMS Volume', description: 'Other frequency energy level', category: 'rhythm', stemType: 'other' },
      
      // Pitch features for all stem types
      { id: 'bass-spectral-centroid', name: 'Bass Spectral Centroid', description: 'Bass frequency distribution center', category: 'pitch', stemType: 'bass' },
      { id: 'vocals-spectral-centroid', name: 'Vocals Spectral Centroid', description: 'Vocal frequency distribution center', category: 'pitch', stemType: 'vocals' },
      { id: 'other-spectral-centroid', name: 'Other Spectral Centroid', description: 'Other frequency distribution center', category: 'pitch', stemType: 'other' },
      
      // Intensity features for all stem types
      { id: 'bass-loudness', name: 'Bass Loudness', description: 'Perceived bass loudness', category: 'intensity', stemType: 'bass' },
      { id: 'drums-loudness', name: 'Drums Loudness', description: 'Perceived drum loudness', category: 'intensity', stemType: 'drums' },
      { id: 'vocals-loudness', name: 'Vocals Loudness', description: 'Perceived vocal loudness', category: 'intensity', stemType: 'vocals' },
      { id: 'other-loudness', name: 'Other Loudness', description: 'Perceived other loudness', category: 'intensity', stemType: 'other' },
      
      // Timbre features for all stem types
      { id: 'bass-spectral-rolloff', name: 'Bass Spectral Rolloff', description: 'Bass frequency rolloff point', category: 'timbre', stemType: 'bass' },
      { id: 'vocals-spectral-rolloff', name: 'Vocals Spectral Rolloff', description: 'Vocal frequency rolloff point', category: 'timbre', stemType: 'vocals' },
      { id: 'other-spectral-rolloff', name: 'Other Spectral Rolloff', description: 'Other frequency rolloff point', category: 'timbre', stemType: 'other' },
      
      // Vocal-specific features (from Meyda.js analysis)
      { id: 'vocals-mfcc-1', name: 'Vocals MFCC 1', description: 'First mel-frequency cepstral coefficient for vocal timbre', category: 'timbre', stemType: 'vocals' },
      { id: 'vocals-mfcc-2', name: 'Vocals MFCC 2', description: 'Second mel-frequency cepstral coefficient for vocal timbre', category: 'timbre', stemType: 'vocals' },
      { id: 'vocals-mfcc-3', name: 'Vocals MFCC 3', description: 'Third mel-frequency cepstral coefficient for vocal timbre', category: 'timbre', stemType: 'vocals' },
      { id: 'vocals-perceptual-spread', name: 'Vocals Perceptual Spread', description: 'Perceived spectral spread of vocal frequencies', category: 'timbre', stemType: 'vocals' },
      { id: 'vocals-spectral-flux', name: 'Vocals Spectral Flux', description: 'Rate of spectral change in vocal frequencies', category: 'rhythm', stemType: 'vocals' },
      { id: 'vocals-energy', name: 'Vocals Energy', description: 'Total energy content of vocal frequencies', category: 'intensity', stemType: 'vocals' },
      
      // Additional vocal features for melody analysis
      { id: 'vocals-pitch-height', name: 'Vocals Pitch Height', description: 'Average pitch height of vocal melody', category: 'pitch', stemType: 'vocals' },
      { id: 'vocals-pitch-movement', name: 'Vocals Pitch Movement', description: 'Rate of pitch changes in vocal melody', category: 'pitch', stemType: 'vocals' },
      { id: 'vocals-melody-complexity', name: 'Vocals Melody Complexity', description: 'Complexity of vocal melodic patterns', category: 'pitch', stemType: 'vocals' },
      { id: 'vocals-expression', name: 'Vocals Expression', description: 'Emotional expression in vocal performance', category: 'intensity', stemType: 'vocals' },
      
      // Drum-specific features (from Meyda.js analysis)
      { id: 'drums-zcr', name: 'Drums Zero Crossing Rate', description: 'Rate of sign changes in drum signal', category: 'rhythm', stemType: 'drums' },
      { id: 'drums-spectral-flux', name: 'Drums Spectral Flux', description: 'Rate of spectral change in drum frequencies', category: 'rhythm', stemType: 'drums' },
      { id: 'drums-beat-intensity', name: 'Drums Beat Intensity', description: 'Intensity of detected drum beats', category: 'rhythm', stemType: 'drums' },
      { id: 'drums-rhythm-pattern', name: 'Drums Rhythm Pattern', description: 'Complexity of drum rhythm patterns', category: 'rhythm', stemType: 'drums' },
      { id: 'drums-attack-time', name: 'Drums Attack Time', description: 'Attack characteristics of drum hits', category: 'intensity', stemType: 'drums' },
      
      // Bass-specific features (from Meyda.js analysis)
      { id: 'bass-chroma-vector', name: 'Bass Chroma Vector', description: 'Harmonic content of bass frequencies', category: 'pitch', stemType: 'bass' },
      { id: 'bass-harmonic-content', name: 'Bass Harmonic Content', description: 'Harmonic richness of bass frequencies', category: 'timbre', stemType: 'bass' },
      { id: 'bass-sub-bass', name: 'Bass Sub Bass', description: 'Very low frequency bass content', category: 'intensity', stemType: 'bass' },
      { id: 'bass-warmth', name: 'Bass Warmth', description: 'Perceived warmth of bass frequencies', category: 'timbre', stemType: 'bass' },
      
      // Other instruments features
      { id: 'other-harmonic-content', name: 'Other Harmonic Content', description: 'Harmonic richness of other instruments', category: 'timbre', stemType: 'other' },
      { id: 'other-spectral-complexity', name: 'Other Spectral Complexity', description: 'Complexity of other instrument frequencies', category: 'timbre', stemType: 'other' },
      { id: 'other-texture', name: 'Other Texture', description: 'Textural characteristics of other instruments', category: 'timbre', stemType: 'other' },
    ];

    // Filter features by stemType if provided, but keep all features available
    // This prevents mappings from changing when switching stems
    const filteredFeatures = stemType
      ? allFeatures.filter(f => f.stemType === stemType)
      : allFeatures;

    return filteredFeatures;
  }, [trackId, stemType]);

  return features;
} 