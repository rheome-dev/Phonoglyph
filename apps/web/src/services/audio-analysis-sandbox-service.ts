import { trpc } from '@/lib/trpc';

export interface SandboxAnalysisData {
  transients: Array<{
    time: number;
    intensity: number;
    frequency: number;
  }>;
  chroma: Array<{
    time: number;
    pitch: number;
    confidence: number;
    note: string;
  }>;
  rms: Array<{
    time: number;
    value: number;
  }>;
  waveform: number[];
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    analysisParams: any;
  };
}

export interface CachedSandboxAnalysis {
  id: string;
  fileMetadataId: string;
  stemType: string;
  analysisData: SandboxAnalysisData;
  waveformData: {
    points: number[];
    duration: number;
    sampleRate: number;
    markers: any[];
  };
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
  };
}

export class AudioAnalysisSandboxService {
  /**
   * Convert sandbox analysis data to the format expected by the existing cached analysis system
   */
  static convertToCachedFormat(sandboxAnalysis: SandboxAnalysisData, fileId: string, stemType: string = 'master'): CachedSandboxAnalysis {
    // Convert transients to the format expected by the existing system
    const transientMarkers = sandboxAnalysis.transients.map(t => ({
      time: t.time,
      type: 'transient',
      intensity: t.intensity,
      frequency: t.frequency
    }));

    // Convert chroma to pitch data
    const pitchData = sandboxAnalysis.chroma.map(c => ({
      time: c.time,
      pitch: c.pitch,
      confidence: c.confidence,
      note: c.note
    }));

    // Convert RMS to volume data
    const volumeData = sandboxAnalysis.rms.map(r => ({
      time: r.time,
      value: r.value
    }));

    // Create analysis data in the expected format
    const analysisData = {
      // Core features
      transients: sandboxAnalysis.transients,
      chroma: sandboxAnalysis.chroma,
      rms: sandboxAnalysis.rms,
      
      // Legacy format compatibility
      features: sandboxAnalysis.transients.map(t => ({
        time: t.time,
        type: 'transient',
        intensity: t.intensity
      })),
      pitch: pitchData,
      volume: volumeData,
      
      // Additional analysis data
      markers: transientMarkers,
      timeData: sandboxAnalysis.transients.map(t => t.time),
      frequencies: sandboxAnalysis.transients.map(t => t.frequency),
      
      // Required properties for SandboxAnalysisData
      waveform: sandboxAnalysis.waveform,
      metadata: sandboxAnalysis.metadata
    };

    return {
      id: `sandbox_${fileId}_${Date.now()}`,
      fileMetadataId: fileId,
      stemType,
      analysisData,
      waveformData: {
        points: sandboxAnalysis.waveform,
        duration: sandboxAnalysis.metadata.duration,
        sampleRate: sandboxAnalysis.metadata.sampleRate,
        markers: transientMarkers
      },
      metadata: {
        sampleRate: sandboxAnalysis.metadata.sampleRate,
        duration: sandboxAnalysis.metadata.duration,
        bufferSize: sandboxAnalysis.metadata.bufferSize,
        featuresExtracted: ['transients', 'chroma', 'rms', 'waveform'],
        analysisDuration: 0 // Will be set by the analysis process
      }
    };
  }

  /**
   * Save sandbox analysis to the backend cache
   */
  static async saveToCache(sandboxAnalysis: SandboxAnalysisData, fileId: string, stemType: string = 'master'): Promise<boolean> {
    try {
      const cachedFormat = this.convertToCachedFormat(sandboxAnalysis, fileId, stemType);
      
      // TODO: Fix tRPC usage in service context
      // For now, just log the cached format instead of calling tRPC
      console.log('Sandbox analysis cached format:', cachedFormat);
      
      return true;
    } catch (error) {
      console.error('Failed to save sandbox analysis to cache:', error);
      return false;
    }
  }

  /**
   * Load sandbox analysis from the backend cache
   */
  static async loadFromCache(fileId: string, stemType: string = 'master'): Promise<SandboxAnalysisData | null> {
    try {
      // TODO: Fix tRPC usage in service context
      // For now, return null to indicate no cached analysis
      console.log('Loading sandbox analysis from cache:', { fileId, stemType });
      
      return null;
    } catch (error) {
      console.error('Failed to load sandbox analysis from cache:', error);
      return null;
    }
  }

  /**
   * Load existing cached analysis and convert to sandbox format
   */
  static convertFromCachedFormat(cachedAnalysis: any): SandboxAnalysisData | null {
    try {
      if (!cachedAnalysis || !cachedAnalysis.analysisData) {
        return null;
      }

      const analysisData = cachedAnalysis.analysisData;
      
      return {
        transients: analysisData.transients || [],
        chroma: analysisData.chroma || [],
        rms: analysisData.rms || [],
        waveform: cachedAnalysis.waveformData?.points || [],
        metadata: {
          sampleRate: cachedAnalysis.metadata?.sampleRate || 44100,
          duration: cachedAnalysis.metadata?.duration || 0,
          bufferSize: cachedAnalysis.metadata?.bufferSize || 1024,
          analysisParams: analysisData.analysisParams || {}
        }
      };
    } catch (error) {
      console.error('Failed to convert cached analysis to sandbox format:', error);
      return null;
    }
  }

  /**
   * Compare sandbox analysis with existing cached analysis
   */
  static compareAnalysis(sandboxAnalysis: SandboxAnalysisData, cachedAnalysis: any): {
    transients: { sandbox: number; cached: number; difference: number };
    chroma: { sandbox: number; cached: number; difference: number };
    rms: { sandbox: number; cached: number; difference: number };
  } {
    const sandboxTransients = sandboxAnalysis.transients.length;
    const sandboxChroma = sandboxAnalysis.chroma.length;
    const sandboxRms = sandboxAnalysis.rms.length;

    const cachedTransients = cachedAnalysis?.analysisData?.transients?.length || 0;
    const cachedChroma = cachedAnalysis?.analysisData?.chroma?.length || 0;
    const cachedRms = cachedAnalysis?.analysisData?.rms?.length || 0;

    return {
      transients: {
        sandbox: sandboxTransients,
        cached: cachedTransients,
        difference: sandboxTransients - cachedTransients
      },
      chroma: {
        sandbox: sandboxChroma,
        cached: cachedChroma,
        difference: sandboxChroma - cachedChroma
      },
      rms: {
        sandbox: sandboxRms,
        cached: cachedRms,
        difference: sandboxRms - cachedRms
      }
    };
  }
}
