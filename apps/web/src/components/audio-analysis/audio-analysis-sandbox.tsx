'use client';

import React, { useCallback } from 'react';

interface AudioAnalysisSandboxProps {
  audioBuffer: AudioBuffer;
  params: {
    transientThreshold: number;
    onsetThreshold: number;
    chromaSmoothing: number;
    rmsWindowSize: number;
    pitchConfidence: number;
    minNoteDuration: number;
  };
  onAnalysisComplete: (analysis: any) => void;
}

export function AudioAnalysisSandbox({ 
  audioBuffer, 
  params, 
  onAnalysisComplete 
}: AudioAnalysisSandboxProps) {
  
  // Transient/Onset Detection using Spectral Flux
  const detectTransients = useCallback((channelData: Float32Array, sampleRate: number) => {
    const windowSize = 1024;
    const hopSize = 512;
    const transients: Array<{ time: number; intensity: number; frequency: number }> = [];
    
    // Calculate spectral flux for onset detection
    const spectralFlux = [];
    const fftSize = windowSize;
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      
      // Apply Hann window
      const hannWindow = window.map((sample, idx) => 
        sample * (0.5 - 0.5 * Math.cos(2 * Math.PI * idx / (windowSize - 1)))
      );
      
      // Calculate FFT magnitude spectrum
      const fft = performFFT(hannWindow);
      const magnitude = fft.map(complex => Math.sqrt(complex.real * complex.real + complex.imag * complex.imag));
      
      // Calculate spectral flux (difference from previous frame)
      if (spectralFlux.length > 0) {
        let flux = 0;
        for (let j = 0; j < magnitude.length; j++) {
          const diff = magnitude[j] - spectralFlux[spectralFlux.length - 1][j];
          if (diff > 0) flux += diff;
        }
        
        // Detect transients based on threshold
        if (flux > params.transientThreshold) {
          const time = i / sampleRate;
          const intensity = Math.min(flux / 10, 1); // Normalize intensity
          
          // Find dominant frequency
          let maxMag = 0;
          let maxFreq = 0;
          for (let j = 1; j < magnitude.length / 2; j++) {
            if (magnitude[j] > maxMag) {
              maxMag = magnitude[j];
              maxFreq = (j * sampleRate) / fftSize;
            }
          }
          
          transients.push({
            time,
            intensity,
            frequency: maxFreq
          });
        }
      }
      
      spectralFlux.push(magnitude);
    }
    
    return transients;
  }, [params.transientThreshold]);

  // Chroma/Pitch Detection using YIN algorithm
  const detectChroma = useCallback((channelData: Float32Array, sampleRate: number) => {
    const windowSize = 2048;
    const hopSize = 512;
    const chroma: Array<{ time: number; pitch: number; confidence: number; note: string }> = [];
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      
      // Apply Hann window
      const hannWindow = window.map((sample, idx) => 
        sample * (0.5 - 0.5 * Math.cos(2 * Math.PI * idx / (windowSize - 1)))
      );
      
      // YIN pitch detection
      const pitch = detectPitchYIN(hannWindow, sampleRate);
      
      if (pitch > 0 && pitch < 2000) { // Reasonable frequency range
        // Convert frequency to MIDI note number
        const midiNote = 12 * Math.log2(pitch / 440) + 69;
        const chromaClass = Math.round(midiNote) % 12;
        const confidence = Math.min(pitch / 1000, 1); // Simple confidence based on frequency
        
        if (confidence > params.pitchConfidence) {
          chroma.push({
            time: i / sampleRate,
            pitch: chromaClass,
            confidence,
            note: noteNames[chromaClass]
          });
        }
      }
    }
    
    // Apply smoothing
    return smoothChroma(chroma, params.chromaSmoothing);
  }, [params.pitchConfidence, params.chromaSmoothing]);

  // RMS Analysis
  const analyzeRMS = useCallback((channelData: Float32Array, sampleRate: number) => {
    const windowSize = params.rmsWindowSize;
    const hopSize = windowSize / 2;
    const rms: Array<{ time: number; value: number }> = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      
      // Calculate RMS
      let sum = 0;
      for (let j = 0; j < window.length; j++) {
        sum += window[j] * window[j];
      }
      const rmsValue = Math.sqrt(sum / window.length);
      
      rms.push({
        time: i / sampleRate,
        value: rmsValue
      });
    }
    
    return rms;
  }, [params.rmsWindowSize]);

  // Generate waveform data
  const generateWaveform = useCallback((channelData: Float32Array, points: number = 1000) => {
    const step = Math.floor(channelData.length / points);
    const waveform: number[] = [];
    
    for (let i = 0; i < points; i++) {
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      
      // Calculate RMS for this segment
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sum / (end - start));
      waveform.push(rms);
    }
    
    return waveform;
  }, []);

  // Perform analysis
  const performAnalysis = useCallback(async () => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Run all analyses
    const transients = detectTransients(channelData, sampleRate);
    const chroma = detectChroma(channelData, sampleRate);
    const rms = analyzeRMS(channelData, sampleRate);
    const waveform = generateWaveform(channelData);
    
    const analysis = {
      transients,
      chroma,
      rms,
      waveform,
      metadata: {
        sampleRate,
        duration: audioBuffer.duration,
        bufferSize: audioBuffer.length,
        analysisParams: params
      }
    };
    
    onAnalysisComplete(analysis);
  }, [audioBuffer, params, detectTransients, detectChroma, analyzeRMS, generateWaveform, onAnalysisComplete]);

  // Start analysis when component mounts or parameters change
  React.useEffect(() => {
    performAnalysis();
  }, [performAnalysis, params]);

  return null; // This component doesn't render anything
}

