import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleNetworkEffect } from '@/lib/visualizer/effects/ParticleNetworkEffect';
import { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import * as THREE from 'three';

describe('ParticleNetworkEffect Audio Spawning', () => {
  let effect: ParticleNetworkEffect;

  beforeEach(() => {
    effect = new ParticleNetworkEffect();
  });

  it('should have audio spawning parameters', () => {
    expect(effect.parameters.enableAudioSpawning).toBe(true);
    expect(effect.parameters.audioSpawnFeature).toBe('volume');
    expect(effect.parameters.audioSpawnThreshold).toBe(0.3);
    expect(effect.parameters.audioSpawnRate).toBe(0.1);
    expect(effect.parameters.audioParticleColor).toEqual([0.8, 0.4, 1.0]);
  });

  it('should handle audio feature value extraction', () => {
    const audioData: AudioAnalysisData = {
      frequencies: [],
      timeData: [],
      volume: 0.8,
      bass: 0.6,
      mid: 0.7,
      treble: 0.9
    };

    // Test different audio features
    const volumeValue = (effect as any).getAudioFeatureValue(audioData, 'volume');
    const bassValue = (effect as any).getAudioFeatureValue(audioData, 'bass');
    const midValue = (effect as any).getAudioFeatureValue(audioData, 'mid');
    const trebleValue = (effect as any).getAudioFeatureValue(audioData, 'treble');

    expect(volumeValue).toBe(0.8);
    expect(bassValue).toBe(0.6);
    expect(midValue).toBe(0.7);
    expect(trebleValue).toBe(0.9);
  });

  it('should update audio spawning parameters', () => {
    // Test parameter updates
    effect.updateParameter('enableAudioSpawning', false);
    effect.updateParameter('audioSpawnFeature', 'bass');
    effect.updateParameter('audioSpawnThreshold', 0.5);
    effect.updateParameter('audioSpawnRate', 0.2);
    effect.updateParameter('audioParticleColor', [1.0, 0.0, 0.0]);

    expect(effect.parameters.enableAudioSpawning).toBe(false);
    expect(effect.parameters.audioSpawnFeature).toBe('bass');
    expect(effect.parameters.audioSpawnThreshold).toBe(0.5);
    expect(effect.parameters.audioSpawnRate).toBe(0.2);
    expect(effect.parameters.audioParticleColor).toEqual([1.0, 0.0, 0.0]);
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
    
    // Audio color should use the audio particle color as base
    const expectedAudioColor = new THREE.Color(0.8, 0.4, 1.0);
    expect(audioColor.r).toBeCloseTo(expectedAudioColor.r, 1);
    expect(audioColor.g).toBeCloseTo(expectedAudioColor.g, 1);
    expect(audioColor.b).toBeCloseTo(expectedAudioColor.b, 1);
  });

  it('should calculate particle size correctly for different spawn types', () => {
    const midiParticle = (effect as any).createParticle(60, 64, 'piano', 'midi');
    const audioParticle = (effect as any).createParticle(60, 64, 'audio', 'audio', 'volume', 0.8);

    // MIDI particle size should be based on velocity
    expect(midiParticle.size).toBeGreaterThan(0);
    
    // Audio particle size should be based on audio value and audioParticleSize parameter
    expect(audioParticle.size).toBeGreaterThan(0);
    expect(audioParticle.size).toBeGreaterThan(midiParticle.size * 0.5); // Should be reasonably sized
  });

  it('should handle fallback audio feature values', () => {
    const audioData: AudioAnalysisData = {
      frequencies: [],
      timeData: [],
      volume: 0.5,
      bass: 0.3,
      mid: 0.4,
      treble: 0.6
    };

    // Test unknown feature falls back to volume
    const unknownValue = (effect as any).getAudioFeatureValue(audioData, 'unknown');
    expect(unknownValue).toBe(0.5); // Should fall back to volume
  });

  it('should handle rms and spectralCentroid feature mapping', () => {
    const audioData: AudioAnalysisData = {
      frequencies: [],
      timeData: [],
      volume: 0.7,
      bass: 0.3,
      mid: 0.4,
      treble: 0.8
    };

    // Test that rms maps to volume
    const rmsValue = (effect as any).getAudioFeatureValue(audioData, 'rms');
    expect(rmsValue).toBe(0.7);

    // Test that spectralCentroid maps to treble
    const spectralValue = (effect as any).getAudioFeatureValue(audioData, 'spectralCentroid');
    expect(spectralValue).toBe(0.8);
  });
}); 