// Audio Analysis Worker (TypeScript) - no BPM detection here
// Focused on frame-by-frame feature extraction using Meyda

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Meyda types may not include worker context usage explicitly
import Meyda from 'meyda';

type AnalyzeBufferMessage = {
  type: 'ANALYZE_BUFFER';
  data: {
    fileId: string;
    channelData: Float32Array;
    sampleRate: number;
    duration: number;
    stemType: string;
    enhancedAnalysis?: boolean;
    analysisParams?: Record<string, unknown>;
  };
};

type WorkerMessage = AnalyzeBufferMessage | { type: string; data?: unknown };

const STEM_FEATURES: Record<string, string[]> = {
  // For drums, compute spectralFlux manually from amplitudeSpectrum
  drums: ['rms', 'zcr', 'spectralCentroid', 'amplitudeSpectrum', 'energy', 'perceptualSharpness', 'loudness'],
  bass: ['rms', 'loudness', 'spectralCentroid'],
  vocals: ['rms', 'loudness', 'mfcc', 'chroma'],
  other: ['rms', 'loudness', 'spectralCentroid', 'chroma'],
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum', 'perceptualSharpness', 'energy', 'chroma'],
};

function generateWaveformData(channelData: Float32Array, duration: number, points = 1024) {
  const totalSamples = channelData.length;
  const samplesPerPoint = Math.max(1, Math.floor(totalSamples / points));
  const waveform = new Float32Array(points);

  for (let i = 0; i < points; i++) {
    const start = i * samplesPerPoint;
    const end = Math.min(start + samplesPerPoint, totalSamples);
    let max = 0;
    for (let j = start; j < end; j++) {
      const sample = Math.abs(channelData[j] ?? 0);
      if (sample > max) max = sample;
    }
    waveform[i] = max;
  }

  return {
    points: Array.from(waveform),
    duration: duration,
    sampleRate: Math.max(1, Math.floor(channelData.length / Math.max(0.000001, duration))),
    markers: [] as Array<{ time: number; type: string; intensity: number; frequency?: number }>,
  };
}

function performFullAnalysis(
  channelData: Float32Array,
  sampleRate: number,
  stemType: string,
  onProgress?: (p: number) => void
) {
  const isSingleAudioFile = stemType !== 'master' && !['drums', 'bass', 'vocals'].includes(stemType);
  const effectiveStemType = isSingleAudioFile ? 'master' : stemType;
  const featuresToExtract = STEM_FEATURES[effectiveStemType] || STEM_FEATURES['other'];

  const featureFrames: Record<string, any> = {};
  const frameTimes: number[] = [];
  featuresToExtract.forEach((f) => {
    featureFrames[f] = [];
  });
  // Add manual and derived features
  featureFrames.spectralFlux = [];
  featureFrames.volume = [];
  featureFrames.bass = [];
  featureFrames.mid = [];
  featureFrames.treble = [];

  const bufferSize = 1024;
  const hopSize = 512;
  let currentPosition = 0;
  let previousSpectrum: number[] | null = null;

  while (currentPosition + bufferSize <= channelData.length) {
    const buffer = channelData.slice(currentPosition, currentPosition + bufferSize);
    let features: any = null;

    try {
      // Revert to using the stateless Meyda.extract method
      features = (Meyda as any).extract(featuresToExtract, buffer);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Meyda extraction failed:', error);
      features = {}; // Silently fail for this frame but continue
    }

    // --- Manual spectral flux calculation (stateful) ---
    const currentSpectrum = features?.amplitudeSpectrum as number[] | undefined;
    let flux = 0;
    if (previousSpectrum && currentSpectrum && Array.isArray(previousSpectrum) && Array.isArray(currentSpectrum)) {
      const len = Math.min(previousSpectrum.length, currentSpectrum.length);
      for (let i = 0; i < len; i++) {
        const diff = (currentSpectrum[i] || 0) - (previousSpectrum[i] || 0);
        if (diff > 0) flux += diff;
      }
    }
    featureFrames.spectralFlux.push(flux);
    previousSpectrum = currentSpectrum ? Array.from(currentSpectrum) : null;

    // Process and sanitize all extracted features
    if (features) {
      for (const feature of featuresToExtract) {
        const value = features[feature];
        if (Array.isArray(value)) {
          const sanitizedArray = value.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
          if (feature === 'chroma') {
            const dominantChromaIndex = sanitizedArray.indexOf(Math.max(...sanitizedArray));
            featureFrames[feature].push(dominantChromaIndex);
          } else {
            featureFrames[feature].push(sanitizedArray[0] || 0); // e.g., for mfcc
          }
        } else {
          const sanitizedValue = (typeof value === 'number' && isFinite(value)) ? value : 0;
          featureFrames[feature].push(sanitizedValue);
        }
      }
      // Derived features
      const rms = features.rms || 0;
      const spectralCentroid = features.spectralCentroid || 0;
      featureFrames.volume.push(rms);
      featureFrames.bass.push(spectralCentroid < 200 ? rms : 0);
      featureFrames.mid.push(spectralCentroid >= 200 && spectralCentroid < 2000 ? rms : 0);
      featureFrames.treble.push(spectralCentroid >= 2000 ? rms : 0);
    } else {
      // If features object is null or empty, push default values to maintain array alignment
      featuresToExtract.forEach(f => featureFrames[f].push(0));
      featureFrames.volume.push(0);
      featureFrames.bass.push(0);
      featureFrames.mid.push(0);
      featureFrames.treble.push(0);
    }

    const frameStartTime = currentPosition / sampleRate;
    frameTimes.push(frameStartTime);
    currentPosition += hopSize;
    if (onProgress) onProgress(currentPosition / channelData.length);
  }

  // Final cleanup and shaping
  const flatFeatures: Record<string, any> = { ...featureFrames, frameTimes };
  return flatFeatures as Record<string, number[] | number>;
}

