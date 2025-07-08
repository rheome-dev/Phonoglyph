// Audio Analysis Web Worker for Story 5.2
// Handles intensive audio analysis without blocking main thread

// Import Meyda (assuming it's available in worker context via CDN or build process)
// Note: In production, you'd bundle this properly with the worker
importScripts('https://unpkg.com/meyda@5.6.3/dist/web/meyda.min.js');

let audioContext = null;
let analyzers = new Map();
let isRunning = false;
let performanceMetrics = {
  fps: 0,
  analysisLatency: 0,
  memoryUsage: 0,
  frameDrops: 0,
  lastFrameTime: 0
};

// Optimized feature sets for different stem types
const STEM_FEATURES = {
  drums: ['rms', 'spectralCentroid', 'spectralFlux', 'energy'],
  bass: ['rms', 'spectralCentroid', 'loudness'],
  vocals: ['rms', 'spectralCentroid', 'mfcc', 'loudness'],
  piano: ['rms', 'spectralCentroid', 'loudness'],
  other: ['rms', 'spectralCentroid', 'spectralRolloff']
};

// Quality presets for different performance levels
const QUALITY_PRESETS = {
  high: { bufferSize: 512, frameRate: 60, features: 'full' },
  medium: { bufferSize: 1024, frameRate: 30, features: 'reduced' },
  low: { bufferSize: 2048, frameRate: 15, features: 'minimal' }
};

// Message handlers
self.onmessage = function(event) {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'INIT_WORKER':
        initializeWorker(data);
        break;
      case 'SETUP_STEM_ANALYSIS':
        setupStemAnalysis(data);
        break;
      case 'START_ANALYSIS':
        startAnalysis();
        break;
      case 'STOP_ANALYSIS':
        stopAnalysis();
        break;
      case 'UPDATE_QUALITY':
        updateQuality(data);
        break;
      case 'GET_METRICS':
        sendMetrics();
        break;
      default:
        console.warn('Unknown worker message type:', type);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  }
};

function initializeWorker(config) {
  try {
    // Initialize Web Audio context in worker (if supported)
    // Note: Web Audio in workers is limited, this is for demonstration
    audioContext = new (self.AudioContext || self.webkitAudioContext)();
    
    self.postMessage({
      type: 'WORKER_READY',
      capabilities: {
        audioContext: !!audioContext,
        meyda: typeof Meyda !== 'undefined',
        performance: typeof performance !== 'undefined'
      }
    });
    
    console.log('🔧 Audio analysis worker initialized');
  } catch (error) {
    self.postMessage({
      type: 'WORKER_ERROR',
      error: 'Failed to initialize worker: ' + error.message
    });
  }
}

function setupStemAnalysis(data) {
  const { stemType, audioBufferData, config } = data;
  
  try {
    // In a real implementation, you'd decode the audio buffer here
    // For now, we'll simulate the setup
    
    const features = getStemFeatures(stemType, config.quality);
    const bufferSize = QUALITY_PRESETS[config.quality].bufferSize;
    
    // Store analyzer configuration (simplified for demo)
    analyzers.set(stemType, {
      stemType,
      features,
      bufferSize,
      config,
      lastAnalysis: null
    });
    
    self.postMessage({
      type: 'STEM_SETUP_COMPLETE',
      stemType,
      features: features.length,
      bufferSize
    });
    
  } catch (error) {
    self.postMessage({
      type: 'STEM_SETUP_ERROR',
      stemType,
      error: error.message
    });
  }
}

function getStemFeatures(stemType, quality) {
  const baseFeatures = STEM_FEATURES[stemType] || STEM_FEATURES.other;
  
  switch (quality) {
    case 'high':
      return baseFeatures.concat(['perceptualSpread', 'spectralFlux']);
    case 'medium':
      return baseFeatures;
    case 'low':
      return baseFeatures.slice(0, 2); // Only first 2 features
    default:
      return baseFeatures;
  }
}

function startAnalysis() {
  if (isRunning) return;
  
  isRunning = true;
  performanceMetrics.lastFrameTime = performance.now();
  
  // Start analysis loop
  analysisLoop();
  
  self.postMessage({
    type: 'ANALYSIS_STARTED',
    analyzers: analyzers.size
  });
}

function stopAnalysis() {
  isRunning = false;
  
  self.postMessage({
    type: 'ANALYSIS_STOPPED'
  });
}

