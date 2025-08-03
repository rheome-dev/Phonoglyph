# Particle Audio Spawning Guide

## Overview

The `ParticleNetworkEffect` has been enhanced to support audio feature-triggered particle spawning in addition to the existing MIDI note-triggered spawning. This allows particles to be generated based on real-time audio analysis data, creating dynamic visual responses to audio characteristics.

## Features

### Audio Spawning Parameters

The effect now includes the following audio spawning parameters:

- **`enableAudioSpawning`** (boolean): Enable/disable audio-triggered particle spawning
- **`audioSpawnFeature`** (string): Which audio feature to monitor for spawning
  - Options: `'volume'`, `'bass'`, `'mid'`, `'treble'`, `'rms'`, `'spectralCentroid'`
- **`audioSpawnThreshold`** (number): Minimum audio feature value to trigger spawning (0.0 - 1.0)
- **`audioSpawnRate`** (number): Probability of spawning per frame when threshold is met (0.0 - 1.0)
- **`audioSpawnCooldown`** (number): Minimum time between audio spawns in seconds
- **`audioParticleSize`** (number): Size multiplier for audio-triggered particles
- **`audioParticleColor`** (array): RGB color for audio particles [r, g, b] (0.0 - 1.0)
- **`audioSpawnIntensity`** (number): How much audio value affects particle properties

### Particle Types

The effect now creates two types of particles:

1. **MIDI Particles**: Spawned based on MIDI note events
   - Color: Based on note number and velocity
   - Size: Based on MIDI velocity
   - Spawn Type: `'midi'`

2. **Audio Particles**: Spawned based on audio feature values
   - Color: Based on audio particle color with hue variation
   - Size: Based on audio feature value and intensity
   - Spawn Type: `'audio'`

## Usage Examples

### Basic Audio Spawning

```typescript
// Enable audio spawning with volume as trigger
effect.updateParameter('enableAudioSpawning', true);
effect.updateParameter('audioSpawnFeature', 'volume');
effect.updateParameter('audioSpawnThreshold', 0.3);
effect.updateParameter('audioSpawnRate', 0.1);
```

### Bass-Responsive Particles

```typescript
// Create particles that respond to bass frequencies
effect.updateParameter('audioSpawnFeature', 'bass');
effect.updateParameter('audioSpawnThreshold', 0.4);
effect.updateParameter('audioSpawnRate', 0.2);
effect.updateParameter('audioParticleColor', [0.0, 1.0, 0.0]); // Green
```

### High-Intensity Audio Response

```typescript
// Create more dramatic responses to audio
effect.updateParameter('audioSpawnIntensity', 2.0);
effect.updateParameter('audioSpawnRate', 0.5);
effect.updateParameter('audioSpawnCooldown', 0.05); // Faster spawning
```

## Audio Feature Mapping

The following audio features are supported:

| Feature | Description | Mapped To |
|---------|-------------|-----------|
| `volume` | Overall audio volume | `audioData.volume` |
| `bass` | Low frequency content | `audioData.bass` |
| `mid` | Mid frequency content | `audioData.mid` |
| `treble` | High frequency content | `audioData.treble` |
| `rms` | Root Mean Square energy | `audioData.volume` (proxy) |
| `spectralCentroid` | Spectral centroid frequency | `audioData.treble` (proxy) |

## Performance Considerations

- Audio spawning respects the `maxParticles` limit
- Cooldown prevents excessive spawning
- Frame skipping optimization applies to both MIDI and audio spawning
- Audio particles use the same connection system as MIDI particles

## Integration with Existing Systems

The audio spawning feature integrates seamlessly with:

- **MIDI Spawning**: Both systems work simultaneously
- **Connection System**: Audio particles can connect to MIDI particles
- **Parameter Controls**: All new parameters are accessible via the existing UI
- **Performance Monitoring**: Audio spawning respects performance limits

## Troubleshooting

### No Audio Particles Appearing

1. Check that `enableAudioSpawning` is `true`
2. Verify `audioSpawnThreshold` is not too high
3. Ensure `audioSpawnRate` is greater than 0
4. Check that audio data is being provided to the effect

### Too Many Audio Particles

1. Reduce `audioSpawnRate`
2. Increase `audioSpawnThreshold`
3. Increase `audioSpawnCooldown`
4. Reduce `maxParticles` if needed

### Performance Issues

1. Reduce `audioSpawnRate`
2. Increase `audioSpawnCooldown`
3. Lower `maxParticles`
4. Check frame skipping settings

## Future Enhancements

Potential future improvements:

- Support for more audio features (spectral rolloff, zero-crossing rate, etc.)
- Audio feature combination logic (AND/OR conditions)
- Frequency-domain spawning based on FFT data
- Audio particle physics variations
- Stem-specific audio spawning 