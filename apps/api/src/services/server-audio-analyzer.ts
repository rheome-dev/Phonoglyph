import Meyda from 'meyda';
import { AudioContext } from 'web-audio-api';
import { r2Client, BUCKET_NAME, generateS3Key } from './r2-storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

export interface AudioAnalysisData {
  frequencies: number[];
  timeData: number[];
  volume: number;
  bass: number;
  mid: number;
  treble: number;
}

export interface AudioAnalysisTimeline {
  timestamp: number;
  data: AudioAnalysisData;
}

export interface AudioAnalysisResult {
  timeline: AudioAnalysisTimeline[];
  summary: {
    averageVolume: number;
    peakVolume: number;
    averageBass: number;
    averageMid: number;
    averageTreble: number;
    duration: number;
    sampleRate: number;
    analysisInterval: number;
  };
  metadata: {
    generatedAt: string;
    version: string;
    features: string[];
  };
}

export class ServerAudioAnalyzer {
  private static readonly ANALYSIS_INTERVAL = 0.05; // 50ms intervals for smooth visualization
  private static readonly BUFFER_SIZE = 512;
  private static readonly FEATURES = [
    'rms',
    'zcr',
    'spectralCentroid',
    'spectralRolloff',
    'loudness',
    'perceptualSpread',
    'spectralFlux'
  ];

