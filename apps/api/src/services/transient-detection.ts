import type { 
  TransientEvent, 
  EventBasedMappingConfig 
} from '../types/event-based-mapping';

/**
 * Transient Detection Service
 * Implements onset detection using spectral flux and energy-based methods
 */
export class TransientDetectionService {
  private sampleRate: number;
  private bufferSize: number;
  private hopSize: number;

  constructor(sampleRate: number = 44100, bufferSize: number = 2048) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.hopSize = bufferSize / 4; // 75% overlap
  }

  /**
   * Detect transients in audio signal using spectral flux method
   */
  public detectTransients(
    audioBuffer: Float32Array,
    config: EventBasedMappingConfig
  ): TransientEvent[] {
    const spectralFlux = this.calculateSpectralFlux(audioBuffer);
    const onsetTimes = this.pickOnsets(spectralFlux, config.sensitivity.transient);
    
    return this.createTransientEvents(audioBuffer, onsetTimes, config);
  }

  /**
   * Calculate spectral flux for onset detection
   */
  private calculateSpectralFlux(audioBuffer: Float32Array): Float32Array {
    const numFrames = Math.floor((audioBuffer.length - this.bufferSize) / this.hopSize) + 1;
    const spectralFlux = new Float32Array(numFrames);
    
    let previousSpectrum: Float32Array | null = null;

    for (let frame = 0; frame < numFrames; frame++) {
      const frameStart = frame * this.hopSize;
      const frameEnd = Math.min(frameStart + this.bufferSize, audioBuffer.length);
      const frameData = audioBuffer.slice(frameStart, frameEnd);
      
      // Apply Hann window
      const windowedFrame = this.applyHannWindow(frameData);
      
      // Calculate FFT magnitude spectrum
      const spectrum = this.calculateMagnitudeSpectrum(windowedFrame);
      
      if (previousSpectrum) {
        // Calculate spectral flux (sum of positive differences)
        let flux = 0;
        for (let bin = 0; bin < spectrum.length; bin++) {
          const diff = spectrum[bin] - previousSpectrum[bin];
          if (diff > 0) {
            flux += diff;
          }
        }
        spectralFlux[frame] = flux;
      }
      
      previousSpectrum = spectrum;
    }

    return spectralFlux;
  }

  /**
   * Apply Hann window to reduce spectral leakage
   */
  private applyHannWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length);
    
    for (let i = 0; i < frame.length; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
      windowed[i] = frame[i] * windowValue;
    }
    
    return windowed;
  }

  /**
   * Calculate magnitude spectrum using simple DFT (optimized for real-time processing)
   */
  private calculateMagnitudeSpectrum(frame: Float32Array): Float32Array {
    const spectrum = new Float32Array(Math.floor(frame.length / 2));
    
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < frame.length; n++) {
        const angle = -2 * Math.PI * k * n / frame.length;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  /**
   * Pick onset times using adaptive threshold and peak picking
   */
  private pickOnsets(spectralFlux: Float32Array, sensitivity: number): number[] {
    const onsets: number[] = [];
    const threshold = this.calculateAdaptiveThreshold(spectralFlux, sensitivity);
    const minInterval = Math.floor(0.05 * this.sampleRate / this.hopSize); // 50ms minimum interval
    
    let lastOnset = -minInterval;
    
    for (let i = 1; i < spectralFlux.length - 1; i++) {
      const current = spectralFlux[i];
      const prev = spectralFlux[i - 1];
      const next = spectralFlux[i + 1];
      
      // Peak detection with threshold
      if (current > threshold[i] && current > prev && current > next) {
        if (i - lastOnset >= minInterval) {
          const timeInSeconds = (i * this.hopSize) / this.sampleRate;
          onsets.push(timeInSeconds);
          lastOnset = i;
        }
      }
    }
    
    return onsets;
  }

  /**
   * Calculate adaptive threshold for onset detection
   */
  private calculateAdaptiveThreshold(spectralFlux: Float32Array, sensitivity: number): Float32Array {
    const threshold = new Float32Array(spectralFlux.length);
    const windowSize = Math.floor(0.5 * this.sampleRate / this.hopSize); // 500ms window
    const multiplier = 1.0 + (100 - sensitivity) / 100; // Higher sensitivity = lower threshold
    
    for (let i = 0; i < spectralFlux.length; i++) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(spectralFlux.length, i + windowSize);
      
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += spectralFlux[j];
      }
      
      const mean = sum / (end - start);
      threshold[i] = mean * multiplier;
    }
    
    return threshold;
  }

  /**
   * Create transient events with additional analysis
   */
  private createTransientEvents(
    audioBuffer: Float32Array,
    onsetTimes: number[],
    config: EventBasedMappingConfig
  ): TransientEvent[] {
    const events: TransientEvent[] = [];
    
    for (const timestamp of onsetTimes) {
      const sampleIndex = Math.floor(timestamp * this.sampleRate);
      
      // Extract frame around onset for analysis
      const frameStart = Math.max(0, sampleIndex - this.bufferSize / 2);
      const frameEnd = Math.min(audioBuffer.length, frameStart + this.bufferSize);
      const frame = audioBuffer.slice(frameStart, frameEnd);
      
      // Calculate amplitude (RMS)
      const amplitude = this.calculateRMS(frame);
      
      // Estimate dominant frequency using zero-crossing rate
      const frequency = this.estimateDominantFrequency(frame);
      
      // Estimate duration using envelope following
      const duration = this.estimateTransientDuration(audioBuffer, sampleIndex);
      
      // Calculate confidence based on spectral clarity
      const confidence = this.calculateConfidence(frame);
      
      // Generate envelope parameters
      const envelope = this.analyzeEnvelope(audioBuffer, sampleIndex, duration);
      
      events.push({
        timestamp,
        amplitude,
        frequency,
        duration,
        confidence,
        envelope
      });
    }
    
    return events;
  }

  /**
   * Calculate RMS amplitude
   */
  private calculateRMS(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
  }

  /**
   * Estimate dominant frequency using zero-crossing rate
   */
  private estimateDominantFrequency(frame: Float32Array): number {
    let crossings = 0;
    
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    // Estimate frequency from zero-crossing rate
    const frequency = (crossings / 2) * (this.sampleRate / frame.length);
    return Math.max(20, Math.min(20000, frequency)); // Clamp to audible range
  }

  /**
   * Estimate transient duration using envelope following
   */
  private estimateTransientDuration(audioBuffer: Float32Array, onsetIndex: number): number {
    const maxDuration = 0.5; // 500ms maximum
    const maxSamples = Math.floor(maxDuration * this.sampleRate);
    const endIndex = Math.min(audioBuffer.length, onsetIndex + maxSamples);
    
    // Find where amplitude drops to 10% of peak
    const peakAmplitude = Math.abs(audioBuffer[onsetIndex]);
    const threshold = peakAmplitude * 0.1;
    
    for (let i = onsetIndex + 1; i < endIndex; i++) {
      if (Math.abs(audioBuffer[i]) < threshold) {
        return (i - onsetIndex) / this.sampleRate;
      }
    }
    
    return maxDuration;
  }

  /**
   * Calculate confidence based on spectral clarity
   */
  private calculateConfidence(frame: Float32Array): number {
    const spectrum = this.calculateMagnitudeSpectrum(frame);
    
    // Calculate spectral centroid and spread
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i * this.sampleRate) / (2 * spectrum.length);
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    if (magnitudeSum === 0) return 0;
    
    const centroid = weightedSum / magnitudeSum;
    
    // Higher centroid generally indicates more transient content
    const normalizedCentroid = Math.min(1, centroid / 5000); // Normalize to 0-1
    
    return normalizedCentroid;
  }

  /**
   * Analyze envelope characteristics (ADSR)
   */
  private analyzeEnvelope(audioBuffer: Float32Array, onsetIndex: number, duration: number) {
    const durationSamples = Math.floor(duration * this.sampleRate);
    const endIndex = Math.min(audioBuffer.length, onsetIndex + durationSamples);
    
    if (durationSamples < 4) {
      return {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.1
      };
    }
    
    // Find peak amplitude and its position
    let peakAmplitude = 0;
    let peakIndex = onsetIndex;
    
    for (let i = onsetIndex; i < endIndex; i++) {
      const amplitude = Math.abs(audioBuffer[i]);
      if (amplitude > peakAmplitude) {
        peakAmplitude = amplitude;
        peakIndex = i;
      }
    }
    
    // Calculate envelope phases
    const attack = (peakIndex - onsetIndex) / this.sampleRate;
    
    // Find sustain level (average amplitude in middle 40% of duration)
    const sustainStart = onsetIndex + Math.floor(durationSamples * 0.3);
    const sustainEnd = onsetIndex + Math.floor(durationSamples * 0.7);
    let sustainSum = 0;
    let sustainCount = 0;
    
    for (let i = sustainStart; i < sustainEnd && i < endIndex; i++) {
      sustainSum += Math.abs(audioBuffer[i]);
      sustainCount++;
    }
    
    const sustainLevel = sustainCount > 0 ? (sustainSum / sustainCount) / peakAmplitude : 0.5;
    
    // Estimate decay and release times
    const decay = Math.max(0.01, duration * 0.2);
    const release = Math.max(0.01, duration * 0.3);
    
    return {
      attack: Math.max(0.001, attack),
      decay,
      sustain: Math.max(0.1, Math.min(1.0, sustainLevel)),
      release
    };
  }
}