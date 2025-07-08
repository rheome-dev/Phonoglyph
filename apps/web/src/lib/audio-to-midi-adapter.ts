import { MIDIData } from '@/types/midi';
import { LiveMIDIData } from '@/types/visualizer';
import { StemType, VisualizationPreset } from '@/types/stem-visualization';

export interface AudioFeatures {
  // Rhythm features
  rms: number;
  zcr: number; // Zero crossing rate
  spectralCentroid: number;
  beats: { time: number; confidence: number }[];
  
  // Pitch features
  fundamentalFreq: number;
  spectralRolloff: number;
  mfcc: number[]; // Mel-frequency cepstral coefficients
  
  // Energy/intensity features
  loudness: number;
  spectralSlope: number;
}

export interface MIDIEvent {
  pitch: number;
  velocity: number;
  start: number;
  duration: number;
  track: string;
  channel?: number;
}

export interface VisualizationParameters {
  scale: number;
  rotation: number;
  color: [number, number, number];
  emission: number;
  position: [number, number, number];
  height: number;
  hue: number;
  brightness: number;
  complexity: number;
  size: number;
  opacity: number;
  speed: number;
  count: number;
}

export interface AudioFeatureMapping {
  // Maps audio features to MIDI-like events
  stemToMidiAdapter: {
    // Rhythm features to MIDI-like events
    rhythmToMidiEvents(
      rhythmFeatures: {
        rms: number;
        zcr: number;
        spectralCentroid: number;
        beats: { time: number; confidence: number }[];
      },
      stemType: StemType
    ): MIDIEvent[];

    // Pitch features to MIDI-like events  
    pitchToMidiEvents(
      pitchFeatures: {
        fundamentalFreq: number;
        spectralRolloff: number;
        mfcc: number[];
      },
      stemType: StemType
    ): MIDIEvent[];

    // Energy/intensity to MIDI velocity
    intensityToVelocity(
      energyFeatures: {
        rms: number;
        spectralSlope: number;
        loudness: number;
      }
    ): number;
  };

  // Visualization parameter mapping
  visualizationAdapter: {
    // Map stem features to existing visualization parameters
    mapStemFeatures(
      stemFeatures: Record<StemType, AudioFeatures>,
      currentSettings: Record<string, number>
    ): VisualizationParameters;

    // Blend multiple stem influences
    blendStemEffects(
      stemEffects: VisualizationParameters[],
      weights: number[]
    ): VisualizationParameters;
  };
}

export interface VisualizationBridge {
  // Bridge between audio analysis and existing visualizer
  audioToVisualization: {
    updateFromAudioFeatures(
      features: Record<StemType, AudioFeatures>,
      currentTime: number
    ): void;

    // Compatibility layer for existing MIDI visualizer
    generateCompatibleMidiData(
      audioFeatures: AudioFeatures[],
      duration: number
    ): MIDIData;
  };
}

export class AudioToMidiAdapter implements AudioFeatureMapping {
  private pitchMapping: Map<StemType, { min: number; max: number }> = new Map([
    ['drums', { min: 36, max: 81 }],    // C2 to A5 (typical drum range)
    ['bass', { min: 28, max: 55 }],     // E1 to G3 (bass range)
    ['vocals', { min: 60, max: 84 }],   // C4 to C6 (vocal range)
    ['other', { min: 48, max: 96 }]     // C3 to C7 (general range)
  ]);

  private trackMapping: Map<StemType, string> = new Map([
    ['drums', 'track-drums'],
    ['bass', 'track-bass'], 
    ['vocals', 'track-vocals'],
    ['other', 'track-other']
  ]);

