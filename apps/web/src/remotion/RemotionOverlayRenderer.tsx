import React, { useMemo, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { HudOverlay } from '@/components/hud/HudOverlay';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { extractAudioDataAtTime } from './RayboxComposition';

type RemotionOverlayRendererProps = {
  layers: Layer[];
  audioAnalysisData: CachedAudioAnalysisData[];
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
}) => {
  // Use Remotion's hook directly - this gets the frame value during render
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: videoWidth, height: videoHeight } = useVideoConfig();
  const videoDuration = fps > 0 ? durationInFrames / fps : 30; // Fallback to 30s if no duration
  const currentTime = fps > 0 ? frame / fps : 0;
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
      const overlayType = layer.effectType as string;

      if (cachedAnalysis.length === 0) {
        return null;
      }
      // Stereometer can synthesise data without a stemId — use master stem as fallback.
      // All other overlay types need a valid stemId to look up their analysis data.
      if (!stemId && overlayType !== 'stereometer') {
        return null;
      }

      // Find the analysis for this stem
      let analysis = stemId ? cachedAnalysis.find((a) => a.fileMetadataId === stemId) : null;

      // FALLBACK: If strict ID match fails, try matching by stemType
      if (!analysis) {
        const requestedStemType = settings.stemType || 'master';
        analysis = cachedAnalysis.find(a => a.stemType === requestedStemType);
      }
      // Last resort for stereometer: use any available analysis
      if (!analysis && overlayType === 'stereometer') {
        analysis = cachedAnalysis[0] ?? null;
      }
      if (!analysis || !analysis.analysisData) {
        return null;
      }

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

      // FIX: Use videoDuration as ultimate fallback instead of 1 second
      // This prevents overlays from "finishing" immediately and freezing
      const analysisDuration =
        metadataDuration ?? derivedDurationFromFrames ?? analysisDurationField ?? videoDuration;
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

      // For stereometer: Generate animated stereo data from per-frame audio features.
      // Real stereo window data is rarely available (audio analysis is mono), so we
      // synthesise a goniometer waveform from RMS (amplitude) + spectral centroid (phase width).
      // This produces an ellipse whose size animates with volume and whose shape changes
      // with the spectral brightness of the audio — visually meaningful and frame-accurate.
      if (overlayType === 'stereometer') {
        // Try real stereo window data first (if analysis included it)
        const stereoLeft = (analysis.analysisData as any).stereoWindow_left;
        const stereoRight = (analysis.analysisData as any).stereoWindow_right;
        if (
          stereoLeft && stereoRight &&
          Array.isArray(stereoLeft) && Array.isArray(stereoRight) &&
          stereoLeft.length > 0 && stereoRight.length > 0
        ) {
          const samplesPerFrame = 1024;
          const frameTimes = analysis.analysisData.frameTimes as number[] | undefined;
          const totalFrames = Math.floor(stereoLeft.length / samplesPerFrame);
          const effectiveTimes = frameTimes && Array.isArray(frameTimes) && frameTimes.length > 0
            ? frameTimes
            : Array.from({ length: totalFrames }, (_, i) => {
                const dur = (analysis!.analysisData as any).analysisDuration || (analysis as any).metadata?.duration || 30;
                return (i / totalFrames) * dur;
              });
          let frameIdx = 0;
          for (let i = 0; i < effectiveTimes.length; i++) {
            if (effectiveTimes[i] <= currentTime) frameIdx = i; else break;
          }
          const start = frameIdx * samplesPerFrame;
          const end = Math.min(start + samplesPerFrame, stereoLeft.length);
          if (start < stereoLeft.length) {
            return {
              stereoWindow: {
                left: stereoLeft.slice(start, end),
                right: stereoRight.slice(start, end),
              },
            };
          }
        }

        // Synthesise animated stereo from RMS + spectral centroid.
        // Produces an ellipse: size ~ RMS (volume), shape ~ spectralCentroid (brightness).
        const frameTimes = analysis.analysisData.frameTimes as number[] | undefined;
        let frameIdx = 0;
        if (frameTimes && Array.isArray(frameTimes)) {
          for (let i = 0; i < frameTimes.length; i++) {
            if (frameTimes[i] <= currentTime) frameIdx = i; else break;
          }
        }

        const rmsArr = analysis.analysisData.rms;
        const scArr = (analysis.analysisData as any).spectralCentroid;
        const rms = (rmsArr && Array.isArray(rmsArr)) ? (rmsArr[frameIdx] ?? 0) : 0;
        const sc = (scArr && Array.isArray(scArr)) ? (scArr[frameIdx] ?? 0.5) : 0.5;

        // Amplitude: perceptually scaled so quiet passages give a small trace
        const amplitude = Math.min(0.9, Math.sqrt(Math.max(0, rms)) * 2.5);
        // Phase offset: narrow ellipse for low-frequency content, wider for bright audio
        const phaseOffset = 0.15 + sc * 0.5; // [0.15, 0.65] radians

        const numSamples = 512;
        const left: number[] = new Array(numSamples);
        const right: number[] = new Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          const t = (i / numSamples) * Math.PI * 2;
          left[i] = Math.sin(t) * amplitude;
          right[i] = Math.sin(t + phaseOffset) * amplitude;
        }

        return { stereoWindow: { left, right } };
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
        const availableFeatures = Object.keys(analysis!.analysisData).filter(
          (key) =>
            Array.isArray((analysis!.analysisData as any)[key]) &&
            (analysis!.analysisData as any)[key].length > 0,
        );
        if (availableFeatures.length > 0) {
          featureArr = (analysis!.analysisData as any)[availableFeatures[0]];
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
            // Pass video dimensions for headless rendering - avoids 0x0 canvas issue
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            // Pass frame/fps explicitly to avoid calling hooks twice
            frame={frame}
            fps={fps}
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


