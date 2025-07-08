import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VideoTriggerEngine, VideoTrigger, TriggerEvent } from '@/lib/video/effectTriggers';
import { AssetCyclingEngine, AssetPlaylist } from '@/lib/video/assetCycling';
import { GenrePresetManager } from '@/lib/video/genrePresets';
import { MIDIData } from '@/types/midi';

// Mock MIDI data for testing
const createMockMIDIData = (): MIDIData => ({
  file: {
    name: 'test.mid',
    size: 1024,
    duration: 10,
    ticksPerQuarter: 480,
    timeSignature: [4, 4],
    keySignature: 'C'
  },
  tracks: [
    {
      id: 'track-1',
      name: 'Drums',
      instrument: 'Acoustic Grand Piano',
      channel: 10,
      notes: [
        {
          id: 'note-1',
          start: 0.0,
          duration: 0.1,
          pitch: 36, // Kick
          velocity: 100,
          track: 'track-1',
          noteName: 'C2'
        },
        {
          id: 'note-2',
          start: 0.5,
          duration: 0.1,
          pitch: 38, // Snare
          velocity: 120,
          track: 'track-1',
          noteName: 'D2'
        },
        {
          id: 'note-3',
          start: 1.0,
          duration: 0.1,
          pitch: 42, // Hi-hat
          velocity: 80,
          track: 'track-1',
          noteName: 'F#2'
        }
      ],
      color: '#ff0000',
      visible: true
    }
  ],
  tempoChanges: [
    {
      tick: 0,
      bpm: 120,
      microsecondsPerQuarter: 500000
    }
  ]
});

const createMockTrigger = (overrides: Partial<VideoTrigger> = {}): VideoTrigger => ({
  id: 'trigger-1',
  name: 'Test Trigger',
  layerId: 'layer-1',
  triggerType: 'cut',
  midiCondition: { type: 'note_on', note: 36 },
  effect: {
    type: 'hard_cut',
    duration: 0.1,
    intensity: 1.0,
    easing: 'linear'
  },
  enabled: true,
  cooldown: 100,
  lastTriggered: 0,
  ...overrides
});

