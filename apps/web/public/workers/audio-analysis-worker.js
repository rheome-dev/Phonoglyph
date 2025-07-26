// Audio Analysis Web Worker for Story 5.2
// Handles intensive audio analysis without blocking main thread
// PRODUCTION SAFE: No mock data generation systems

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production' || 
                    typeof window !== 'undefined' && window.location.hostname !== 'localhost';

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

// Removed unused variables for real-time analysis:
// - audioContext, analyzers, isRunning, performanceMetrics
// These were only used by the removed real-time analysis loop

// Optimized feature sets for different stem types
const STEM_FEATURES = {
  drums: ['rms', 'zcr', 'spectralCentroid'],
  bass: ['rms', 'loudness', 'spectralCentroid'],
  vocals: ['rms', 'loudness', 'mfcc'],
  other: ['rms', 'loudness', 'spectralCentroid'], // For synths, guitars, etc.
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum'] // Master stem gets comprehensive analysis including FFT
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
      // Removed unused message handlers:
      // - SETUP_STEM_ANALYSIS, START_ANALYSIS, STOP_ANALYSIS (real-time analysis)
      // - UPDATE_QUALITY, GET_METRICS (performance monitoring)
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

function initializeWorker() {
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
    
    // AudioContext not needed for cached analysis
    
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
      const errorMsg = "Audio analysis unavailable - Meyda library failed to load. Please refresh the page and try again.";
      console.error('🚨 Critical: Meyda not available for analysis');
      throw new Error(errorMsg);
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

    // Enhanced error reporting for production debugging
    const errorDetails = {
      fileId,
      stemType,
      error: error.message,
      meydaAvailable: !!Meyda,
      isProduction,
      timestamp: Date.now(),
      stack: error.stack
    };

    console.error('🚨 Buffer analysis failure details:', errorDetails);

    self.postMessage({
      type: 'ANALYSIS_ERROR',
      data: {
        fileId,
        error: `Analysis failed: ${error.message}`,
        details: errorDetails
      }
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
  // For analysis purposes, treat any stem as master if it's a single audio file
  // This ensures we get FFT data for spectrograms regardless of stem type designation
  const isSingleAudioFile = stemType !== 'master' && !['drums', 'bass', 'vocals'].includes(stemType);
  const effectiveStemType = isSingleAudioFile ? 'master' : stemType;
  const featuresToExtract = STEM_FEATURES[effectiveStemType] || STEM_FEATURES['other'];
  
  console.log('🎵 Performing full analysis for stem type:', stemType, 'effective type:', effectiveStemType, 'with features:', featuresToExtract);
  
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

  // Add amplitude spectrum extraction
  featureFrames.amplitudeSpectrum = [];

  // Add stereo window extraction
  featureFrames.stereoWindow_left = [];
  featureFrames.stereoWindow_right = [];

  // Add basic audio analysis fields that TRPC expects
  featureFrames.volume = [];
  featureFrames.bass = [];
  featureFrames.mid = [];
  featureFrames.treble = [];
  featureFrames.features = [];

  if (featuresToExtract.length === 0) {
    if (onProgress) onProgress(1);
    // Return empty analysis but with valid structure - all fields must be arrays
    return {
      features: [],
      markers: [],
      frequencies: [],
      timeData: [],
      volume: [],
      bass: [],
      mid: [],
      treble: [],
      stereoWindow_left: [],
      stereoWindow_right: [],
      fft: [],
      fftFrequencies: [],
    };
  }
  
  const bufferSize = 1024;
  const hopSize = 512;
  
  let currentPosition = 0;
  // Removed unused variables: totalSteps, rightChannelData

  while (currentPosition + bufferSize <= channelData.length) {
    const buffer = channelData.slice(currentPosition, currentPosition + bufferSize);
    
    // Using .extract is designed for offline, one-off analysis on a buffer
    let features = null;
    try {
      features = Meyda.extract(featuresToExtract, buffer);

      if (features) {
        // console.log('🎵 Meyda extracted features:', {
        //   requestedFeatures: featuresToExtract,
        //   returnedFeatures: Object.keys(features),
        //   hasAmplitudeSpectrum: !!features.amplitudeSpectrum,
        //   amplitudeSpectrumType: features.amplitudeSpectrum ? typeof features.amplitudeSpectrum : 'null',
        //   amplitudeSpectrumIsArray: features.amplitudeSpectrum ? Array.isArray(features.amplitudeSpectrum) : false,
        //   fullRequestedFeatures: JSON.stringify(featuresToExtract),
        //   fullReturnedFeatures: JSON.stringify(Object.keys(features))
        // });
        for (const feature of featuresToExtract) {
          if (features[feature]) {
            if (feature === 'loudness') {
              featureFrames.loudness.specific.push(features.loudness.specific);
              featureFrames.loudness.total.push(features.loudness.total);
            } else if (feature === 'amplitudeSpectrum') {
              // Process amplitude spectrum (Meyda returns an object with real/imaginary data)
              const amplitudeData = features.amplitudeSpectrum;
              // console.log('🎵 Amplitude spectrum extraction:', {
              //   hasAmplitudeData: !!amplitudeData,
              //   amplitudeDataType: typeof amplitudeData,
              //   isArray: Array.isArray(amplitudeData),
              //   amplitudeDataLength: amplitudeData ? (Array.isArray(amplitudeData) ? amplitudeData.length : 'not array') : 0,
              //   sampleValues: amplitudeData && Array.isArray(amplitudeData) ? amplitudeData.slice(0, 10) : 'not array',
              //   objectKeys: amplitudeData && typeof amplitudeData === 'object' ? Object.keys(amplitudeData) : 'not object'
              // });
              
              if (amplitudeData && Array.isArray(amplitudeData) && amplitudeData.length > 0) {
                // If it's already an array, use it directly
                featureFrames.amplitudeSpectrum.push([...amplitudeData]);
                // console.log('🎵 Amplitude spectrum stored (array):', {
                //   amplitudeLength: amplitudeData.length,
                //   sampleAmplitudes: amplitudeData.slice(0, 5)
                // });
              } else if (amplitudeData && typeof amplitudeData === 'object' && !Array.isArray(amplitudeData)) {
                // Handle object format - Meyda returns { real: Float32Array, imag: Float32Array }
                // console.log('🎵 Processing amplitude spectrum object:', amplitudeData);
                
                let magnitudes = [];
                if (amplitudeData.real && amplitudeData.imag && Array.isArray(amplitudeData.real) && Array.isArray(amplitudeData.imag)) {
                  // Convert complex spectrum to magnitude spectrum
                  for (let i = 0; i < Math.min(amplitudeData.real.length, amplitudeData.imag.length); i++) {
                    const real = amplitudeData.real[i];
                    const imag = amplitudeData.imag[i];
                    if (typeof real === 'number' && typeof imag === 'number') {
                      const magnitude = Math.sqrt(real * real + imag * imag);
                      magnitudes.push(magnitude);
                    }
                  }
                } else if (amplitudeData.length !== undefined) {
                  // Handle case where it might be a TypedArray or similar
                  magnitudes = Array.from(amplitudeData);
                }
                
                featureFrames.amplitudeSpectrum.push(magnitudes);
                // console.log('🎵 Amplitude spectrum stored (converted):', {
                //   magnitudeLength: magnitudes.length,
                //   sampleMagnitudes: magnitudes.slice(0, 5)
                // });
              } else {
                // Fallback empty array
                featureFrames.amplitudeSpectrum.push([]);
                // console.log('🎵 No valid amplitude spectrum data, using empty array');
              }
            } else {
              // Handle other features
              if (features[feature] !== undefined && features[feature] !== null) {
                featureFrames[feature].push(features[feature]);
              } else {
                // Provide fallback value for missing features
                featureFrames[feature].push(0);
              }
            }
          }
        }
      }
    } catch (extractError) {
      console.warn('Feature extraction failed for features:', featuresToExtract, 'Error:', extractError);
      console.warn('Extract error details:', {
        error: extractError.message,
        stack: extractError.stack,
        featuresToExtract: featuresToExtract
      });
      // Continue with basic analysis using available features
      features = {};
    }

    // Calculate basic audio analysis fields
    if (features) {
      const rms = features.rms || 0;
      featureFrames.volume.push(rms);
      
      // Calculate frequency band energies (simplified)
      const spectralCentroid = features.spectralCentroid || 0;
      // Removed unused variable: spectralRolloff
      
      // Map spectral features to frequency bands
      featureFrames.bass.push(spectralCentroid < 200 ? rms : 0);
      featureFrames.mid.push(spectralCentroid >= 200 && spectralCentroid < 2000 ? rms : 0);
      featureFrames.treble.push(spectralCentroid >= 2000 ? rms : 0);
      
      // Store all features as a combined array
      const allFeatures = Object.values(features).flat().filter(v => typeof v === 'number');
      featureFrames.features.push(allFeatures.length > 0 ? allFeatures[0] : 0);
    }

    // Note: FFT data is now extracted via complexSpectrum in the main feature extraction loop

    // Extract stereo window for Lissajous stereometer (mono for now)
    const N = 1024;
    const leftWindow = buffer.slice(-N);
    // For mono, provide both left and right as the same array
    featureFrames.stereoWindow_left = Array.from(leftWindow);
    featureFrames.stereoWindow_right = Array.from(leftWindow);
    
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
    } else if (key === 'amplitudeSpectrum') {
      // Use the latest amplitude spectrum frame as the FFT data
      flatFeatures.fft = featureFrames.amplitudeSpectrum.length > 0 ? featureFrames.amplitudeSpectrum[featureFrames.amplitudeSpectrum.length - 1] : [];
      // console.log('🎵 Final FFT data processing:', {
      //   amplitudeSpectrumFrames: featureFrames.amplitudeSpectrum.length,
      //   finalFftLength: flatFeatures.fft.length,
      //   sampleFftValues: flatFeatures.fft.slice(0, 5)
      // });
      
      // Production safe: No fallback FFT generation with fake data
      if (flatFeatures.fft.length === 0) {
        console.warn('⚠️ No amplitude spectrum data available - FFT will be empty');
        // Leave FFT empty rather than generating fake data
        flatFeatures.fft = [];
      }
      
      // Calculate frequency bins for amplitude spectrum
      if (featureFrames.fftFrequencies.length === 0 && flatFeatures.fft.length > 0) {
        const fftFrequencies = [];
        for (let i = 0; i < flatFeatures.fft.length; i++) {
          const frequency = (i * sampleRate) / bufferSize;
          fftFrequencies.push(frequency);
        }
        flatFeatures.fftFrequencies = fftFrequencies;
      }
    } else if (key === 'stereoWindow_left' || key === 'stereoWindow_right') {
      flatFeatures[key] = featureFrames[key];
    } else if (key === 'volume' || key === 'bass' || key === 'mid' || key === 'treble' || key === 'features') {
      // Ensure these fields are arrays
      flatFeatures[key] = Array.isArray(featureFrames[key]) ? featureFrames[key] : [];
    } else {
      flatFeatures[key] = featureFrames[key];
    }
  }

  console.log('🎵 Final analysis result:', {
    keys: Object.keys(flatFeatures),
    fftLength: flatFeatures.fft ? flatFeatures.fft.length : 0,
    hasFft: !!flatFeatures.fft
  });
  return flatFeatures;
}

// REMOVED: setupStemAnalysis and getStemFeatures functions
// These were used by the real-time analysis system that's no longer needed

// REMOVED: Real-time analysis loop functions (startAnalysis, stopAnalysis, analysisLoop, performMeydaAnalysis)
// These were part of the legacy real-time analysis system that's no longer used.
// The current system uses cached server-side analysis instead of real-time client-side analysis.

// REMOVED: updateQuality and sendMetrics functions
// These were used by the real-time analysis system that's no longer needed

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

// REMOVED: restart-analysis capability
// This was part of the real-time analysis system that's no longer needed

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
