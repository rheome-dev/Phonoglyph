/// <reference types="node" />
/// <reference types="node" />
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
export declare class AudioAnalyzer {
    private supabase;
    constructor();
    /**
     * Analyze an audio file and cache the results
     */
    analyzeAndCache(fileMetadataId: string, userId: string, stemType: string, audioBuffer: Buffer): Promise<CachedAnalysis>;
    /**
     * Retrieve cached analysis for a file
     */
    getCachedAnalysis(fileMetadataId: string, userId: string, stemType?: string): Promise<CachedAnalysis | null>;
    /**
     * Retrieve cached analysis for multiple files
     */
    getBatchCachedAnalysis(fileMetadataIds: string[], userId: string, stemType?: string): Promise<CachedAnalysis[]>;
    /**
     * Convert any audio format to a WAV buffer for analysis
     */
    private convertToWav;
    /**
     * Analyze an audio buffer and return structured data
     */
    private analyzeAudioBuffer;
    private getAudioSamples;
    /**
     * Generate waveform data from an audio buffer
     */
    private generateWaveformData;
    private calculateRMS;
    private calculateSpectralCentroid;
    private calculateSpectralRolloff;
    private calculateSpectralFlatness;
    private calculateSpectralSpread;
    private calculateZCR;
    private calculateLoudness;
    private calculateMFCC;
    private calculateEnergy;
    private calculatePerceptualSpread;
    private calculatePerceptualSharpness;
    private calculateChromaVector;
    private generateFrequencyData;
    private generateTimeData;
    private calculateBandEnergy;
    private detectFeatureMarkers;
    /**
     * Simplified FFT implementation
     */
    private performFFT;
    private simpleFFT;
}
//# sourceMappingURL=audio-analyzer.d.ts.map