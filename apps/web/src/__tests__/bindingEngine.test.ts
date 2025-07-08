import { describe, test, expect, beforeEach } from 'vitest';
import { MIDIBindingEngine } from '@/lib/midi/bindingEngine';
import { MIDIData } from '@/types/midi';

// Mock MIDI data for testing
const createTestMIDIData = (): MIDIData => ({
  file: {
    name: 'test.mid',
    size: 1024,
    duration: 4.0,
    ticksPerQuarter: 480,
    timeSignature: [4, 4],
    keySignature: 'C Major'
  },
  tracks: [
    {
      id: 'track1',
      name: 'Piano',
      instrument: 'Piano',
      channel: 1,
      color: '#84a98c',
      visible: true,
      notes: [
        {
          id: 'note1',
          start: 0.0,
          duration: 1.0,
          pitch: 60, // C4
          velocity: 100,
          track: 'track1',
          noteName: 'C4'
        },
        {
          id: 'note2',
          start: 1.0,
          duration: 0.5,
          pitch: 64, // E4
          velocity: 80,
          track: 'track1',
          noteName: 'E4'
        },
        {
          id: 'note3',
          start: 2.0,
          duration: 1.0,
          pitch: 67, // G4
          velocity: 120,
          track: 'track1',
          noteName: 'G4'
        }
      ]
    }
  ],
  tempoChanges: [
    { tick: 0, bpm: 120, microsecondsPerQuarter: 500000 }
  ]
});

