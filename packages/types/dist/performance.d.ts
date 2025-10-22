/**
 * Performance Monitoring Type Definitions
 * Comprehensive types for performance tracking and optimization
 */
export interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    cpuUsage: number;
    memoryUsage: number;
    gpuMemory: number;
    activeEffects: number;
    activeLayers: number;
    audioTextureEnabled: boolean;
    multiLayerCompositingEnabled: boolean;
    timestamp: number;
}
export interface DetailedPerformanceMetrics extends PerformanceMetrics {
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    shaderPrograms: number;
    analysisLatency: number;
    audioLatency: number;
    bufferUnderruns: number;
    frameDrops: number;
    memoryBreakdown: {
        geometries: number;
        textures: number;
        shaders: number;
        audioBuffers: number;
        other: number;
    };
    inputLag: number;
    parameterUpdateLatency: number;
    visualResponseTime: number;
    memoryLeaks: number;
    errorCount: number;
    warningCount: number;
}
export interface PerformanceAlert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    category: 'performance' | 'memory' | 'audio' | 'gpu' | 'user_experience';
    title: string;
    description: string;
    recommendation: string;
    impact: 'high' | 'medium' | 'low';
    canAutoFix: boolean;
    autoFixAction?: () => Promise<void>;
    timestamp: number;
    acknowledged: boolean;
}
export interface OptimizationRecommendation {
    id: string;
    category: 'quality' | 'performance' | 'memory' | 'battery';
    title: string;
    description: string;
    expectedImpact: string;
    difficulty: 'easy' | 'medium' | 'advanced';
    action: () => Promise<boolean>;
    currentValue?: unknown;
    recommendedValue?: unknown;
}
export interface PerformanceThresholds {
    targetFrameRate: number;
    minFrameRate: number;
    maxMemoryUsage: number;
    maxGpuMemoryUsage: number;
    maxLatency: number;
    maxAudioLatency: number;
    maxCpuUsage: number;
    maxInputLag: number;
    maxDrawCalls: number;
    maxTriangles: number;
}
export interface PerformanceMonitorConfig {
    enabled: boolean;
    sampleInterval: number;
    historyLength: number;
    alertThresholds: PerformanceThresholds;
    enableAutoOptimization: boolean;
    enablePredictiveAnalysis: boolean;
    debugMode: boolean;
    categories: {
        rendering: boolean;
        audio: boolean;
        memory: boolean;
        userExperience: boolean;
    };
}
export interface DeviceCapabilities {
    deviceClass: 'ultra-high' | 'high' | 'medium' | 'low' | 'potato';
    cpuCores: number;
    estimatedRam: number;
    gpuTier: 'high' | 'medium' | 'low';
    supportsWebGL2: boolean;
    supportsWebAudio: boolean;
    supportsWorkers: boolean;
    supportsSIMD: boolean;
    isMobile: boolean;
    batteryLevel?: number;
    thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
    networkSpeed: 'slow' | 'medium' | 'fast';
    webglCapabilities: {
        maxTextureSize: number;
        maxRenderBufferSize: number;
        maxVertexUniforms: number;
        maxFragmentUniforms: number;
        maxVaryingVectors: number;
        maxVertexAttribs: number;
        maxCombinedTextureImageUnits: number;
        floatTextures: boolean;
        depthTextures: boolean;
        instancedArrays: boolean;
        vertexArrayObjects: boolean;
    };
    audioCapabilities: {
        maxSampleRate: number;
        maxChannels: number;
        supportedFormats: string[];
        hasWebAudio: boolean;
        hasAudioWorklet: boolean;
        latencyHint: 'interactive' | 'balanced' | 'playback';
        bufferSize: number;
    };
}
export interface PerformanceHistoryEntry {
    timestamp: number;
    metrics: DetailedPerformanceMetrics;
    context: {
        activeEffects: string[];
        activeLayers: string[];
        currentScene: string;
        audioPlaying: boolean;
        exportInProgress: boolean;
    };
}
export interface PerformanceHistory {
    entries: PerformanceHistoryEntry[];
    maxEntries: number;
    startTime: number;
    totalSamples: number;
}
export interface PerformanceAnalysis {
    summary: {
        averageFps: number;
        minFps: number;
        maxFps: number;
        frameTimeP95: number;
        memoryTrend: 'stable' | 'increasing' | 'decreasing';
        overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    };
    bottlenecks: {
        cpu: boolean;
        gpu: boolean;
        memory: boolean;
        audio: boolean;
        network: boolean;
    };
    recommendations: OptimizationRecommendation[];
    alerts: PerformanceAlert[];
    trends: {
        fps: TrendData;
        memory: TrendData;
        cpuUsage: TrendData;
        audioLatency: TrendData;
    };
}
export interface TrendData {
    values: number[];
    timestamps: number[];
    slope: number;
    correlation: number;
    prediction: number;
}
export interface OptimizationStrategy {
    id: string;
    name: string;
    description: string;
    category: 'quality' | 'performance' | 'memory' | 'battery';
    impact: 'low' | 'medium' | 'high';
    difficulty: 'easy' | 'medium' | 'hard';
    conditions: {
        minDeviceTier?: DeviceCapabilities['deviceClass'];
        maxMemoryUsage?: number;
        minFps?: number;
        batteryLevel?: number;
    };
    actions: OptimizationAction[];
}
export interface OptimizationAction {
    type: 'setting_change' | 'effect_disable' | 'quality_reduction' | 'memory_cleanup';
    target: string;
    value: unknown;
    reversible: boolean;
    description: string;
}
export interface PerformanceTest {
    id: string;
    name: string;
    description: string;
    duration: number;
    expectedResults: {
        minFps: number;
        maxMemoryUsage: number;
        maxLatency: number;
    };
    setup: () => Promise<void>;
    run: () => Promise<PerformanceTestResult>;
    cleanup: () => Promise<void>;
}
export interface PerformanceTestResult {
    testId: string;
    passed: boolean;
    metrics: DetailedPerformanceMetrics[];
    summary: {
        averageFps: number;
        peakMemoryUsage: number;
        averageLatency: number;
        frameDrops: number;
    };
    issues: string[];
    recommendations: string[];
    duration: number;
}
export interface PerformanceTestSuite {
    tests: PerformanceTest[];
    results: PerformanceTestResult[];
    overallScore: number;
    deviceProfile: DeviceCapabilities;
    timestamp: number;
}
export interface RealTimeMonitor {
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    getMetrics(): DetailedPerformanceMetrics;
    getHistory(): PerformanceHistory;
    getAnalysis(): PerformanceAnalysis;
    addAlert(alert: PerformanceAlert): void;
    clearAlerts(): void;
    exportData(): string;
}
export interface MonitoringEvent {
    type: 'metric_update' | 'alert_triggered' | 'optimization_applied' | 'test_completed';
    timestamp: number;
    data: unknown;
}
export declare function isPerformanceMetrics(value: unknown): value is PerformanceMetrics;
export declare function isPerformanceAlert(value: unknown): value is PerformanceAlert;
export declare function isDeviceCapabilities(value: unknown): value is DeviceCapabilities;
export declare function isOptimizationRecommendation(value: unknown): value is OptimizationRecommendation;
