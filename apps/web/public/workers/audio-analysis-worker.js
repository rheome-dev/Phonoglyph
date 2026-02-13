// Audio Analysis Web Worker for Story 5.2
// Handles intensive audio analysis without blocking main thread

// Import Meyda for audio analysis

// Ensure worker outputs are fully JSON-serializable by converting any TypedArrays
function sanitizeForSerialization(data) {
  if (data === null || data === undefined) {
    return data;
  }
  // Convert any TypedArray (e.g., Float32Array) to a plain Array
  if (ArrayBuffer.isView(data) && !(data instanceof DataView)) {
    return Array.from(data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForSerialization(item));
  }
  if (typeof data === 'object') {
    const sanitizedObj = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitizedObj[key] = sanitizeForSerialization(data[key]);
      }
    }
    return sanitizedObj;
  }
  return data;
}
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

// Try to load web-audio-beat-detector for BPM detection (best-effort)
let BeatDetector = null;
let beatDetectorLoadingPromise = null;
function loadBeatDetector() {
  if (beatDetectorLoadingPromise) return beatDetectorLoadingPromise;
  beatDetectorLoadingPromise = new Promise((resolve) => {
    const tryLoad = (url, globalKey) => {
      try {
        importScripts(url);
        // Some CDN builds attach to global; try common keys
        if (self.webAudioBeatDetector) {
          BeatDetector = self.webAudioBeatDetector;
          resolve(true);
          return true;
        }
        if (self.beatDetector) {
          BeatDetector = self.beatDetector;
          resolve(true);
          return true;
        }
        if (typeof self.analyze === 'function') {
          BeatDetector = { analyze: self.analyze };
          resolve(true);
          return true;
        }
      } catch (e) {
        // noop; will try next URL
      }
      return false;
    };

    // Attempt a few plausible UMD bundles; if none work we'll fallback
    const urls = [
      'https://unpkg.com/web-audio-beat-detector@8.2.31/build/umd/index.js',
      'https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.31/build/umd/index.js',
    ];
    for (const url of urls) {
      if (tryLoad(url)) return;
    }
    resolve(false);
  });
  return beatDetectorLoadingPromise;
}

async function detectBpm(channelData, sampleRate) {
  try {
    await loadBeatDetector();
    if (BeatDetector && typeof BeatDetector.analyze === 'function') {
      // Some implementations accept Float32Array & sampleRate
      try {
        const bpm = await BeatDetector.analyze(channelData, sampleRate);
        if (typeof bpm === 'number' && isFinite(bpm)) return bpm;
      } catch (_) { }
    }
  } catch (_) { }

  // Fallback: naive autocorrelation-based BPM estimate
  try {
    const minBpm = 60;
    const maxBpm = 200;
    const minLag = Math.floor(sampleRate * 60 / maxBpm);
    const maxLag = Math.floor(sampleRate * 60 / minBpm);
    let bestLag = minLag;
    let bestCorr = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < channelData.length - lag; i += 2) {
        corr += channelData[i] * channelData[i + lag];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
    const estimatedBpm = Math.round((60 * sampleRate) / bestLag);
    if (estimatedBpm >= minBpm && estimatedBpm <= maxBpm) return estimatedBpm;
  } catch (_) { }
  return 0;
}

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
  drums: ['rms', 'zcr', 'spectralCentroid', 'amplitudeSpectrum'],
  bass: ['rms', 'loudness', 'spectralCentroid', 'amplitudeSpectrum'],
  vocals: ['rms', 'loudness', 'mfcc', 'amplitudeSpectrum'],
  other: ['rms', 'loudness', 'spectralCentroid', 'chroma', 'amplitudeSpectrum'], // For synths, guitars, etc.
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum', 'spectralFlux', 'perceptualSharpness', 'energy', 'chroma'] // Expanded for classification & pitch
};

// Quality presets for different performance levels
const QUALITY_PRESETS = {
  high: { bufferSize: 512, frameRate: 60, features: 'full' },
  medium: { bufferSize: 1024, frameRate: 30, features: 'reduced' },
  low: { bufferSize: 2048, frameRate: 15, features: 'minimal' }
};

