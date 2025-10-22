"use strict";
/**
 * Comprehensive Type Guards and Runtime Validation
 * Ensures type safety at runtime for all audio processing data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEnum = exports.assertType = exports.createOptionalValidator = exports.createArrayValidator = exports.safeValidate = exports.validateAndTransform = exports.isDeviceCapabilities = exports.isPerformanceAlert = exports.isDetailedPerformanceMetrics = exports.isPerformanceMetrics = exports.isLiveMIDIData = exports.isMIDINote = exports.isAudioAnalysisData = exports.isCachedStemAnalysis = exports.isAudioFeatureData = exports.isStemAnalysisData = exports.isStemMetadata = exports.isAudioMarker = exports.isExtendedAudioFeature = exports.isAudioFeature = exports.isStemType = exports.isObject = exports.isArray = exports.isBoolean = exports.isNumber = exports.isString = void 0;
// ===== BASIC TYPE GUARDS =====
function isString(value) {
    return typeof value === 'string';
}
exports.isString = isString;
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
exports.isNumber = isNumber;
function isBoolean(value) {
    return typeof value === 'boolean';
}
exports.isBoolean = isBoolean;
function isArray(value, itemGuard) {
    if (!Array.isArray(value))
        return false;
    if (!itemGuard)
        return true;
    return value.every(itemGuard);
}
exports.isArray = isArray;
function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
exports.isObject = isObject;
// ===== STEM TYPE GUARDS =====
function isStemType(value) {
    return isString(value) && ['drums', 'bass', 'vocals', 'other', 'piano', 'master'].includes(value);
}
exports.isStemType = isStemType;
function isAudioFeature(value) {
    if (!isObject(value))
        return false;
    return isNumber(value.timestamp) &&
        isNumber(value.rms) &&
        isNumber(value.spectralCentroid) &&
        isNumber(value.energy) &&
        isNumber(value.clarity) &&
        (value.bpm === undefined || isNumber(value.bpm)) &&
        (value.key === undefined || isString(value.key));
}
exports.isAudioFeature = isAudioFeature;
function isExtendedAudioFeature(value) {
    if (!isAudioFeature(value))
        return false;
    const extended = value;
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
exports.isExtendedAudioFeature = isExtendedAudioFeature;
function isAudioMarker(value) {
    if (!isObject(value))
        return false;
    return isNumber(value.timestamp) &&
        isString(value.type) &&
        ['beat', 'bar', 'section', 'key_change', 'tempo_change'].includes(value.type) &&
        isNumber(value.confidence) &&
        (value.value === undefined || isString(value.value) || isNumber(value.value));
}
exports.isAudioMarker = isAudioMarker;
function isStemMetadata(value) {
    if (!isObject(value))
        return false;
    return isNumber(value.bpm) &&
        isString(value.key) &&
        isNumber(value.energy) &&
        isNumber(value.clarity) &&
        isNumber(value.duration) &&
        isNumber(value.sampleRate) &&
        isNumber(value.channels) &&
        isNumber(value.bitDepth);
}
exports.isStemMetadata = isStemMetadata;
function isStemAnalysisData(value) {
    if (!isObject(value))
        return false;
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
exports.isStemAnalysisData = isStemAnalysisData;
function isAudioFeatureData(value) {
    if (!isObject(value))
        return false;
    return Object.entries(value).every(([key, val]) => {
        return isStemType(key) && (val === undefined || isStemAnalysisData(val));
    });
}
exports.isAudioFeatureData = isAudioFeatureData;
function isCachedStemAnalysis(value) {
    if (!isObject(value))
        return false;
    return isString(value.id) &&
        isString(value.fileMetadataId) &&
        isStemType(value.stemType) &&
        isStemAnalysisData(value.analysisData) &&
        isString(value.createdAt) &&
        isString(value.updatedAt);
}
exports.isCachedStemAnalysis = isCachedStemAnalysis;
function isAudioAnalysisData(value) {
    if (!isObject(value))
        return false;
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
exports.isAudioAnalysisData = isAudioAnalysisData;
// ===== MIDI TYPE GUARDS =====
function isMIDINote(value) {
    if (!isObject(value))
        return false;
    return isNumber(value.note) &&
        isNumber(value.velocity) &&
        isNumber(value.startTime) &&
        isString(value.track) &&
        isNumber(value.channel) &&
        (value.endTime === undefined || isNumber(value.endTime)) &&
        (value.instrument === undefined || isString(value.instrument));
}
exports.isMIDINote = isMIDINote;
function isLiveMIDIData(value) {
    if (!isObject(value))
        return false;
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
exports.isLiveMIDIData = isLiveMIDIData;
// ===== PERFORMANCE TYPE GUARDS =====
function isPerformanceMetrics(value) {
    if (!isObject(value))
        return false;
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
exports.isPerformanceMetrics = isPerformanceMetrics;
function isDetailedPerformanceMetrics(value) {
    if (!isPerformanceMetrics(value))
        return false;
    const detailed = value;
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
exports.isDetailedPerformanceMetrics = isDetailedPerformanceMetrics;
function isPerformanceAlert(value) {
    if (!isObject(value))
        return false;
    return isString(value.id) &&
        isString(value.type) &&
        ['critical', 'warning', 'info'].includes(value.type) &&
        isString(value.category) &&
        ['performance', 'memory', 'audio', 'gpu', 'user_experience'].includes(value.category) &&
        isString(value.title) &&
        isString(value.description) &&
        isString(value.recommendation) &&
        isString(value.impact) &&
        ['high', 'medium', 'low'].includes(value.impact) &&
        isBoolean(value.canAutoFix) &&
        isNumber(value.timestamp) &&
        isBoolean(value.acknowledged);
}
exports.isPerformanceAlert = isPerformanceAlert;
function isDeviceCapabilities(value) {
    if (!isObject(value))
        return false;
    return isString(value.deviceClass) &&
        ['ultra-high', 'high', 'medium', 'low', 'potato'].includes(value.deviceClass) &&
        isNumber(value.cpuCores) &&
        isNumber(value.estimatedRam) &&
        isString(value.gpuTier) &&
        ['high', 'medium', 'low'].includes(value.gpuTier) &&
        isBoolean(value.supportsWebGL2) &&
        isBoolean(value.supportsWebAudio) &&
        isBoolean(value.supportsWorkers) &&
        isBoolean(value.supportsSIMD) &&
        isBoolean(value.isMobile) &&
        isString(value.networkSpeed) &&
        ['slow', 'medium', 'fast'].includes(value.networkSpeed);
}
exports.isDeviceCapabilities = isDeviceCapabilities;
// ===== VALIDATION UTILITIES =====
function validateAndTransform(value, guard, errorMessage) {
    if (guard(value)) {
        return value;
    }
    throw new Error(errorMessage || `Validation failed for value: ${JSON.stringify(value)}`);
}
exports.validateAndTransform = validateAndTransform;
function safeValidate(value, guard, defaultValue) {
    return guard(value) ? value : defaultValue;
}
exports.safeValidate = safeValidate;
function createArrayValidator(itemGuard) {
    return (value) => isArray(value, itemGuard);
}
exports.createArrayValidator = createArrayValidator;
function createOptionalValidator(guard) {
    return (value) => value === undefined || guard(value);
}
exports.createOptionalValidator = createOptionalValidator;
// ===== RUNTIME TYPE CHECKING UTILITIES =====
function assertType(value, guard, context) {
    if (!guard(value)) {
        const contextMsg = context ? ` in ${context}` : '';
        throw new TypeError(`Type assertion failed${contextMsg}: ${JSON.stringify(value)}`);
    }
}
exports.assertType = assertType;
function isValidEnum(enumObject, value) {
    return Object.values(enumObject).includes(value);
}
exports.isValidEnum = isValidEnum;
