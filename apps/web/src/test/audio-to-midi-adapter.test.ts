import { describe, it, expect, beforeEach } from 'vitest';
import { AudioToMidiAdapter, VisualizationBridgeImpl, AudioFeatures } from '@/lib/audio-to-midi-adapter';
import { StemType } from '@/types/stem-visualization';

describe('AudioToMidiAdapter', () => {
  let adapter: AudioToMidiAdapter;

  beforeEach(() => {
    adapter = new AudioToMidiAdapter();
  });

  describe('rhythmToMidiEvents', () => {
    it('should convert rhythm features to MIDI events for drums', () => {
      const rhythmFeatures = {
        rms: 0.8,
        zcr: 0.3,
        spectralCentroid: 2000,
        beats: [
          { time: 0.0, confidence: 0.9 },
          { time: 0.5, confidence: 0.7 }
        ]
      };

      const events = adapter.stemToMidiAdapter.rhythmToMidiEvents(rhythmFeatures, 'drums');

      expect(events).toHaveLength(2);
      expect(events[0].pitch).toBeGreaterThanOrEqual(36);
      expect(events[0].pitch).toBeLessThanOrEqual(81);
      expect(events[0].velocity).toBeGreaterThan(0);
      expect(events[0].velocity).toBeLessThanOrEqual(127);
      expect(events[0].track).toBe('track-drums');
    });

    it('should handle empty beats array', () => {
      const rhythmFeatures = {
        rms: 0.5,
        zcr: 0.2,
        spectralCentroid: 1500,
        beats: []
      };

      const events = adapter.stemToMidiAdapter.rhythmToMidiEvents(rhythmFeatures, 'bass');
      expect(events).toHaveLength(0);
    });
  });

  describe('pitchToMidiEvents', () => {
    it('should convert pitch features to MIDI events', () => {
      const pitchFeatures = {
        fundamentalFreq: 440, // A4
        spectralRolloff: 4000,
        mfcc: [1.2, -0.5, 0.8, 0.3, -0.2, 0.1]
      };

      const events = adapter.stemToMidiAdapter.pitchToMidiEvents(pitchFeatures, 'vocals');

      expect(events).toHaveLength(1);
      expect(events[0].pitch).toBe(69); // A4 = MIDI note 69
      expect(events[0].velocity).toBeGreaterThan(0);
      expect(events[0].track).toBe('track-vocals');
    });

    it('should handle zero fundamental frequency', () => {
      const pitchFeatures = {
        fundamentalFreq: 0,
        spectralRolloff: 2000,
        mfcc: [0.5, 0.3, 0.1]
      };

      const events = adapter.stemToMidiAdapter.pitchToMidiEvents(pitchFeatures, 'other');
      expect(events).toHaveLength(0);
    });
  });

  describe('intensityToVelocity', () => {
    it('should convert energy features to MIDI velocity', () => {
      const energyFeatures = {
        rms: 0.8,
        spectralSlope: 0.5,
        loudness: 0.9
      };

      const velocity = adapter.stemToMidiAdapter.intensityToVelocity(energyFeatures);

      expect(velocity).toBeGreaterThan(0);
      expect(velocity).toBeLessThanOrEqual(127);
      expect(velocity).toBeGreaterThan(50); // Should be relatively high for these values
    });

    it('should handle low energy features', () => {
      const energyFeatures = {
        rms: 0.1,
        spectralSlope: 0.05,
        loudness: 0.15
      };

      const velocity = adapter.stemToMidiAdapter.intensityToVelocity(energyFeatures);

      expect(velocity).toBeGreaterThanOrEqual(1);
      expect(velocity).toBeLessThan(50); // Should be relatively low
    });
  });

  describe('mapStemFeatures', () => {
    it('should map stem features to visualization parameters', () => {
      const stemFeatures: Record<StemType, AudioFeatures> = {
        drums: {
          rms: 0.8,
          zcr: 0.4,
          spectralCentroid: 2500,
          beats: [{ time: 0, confidence: 0.9 }],
          fundamentalFreq: 100,
          spectralRolloff: 3000,
          mfcc: [1.0, 0.5, 0.3],
          loudness: 0.7,
          spectralSlope: 0.2
        },
        bass: {
          rms: 0.6,
          zcr: 0.2,
          spectralCentroid: 800,
          beats: [{ time: 0, confidence: 0.7 }],
          fundamentalFreq: 80,
          spectralRolloff: 1500,
          mfcc: [0.8, 0.4, 0.2],
          loudness: 0.8,
          spectralSlope: 0.1
        },
        vocals: {
          rms: 0.5,
          zcr: 0.3,
          spectralCentroid: 1500,
          beats: [{ time: 0, confidence: 0.5 }],
          fundamentalFreq: 220,
          spectralRolloff: 2000,
          mfcc: [0.6, 0.3, 0.1],
          loudness: 0.6,
          spectralSlope: 0.15
        },
        other: {
          rms: 0.4,
          zcr: 0.25,
          spectralCentroid: 1200,
          beats: [{ time: 0, confidence: 0.6 }],
          fundamentalFreq: 440,
          spectralRolloff: 1800,
          mfcc: [0.4, 0.2, 0.1],
          loudness: 0.5,
          spectralSlope: 0.12
        }
      };

      const settings = {
        globalScale: 1.0,
        brightness: 1.0,
        particleCount: 5000
      };

      const params = adapter.visualizationAdapter.mapStemFeatures(stemFeatures, settings);

      expect(params.scale).toBeGreaterThan(1.0); // Should be increased by drums
      expect(params.height).toBeGreaterThan(0); // Should be affected by bass
      expect(params.brightness).toBeGreaterThan(0); // Should be affected by vocals
      expect(params.complexity).toBeGreaterThan(0); // Should be affected by other
    });
  });

  describe('blendStemEffects', () => {
    it('should blend multiple visualization parameters with weights', () => {
      const effect1 = {
        scale: 1.0, rotation: 0.0, color: [1.0, 0.0, 0.0] as [number, number, number],
        emission: 1.0, position: [0, 0, 0] as [number, number, number], height: 1.0,
        hue: 0.0, brightness: 1.0, complexity: 0.5, size: 1.0,
        opacity: 1.0, speed: 1.0, count: 5000
      };

      const effect2 = {
        scale: 2.0, rotation: 90.0, color: [0.0, 1.0, 0.0] as [number, number, number],
        emission: 2.0, position: [1, 1, 1] as [number, number, number], height: 2.0,
        hue: 180.0, brightness: 2.0, complexity: 1.0, size: 2.0,
        opacity: 0.5, speed: 2.0, count: 10000
      };

      const blended = adapter.visualizationAdapter.blendStemEffects(
        [effect1, effect2], 
        [0.3, 0.7]
      );

      expect(blended.scale).toBeCloseTo(1.7); // 1.0 * 0.3 + 2.0 * 0.7
      expect(blended.color[0]).toBeCloseTo(0.3); // 1.0 * 0.3 + 0.0 * 0.7
      expect(blended.color[1]).toBeCloseTo(0.7); // 0.0 * 0.3 + 1.0 * 0.7
    });

    it('should handle equal weights', () => {
      const effect1 = {
        scale: 1.0, rotation: 0.0, color: [1.0, 0.0, 0.0] as [number, number, number],
        emission: 1.0, position: [0, 0, 0] as [number, number, number], height: 1.0,
        hue: 0.0, brightness: 1.0, complexity: 0.5, size: 1.0,
        opacity: 1.0, speed: 1.0, count: 5000
      };

      const effect2 = {
        scale: 3.0, rotation: 180.0, color: [0.0, 0.0, 1.0] as [number, number, number],
        emission: 3.0, position: [2, 2, 2] as [number, number, number], height: 3.0,
        hue: 270.0, brightness: 3.0, complexity: 1.5, size: 3.0,
        opacity: 0.3, speed: 3.0, count: 15000
      };

      const blended = adapter.visualizationAdapter.blendStemEffects(
        [effect1, effect2], 
        [1.0, 1.0]
      );

      expect(blended.scale).toBeCloseTo(2.0); // Average of 1.0 and 3.0
      expect(blended.color[0]).toBeCloseTo(0.5); // Average of 1.0 and 0.0
      expect(blended.color[2]).toBeCloseTo(0.5); // Average of 0.0 and 1.0
    });
  });
});

