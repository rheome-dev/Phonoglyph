import { getMIDIDataAtFrame } from '../utils/midiSync';
import { createSampleMIDIData } from '../utils/testUtils';

describe('MIDI Timeline Synchronization', () => {
  test('should return active notes at specific frame', () => {
    const midiData = createSampleMIDIData();
    const sync = getMIDIDataAtFrame(midiData, 30, 30); // 1 second at 30fps
    
    expect(sync.time).toBe(1);
    expect(sync.activeNotes).toBeDefined();
    expect(sync.tempo).toBeGreaterThan(0);
  });
  
  test('should handle frame-to-time conversion correctly', () => {
    const midiData = createSampleMIDIData();
    const sync = getMIDIDataAtFrame(midiData, 90, 30); // 3 seconds
    
    expect(sync.time).toBe(3);
  });
  
  test('should find active notes within time range', () => {
    const midiData = {
      tracks: [{
        id: 'track1',
        name: 'Test Track',
        notes: [
          { id: '1', time: 0.5, duration: 1.0, note: 60, velocity: 80 },
          { id: '2', time: 2.0, duration: 0.5, note: 64, velocity: 90 }
        ]
      }],
      tempoChanges: [{ time: 0, bpm: 120 }],
      timeSignatures: [{ time: 0, timeSignature: [4, 4] as [number, number] }],
      duration: 5.0
    };
    
    // At 1 second, first note should be active
    const sync1 = getMIDIDataAtFrame(midiData, 30, 30); // 1 second
    expect(sync1.activeNotes).toHaveLength(1);
    expect(sync1.activeNotes[0].note).toBe(60);
    
    // At 2.25 seconds, second note should be active
    const sync2 = getMIDIDataAtFrame(midiData, 67, 30); // 2.25 seconds
    expect(sync2.activeNotes).toHaveLength(1);
    expect(sync2.activeNotes[0].note).toBe(64);
    
    // At 3 seconds, no notes should be active
    const sync3 = getMIDIDataAtFrame(midiData, 90, 30); // 3 seconds
    expect(sync3.activeNotes).toHaveLength(0);
  });
  
  test('should return correct tempo and time signature', () => {
    const midiData = {
      tracks: [],
      tempoChanges: [
        { time: 0, bpm: 120 },
        { time: 2, bpm: 140 }
      ],
      timeSignatures: [
        { time: 0, timeSignature: [4, 4] as [number, number] },
        { time: 1, timeSignature: [3, 4] as [number, number] }
      ],
      duration: 5.0
    };
    
    // At 0.5 seconds
    const sync1 = getMIDIDataAtFrame(midiData, 15, 30);
    expect(sync1.tempo).toBe(120);
    expect(sync1.timeSignature).toEqual([4, 4]);
    
    // At 1.5 seconds (after time signature change)
    const sync2 = getMIDIDataAtFrame(midiData, 45, 30);
    expect(sync2.tempo).toBe(120);
    expect(sync2.timeSignature).toEqual([3, 4]);
    
    // At 2.5 seconds (after tempo change)
    const sync3 = getMIDIDataAtFrame(midiData, 75, 30);
    expect(sync3.tempo).toBe(140);
    expect(sync3.timeSignature).toEqual([3, 4]);
  });
});