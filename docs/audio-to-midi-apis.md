# Audio to MIDI Visualization APIs

## Overview

This document provides comprehensive documentation for the new audio-to-MIDI visualization adaptation system implemented in Story 5.8. The system enables seamless visualization of audio files using the existing MIDI-based visualization engine.

## Core Components

### 1. AudioToMidiAdapter

The main adapter class that converts audio features to MIDI-like events for visualization.

```typescript
import { AudioToMidiAdapter } from '@/lib/audio-to-midi-adapter';

const adapter = new AudioToMidiAdapter();
```

#### Methods

##### `stemToMidiAdapter.rhythmToMidiEvents()`

Converts rhythm features to MIDI-like events.

```typescript
const rhythmEvents = adapter.stemToMidiAdapter.rhythmToMidiEvents(
  {
    rms: 0.8,              // Root mean square energy (0-1)
    zcr: 0.3,              // Zero crossing rate (0-1)
    spectralCentroid: 2000, // Spectral centroid in Hz
    beats: [               // Detected beats
      { time: 0.0, confidence: 0.9 },
      { time: 0.5, confidence: 0.7 }
    ]
  },
  'drums' // StemType: 'drums' | 'bass' | 'vocals' | 'other'
);
```

**Returns:** `MIDIEvent[]` - Array of MIDI-like events with pitch, velocity, start time, and duration.

##### `stemToMidiAdapter.pitchToMidiEvents()`

Converts pitch features to MIDI-like events.

```typescript
const pitchEvents = adapter.stemToMidiAdapter.pitchToMidiEvents(
  {
    fundamentalFreq: 440,     // Fundamental frequency in Hz
    spectralRolloff: 4000,    // Spectral rolloff frequency
    mfcc: [1.2, -0.5, 0.8]    // Mel-frequency cepstral coefficients
  },
  'vocals'
);
```

##### `stemToMidiAdapter.intensityToVelocity()`

Converts energy features to MIDI velocity values.

```typescript
const velocity = adapter.stemToMidiAdapter.intensityToVelocity({
  rms: 0.8,           // Root mean square
  spectralSlope: 0.5,  // Spectral slope
  loudness: 0.9       // Perceived loudness
});
```

**Returns:** `number` - MIDI velocity value (1-127).

### 2. AudioVisualizationManager

Manages the complete audio visualization pipeline with preset-based mapping.

```typescript
import { AudioVisualizationManager } from '@/lib/visualization-manager';

const audioManager = new AudioVisualizationManager({
  smoothingFactor: 0.2,
  responsiveness: 0.8
});
```

#### Configuration

```typescript
interface VisualizationConfig {
  preset: VisualizationPreset;
  stemWeights: Record<StemType, number>;
  globalSettings: VisualizationSettings;
  smoothingFactor: number;    // 0-1, higher = more smoothing
  responsiveness: number;     // 0-1, higher = more responsive
}
```

#### Methods

##### `processAudioFeatures()`

Main processing method that converts audio features to visualization parameters.

```typescript
const visualParams = audioManager.processAudioFeatures(
  {
    drums: { /* AudioFeatures */ },
    bass: { /* AudioFeatures */ },
    vocals: { /* AudioFeatures */ },
    other: { /* AudioFeatures */ }
  },
  currentTime
);
```

**Returns:** `VisualizationParameters` - Complete set of visualization parameters.

##### `loadPreset()`

Load a visualization preset by ID.

```typescript
const success = audioManager.loadPreset('default');
```

##### `setStemWeight()`

Adjust the influence of individual stems on the visualization.

```typescript
audioManager.setStemWeight('drums', 1.5);  // Increase drums influence
audioManager.setStemWeight('vocals', 0.8); // Decrease vocals influence
```

### 3. HybridVisualizer

Handles seamless blending between MIDI and audio input sources.

```typescript
import { HybridVisualizer } from '@/lib/hybrid-visualizer';

const hybridVisualizer = new HybridVisualizer({
  dataSourceMode: 'hybrid',
  hybridBlendWeight: 0.5,
  enableCrossfade: true,
  crossfadeSpeed: 0.05
});
```

