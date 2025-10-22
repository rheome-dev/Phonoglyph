"use strict";
/**
 * Performance Monitoring Type Definitions
 * Comprehensive types for performance tracking and optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOptimizationRecommendation = exports.isDeviceCapabilities = exports.isPerformanceAlert = exports.isPerformanceMetrics = void 0;
// ===== TYPE GUARDS =====
function isPerformanceMetrics(value) {
    if (!value || typeof value !== 'object')
        return false;
    const metrics = value;
    return typeof metrics.fps === 'number' &&
        typeof metrics.frameTime === 'number' &&
        typeof metrics.memoryUsage === 'number' &&
        typeof metrics.timestamp === 'number';
}
exports.isPerformanceMetrics = isPerformanceMetrics;
function isPerformanceAlert(value) {
    if (!value || typeof value !== 'object')
        return false;
    const alert = value;
    return typeof alert.id === 'string' &&
        typeof alert.type === 'string' &&
        typeof alert.category === 'string' &&
        typeof alert.title === 'string' &&
        typeof alert.timestamp === 'number';
}
exports.isPerformanceAlert = isPerformanceAlert;
function isDeviceCapabilities(value) {
    if (!value || typeof value !== 'object')
        return false;
    const caps = value;
    return typeof caps.deviceClass === 'string' &&
        typeof caps.cpuCores === 'number' &&
        typeof caps.estimatedRam === 'number' &&
        typeof caps.gpuTier === 'string';
}
exports.isDeviceCapabilities = isDeviceCapabilities;
function isOptimizationRecommendation(value) {
    if (!value || typeof value !== 'object')
        return false;
    const rec = value;
    return typeof rec.id === 'string' &&
        typeof rec.category === 'string' &&
        typeof rec.title === 'string' &&
        typeof rec.action === 'function';
}
exports.isOptimizationRecommendation = isOptimizationRecommendation;