  stemToMidiAdapter = {
    rhythmToMidiEvents: (
      rhythmFeatures: {
        rms: number;
        zcr: number;
        spectralCentroid: number;
        beats: { time: number; confidence: number }[];
      },
      stemType: StemType
    ): MIDIEvent[] => {
      const events: MIDIEvent[] = [];
      const pitchRange = this.pitchMapping.get(stemType) || { min: 60, max: 72 };
      const trackId = this.trackMapping.get(stemType) || 'track-default';

      // Convert beats to MIDI note events
      rhythmFeatures.beats.forEach((beat, index) => {
        // Map spectral centroid to pitch within the stem's range
        const normalizedCentroid = Math.min(Math.max(rhythmFeatures.spectralCentroid / 4000, 0), 1);
        const pitch = pitchRange.min + Math.floor(normalizedCentroid * (pitchRange.max - pitchRange.min));
        
        // Map RMS and beat confidence to velocity
        const velocity = Math.min(Math.max(
          Math.floor((rhythmFeatures.rms * beat.confidence) * 127), 
          1
        ), 127);
        
        // Duration based on zero crossing rate (higher ZCR = shorter notes)
        const duration = Math.max(0.1, 0.5 - (rhythmFeatures.zcr * 0.3));

        events.push({
          pitch,
          velocity,
          start: beat.time,
          duration,
          track: trackId
        });
      });

      return events;
    },

    pitchToMidiEvents: (
      pitchFeatures: {
        fundamentalFreq: number;
        spectralRolloff: number;
        mfcc: number[];
      },
      stemType: StemType
    ): MIDIEvent[] => {
      const events: MIDIEvent[] = [];
      const trackId = this.trackMapping.get(stemType) || 'track-default';

      if (pitchFeatures.fundamentalFreq > 0) {
        // Convert frequency to MIDI note number
        const midiNote = Math.round(69 + 12 * Math.log2(pitchFeatures.fundamentalFreq / 440));
        
        // Clamp to valid MIDI range
        const pitch = Math.min(Math.max(midiNote, 0), 127);
        
        // Use MFCC features to determine velocity and timbre
        const mfccMagnitude = pitchFeatures.mfcc.slice(0, 5).reduce((sum, coeff) => sum + Math.abs(coeff), 0);
        const velocity = Math.min(Math.max(Math.floor(mfccMagnitude * 20), 1), 127);
        
        // Duration based on spectral rolloff (brighter sounds = shorter duration)
        const normalizedRolloff = Math.min(pitchFeatures.spectralRolloff / 8000, 1);
        const duration = 0.2 + (1 - normalizedRolloff) * 0.8;

        events.push({
          pitch,
          velocity,
          start: 0, // Will be set by caller based on timing
          duration,
          track: trackId
        });
      }

      return events;
    },

    intensityToVelocity: (
      energyFeatures: {
        rms: number;
        spectralSlope: number;
        loudness: number;
      }
    ): number => {
      // Combine multiple energy measures for more accurate velocity
      const rmsContribution = energyFeatures.rms * 0.4;
      const loudnessContribution = energyFeatures.loudness * 0.5;
      const slopeContribution = Math.abs(energyFeatures.spectralSlope) * 0.1;
      
      const combinedIntensity = rmsContribution + loudnessContribution + slopeContribution;
      
      // Convert to MIDI velocity range (1-127)
      return Math.min(Math.max(Math.floor(combinedIntensity * 127), 1), 127);
    }
  };

  visualizationAdapter = {
    mapStemFeatures: (
      stemFeatures: Record<StemType, AudioFeatures>,
      currentSettings: Record<string, number>
    ): VisualizationParameters => {
      const baseParams: VisualizationParameters = {
        scale: currentSettings.globalScale || 1.0,
        rotation: currentSettings.rotationSpeed || 0.0,
        color: [1.0, 1.0, 1.0],
        emission: currentSettings.emissionIntensity || 1.0,
        position: [0, 0, 0],
        height: currentSettings.heightScale || 1.0,
        hue: currentSettings.hueRotation || 0.0,
        brightness: currentSettings.brightness || 1.0,
        complexity: currentSettings.complexity || 0.5,
        size: currentSettings.particleSize || 1.0,
        opacity: currentSettings.opacity || 1.0,
        speed: currentSettings.animationSpeed || 1.0,
        count: currentSettings.particleCount || 5000
      };

      // Map each stem to visualization parameters
      (Object.keys(stemFeatures) as StemType[]).forEach((stemType) => {
        const features = stemFeatures[stemType];
        const stem = stemType;
        
        switch (stem) {
          case 'drums':
            // Drums affect scale and rhythm-based parameters
            baseParams.scale *= (1 + features.rms * 0.5);
            baseParams.speed *= (1 + features.zcr * 0.3);
            baseParams.color[0] = Math.min(1.0, 0.8 + features.rms * 0.4); // Red channel
            break;
            
          case 'bass':
            // Bass affects height and low-frequency visualization
            const bassHeight = Math.log(Math.max(features.fundamentalFreq, 20)) / Math.log(200);
            baseParams.height *= (0.5 + bassHeight * 0.8);
            baseParams.size *= (1 + features.loudness * 0.3);
            baseParams.color[2] = Math.min(1.0, 0.6 + features.rms * 0.4); // Blue channel
            break;
            
          case 'vocals':
            // Vocals affect brightness and color
            const vocalPitch = Math.min(features.fundamentalFreq / 1000, 1.0);
            baseParams.brightness *= (0.7 + vocalPitch * 0.6);
            baseParams.hue += features.spectralCentroid / 4000 * 60; // Hue shift
            baseParams.color[1] = Math.min(1.0, 0.7 + features.rms * 0.3); // Green channel
            break;
            
          case 'other':
            // Other instruments affect complexity and particle count
            baseParams.complexity = Math.min(1.0, features.spectralCentroid / 3000);
            baseParams.count *= (0.8 + features.loudness * 0.4);
            baseParams.opacity *= (0.8 + features.rms * 0.2);
            break;
        }
      });

      return baseParams;
    },

    blendStemEffects: (
      stemEffects: VisualizationParameters[],
      weights: number[]
    ): VisualizationParameters => {
      if (stemEffects.length === 0) {
        throw new Error('No stem effects provided for blending');
      }

      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      if (totalWeight === 0) {
        return stemEffects[0];
      }

      const blended: VisualizationParameters = {
        scale: 0,
        rotation: 0,
        color: [0, 0, 0],
        emission: 0,
        position: [0, 0, 0],
        height: 0,
        hue: 0,
        brightness: 0,
        complexity: 0,
        size: 0,
        opacity: 0,
        speed: 0,
        count: 0
      };

      // Weighted average of all parameters
      stemEffects.forEach((effect, index) => {
        const weight = weights[index] / totalWeight;
        
        blended.scale += effect.scale * weight;
        blended.rotation += effect.rotation * weight;
        blended.color[0] += effect.color[0] * weight;
        blended.color[1] += effect.color[1] * weight;
        blended.color[2] += effect.color[2] * weight;
        blended.emission += effect.emission * weight;
        blended.position[0] += effect.position[0] * weight;
        blended.position[1] += effect.position[1] * weight;
        blended.position[2] += effect.position[2] * weight;
        blended.height += effect.height * weight;
        blended.hue += effect.hue * weight;
        blended.brightness += effect.brightness * weight;
        blended.complexity += effect.complexity * weight;
        blended.size += effect.size * weight;
        blended.opacity += effect.opacity * weight;
        blended.speed += effect.speed * weight;
        blended.count += effect.count * weight;
      });

      return blended;
    }
  };
}

