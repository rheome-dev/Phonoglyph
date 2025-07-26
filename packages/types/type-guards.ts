/**
 * Comprehensive Type Guards and Runtime Validation
 * Ensures type safety at runtime for all audio processing data
 */

import { 
  AudioFeatureData, 
  StemAnalysisData, 
  AudioAnalysisData, 
  CachedStemAnalysis,
  StemType,
  AudioFeature,
  ExtendedAudioFeature,
  StemMetadata,
  AudioMarker
} from './audio';

import {
  VisualizationParameters,
  LiveMIDIData,
  MIDINote,
  VisualEffect,
  MediaLayer
} from './visualization';

import {
  PerformanceMetrics,
  DetailedPerformanceMetrics,
  PerformanceAlert,
  DeviceCapabilities
} from './performance';

// ===== BASIC TYPE GUARDS =====

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!itemGuard) return true;
  return value.every(itemGuard);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ===== STEM TYPE GUARDS =====

export function isStemType(value: unknown): value is StemType {
  return isString(value) && ['drums', 'bass', 'vocals', 'other', 'piano', 'master'].includes(value);
}

export function isAudioFeature(value: unknown): value is AudioFeature {
  if (!isObject(value)) return false;
  
  return isNumber(value.timestamp) &&
         isNumber(value.rms) &&
         isNumber(value.spectralCentroid) &&
         isNumber(value.energy) &&
         isNumber(value.clarity) &&
         (value.bpm === undefined || isNumber(value.bpm)) &&
         (value.key === undefined || isString(value.key));
}

export function isExtendedAudioFeature(value: unknown): value is ExtendedAudioFeature {
  if (!isAudioFeature(value)) return false;
  
  const extended = value as Record<string, unknown>;
  return isNumber(extended.spectralRolloff) &&
         isNumber(extended.loudness) &&
         isNumber(extended.perceptualSpread) &&
         isNumber(extended.spectralFlux) &&
         isArray(extended.mfcc, isNumber) &&
         isArray(extended.chromaVector, isNumber) &&
         isNumber(extended.tempo) &&
         isArray(extended.rhythmPattern, isNumber) &&
         isNumber(extended.zcr) &&
         isNumber(extended.spectralFlatness);
}

export function isAudioMarker(value: unknown): value is AudioMarker {
  if (!isObject(value)) return false;
  
  return isNumber(value.timestamp) &&
         isString(value.type) &&
         ['beat', 'bar', 'section', 'key_change', 'tempo_change'].includes(value.type as string) &&
         isNumber(value.confidence) &&
         (value.value === undefined || isString(value.value) || isNumber(value.value));
}

export function isStemMetadata(value: unknown): value is StemMetadata {
  if (!isObject(value)) return false;
  
  return isNumber(value.bpm) &&
         isString(value.key) &&
         isNumber(value.energy) &&
         isNumber(value.clarity) &&
         isNumber(value.duration) &&
         isNumber(value.sampleRate) &&
         isNumber(value.channels) &&
         isNumber(value.bitDepth);
}

export function isStemAnalysisData(value: unknown): value is StemAnalysisData {
  if (!isObject(value)) return false;
  
  return isArray(value.features, isExtendedAudioFeature) &&
         isArray(value.markers, isAudioMarker) &&
         isArray(value.frequencies, isNumber) &&
         isArray(value.timeData, isNumber) &&
         isArray(value.volume, isNumber) &&
         isArray(value.bass, isNumber) &&
         isArray(value.mid, isNumber) &&
         isArray(value.treble, isNumber) &&
         isArray(value.fft, isNumber) &&
         isArray(value.fftFrequencies, isNumber) &&
         isStemMetadata(value.metadata);
}

export function isAudioFeatureData(value: unknown): value is AudioFeatureData {
  if (!isObject(value)) return false;
  
  return Object.entries(value).every(([key, val]) => {
    return isStemType(key) && (val === undefined || isStemAnalysisData(val));
  });
}

export function isCachedStemAnalysis(value: unknown): value is CachedStemAnalysis {
  if (!isObject(value)) return false;
  
  return isString(value.id) &&
         isString(value.fileMetadataId) &&
         isStemType(value.stemType) &&
         isStemAnalysisData(value.analysisData) &&
         isString(value.createdAt) &&
         isString(value.updatedAt);
}

export function isAudioAnalysisData(value: unknown): value is AudioAnalysisData {
  if (!isObject(value)) return false;
  
  return isArray(value.frequencies, isNumber) &&
         isArray(value.timeData, isNumber) &&
         isNumber(value.volume) &&
         isNumber(value.bass) &&
         isNumber(value.mid) &&
         isNumber(value.treble) &&
         isNumber(value.rms) &&
         isNumber(value.spectralCentroid) &&
         isNumber(value.spectralRolloff) &&
         isNumber(value.zcr) &&
         isNumber(value.timestamp);
}

// ===== MIDI TYPE GUARDS =====

export function isMIDINote(value: unknown): value is MIDINote {
  if (!isObject(value)) return false;
  
  return isNumber(value.note) &&
         isNumber(value.velocity) &&
         isNumber(value.startTime) &&
         isString(value.track) &&
         isNumber(value.channel) &&
         (value.endTime === undefined || isNumber(value.endTime)) &&
         (value.instrument === undefined || isString(value.instrument));
}

