import { AudioAnalysisData } from '@/types/visualizer';

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

export class AudioAnalysisFetcher {
  private analysisCache = new Map<string, AudioAnalysisResult>();
  private timelineCache = new Map<string, AudioAnalysisTimeline[]>();
  private baseUrl: string;

  constructor(baseUrl: string = 'https://your-r2-bucket.com') {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Fetch audio analysis for a stem
   */
  async fetchStemAnalysis(stemKey: string): Promise<AudioAnalysisResult | null> {
    try {
      // Check cache first
      if (this.analysisCache.has(stemKey)) {
        return this.analysisCache.get(stemKey)!;
      }

      // Construct analysis file URL
      const analysisKey = this.getAnalysisKey(stemKey);
      const analysisUrl = this.getAnalysisUrl(analysisKey);

      // Fetch analysis data
      const response = await fetch(analysisUrl);
      if (!response.ok) {
        console.warn(`Analysis not found for stem: ${stemKey}`);
        return null;
      }

      const analysisResult: AudioAnalysisResult = await response.json();
      
      // Cache the result
      this.analysisCache.set(stemKey, analysisResult);
      this.timelineCache.set(stemKey, analysisResult.timeline);

      return analysisResult;
    } catch (error) {
      console.error('Failed to fetch audio analysis:', error);
      return null;
    }
  }

  /**
   * Get analysis data for a specific timestamp
   */
  getAnalysisDataAtTime(stemKey: string, timestamp: number): AudioAnalysisData | null {
    const timeline = this.timelineCache.get(stemKey);
    if (!timeline) return null;

    // Find the closest analysis data point
    let closestIndex = 0;
    let closestDiff = Math.abs(timeline[0].timestamp - timestamp);

    for (let i = 1; i < timeline.length; i++) {
      const diff = Math.abs(timeline[i].timestamp - timestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return timeline[closestIndex].data;
  }

  /**
   * Get interpolated analysis data between two timestamps
   */
  getInterpolatedAnalysisData(stemKey: string, timestamp: number): AudioAnalysisData | null {
    const timeline = this.timelineCache.get(stemKey);
    if (!timeline) return null;

    // Find the two closest points
    let beforeIndex = -1;
    let afterIndex = -1;

    for (let i = 0; i < timeline.length - 1; i++) {
      if (timeline[i].timestamp <= timestamp && timeline[i + 1].timestamp >= timestamp) {
        beforeIndex = i;
        afterIndex = i + 1;
        break;
      }
    }

    if (beforeIndex === -1 || afterIndex === -1) {
      return this.getAnalysisDataAtTime(stemKey, timestamp);
    }

    const before = timeline[beforeIndex];
    const after = timeline[afterIndex];
    
    // Linear interpolation
    const factor = (timestamp - before.timestamp) / (after.timestamp - before.timestamp);
    
    return this.interpolateAnalysisData(before.data, after.data, factor);
  }

  /**
   * Interpolate between two analysis data points
   */
  private interpolateAnalysisData(
    before: AudioAnalysisData,
    after: AudioAnalysisData,
    factor: number
  ): AudioAnalysisData {
    const interpolateArray = (arr1: Float32Array | number[], arr2: Float32Array | number[]): Float32Array => {
      const result = new Float32Array(arr1.length);
      for (let i = 0; i < arr1.length; i++) {
        result[i] = arr1[i] + (arr2[i] - arr1[i]) * factor;
      }
      return result;
    };

    return {
      frequencies: interpolateArray(before.frequencies, after.frequencies),
      timeData: interpolateArray(before.timeData, after.timeData),
      volume: before.volume + (after.volume - before.volume) * factor,
      bass: before.bass + (after.bass - before.bass) * factor,
      mid: before.mid + (after.mid - before.mid) * factor,
      treble: before.treble + (after.treble - before.treble) * factor,
    };
  }

  /**
   * Batch fetch analysis for multiple stems
   */
  async batchFetchAnalysis(stemKeys: string[]): Promise<Map<string, AudioAnalysisResult>> {
    const results = new Map<string, AudioAnalysisResult>();
    
    const fetchPromises = stemKeys.map(async (stemKey) => {
      const analysis = await this.fetchStemAnalysis(stemKey);
      if (analysis) {
        results.set(stemKey, analysis);
      }
    });

    await Promise.all(fetchPromises);
    return results;
  }

  /**
   * Convert stem key to analysis key
   */
  private getAnalysisKey(stemKey: string): string {
    // Replace .wav extension with _analysis.json
    const baseName = stemKey.replace(/\.wav$/, '');
    return `${baseName}_analysis.json`;
  }

  /**
   * Get analysis file URL from R2
   */
  private getAnalysisUrl(analysisKey: string): string {
    return `${this.baseUrl}/${analysisKey}`;
  }

  /**
   * Preload analysis for stems
   */
  async preloadAnalysis(stemKeys: string[]): Promise<void> {
    console.log('🎵 Preloading audio analysis for', stemKeys.length, 'stems');
    
    const startTime = Date.now();
    await this.batchFetchAnalysis(stemKeys);
    
    const loadTime = Date.now() - startTime;
    console.log('✅ Audio analysis preloaded in', loadTime, 'ms');
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.timelineCache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { analysisCount: number; timelineCount: number } {
    return {
      analysisCount: this.analysisCache.size,
      timelineCount: this.timelineCache.size
    };
  }
}