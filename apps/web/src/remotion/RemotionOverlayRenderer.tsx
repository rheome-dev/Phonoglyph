import React, { useMemo, useCallback } from 'react';
import { HudOverlay } from '@/components/hud/HudOverlay';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { extractAudioDataAtTime } from './RayboxComposition';

type RemotionOverlayRendererProps = {
  layers: Layer[];
  audioAnalysisData: CachedAudioAnalysisData[];
  currentFrame: number;
  fps: number;
};

// Helper: get feature keys for overlay type (copied from HudOverlayManager)
function getFeatureKeyForOverlay(type: string): string[] {
  switch (type) {
    case 'waveform':
    case 'oscilloscope':
      return ['rms', 'loudness'];
    case 'spectrogram':
    case 'spectrumAnalyzer':
      return ['fft', 'spectralCentroid', 'rms', 'loudness'];
    case 'peakMeter':
      return ['rms', 'loudness'];
    case 'stereometer':
      return ['spectralCentroid', 'rms'];
    case 'midiMeter':
      return ['rms', 'loudness'];
    case 'vuMeter':
      return ['rms', 'loudness'];
    case 'chromaWheel':
      return ['chroma', 'rms'];
    default:
      return ['rms'];
  }
}

export const RemotionOverlayRenderer: React.FC<RemotionOverlayRendererProps> = ({
  layers,
  audioAnalysisData,
  currentFrame,
  fps,
}) => {
  const currentTime = fps > 0 ? currentFrame / fps : 0;
  const cachedAnalysis = audioAnalysisData as CachedAudioAnalysisData[];

  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );

  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );

  // Compute feature data for an overlay layer – adapted from HudOverlayManager,
  // but using cached audio analysis + extractAudioDataAtTime instead of audioController hooks.
  const getFeatureDataForOverlay = useCallback(
    (layer: Layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;

      if (!stemId || cachedAnalysis.length === 0) {
        return null;
      }

      // Find the analysis for this stem
      let analysis = cachedAnalysis.find((a) => a.fileMetadataId === stemId);

      // FALLBACK: If strict ID match fails, try matching by stemType
      if (!analysis) {
        const requestedStemType = settings.stemType || 'master';
        analysis = cachedAnalysis.find(a => a.stemType === requestedStemType);
      }
      if (!analysis || !analysis.analysisData) {
        return null;
      }

      const overlayType = layer.effectType as string;
      const featureKeys = getFeatureKeyForOverlay(overlayType);

      const frameTimes = analysis.analysisData.frameTimes as
        | Float32Array
        | number[]
        | undefined;
      const derivedDurationFromFrames =
        frameTimes && frameTimes.length > 0
          ? (frameTimes as any)[frameTimes.length - 1]
          : undefined;
      const metadataDuration = (analysis as any).metadata?.duration as
        | number
        | undefined;
      const analysisDurationField = (analysis.analysisData as any)
        .analysisDuration as number | undefined;

      const analysisDuration =
        metadataDuration ?? derivedDurationFromFrames ?? analysisDurationField ?? 1;
      const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));

      // For spectrum overlays
      if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
        // Use the shared extractor to get the FFT data for the current time
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.frequencies?.length) {
          // For spectrogram, we might want a buffer, but for now let's return the current frame
          // If the overlay needs a buffer, it should manage it or we need to reconstruct it here
          // properly. However, the issue described is "static" rendering, which usually means
          // the data isn't updating. Returning the correct frame data fixes that.

          // If the component expects a buffer (history), we can try to generate a small one
          // by sampling previous frames, but for a single frame render, just the current
          // FFT is the most critical part.

          // Let's look at how HudOverlay uses this. It likely expects 'fft' to be the current frame.
          // The previous code was generating a fake buffer.

          // Let's reconstruct a small buffer by sampling backwards if needed, 
          // but primarily ensure 'fft' is correct.

          const buffer: Array<Float32Array> = [];
          // Sample a few frames back to give some history if needed
          const numHistoryFrames = 5;
          for (let i = numHistoryFrames; i >= 0; i--) {
            const t = currentTime - (i * 0.05); // 50ms steps
            const histExtracted = extractAudioDataAtTime(
              cachedAnalysis,
              analysis.fileMetadataId,
              Math.max(0, t),
              analysis.stemType
            );
            if (histExtracted?.frequencies) {
              buffer.push(new Float32Array(histExtracted.frequencies));
            } else {
              buffer.push(new Float32Array(extracted.frequencies.length).fill(0));
            }
          }

          return {
            fft: new Float32Array(extracted.frequencies),
            fftBuffer: buffer,
          };
        }

        return null;
      }

      // For stereometer: Approximate stereo window using cached time-domain data
      if (overlayType === 'stereometer') {
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.timeData?.length) {
          const half = Math.floor(extracted.timeData.length / 2);
          const left = extracted.timeData.slice(0, half);
          const right = extracted.timeData.slice(half) || extracted.timeData.slice(0, half);

          return {
            stereoWindow: {
              left,
              right,
            },
          };
        }

        return null;
      }

      // For consoleFeed: Use time-domain window as raw audio buffer
      if (overlayType === 'consoleFeed') {
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.timeData?.length) {
          return { audioBuffer: extracted.timeData };
        }

        return null;
      }

      // For chroma wheel – use cached chroma data directly
      if (overlayType === 'chromaWheel') {
        if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
          return { chroma: analysis.analysisData.chroma };
        }
        return null;
      }

      // For VU meter – derive RMS / peak from cached arrays
      if (overlayType === 'vuMeter') {
        let rmsValue = 0;
        let peakValue = 0;

        if (analysis.analysisData.rms && Array.isArray(analysis.analysisData.rms)) {
          const idx = Math.floor(progress * (analysis.analysisData.rms.length - 1));
          rmsValue = analysis.analysisData.rms[idx] || 0;
        }
        if (analysis.analysisData.loudness && Array.isArray(analysis.analysisData.loudness)) {
          const idx = Math.floor(progress * (analysis.analysisData.loudness.length - 1));
          peakValue = analysis.analysisData.loudness[idx] || 0;
        }

        return { rms: rmsValue, peak: peakValue };
      }

      // Generic array-based features (waveform, peakMeter, etc.)
      let featureArr: number[] | null = null;
      for (const key of featureKeys) {
        const arr = (analysis.analysisData as any)[key];
        if (arr && Array.isArray(arr) && arr.length > 0) {
          featureArr = arr;
          break;
        }
      }

      if (!featureArr) {
        // Fallback: try any available array feature
        // Note: analysis is already validated above (line 81), so it's guaranteed to be defined here
        const availableFeatures = Object.keys(analysis.analysisData).filter(
          (key) =>
            Array.isArray((analysis.analysisData as any)[key]) &&
            (analysis.analysisData as any)[key].length > 0,
        );
        if (availableFeatures.length > 0) {
          featureArr = (analysis.analysisData as any)[availableFeatures[0]];
        }
      }

      if (!featureArr) return null;

      const idx = Math.floor(progress * (featureArr.length - 1));

      // For waveform and oscilloscope, return a window of values
      if (overlayType === 'waveform' || overlayType === 'oscilloscope') {
        const windowSize = 100;
        const endIdx = idx + 1;
        const startIdx = Math.max(0, endIdx - windowSize);
        return featureArr.slice(startIdx, endIdx);
      }

      // For peak meter, return single value
      if (overlayType === 'peakMeter') {
        return featureArr[idx] || 0;
      }

      // Default: single scalar
      return featureArr[idx];
    },
    [cachedAnalysis, currentTime],
  );

  if (activeOverlays.length === 0) {
    return null;
  }

  return (
    <div
      id="remotion-hud-overlays-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {activeOverlays.map((layer) => {
        const featureData = getFeatureDataForOverlay(layer);
        return (
          <HudOverlay
            key={layer.id}
            layer={layer}
            featureData={featureData}
            // No-op callbacks: overlays are not editable in Remotion render
            onOpenModal={() => { }}
            onUpdate={() => { }}
            isSelected={false}
            onSelect={() => { }}
          />
        );
      })}
    </div>
  );
};


