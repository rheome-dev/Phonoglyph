// Performance Tests for Story 5.3: Stem-based Visualization Control
// Validates response times, memory usage, and smooth transitions

import { StemVisualizationController } from '@/lib/stem-visualization-controller';
import { 
  DEFAULT_PRESETS, 
  ELECTRONIC_PRESET, 
  getPresetById 
} from '@/lib/default-visualization-mappings';
import { 
  VisualizationPreset, 
  VisualizationConfig,
  VisualizationMetrics,
  StemVisualizationMapping 
} from '@/types/stem-visualization';
import { AudioFeature } from '@/types/stem-audio-analysis';

// Mock VisualizerManager for testing
class MockVisualizerManager {
  private state: Record<string, any> = {};
  
  setGlobalScale(value: number) { this.state.scale = value; }
  setRotationSpeed(value: number) { this.state.rotationSpeed = value; }
  setColorIntensity(value: number) { this.state.colorIntensity = value; }
  setEmissionIntensity(value: number) { this.state.emission = value; }
  setOpacity(value: number) { this.state.opacity = value; }
  setParticleCount(value: number) { this.state.particleCount = value; }
  setComplexity(value: number) { this.state.complexity = value; }
  
  getState() { return { ...this.state }; }
}

// Mock audio features for testing
function createMockAudioFeatures(stemType: string, intensity: number = 0.5): AudioFeature[] {
  const baseFeatures: AudioFeature[] = [
    {
      type: 'rhythm',
      value: intensity * 0.8,
      confidence: 0.9,
      timestamp: performance.now()
    },
    {
      type: 'pitch',
      value: intensity * 0.6,
      confidence: 0.85,
      timestamp: performance.now()
    },
    {
      type: 'intensity',
      value: intensity,
      confidence: 0.95,
      timestamp: performance.now()
    },
    {
      type: 'timbre',
      value: intensity * 0.7,
      confidence: 0.8,
      timestamp: performance.now()
    }
  ];
  
  return baseFeatures;
}

