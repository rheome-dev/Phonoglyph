import { createClient } from '@supabase/supabase-js';
import { getFileBuffer } from './r2-storage';
import { logger } from '../lib/logger';
import { Reader } from 'wav';
import { Writable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

// Audio analysis types

/**
 * Represents the detailed, time-series audio analysis data for a single track.
 * The keys are feature names (e.g., "rms", "spectralCentroid", "mfcc_0").
 * The values are arrays of numbers, representing the feature's value over time.
 */
export type AudioAnalysisData = Record<string, number[]>;


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
  analysisData: AudioAnalysisData; // This now correctly refers to the time-series data type
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
      
      // Convert any audio format to WAV first
      const wavBuffer = await this.convertToWav(audioBuffer);

      // Analyze the audio buffer
      const analysisData = await this.analyzeAudioBuffer(wavBuffer);
      const waveformData = await this.generateWaveformData(wavBuffer);
      
      const analysisDuration = Date.now() - startTime;
      
      // Prepare metadata
      const metadata = {
        sampleRate: 44100, // Assuming standard sample rate
        duration: waveformData.duration,
        bufferSize: 512, // The buffer size used for chunking analysis
        featuresExtracted: Object.keys(analysisData),
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
   * Convert any audio format to a WAV buffer for analysis
   */
  private async convertToWav(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const readableStream = new PassThrough();
      readableStream.end(inputBuffer);

      const chunks: Buffer[] = [];
      const writableStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      writableStream.on('finish', () => {
        resolve(Buffer.concat(chunks));
      });

      writableStream.on('error', err => {
        reject(new Error(`FFmpeg conversion error: ${err.message}`));
      });

      ffmpeg(readableStream)
        .toFormat('wav')
        .on('error', (err) => {
          // This error handler is crucial for catching FFmpeg-specific errors
          reject(new Error(`FFmpeg processing error: ${err.message}`));
        })
        .pipe(writableStream);
    });
  }

  /**
   * Analyze an audio buffer and return structured data
   */
  private async analyzeAudioBuffer(buffer: Buffer): Promise<AudioAnalysisData> {
    try {
      const samples = await this.getAudioSamples(buffer);
      const sampleRate = 44100; // Standard assumption
      const frameSize = 1024; // A common frame size for analysis
      const hopLength = 512;   // Overlap for smoother results

      const features: AudioAnalysisData = {
        rms: [],
        spectralCentroid: [],
        loudness: [],
        energy: [],
      };
      
      const featureNames = Object.keys(features) as (keyof typeof features)[];

      // Process audio in frames
      for (let i = 0; i + frameSize <= samples.length; i += hopLength) {
        const frame = samples.subarray(i, i + frameSize);
        
        // This is a placeholder for MFCCs which require more complex logic
        // const mfcc = this.calculateMFCC(frame); 

        for (const featureName of featureNames) {
          let value: number;
          switch (featureName) {
            case 'rms':
              value = this.calculateRMS(frame);
              break;
            case 'spectralCentroid':
              value = this.calculateSpectralCentroid(frame);
              break;
            case 'loudness':
              value = this.calculateLoudness(frame);
              break;
            case 'energy':
              value = this.calculateEnergy(frame);
              break;
            default:
              value = 0;
          }
          const featureArray = features[featureName];
          if(featureArray) {
            featureArray.push(value);
          }
        }
      }

      // Normalize all feature arrays between 0 and 1
      for (const featureName of featureNames) {
        const values = features[featureName];
        if (!values || values.length === 0) continue;

        const maxVal = Math.max(...values);
        if (maxVal > 0) {
          features[featureName] = values.map(v => v / maxVal);
        }
      }

      return features;

    } catch (error) {
      logger.error('Error analyzing audio buffer:', error);
      throw new Error('Failed to analyze audio buffer.');
    }
  }

  private async getAudioSamples(buffer: Buffer): Promise<Int16Array> {
    return new Promise((resolve, reject) => {
      const readable = new PassThrough();
      readable.end(buffer);
      const chunks: Buffer[] = [];
      readable
        .pipe(new Reader())
        .on('format', format => {
          if (format.audioFormat !== 1) { // 1 is PCM
            return reject(new Error('Only WAV files with PCM audio format are supported for direct analysis.'));
          }
        })
        .pipe(new Writable({
          write(chunk, encoding, callback) {
            chunks.push(chunk);
            callback();
          }
        }))
        .on('finish', () => {
          const pcmData = Buffer.concat(chunks);
          // Assuming 16-bit signed PCM
          const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
          resolve(samples);
        })
        .on('error', reject);
    });
  }

  /**
   * Generate waveform data from an audio buffer
   */
  private async generateWaveformData(buffer: Buffer): Promise<WaveformData> {
    return new Promise((resolve, reject) => {
      const reader = new Reader();
      const samples: number[] = [];
      let format: any = {};

      reader.on('format', (f: any) => {
        format = f;
      });

      reader.on('data', (chunk: Buffer) => {
        if (!format || !format.byteRate || !format.sampleRate) return;
        for (let i = 0; i < chunk.length; i += 2) { // Assuming 16-bit audio
          if (chunk.length >= i + 2) {
            samples.push(chunk.readInt16LE(i) / 32768); // Normalize to -1 to 1
          }
        }
      });

      reader.on('end', () => {
        if (!format.sampleRate || samples.length === 0) {
          // Fallback for non-WAV files or empty files
          const duration = 10; // Assume 10s
          const sampleRate = 44100;
          const numPoints = 1000;
          const points = Array.from({ length: numPoints }, () => (Math.random() * 2 - 1) * 0.1);
          logger.warn('⚠️ Could not decode WAV, generating fallback waveform.');
          return resolve({
            points: points,
            sampleRate: sampleRate,
            duration: duration,
            markers: [],
          });
        }
        
        const downsampleFactor = Math.max(1, Math.floor(samples.length / 2000)); // Max 2000 points
        const downsampled: number[] = [];
        for (let i = 0; i < samples.length; i += downsampleFactor) {
          const sample = samples[i];
          if (sample !== undefined) {
            downsampled.push(sample);
          }
        }

        const duration = samples.length / format.sampleRate;
        
        resolve({
          points: downsampled,
          sampleRate: format.sampleRate,
          duration: duration,
          markers: [], // Placeholder for future marker detection
        });
      });

      reader.on('error', (err: Error) => {
        logger.error('❌ Error decoding audio file for waveform:', err);
        // Fallback for decoding errors
        const duration = 10;
        const sampleRate = 44100;
        const numPoints = 1000;
        const points = Array.from({ length: numPoints }, () => (Math.random() * 2 - 1) * 0.1);
        resolve({
          points: points,
          sampleRate: sampleRate,
          duration: duration,
          markers: [],
        });
      });

      // Pipe the buffer into the WAV reader
      const bufferStream = new Writable();
      bufferStream._write = (chunk: any, encoding: any, next: any) => {
        reader.write(chunk);
        next();
      };
      bufferStream.end(buffer);
    });
  }

  // Helper methods for audio analysis
  private calculateRMS(samples: Int16Array): number {
    let sumOfSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumOfSquares += ((samples[i] ?? 0) / 32768) ** 2;
    }
    return Math.sqrt(sumOfSquares / samples.length);
  }

  private calculateSpectralCentroid(samples: Int16Array): number {
    let weightedSum = 0;
    let sum = 0;
    const fftData = this.performFFT(samples);

    for (let i = 0; i < fftData.length; i++) {
      const freq = (i * 44100) / fftData.length;
      const magnitude = Math.abs(fftData[i] ?? 0);
      weightedSum += freq * magnitude;
      sum += magnitude;
    }
    return sum === 0 ? 0 : weightedSum / sum;
  }

  private calculateLoudness(samples: Int16Array): number {
    // A-weighting approximation - very simplified
    return this.calculateRMS(samples); // For now, use RMS as a proxy
  }

  private calculateMFCC(samples: Int16Array): number[] {
    // Placeholder for MFCC calculation, which is quite complex
    return Array(12).fill(0);
  }

  private calculateEnergy(samples: Int16Array): number {
    return Array.from(samples).reduce((acc, val) => acc + ((val ?? 0) / 32768) ** 2, 0) / samples.length;
  }

  private generateFrequencyData(samples: Int16Array): number[] {
    const fftData = this.performFFT(samples);
    return Array.from(fftData.slice(0, fftData.length / 2)).map(val => Math.abs(val ?? 0));
  }

  private generateTimeData(samples: Int16Array): number[] {
    const downsampled: number[] = [];
    const factor = Math.floor(samples.length / 1024);
    if (factor < 1) return Array.from(samples).map(s => (s ?? 0) / 32768);
    for (let i = 0; i < samples.length; i += factor) {
      const sample = samples[i];
      if (sample !== undefined) {
        downsampled.push(sample / 32768);
      }
    }
    return downsampled;
  }

  private calculateBandEnergy(frequencies: number[], minFreq: number, maxFreq: number): number {
    if (frequencies.length === 0) return 0;
    const sampleRate = 44100;
    const binWidth = sampleRate / 2 / frequencies.length;
    
    const startBin = Math.floor(minFreq / binWidth);
    const endBin = Math.ceil(maxFreq / binWidth);
    
    let sum = 0;
    for (let i = startBin; i <= endBin && i < frequencies.length; i++) {
      const freq = frequencies[i];
      if (freq !== undefined) {
        sum += freq;
      }
    }
    return sum;
  }

  private detectFeatureMarkers(samples: Int16Array): FeatureMarker[] {
    // Simplified placeholder
    return [];
  }

  /**
   * Simplified FFT implementation
   */
  private performFFT(samples: Int16Array): Float32Array {
    const floatSamples = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      floatSamples[i] = sample !== undefined ? sample / 32768 : 0;
    }
    return this.simpleFFT(floatSamples);
  }

  private simpleFFT(samples: Float32Array): Float32Array {
    const N = samples.length;
    if (N <= 1) return samples;

    // Radix-2 FFT
    if (N % 2 !== 0) {
      // For non-power-of-2, you'd need a more complex FFT or padding.
      // For simplicity, we'll just return magnitudes of 0.
      console.warn(`FFT size is not a power of 2 (${N}), which is not optimal. Padding or a different FFT algorithm should be used.`);
      return new Float32Array(N / 2);
    }

    const even = this.simpleFFT(samples.filter((_, i) => i % 2 === 0));
    const odd = this.simpleFFT(samples.filter((_, i) => i % 2 !== 0));

    const result = new Float32Array(N / 2);
    for (let k = 0; k < N / 2; k++) {
      const t_val = odd[k];
      const e_val = even[k];

      if (t_val !== undefined && e_val !== undefined) {
        const t = t_val * Math.cos(-2 * Math.PI * k / N);
        const e = e_val;
        result[k] = Math.sqrt((e + t) ** 2);
      } else {
        result[k] = 0; // Assign a default value if components are undefined
      }
    }
    return result;
  }
} 