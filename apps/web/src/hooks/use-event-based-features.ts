import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEventBasedMapping } from './use-event-based-mapping';

export interface EventBasedFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
  eventType: 'transient' | 'chroma' | 'volume' | 'brightness';
  // Event-specific properties
  isEventBased: true;
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  sensitivity?: number;
}

export interface EventBasedFeatureValue {
  value: number;
  isActive: boolean;
  envelopePhase?: 'attack' | 'decay' | 'sustain' | 'release' | 'off';
  timeFromOnset?: number;
  confidence?: number;
}

/**
 * Provides event-based audio features using MIDI-like events with envelope control.
 * Replaces continuous features with discrete events that have controllable curves.
 * @param trackId The ID of the currently selected track.
 * @param stemType The type of stem currently selected.
 * @param currentTime Current playback time for real-time event detection.
 * @param projectId Project ID for event mapping integration.
 * @returns An array of event-based features with real-time values.
 */
export function useEventBasedFeatures(
  trackId?: string, 
  stemType?: string,
  currentTime: number = 0,
  projectId?: string
): { features: EventBasedFeature[], getFeatureValue: (featureId: string) => EventBasedFeatureValue } {
  
  const { audioEventData, getMappedValue } = useEventBasedMapping({ 
    projectId: projectId || '', 
    autoSync: true 
  });

  // Event-based features that replace continuous features
  const features = useMemo(() => {
    if (!trackId) {
      return [];
    }

    const eventFeatures: EventBasedFeature[] = [
      // 🥁 DRUMS & PERCUSSION - Event-based rhythm features
      { 
        id: 'drums-transient-kick', 
        name: 'Kick Drum Trigger', 
        description: 'Sharp kick drum hits with controllable envelope', 
        category: 'rhythm', 
        stemType: 'drums',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.2 },
        sensitivity: 75
      },
      { 
        id: 'drums-transient-snare', 
        name: 'Snare Drum Trigger', 
        description: 'Snare hits with punchy attack and controlled decay', 
        category: 'rhythm', 
        stemType: 'drums',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.4, release: 0.3 },
        sensitivity: 70
      },
      { 
        id: 'drums-transient-hihat', 
        name: 'Hi-Hat Trigger', 
        description: 'Crisp hi-hat hits with bright attack', 
        category: 'rhythm', 
        stemType: 'drums',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.002, decay: 0.02, sustain: 0.1, release: 0.05 },
        sensitivity: 80
      },
      { 
        id: 'drums-chroma-pitch', 
        name: 'Drum Pitch', 
        description: 'Pitch changes in drum hits (toms, tuned percussion)', 
        category: 'pitch', 
        stemType: 'drums',
        eventType: 'chroma',
        isEventBased: true,
        sensitivity: 50
      },
      
      // 🎸 BASS - Event-based groove features
      { 
        id: 'bass-transient-slap', 
        name: 'Bass Slap', 
        description: 'Slap bass hits with sharp attack and controlled sustain', 
        category: 'rhythm', 
        stemType: 'bass',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.01, decay: 0.08, sustain: 0.6, release: 0.4 },
        sensitivity: 65
      },
      { 
        id: 'bass-transient-pick', 
        name: 'Bass Pick', 
        description: 'Picked bass notes with defined attack', 
        category: 'rhythm', 
        stemType: 'bass',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.7, release: 0.5 },
        sensitivity: 60
      },
      { 
        id: 'bass-chroma-note', 
        name: 'Bass Note', 
        description: 'Bass note changes and harmonic content', 
        category: 'pitch', 
        stemType: 'bass',
        eventType: 'chroma',
        isEventBased: true,
        sensitivity: 40
      },
      
      // 🎹 MELODY & HARMONY - Event-based pitch features
      { 
        id: 'melody-transient-note', 
        name: 'Note Attack', 
        description: 'Melody note attacks with musical envelope', 
        category: 'rhythm', 
        stemType: 'melody',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.6 },
        sensitivity: 55
      },
      { 
        id: 'melody-chroma-harmony', 
        name: 'Harmony Change', 
        description: 'Chord and harmony changes', 
        category: 'pitch', 
        stemType: 'melody',
        eventType: 'chroma',
        isEventBased: true,
        sensitivity: 45
      },
      { 
        id: 'melody-chroma-melody', 
        name: 'Melody Note', 
        description: 'Individual melody note changes', 
        category: 'pitch', 
        stemType: 'melody',
        eventType: 'chroma',
        isEventBased: true,
        sensitivity: 50
      },
      
      // 🎤 VOCALS & LEADS - Event-based performance features
      { 
        id: 'vocals-transient-word', 
        name: 'Word Attack', 
        description: 'Vocal word attacks and consonants', 
        category: 'rhythm', 
        stemType: 'vocals',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.8 },
        sensitivity: 60
      },
      { 
        id: 'vocals-chroma-pitch', 
        name: 'Vocal Pitch', 
        description: 'Vocal pitch changes and melody', 
        category: 'pitch', 
        stemType: 'vocals',
        eventType: 'chroma',
        isEventBased: true,
        sensitivity: 55
      },
      { 
        id: 'vocals-transient-breath', 
        name: 'Breath', 
        description: 'Breath sounds and vocal articulation', 
        category: 'timbre', 
        stemType: 'vocals',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.4 },
        sensitivity: 40
      },
      
      // 🎼 OTHER INSTRUMENTS - Event-based general features
      { 
        id: 'other-transient-hit', 
        name: 'Instrument Hit', 
        description: 'General instrument hits and attacks', 
        category: 'rhythm', 
        stemType: 'other',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.01, decay: 0.08, sustain: 0.6, release: 0.4 },
        sensitivity: 65
      },
      { 
        id: 'other-chroma-note', 
        name: 'Instrument Note', 
        description: 'Instrument note changes and pitch', 
        category: 'pitch', 
        stemType: 'other',
        eventType: 'chroma',
        isEventBased: true,
        sensitivity: 50
      },
      
      // 🎵 MASTER STEM - Event-based mix features
      { 
        id: 'master-transient-impact', 
        name: 'Mix Impact', 
        description: 'Overall mix impacts and energy spikes', 
        category: 'intensity', 
        stemType: 'master',
        eventType: 'transient',
        isEventBased: true,
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.3 },
        sensitivity: 70
      },
      { 
        id: 'master-chroma-harmony', 
        name: 'Mix Harmony', 
        description: 'Overall harmonic changes in the mix', 
        category: 'pitch', 
        stemType: 'master',
        eventType: 'chroma',
        isEventBased: true,
        sensitivity: 45
      },
    ];

    // Filter by stem type if provided
    const filteredFeatures = stemType
      ? eventFeatures.filter(f => f.stemType === stemType)
      : eventFeatures;

    return filteredFeatures;
  }, [trackId, stemType]);

  // Get real-time value for a specific feature with envelope calculation
  const getFeatureValue = useCallback((featureId: string): EventBasedFeatureValue => {
    const feature = features.find(f => f.id === featureId);
    if (!feature || !audioEventData) {
      return { value: 0, isActive: false };
    }

    // Get the base mapped value
    const baseValue = getMappedValue(feature.eventType, currentTime);
    
    if (feature.eventType === 'transient') {
      return getTransientValueWithEnvelope(feature, audioEventData, currentTime);
    } else if (feature.eventType === 'chroma') {
      return getChromaValue(feature, audioEventData, currentTime);
    } else {
      // For volume and brightness, use continuous values
      return { 
        value: baseValue, 
        isActive: baseValue > 0.1 
      };
    }
  }, [features, audioEventData, currentTime, getMappedValue]);

  return { features, getFeatureValue };
}

