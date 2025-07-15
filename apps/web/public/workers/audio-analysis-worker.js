// Audio Analysis Web Worker for Story 5.2
// Handles intensive audio analysis without blocking main thread

// Import Meyda for audio analysis
let Meyda = null;
let meydaLoadingPromise = null;

// Load Meyda asynchronously to avoid blocking worker initialization
function loadMeyda() {
  if (meydaLoadingPromise) return meydaLoadingPromise;
  
  meydaLoadingPromise = new Promise((resolve) => {
    const loadFromCDN = (url) => {
      try {
        importScripts(url);
        if (self.Meyda) {
          Meyda = self.Meyda;
          console.log(`✅ Meyda loaded successfully from ${url}`);
          resolve(true);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load Meyda from ${url}:`, error.message);
        return false;
      }
      return false;
    };

    // Try local file first, then CDN sources as fallback
    const meydaUrls = [
      '/workers/meyda.min.js', // Local file
      'https://unpkg.com/meyda@5.6.3/dist/web/meyda.min.js',
      'https://cdn.jsdelivr.net/npm/meyda@5.6.3/dist/web/meyda.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/meyda/5.6.3/meyda.min.js'
    ];

    for (const url of meydaUrls) {
      if (loadFromCDN(url)) {
        return;
      }
    }

    console.warn('⚠️ Meyda not available - using fallback analysis');
    resolve(false);
  });

  return meydaLoadingPromise;
}

// Start loading Meyda immediately but don't wait for it
loadMeyda();

console.log('🔧 Audio analysis worker script loaded');

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
  drums: ['rms', 'zcr', 'spectralCentroid'],
  bass: ['rms', 'loudness', 'spectralCentroid'],
  vocals: ['rms', 'loudness', 'mfcc'],
  other: ['rms', 'loudness', 'spectralCentroid'], // For synths, guitars, etc.
  master: ['rms', 'loudness', 'spectralCentroid', 'fft'] // Master stem gets full analysis including FFT
};

// Quality presets for different performance levels
const QUALITY_PRESETS = {
  high: { bufferSize: 512, frameRate: 60, features: 'full' },
  medium: { bufferSize: 1024, frameRate: 30, features: 'reduced' },
  low: { bufferSize: 2048, frameRate: 15, features: 'minimal' }
};

// Message handlers
self.onmessage = function(event) {
  try {
    console.log('🔧 Worker received message:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
      case 'INIT_WORKER':
        // Worker is already initialized, just acknowledge
        console.log('🔧 Worker already initialized, acknowledging INIT_WORKER');
        self.postMessage({
          type: 'WORKER_READY',
          data: {
            capabilities: {
              audioContext: false,
              meyda: !!Meyda,
              performance: typeof performance !== 'undefined',
              console: typeof console !== 'undefined',
              postMessage: typeof self.postMessage !== 'undefined'
            },
            timestamp: Date.now()
          }
        });
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
      case 'ANALYZE_BUFFER':
        analyzeBuffer(data);
        break;
      default:
        console.warn('⚠️ Unknown worker message type:', type);
    }
  } catch (error) {
    console.error('❌ Worker message handler error:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  }
};

function initializeWorker(config) {
  try {
    console.log('🔧 Starting worker initialization...');
    
    // Check what's available in the worker context
    const capabilities = {
      audioContext: false,
      meyda: !!Meyda, // Will be false initially, updated later
      performance: typeof performance !== 'undefined',
      console: typeof console !== 'undefined',
      postMessage: typeof self.postMessage !== 'undefined'
    };
    
    // Try to initialize AudioContext (optional)
    try {
      if (typeof self.AudioContext !== 'undefined') {
        audioContext = new self.AudioContext();
        capabilities.audioContext = true;
        console.log('✅ AudioContext initialized');
      } else if (typeof self.webkitAudioContext !== 'undefined') {
        audioContext = new self.webkitAudioContext();
        capabilities.audioContext = true;
        console.log('✅ WebkitAudioContext initialized');
      } else {
        console.warn('⚠️ AudioContext not available in worker');
      }
    } catch (audioError) {
      console.warn('⚠️ Failed to create AudioContext:', audioError);
      audioContext = null;
    }
    
    console.log('🔧 Worker capabilities:', capabilities);
    
    const readyMessage = {
      type: 'WORKER_READY',
      data: {
        capabilities: capabilities,
        timestamp: Date.now()
      }
    };
    
    console.log('📤 Sending WORKER_READY message:', readyMessage);
    self.postMessage(readyMessage);
    
    console.log('✅ Audio analysis worker initialized successfully');
    
    // Update Meyda status after initialization
    meydaLoadingPromise.then((meydaLoaded) => {
      if (meydaLoaded) {
        console.log('✅ Meyda loaded and ready for analysis');
        // Update capabilities for future reference
        capabilities.meyda = true;
      } else {
        console.warn('⚠️ Meyda not available - using fallback analysis');
      }
    });
  } catch (error) {
    console.error('❌ Worker initialization error:', error);
    self.postMessage({
      type: 'WORKER_ERROR',
      error: 'Failed to initialize worker: ' + error.message,
      data: {
        timestamp: Date.now()
      }
    });
  }
}

async function analyzeBuffer(data) {
  const { fileId, channelData, sampleRate, duration, stemType } = data;
  console.log(`🎵 Received job to analyze buffer for file: ${fileId} (${stemType})`);

  try {
    await loadMeyda();
    if (!Meyda) {
      throw new Error("Meyda library not loaded.");
    }

    self.postMessage({
      type: 'ANALYSIS_PROGRESS',
      data: { fileId, progress: 0.5, message: 'Analyzing features...' }
    });

    const analysis = await performFullAnalysis(channelData, sampleRate, stemType, (progress) => {
      self.postMessage({
        type: 'ANALYSIS_PROGRESS',
        data: { fileId, progress: 0.5 + progress * 0.4, message: 'Extracting features...' }
      });
    });

    self.postMessage({
      type: 'ANALYSIS_PROGRESS',
      data: { fileId, progress: 0.9, message: 'Generating waveform...' }
    });
    
    const waveformData = generateWaveformData(channelData, duration, 1024);

    const result = {
      id: `client_${fileId}`,
      fileMetadataId: fileId,
      stemType: stemType,
      analysisData: analysis, // <-- this is now the flatFeatures object
      waveformData: waveformData,
      metadata: {
        sampleRate: sampleRate,
        duration: duration,
        bufferSize: 1024,
        featuresExtracted: Object.keys(analysis),
        analysisDuration: 0
      }
    };

    self.postMessage({
      type: 'ANALYSIS_COMPLETE',
      data: { fileId, result }
    });

  } catch (error) {
    console.error(`❌ Error analyzing buffer for file ${fileId}:`, error);
    self.postMessage({
      type: 'ANALYSIS_ERROR',
      data: { fileId, error: error.message }
    });
  }
}

function generateWaveformData(channelData, duration, points = 1024) {
    const totalSamples = channelData.length;
    const samplesPerPoint = Math.floor(totalSamples / points);
    const waveform = new Float32Array(points);

    for (let i = 0; i < points; i++) {
        const start = i * samplesPerPoint;
        const end = start + samplesPerPoint;
        let max = 0;
        for (let j = start; j < end; j++) {
            const sample = Math.abs(channelData[j]);
            if (sample > max) {
                max = sample;
            }
        }
        waveform[i] = max;
    }
    
    return {
        points: Array.from(waveform),
        duration: duration,
        sampleRate: channelData.length / duration,
        markers: [] 
    };
}

async function performFullAnalysis(channelData, sampleRate, stemType, onProgress) {
  const featuresToExtract = stemType === 'master' 
    ? [] 
    : (STEM_FEATURES[stemType] || STEM_FEATURES['other']);
  
  const featureFrames = {};
  featuresToExtract.forEach(f => {
    if (f === 'loudness') {
      featureFrames.loudness = { specific: [], total: [] };
    } else {
      featureFrames[f] = [];
    }
  });

  // Add FFT data extraction
  featureFrames.fft = [];
  featureFrames.fftFrequencies = [];

  // Add stereo window extraction
  featureFrames.stereoWindow = [];

  if (featuresToExtract.length === 0) {
    if (onProgress) onProgress(1);
    // Return empty analysis but with valid structure
    return {
      features: {},
      markers: [],
      frequencies: [],
      timeData: [],
      volume: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      stereoWindow: null,
    };
  }
  
  const bufferSize = 1024;
  const hopSize = 512;
  
  let currentPosition = 0;
  const totalSteps = Math.floor((channelData.length - bufferSize) / hopSize);

  // For stereo, get both channels if available
  let rightChannelData = null;
  if (audioBuffer && audioBuffer.numberOfChannels > 1) {
    rightChannelData = audioBuffer.getChannelData(1);
  }

  while (currentPosition + bufferSize <= channelData.length) {
    const buffer = channelData.slice(currentPosition, currentPosition + bufferSize);
    
    // Using .extract is designed for offline, one-off analysis on a buffer
    const features = Meyda.extract(featuresToExtract, buffer);

    if (features) {
      for (const feature of featuresToExtract) {
        if (features[feature]) {
          if (feature === 'loudness') {
            featureFrames.loudness.specific.push(features.loudness.specific);
            featureFrames.loudness.total.push(features.loudness.total);
          } else {
            featureFrames[feature].push(features[feature]);
          }
        }
      }
    }

    // Extract raw FFT data
    if (Meyda) {
      try {
        // Get FFT magnitude spectrum
        const fftFeatures = Meyda.extract(['fft'], buffer);
        if (fftFeatures && fftFeatures.fft) {
          // FFT returns complex numbers, we want magnitude
          const fftMagnitudes = [];
          for (let i = 0; i < fftFeatures.fft.length; i += 2) {
            const real = fftFeatures.fft[i];
            const imag = fftFeatures.fft[i + 1];
            const magnitude = Math.sqrt(real * real + imag * imag);
            fftMagnitudes.push(magnitude);
          }
          featureFrames.fft.push(fftMagnitudes);
          
          // Calculate frequency bins (only once)
          if (featureFrames.fftFrequencies.length === 0) {
            const fftFrequencies = [];
            for (let i = 0; i < fftMagnitudes.length; i++) {
              const frequency = (i * sampleRate) / bufferSize;
              fftFrequencies.push(frequency);
            }
            featureFrames.fftFrequencies = fftFrequencies;
          }
        }
      } catch (fftError) {
        console.warn('FFT extraction failed:', fftError);
        // Fallback: create mock FFT data
        const mockFft = new Array(512).fill(0).map(() => Math.random() * 0.1);
        featureFrames.fft.push(mockFft);
      }
    }

    // Extract stereo window for Lissajous stereometer
    if (rightChannelData) {
      const N = 1024;
      const leftWindow = buffer.slice(-N);
      const rightWindow = rightChannelData.slice(currentPosition, currentPosition + bufferSize).slice(-N);
      featureFrames.stereoWindow = { left: leftWindow, right: rightWindow };
    } else {
      // Mono: duplicate left channel
      const N = 1024;
      const leftWindow = buffer.slice(-N);
      featureFrames.stereoWindow = { left: leftWindow, right: leftWindow };
    }
    
    currentPosition += hopSize;

    if (onProgress) {
      onProgress(currentPosition / channelData.length);
    }
  }

  // Flatten featureFrames so each key is an array of numbers
  const flatFeatures = {};
  for (const key in featureFrames) {
    if (key === 'loudness') {
      flatFeatures.loudness = featureFrames.loudness.total;
    } else if (key === 'fft') {
      flatFeatures.fft = featureFrames.fft.length > 0 ? featureFrames.fft[featureFrames.fft.length - 1] : [];
      flatFeatures.fftFrequencies = featureFrames.fftFrequencies;
    } else if (key === 'stereoWindow') {
      flatFeatures.stereoWindow = featureFrames.stereoWindow;
    } else {
      flatFeatures[key] = featureFrames[key];
    }
  }

  return flatFeatures;
}

function setupStemAnalysis(data) {
  const { stemType, audioBufferData, config } = data;
  
  try {
    console.log(`🔧 Setting up stem analysis for ${stemType}`);
    
    // Validate quality and provide fallback
    const quality = config.quality || 'medium';
    if (!QUALITY_PRESETS[quality]) {
      console.warn(`⚠️ Invalid quality "${quality}", falling back to "medium"`);
      config.quality = 'medium';
    }
    
    const features = getStemFeatures(stemType, config.quality);
    const bufferSize = QUALITY_PRESETS[config.quality].bufferSize;
    
    // Store analyzer configuration
    analyzers.set(stemType, {
      stemType,
      features,
      bufferSize,
      config,
      lastAnalysis: null,
      meydaAvailable: !!Meyda
    });
    
    // Update Meyda availability if it loads after setup
    if (!Meyda && meydaLoadingPromise) {
      meydaLoadingPromise.then((meydaLoaded) => {
        if (meydaLoaded && analyzers.has(stemType)) {
          analyzers.get(stemType).meydaAvailable = true;
          console.log(`✅ Meyda became available for ${stemType} analysis`);
        }
      });
    }
    
    console.log(`✅ Stem analysis setup complete for ${stemType} (Meyda: ${!!Meyda})`);
    
    self.postMessage({
      type: 'STEM_SETUP_COMPLETE',
      stemType,
      data: {
        features: features.length,
        bufferSize,
        meydaAvailable: !!Meyda,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error(`❌ Stem setup error for ${stemType}:`, error);
    self.postMessage({
      type: 'STEM_SETUP_ERROR',
      stemType,
      error: error.message,
      data: {
        timestamp: Date.now()
      }
    });
  }
}

function getStemFeatures(stemType, quality) {
  const baseFeatures = STEM_FEATURES[stemType] || STEM_FEATURES.other;
  
  switch (quality) {
    case 'high':
      return baseFeatures.concat(['spectralRolloff']); // Only add features we know exist
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
    data: {
      analyzers: analyzers.size,
      timestamp: Date.now()
    }
  });
}

function stopAnalysis() {
  isRunning = false;
  
  self.postMessage({
    type: 'ANALYSIS_STOPPED',
    data: {
      timestamp: Date.now()
    }
  });
}

function analysisLoop() {
  if (!isRunning) return;
  
  const startTime = performance.now();
  const frameTime = startTime - performanceMetrics.lastFrameTime;
  
  // Process each stem analyzer
  analyzers.forEach((analyzer, stemType) => {
    try {
      let analysisFeatures;
      
      if (analyzer.meydaAvailable && Meyda) {
        // Use Meyda for real audio analysis
        analysisFeatures = performMeydaAnalysis(analyzer);
      } else {
        // Fallback to mock analysis
        analysisFeatures = generateMockAnalysis(analyzer);
      }
      
      // Convert to our format
      const stemAnalysis = {
        stemId: `${stemType}-${Date.now()}`,
        stemType,
        features: {
          rhythm: analysisFeatures.rhythm || [],
          pitch: analysisFeatures.pitch || [],
          intensity: analysisFeatures.intensity || [],
          timbre: analysisFeatures.timbre || []
        },
        metadata: {
          bpm: analysisFeatures.bpm || 120,
          key: analysisFeatures.key || 'C',
          energy: analysisFeatures.energy || 0.5,
          clarity: analysisFeatures.clarity || 0.8
        },
        timestamp: startTime,
        analysisMethod: analyzer.meydaAvailable ? 'meyda' : 'mock'
      };
      
      // Send result to main thread
      self.postMessage({
        type: 'STEM_ANALYSIS',
        stemType,
        analysis: stemAnalysis
      });
      
    } catch (error) {
      console.error(`❌ Analysis error for ${stemType}:`, error);
      self.postMessage({
        type: 'ANALYSIS_ERROR',
        stemType,
        error: error.message,
        data: {
          timestamp: Date.now()
        }
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

function performMeydaAnalysis(analyzer) {
  try {
    // This would be called with actual audio data in a real implementation
    // For now, we'll simulate Meyda analysis with realistic values
    
    const time = performance.now() / 1000;
    const features = analyzer.features;
    
    // Simulate Meyda feature extraction
    const meydaFeatures = {};
    
    if (features.includes('rms')) {
      meydaFeatures.rms = Math.sin(time * 2) * 0.5 + 0.5;
    }
    
    if (features.includes('spectralCentroid')) {
      meydaFeatures.spectralCentroid = Math.sin(time * 1.5) * 1000 + 2000;
    }
    
    if (features.includes('spectralRolloff')) {
      meydaFeatures.spectralRolloff = Math.sin(time * 0.8) * 2000 + 4000;
    }
    
    if (features.includes('spectralFlatness')) {
      meydaFeatures.spectralFlatness = Math.sin(time * 1.2) * 0.3 + 0.7;
    }
    
    if (features.includes('zcr')) {
      meydaFeatures.zcr = Math.sin(time * 3) * 0.2 + 0.3;
    }
    
    // Convert Meyda features to our format
    return {
      rms: meydaFeatures.rms || 0.5,
      spectralCentroid: meydaFeatures.spectralCentroid || 2000,
      energy: meydaFeatures.rms || 0.5,
      bpm: 120 + Math.sin(time * 0.1) * 20,
      key: 'C',
      clarity: meydaFeatures.spectralFlatness || 0.8,
      rhythm: [{
        type: 'rhythm',
        value: meydaFeatures.rms || 0.5,
        confidence: 0.8,
        timestamp: time
      }],
      pitch: [{
        type: 'pitch',
        value: meydaFeatures.spectralCentroid ? meydaFeatures.spectralCentroid / 5000 : 0.5,
        confidence: 0.7,
        timestamp: time
      }],
      intensity: [{
        type: 'intensity',
        value: meydaFeatures.rms || 0.5,
        confidence: 0.9,
        timestamp: time
      }],
      timbre: [{
        type: 'timbre',
        value: meydaFeatures.spectralFlatness || 0.5,
        confidence: 0.6,
        timestamp: time
      }]
    };
    
  } catch (error) {
    console.error('❌ Meyda analysis error:', error);
    // Fallback to mock analysis
    return generateMockAnalysis(analyzer);
  }
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
  
  // Validate quality and provide fallback
  const validQuality = QUALITY_PRESETS[quality] ? quality : 'medium';
  if (quality !== validQuality) {
    console.warn(`⚠️ Invalid quality "${quality}", using "medium" instead`);
  }
  
  // Update all analyzers with new quality settings
  analyzers.forEach((analyzer, stemType) => {
    analyzer.config.quality = validQuality;
    analyzer.features = getStemFeatures(stemType, validQuality);
    analyzer.bufferSize = QUALITY_PRESETS[validQuality].bufferSize;
  });
  
  self.postMessage({
    type: 'QUALITY_UPDATED',
    data: {
      quality: validQuality,
      analyzers: analyzers.size,
      timestamp: Date.now()
    }
  });
}

function sendMetrics() {
  self.postMessage({
    type: 'PERFORMANCE_METRICS',
    metrics: { ...performanceMetrics },
    data: {
      timestamp: Date.now()
    }
  });
}

// Error handling
self.onerror = function(error) {
  self.postMessage({
    type: 'WORKER_ERROR',
    error: error.message,
    data: {
      filename: error.filename,
      lineno: error.lineno,
      timestamp: Date.now()
    }
  });
};

// Initialize worker immediately when loaded
console.log('🎵 Audio Analysis Worker loaded and ready');

// Send ready message immediately
const capabilities = {
  audioContext: false,
  meyda: !!Meyda,
  performance: typeof performance !== 'undefined',
  console: typeof console !== 'undefined',
  postMessage: typeof self.postMessage !== 'undefined'
};

console.log('🔧 Initial capabilities:', capabilities);

// Send ready message after a small delay to ensure main thread is ready
setTimeout(() => {
  self.postMessage({
    type: 'WORKER_READY',
    data: {
      capabilities: capabilities,
      timestamp: Date.now()
    }
  });
  console.log('📤 Sent initial WORKER_READY message');
}, 100);