describe('VisualizationBridgeImpl', () => {
  let bridge: VisualizationBridgeImpl;

  beforeEach(() => {
    bridge = new VisualizationBridgeImpl();
  });

  describe('generateCompatibleMidiData', () => {
    it('should generate MIDI data from audio features', () => {
      const audioFeatures: AudioFeatures[] = [
        {
          rms: 0.8,
          zcr: 0.3,
          spectralCentroid: 2000,
          beats: [{ time: 0.0, confidence: 0.9 }],
          fundamentalFreq: 440,
          spectralRolloff: 3000,
          mfcc: [1.0, 0.5, 0.3, 0.2, 0.1],
          loudness: 0.7,
          spectralSlope: 0.2
        },
        {
          rms: 0.6,
          zcr: 0.4,
          spectralCentroid: 1800,
          beats: [{ time: 0.5, confidence: 0.8 }],
          fundamentalFreq: 330,
          spectralRolloff: 2500,
          mfcc: [0.8, 0.4, 0.2, 0.1, 0.05],
          loudness: 0.6,
          spectralSlope: 0.18
        }
      ];

      const midiData = bridge.audioToVisualization.generateCompatibleMidiData(audioFeatures, 2.0);

      expect(midiData.file.duration).toBe(2.0);
      expect(midiData.tracks).toHaveLength(4); // drums, bass, vocals, other
      expect(midiData.tracks[0].name).toBe('Drums');
      expect(midiData.tracks[1].name).toBe('Bass');
      expect(midiData.tracks[2].name).toBe('Vocals');
      expect(midiData.tracks[3].name).toBe('Other');

      // Check that notes were generated
      const totalNotes = midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0);
      expect(totalNotes).toBeGreaterThan(0);
    });

    it('should handle empty audio features', () => {
      const audioFeatures: AudioFeatures[] = [];
      const midiData = bridge.audioToVisualization.generateCompatibleMidiData(audioFeatures, 1.0);

      expect(midiData.tracks).toHaveLength(0);
      expect(midiData.file.duration).toBe(1.0);
    });
  });
});