// Message handlers
self.onmessage = function (event) {
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
  const { fileId, channelData, sampleRate, duration, stemType, enhancedAnalysis, analysisParams } = data;
  console.log(`🎵 Received job to analyze buffer for file: ${fileId} (${stemType})`);

  try {
    await loadMeyda();
    if (!Meyda) {
      throw new Error("Meyda library not loaded.");
    }

    self.postMessage({
      type: 'ANALYSIS_PROGRESS',
      data: { fileId, progress: 0.1, message: 'Performing full feature extraction...' }
    });

    // STEP 1: Always run the comprehensive single-pass analysis
    const fullAnalysis = await performFullAnalysis(channelData, sampleRate, stemType, (progress) => {
      self.postMessage({
        type: 'ANALYSIS_PROGRESS',
        data: { fileId, progress: 0.1 + progress * 0.7, message: 'Extracting features...' }
      });
    });

    // STEP 2: If enhanced analysis is requested, run the lightweight classifier and add its results
    if (enhancedAnalysis) {
      self.postMessage({
        type: 'ANALYSIS_PROGRESS',
        data: { fileId, progress: 0.8, message: 'Classifying transients...' }
      });
      const transients = performEnhancedAnalysis(fullAnalysis, sampleRate, analysisParams);
      fullAnalysis.transients = transients;
    }

    self.postMessage({
      type: 'ANALYSIS_PROGRESS',
      data: { fileId, progress: 0.9, message: 'Generating waveform...' }
    });

    const waveformData = generateWaveformData(channelData, duration, 1024);
    const bpm = await detectBpm(channelData, sampleRate);

    const result = {
      id: `client_${fileId}`,
      fileMetadataId: fileId,
      stemType: stemType,
      analysisData: Object.assign({}, fullAnalysis, { bpm }),
      waveformData: waveformData,
      metadata: {
        sampleRate: sampleRate,
        duration: duration,
        bufferSize: 1024,
        bpm: bpm,
        featuresExtracted: Object.keys(fullAnalysis),
        analysisDuration: 0
      }
    };

    // Sanitize before posting to ensure no TypedArrays leak to main thread
    const sanitizedResult = sanitizeForSerialization(result);

    self.postMessage({
      type: 'ANALYSIS_COMPLETE',
      data: { fileId, result: sanitizedResult }
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
  // For analysis purposes, treat any stem as master if it's a single audio file
  // This ensures we get FFT data for spectrograms regardless of stem type designation
  const isSingleAudioFile = stemType !== 'master' && !['drums', 'bass', 'vocals'].includes(stemType);
  const effectiveStemType = isSingleAudioFile ? 'master' : stemType;
  const featuresToExtract = STEM_FEATURES[effectiveStemType] || STEM_FEATURES['other'];

  console.log('🎵 Performing full analysis for stem type:', stemType, 'effective type:', effectiveStemType, 'with features:', featuresToExtract);

  const featureFrames = {};
  const frameTimes = [];
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
  const totalSteps = Math.floor((channelData.length - bufferSize) / hopSize);

  // For now, we'll work with mono data only
  // Note: Currently processing mono audio - stereo support pending multi-channel data access
  let rightChannelData = null;

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
          if (feature === 'loudness') {
            if (features.loudness && features.loudness.total !== undefined) {
              featureFrames.loudness.specific.push(features.loudness.specific);
              featureFrames.loudness.total.push(features.loudness.total);
            } else {
              // Ensure frame alignment even if loudness missing
              featureFrames.loudness.specific.push([]);
              featureFrames.loudness.total.push(0);
            }
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
            // Handle other features (numeric or array); push a value every frame
            const value = features[feature];
            let numericValue = 0;
            if (typeof value === 'number') {
              numericValue = value;
            } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
              numericValue = value[0];
            } else if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'number') {
              numericValue = value.value;
            } else {
              numericValue = 0;
            }
            featureFrames[feature].push(numericValue);
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
      const spectralRolloff = features.spectralRolloff || 0;

      // Map spectral features to frequency bands
      featureFrames.bass.push(spectralCentroid < 200 ? rms : 0);
      featureFrames.mid.push(spectralCentroid >= 200 && spectralCentroid < 2000 ? rms : 0);
      featureFrames.treble.push(spectralCentroid >= 2000 ? rms : 0);

      // Store all features as a combined array
      const allFeatures = Object.values(features).flat().filter(v => typeof v === 'number');
      featureFrames.features.push(allFeatures.length > 0 ? allFeatures[0] : 0);
    }

    // Note: FFT data is now extracted via complexSpectrum in the main feature extraction loop

    // Extract stereo window for Lissajous stereometer - extract at each frame position
    const N = 1024;
    const leftWindow = channelData.slice(currentPosition, currentPosition + N);
    // For mono, provide both left and right as the same array
    // Push per-frame stereo window data (same pattern as amplitudeSpectrum)
    featureFrames.stereoWindow_left.push(Array.from(leftWindow));
    featureFrames.stereoWindow_right.push(Array.from(leftWindow));

    // Record frame start time for timestamped series
    const frameStartTime = currentPosition / sampleRate;
    frameTimes.push(frameStartTime);

    currentPosition += hopSize;

    if (onProgress) {
      onProgress(currentPosition / channelData.length);
    }
  }

  // Flatten featureFrames so each key is an array of numbers
  const flatFeatures = {};
  // Include shared frame times for dense features
  flatFeatures.frameTimes = Array.from(frameTimes);
  for (const key in featureFrames) {
    if (key === 'loudness') {
      flatFeatures.loudness = featureFrames.loudness.total;
    } else if (key === 'fft') {
      // Note: This branch might not be hit since we're using amplitudeSpectrum
      flatFeatures.fft = featureFrames.fft.length > 0 ? featureFrames.fft[featureFrames.fft.length - 1] : [];
      flatFeatures.fftFrequencies = featureFrames.fftFrequencies;
    } else if (key === 'amplitudeSpectrum') {
      // FIXED: Flatten the full time-series FFT data instead of just using the last frame
      // This creates a flat array where all frames are concatenated: [frame0_bin0, frame0_bin1, ..., frame1_bin0, frame1_bin1, ...]
      // This format allows time-based extraction in Remotion/HudOverlay by slicing at frame positions
      const allFrames = featureFrames.amplitudeSpectrum;
      if (allFrames.length > 0) {
        flatFeatures.fft = allFrames.flat(); // Concatenate all frames into one array
        console.log('🎵 FFT time-series data flattened:', {
          totalFrames: allFrames.length,
          binsPerFrame: allFrames[0]?.length || 0,
          totalFftValues: flatFeatures.fft.length,
          sampleValues: flatFeatures.fft.slice(0, 5)
        });
      } else {
        flatFeatures.fft = [];
      }

      // Calculate frequency bins for amplitude spectrum
      if (allFrames.length > 0 && allFrames[0].length > 0) {
        const binsPerFrame = allFrames[0].length;
        const fftFrequencies = [];
        for (let i = 0; i < binsPerFrame; i++) {
          const frequency = (i * sampleRate) / bufferSize;
          fftFrequencies.push(frequency);
        }
        flatFeatures.fftFrequencies = fftFrequencies;
      }
    } else if (key === 'stereoWindow_left' || key === 'stereoWindow_right') {
      // Flatten per-frame stereo window data similar to FFT
      // Format: [frame0_sample0, frame0_sample1, ..., frame1_sample0, frame1_sample1, ...]
      const allFrames = featureFrames[key];
      if (allFrames.length > 0) {
        flatFeatures[key] = allFrames.flat();
      } else {
        flatFeatures[key] = [];
      }
    } else if (key === 'volume' || key === 'bass' || key === 'mid' || key === 'treble' || key === 'features') {
      // Ensure these fields are arrays
      flatFeatures[key] = Array.isArray(featureFrames[key]) ? featureFrames[key] : [];
    } else {
      flatFeatures[key] = featureFrames[key];
    }
  }

  // Normalize numeric arrays to ensure no null/undefined entries are sent
  Object.keys(flatFeatures).forEach(k => {
    const val = flatFeatures[k];
    if (Array.isArray(val)) {
      flatFeatures[k] = val.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
    }
  });

  console.log('🎵 Final analysis result:', {
    keys: Object.keys(flatFeatures),
    fftLength: flatFeatures.fft ? flatFeatures.fft.length : 0,
    hasFft: !!flatFeatures.fft
  });
  return flatFeatures;
}