function performEnhancedAnalysis(
  fullAnalysis: Record<string, number[] | number>,
  sampleRate: number,
  analysisParams?: any
): { time: number; intensity: number; type: string }[] {
  console.log('🎵 Performing lightweight transient classification...');

  const params = Object.assign({
    onsetThreshold: 0.01,
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

  if (!spectralFlux || !Array.isArray(spectralFlux) || spectralFlux.length === 0) {
    console.warn('⚠️ Cannot perform enhanced analysis: spectralFlux data is missing.');
    return [];
  }

  const maxFlux = Math.max(1e-6, ...(spectralFlux as number[]));
  const normFlux = (spectralFlux as number[]).map(v => v / maxFlux);

  const peaks: { frameIndex: number; time: number; intensity: number }[] = [];
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
      const frameTimesArray = Array.isArray(frameTimes) ? frameTimes : [];
      peaks.push({ frameIndex: i, time: frameTimesArray[i] ?? i, intensity: normFlux[i] });
    }
  }

  const transients: { time: number; intensity: number; type: string }[] = [];
  const c = params.classification;
  for (const peak of peaks) {
    const i = peak.frameIndex;
    const energyArray = Array.isArray(energy) ? energy : [];
    const spectralCentroidArray = Array.isArray(spectralCentroid) ? spectralCentroid : [];
    const perceptualSharpnessArray = Array.isArray(perceptualSharpness) ? perceptualSharpness : [];
    const zcrArray = Array.isArray(zcr) ? zcr : [];
    
    const peakEnergy = energyArray[i] ?? 0;
    const peakCentroid = spectralCentroidArray[i] ?? 0;
    const peakSharpness = perceptualSharpnessArray[i] ?? 0;
    const peakZcr = zcrArray[i] ?? 0;

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

self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { type, data } = event.data as any;
  if (type === 'ANALYZE_BUFFER') {
    const { fileId, channelData, sampleRate, duration, stemType, enhancedAnalysis, analysisParams } = data;
    try {
      const analysis = performFullAnalysis(channelData, sampleRate, stemType, () => {});
      const waveformData = generateWaveformData(channelData, duration, 1024);
      
      // NEW: Run enhanced analysis for transients
      const transients = performEnhancedAnalysis(analysis, sampleRate, analysisParams);

      // Debug: transients and critical arrays
      try {
        // eslint-disable-next-line no-console
        console.log('[worker] onmessage ANALYZE_BUFFER: result snapshot', {
          fileId,
          stemType,
          frameCount: Array.isArray((analysis as any).frameTimes) ? (analysis as any).frameTimes.length : 0,
          // Dump actual arrays for inspection instead of only lengths
          spectralFlux: Array.isArray((analysis as any).spectralFlux) ? (analysis as any).spectralFlux : [],
          chroma: Array.isArray((analysis as any).chroma) ? (analysis as any).chroma : [],
          transientsCount: Array.isArray(transients) ? transients.length : 0
        });
        // Additional explicit dumps for easy viewing in console
        const sf = (analysis as any).spectralFlux as number[] | undefined;
        if (Array.isArray(sf)) {
          const head = sf.slice(0, 50);
          const tail = sf.slice(Math.max(0, sf.length - 50));
          // eslint-disable-next-line no-console
          console.log('[worker] spectralFlux head(50):', head);
          // eslint-disable-next-line no-console
          console.log('[worker] spectralFlux tail(50):', tail);
          // eslint-disable-next-line no-console
          console.log('[worker] spectralFlux csv(first 200):', sf.slice(0, 200).join(','));
        }
        const ch = (analysis as any).chroma as number[] | undefined;
        if (Array.isArray(ch)) {
          const headC = ch.slice(0, 50);
          const tailC = ch.slice(Math.max(0, ch.length - 50));
          // eslint-disable-next-line no-console
          console.log('[worker] chroma head(50):', headC);
          // eslint-disable-next-line no-console
          console.log('[worker] chroma tail(50):', tailC);
          // eslint-disable-next-line no-console
          console.log('[worker] chroma csv(first 200):', ch.slice(0, 200).join(','));
        }
      } catch {}

      const result = {
        id: `client_${fileId}`,
        fileMetadataId: fileId,
        stemType,
        analysisData: {
          ...analysis,
          transients, // Add classified transients to the result
        },
        waveformData,
        metadata: {
          sampleRate,
          duration,
          bufferSize: 1024,
          featuresExtracted: Object.keys(analysis),
          analysisDuration: 0,
        },
      };
      (self as any).postMessage({ type: 'ANALYSIS_COMPLETE', data: { fileId, result } });
    } catch (error: any) {
      (self as any).postMessage({ type: 'ANALYSIS_ERROR', data: { fileId, error: error?.message || 'Analysis failed' } });
    }
  }
};