function analysisLoop() {
  if (!isRunning) return;
  
  const startTime = performance.now();
  const frameTime = startTime - performanceMetrics.lastFrameTime;
  
  // Process each stem analyzer
  analyzers.forEach((analyzer, stemType) => {
    try {
      // Simulate audio analysis (in real implementation, this would use Meyda)
      const mockFeatures = generateMockAnalysis(analyzer);
      
      // Convert to our format
      const stemAnalysis = {
        stemId: `${stemType}-${Date.now()}`,
        stemType,
        features: {
          rhythm: mockFeatures.rhythm || [],
          pitch: mockFeatures.pitch || [],
          intensity: mockFeatures.intensity || [],
          timbre: mockFeatures.timbre || []
        },
        metadata: {
          bpm: mockFeatures.bpm || 120,
          key: mockFeatures.key || 'C',
          energy: mockFeatures.energy || 0.5,
          clarity: mockFeatures.clarity || 0.8
        },
        timestamp: startTime
      };
      
      // Send result to main thread
      self.postMessage({
        type: 'STEM_ANALYSIS',
        stemType,
        analysis: stemAnalysis
      });
      
    } catch (error) {
      self.postMessage({
        type: 'ANALYSIS_ERROR',
        stemType,
        error: error.message
      });
    }
  });
  
  // Update performance metrics
  const analysisTime = performance.now() - startTime;
  updatePerformanceMetrics(frameTime, analysisTime);
  
  // Schedule next analysis frame
  const targetFrameTime = 1000 / getTargetFrameRate();
  const nextFrameDelay = Math.max(0, targetFrameTime - analysisTime);
  
  setTimeout(analysisLoop, nextFrameDelay);
  performanceMetrics.lastFrameTime = performance.now();
}

function generateMockAnalysis(analyzer) {
  // Generate realistic mock data for demonstration
  const time = performance.now() / 1000;
  
  return {
    rms: Math.sin(time * 2) * 0.5 + 0.5,
    spectralCentroid: Math.sin(time * 1.5) * 1000 + 2000,
    energy: Math.sin(time * 3) * 0.3 + 0.7,
    bpm: 120 + Math.sin(time * 0.1) * 20,
    key: 'C',
    clarity: 0.8 + Math.sin(time * 0.5) * 0.2,
    rhythm: [{
      type: 'rhythm',
      value: Math.sin(time * 4) * 0.5 + 0.5,
      confidence: 0.8,
      timestamp: time
    }],
    pitch: [{
      type: 'pitch',
      value: Math.sin(time * 1.5) * 0.5 + 0.5,
      confidence: 0.7,
      timestamp: time
    }],
    intensity: [{
      type: 'intensity',
      value: Math.sin(time * 2) * 0.5 + 0.5,
      confidence: 0.9,
      timestamp: time
    }],
    timbre: [{
      type: 'timbre',
      value: Math.sin(time * 0.8) * 0.5 + 0.5,
      confidence: 0.6,
      timestamp: time
    }]
  };
}

function updatePerformanceMetrics(frameTime, analysisTime) {
  performanceMetrics.analysisLatency = analysisTime;
  performanceMetrics.fps = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
  
  // Track frame drops
  const targetFrameTime = 1000 / getTargetFrameRate();
  if (frameTime > targetFrameTime * 1.5) {
    performanceMetrics.frameDrops++;
  }
  
  // Estimate memory usage
  performanceMetrics.memoryUsage = analyzers.size * 5; // Simplified estimate
}

function getTargetFrameRate() {
  // Return target frame rate based on current quality settings
  const hasHighQuality = Array.from(analyzers.values()).some(a => a.config?.quality === 'high');
  return hasHighQuality ? 60 : 30;
}

function updateQuality(data) {
  const { quality } = data;
  
  // Update all analyzers with new quality settings
  analyzers.forEach((analyzer, stemType) => {
    analyzer.config.quality = quality;
    analyzer.features = getStemFeatures(stemType, quality);
    analyzer.bufferSize = QUALITY_PRESETS[quality].bufferSize;
  });
  
  self.postMessage({
    type: 'QUALITY_UPDATED',
    quality,
    analyzers: analyzers.size
  });
}

function sendMetrics() {
  self.postMessage({
    type: 'PERFORMANCE_METRICS',
    metrics: { ...performanceMetrics }
  });
}

// Error handling
self.onerror = function(error) {
  self.postMessage({
    type: 'WORKER_ERROR',
    error: error.message,
    filename: error.filename,
    lineno: error.lineno
  });
};

console.log('🎵 Audio Analysis Worker loaded and ready');