describe('MIDI Binding Engine', () => {
  let engine: MIDIBindingEngine;
  let testMIDIData: MIDIData;
  
  beforeEach(() => {
    engine = new MIDIBindingEngine();
    testMIDIData = createTestMIDIData();
  });
  
  describe('Binding Management', () => {
    test('should add bindings correctly', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60, channel: 1 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      engine.addBinding(binding);
      
      const bindings = engine.getBindings('layer-1');
      expect(bindings).toHaveLength(1);
      expect(bindings[0]).toEqual(binding);
    });
    
    test('should remove bindings correctly', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      engine.addBinding(binding);
      expect(engine.getBindings('layer-1')).toHaveLength(1);
      
      engine.removeBinding('test-binding');
      expect(engine.getBindings('layer-1')).toHaveLength(0);
    });
    
    test('should update bindings correctly', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      engine.addBinding(binding);
      engine.updateBinding('test-binding', { enabled: false, weight: 0.5 });
      
      const updatedBinding = engine.getBindings('layer-1')[0];
      expect(updatedBinding.enabled).toBe(false);
      expect(updatedBinding.weight).toBe(0.5);
    });
  });
  
  describe('MIDI State Management', () => {
    test('should update MIDI state correctly', () => {
      engine.updateMIDIState(testMIDIData, 0.5); // At 0.5 seconds
      
      // At 0.5 seconds, note1 (C4, velocity 100) should be active
      const binding = {
        id: 'test-binding',
        name: 'Test Binding', 
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 }, // C4
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      engine.addBinding(binding);
      const values = engine.evaluateBindings('layer-1');
      
      // Should map velocity 100 to opacity ~0.787 (100/127)
      expect(values['visual.opacity']).toBeCloseTo(0.787, 2);
    });
    
    test('should handle multiple active notes', () => {
      engine.updateMIDIState(testMIDIData, 1.2); // At 1.2 seconds
      
      // At 1.2 seconds, note1 should be finished, note2 (E4, velocity 80) should be active
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1', 
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 64 }, // E4
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      engine.addBinding(binding);
      const values = engine.evaluateBindings('layer-1');
      
      // Should map velocity 80 to opacity ~0.630 (80/127)
      expect(values['visual.opacity']).toBeCloseTo(0.630, 2);
    });
    
    test('should return null for inactive notes', () => {
      engine.updateMIDIState(testMIDIData, 3.5); // After all notes
      
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      engine.addBinding(binding);
      const values = engine.evaluateBindings('layer-1');
      
      // Should return empty object when no active notes
      expect(Object.keys(values)).toHaveLength(0);
    });
  });
  
  describe('Parameter Mapping', () => {
    test('should map input range to output range correctly', () => {
      const testCases = [
        { input: 0, expected: 0.5 },
        { input: 64, expected: 0.75 }, // Middle value
        { input: 127, expected: 1.0 }
      ];
      
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0.5, outputMax: 1.0, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      testCases.forEach(({ input, expected }) => {
        const result = engine.testBinding(binding, input);
        expect(result).toBeCloseTo(expected, 2);
      });
    });
    
    test('should handle inverted mapping', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: true },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      // With invert=true, input 127 should map to output 0
      const result = engine.testBinding(binding, 127);
      expect(result).toBeCloseTo(0, 2);
    });
    
    test('should clamp values when enabled', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      // Test value above maximum
      const result = engine.testBinding(binding, 200);
      expect(result).toBe(1); // Should be clamped to max
    });
  });
  
  describe('Curve Application', () => {
    test('should apply exponential curve correctly', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'exponential' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      // For exponential curve, input 63.5 (middle) should result in 0.25 (0.5^2)
      const result = engine.testBinding(binding, 63.5);
      expect(result).toBeCloseTo(0.25, 2);
    });
    
    test('should apply logarithmic curve correctly', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'logarithmic' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      // For logarithmic curve, input 63.5 should result in ~0.707 (sqrt(0.5))
      const result = engine.testBinding(binding, 63.5);
      expect(result).toBeCloseTo(0.707, 2);
    });
    
    test('should apply steps curve correctly', () => {
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'steps' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      // Steps curve should quantize to discrete values
      const result = engine.testBinding(binding, 63.5);
      expect([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]).toContain(result);
    });
  });
  
  describe('Multiple Binding Blending', () => {
    test('should blend multiple bindings with average mode', () => {
      engine.updateMIDIState(testMIDIData, 0.5); // Note 1 active with velocity 100
      
      const binding1 = {
        id: 'binding-1',
        name: 'Binding 1',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'average' as const
      };
      
      const binding2 = {
        id: 'binding-2',
        name: 'Binding 2',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 0.5, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'average' as const
      };
      
      engine.addBinding(binding1);
      engine.addBinding(binding2);
      
      const values = engine.evaluateBindings('layer-1');
      
      // Should average the two bindings: ((100/127 * 1) + (100/127 * 0.5)) / 2
      const expected = ((100/127) + (100/127 * 0.5)) / 2;
      expect(values['visual.opacity']).toBeCloseTo(expected, 2);
    });
    
    test('should handle different blend modes', () => {
      engine.updateMIDIState(testMIDIData, 0.5);
      
      const binding = {
        id: 'binding-1',
        name: 'Binding 1',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_velocity' as const, note: 60 },
        mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'max' as const
      };
      
      engine.addBinding(binding);
      const values = engine.evaluateBindings('layer-1');
      
      expect(values['visual.opacity']).toBeCloseTo(100/127, 2);
    });
  });
  
  describe('Note On/Off Binding', () => {
    test('should return 1 for active notes and 0 for inactive', () => {
      engine.updateMIDIState(testMIDIData, 0.5); // Note 1 (C4) is active
      
      const binding = {
        id: 'test-binding',
        name: 'Test Binding',
        layerId: 'layer-1',
        targetProperty: { type: 'visual' as const, property: 'opacity' },
        midiSource: { type: 'note_on_off' as const, note: 60 }, // C4
        mapping: { inputMin: 0, inputMax: 1, outputMin: 0, outputMax: 1, clamp: true, invert: false },
        curve: 'linear' as const,
        enabled: true,
        weight: 1,
        blendMode: 'replace' as const
      };
      
      engine.addBinding(binding);
      const values = engine.evaluateBindings('layer-1');
      
      expect(values['visual.opacity']).toBe(1);
      
      // Test with inactive note
      engine.updateMIDIState(testMIDIData, 3.5); // All notes finished
      const values2 = engine.evaluateBindings('layer-1');
      
      expect(Object.keys(values2)).toHaveLength(0);
    });
  });
});