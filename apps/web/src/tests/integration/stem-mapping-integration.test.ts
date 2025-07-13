// Integration Tests for Story 5.3: Stem-based Visualization Control
// Tests the complete mapping system from audio analysis to visual parameters

import { StemVisualizationController } from '@/lib/stem-visualization-controller';
import { presetManager } from '@/lib/preset-manager';
import { AudioVisualizationBridge } from '@/lib/audio-visualization-bridge';
import { 
  DEFAULT_PRESETS, 
  ELECTRONIC_PRESET, 
  ROCK_PRESET, 
  CLASSICAL_PRESET, 
  AMBIENT_PRESET 
} from '@/lib/default-visualization-mappings';

import {
  VisualizationPreset,
  StemVisualizationMapping,
  VisualizationState,
  DEFAULT_VISUALIZATION_STATE
} from '@/types/stem-visualization';
import { AudioFeature } from '@/types/stem-audio-analysis';

// Mock implementations for testing
class MockVisualizerManager {
  private state: Record<string, any> = {};
  private updateCount = 0;
  
  setGlobalScale(value: number) { 
    this.state.scale = value; 
    this.updateCount++;
  }
  setRotationSpeed(value: number) { 
    this.state.rotationSpeed = value; 
    this.updateCount++;
  }
  setColorIntensity(value: number) { 
    this.state.colorIntensity = value; 
    this.updateCount++;
  }
  setEmissionIntensity(value: number) { 
    this.state.emission = value; 
    this.updateCount++;
  }
  setOpacity(value: number) { 
    this.state.opacity = value; 
    this.updateCount++;
  }
  setParticleCount(value: number) { 
    this.state.particleCount = value; 
    this.updateCount++;
  }
  
  getState() { return { ...this.state }; }
  getUpdateCount() { return this.updateCount; }
  reset() { 
    this.state = {}; 
    this.updateCount = 0; 
  }
}

// Test utilities
function createTestAudioFeatures(
  stemType: string, 
  intensity: number = 0.5,
  featureTypes: string[] = ['rhythm', 'pitch', 'intensity', 'timbre']
): AudioFeature[] {
  return featureTypes.map(type => ({
    type: type as any,
    value: intensity * (0.8 + Math.random() * 0.4), // Add some variation
    confidence: 0.9,
    timestamp: performance.now()
  }));
}

function createTestMapping(
  stemType: string, 
  overrides: Partial<StemVisualizationMapping> = {}
): StemVisualizationMapping {
  const baseMapping: StemVisualizationMapping = {
    stemType: stemType as any,
    enabled: true,
    priority: 1,
    globalMultiplier: 1.0,
    crossfade: 0.0,
    solo: false,
    mute: false,
    features: {
      rhythm: {
        target: 'scale',
        intensity: 0.8,
        smoothing: 0.1,
        threshold: 0.15,
        multiplier: 1.0
      },
      intensity: {
        target: 'size',
        threshold: 0.1,
        decay: 0.2,
        attack: 0.5,
        ceiling: 2.0,
        curve: 'linear'
      }
    }
  };
  
  return { ...baseMapping, ...overrides };
}