// Helper function: Simple FFT implementation
function performFFT(samples: Float32Array): Array<{ real: number; imag: number }> {
  const N = samples.length;
  const result: Array<{ real: number; imag: number }> = [];
  
  for (let k = 0; k < N; k++) {
    let real = 0;
    let imag = 0;
    
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      real += samples[n] * Math.cos(angle);
      imag += samples[n] * Math.sin(angle);
    }
    
    result.push({ real, imag });
  }
  
  return result;
}

// Helper function: YIN pitch detection algorithm
function detectPitchYIN(samples: Float32Array, sampleRate: number): number {
  const minPeriod = Math.floor(sampleRate / 2000); // Max 2000 Hz
  const maxPeriod = Math.floor(sampleRate / 80);   // Min 80 Hz
  
  let bestPeriod = 0;
  let bestDifference = 1;
  
  for (let period = minPeriod; period < maxPeriod && period < samples.length / 2; period++) {
    let difference = 0;
    let sum = 0;
    
    for (let i = 0; i < samples.length - period; i++) {
      const delta = samples[i] - samples[i + period];
      difference += delta * delta;
      sum += samples[i] * samples[i];
    }
    
    if (sum > 0) {
      difference /= sum;
      
      if (difference < bestDifference) {
        bestDifference = difference;
        bestPeriod = period;
      }
    }
  }
  
  // Convert period to frequency
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

// Helper function: Smooth chroma data
function smoothChroma(chroma: Array<{ time: number; pitch: number; confidence: number; note: string }>, smoothing: number): Array<{ time: number; pitch: number; confidence: number; note: string }> {
  if (chroma.length === 0) return chroma;
  
  const smoothed = [...chroma];
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  for (let i = 1; i < smoothed.length - 1; i++) {
    const prev = smoothed[i - 1];
    const curr = smoothed[i];
    const next = smoothed[i + 1];
    
    // Simple moving average for pitch
    const avgPitch = Math.round((prev.pitch + curr.pitch + next.pitch) / 3);
    const avgConfidence = (prev.confidence + curr.confidence + next.confidence) / 3;
    
    if (avgConfidence > curr.confidence * smoothing) {
      smoothed[i] = {
        time: curr.time,
        pitch: avgPitch,
        confidence: avgConfidence,
        note: noteNames[avgPitch]
      };
    }
  }
  
  return smoothed;
}
