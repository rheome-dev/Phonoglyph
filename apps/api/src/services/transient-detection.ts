import { z } from 'zod';
import type { TransientEvent } from '../types/event-based-mapping';

/**
 * Transient Detection Service
 * Detects percussive onsets and transients in audio signals
 */
export class TransientDetectionService {
  private sampleRate: number;
  private bufferSize: number;
  private hopSize: number;
  private previousSpectrum: Float32Array | null = null;

  constructor(sampleRate: number = 44100, bufferSize: number = 2048) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.hopSize = Math.floor(bufferSize / 4); // 75% overlap
  }

  /**
   * Detect transients from audio buffer
   */
  public detectTransients(
    audioBuffer: Float32Array,
    threshold: number = 0.1
  ): TransientEvent[] {
    if (!audioBuffer || audioBuffer.length === 0) return [];

    const transients: TransientEvent[] = [];
    const spectralFlux = this.calculateSpectralFlux(audioBuffer);
    const onsetIndices = this.findOnsets(spectralFlux, threshold);

    for (const onsetIndex of onsetIndices) {
      const transient = this.createTransientEvent(audioBuffer, onsetIndex);
      if (transient) {
        transients.push(transient);
      }
    }

    return transients;
  }

  /**
   * Calculate spectral flux for onset detection
   */
  private calculateSpectralFlux(audioBuffer: Float32Array): number[] {
    if (!audioBuffer || audioBuffer.length === 0) return [];

    const numFrames = Math.floor((audioBuffer.length - this.bufferSize) / this.hopSize) + 1;
    const spectralFlux: number[] = [];

    for (let frame = 0; frame < numFrames; frame++) {
      const frameStart = frame * this.hopSize;
      const frameEnd = Math.min(frameStart + this.bufferSize, audioBuffer.length);
      const frameData = audioBuffer.slice(frameStart, frameEnd);

      // Apply Hann window
      const windowedFrame = this.applyHannWindow(frameData);

      // Calculate magnitude spectrum
      const spectrum = this.calculateMagnitudeSpectrum(windowedFrame);

      // Calculate spectral flux
      let flux = 0;
      if (this.previousSpectrum) {
        for (let bin = 0; bin < spectrum.length; bin++) {
          const currentMagnitude = spectrum[bin];
          const previousMagnitude = this.previousSpectrum[bin];
          if (currentMagnitude !== undefined && previousMagnitude !== undefined) {
            const diff = currentMagnitude - previousMagnitude;
            flux += diff > 0 ? diff : 0; // Only positive differences
          }
        }
      }

      spectralFlux.push(flux);
      this.previousSpectrum = new Float32Array(spectrum);
    }

    return spectralFlux;
  }

  /**
   * Apply Hann window to reduce spectral leakage
   */
  private applyHannWindow(frame: Float32Array): Float32Array {
    if (!frame || frame.length === 0) return new Float32Array();

    const windowed = new Float32Array(frame.length);

    for (let i = 0; i < frame.length; i++) {
      const sample = frame[i];
      if (sample !== undefined) {
        const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
        windowed[i] = sample * windowValue;
      }
    }

    return windowed;
  }

  /**
   * Calculate magnitude spectrum using DFT
   */
  private calculateMagnitudeSpectrum(frame: Float32Array): Float32Array {
    if (!frame || frame.length === 0) return new Float32Array();

    const spectrum = new Float32Array(Math.floor(frame.length / 2));

    for (let k = 0; k < spectrum.length; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < frame.length; n++) {
        const sample = frame[n];
        if (sample !== undefined) {
          const angle = -2 * Math.PI * k * n / frame.length;
          real += sample * Math.cos(angle);
          imag += sample * Math.sin(angle);
        }
      }

      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }

    return spectrum;
  }

  /**
   * Find onset indices from spectral flux
   */
  private findOnsets(spectralFlux: number[], threshold: number): number[] {
    if (!spectralFlux || spectralFlux.length === 0) return [];

    const onsets: number[] = [];
    const adaptiveThreshold = this.calculateAdaptiveThreshold(spectralFlux);

    for (let i = 1; i < spectralFlux.length - 1; i++) {
      const current = spectralFlux[i];
      const prev = spectralFlux[i - 1];
      const next = spectralFlux[i + 1];
      const thresholdValue = adaptiveThreshold[i];

      if (current !== undefined && prev !== undefined && next !== undefined && thresholdValue !== undefined) {
        if (current > thresholdValue && current > prev && current > next) {
          onsets.push(i);
        }
      }
    }

    return onsets;
  }

  /**
   * Calculate adaptive threshold for onset detection
   */
  private calculateAdaptiveThreshold(spectralFlux: number[]): number[] {
    if (!spectralFlux || spectralFlux.length === 0) return [];

    const threshold: number[] = [];
    const windowSize = 10; // Local averaging window

    for (let i = 0; i < spectralFlux.length; i++) {
      let sum = 0;
      let count = 0;

      for (let j = Math.max(0, i - windowSize); j < Math.min(spectralFlux.length, i + windowSize + 1); j++) {
        const value = spectralFlux[j];
        if (value !== undefined) {
          sum += value;
          count++;
        }
      }

      threshold.push(count > 0 ? (sum / count) * 1.5 : 0); // 1.5x local mean
    }

    return threshold;
  }

  /**
   * Create transient event from onset index
   */
  private createTransientEvent(audioBuffer: Float32Array, onsetIndex: number): TransientEvent | null {
    if (!audioBuffer || onsetIndex < 0 || onsetIndex >= audioBuffer.length) return null;

    const timestamp = (onsetIndex * this.hopSize) / this.sampleRate;
    const peakAmplitude = Math.abs(audioBuffer[onsetIndex] || 0);
    const duration = this.estimateTransientDuration(audioBuffer, onsetIndex);
    const frequency = this.estimateDominantFrequency(audioBuffer, onsetIndex);
    const confidence = this.calculateConfidence(audioBuffer, onsetIndex);

    return {
      timestamp,
      amplitude: peakAmplitude,
      frequency,
      duration,
      confidence,
      envelope: {
        attack: 0.01,
        decay: duration * 0.3,
        sustain: 0.7,
        release: duration * 0.5
      }
    };
  }

  /**
   * Estimate transient duration from audio envelope
   */
  private estimateTransientDuration(audioBuffer: Float32Array, onsetIndex: number): number {
    if (!audioBuffer || onsetIndex < 0 || onsetIndex >= audioBuffer.length) return 0.1;

    const threshold = Math.abs(audioBuffer[onsetIndex] || 0) * 0.1;
    let duration = 0;

    // Look forward to find when amplitude drops below threshold
    for (let i = onsetIndex; i < audioBuffer.length; i++) {
      const amplitude = Math.abs(audioBuffer[i] || 0);
      if (amplitude < threshold) {
        duration = (i - onsetIndex) / this.sampleRate;
        break;
      }
    }

    return Math.max(0.01, Math.min(0.5, duration)); // Clamp between 10ms and 500ms
  }

  /**
   * Estimate dominant frequency at onset
   */
  private estimateDominantFrequency(audioBuffer: Float32Array, onsetIndex: number): number {
    if (!audioBuffer || onsetIndex < 0 || onsetIndex >= audioBuffer.length) return 1000;

    const frameStart = Math.max(0, onsetIndex - Math.floor(this.bufferSize / 2));
    const frameEnd = Math.min(audioBuffer.length, frameStart + this.bufferSize);
    const frame = audioBuffer.slice(frameStart, frameEnd);

    const spectrum = this.calculateMagnitudeSpectrum(frame);
    let maxMagnitude = 0;
    let dominantBin = 0;

    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = spectrum[i];
      if (magnitude !== undefined && magnitude > maxMagnitude) {
        maxMagnitude = magnitude;
        dominantBin = i;
      }
    }

    return (dominantBin * this.sampleRate) / (2 * spectrum.length);
  }

  /**
   * Calculate confidence score for transient detection
   */
  private calculateConfidence(audioBuffer: Float32Array, onsetIndex: number): number {
    if (!audioBuffer || onsetIndex < 0 || onsetIndex >= audioBuffer.length) return 0;

    const peakAmplitude = Math.abs(audioBuffer[onsetIndex] || 0);
    const sustainSum = this.calculateSustainEnergy(audioBuffer, onsetIndex);
    const ratio = peakAmplitude / (sustainSum + 0.001); // Avoid division by zero

    return Math.min(1, ratio / 10); // Normalize to 0-1 range
  }

  /**
   * Calculate sustain energy after onset
   */
  private calculateSustainEnergy(audioBuffer: Float32Array, onsetIndex: number): number {
    if (!audioBuffer || onsetIndex < 0 || onsetIndex >= audioBuffer.length) return 0;

    const windowSize = Math.floor(this.sampleRate * 0.1); // 100ms window
    let sustainSum = 0;
    let count = 0;

    for (let i = onsetIndex; i < Math.min(onsetIndex + windowSize, audioBuffer.length); i++) {
      const amplitude = Math.abs(audioBuffer[i] || 0);
      sustainSum += amplitude;
      count++;
    }

    return count > 0 ? sustainSum / count : 0;
  }
}