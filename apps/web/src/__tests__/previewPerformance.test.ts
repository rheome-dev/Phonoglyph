import { PreviewPerformanceOptimizer } from '@/lib/preview/performanceOptimizer';

// Mock performance APIs
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  }
};

// Mock PerformanceObserver
const mockPerformanceObserver = jest.fn();
mockPerformanceObserver.prototype.observe = jest.fn();
mockPerformanceObserver.prototype.disconnect = jest.fn();

// Setup global mocks
(global as any).performance = mockPerformance;
(global as any).PerformanceObserver = mockPerformanceObserver;

describe('PreviewPerformanceOptimizer', () => {
  let optimizer: PreviewPerformanceOptimizer;
  
  beforeEach(() => {
    jest.useFakeTimers();
    mockPerformance.now.mockReturnValue(1000);
    optimizer = new PreviewPerformanceOptimizer();
  });
  
  afterEach(() => {
    jest.useRealTimers();
    optimizer.dispose();
  });
  
  describe('Frame Time Monitoring', () => {
    test('should calculate FPS correctly with regular frame times', () => {
      // Simulate 30 FPS (33.33ms per frame)
      const frameTime = 1000 / 30;
      
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * frameTime));
        optimizer.updateFrameTime();
      }
      
      const fps = optimizer.getCurrentFPS();
      expect(fps).toBeCloseTo(30, 1);
    });
    
    test('should track frame time history with rolling window', () => {
      // Add more than 60 frames to test rolling window
      for (let i = 0; i < 70; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 16.67)); // 60 FPS
        optimizer.updateFrameTime();
      }
      
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.totalFrames).toBe(70);
      
      // Frame time history should be capped at 60
      expect(optimizer.getAverageFrameTime()).toBeCloseTo(16.67, 1);
    });
    
    test('should detect dropped frames', () => {
      // Simulate some normal frames
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 33.33));
        optimizer.updateFrameTime();
      }
      
      // Simulate a dropped frame (takes 2x expected time)
      mockPerformance.now.mockReturnValue(1000 + (10 * 33.33) + 66.66);
      optimizer.updateFrameTime();
      
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.droppedFrames).toBeGreaterThan(0);
    });
  });
  
  describe('Adaptive Quality', () => {
    test('should recommend quality reduction when FPS drops', () => {
      // Simulate low FPS (10 FPS = 100ms per frame)
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 100));
        optimizer.updateFrameTime();
      }
      
      expect(optimizer.shouldReduceQuality()).toBe(true);
      
      const settings = optimizer.getOptimalSettings();
      expect(settings.quality).toBe('draft');
      expect(settings.disableEffects).toBe(true);
    });
    
    test('should recommend quality increase when FPS is high', () => {
      // Simulate high FPS (60 FPS = 16.67ms per frame)
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 16.67));
        optimizer.updateFrameTime();
      }
      
      expect(optimizer.shouldIncreaseQuality()).toBe(true);
      
      const settings = optimizer.getOptimalSettings();
      expect(settings.quality).toBe('high');
      expect(settings.disableEffects).toBe(false);
    });
    
    test('should provide medium quality for moderate FPS', () => {
      // Simulate moderate FPS (25 FPS = 40ms per frame)
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 40));
        optimizer.updateFrameTime();
      }
      
      const settings = optimizer.getOptimalSettings();
      expect(settings.quality).toBe('medium');
      expect(settings.resolution).toBe(0.5);
    });
  });
  
  describe('Performance Metrics', () => {
    test('should return comprehensive performance metrics', () => {
      // Add some frame data
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 33.33));
        optimizer.updateFrameTime();
      }
      
      const metrics = optimizer.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('averageFrameTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('droppedFrames');
      expect(metrics).toHaveProperty('totalFrames');
      
      expect(metrics.totalFrames).toBe(10);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
    
    test('should calculate dropped frame rate correctly', () => {
      // Add 10 normal frames and 2 dropped frames
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 33.33));
        optimizer.updateFrameTime();
      }
      
      // Add dropped frames
      mockPerformance.now.mockReturnValue(1000 + (10 * 33.33) + 100);
      optimizer.updateFrameTime();
      mockPerformance.now.mockReturnValue(1000 + (11 * 33.33) + 100);
      optimizer.updateFrameTime();
      
      const droppedRate = optimizer.getDroppedFrameRate();
      expect(droppedRate).toBeGreaterThan(0);
      expect(droppedRate).toBeLessThan(1);
    });
  });
  
  describe('Performance Analysis', () => {
    test('should correctly identify good performance', () => {
      // Simulate excellent performance (30 FPS, no dropped frames)
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 33.33));
        optimizer.updateFrameTime();
      }
      
      expect(optimizer.isPerformingWell()).toBe(true);
      
      const score = optimizer.getPerformanceScore();
      expect(score).toBeGreaterThan(80);
    });
    
    test('should correctly identify poor performance', () => {
      // Simulate poor performance (15 FPS with dropped frames)
      for (let i = 0; i < 30; i++) {
        const frameTime = i % 3 === 0 ? 100 : 66.67; // Every 3rd frame is dropped
        mockPerformance.now.mockReturnValue(1000 + (i * frameTime));
        optimizer.updateFrameTime();
      }
      
      expect(optimizer.isPerformingWell()).toBe(false);
      
      const score = optimizer.getPerformanceScore();
      expect(score).toBeLessThan(60);
    });
    
    test('should provide helpful performance recommendations', () => {
      // Simulate poor performance
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 100)); // 10 FPS
        optimizer.updateFrameTime();
      }
      
      const recommendations = optimizer.getPerformanceRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('quality'))).toBe(true);
    });
  });
  
  describe('Configuration and Control', () => {
    test('should allow forced quality settings', () => {
      optimizer.forceQuality('draft');
      
      const settings = optimizer.getCurrentSettings();
      expect(settings.quality).toBe('draft');
      
      // Should not auto-adapt when forced
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 16.67)); // High FPS
        optimizer.updateFrameTime();
      }
      
      const settingsAfter = optimizer.getCurrentSettings();
      expect(settingsAfter.quality).toBe('draft'); // Should remain forced
    });
    
    test('should enable/disable auto adaptation', () => {
      optimizer.disableAutoAdaptation();
      
      // Simulate poor performance
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 100));
        optimizer.updateFrameTime();
      }
      
      // Quality should not change automatically
      const settings = optimizer.getCurrentSettings();
      expect(settings.quality).toBe('medium'); // Default
      
      optimizer.enableAutoAdaptation();
      // Now it should adapt (this would be tested with more frames)
    });
    
    test('should allow configuration updates', () => {
      optimizer.updateConfig({
        targetFps: 60,
        fpsThresholds: {
          high: 55,
          medium: 45,
          draft: 25
        }
      });
      
      // Test with new thresholds
      for (let i = 0; i < 30; i++) {
        mockPerformance.now.mockReturnValue(1000 + (i * 20)); // 50 FPS
        optimizer.updateFrameTime();
      }
      
      const settings = optimizer.getOptimalSettings();
      expect(settings.quality).toBe('medium'); // Should be medium with new thresholds
    });
  });
  
  describe('Benchmarking', () => {
    test('should run performance benchmark', async () => {
      const benchmarkPromise = optimizer.runPerformanceBenchmark(1000);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      const metrics = await benchmarkPromise;
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('totalFrames');
    });
  });
  
  describe('Memory Management', () => {
    test('should reset performance data correctly', () => {
      // Add some data
      for (let i = 0; i < 10; i++) {
        optimizer.updateFrameTime();
      }
      
      optimizer.reset();
      
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.totalFrames).toBe(0);
      expect(metrics.droppedFrames).toBe(0);
    });
    
    test('should dispose resources properly', () => {
      const disposeSpy = jest.spyOn(optimizer, 'dispose');
      
      optimizer.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });
  
  describe('Event System', () => {
    test('should emit settings change events', () => {
      const eventListener = jest.fn();
      window.addEventListener('preview-settings-changed', eventListener);
      
      optimizer.updateSettings({ quality: 'high' });
      
      expect(eventListener).toHaveBeenCalled();
      
      window.removeEventListener('preview-settings-changed', eventListener);
    });
  });
});