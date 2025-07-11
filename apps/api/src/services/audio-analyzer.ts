import { createClient } from '@supabase/supabase-js';
import { getFileBuffer } from './r2-storage';
import { logger } from '../lib/logger';

// Audio analysis types
export interface AudioAnalysisData {
  frequencies: number[];
  timeData: number[];
  volume: number;
  bass: number;
  mid: number;
  treble: number;
  features: {
    rms: number;
    spectralCentroid: number;
    spectralRolloff: number;
    loudness: number;
    perceptualSpread: number;
    spectralFlux: number;
    mfcc: number[];
    energy: number;
  };
  markers: FeatureMarker[];
}

export interface FeatureMarker {
  time: number;
  type: 'beat' | 'onset' | 'peak' | 'drop';
  intensity: number;
  frequency?: number;
}

export interface WaveformData {
  points: number[];
  sampleRate: number;
  duration: number;
  markers: FeatureMarker[];
}

export interface CachedAnalysis {
  id: string;
  fileMetadataId: string;
  stemType: string;
  analysisData: AudioAnalysisData;
  waveformData: WaveformData;
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
  };
}

export class AudioAnalyzer {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }
    
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Analyze an audio file and cache the results
   */
  async analyzeAndCache(
    fileMetadataId: string,
    userId: string,
    stemType: string,
    audioBuffer: Buffer
  ): Promise<CachedAnalysis> {
    const startTime = Date.now();
    
    try {
      logger.log(`🎵 Starting audio analysis for ${stemType} stem (file: ${fileMetadataId})`);
      
      // Analyze the audio buffer
      const analysisData = await this.analyzeAudioBuffer(audioBuffer);
      const waveformData = await this.generateWaveformData(audioBuffer);
      
      const analysisDuration = Date.now() - startTime;
      
      // Prepare metadata
      const metadata = {
        sampleRate: 44100, // Assuming standard sample rate
        duration: analysisData.markers.length > 0 ? 
          Math.max(...analysisData.markers.map(m => m.time)) : 0,
        bufferSize: 512,
        featuresExtracted: Object.keys(analysisData.features),
        analysisDuration
      };
      
      // Cache the analysis results
      const { data: cachedAnalysis, error } = await this.supabase
        .from('audio_analysis_cache')
        .insert({
          user_id: userId,
          file_metadata_id: fileMetadataId,
          stem_type: stemType,
          analysis_version: '1.0',
          sample_rate: metadata.sampleRate,
          duration: metadata.duration,
          buffer_size: metadata.bufferSize,
          features_extracted: metadata.featuresExtracted,
          analysis_data: analysisData,
          waveform_data: waveformData,
          analysis_duration: analysisDuration
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to cache analysis: ${error.message}`);
      }
      
      logger.log(`✅ Audio analysis completed for ${stemType} stem in ${analysisDuration}ms`);
      
      return {
        id: cachedAnalysis.id,
        fileMetadataId,
        stemType,
        analysisData,
        waveformData,
        metadata
      };
      
    } catch (error) {
      logger.error(`❌ Audio analysis failed for ${stemType} stem:`, error);
      throw error;
    }
  }

  /**
   * Retrieve cached analysis for a file
   */
  async getCachedAnalysis(
    fileMetadataId: string,
    userId: string,
    stemType?: string
  ): Promise<CachedAnalysis | null> {
    try {
      // Check if this is a guest user
      const isGuestUser = userId.startsWith('guest_');
      
      let query = this.supabase
        .from('audio_analysis_cache')
        .select('*')
        .eq('file_metadata_id', fileMetadataId);
      
      // Only filter by user_id for authenticated users
      if (!isGuestUser) {
        query = query.eq('user_id', userId);
      }
      
      if (stemType) {
        query = query.eq('stem_type', stemType);
      }
      
      const { data, error } = await query;
      
      console.log('getCachedAnalysis query:', { fileMetadataId, userId, stemType });
      console.log('getCachedAnalysis result:', data);
      
      if (error) {
        throw new Error(`Failed to retrieve cached analysis: ${error.message}`);
      }
      
      // For guest users, return null since they won't have cached analysis
      if (isGuestUser) {
        return null;
      }
      
      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          fileMetadataId: row.file_metadata_id,
          stemType: row.stem_type,
          analysisData: row.analysis_data,
          waveformData: row.waveform_data,
          metadata: {
            sampleRate: row.sample_rate,
            duration: row.duration,
            bufferSize: row.buffer_size,
            featuresExtracted: row.features_extracted,
            analysisDuration: row.analysis_duration
          }
        };
      }
      return null;
    } catch (error) {
      logger.error('❌ Failed to retrieve cached analysis:', error);
      throw error;
    }
  }

  /**
   * Retrieve cached analysis for multiple files
   */
  async getBatchCachedAnalysis(
    fileMetadataIds: string[],
    userId: string,
    stemType?: string
  ): Promise<CachedAnalysis[]> {
    try {
      // Check if this is a guest user
      const isGuestUser = userId.startsWith('guest_');
      if (isGuestUser) return [];

      let query = this.supabase
        .from('audio_analysis_cache')
        .select('*')
        .in('file_metadata_id', fileMetadataIds)
        .eq('user_id', userId);

      if (stemType) {
        query = query.eq('stem_type', stemType);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to retrieve batch cached analysis: ${error.message}`);
      }
      if (!Array.isArray(data) || data.length === 0) return [];
      return data.map(row => ({
        id: row.id,
        fileMetadataId: row.file_metadata_id,
        stemType: row.stem_type,
        analysisData: row.analysis_data,
        waveformData: row.waveform_data,
        metadata: {
          sampleRate: row.sample_rate,
          duration: row.duration,
          bufferSize: row.buffer_size,
          featuresExtracted: row.features_extracted,
          analysisDuration: row.analysis_duration
        }
      }));
    } catch (error) {
      console.error('getBatchCachedAnalysis error:', error);
      throw error;
    }
  }

  /**
   * Analyze audio buffer using simplified algorithm (no Meyda dependency)
   */
  private async analyzeAudioBuffer(buffer: Buffer): Promise<AudioAnalysisData> {
    // Convert buffer to 16-bit PCM samples
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    
    // Calculate basic features
    const rms = this.calculateRMS(samples);
    const spectralCentroid = this.calculateSpectralCentroid(samples);
    const spectralRolloff = this.calculateSpectralRolloff(samples);
    const loudness = this.calculateLoudness(samples);
    const perceptualSpread = this.calculatePerceptualSpread(samples);
    const spectralFlux = this.calculateSpectralFlux(samples);
    const mfcc = this.calculateMFCC(samples);
    const energy = this.calculateEnergy(samples);
    
    // Generate frequency and time domain data
    const frequencies = this.generateFrequencyData(samples);
    const timeData = this.generateTimeData(samples);
    
    // Calculate frequency bands
    const bass = this.calculateBandEnergy(frequencies, 0, 60);
    const mid = this.calculateBandEnergy(frequencies, 60, 2000);
    const treble = this.calculateBandEnergy(frequencies, 2000, 20000);
    
    // Detect feature markers
    const markers = this.detectFeatureMarkers(samples);
    
    return {
      frequencies,
      timeData,
      volume: rms,
      bass,
      mid,
      treble,
      features: {
        rms,
        spectralCentroid,
        spectralRolloff,
        loudness,
        perceptualSpread,
        spectralFlux,
        mfcc,
        energy
      },
      markers
    };
  }

  /**
   * Generate waveform data for visualization
   */
  private async generateWaveformData(buffer: Buffer): Promise<WaveformData> {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    
    // Downsample to create waveform points (e.g., 1000 points)
    const targetPoints = 1000;
    const step = Math.max(1, Math.floor(samples.length / targetPoints));
    const points: number[] = [];
    
    for (let i = 0; i < samples.length; i += step) {
      const chunk = samples.slice(i, Math.min(i + step, samples.length));
      const rms = Math.sqrt(chunk.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0) / chunk.length);
      points.push(rms);
    }
    
    // Detect markers for waveform
    const markers = this.detectFeatureMarkers(samples);
    
    return {
      points,
      sampleRate: 44100,
      duration: samples.length / 44100,
      markers
    };
  }

  // Helper methods for audio analysis
  private calculateRMS(samples: Int16Array): number {
    const sum = samples.reduce((acc, sample) => acc + (sample / 32768) ** 2, 0);
    return Math.sqrt(sum / samples.length);
  }

  private calculateSpectralCentroid(samples: Int16Array): number {
    // Simplified spectral centroid calculation
    const fft = this.performFFT(samples);
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < fft.length / 2; i++) {
      const frequency = (i * 44100) / fft.length;
      const magnitude = Math.abs(fft[i] || 0);
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 1000;
  }

  private calculateSpectralRolloff(samples: Int16Array): number {
    const fft = this.performFFT(samples);
    const threshold = 0.85; // 85% energy threshold
    
    let totalEnergy = 0;
    for (let i = 0; i < fft.length / 2; i++) {
      totalEnergy += Math.abs(fft[i] || 0) ** 2;
    }
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < fft.length / 2; i++) {
      cumulativeEnergy += Math.abs(fft[i] || 0) ** 2;
      if (cumulativeEnergy / totalEnergy >= threshold) {
        return (i * 44100) / fft.length;
      }
    }
    
    return 20000; // Default to max frequency
  }

  private calculateLoudness(samples: Int16Array): number {
    // Simplified loudness calculation using A-weighting approximation
    const rms = this.calculateRMS(samples);
    return rms * 0.7; // Rough A-weighting approximation
  }

  private calculatePerceptualSpread(samples: Int16Array): number {
    const fft = this.performFFT(samples);
    const centroid = this.calculateSpectralCentroid(samples);
    
    let spread = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < fft.length / 2; i++) {
      const frequency = (i * 44100) / fft.length;
      const magnitude = Math.abs(fft[i]);
      spread += magnitude * (frequency - centroid) ** 2;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? Math.sqrt(spread / magnitudeSum) : 0;
  }

  private calculateSpectralFlux(samples: Int16Array): number {
    // Simplified spectral flux calculation
    const fft = this.performFFT(samples);
    let flux = 0;
    
    for (let i = 0; i < fft.length / 2; i++) {
      flux += Math.abs(fft[i]);
    }
    
    return flux / (fft.length / 2);
  }

  private calculateMFCC(samples: Int16Array): number[] {
    // Simplified MFCC calculation (13 coefficients)
    const fft = this.performFFT(samples);
    const mfcc: number[] = [];
    
    // Generate 13 simplified MFCC coefficients
    for (let i = 0; i < 13; i++) {
      let coefficient = 0;
      for (let j = 0; j < fft.length / 2; j++) {
        const frequency = (j * 44100) / fft.length;
        const magnitude = Math.abs(fft[j]);
        coefficient += magnitude * Math.cos((Math.PI * i * j) / (fft.length / 2));
      }
      mfcc.push(coefficient / (fft.length / 2));
    }
    
    return mfcc;
  }

  private calculateEnergy(samples: Int16Array): number {
    return samples.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0) / samples.length;
  }

  private generateFrequencyData(samples: Int16Array): number[] {
    const fft = this.performFFT(samples);
    const frequencies: number[] = [];
    
    // Downsample to 256 frequency bins
    const step = Math.max(1, Math.floor((fft.length / 2) / 256));
    for (let i = 0; i < fft.length / 2; i += step) {
      const chunk = fft.slice(i, Math.min(i + step, fft.length / 2));
      const magnitude = chunk.reduce((sum, val) => sum + Math.abs(val), 0) / chunk.length;
      frequencies.push(magnitude);
    }
    
    // Pad or truncate to exactly 256 values
    while (frequencies.length < 256) {
      frequencies.push(0);
    }
    return frequencies.slice(0, 256);
  }

  private generateTimeData(samples: Int16Array): number[] {
    const timeData: number[] = [];
    
    // Downsample to 256 time domain points
    const step = Math.max(1, Math.floor(samples.length / 256));
    for (let i = 0; i < samples.length; i += step) {
      const chunk = samples.slice(i, Math.min(i + step, samples.length));
      const rms = Math.sqrt(chunk.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0) / chunk.length);
      timeData.push(rms);
    }
    
    // Pad or truncate to exactly 256 values
    while (timeData.length < 256) {
      timeData.push(0);
    }
    return timeData.slice(0, 256);
  }

  private calculateBandEnergy(frequencies: number[], minFreq: number, maxFreq: number): number {
    const minIndex = Math.floor((minFreq / 22050) * frequencies.length);
    const maxIndex = Math.ceil((maxFreq / 22050) * frequencies.length);
    let energy = 0;
    let count = 0;
    
    for (let i = minIndex; i < maxIndex && i < frequencies.length; i++) {
      energy += frequencies[i];
      count++;
    }
    
    return count > 0 ? energy / count : 0;
  }

  private detectFeatureMarkers(samples: Int16Array): FeatureMarker[] {
    const markers: FeatureMarker[] = [];
    const windowSize = 1024;
    const hopSize = 512;
    
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      const window = samples.slice(i, i + windowSize);
      const rms = this.calculateRMS(window);
      const time = i / 44100;
      
      // Detect beats (high RMS)
      if (rms > 0.3) {
        markers.push({
          time,
          type: 'beat',
          intensity: rms,
          frequency: this.calculateSpectralCentroid(window)
        });
      }
      
      // Detect onsets (sudden increase in RMS)
      if (i > 0) {
        const prevWindow = samples.slice(i - hopSize, i - hopSize + windowSize);
        const prevRms = this.calculateRMS(prevWindow);
        const onsetThreshold = 0.1;
        
        if (rms - prevRms > onsetThreshold) {
          markers.push({
            time,
            type: 'onset',
            intensity: rms - prevRms,
            frequency: this.calculateSpectralCentroid(window)
          });
        }
      }
    }
    
    return markers;
  }

  /**
   * Simplified FFT implementation
   */
  private performFFT(samples: Int16Array): Float32Array {
    // Convert to float and apply window function
    const floatSamples = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      floatSamples[i] = (samples[i] / 32768) * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (samples.length - 1)));
    }
    
    // Simple FFT implementation (for production, use a proper FFT library)
    return this.simpleFFT(floatSamples);
  }

  private simpleFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const fft = new Float32Array(n);
    
    // Copy input to output
    for (let i = 0; i < n; i++) {
      fft[i] = samples[i] || 0;
    }
    
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) {
        j ^= bit;
      }
      j ^= bit;
      if (i < j) {
        const temp = fft[i];
        fft[i] = fft[j];
        fft[j] = temp;
      }
    }
    
    // Cooley-Tukey FFT
    for (let len = 2; len <= n; len <<= 1) {
      const angle = (-2 * Math.PI) / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < len / 2; j++) {
          const idx1 = i + j;
          const idx2 = i + j + len / 2;
          const cosVal = Math.cos(angle * j);
          const sinVal = Math.sin(angle * j);
          const real = (fft[idx2] || 0) * cosVal - (fft[idx2 + 1] || 0) * sinVal;
          const imag = (fft[idx2] || 0) * sinVal + (fft[idx2 + 1] || 0) * cosVal;
          fft[idx2] = (fft[idx1] || 0) - real;
          fft[idx2 + 1] = (fft[idx1 + 1] || 0) - imag;
          fft[idx1] = (fft[idx1] || 0) + real;
          fft[idx1 + 1] = (fft[idx1 + 1] || 0) + imag;
        }
      }
    }
    
    return fft;
  }
} 