describe('Stem Mapping Integration Tests', () => {
  let mockVisualizer: MockVisualizerManager;
  let controller: StemVisualizationController;

  beforeEach(() => {
    mockVisualizer = new MockVisualizerManager();
    controller = new StemVisualizationController(mockVisualizer as any);
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('Core Mapping Functionality', () => {
    test('should map rhythm features to scale parameter', async () => {
      // Setup mapping
      const drumsMapping = createTestMapping('drums', {
        features: {
          rhythm: {
            target: 'scale',
            intensity: 1.0,
            smoothing: 0.0, // No smoothing for immediate response
            threshold: 0.0,
            multiplier: 2.0
          }
        }
      });

      controller.addStemMapping('drums', drumsMapping);

      // Create rhythm features with increasing intensity
      const intensities = [0.2, 0.5, 0.8];
      const scaleValues: number[] = [];

      for (const intensity of intensities) {
        const features = createTestAudioFeatures('drums', intensity, ['rhythm']);
        controller.updateStemFeatures('drums', features);
        controller.updateVisualization(performance.now());
        
        scaleValues.push(controller.getCurrentState().scale);
      }

      // Verify scale increases with rhythm intensity
      expect(scaleValues[0]).toBeLessThan(scaleValues[1]);
      expect(scaleValues[1]).toBeLessThan(scaleValues[2]);
      expect(scaleValues[2]).toBeGreaterThan(DEFAULT_VISUALIZATION_STATE.scale);

      console.log('🥁 Rhythm → Scale mapping:', scaleValues);
    });

    test('should map pitch features to height parameter', async () => {
      const bassMapping = createTestMapping('bass', {
        features: {
          pitch: {
            target: 'height',
            range: [0.5, 2.0],
            response: 'linear',
            sensitivity: 1.0,
            offset: 0.0
          }
        }
      });

      controller.addStemMapping('bass', bassMapping);

      // Test different pitch values
      const pitchValues = [0.1, 0.5, 0.9];
      const heightValues: number[] = [];

      for (const pitch of pitchValues) {
        const features = createTestAudioFeatures('bass', pitch, ['pitch']);
        controller.updateStemFeatures('bass', features);
        controller.updateVisualization(performance.now());
        
        heightValues.push(controller.getCurrentState().height);
      }

      // Verify height increases with pitch
      expect(heightValues[0]).toBeLessThan(heightValues[1]);
      expect(heightValues[1]).toBeLessThan(heightValues[2]);

      console.log('🎸 Pitch → Height mapping:', heightValues);
    });

    test('should map intensity features with attack and decay', async () => {
      const vocalsMapping = createTestMapping('vocals', {
        features: {
          intensity: {
            target: 'brightness',
            threshold: 0.1,
            decay: 0.3,
            attack: 0.8,
            ceiling: 2.0,
            curve: 'exponential'
          }
        }
      });

      controller.addStemMapping('vocals', vocalsMapping);

      // Test attack phase
      const highIntensity = createTestAudioFeatures('vocals', 0.9, ['intensity']);
      controller.updateStemFeatures('vocals', highIntensity);
      controller.updateVisualization(performance.now());
      
      const attackBrightness = controller.getCurrentState().brightness;

      // Test decay phase (low intensity)
      const lowIntensity = createTestAudioFeatures('vocals', 0.05, ['intensity']);
      controller.updateStemFeatures('vocals', lowIntensity);
      
      // Multiple updates to see decay
      const decayValues: number[] = [];
      for (let i = 0; i < 5; i++) {
        controller.updateVisualization(performance.now());
        decayValues.push(controller.getCurrentState().brightness);
      }

      // Verify attack increased brightness
      expect(attackBrightness).toBeGreaterThan(DEFAULT_VISUALIZATION_STATE.brightness);

      // Verify decay decreased brightness
      expect(decayValues[0]).toBeGreaterThan(decayValues[decayValues.length - 1]);

      console.log('🎤 Attack/Decay mapping:', { attack: attackBrightness, decay: decayValues });
    });
  });

  describe('Multi-Stem Coordination', () => {
    test('should handle multiple stems with different priorities', async () => {
      // Setup multiple stems with different priorities
      const drumMapping = createTestMapping('drums', {
        priority: 3,
        features: {
          rhythm: {
            target: 'scale',
            intensity: 0.8,
            smoothing: 0.0,
            threshold: 0.1,
            multiplier: 1.0
          }
        }
      });

      const bassMapping = createTestMapping('bass', {
        priority: 1,
        features: {
          rhythm: {
            target: 'scale',
            intensity: 0.6,
            smoothing: 0.0,
            threshold: 0.1,
            multiplier: 1.0
          }
        }
      });

      controller.addStemMapping('drums', drumMapping);
      controller.addStemMapping('bass', bassMapping);

      // Update both stems
      const drumFeatures = createTestAudioFeatures('drums', 0.7, ['rhythm']);
      const bassFeatures = createTestAudioFeatures('bass', 0.8, ['rhythm']);

      controller.updateStemFeatures('drums', drumFeatures);
      controller.updateStemFeatures('bass', bassFeatures);
      controller.updateVisualization(performance.now());

      const finalScale = controller.getCurrentState().scale;

      // Higher priority drums should have more influence
      expect(finalScale).toBeGreaterThan(DEFAULT_VISUALIZATION_STATE.scale);
      expect(mockVisualizer.getUpdateCount()).toBeGreaterThan(0);

      console.log('🎵 Multi-stem coordination scale:', finalScale);
    });

    test('should handle stem mute and solo operations', async () => {
      // Setup two stems
      const drumMapping = createTestMapping('drums');
      const bassMapping = createTestMapping('bass');

      controller.addStemMapping('drums', drumMapping);
      controller.addStemMapping('bass', bassMapping);

      // Test with both stems active
      controller.updateStemFeatures('drums', createTestAudioFeatures('drums', 0.8));
      controller.updateStemFeatures('bass', createTestAudioFeatures('bass', 0.8));
      controller.updateVisualization(performance.now());

      const bothActiveUpdates = mockVisualizer.getUpdateCount();
      mockVisualizer.reset();

      // Test with drums muted
      controller.setStemMute('drums', true);
      controller.updateStemFeatures('drums', createTestAudioFeatures('drums', 0.8));
      controller.updateStemFeatures('bass', createTestAudioFeatures('bass', 0.8));
      controller.updateVisualization(performance.now());

      const drumMutedUpdates = mockVisualizer.getUpdateCount();
      mockVisualizer.reset();

      // Test with bass solo
      controller.setStemMute('drums', false);
      controller.setStemSolo('bass', true);
      controller.updateStemFeatures('drums', createTestAudioFeatures('drums', 0.8));
      controller.updateStemFeatures('bass', createTestAudioFeatures('bass', 0.8));
      controller.updateVisualization(performance.now());

      const bassSoloUpdates = mockVisualizer.getUpdateCount();

      // Verify different update counts based on mute/solo state
      expect(drumMutedUpdates).toBeLessThanOrEqual(bothActiveUpdates);
      expect(bassSoloUpdates).toBeGreaterThan(0);

      console.log('🔇 Mute/Solo operations:', { 
        both: bothActiveUpdates, 
        muted: drumMutedUpdates, 
        solo: bassSoloUpdates 
      });
    });
  });

  describe('Preset System Integration', () => {
    test('should apply default presets correctly', async () => {
      const testResults: Record<string, any> = {};

      for (const preset of DEFAULT_PRESETS) {
        mockVisualizer.reset();

        // Apply preset mappings
        Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
          controller.addStemMapping(stemType, mapping);
        });

        // Generate features for all stems
        Object.keys(preset.mappings).forEach(stemType => {
          const features = createTestAudioFeatures(stemType, 0.6);
          controller.updateStemFeatures(stemType, features);
        });

        controller.updateVisualization(performance.now());

        testResults[preset.name] = {
          state: controller.getCurrentState(),
          updates: mockVisualizer.getUpdateCount(),
          category: preset.category
        };

        // Clear mappings for next test
        Object.keys(preset.mappings).forEach(stemType => {
          controller.removeStemMapping(stemType);
        });
      }

      // Verify each preset produced different results
      const presetNames = Object.keys(testResults);
      for (let i = 0; i < presetNames.length - 1; i++) {
        const preset1 = testResults[presetNames[i]];
        const preset2 = testResults[presetNames[i + 1]];
        
        // States should be different (at least one parameter)
        const isDifferent = Object.keys(preset1.state).some(key => 
          preset1.state[key] !== preset2.state[key]
        );
        expect(isDifferent).toBe(true);
      }

      console.log('🎨 Preset test results:', Object.keys(testResults));
    });

    test('should save and load custom presets', async () => {
      // Create custom mapping
      const customMapping = createTestMapping('drums', {
        features: {
          rhythm: {
            target: 'emission',
            intensity: 1.5,
            smoothing: 0.05,
            threshold: 0.2,
            multiplier: 2.5
          }
        }
      });

      const customMappings = { drums: customMapping };

      // Save custom preset
      const result = await presetManager.createPreset(
        'Test Custom Preset',
        'Testing custom preset functionality',
        customMappings,
        { tags: ['test', 'custom'] }
      );

      expect(result.success).toBe(true);
      expect(result.preset).toBeDefined();

      // Load and apply the preset
      if (result.preset) {
        Object.entries(result.preset.mappings).forEach(([stemType, mapping]) => {
          controller.addStemMapping(stemType, mapping);
        });

        // Test the custom mapping
        const features = createTestAudioFeatures('drums', 0.8, ['rhythm']);
        controller.updateStemFeatures('drums', features);
        controller.updateVisualization(performance.now());

        const state = controller.getCurrentState();
        expect(state.emission).toBeGreaterThan(DEFAULT_VISUALIZATION_STATE.emission);

        // Clean up
        await presetManager.deletePreset(result.preset.id);
      }

      console.log('💾 Custom preset test completed');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle rapid feature updates efficiently', async () => {
      const mapping = createTestMapping('drums');
      controller.addStemMapping('drums', mapping);

      const startTime = performance.now();
      const updateCount = 100;

      // Rapid updates
      for (let i = 0; i < updateCount; i++) {
        const features = createTestAudioFeatures('drums', Math.random());
        controller.updateStemFeatures('drums', features);
        controller.updateVisualization(performance.now());
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerUpdate = totalTime / updateCount;

      // Should handle updates efficiently (less than 5ms per update on average)
      expect(avgTimePerUpdate).toBeLessThan(5);

      console.log(`⚡ Performance test: ${avgTimePerUpdate.toFixed(2)}ms per update`);
    });

    test('should handle empty and invalid features gracefully', async () => {
      const mapping = createTestMapping('drums');
      controller.addStemMapping('drums', mapping);

      // Test empty features
      expect(() => {
        controller.updateStemFeatures('drums', []);
        controller.updateVisualization(performance.now());
      }).not.toThrow();

      // Test invalid features
      const invalidFeatures: AudioFeature[] = [
        {
          type: 'rhythm',
          value: NaN,
          confidence: -1,
          timestamp: performance.now()
        }
      ];

      expect(() => {
        controller.updateStemFeatures('drums', invalidFeatures);
        controller.updateVisualization(performance.now());
      }).not.toThrow();

      console.log('🛡️ Edge case handling test passed');
    });

    test('should maintain stable memory usage', async () => {
      const mapping = createTestMapping('drums');
      controller.addStemMapping('drums', mapping);

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Run many updates
      for (let i = 0; i < 1000; i++) {
        const features = createTestAudioFeatures('drums', Math.random());
        controller.updateStemFeatures('drums', features);
        controller.updateVisualization(performance.now());
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = (finalMemory - initialMemory) / (1024 * 1024); // MB

      // Memory growth should be minimal (less than 5MB)
      if (initialMemory > 0) {
        expect(memoryGrowth).toBeLessThan(5);
        console.log(`📊 Memory growth: ${memoryGrowth.toFixed(2)}MB`);
      }
    });
  });

  describe('Feature Response Curves', () => {
    test('should apply different response curves correctly', async () => {
      const curves = ['linear', 'exponential', 'curve'] as const;
      const results: Record<string, number[]> = {};

      for (const curve of curves) {
        const mapping = createTestMapping('test', {
          features: {
            intensity: {
              target: 'size',
              threshold: 0.0,
              decay: 0.0,
              attack: 1.0,
              ceiling: 5.0,
              curve
            }
          }
        });

        controller.addStemMapping('test', mapping);

        const values: number[] = [];
        const intensities = [0.2, 0.4, 0.6, 0.8];

        for (const intensity of intensities) {
          const features = createTestAudioFeatures('test', intensity, ['intensity']);
          controller.updateStemFeatures('test', features);
          controller.updateVisualization(performance.now());
          values.push(controller.getCurrentState().size);
        }

        results[curve] = values;
        controller.removeStemMapping('test');
      }

      // Verify different curves produce different results
      expect(results.linear).not.toEqual(results.exponential);
      expect(results.exponential).not.toEqual(results.curve);

      // Exponential should grow faster at higher values
      const linearGrowth = results.linear[3] - results.linear[0];
      const expGrowth = results.exponential[3] - results.exponential[0];
      expect(expGrowth).toBeGreaterThan(linearGrowth);

      console.log('📈 Response curves test:', results);
    });
  });

  describe('State Interpolation', () => {
    test('should provide smooth state transitions', async () => {
      const mapping = createTestMapping('test', {
        features: {
          intensity: {
            target: 'scale',
            threshold: 0.0,
            decay: 0.0,
            attack: 1.0,
            ceiling: 3.0,
            curve: 'linear'
          }
        }
      });

      controller.addStemMapping('test', mapping);

      // Start with low intensity
      controller.updateStemFeatures('test', createTestAudioFeatures('test', 0.1, ['intensity']));
      controller.updateVisualization(performance.now());
      const lowScale = controller.getCurrentState().scale;

      // Jump to high intensity
      controller.updateStemFeatures('test', createTestAudioFeatures('test', 0.9, ['intensity']));
      
      // Capture intermediate values during interpolation
      const scaleValues: number[] = [];
      for (let i = 0; i < 10; i++) {
        controller.updateVisualization(performance.now() + i * 16);
        scaleValues.push(controller.getCurrentState().scale);
      }

      // Verify smooth transition (no large jumps)
      for (let i = 1; i < scaleValues.length; i++) {
        const change = Math.abs(scaleValues[i] - scaleValues[i - 1]);
        expect(change).toBeLessThan(1.0); // Max change per frame
      }

      // Verify overall progression
      expect(scaleValues[0]).toBe(lowScale);
      expect(scaleValues[scaleValues.length - 1]).toBeGreaterThan(lowScale);

      console.log('🌊 Smooth transition values:', scaleValues);
    });
  });
});

describe('Preset Manager Integration', () => {
  beforeEach(async () => {
    // Clear any existing custom presets
    await presetManager.clearAllCustomPresets();
  });

  test('should manage preset lifecycle correctly', async () => {
    // Create
    const createResult = await presetManager.createPreset(
      'Test Lifecycle Preset',
      'Testing preset lifecycle',
      { drums: createTestMapping('drums') }
    );

    expect(createResult.success).toBe(true);
    const presetId = createResult.preset!.id;

    // Read
    const loadedPreset = await presetManager.getPreset(presetId);
    expect(loadedPreset).toBeDefined();
    expect(loadedPreset!.name).toBe('Test Lifecycle Preset');

    // Update
    const updateResult = await presetManager.updatePreset(presetId, {
      description: 'Updated description'
    });
    expect(updateResult.success).toBe(true);

    // Verify update
    const updatedPreset = await presetManager.getPreset(presetId);
    expect(updatedPreset!.description).toBe('Updated description');

    // Delete
    const deleteResult = await presetManager.deletePreset(presetId);
    expect(deleteResult.success).toBe(true);

    // Verify deletion
    const deletedPreset = await presetManager.getPreset(presetId);
    expect(deletedPreset).toBeNull();

    console.log('♻️ Preset lifecycle test completed');
  });

  test('should handle preset favorites and usage tracking', async () => {
    const createResult = await presetManager.createPreset(
      'Favorite Test Preset',
      'Testing favorites',
      { drums: createTestMapping('drums') }
    );

    const presetId = createResult.preset!.id;

    // Test favorites
    expect(presetManager.isFavorite(presetId)).toBe(false);
    
    const favorited = await presetManager.toggleFavorite(presetId);
    expect(favorited).toBe(true);
    expect(presetManager.isFavorite(presetId)).toBe(true);

    // Test usage tracking
    await presetManager.recordUsage(presetId, 5000); // 5 seconds
    await presetManager.recordUsage(presetId, 3000); // 3 seconds

    const stats = presetManager.getUsageStats(presetId);
    expect(stats).toBeDefined();
    expect(stats!.usageCount).toBe(2);
    expect(stats!.totalTimeUsed).toBe(8000);

    // Cleanup
    await presetManager.deletePreset(presetId);

    console.log('⭐ Favorites and usage test completed');
  });
});

console.log('🧪 Stem mapping integration tests loaded');