describe('VideoTriggerEngine', () => {
  let engine: VideoTriggerEngine;
  let mockMidiData: MIDIData;

  beforeEach(() => {
    engine = new VideoTriggerEngine();
    mockMidiData = createMockMIDIData();
  });

  describe('trigger management', () => {
    test('should add triggers correctly', () => {
      const trigger = createMockTrigger();
      engine.addTrigger(trigger);
      
      const retrieved = engine.getTrigger(trigger.id);
      expect(retrieved).toEqual(trigger);
    });

    test('should remove triggers correctly', () => {
      const trigger = createMockTrigger();
      engine.addTrigger(trigger);
      
      engine.removeTrigger(trigger.id);
      const retrieved = engine.getTrigger(trigger.id);
      expect(retrieved).toBeUndefined();
    });

    test('should update triggers correctly', () => {
      const trigger = createMockTrigger();
      engine.addTrigger(trigger);
      
      const updates = { name: 'Updated Trigger', enabled: false };
      engine.updateTrigger(trigger.id, updates);
      
      const updated = engine.getTrigger(trigger.id);
      expect(updated?.name).toBe('Updated Trigger');
      expect(updated?.enabled).toBe(false);
    });

    test('should get triggers by layer', () => {
      const trigger1 = createMockTrigger({ id: 'trigger-1', layerId: 'layer-1' });
      const trigger2 = createMockTrigger({ id: 'trigger-2', layerId: 'layer-1' });
      const trigger3 = createMockTrigger({ id: 'trigger-3', layerId: 'layer-2' });
      
      engine.addTrigger(trigger1);
      engine.addTrigger(trigger2);
      engine.addTrigger(trigger3);
      
      const layer1Triggers = engine.getTriggersByLayer('layer-1');
      expect(layer1Triggers).toHaveLength(2);
      expect(layer1Triggers.map(t => t.id)).toEqual(['trigger-1', 'trigger-2']);
    });
  });

  describe('trigger evaluation', () => {
    test('should trigger on note events', () => {
      const trigger = createMockTrigger({
        midiCondition: { type: 'note_on', note: 36 }
      });
      engine.addTrigger(trigger);
      
      const events = engine.evaluateTriggers(mockMidiData, 0.1, 0.0);
      
      expect(events).toHaveLength(1);
      expect(events[0].triggerId).toBe(trigger.id);
      expect(events[0].time).toBe(0.1);
    });

    test('should not trigger disabled triggers', () => {
      const trigger = createMockTrigger({
        enabled: false,
        midiCondition: { type: 'note_on', note: 36 }
      });
      engine.addTrigger(trigger);
      
      const events = engine.evaluateTriggers(mockMidiData, 0.1, 0.0);
      
      expect(events).toHaveLength(0);
    });

    test('should respect cooldown periods', () => {
      const trigger = createMockTrigger({
        cooldown: 500, // 500ms cooldown
        midiCondition: { type: 'note_on', note: 36 }
      });
      engine.addTrigger(trigger);
      
      // First trigger
      const events1 = engine.evaluateTriggers(mockMidiData, 0.1, 0.0);
      expect(events1).toHaveLength(1);
      
      // Second trigger within cooldown period
      const events2 = engine.evaluateTriggers(mockMidiData, 0.3, 0.2);
      expect(events2).toHaveLength(0);
      
      // Third trigger after cooldown period
      const events3 = engine.evaluateTriggers(mockMidiData, 0.8, 0.7);
      expect(events3).toHaveLength(1);
    });

    test('should trigger on velocity threshold', () => {
      const trigger = createMockTrigger({
        midiCondition: { 
          type: 'note_velocity_threshold', 
          note: 38, 
          velocityThreshold: 110 
        }
      });
      engine.addTrigger(trigger);
      
      const events = engine.evaluateTriggers(mockMidiData, 0.6, 0.4);
      
      expect(events).toHaveLength(1);
      expect(events[0].effect.intensity).toBeGreaterThan(0); // Modified by velocity
    });

    test('should not trigger below velocity threshold', () => {
      const trigger = createMockTrigger({
        midiCondition: { 
          type: 'note_velocity_threshold', 
          note: 42, 
          velocityThreshold: 100 
        }
      });
      engine.addTrigger(trigger);
      
      const events = engine.evaluateTriggers(mockMidiData, 1.1, 0.9);
      
      expect(events).toHaveLength(0); // Note velocity is 80, below threshold
    });

    test('should modify effect based on velocity', () => {
      const trigger = createMockTrigger({
        effect: { type: 'zoom', duration: 1.0, intensity: 0.5, easing: 'linear' },
        midiCondition: { type: 'note_on', note: 38 }
      });
      engine.addTrigger(trigger);
      
      const events = engine.evaluateTriggers(mockMidiData, 0.6, 0.4);
      
      expect(events).toHaveLength(1);
      expect(events[0].effect.intensity).toBeGreaterThan(0.5); // Modified by velocity
      expect(events[0].effect.duration).not.toBe(1.0); // Modified by velocity
    });
  });

  describe('beat detection', () => {
    test('should trigger on beat detection', () => {
      const trigger = createMockTrigger({
        midiCondition: { type: 'beat_detection', beatDivision: 4 }
      });
      engine.addTrigger(trigger);
      
      // At 120 BPM, quarter notes are every 0.5 seconds
      const events = engine.evaluateTriggers(mockMidiData, 0.5, 0.4);
      
      expect(events).toHaveLength(1);
    });
  });
});