#### Data Source Modes

- **`'midi'`** - Pure MIDI visualization
- **`'audio'`** - Pure audio-based visualization  
- **`'hybrid'`** - Blended MIDI and audio visualization

#### Methods

##### `updateInputData()`

Update the visualizer with new input data.

```typescript
const visualParams = hybridVisualizer.updateInputData({
  midiData: midiData,           // Optional MIDI data
  audioFeatures: audioFeatures, // Optional audio features
  currentTime: 1.5
});
```

##### `updateDataSourceMode()`

Switch between visualization modes.

```typescript
hybridVisualizer.updateDataSourceMode('hybrid');
```

##### `updateHybridBlendWeight()`

Adjust the blend between MIDI and audio sources (0 = full MIDI, 1 = full audio).

```typescript
hybridVisualizer.updateHybridBlendWeight(0.7); // 70% audio, 30% MIDI
```

##### `getPerformanceStats()`

Get detailed performance statistics.

```typescript
const stats = hybridVisualizer.getPerformanceStats();
// Returns: updateCount, frameDropCount, currentBlendWeight, etc.
```

### 4. PerformanceOptimizer

Provides adaptive performance optimization and quality management.

```typescript
import { PerformanceOptimizer } from '@/lib/performance-optimizer';

const optimizer = new PerformanceOptimizer({
  targetFPS: 60,
  adaptiveQuality: true,
  maxMemoryUsage: 200 // MB
});
```

#### Quality Levels

- **`'potato'`** - Minimal quality for low-end devices
- **`'low'`** - Basic quality with limited effects
- **`'medium'`** - Balanced quality and performance
- **`'high'`** - High quality with full effects
- **`'ultra'`** - Maximum quality for high-end devices

#### Methods

##### `startFrame()` / `endFrame()`

Frame-level performance monitoring.

```typescript
optimizer.startFrame();
// ... render frame ...
const shouldProcess = optimizer.endFrame(); // Returns false if frame should be skipped
```

##### `optimizeAudioFeatures()`

Optimize audio features based on current performance.

```typescript
const optimizedFeatures = optimizer.optimizeAudioFeatures(audioFeatures, true);
```

##### `setQualityLevel()`

Manually set quality level.

```typescript
optimizer.setQualityLevel('high');
```

##### `getMetrics()`

Get detailed performance metrics.

```typescript
const metrics = optimizer.getMetrics();
console.log(`FPS: ${metrics.fps}, Quality: ${metrics.currentQuality}`);
```

## Data Types

### AudioFeatures

Core audio analysis data structure:

```typescript
interface AudioFeatures {
  // Rhythm features
  rms: number;                    // Root mean square energy (0-1)
  zcr: number;                    // Zero crossing rate (0-1)
  spectralCentroid: number;       // Spectral centroid in Hz
  beats: { time: number, confidence: number }[];
  
  // Pitch features
  fundamentalFreq: number;        // Fundamental frequency in Hz
  spectralRolloff: number;        // Spectral rolloff frequency
  mfcc: number[];                 // Mel-frequency cepstral coefficients
  
  // Energy/intensity features
  loudness: number;               // Perceived loudness (0-1)
  spectralSlope: number;          // Spectral slope
}
```

### VisualizationParameters

Output parameters for the visualization engine:

```typescript
interface VisualizationParameters {
  scale: number;                  // Global scale multiplier
  rotation: number;               // Rotation speed
  color: [number, number, number]; // RGB color values (0-1)
  emission: number;               // Emission intensity
  position: [number, number, number]; // Position offset
  height: number;                 // Height scale
  hue: number;                    // Hue rotation (0-360)
  brightness: number;             // Brightness multiplier
  complexity: number;             // Complexity factor (0-1)
  size: number;                   // Size multiplier
  opacity: number;                // Opacity (0-1)
  speed: number;                  // Animation speed
  count: number;                  // Particle count
}
```

### StemType

Audio stem types for separate processing:

```typescript
type StemType = 'drums' | 'bass' | 'vocals' | 'other';
```

## Usage Examples

### Basic Audio Visualization