describe('StemVisualizationController Performance Tests', () => {
  let controller: StemVisualizationController;
  let mockVisualizer: MockVisualizerManager;
  let testConfig: VisualizationConfig;

  beforeEach(() => {
    mockVisualizer = new MockVisualizerManager();
    
    testConfig = {
      targetFrameRate: 60,
      maxUpdatesPerFrame: 10,
      smoothingEnabled: true,
      interpolationQuality: 'high',
      maxParticleCount: 10000,
      maxEffectComplexity: 1.0,
      enablePostProcessing: true,
      enableCrossfade: true,
      defaultSmoothingFactor: 0.15,
      parameterUpdateThreshold: 0.001,
      enableDebugMode: false,
      showParameterValues: false,
      logMappingUpdates: false
    };
    
    controller = new StemVisualizationController(mockVisualizer as any, testConfig);
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('Response Time Requirements', () => {
    test('should process stem mapping updates within 16ms', async () => {
      // Load default electronic preset
      const preset = ELECTRONIC_PRESET;
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
      });

      // Prepare test data
      const stems = ['drums', 'bass', 'vocals', 'piano', 'other'];
      const features = stems.map(stem => ({
        stemType: stem,
        features: createMockAudioFeatures(stem, Math.random())
      }));

      // Update features
      features.forEach(({ stemType, features }) => {
        controller.updateStemFeatures(stemType, features);
      });

      // Measure update performance
      const startTime = performance.now();
      const timestamp = performance.now();
      
      // Perform visualization update
      controller.updateVisualization(timestamp);
      
      const updateTime = performance.now() - startTime;
      
      // Should complete within 16ms (60fps target)
      expect(updateTime).toBeLessThan(16);
      console.log(`✅ Update completed in ${updateTime.toFixed(2)}ms`);
    });

    test('should handle high-frequency updates efficiently', async () => {
      // Setup mappings
      const preset = ELECTRONIC_PRESET;
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
      });

      const updateTimes: number[] = [];
      const targetUpdates = 100;
      
      // Simulate 100 consecutive updates
      for (let i = 0; i < targetUpdates; i++) {
        // Generate varying audio features
        const stems = ['drums', 'bass', 'vocals'];
        stems.forEach(stemType => {
          const features = createMockAudioFeatures(stemType, Math.sin(i * 0.1) * 0.5 + 0.5);
          controller.updateStemFeatures(stemType, features);
        });

        const startTime = performance.now();
        controller.updateVisualization(performance.now());
        const updateTime = performance.now() - startTime;
        
        updateTimes.push(updateTime);
      }

      // Calculate statistics
      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      const maxUpdateTime = Math.max(...updateTimes);
      const minUpdateTime = Math.min(...updateTimes);

      // Performance assertions
      expect(avgUpdateTime).toBeLessThan(8); // Target average well below 16ms
      expect(maxUpdateTime).toBeLessThan(16); // No single update should exceed 16ms
      expect(updateTimes.filter(time => time > 10).length).toBeLessThan(targetUpdates * 0.1); // Less than 10% slow updates

      console.log(`📊 Update performance (${targetUpdates} updates):`);
      console.log(`  Average: ${avgUpdateTime.toFixed(2)}ms`);
      console.log(`  Min: ${minUpdateTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxUpdateTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Management', () => {
    test('should maintain stable memory usage during long sessions', async () => {
      // Setup mappings for all stems
      const preset = ELECTRONIC_PRESET;
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memorySnapshots: number[] = [];

      // Simulate 10 minutes of updates (60fps = 36,000 updates)
      const totalUpdates = 1000; // Reduced for test performance
      
      for (let i = 0; i < totalUpdates; i++) {
        // Generate realistic audio features with variation
        ['drums', 'bass', 'vocals', 'piano', 'other'].forEach(stemType => {
          const intensity = Math.sin(i * 0.05) * Math.cos(i * 0.03) * 0.5 + 0.5;
          const features = createMockAudioFeatures(stemType, intensity);
          controller.updateStemFeatures(stemType, features);
        });

        controller.updateVisualization(performance.now());

        // Take memory snapshots every 100 updates
        if (i % 100 === 0 && (performance as any).memory) {
          memorySnapshots.push((performance as any).memory.usedJSHeapSize);
        }
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      if (memorySnapshots.length > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        const memoryGrowthMB = memoryGrowth / (1024 * 1024);
        
        // Memory growth should be minimal (less than 10MB for extended session)
        expect(memoryGrowthMB).toBeLessThan(10);
        console.log(`📈 Memory usage after ${totalUpdates} updates: +${memoryGrowthMB.toFixed(2)}MB`);
      }
    });

    test('should clean up resources on dispose', () => {
      // Add mappings and features
      const preset = ELECTRONIC_PRESET;
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
        controller.updateStemFeatures(stemType, createMockAudioFeatures(stemType));
      });

      // Verify resources are present
      expect(controller.getCurrentState()).toBeDefined();
      expect(controller.getMetrics()).toBeDefined();

      // Dispose and verify cleanup
      controller.dispose();
      
      // After disposal, the controller should still be safe to call but inactive
      expect(() => controller.getCurrentState()).not.toThrow();
      expect(() => controller.getMetrics()).not.toThrow();
    });
  });

  describe('Smooth Transitions', () => {
    test('should provide smooth parameter interpolation', async () => {
      // Setup basic mapping
      const drumsMapping: StemVisualizationMapping = {
        stemType: 'drums',
        enabled: true,
        priority: 1,
        globalMultiplier: 1.0,
        crossfade: 0.0,
        solo: false,
        mute: false,
        features: {
          intensity: {
            target: 'scale',
            threshold: 0.1,
            decay: 0.2,
            attack: 0.5,
            ceiling: 2.0,
            curve: 'linear'
          }
        }
      };

      controller.addStemMapping('drums', drumsMapping);

      // Test smooth transition from low to high intensity
      const scaleValues: number[] = [];
      const steps = 20;
      
      for (let i = 0; i <= steps; i++) {
        const intensity = i / steps; // 0 to 1
        const features = createMockAudioFeatures('drums', intensity);
        controller.updateStemFeatures('drums', features);
        
        // Multiple updates to allow interpolation
        for (let j = 0; j < 3; j++) {
          controller.updateVisualization(performance.now());
        }
        
        scaleValues.push(controller.getCurrentState().scale);
      }

      // Verify smooth progression (no large jumps)
      for (let i = 1; i < scaleValues.length; i++) {
        const change = Math.abs(scaleValues[i] - scaleValues[i - 1]);
        expect(change).toBeLessThan(0.5); // Max change per step
      }

      // Verify overall progression
      expect(scaleValues[0]).toBeLessThan(scaleValues[scaleValues.length - 1]);
      console.log(`🌊 Scale transition: ${scaleValues[0].toFixed(3)} → ${scaleValues[scaleValues.length - 1].toFixed(3)}`);
    });

    test('should handle rapid parameter changes gracefully', async () => {
      const bassMapping: StemVisualizationMapping = {
        stemType: 'bass',
        enabled: true,
        priority: 1,
        globalMultiplier: 1.0,
        crossfade: 0.0,
        solo: false,
        mute: false,
        features: {
          pitch: {
            target: 'height',
            range: [0.1, 2.0],
            response: 'linear',
            sensitivity: 0.8,
            offset: 0.0
          }
        }
      };

      controller.addStemMapping('bass', bassMapping);

      const heightValues: number[] = [];
      
      // Simulate rapid changes (square wave pattern)
      for (let i = 0; i < 20; i++) {
        const intensity = i % 4 < 2 ? 0.1 : 0.9; // Rapid alternation
        const features = createMockAudioFeatures('bass', intensity);
        controller.updateStemFeatures('bass', features);
        
        controller.updateVisualization(performance.now());
        heightValues.push(controller.getCurrentState().height);
      }

      // Should not have extreme jumps due to smoothing
      let maxChange = 0;
      for (let i = 1; i < heightValues.length; i++) {
        const change = Math.abs(heightValues[i] - heightValues[i - 1]);
        maxChange = Math.max(maxChange, change);
      }

      expect(maxChange).toBeLessThan(1.0); // Smoothing should limit rapid changes
      console.log(`⚡ Max height change per frame: ${maxChange.toFixed(3)}`);
    });
  });

  describe('Preset System Performance', () => {
    test('should load presets quickly', async () => {
      const loadTimes: number[] = [];

      for (const preset of DEFAULT_PRESETS) {
        const startTime = performance.now();
        
        // Load preset mappings
        Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
          controller.addStemMapping(stemType, mapping);
        });
        
        const loadTime = performance.now() - startTime;
        loadTimes.push(loadTime);
        
        // Expect preset load to complete in under 5ms
        expect(loadTime).toBeLessThan(5);
      }

      const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      console.log(`⚡ Preset loading performance:`);
      console.log(`  Average: ${avgLoadTime.toFixed(2)}ms`);
      console.log(`  Total presets: ${DEFAULT_PRESETS.length}`);
    });

    test('should switch between presets smoothly', async () => {
      // Load initial preset
      const preset1 = ELECTRONIC_PRESET;
      Object.entries(preset1.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
      });

      // Generate some audio features
      const features = createMockAudioFeatures('drums', 0.7);
      controller.updateStemFeatures('drums', features);
      controller.updateVisualization(performance.now());

      const state1 = controller.getCurrentState();

      // Switch to different preset
      const preset2 = getPresetById('classical-default')!;
      const switchStartTime = performance.now();
      
      Object.entries(preset2.mappings).forEach(([stemType, mapping]) => {
        controller.updateStemMapping(stemType, mapping);
      });
      
      const switchTime = performance.now() - switchStartTime;

      // Update and check new state
      controller.updateVisualization(performance.now());
      const state2 = controller.getCurrentState();

      expect(switchTime).toBeLessThan(5); // Quick preset switching
      expect(state1).not.toEqual(state2); // State should change
      console.log(`🔄 Preset switch completed in ${switchTime.toFixed(2)}ms`);
    });
  });

  describe('Multi-Stem Coordination', () => {
    test('should handle 5 concurrent stems efficiently', async () => {
      // Load full preset with all stems
      const preset = ELECTRONIC_PRESET;
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
      });

      const stems = ['drums', 'bass', 'vocals', 'piano', 'other'];
      const updateTimes: number[] = [];

      // Test multiple updates with all stems active
      for (let i = 0; i < 50; i++) {
        // Update all stems with different intensities
        stems.forEach((stemType, index) => {
          const phase = (i + index * 10) * 0.1;
          const intensity = Math.sin(phase) * 0.5 + 0.5;
          const features = createMockAudioFeatures(stemType, intensity);
          controller.updateStemFeatures(stemType, features);
        });

        const startTime = performance.now();
        controller.updateVisualization(performance.now());
        const updateTime = performance.now() - startTime;
        
        updateTimes.push(updateTime);
      }

      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      const maxUpdateTime = Math.max(...updateTimes);

      // Should handle 5 stems within performance targets
      expect(avgUpdateTime).toBeLessThan(12); // Target for 5 stems
      expect(maxUpdateTime).toBeLessThan(16); // Never exceed frame budget

      console.log(`🎵 5-stem performance:`);
      console.log(`  Average: ${avgUpdateTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxUpdateTime.toFixed(2)}ms`);
    });

    test('should handle stem mute/solo operations efficiently', async () => {
      // Setup all stems
      const preset = ELECTRONIC_PRESET;
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
        controller.updateStemFeatures(stemType, createMockAudioFeatures(stemType, 0.5));
      });

      // Test mute operations
      const muteStartTime = performance.now();
      controller.setStemMute('drums', true);
      controller.setStemMute('bass', true);
      const muteTime = performance.now() - muteStartTime;

      // Test solo operations
      const soloStartTime = performance.now();
      controller.setStemSolo('vocals', true);
      const soloTime = performance.now() - soloStartTime;

      // Update after changes
      const updateStartTime = performance.now();
      controller.updateVisualization(performance.now());
      const updateTime = performance.now() - updateStartTime;

      expect(muteTime).toBeLessThan(1); // Mute should be instant
      expect(soloTime).toBeLessThan(1); // Solo should be instant
      expect(updateTime).toBeLessThan(16); // Update should remain fast

      console.log(`🔇 Mute/Solo performance: mute=${muteTime.toFixed(2)}ms, solo=${soloTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Metrics', () => {
    test('should provide accurate performance metrics', async () => {
      // Setup and run updates
      const preset = ELECTRONIC_PRESET;
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        controller.addStemMapping(stemType, mapping);
        controller.updateStemFeatures(stemType, createMockAudioFeatures(stemType, 0.6));
      });

      // Perform several updates to generate metrics
      for (let i = 0; i < 10; i++) {
        controller.updateVisualization(performance.now());
        await new Promise(resolve => setTimeout(resolve, 16)); // Simulate 60fps
      }

      const metrics = controller.getMetrics();

      // Verify metrics are populated
      expect(metrics.frameRate).toBeGreaterThan(0);
      expect(metrics.renderTime).toBeGreaterThan(0);
      expect(metrics.mappingComputeTime).toBeGreaterThan(0);
      expect(metrics.lastUpdateLatency).toBeGreaterThan(0);
      expect(typeof metrics.memoryUsage).toBe('number');

      console.log('📊 Performance metrics:', {
        frameRate: metrics.frameRate,
        renderTime: `${metrics.renderTime.toFixed(2)}ms`,
        mappingTime: `${metrics.mappingComputeTime.toFixed(2)}ms`,
        memory: `${metrics.memoryUsage.toFixed(2)}MB`
      });
    });
  });

  describe('Error Recovery', () => {
    test('should handle invalid audio features gracefully', async () => {
      const mapping: StemVisualizationMapping = {
        stemType: 'drums',
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
            multiplier: 1.5
          }
        }
      };

      controller.addStemMapping('drums', mapping);

      // Test with empty features
      expect(() => {
        controller.updateStemFeatures('drums', []);
        controller.updateVisualization(performance.now());
      }).not.toThrow();

      // Test with invalid feature values
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

      console.log('✅ Error recovery tests passed');
    });
  });
});

console.log('🧪 Stem visualization performance tests ready');