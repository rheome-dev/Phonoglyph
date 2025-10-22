/**
 * Comprehensive Audio Processing Type Definitions
 * Replaces all `any` types with proper TypeScript interfaces
 */
export type StemType = 'drums' | 'bass' | 'vocals' | 'other' | 'piano' | 'master';
export interface AudioFeature {
    timestamp: number;
    rms: number;
    spectralCentroid: number;
    energy: number;
    bpm?: number;
    key?: string;
    clarity: number;
}
export interface ExtendedAudioFeature extends AudioFeature {
    spectralRolloff: number;
    loudness: number;
    perceptualSpread: number;
    spectralFlux: number;
    mfcc: number[];
    chromaVector: number[];
    tempo: number;
    rhythmPattern: number[];
    zcr: number;
    spectralFlatness: number;
}
export interface StemAnalysisData {
    features: ExtendedAudioFeature[];
    markers: AudioMarker[];
    frequencies: number[];
    timeData: number[];
    volume: number[];
    bass: number[];
    mid: number[];
    treble: number[];
    fft: number[];
    fftFrequencies: number[];
    metadata: StemMetadata;
}
export interface AudioMarker {
    timestamp: number;
    type: 'beat' | 'bar' | 'section' | 'key_change' | 'tempo_change';
    confidence: number;
    value?: string | number;
}
export interface AudioEvent {
    timestamp: number;
    type: string;
    data: Record<string, unknown>;
    confidence?: number;
}
export interface AudioTimeline {
    events: AudioEvent[];
    markers: AudioMarker[];
    duration: number;
    sampleRate: number;
    metadata?: Record<string, unknown>;
}
export interface StemMetadata {
    bpm: number;
    key: string;
    energy: number;
    clarity: number;
    duration: number;
    sampleRate: number;
    channels: number;
    bitDepth: number;
}
export type AudioFeatureData = {
    [K in StemType]?: StemAnalysisData;
};
export interface CachedStemAnalysis {
    id: string;
    fileMetadataId: string;
    stemType: StemType;
    analysisData: StemAnalysisData;
    createdAt: string;
    updatedAt: string;
}
export interface AudioAnalysisData {
    frequencies: number[];
    timeData: number[];
    volume: number;
    bass: number;
    mid: number;
    treble: number;
    rms: number;
    spectralCentroid: number;
    spectralRolloff: number;
    zcr: number;
    timestamp: number;
}
export type RealtimeAudioFeatures = {
    [K in StemType]?: AudioAnalysisData;
};
export interface AudioTextureData {
    audioData: Float32Array;
    featureData: Float32Array;
    timeData: Float32Array;
    dimensions: {
        width: number;
        height: number;
        depth: number;
    };
}
export interface GPUAudioBuffer {
    textureId: string;
    data: AudioTextureData;
    format: 'RGBA32F' | 'RGB32F' | 'RG32F' | 'R32F';
    usage: 'static' | 'dynamic' | 'stream';
    lastUpdated: number;
}
export interface AudioPerformanceMetrics {
    fps: number;
    analysisLatency: number;
    memoryUsage: number;
    cpuUsage: number;
    frameDrops: number;
    audioLatency: number;
    bufferUnderruns: number;
    processingTime: number;
}
export interface DeviceAudioCapabilities {
    maxSampleRate: number;
    maxChannels: number;
    supportedFormats: string[];
    hasWebAudio: boolean;
    hasAudioWorklet: boolean;
    latencyHint: 'interactive' | 'balanced' | 'playback';
    bufferSize: number;
}
export interface VisualizationParameters {
    colorScheme: ColorScheme;
    effectSettings: EffectSettings;
    cameraSettings: CameraSettings;
    lightingSettings: LightingSettings;
    postProcessing: PostProcessingSettings;
}
export interface ColorScheme {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    palette: string[];
    mode: 'static' | 'dynamic' | 'audio_reactive';
}
export interface EffectSettings {
    bloom: BloomSettings;
    distortion: DistortionSettings;
    particles: ParticleSettings;
    waveform: WaveformSettings;
    spectrum: SpectrumSettings;
}
export interface BloomSettings {
    enabled: boolean;
    intensity: number;
    threshold: number;
    radius: number;
}
export interface DistortionSettings {
    enabled: boolean;
    amount: number;
    frequency: number;
    type: 'sine' | 'noise' | 'fractal';
}
export interface ParticleSettings {
    enabled: boolean;
    count: number;
    size: number;
    speed: number;
    lifetime: number;
    emissionRate: number;
}
export interface WaveformSettings {
    enabled: boolean;
    thickness: number;
    smoothing: number;
    amplitude: number;
    frequency: number;
}
export interface SpectrumSettings {
    enabled: boolean;
    bars: number;
    smoothing: number;
    scale: 'linear' | 'logarithmic';
    range: [number, number];
}
export interface CameraSettings {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
    near: number;
    far: number;
    autoRotate: boolean;
    rotationSpeed: number;
}
export interface LightingSettings {
    ambient: {
        color: string;
        intensity: number;
    };
    directional: {
        color: string;
        intensity: number;
        position: [number, number, number];
    };
    point: Array<{
        color: string;
        intensity: number;
        position: [number, number, number];
        distance: number;
    }>;
}
export interface PostProcessingSettings {
    enabled: boolean;
    effects: {
        bloom: boolean;
        filmGrain: boolean;
        vignette: boolean;
        colorGrading: boolean;
        chromaticAberration: boolean;
    };
    quality: 'low' | 'medium' | 'high' | 'ultra';
}
export interface ExportConfiguration {
    format: ExportFormat;
    quality: ExportQuality;
    resolution: ExportResolution;
    frameRate: number;
    duration: number;
    audioSettings: AudioExportSettings;
    videoSettings: VideoExportSettings;
    metadata: ExportMetadata;
}
export interface ExportFormat {
    container: 'mp4' | 'webm' | 'mov' | 'avi';
    videoCodec: 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1';
    audioCodec: 'aac' | 'mp3' | 'opus' | 'vorbis';
}
export interface ExportQuality {
    preset: 'draft' | 'standard' | 'high' | 'ultra';
    videoBitrate: number;
    audioBitrate: number;
    crf?: number;
}
export interface ExportResolution {
    width: number;
    height: number;
    aspectRatio: string;
    pixelFormat: 'yuv420p' | 'yuv444p' | 'rgb24';
}
export interface AudioExportSettings {
    sampleRate: number;
    channels: number;
    bitDepth: number;
    normalize: boolean;
    fadeIn: number;
    fadeOut: number;
}
export interface VideoExportSettings {
    keyframeInterval: number;
    bFrames: number;
    profile: string;
    level: string;
    pixelFormat: string;
    colorSpace: 'rec709' | 'rec2020' | 'srgb';
}
export interface ExportMetadata {
    title: string;
    artist: string;
    album?: string;
    year?: number;
    genre?: string;
    description?: string;
    tags: string[];
}
export interface AudioProcessingError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: number;
    recoverable: boolean;
    context: 'analysis' | 'playback' | 'export' | 'gpu' | 'worker';
}
export interface AudioValidationError extends AudioProcessingError {
    field: string;
    expectedType: string;
    actualType: string;
    value: unknown;
}
export declare function isAudioFeatureData(value: unknown): value is AudioFeatureData;
export declare function isStemAnalysisData(value: unknown): value is StemAnalysisData;
export declare function isAudioAnalysisData(value: unknown): value is AudioAnalysisData;
