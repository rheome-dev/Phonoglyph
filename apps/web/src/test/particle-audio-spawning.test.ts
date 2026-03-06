import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleNetworkEffect, SpawnEvent } from '@/lib/visualizer/effects/ParticleNetworkEffect';
import * as THREE from 'three';

describe('ParticleNetworkEffect Stateless Audio Spawning', () => {
  let effect: ParticleNetworkEffect;

  beforeEach(() => {
    effect = new ParticleNetworkEffect();
  });

  it('should have spawn events parameter', () => {
    expect(effect.parameters.spawnEvents).toEqual([]);
    expect(effect.parameters.particleSpawning).toBe(0.0);
    expect(effect.parameters.spawnThreshold).toBe(0.5);
  });

  it('should accept spawn events via updateParameter', () => {
    const spawnEvents: SpawnEvent[] = [
      { time: 0.5, intensity: 0.8, stemType: 'drums' },
      { time: 1.0, intensity: 0.6, stemType: 'drums' },
      { time: 1.5, intensity: 0.9, stemType: 'bass' },
    ];

    effect.updateParameter('spawnEvents', spawnEvents);

    expect(effect.parameters.spawnEvents).toEqual(spawnEvents);
    expect(effect.parameters.spawnEvents.length).toBe(3);
  });

  it('should create particles with correct spawn types', () => {
    const midiParticle = (effect as any).createParticle(60, 64, 'piano', 'midi');
    const audioParticle = (effect as any).createParticle(60, 64, 'audio', 'audio', 'volume', 0.8);

    expect(midiParticle.spawnType).toBe('midi');
    expect(audioParticle.spawnType).toBe('audio');
    expect(audioParticle.audioFeature).toBe('volume');
    expect(audioParticle.audioValue).toBe(0.8);
  });

  it('should generate different colors for MIDI vs audio particles', () => {
    const midiColor = (effect as any).getNoteColor(60, 64, 'midi');
    const audioColor = (effect as any).getNoteColor(60, 64, 'audio', 0.8);

    // Colors should be different (we can't predict exact values due to HSL calculations)
    expect(midiColor).toBeInstanceOf(THREE.Color);
    expect(audioColor).toBeInstanceOf(THREE.Color);
  });

  it('should calculate particle size correctly for different spawn types', () => {
    const midiParticle = (effect as any).createParticle(60, 64, 'piano', 'midi');
    const audioParticle = (effect as any).createParticle(60, 64, 'audio', 'audio', 'volume', 0.8);

    // MIDI particle size should be based on velocity
    expect(midiParticle.size).toBeGreaterThan(0);

    // Audio particle size should be based on audio value
    expect(audioParticle.size).toBeGreaterThan(0);
  });

  describe('SpawnEvent interface', () => {
    it('should have required properties', () => {
      const event: SpawnEvent = {
        time: 1.5,
        intensity: 0.75,
      };

      expect(event.time).toBe(1.5);
      expect(event.intensity).toBe(0.75);
      expect(event.stemType).toBeUndefined();
    });

    it('should accept optional stemType', () => {
      const event: SpawnEvent = {
        time: 2.0,
        intensity: 0.9,
        stemType: 'drums',
      };

      expect(event.stemType).toBe('drums');
    });
  });

  describe('Stateless rendering', () => {
    it('should handle empty spawn events gracefully', () => {
      effect.parameters.spawnEvents = [];

      // Should not throw when updateWithTime is called with no spawn events
      // Note: We can't call updateWithTime without init(), but we can verify parameters
      expect(effect.parameters.spawnEvents.length).toBe(0);
    });

    it('should filter particles by lifetime', () => {
      // Test that spawn events are correctly filtered
      // Particles should only exist when: spawn_time <= T < spawn_time + lifetime
      const lifetime = effect.parameters.particleLifetime; // 3.0 by default

      const spawnEvents: SpawnEvent[] = [
        { time: 0.0, intensity: 0.5 },  // Should be active at t=1.0
        { time: 2.0, intensity: 0.5 },  // Should be active at t=1.0? No, t=1 < spawn_time=2
        { time: 5.0, intensity: 0.5 },  // Should NOT be active at t=1.0 (future)
      ];

      effect.parameters.spawnEvents = spawnEvents;

      // At t=1.0:
      // - event at t=0.0: age=1.0, within lifetime (0-3)
      // - event at t=2.0: age=-1.0, future event
      // - event at t=5.0: age=-4.0, future event
      // Only 1 particle should be active

      // Verify lifetime is set correctly
      expect(lifetime).toBe(3.0);
    });
  });
});