export function isLiveMIDIData(value: unknown): value is LiveMIDIData {
  if (!isObject(value)) return false;
  
  return isArray(value.activeNotes, isMIDINote) &&
         isNumber(value.currentTime) &&
         isNumber(value.tempo) &&
         isNumber(value.totalNotes) &&
         isObject(value.trackActivity) &&
         isArray(value.timeSignature) &&
         value.timeSignature.length === 2 &&
         isNumber(value.timeSignature[0]) &&
         isNumber(value.timeSignature[1]) &&
         isString(value.keySignature);
}

// ===== PERFORMANCE TYPE GUARDS =====

export function isPerformanceMetrics(value: unknown): value is PerformanceMetrics {
  if (!isObject(value)) return false;
  
  return isNumber(value.fps) &&
         isNumber(value.frameTime) &&
         isNumber(value.cpuUsage) &&
         isNumber(value.memoryUsage) &&
         isNumber(value.gpuMemory) &&
         isNumber(value.activeEffects) &&
         isNumber(value.activeLayers) &&
         isBoolean(value.audioTextureEnabled) &&
         isBoolean(value.multiLayerCompositingEnabled) &&
         isNumber(value.timestamp);
}

export function isDetailedPerformanceMetrics(value: unknown): value is DetailedPerformanceMetrics {
  if (!isPerformanceMetrics(value)) return false;
  
  const detailed = value as Record<string, unknown>;
  return isNumber(detailed.drawCalls) &&
         isNumber(detailed.triangles) &&
         isNumber(detailed.geometries) &&
         isNumber(detailed.textures) &&
         isNumber(detailed.shaderPrograms) &&
         isNumber(detailed.analysisLatency) &&
         isNumber(detailed.audioLatency) &&
         isNumber(detailed.bufferUnderruns) &&
         isNumber(detailed.frameDrops) &&
         isObject(detailed.memoryBreakdown) &&
         isNumber(detailed.inputLag) &&
         isNumber(detailed.parameterUpdateLatency) &&
         isNumber(detailed.visualResponseTime) &&
         isNumber(detailed.memoryLeaks) &&
         isNumber(detailed.errorCount) &&
         isNumber(detailed.warningCount);
}

export function isPerformanceAlert(value: unknown): value is PerformanceAlert {
  if (!isObject(value)) return false;
  
  return isString(value.id) &&
         isString(value.type) &&
         ['critical', 'warning', 'info'].includes(value.type as string) &&
         isString(value.category) &&
         ['performance', 'memory', 'audio', 'gpu', 'user_experience'].includes(value.category as string) &&
         isString(value.title) &&
         isString(value.description) &&
         isString(value.recommendation) &&
         isString(value.impact) &&
         ['high', 'medium', 'low'].includes(value.impact as string) &&
         isBoolean(value.canAutoFix) &&
         isNumber(value.timestamp) &&
         isBoolean(value.acknowledged);
}

export function isDeviceCapabilities(value: unknown): value is DeviceCapabilities {
  if (!isObject(value)) return false;
  
  return isString(value.deviceClass) &&
         ['ultra-high', 'high', 'medium', 'low', 'potato'].includes(value.deviceClass as string) &&
         isNumber(value.cpuCores) &&
         isNumber(value.estimatedRam) &&
         isString(value.gpuTier) &&
         ['high', 'medium', 'low'].includes(value.gpuTier as string) &&
         isBoolean(value.supportsWebGL2) &&
         isBoolean(value.supportsWebAudio) &&
         isBoolean(value.supportsWorkers) &&
         isBoolean(value.supportsSIMD) &&
         isBoolean(value.isMobile) &&
         isString(value.networkSpeed) &&
         ['slow', 'medium', 'fast'].includes(value.networkSpeed as string);
}

// ===== VALIDATION UTILITIES =====

export function validateAndTransform<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage?: string
): T {
  if (guard(value)) {
    return value;
  }
  throw new Error(errorMessage || `Validation failed for value: ${JSON.stringify(value)}`);
}

export function safeValidate<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  defaultValue: T
): T {
  return guard(value) ? value : defaultValue;
}

export function createArrayValidator<T>(
  itemGuard: (value: unknown) => value is T
) {
  return (value: unknown): value is T[] => isArray(value, itemGuard);
}

export function createOptionalValidator<T>(
  guard: (value: unknown) => value is T
) {
  return (value: unknown): value is T | undefined => 
    value === undefined || guard(value);
}

// ===== RUNTIME TYPE CHECKING UTILITIES =====

export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  context?: string
): asserts value is T {
  if (!guard(value)) {
    const contextMsg = context ? ` in ${context}` : '';
    throw new TypeError(`Type assertion failed${contextMsg}: ${JSON.stringify(value)}`);
  }
}

export function isValidEnum<T extends Record<string, string | number>>(
  enumObject: T,
  value: unknown
): value is T[keyof T] {
  return Object.values(enumObject).includes(value as T[keyof T]);
}