  /**
   * Analyze audio file and generate timeline analysis data
   */
  static async analyzeAudioFile(
    audioFilePath: string,
    userId: string,
    stemType: string = 'master'
  ): Promise<{ analysisResult: AudioAnalysisResult; s3Key: string }> {
    try {
      // Read audio file
      const audioBuffer = await this.loadAudioFile(audioFilePath);
      
      // Generate analysis timeline
      const timeline = await this.generateAnalysisTimeline(audioBuffer);
      
      // Calculate summary statistics
      const summary = this.calculateSummary(timeline, audioBuffer);
      
      // Create analysis result
      const analysisResult: AudioAnalysisResult = {
        timeline,
        summary,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
          features: this.FEATURES
        }
      };

      // Upload analysis to R2
      const s3Key = await this.uploadAnalysis(analysisResult, userId, stemType);

      return { analysisResult, s3Key };
    } catch (error) {
      console.error('Audio analysis failed:', error);
      throw new Error(`Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load audio file using Web Audio API
   */
  private static async loadAudioFile(filePath: string): Promise<any> {
    const audioContext = new AudioContext();
    const audioData = fs.readFileSync(filePath);
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
      return audioBuffer;
    } catch (error) {
      throw new Error(`Failed to decode audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate timeline analysis data
   */
  private static async generateAnalysisTimeline(audioBuffer: any): Promise<AudioAnalysisTimeline[]> {
    const timeline: AudioAnalysisTimeline[] = [];
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const samplesPerInterval = Math.floor(sampleRate * this.ANALYSIS_INTERVAL);
    const totalSamples = audioBuffer.length;
    
    // Get audio data from the first channel (mono or left channel)
    const audioData = audioBuffer.getChannelData(0);
    
    // Analyze audio in intervals
    for (let i = 0; i < totalSamples; i += samplesPerInterval) {
      const endIndex = Math.min(i + samplesPerInterval, totalSamples);
      const segment = audioData.slice(i, endIndex);
      
      // Pad segment to buffer size if needed
      const paddedSegment = new Float32Array(this.BUFFER_SIZE);
      paddedSegment.set(segment.slice(0, Math.min(segment.length, this.BUFFER_SIZE)));
      
      const timestamp = i / sampleRate;
      const analysisData = this.analyzeSegment(paddedSegment);
      
      timeline.push({
        timestamp,
        data: analysisData
      });
    }
    
    return timeline;
  }

  /**
   * Analyze a single audio segment
   */
  private static analyzeSegment(audioData: Float32Array): AudioAnalysisData {
    // Use Meyda to extract features
    const features = Meyda.extract(this.FEATURES, audioData);
    
    // Generate frequency domain data using FFT
    const frequencies = this.generateFrequencyData(audioData);
    
    // Time domain data (normalized)
    const timeData = Array.from(audioData).map(sample => (sample + 1) / 2); // Convert from -1,1 to 0,1
    
    return {
      frequencies: Array.from(frequencies),
      timeData,
      volume: (features as any).rms || 0,
      bass: this.calculateBandEnergy(frequencies, 0, 60, 22050),
      mid: this.calculateBandEnergy(frequencies, 60, 2000, 22050),
      treble: this.calculateBandEnergy(frequencies, 2000, 20000, 22050)
    };
  }

  /**
   * Generate frequency domain data using FFT
   */
  private static generateFrequencyData(audioData: Float32Array): Float32Array {
    const fftSize = 256;
    const frequencies = new Float32Array(fftSize / 2);
    
    // Simple FFT implementation or use a library
    // For now, we'll use a simplified approach
    for (let i = 0; i < frequencies.length; i++) {
      let real = 0;
      let imag = 0;
      
      for (let j = 0; j < Math.min(audioData.length, fftSize); j++) {
        const angle = -2 * Math.PI * i * j / fftSize;
        real += audioData[j] * Math.cos(angle);
        imag += audioData[j] * Math.sin(angle);
      }
      
      frequencies[i] = Math.sqrt(real * real + imag * imag) / fftSize;
    }
    
    return frequencies;
  }

  /**
   * Calculate energy in a frequency band
   */
  private static calculateBandEnergy(
    frequencies: Float32Array,
    minFreq: number,
    maxFreq: number,
    sampleRate: number
  ): number {
    const minIndex = Math.floor((minFreq / (sampleRate / 2)) * frequencies.length);
    const maxIndex = Math.ceil((maxFreq / (sampleRate / 2)) * frequencies.length);
    
    let energy = 0;
    let count = 0;
    
    for (let i = minIndex; i < maxIndex && i < frequencies.length; i++) {
      energy += frequencies[i];
      count++;
    }
    
    return count > 0 ? energy / count : 0;
  }

  /**
   * Calculate summary statistics
   */
  private static calculateSummary(
    timeline: AudioAnalysisTimeline[],
    audioBuffer: any
  ): AudioAnalysisResult['summary'] {
    const volumes = timeline.map(t => t.data.volume);
    const bassValues = timeline.map(t => t.data.bass);
    const midValues = timeline.map(t => t.data.mid);
    const trebleValues = timeline.map(t => t.data.treble);
    
    return {
      averageVolume: this.average(volumes),
      peakVolume: Math.max(...volumes),
      averageBass: this.average(bassValues),
      averageMid: this.average(midValues),
      averageTreble: this.average(trebleValues),
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      analysisInterval: this.ANALYSIS_INTERVAL
    };
  }

  /**
   * Calculate average of array
   */
  private static average(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Upload analysis result to R2
   */
  private static async uploadAnalysis(
    analysisResult: AudioAnalysisResult,
    userId: string,
    stemType: string
  ): Promise<string> {
    const analysisJson = JSON.stringify(analysisResult, null, 2);
    const s3Key = generateS3Key(userId, `${stemType}_analysis.json`, 'audio');
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: analysisJson,
      ContentType: 'application/json'
    });
    
    await r2Client.send(command);
    console.log(`✅ Audio analysis uploaded to R2: ${s3Key}`);
    
    return s3Key;
  }

  /**
   * Batch analyze multiple stems
   */
  static async batchAnalyzeStems(
    stemPaths: Record<string, string>,
    userId: string
  ): Promise<Record<string, { analysisResult: AudioAnalysisResult; s3Key: string }>> {
    const results: Record<string, { analysisResult: AudioAnalysisResult; s3Key: string }> = {};
    
    for (const [stemType, stemPath] of Object.entries(stemPaths)) {
      try {
        if (fs.existsSync(stemPath)) {
          results[stemType] = await this.analyzeAudioFile(stemPath, userId, stemType);
          console.log(`✅ Analyzed ${stemType} stem`);
        } else {
          console.warn(`⚠️ Stem file not found: ${stemPath}`);
        }
      } catch (error) {
        console.error(`❌ Failed to analyze ${stemType} stem:`, error);
        // Continue with other stems even if one fails
      }
    }
    
    return results;
  }
}