```typescript
import { AudioVisualizationManager } from '@/lib/visualization-manager';

// Initialize the manager
const audioManager = new AudioVisualizationManager();

// Process audio features
const stemFeatures = {
  drums: { /* audio features */ },
  bass: { /* audio features */ },
  vocals: { /* audio features */ },
  other: { /* audio features */ }
};

const visualParams = audioManager.processAudioFeatures(stemFeatures, currentTime);

// Apply to visualizer
audioManager.applyParametersToVisualizer(visualParams);
```

### Hybrid MIDI/Audio Visualization

```typescript
import { HybridVisualizer } from '@/lib/hybrid-visualizer';

const hybridVisualizer = new HybridVisualizer();

// Update with both MIDI and audio data
const params = hybridVisualizer.updateInputData({
  midiData: midiData,
  audioFeatures: audioFeatures,
  currentTime: currentTime
});

// Switch to audio-only mode
hybridVisualizer.updateDataSourceMode('audio');
```

### Performance-Optimized Visualization

```typescript
import { PerformanceOptimizer } from '@/lib/performance-optimizer';
import { AudioVisualizationManager } from '@/lib/visualization-manager';

const optimizer = new PerformanceOptimizer();
const audioManager = new AudioVisualizationManager();

// Render loop
function renderFrame() {
  optimizer.startFrame();
  
  if (optimizer.endFrame()) {
    // Optimize audio features based on performance
    const optimizedFeatures = optimizer.optimizeAudioFeatures(audioFeatures);
    
    // Process visualization
    const params = audioManager.processAudioFeatures(optimizedFeatures, currentTime);
    
    // Apply optimized settings
    const particleCount = optimizer.getOptimalParticleCount();
    const shouldEnableEffects = optimizer.shouldEnableEffects();
  }
  
  requestAnimationFrame(renderFrame);
}
```

## Integration with Existing Components

### ThreeVisualizer Integration

The new system is designed to work seamlessly with the existing `ThreeVisualizer` component:

```typescript
// Extended props for ThreeVisualizer
interface ThreeVisualizerProps {
  // Existing props
  midiData?: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  isPlaying: boolean;
  
  // New audio support
  audioFeatures?: Record<StemType, AudioFeatures>;
  dataSource: 'midi' | 'audio' | 'hybrid';
  
  // Callbacks
  onPlayPause: () => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onFpsUpdate?: (fps: number) => void;
}
```

### Preset Compatibility

All existing visualization presets remain fully compatible. The new system maps audio features to the same visualization parameters that MIDI data produces.

## Performance Considerations

### Optimization Strategies

1. **Adaptive Quality**: Automatically adjusts quality based on performance
2. **Frame Skipping**: Skips frames when processing takes too long
3. **Memory Management**: Monitors and manages memory usage
4. **Feature Optimization**: Reduces audio feature complexity for better performance

### Recommended Settings

- **High-end devices**: `quality: 'ultra'`, `targetFPS: 60`
- **Mid-range devices**: `quality: 'high'`, `targetFPS: 60`
- **Low-end devices**: `quality: 'medium'`, `targetFPS: 30`
- **Mobile devices**: `quality: 'low'`, `targetFPS: 30`, `adaptiveQuality: true`

## Error Handling

All components include comprehensive error handling:

```typescript
try {
  const visualParams = audioManager.processAudioFeatures(features, time);
} catch (error) {
  console.error('Audio processing failed:', error);
  // Fallback to default parameters
  const fallbackParams = audioManager.getDefaultParameters();
}
```

## Future Enhancements

The system is designed for extensibility:

- **Custom Effects**: Easy addition of new visual effects
- **Advanced Presets**: Support for complex preset configurations
- **Real-time Analysis**: Integration with live audio analysis
- **WebGL Optimization**: GPU-accelerated audio feature processing

## Support

For technical support and implementation questions:

- Check the integration tests in `/src/test/integration-test.js`
- Review the performance optimizer documentation
- Consult the existing visualization system documentation

---

**Version**: 1.0.0  
**Last Updated**: Story 5.8 Implementation  
**Compatibility**: All existing MIDI visualization presets and effects