// Helper function to calculate transient value with envelope
function getTransientValueWithEnvelope(
  feature: EventBasedFeature,
  audioEventData: any,
  currentTime: number
): EventBasedFeatureValue {
  const transients = audioEventData.transients || [];
  
  // Find the most recent transient that's still active
  let activeTransient = null;
  let timeFromOnset = 0;
  
  for (const transient of transients) {
    const timeDiff = currentTime - transient.timestamp;
    if (timeDiff >= 0 && timeDiff < transient.duration) {
      if (!activeTransient || timeDiff < timeFromOnset) {
        activeTransient = transient;
        timeFromOnset = timeDiff;
      }
    }
  }
  
  if (!activeTransient || !feature.envelope) {
    return { value: 0, isActive: false };
  }
  
  // Calculate envelope value
  const { attack, decay, sustain, release } = feature.envelope;
  const totalDuration = attack + decay + release;
  
  let envelopeValue = 0;
  let envelopePhase: 'attack' | 'decay' | 'sustain' | 'release' | 'off' = 'off';
  
  if (timeFromOnset < attack) {
    // Attack phase
    envelopeValue = timeFromOnset / attack;
    envelopePhase = 'attack';
  } else if (timeFromOnset < attack + decay) {
    // Decay phase
    const decayProgress = (timeFromOnset - attack) / decay;
    envelopeValue = 1 - decayProgress * (1 - sustain);
    envelopePhase = 'decay';
  } else if (timeFromOnset < attack + decay + release) {
    // Release phase
    const releaseProgress = (timeFromOnset - attack - decay) / release;
    envelopeValue = sustain * (1 - releaseProgress);
    envelopePhase = 'release';
  } else {
    // Past envelope
    envelopeValue = 0;
    envelopePhase = 'off';
  }
  
  // Apply sensitivity scaling
  const sensitivity = feature.sensitivity || 50;
  const sensitivityScale = sensitivity / 100;
  const finalValue = envelopeValue * sensitivityScale * activeTransient.amplitude;
  
  return {
    value: Math.max(0, Math.min(1, finalValue)),
    isActive: envelopeValue > 0.01,
    envelopePhase,
    timeFromOnset,
    confidence: activeTransient.confidence
  };
}

// Helper function to calculate chroma value
function getChromaValue(
  feature: EventBasedFeature,
  audioEventData: any,
  currentTime: number
): EventBasedFeatureValue {
  const chromaEvents = audioEventData.chroma || [];
  
  // Find the most recent chroma event
  let activeChroma = null;
  
  for (let i = chromaEvents.length - 1; i >= 0; i--) {
    if (chromaEvents[i].timestamp <= currentTime) {
      activeChroma = chromaEvents[i];
      break;
    }
  }
  
  if (!activeChroma) {
    return { value: 0, isActive: false };
  }
  
  // Use the dominant note value or overall confidence
  const value = activeChroma.chroma[activeChroma.rootNote] || activeChroma.confidence;
  
  // Apply sensitivity scaling
  const sensitivity = feature.sensitivity || 50;
  const sensitivityScale = sensitivity / 100;
  const finalValue = value * sensitivityScale;
  
  return {
    value: Math.max(0, Math.min(1, finalValue)),
    isActive: finalValue > 0.1,
    confidence: activeChroma.confidence
  };
} 