describe('AssetCyclingEngine', () => {
  let engine: AssetCyclingEngine;
  let mockPlaylist: AssetPlaylist;

  beforeEach(() => {
    engine = new AssetCyclingEngine();
    mockPlaylist = {
      id: 'playlist-1',
      name: 'Test Playlist',
      layerId: 'layer-1',
      assetIds: ['asset-1', 'asset-2', 'asset-3'],
      cycleMode: 'sequential',
      transitionType: 'cut',
      transitionDuration: 0.1
    };
  });

  describe('playlist management', () => {
    test('should set and get playlists', () => {
      engine.setPlaylist(mockPlaylist);
      
      const retrieved = engine.getPlaylist('layer-1');
      expect(retrieved).toEqual(mockPlaylist);
    });

    test('should remove playlists', () => {
      engine.setPlaylist(mockPlaylist);
      engine.removePlaylist('layer-1');
      
      const retrieved = engine.getPlaylist('layer-1');
      expect(retrieved).toBeUndefined();
    });

    test('should get all playlists', () => {
      const playlist2 = { ...mockPlaylist, id: 'playlist-2', layerId: 'layer-2' };
      
      engine.setPlaylist(mockPlaylist);
      engine.setPlaylist(playlist2);
      
      const allPlaylists = engine.getAllPlaylists();
      expect(allPlaylists).toHaveLength(2);
    });
  });

  describe('asset cycling', () => {
    test('should cycle sequentially', () => {
      engine.setPlaylist(mockPlaylist);
      
      const asset1 = engine.getNextAsset('layer-1');
      const asset2 = engine.getNextAsset('layer-1');
      const asset3 = engine.getNextAsset('layer-1');
      const asset4 = engine.getNextAsset('layer-1'); // Should wrap around
      
      expect(asset1).toBe('asset-2'); // First call advances from 0 to 1
      expect(asset2).toBe('asset-3');
      expect(asset3).toBe('asset-1'); // Wraps around
      expect(asset4).toBe('asset-2');
    });

    test('should cycle randomly with deterministic seed', () => {
      const randomPlaylist = { ...mockPlaylist, cycleMode: 'random' as const };
      engine.setPlaylist(randomPlaylist);
      
      const asset1 = engine.getNextAsset('layer-1');
      const asset2 = engine.getNextAsset('layer-1');
      
      expect(['asset-1', 'asset-2', 'asset-3']).toContain(asset1);
      expect(['asset-1', 'asset-2', 'asset-3']).toContain(asset2);
    });

    test('should cycle based on velocity', () => {
      const velocityPlaylist = { ...mockPlaylist, cycleMode: 'velocity_mapped' as const };
      engine.setPlaylist(velocityPlaylist);
      
      const lowVelocityAsset = engine.getNextAsset('layer-1', 42); // Low velocity
      const highVelocityAsset = engine.getNextAsset('layer-1', 127); // Max velocity
      
      expect(lowVelocityAsset).toBe('asset-1'); // Maps to index 0
      expect(highVelocityAsset).toBe('asset-3'); // Maps to index 2
    });

    test('should handle empty playlists', () => {
      const emptyPlaylist = { ...mockPlaylist, assetIds: [] };
      engine.setPlaylist(emptyPlaylist);
      
      const asset = engine.getNextAsset('layer-1');
      expect(asset).toBeNull();
    });
  });

  describe('playlist manipulation', () => {
    beforeEach(() => {
      engine.setPlaylist(mockPlaylist);
    });

    test('should add assets to playlist', () => {
      const success = engine.addAssetToPlaylist('layer-1', 'asset-4');
      expect(success).toBe(true);
      
      const playlist = engine.getPlaylist('layer-1');
      expect(playlist?.assetIds).toContain('asset-4');
    });

    test('should remove assets from playlist', () => {
      const success = engine.removeAssetFromPlaylist('layer-1', 'asset-2');
      expect(success).toBe(true);
      
      const playlist = engine.getPlaylist('layer-1');
      expect(playlist?.assetIds).not.toContain('asset-2');
      expect(playlist?.assetIds).toHaveLength(2);
    });

    test('should move assets within playlist', () => {
      const success = engine.moveAssetInPlaylist('layer-1', 0, 2);
      expect(success).toBe(true);
      
      const playlist = engine.getPlaylist('layer-1');
      expect(playlist?.assetIds).toEqual(['asset-2', 'asset-3', 'asset-1']);
    });

    test('should shuffle playlist', () => {
      const originalOrder = [...mockPlaylist.assetIds];
      engine.shufflePlaylist('layer-1');
      
      const playlist = engine.getPlaylist('layer-1');
      expect(playlist?.assetIds).toHaveLength(originalOrder.length);
      expect(playlist?.assetIds).toEqual(expect.arrayContaining(originalOrder));
    });
  });

  describe('playlist statistics', () => {
    beforeEach(() => {
      engine.setPlaylist(mockPlaylist);
    });

    test('should provide playlist stats', () => {
      const stats = engine.getPlaylistStats('layer-1');
      
      expect(stats).toEqual({
        totalAssets: 3,
        currentPosition: 0,
        cycleMode: 'sequential',
        historyLength: 0
      });
    });

    test('should track history', () => {
      engine.getNextAsset('layer-1');
      engine.getNextAsset('layer-1');
      
      const history = engine.getPlaylistHistory('layer-1');
      expect(history).toHaveLength(2);
    });

    test('should limit history length', () => {
      // Generate more than 10 assets to test history limit
      for (let i = 0; i < 15; i++) {
        engine.getNextAsset('layer-1');
      }
      
      const history = engine.getPlaylistHistory('layer-1');
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });
});

describe('GenrePresetManager', () => {
  let manager: GenrePresetManager;

  beforeEach(() => {
    manager = new GenrePresetManager();
  });

  test('should load default presets', () => {
    const presets = manager.getAllPresets();
    expect(presets.length).toBeGreaterThan(0);
    
    const electronicPreset = manager.getPreset('electronic-drums');
    expect(electronicPreset).toBeDefined();
    expect(electronicPreset?.name).toBe('Electronic/EDM');
  });

  test('should create triggers from preset', () => {
    const mockGenerateId = vi.fn()
      .mockReturnValueOnce('trigger-1')
      .mockReturnValueOnce('trigger-2')
      .mockReturnValueOnce('trigger-3')
      .mockReturnValueOnce('trigger-4');
    
    const triggers = manager.createTriggersFromPreset(
      'electronic-drums',
      'layer-1',
      mockGenerateId
    );
    
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers[0].layerId).toBe('layer-1');
    expect(triggers[0].id).toBe('trigger-1');
    expect(mockGenerateId).toHaveBeenCalledTimes(triggers.length);
  });

  test('should search presets', () => {
    const results = manager.searchPresets('electronic');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.name.toLowerCase().includes('electronic'))).toBe(true);
  });

  test('should get presets by category', () => {
    const categories = manager.getPresetsByCategory();
    expect(categories.Electronic).toBeDefined();
    expect(categories['Rock/Metal']).toBeDefined();
    expect(categories.Jazz).toBeDefined();
  });

  test('should clone presets', () => {
    const cloned = manager.clonePreset('electronic-drums', 'my-electronic', 'My Electronic');
    
    expect(cloned).toBeDefined();
    expect(cloned?.id).toBe('my-electronic');
    expect(cloned?.name).toBe('My Electronic');
    expect(cloned?.triggers).toEqual(manager.getPreset('electronic-drums')?.triggers);
  });

  test('should merge presets', () => {
    const merged = manager.mergePresets(
      ['electronic-drums', 'rock-drums'],
      'hybrid',
      'Hybrid Preset'
    );
    
    expect(merged).toBeDefined();
    expect(merged?.id).toBe('hybrid');
    expect(merged?.name).toBe('Hybrid Preset');
    
    const electronicTriggers = manager.getPreset('electronic-drums')?.triggers.length || 0;
    const rockTriggers = manager.getPreset('rock-drums')?.triggers.length || 0;
    expect(merged?.triggers.length).toBe(electronicTriggers + rockTriggers);
  });

  test('should provide preset statistics', () => {
    const stats = manager.getPresetStats('electronic-drums');
    
    expect(stats).toBeDefined();
    expect(stats?.triggerCount).toBeGreaterThan(0);
    expect(stats?.effectTypes).toBeInstanceOf(Array);
    expect(stats?.conditionTypes).toBeInstanceOf(Array);
    expect(typeof stats?.avgDuration).toBe('number');
    expect(typeof stats?.avgCooldown).toBe('number');
  });

  test('should export and import presets', () => {
    const exported = manager.exportPreset('electronic-drums');
    expect(exported).toBeTruthy();
    
    const success = manager.importPreset(exported!);
    expect(success).toBe(true);
  });

  test('should handle invalid import data', () => {
    const success = manager.importPreset('invalid json');
    expect(success).toBe(false);
  });
});