import { useState, useEffect, useMemo } from 'react';

export interface AudioFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
}

/**
 * Provides a list of available audio features using intuitive musical language.
 * Focuses on the 3-4 most crucial features per stem type for visual mapping.
 * @param trackId The ID of the currently selected track.
 * @param stemType The type of stem currently selected (e.g., 'bass', 'drums', 'vocals', 'melody').
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
      // 🥁 DRUMS & PERCUSSION - Focus on rhythm and impact
      { id: 'drums-rms', name: 'RMS Energy', description: 'Raw audio energy and intensity of drum hits', category: 'intensity', stemType: 'drums' },
      { id: 'drums-impact', name: 'Impact', description: 'Sharp, punchy energy for every drum hit', category: 'rhythm', stemType: 'drums' },
      { id: 'drums-brightness', name: 'Brightness', description: 'Tone of the drum - bright hi-hats vs deep kicks', category: 'pitch', stemType: 'drums' },
      { id: 'drums-harshness', name: 'Harshness', description: 'Sharpness of snare cracks and rimshots', category: 'intensity', stemType: 'drums' },
      { id: 'drums-volume', name: 'Volume', description: 'Overall drum energy and power', category: 'rhythm', stemType: 'drums' },
      { id: 'drums-spectral-rolloff', name: 'Spectral Rolloff', description: 'High-frequency content and brightness', category: 'pitch', stemType: 'drums' },
      { id: 'drums-spectral-flatness', name: 'Spectral Flatness', description: 'Tone vs noise ratio in drum sounds', category: 'timbre', stemType: 'drums' },
      { id: 'drums-zcr', name: 'Zero Crossing Rate', description: 'Percussive attack and transient content', category: 'rhythm', stemType: 'drums' },
      
      // 🎸 BASS - Focus on groove and texture
      { id: 'bass-rms', name: 'RMS Energy', description: 'Raw audio energy and intensity of bass notes', category: 'intensity', stemType: 'bass' },
      { id: 'bass-volume', name: 'Volume', description: 'Sustained power of the bassline foundation', category: 'rhythm', stemType: 'bass' },
      { id: 'bass-brightness', name: 'Brightness', description: 'Filter changes - bright vs dull bass tones', category: 'pitch', stemType: 'bass' },
      { id: 'bass-noisiness', name: 'Noisiness', description: 'Clean sub-bass vs gritty distorted bass', category: 'timbre', stemType: 'bass' },
      { id: 'bass-warmth', name: 'Warmth', description: 'Perceived warmth and richness of bass', category: 'timbre', stemType: 'bass' },
      { id: 'bass-spectral-rolloff', name: 'Spectral Rolloff', description: 'High-frequency content and presence', category: 'pitch', stemType: 'bass' },
      { id: 'bass-spectral-flatness', name: 'Spectral Flatness', description: 'Harmonic richness vs noise', category: 'timbre', stemType: 'bass' },
      { id: 'bass-perceptual-spread', name: 'Perceptual Spread', description: 'Spectral width and stereo image', category: 'timbre', stemType: 'bass' },
      
      // 🎹 MELODY & HARMONY - Focus on emotional character and pitch
      { id: 'melody-rms', name: 'RMS Energy', description: 'Raw audio energy and intensity of melody notes', category: 'intensity', stemType: 'melody' },
      { id: 'melody-volume', name: 'Volume', description: 'Swell and decay of chords and melodies', category: 'rhythm', stemType: 'melody' },
      { id: 'melody-brightness', name: 'Brightness', description: 'Mood - bright happy vs dark moody passages', category: 'pitch', stemType: 'melody' },
      { id: 'melody-pitch-height', name: 'Pitch Height', description: 'Average pitch of the melody line', category: 'pitch', stemType: 'melody' },
      { id: 'melody-harmonic-content', name: 'Harmonic Content', description: 'Richness and complexity of harmonies', category: 'timbre', stemType: 'melody' },
      { id: 'melody-spectral-rolloff', name: 'Spectral Rolloff', description: 'High-frequency harmonics and overtones', category: 'pitch', stemType: 'melody' },
      { id: 'melody-spectral-flatness', name: 'Spectral Flatness', description: 'Tone quality and harmonic richness', category: 'timbre', stemType: 'melody' },
      { id: 'melody-perceptual-sharpness', name: 'Perceptual Sharpness', description: 'Perceived sharpness and clarity', category: 'timbre', stemType: 'melody' },
      
      // 🎤 VOCALS & LEADS - Focus on human performance and dynamics
      { id: 'vocals-rms', name: 'RMS Energy', description: 'Raw audio energy and intensity of vocal performance', category: 'intensity', stemType: 'vocals' },
      { id: 'vocals-loudness', name: 'Loudness', description: 'Natural dynamics of the human voice', category: 'intensity', stemType: 'vocals' },
      { id: 'vocals-pitch-height', name: 'Pitch Height', description: 'Average pitch of the vocal melody', category: 'pitch', stemType: 'vocals' },
      { id: 'vocals-noisiness', name: 'Noisiness', description: 'Clean singing vs breathy or raspy vocals', category: 'timbre', stemType: 'vocals' },
      { id: 'vocals-expression', name: 'Expression', description: 'Emotional intensity of vocal performance', category: 'intensity', stemType: 'vocals' },
      { id: 'vocals-spectral-rolloff', name: 'Spectral Rolloff', description: 'High-frequency harmonics and sibilance', category: 'pitch', stemType: 'vocals' },
      { id: 'vocals-spectral-flatness', name: 'Spectral Flatness', description: 'Tone quality and breathiness', category: 'timbre', stemType: 'vocals' },
      { id: 'vocals-perceptual-sharpness', name: 'Perceptual Sharpness', description: 'Clarity and presence of vocals', category: 'timbre', stemType: 'vocals' },
      
      // 🎼 OTHER INSTRUMENTS - Focus on general musical characteristics
      { id: 'other-rms', name: 'RMS Energy', description: 'Raw audio energy and intensity of the instrument', category: 'intensity', stemType: 'other' },
      { id: 'other-volume', name: 'Volume', description: 'Overall energy and power of the instrument', category: 'rhythm', stemType: 'other' },
      { id: 'other-brightness', name: 'Brightness', description: 'Tone and mood of the instrument', category: 'pitch', stemType: 'other' },
      { id: 'other-harmonic-content', name: 'Harmonic Content', description: 'Richness and complexity of the sound', category: 'timbre', stemType: 'other' },
      { id: 'other-texture', name: 'Texture', description: 'Textural characteristics and timbre', category: 'timbre', stemType: 'other' },
      { id: 'other-spectral-rolloff', name: 'Spectral Rolloff', description: 'High-frequency content and brightness', category: 'pitch', stemType: 'other' },
      { id: 'other-spectral-flatness', name: 'Spectral Flatness', description: 'Tone vs noise characteristics', category: 'timbre', stemType: 'other' },
      { id: 'other-perceptual-spread', name: 'Perceptual Spread', description: 'Spectral width and stereo image', category: 'timbre', stemType: 'other' },
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