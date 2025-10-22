"use strict";
/**
 * Visualization Type Definitions
 * Comprehensive types for Three.js visualizations and effects
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVisualizationParameters = exports.isMediaLayer = exports.isLiveMIDIData = exports.isVisualEffect = void 0;
// ===== TYPE GUARDS =====
function isVisualEffect(value) {
    if (!value || typeof value !== 'object')
        return false;
    const effect = value;
    return typeof effect.id === 'string' &&
        typeof effect.name === 'string' &&
        typeof effect.enabled === 'boolean' &&
        typeof effect.init === 'function' &&
        typeof effect.update === 'function' &&
        typeof effect.destroy === 'function';
}
exports.isVisualEffect = isVisualEffect;
function isLiveMIDIData(value) {
    if (!value || typeof value !== 'object')
        return false;
    const data = value;
    return Array.isArray(data.activeNotes) &&
        typeof data.currentTime === 'number' &&
        typeof data.tempo === 'number' &&
        typeof data.totalNotes === 'number' &&
        typeof data.trackActivity === 'object';
}
exports.isLiveMIDIData = isLiveMIDIData;
function isMediaLayer(value) {
    if (!value || typeof value !== 'object')
        return false;
    const layer = value;
    return typeof layer.id === 'string' &&
        typeof layer.type === 'string' &&
        typeof layer.enabled === 'boolean' &&
        typeof layer.opacity === 'number';
}
exports.isMediaLayer = isMediaLayer;
function isVisualizationParameters(value) {
    if (!value || typeof value !== 'object')
        return false;
    const params = value;
    return typeof params.colorScheme === 'object' &&
        typeof params.effectSettings === 'object' &&
        typeof params.cameraSettings === 'object';
}
exports.isVisualizationParameters = isVisualizationParameters;
