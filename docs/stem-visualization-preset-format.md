# Stem Visualization Preset Format Documentation

**Story 5.3**: Stem-based Visualization Control - Preset Format Specification

## Overview

This document describes the complete format for stem visualization presets in the MidiViz application. Presets define how audio stems (drums, bass, vocals, piano, other) control visual parameters in real-time.

## Table of Contents

- [Preset Structure](#preset-structure)
- [Core Configuration](#core-configuration)
- [Stem Mappings](#stem-mappings)
- [Feature Types](#feature-types)
- [Visual Parameters](#visual-parameters)
- [Response Curves](#response-curves)
- [Default Settings](#default-settings)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Validation Rules](#validation-rules)

## Preset Structure

### Basic Preset Schema

```typescript
interface VisualizationPreset {
  // Identification
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description: string;           // Description of the preset
  
  // Categorization
  category: 'electronic' | 'rock' | 'classical' | 'ambient' | 'custom';
  tags: string[];               // Searchable tags
  
  // Configuration
  mappings: Record<StemType, StemVisualizationMapping>;
  defaultSettings: VisualizationSettings;
  
  // Metadata
  createdAt: string;            // ISO date string
  updatedAt: string;            // ISO date string
  userId?: string;              // Optional user ID
  isDefault: boolean;           // Whether this is a built-in preset
  usageCount: number;           // Usage statistics
}
```

### Stem Types

```typescript
type StemType = 'drums' | 'bass' | 'vocals' | 'piano' | 'other';
```

## Core Configuration

### Visualization Settings

```typescript
interface VisualizationSettings {
  masterIntensity: number;      // 0.0-3.0: Global intensity multiplier
  transitionSpeed: number;      // 0.0-1.0: Speed of parameter transitions
  backgroundAlpha: number;      // 0.0-1.0: Background transparency
  particleCount: number;        // 100-10000: Number of particles
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
}
```

### Example Default Settings

```json
{
  "masterIntensity": 1.0,
  "transitionSpeed": 0.5,
  "backgroundAlpha": 0.3,
  "particleCount": 5000,
  "qualityLevel": "medium"
}
```

## Stem Mappings

### Stem Mapping Structure

```typescript
interface StemVisualizationMapping {
  // Basic Properties
  stemType: StemType;
  enabled: boolean;             // Whether this stem is active
  priority: number;             // 1-5: Higher numbers have more influence
  globalMultiplier: number;     // 0.0-3.0: Overall intensity for this stem
  
  // Mix Controls
  crossfade: number;           // 0.0-1.0: Crossfade with other stems
  solo: boolean;               // Whether this stem is soloed
  mute: boolean;               // Whether this stem is muted
  
  // Feature Mappings
  features: {
    rhythm?: RhythmConfig;
    pitch?: PitchConfig;
    intensity?: IntensityConfig;
    timbre?: TimbreConfig;
  };
}
```

### Priority System

Stems with higher priority values (1-5) override lower priority stems when mapping to the same visual parameter:

- **Priority 5**: Dominant control (overrides all others)
- **Priority 4**: High influence
- **Priority 3**: Medium influence  
- **Priority 2**: Low influence
- **Priority 1**: Background influence

## Feature Types

### Rhythm Configuration

Maps rhythmic content (beats, tempo, groove) to visual parameters.

```typescript
interface RhythmConfig {
  target: 'scale' | 'rotation' | 'color' | 'emission' | 'position' | 'opacity';
  intensity: number;           // 0.0-2.0: Effect strength
  smoothing: number;          // 0.0-1.0: Temporal smoothing
  threshold: number;          // 0.0-1.0: Minimum value to trigger
  multiplier: number;         // 0.1-5.0: Scaling factor
}
```

**Best For**: Scale, rotation speed, particle emission

**Example**:
```json
{
  "target": "scale",
  "intensity": 0.8,
  "smoothing": 0.1,
  "threshold": 0.15,
  "multiplier": 1.5
}
```

### Pitch Configuration

Maps tonal content (fundamental frequency, harmonics) to visual parameters.

```typescript
interface PitchConfig {
  target: 'height' | 'hue' | 'brightness' | 'complexity' | 'color';
  range: [number, number];     // [min, max] output range
  response: 'linear' | 'exponential' | 'logarithmic';
  sensitivity: number;         // 0.0-2.0: Response sensitivity
  offset: number;             // -1.0-1.0: Base offset
}
```

**Best For**: Color hue, height, brightness, harmonic complexity

**Example**:
```json
{
  "target": "hue",
  "range": [0.2, 0.8],
  "response": "logarithmic",
  "sensitivity": 1.2,
  "offset": 0.0
}
```

### Intensity Configuration

Maps energy content (RMS, peak levels) to visual parameters with attack/decay.

```typescript
interface IntensityConfig {
  target: 'size' | 'opacity' | 'speed' | 'count' | 'brightness' | 'emission' | 'warmth' | 'scale' | 'rotation';
  threshold: number;          // 0.0-1.0: Activation threshold
  decay: number;             // 0.0-1.0: Decay rate (how fast it fades)
  attack: number;            // 0.0-1.0: Attack rate (how fast it builds)
  ceiling: number;           // 0.1-5.0: Maximum value
  curve: 'linear' | 'exponential' | 'curve';
}
```

**Best For**: Particle count, emission intensity, size scaling

**Example**:
```json
{
  "target": "emission",
  "threshold": 0.1,
  "decay": 0.2,
  "attack": 0.8,
  "ceiling": 2.0,
  "curve": "exponential"
}
```

### Timbre Configuration

Maps timbral qualities (spectral characteristics, texture) to visual parameters.

```typescript
interface TimbreConfig {
  target: 'texture' | 'warmth' | 'spread' | 'complexity';
  sensitivity: number;        // 0.0-2.0: Response sensitivity
  range: [number, number];    // [min, max] output range
  smoothing: number;         // 0.0-1.0: Temporal smoothing
  bias: number;              // -1.0-1.0: Response bias
}
```

**Best For**: Texture complexity, color warmth, spatial spread

**Example**:
```json
{
  "target": "warmth",
  "sensitivity": 0.7,
  "range": [0.3, 0.9],
  "smoothing": 0.3,
  "bias": 0.1
}
```

## Visual Parameters

### Available Target Parameters

| Parameter | Description | Range | Best Feature Types |
|-----------|-------------|-------|-------------------|
| `scale` | Overall size scaling | 0.1-5.0 | rhythm, intensity |
| `rotation` | Rotation speed | -5.0-5.0 | rhythm, intensity |
| `color` | Color intensity | 0.0-2.0 | rhythm, pitch |
| `emission` | Light emission | 0.0-3.0 | intensity, rhythm |
| `position` | Spatial movement | -2.0-2.0 | rhythm, timbre |
| `opacity` | Transparency | 0.0-1.0 | intensity, rhythm |
| `height` | Vertical position | 0.0-2.0 | pitch |
| `hue` | Color hue (0-1) | 0.0-1.0 | pitch |
| `brightness` | Light brightness | 0.0-2.0 | pitch, intensity |
| `complexity` | Geometric complexity | 0.0-2.0 | pitch, timbre |
| `size` | Particle/element size | 0.1-3.0 | intensity |
| `speed` | Animation speed | 0.1-3.0 | intensity, rhythm |
| `count` | Number of elements | 0.1-2.0 | intensity |
| `texture` | Surface complexity | 0.0-1.0 | timbre |
| `warmth` | Color temperature | 0.0-1.0 | timbre |
| `spread` | Spatial distribution | 0.0-2.0 | timbre |

## Response Curves

### Linear Response
- **Use**: Predictable, proportional response
- **Formula**: `output = input * scale + offset`
- **Best For**: Direct control, simple relationships

### Exponential Response  
- **Use**: Dramatic changes at high values
- **Formula**: `output = pow(input, exponent) * scale`
- **Best For**: Intensity effects, dramatic scaling

### Logarithmic Response
- **Use**: Sensitive to small changes, compressed large changes
- **Formula**: `output = log(input * scale + 1) / log(scale + 1)`
- **Best For**: Pitch mapping, perceptual scaling

### Curve Response
- **Use**: Custom S-curve for smooth transitions
- **Formula**: Custom smoothstep function
- **Best For**: Natural-feeling transitions

## Examples

### Electronic/EDM Preset

```json
{
  "id": "electronic-edm-v1",
  "name": "Electronic/EDM",
  "description": "High-energy electronic music with emphasis on rhythm and bass",
  "category": "electronic",
  "tags": ["edm", "electronic", "dance", "bass", "rhythmic"],
  "mappings": {
    "drums": {
      "stemType": "drums",
      "enabled": true,
      "priority": 4,
      "globalMultiplier": 1.2,
      "crossfade": 0.0,
      "solo": false,
      "mute": false,
      "features": {
        "rhythm": {
          "target": "scale",
          "intensity": 1.0,
          "smoothing": 0.05,
          "threshold": 0.2,
          "multiplier": 2.0
        },
        "intensity": {
          "target": "emission",
          "threshold": 0.15,
          "decay": 0.1,
          "attack": 0.9,
          "ceiling": 2.5,
          "curve": "exponential"
        }
      }
    },
    "bass": {
      "stemType": "bass",
      "enabled": true,
      "priority": 3,
      "globalMultiplier": 1.5,
      "crossfade": 0.0,
      "solo": false,
      "mute": false,
      "features": {
        "pitch": {
          "target": "hue",
          "range": [0.5, 0.9],
          "response": "logarithmic",
          "sensitivity": 1.0,
          "offset": 0.0
        },
        "intensity": {
          "target": "size",
          "threshold": 0.1,
          "decay": 0.2,
          "attack": 0.8,
          "ceiling": 2.0,
          "curve": "linear"
        }
      }
    }
  },
  "defaultSettings": {
    "masterIntensity": 1.3,
    "transitionSpeed": 0.7,
    "backgroundAlpha": 0.2,
    "particleCount": 8000,
    "qualityLevel": "high"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "isDefault": true,
  "usageCount": 0
}
```

### Classical/Orchestral Preset

```json
{
  "id": "classical-orchestral-v1",
  "name": "Classical/Orchestral",
  "description": "Elegant classical music with emphasis on melody and harmony",
  "category": "classical",
  "tags": ["classical", "orchestral", "elegant", "melodic"],
  "mappings": {
    "piano": {
      "stemType": "piano",
      "enabled": true,
      "priority": 3,
      "globalMultiplier": 1.0,
      "crossfade": 0.0,
      "solo": false,
      "mute": false,
      "features": {
        "pitch": {
          "target": "height",
          "range": [0.3, 1.8],
          "response": "linear",
          "sensitivity": 0.8,
          "offset": 0.2
        },
        "timbre": {
          "target": "complexity",
          "sensitivity": 0.6,
          "range": [0.4, 1.2],
          "smoothing": 0.4,
          "bias": 0.0
        }
      }
    },
    "other": {
      "stemType": "other",
      "enabled": true,
      "priority": 2,
      "globalMultiplier": 0.8,
      "crossfade": 0.0,
      "solo": false,
      "mute": false,
      "features": {
        "timbre": {
          "target": "warmth",
          "sensitivity": 0.5,
          "range": [0.6, 0.9],
          "smoothing": 0.5,
          "bias": 0.1
        }
      }
    }
  },
  "defaultSettings": {
    "masterIntensity": 0.8,
    "transitionSpeed": 0.3,
    "backgroundAlpha": 0.5,
    "particleCount": 3000,
    "qualityLevel": "medium"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "isDefault": true,
  "usageCount": 0
}
```

## Best Practices

### 1. Feature-to-Parameter Matching

**Rhythmic Stems (Drums)**:
- Use `rhythm` → `scale`, `rotation`, `emission`
- Use `intensity` → `size`, `count`, `brightness`

**Tonal Stems (Bass, Piano, Vocals)**:
- Use `pitch` → `hue`, `height`, `brightness`
- Use `timbre` → `warmth`, `texture`, `complexity`

**Percussive Elements**:
- Use high `attack` (0.7-0.9) and medium `decay` (0.2-0.4)
- Set lower `threshold` (0.1-0.2) for responsiveness

### 2. Priority Assignment

```
Priority 5: Lead vocals, main melody
Priority 4: Drums (kick, snare)
Priority 3: Bass, rhythm guitar  
Priority 2: Pad instruments, background vocals
Priority 1: Ambient elements, reverb tails
```

### 3. Smoothing Guidelines

| Element Type | Smoothing Range | Reason |
|--------------|----------------|---------|
| Percussion | 0.0 - 0.1 | Sharp, immediate response |
| Bass | 0.1 - 0.2 | Some smoothing for stability |
| Melody | 0.2 - 0.4 | Smooth musical phrases |
| Ambient | 0.4 - 0.6 | Slow, atmospheric changes |

### 4. Response Curve Selection

- **Linear**: Direct control, predictable response
- **Exponential**: Dramatic effects, intensity mapping
- **Logarithmic**: Pitch mapping, perceptual scaling
- **Curve**: Natural transitions, musical phrasing

### 5. Performance Considerations

**High Performance**:
- Limit active features per stem (2-3 maximum)
- Use higher `threshold` values (0.15+) to reduce unnecessary updates
- Prefer `linear` curves for better performance

**Visual Quality**:
- Use appropriate `smoothing` for musical content
- Match `attack`/`decay` to instrument characteristics
- Consider cross-stem interactions

## Validation Rules

### Required Fields
- `id`: Non-empty string, unique within system
- `name`: Non-empty string, max 100 characters
- `description`: Max 500 characters
- `category`: Valid category enum value
- `mappings`: At least one enabled stem mapping

### Value Ranges
```typescript
// Stem Mapping Validation
globalMultiplier: 0.0 <= value <= 3.0
priority: 1 <= value <= 5
crossfade: 0.0 <= value <= 1.0

// Feature Configuration Validation
intensity: 0.0 <= value <= 2.0
smoothing: 0.0 <= value <= 1.0  
threshold: 0.0 <= value <= 1.0
multiplier: 0.1 <= value <= 5.0
sensitivity: 0.0 <= value <= 2.0
attack: 0.0 <= value <= 1.0
decay: 0.0 <= value <= 1.0
ceiling: 0.1 <= value <= 5.0

// Settings Validation
masterIntensity: 0.0 <= value <= 3.0
transitionSpeed: 0.0 <= value <= 1.0
backgroundAlpha: 0.0 <= value <= 1.0
particleCount: 100 <= value <= 10000
```

### Logical Constraints
- Cannot have both `solo: true` and `mute: true`
- At least one stem must be enabled
- `range[0]` must be less than `range[1]`
- `attack + decay` should not exceed 2.0 for natural response

## Migration and Versioning

### Preset Version History

When updating preset format:
1. Increment format version
2. Provide migration functions for older versions
3. Maintain backward compatibility when possible

### Format Version 1.0 (Current)
- Initial implementation
- Supports all documented features
- JSON serialization format

## File Format

### JSON Export Format

```json
{
  "version": "1.0.0",
  "exportDate": "2024-01-01T12:00:00Z",
  "presets": [
    {
      // Preset object as documented above
    }
  ],
  "metadata": {
    "totalPresets": 1,
    "categories": ["electronic"],
    "exportedBy": "MidiViz Preset Manager"
  }
}
```

### Import Validation

When importing presets:
1. Validate JSON structure
2. Check version compatibility  
3. Validate all field ranges
4. Apply migration if needed
5. Check for ID conflicts
6. Validate cross-references

## Troubleshooting

### Common Issues

**No Visual Response**:
- Check `threshold` - may be too high
- Verify `enabled: true` for stem
- Check `globalMultiplier` > 0
- Ensure stem isn't muted

**Jittery Animation**:
- Increase `smoothing` value (0.2-0.4)
- Check `threshold` - may be too low
- Consider using `curve` response type

**Weak Visual Impact**:
- Increase `intensity` or `globalMultiplier`
- Lower `threshold` value
- Increase `ceiling` for intensity features
- Check stem `priority` levels

**Performance Issues**:
- Reduce number of active features
- Increase `threshold` values
- Use `linear` response curves
- Lower `particleCount` in settings

---

*This document covers preset format version 1.0. For the latest updates and examples, see the MidiViz documentation repository.*