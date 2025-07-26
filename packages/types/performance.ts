/**
 * Performance Monitoring Type Definitions
 * Comprehensive types for performance tracking and optimization
 */

// ===== CORE PERFORMANCE METRICS =====

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
  // Rendering metrics
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  shaderPrograms: number;
  
  // Audio processing metrics
  analysisLatency: number;
  audioLatency: number;
  bufferUnderruns: number;
  frameDrops: number;
  
  // Memory breakdown
  memoryBreakdown: {
    geometries: number;
    textures: number;
    shaders: number;
    audioBuffers: number;
    other: number;
  };
  
  // User experience metrics
  inputLag: number;
  parameterUpdateLatency: number;
  visualResponseTime: number;
  
  // System health
  memoryLeaks: number;
  errorCount: number;
  warningCount: number;
}

// ===== PERFORMANCE ALERTS =====

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

// ===== PERFORMANCE THRESHOLDS =====

export interface PerformanceThresholds {
  targetFrameRate: number;
  minFrameRate: number;
  maxMemoryUsage: number; // MB
  maxGpuMemoryUsage: number; // MB
  maxLatency: number; // ms
  maxAudioLatency: number; // ms
  maxCpuUsage: number; // percentage
  maxInputLag: number; // ms
  maxDrawCalls: number;
  maxTriangles: number;
}

// ===== MONITORING CONFIGURATION =====

export interface PerformanceMonitorConfig {
  enabled: boolean;
  sampleInterval: number; // ms
  historyLength: number; // number of samples to keep
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

// ===== DEVICE CAPABILITIES =====

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
  
  // WebGL capabilities
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
  
  // Audio capabilities
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

// ===== PERFORMANCE HISTORY =====

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

// ===== PERFORMANCE ANALYSIS =====

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
  slope: number; // Positive = increasing, negative = decreasing
  correlation: number; // How well the trend fits the data
  prediction: number; // Predicted next value
}

// ===== OPTIMIZATION STRATEGIES =====

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

// ===== PERFORMANCE TESTING =====

export interface PerformanceTest {
  id: string;
  name: string;
  description: string;
  duration: number; // ms
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

// ===== REAL-TIME MONITORING =====

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

// ===== TYPE GUARDS =====

export function isPerformanceMetrics(value: unknown): value is PerformanceMetrics {
  if (!value || typeof value !== 'object') return false;
  
  const metrics = value as Record<string, unknown>;
  return typeof metrics.fps === 'number' &&
         typeof metrics.frameTime === 'number' &&
         typeof metrics.memoryUsage === 'number' &&
         typeof metrics.timestamp === 'number';
}

export function isPerformanceAlert(value: unknown): value is PerformanceAlert {
  if (!value || typeof value !== 'object') return false;
  
  const alert = value as Record<string, unknown>;
  return typeof alert.id === 'string' &&
         typeof alert.type === 'string' &&
         typeof alert.category === 'string' &&
         typeof alert.title === 'string' &&
         typeof alert.timestamp === 'number';
}

export function isDeviceCapabilities(value: unknown): value is DeviceCapabilities {
  if (!value || typeof value !== 'object') return false;
  
  const caps = value as Record<string, unknown>;
  return typeof caps.deviceClass === 'string' &&
         typeof caps.cpuCores === 'number' &&
         typeof caps.estimatedRam === 'number' &&
         typeof caps.gpuTier === 'string';
}

export function isOptimizationRecommendation(value: unknown): value is OptimizationRecommendation {
  if (!value || typeof value !== 'object') return false;
  
  const rec = value as Record<string, unknown>;
  return typeof rec.id === 'string' &&
         typeof rec.category === 'string' &&
         typeof rec.title === 'string' &&
         typeof rec.action === 'function';
}