export class VisualizationBridgeImpl implements VisualizationBridge {
  private adapter: AudioToMidiAdapter;
  private currentTime: number = 0;

  constructor() {
    this.adapter = new AudioToMidiAdapter();
  }

  private midiNoteToName(midiNote: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }

  audioToVisualization = {
    updateFromAudioFeatures: (
      features: Record<StemType, AudioFeatures>,
      currentTime: number
    ): void => {
      this.currentTime = currentTime;
      
      // Convert audio features to visualization parameters
      const visualParams = this.adapter.visualizationAdapter.mapStemFeatures(
        features,
        {} // Empty settings for now, will be populated from actual settings
      );
      
      // TODO: Apply visualization parameters to the visualizer
      // This will be implemented when integrating with ThreeVisualizer
    },

    generateCompatibleMidiData: (
      audioFeatures: AudioFeatures[],
      duration: number
    ): MIDIData => {
      const tracks: MIDIData['tracks'] = [];
      const stemColors = {
        drums: '#ff6b6b',
        bass: '#4ecdc4', 
        vocals: '#45b7d1',
        other: '#96ceb4'
      };

      // Process each audio feature set (representing different time segments)
      audioFeatures.forEach((features, index) => {
        const timeOffset = (index / audioFeatures.length) * duration;
        const stemTypes: StemType[] = ['drums', 'bass', 'vocals', 'other'];
        
        stemTypes.forEach((stemType, stemIndex) => {
          const trackId = `track-${stemType}`;
          let track = tracks.find(t => t.id === trackId);
          
          if (!track) {
            track = {
              id: trackId,
              name: stemType.charAt(0).toUpperCase() + stemType.slice(1),
              instrument: stemType === 'drums' ? 'Drum Kit' : stemType === 'bass' ? 'Bass' : stemType === 'vocals' ? 'Voice' : 'Synth',
              channel: stemIndex,
              color: stemColors[stemType],
              notes: [],
              visible: true
            };
            tracks.push(track);
          }

          // Generate MIDI events for rhythm features
          const rhythmEvents = this.adapter.stemToMidiAdapter.rhythmToMidiEvents(
            {
              rms: features.rms,
              zcr: features.zcr,
              spectralCentroid: features.spectralCentroid,
              beats: [{ time: timeOffset, confidence: 0.8 }] // Simplified beat detection
            },
            stemType
          );

          // Generate MIDI events for pitch features
          const pitchEvents = this.adapter.stemToMidiAdapter.pitchToMidiEvents(
            {
              fundamentalFreq: features.fundamentalFreq,
              spectralRolloff: features.spectralRolloff,
              mfcc: features.mfcc
            },
            stemType
          );

          // Add timing to pitch events and convert to MIDINote format
          const allEvents = [...rhythmEvents, ...pitchEvents.map(event => ({...event, start: timeOffset}))];
          
          allEvents.forEach((event, eventIndex) => {
            track!.notes.push({
              id: `${trackId}-${index}-${eventIndex}`,
              start: event.start,
              duration: event.duration,
              pitch: event.pitch,
              velocity: event.velocity,
              track: trackId,
              noteName: this.midiNoteToName(event.pitch)
            });
          });
        });
      });

      return {
        file: {
          name: 'Generated from Audio',
          size: 0,
          duration,
          ticksPerQuarter: 480,
          timeSignature: [4, 4],
          keySignature: 'C major'
        },
        tracks,
        tempoChanges: [{
          tick: 0,
          bpm: 120,
          microsecondsPerQuarter: 500000
        }]
      };
    }
  };
}