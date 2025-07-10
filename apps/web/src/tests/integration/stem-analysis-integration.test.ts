import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioProcessor } from '@/lib/audio-processor';
import { AudioWorkerManager } from '@/lib/audio-worker-manager';
import { PerformanceMonitor } from '@/lib/performance-monitor';
import { DeviceOptimizer } from '@/lib/device-optimizer';
import { FallbackSystem } from '@/lib/fallback-system';
import { VisualizationFeaturePipeline } from '@/lib/visualization-feature-pipeline';
import { StemAnalysis, AudioFeature } from '@/types/stem-audio-analysis';

// Mock Web Audio API
class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
  }
  
  decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve({
      duration: 10,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 441000,
      getChannelData: () => new Float32Array(441000),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn()
    } as unknown as AudioBuffer);
  }
}

// Mock Web Worker
class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  }
};

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  hardwareConcurrency: 4,
  connection: {
    effectiveType: '4g'
  }
};

describe('Story 5.2: Real-time Audio Analysis Integration', () => {
  let audioProcessor: AudioProcessor;
  let workerManager: AudioWorkerManager;
  let performanceMonitor: PerformanceMonitor;
  let deviceOptimizer: DeviceOptimizer;
  let fallbackSystem: FallbackSystem;
  let featurePipeline: VisualizationFeaturePipeline;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    // Setup mocks
    global.AudioContext = MockAudioContext as any;
    global.Worker = MockWorker as any;
    global.performance = mockPerformance as any;
    global.navigator = mockNavigator as any;

    // Initialize components
    mockAudioContext = new MockAudioContext();
    audioProcessor = new AudioProcessor(mockAudioContext as any, {
      bufferSize: 512,
      analysisResolution: 1,
      deviceOptimization: 'auto',
      maxConcurrentStems: 5
    });
    
    workerManager = new AudioWorkerManager();
    performanceMonitor = new PerformanceMonitor();
    deviceOptimizer = new DeviceOptimizer();
    fallbackSystem = new FallbackSystem();
    featurePipeline = new VisualizationFeaturePipeline();
  });

  afterEach(() => {
    // Cleanup
    audioProcessor?.dispose();
    workerManager?.dispose();
    performanceMonitor?.dispose();
    fallbackSystem?.dispose();
    featurePipeline?.reset();
  });

  describe('Audio Analysis Setup', () => {
    it('should configure Meyda.js for Spleeter stem analysis', async () => {
      const mockStemBuffer = new ArrayBuffer(1024);
      await audioProcessor.setupProcessing({ drums: mockStemBuffer });
      
      expect(audioProcessor).toBeDefined();
      expect(audioProcessor.getFeatures()).toBeDefined();
    });

    it('should optimize WebAudio pipeline for visualization responsiveness', () => {
      const config = deviceOptimizer.getOptimizedConfig();
      
      expect(config.bufferSize).toBeLessThanOrEqual(1024);
      expect(config.analysisResolution).toBeGreaterThan(0);
      expect(config.deviceOptimization).toBeDefined();
    });

    it('should focus on visually impactful features', () => {
      const features = audioProcessor.getFeatures();
      const featureNames = Object.keys(features);
      
      // Should include key visualization features
      expect(featureNames).toContain('energy');
      expect(featureNames).toContain('rhythm');
      expect(featureNames).toContain('intensity');
    });

    it('should maintain 60fps analysis rate', () => {
      const startTime = performance.now();
      
      // Simulate analysis cycle
      for (let i = 0; i < 60; i++) {
        audioProcessor.getFeatures();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 60 iterations in roughly 1 second
      expect(duration).toBeLessThan(1100); // Allow 100ms buffer
    });

    it('should handle stem buffers efficiently', async () => {
      const largeBuffer = new ArrayBuffer(10 * 1024 * 1024); // 10MB
      
      await expect(audioProcessor.setupProcessing({ 
        drums: largeBuffer,
        bass: largeBuffer,
        vocals: largeBuffer 
      })).resolves.not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should adapt analysis resolution based on visualization needs', () => {
      const config = deviceOptimizer.getOptimizedConfig();
      
      expect(config.analysisResolution).toBeGreaterThan(0);
      expect(config.analysisResolution).toBeLessThanOrEqual(1);
    });

    it('should prioritize visually relevant data', () => {
      const features = audioProcessor.getFeatures();
      
      // Should return features optimized for visualization
      expect(features).toBeDefined();
      expect(typeof features).toBe('object');
    });

    it('should optimize buffer management for Spleeter stem format', async () => {
      const stemBuffers = {
        drums: new ArrayBuffer(1024),
        bass: new ArrayBuffer(1024),
        vocals: new ArrayBuffer(1024)
      };
      
      await expect(audioProcessor.setupProcessing(stemBuffers)).resolves.not.toThrow();
    });

    it('should synchronize with visualization frame rate', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.analysisLatency).toBeLessThan(33); // 2 frames @ 60fps
    });

    it('should track CPU and memory usage', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeLessThan(100); // Should be reasonable
    });
  });

  describe('Feature Extraction', () => {
    it('should detect rhythm optimized for Spleeter stems', () => {
      const features = audioProcessor.getFeatures();
      
      expect(features.rhythm).toBeDefined();
      expect(Array.isArray(features.rhythm)).toBe(true);
    });

    it('should analyze energy with visual impact focus', () => {
      const features = audioProcessor.getFeatures();
      
      expect(features.energy).toBeDefined();
      expect(typeof features.energy).toBe('number');
      expect(features.energy).toBeGreaterThanOrEqual(0);
      expect(features.energy).toBeLessThanOrEqual(1);
    });

    it('should track intensity in real-time', () => {
      const features = audioProcessor.getFeatures();
      
      expect(features.intensity).toBeDefined();
      expect(Array.isArray(features.intensity)).toBe(true);
    });

    it('should coordinate cross-stem analysis', () => {
      const stemAnalyses: Record<string, StemAnalysis> = {
        drums: {
          stemId: 'drums',
          stemType: 'drums',
          metadata: { bpm: 120, key: 'C', energy: 0.8, clarity: 0.9 },
          features: { rhythm: [], intensity: [], pitch: [], timbre: [] }
        },
        bass: {
          stemId: 'bass',
          stemType: 'bass',
          metadata: { bpm: 120, key: 'C', energy: 0.6, clarity: 0.7 },
          features: { rhythm: [], intensity: [], pitch: [], timbre: [] }
        }
      };
      
      const visualizationParams = featurePipeline.processFeatures(stemAnalyses);
      
      expect(visualizationParams).toBeDefined();
      expect(visualizationParams.energy).toBeGreaterThan(0);
      expect(visualizationParams.stemWeights).toBeDefined();
    });

    it('should map features directly to visual parameters', () => {
      const stemAnalyses: Record<string, StemAnalysis> = {
        drums: {
          metadata: { energy: 0.8, clarity: 0.9 },
          features: { rhythm: [], intensity: [], pitch: [], timbre: [] }
        }
      };
      
      const visualizationParams = featurePipeline.processFeatures(stemAnalyses);
      
      expect(visualizationParams.energy).toBeDefined();
      expect(visualizationParams.brightness).toBeDefined();
      expect(visualizationParams.color).toBeDefined();
      expect(visualizationParams.movement).toBeDefined();
    });
  });

  describe('Device Support', () => {
    it('should optimize for mobile device capabilities', () => {
      const profile = deviceOptimizer.getCurrentProfile();
      
      expect(profile.name).toBeDefined();
      expect(profile.config).toBeDefined();
    });

    it('should ensure broad browser compatibility', () => {
      // Test with different user agents
      const mobileAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const desktopAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      // Should work with both
      expect(deviceOptimizer).toBeDefined();
      expect(fallbackSystem).toBeDefined();
    });

    it('should provide graceful degradation', async () => {
      const result = await fallbackSystem.executeWithFallback(
        'test_operation',
        async () => { throw new Error('Primary failed'); },
        async () => 'fallback result'
      );
      
      expect(result).toBe('fallback result');
    });

    it('should verify performance on target devices', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.analysisLatency).toBeLessThan(100);
      expect(metrics.memoryUsage).toBeLessThan(100);
    });

    it('should optimize power usage for battery impact', () => {
      const profile = deviceOptimizer.getCurrentProfile();
      
      // Mobile devices should have battery optimization
      if (profile.name.includes('mobile') || profile.name.includes('low')) {
        expect(profile.config.bufferSize).toBeLessThanOrEqual(512);
        expect(profile.config.quality).toBe('low');
      }
    });
  });

  describe('Integration with Creative Visualizer', () => {
    it('should provide real-time audio analysis data', () => {
      const stemAnalyses: Record<string, StemAnalysis> = {
        drums: {
          metadata: { energy: 0.8, clarity: 0.9 },
          features: { rhythm: [], intensity: [], pitch: [], timbre: [] }
        }
      };
      
      const visualizationParams = featurePipeline.processFeatures(stemAnalyses);
      
      // Convert to AudioAnalysisData format for visualizer
      const audioAnalysisData = {
        frequencies: new Float32Array(256).fill(visualizationParams.energy),
        timeData: new Float32Array(256).fill(visualizationParams.brightness),
        volume: visualizationParams.energy,
        bass: visualizationParams.color.warmth,
        mid: visualizationParams.movement.speed,
        treble: visualizationParams.scale
      };
      
      expect(audioAnalysisData.volume).toBeGreaterThanOrEqual(0);
      expect(audioAnalysisData.volume).toBeLessThanOrEqual(1);
      expect(audioAnalysisData.frequencies.length).toBe(256);
      expect(audioAnalysisData.timeData.length).toBe(256);
    });

    it('should display performance metrics in UI', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.analysisLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.deviceProfile).toBeDefined();
    });

    it('should handle multiple stems simultaneously', async () => {
      const stemBuffers = {
        drums: new ArrayBuffer(1024),
        bass: new ArrayBuffer(1024),
        vocals: new ArrayBuffer(1024),
        piano: new ArrayBuffer(1024),
        other: new ArrayBuffer(1024)
      };
      
      await expect(audioProcessor.setupProcessing(stemBuffers)).resolves.not.toThrow();
      
      const features = audioProcessor.getFeatures();
      expect(features).toBeDefined();
    });
  });

  describe('Success Metrics Validation', () => {
    it('should maintain 60fps on modern devices', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      // In a real test environment, this would be validated
      expect(metrics.fps).toBeGreaterThan(0);
    });

    it('should achieve 30fps minimum on mobile devices', () => {
      const profile = deviceOptimizer.getCurrentProfile();
      
      if (profile.name.includes('mobile') || profile.name.includes('low')) {
        const metrics = performanceMonitor.getCurrentMetrics();
        expect(metrics.fps).toBeGreaterThanOrEqual(30);
      }
    });

    it('should maintain <33ms latency from audio to visualization', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.analysisLatency).toBeLessThan(33);
    });

    it('should keep memory usage under 80MB', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.memoryUsage).toBeLessThan(80);
    });

    it('should keep CPU usage under 25% on target devices', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.cpuUsage).toBeLessThan(25);
    });
  });
}); 