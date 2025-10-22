/**
 * Comprehensive Type Guards and Runtime Validation
 * Ensures type safety at runtime for all audio processing data
 */
import { AudioFeatureData, StemAnalysisData, AudioAnalysisData, CachedStemAnalysis, StemType, AudioFeature, ExtendedAudioFeature, StemMetadata, AudioMarker } from './audio';
import { LiveMIDIData, MIDINote } from './visualization';
import { PerformanceMetrics, DetailedPerformanceMetrics, PerformanceAlert, DeviceCapabilities } from './performance';
export declare function isString(value: unknown): value is string;
export declare function isNumber(value: unknown): value is number;
export declare function isBoolean(value: unknown): value is boolean;
export declare function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[];
export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function isStemType(value: unknown): value is StemType;
export declare function isAudioFeature(value: unknown): value is AudioFeature;
export declare function isExtendedAudioFeature(value: unknown): value is ExtendedAudioFeature;
export declare function isAudioMarker(value: unknown): value is AudioMarker;
export declare function isStemMetadata(value: unknown): value is StemMetadata;
export declare function isStemAnalysisData(value: unknown): value is StemAnalysisData;
export declare function isAudioFeatureData(value: unknown): value is AudioFeatureData;
export declare function isCachedStemAnalysis(value: unknown): value is CachedStemAnalysis;
export declare function isAudioAnalysisData(value: unknown): value is AudioAnalysisData;
export declare function isMIDINote(value: unknown): value is MIDINote;
export declare function isLiveMIDIData(value: unknown): value is LiveMIDIData;
export declare function isPerformanceMetrics(value: unknown): value is PerformanceMetrics;
export declare function isDetailedPerformanceMetrics(value: unknown): value is DetailedPerformanceMetrics;
export declare function isPerformanceAlert(value: unknown): value is PerformanceAlert;
export declare function isDeviceCapabilities(value: unknown): value is DeviceCapabilities;
export declare function validateAndTransform<T>(value: unknown, guard: (value: unknown) => value is T, errorMessage?: string): T;
export declare function safeValidate<T>(value: unknown, guard: (value: unknown) => value is T, defaultValue: T): T;
export declare function createArrayValidator<T>(itemGuard: (value: unknown) => value is T): (value: unknown) => value is T[];
export declare function createOptionalValidator<T>(guard: (value: unknown) => value is T): (value: unknown) => value is T | undefined;
export declare function assertType<T>(value: unknown, guard: (value: unknown) => value is T, context?: string): asserts value is T;
export declare function isValidEnum<T extends Record<string, string | number>>(enumObject: T, value: unknown): value is T[keyof T];
