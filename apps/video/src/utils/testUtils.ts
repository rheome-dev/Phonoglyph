import type { MIDIData } from '../types';

export function createSampleMIDIData(): MIDIData {
  return {
    tracks: [
      {
        id: 'track1',
        name: 'Sample Track',
        notes: [
          {
            id: 'note1',
            time: 0.5,
            duration: 1.0,
            note: 60,
            velocity: 80
          },
          {
            id: 'note2',
            time: 2.0,
            duration: 0.5,
            note: 64,
            velocity: 90
          }
        ]
      }
    ],
    tempoChanges: [
      {
        time: 0,
        bpm: 120
      }
    ],
    timeSignatures: [
      {
        time: 0,
        timeSignature: [4, 4]
      }
    ],
    duration: 5.0
  };
}