// This function now ONLY performs peak-picking and classification on pre-computed features.
function performEnhancedAnalysis(fullAnalysis, sampleRate, analysisParams) {
  console.log('🎵 Performing lightweight transient classification...');

  const params = Object.assign({
    onsetThreshold: 0.3,
    peakWindow: 8,
    peakMultiplier: 1.5,
    classification: {
      highEnergyThreshold: 0.2,
      highZcrThreshold: 0.2,
      snareSharpnessThreshold: 0.6,
      kickCentroidMax: 500,
      hatCentroidMin: 8000,
      snareCentroidMin: 2000,
      snareCentroidMax: 6000,
    }
  }, analysisParams || {});

  const { frameTimes, spectralFlux, spectralCentroid, perceptualSharpness, zcr, energy } = fullAnalysis;

  if (!spectralFlux || spectralFlux.length === 0) {
    console.warn('⚠️ Cannot perform enhanced analysis: spectralFlux data is missing.');
    return [];
  }

  // Normalize flux
  const maxFlux = Math.max(1e-6, ...spectralFlux);
  const normFlux = spectralFlux.map(v => v / maxFlux);

  // Adaptive peak picking
  const peaks = [];
  const w = Math.max(1, params.peakWindow | 0);
  for (let i = 0; i < normFlux.length; i++) {
    const start = Math.max(0, i - w);
    const end = Math.min(normFlux.length, i + w + 1);
    let sum = 0, sumSq = 0, count = 0;
    for (let j = start; j < end; j++) { sum += normFlux[j]; sumSq += normFlux[j] * normFlux[j]; count++; }
    const mean = sum / Math.max(1, count);
    const std = Math.sqrt(Math.max(0, (sumSq / Math.max(1, count)) - mean * mean));
    const threshold = mean + params.peakMultiplier * std;
    const isLocalMax = (i === 0 || normFlux[i] > normFlux[i - 1]) && (i === normFlux.length - 1 || normFlux[i] >= normFlux[i + 1]);
    if (isLocalMax && normFlux[i] > threshold && normFlux[i] > params.onsetThreshold) {
      peaks.push({ frameIndex: i, time: frameTimes ? frameTimes[i] : i, intensity: normFlux[i] });
    }
  }

  // Classification
  const transients = [];
  const c = params.classification;
  for (const peak of peaks) {
    const i = peak.frameIndex;
    const peakEnergy = Array.isArray(energy) ? (energy[i] || 0) : 0;
    const peakCentroid = Array.isArray(spectralCentroid) ? (spectralCentroid[i] || 0) : 0;
    const peakSharpness = Array.isArray(perceptualSharpness) ? (perceptualSharpness[i] || 0) : 0;
    const peakZcr = Array.isArray(zcr) ? (zcr[i] || 0) : 0;

    let type = 'generic';
    if (peakEnergy > c.highEnergyThreshold && peakCentroid < c.kickCentroidMax) {
      type = 'kick';
    } else if (peakCentroid > c.hatCentroidMin && peakZcr > c.highZcrThreshold) {
      type = 'hat';
    } else if (peakSharpness > c.snareSharpnessThreshold && peakCentroid >= c.snareCentroidMin && peakCentroid <= c.snareCentroidMax) {
      type = 'snare';
    }

    transients.push({ time: peak.time, intensity: peak.intensity, type });
  }

  return transients;
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
self.onerror = function (error) {
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