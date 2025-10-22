"use strict";
/**
 * Comprehensive Audio Processing Type Definitions
 * Replaces all `any` types with proper TypeScript interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAudioAnalysisData = exports.isStemAnalysisData = exports.isAudioFeatureData = void 0;
// ===== TYPE GUARDS =====
function isAudioFeatureData(value) {
    if (!value || typeof value !== 'object')
        return false;
    const data = value;
    return Object.keys(data).every(key => {
        const stemType = key;
        return ['drums', 'bass', 'vocals', 'other', 'piano', 'master'].includes(stemType) &&
            isStemAnalysisData(data[key]);
    });
}
exports.isAudioFeatureData = isAudioFeatureData;
function isStemAnalysisData(value) {
    if (!value || typeof value !== 'object')
        return false;
    const data = value;
    return Array.isArray(data.features) &&
        Array.isArray(data.frequencies) &&
        Array.isArray(data.timeData) &&
        typeof data.metadata === 'object';
}
exports.isStemAnalysisData = isStemAnalysisData;
function isAudioAnalysisData(value) {
    if (!value || typeof value !== 'object')
        return false;
    const data = value;
    return Array.isArray(data.frequencies) &&
        Array.isArray(data.timeData) &&
        typeof data.volume === 'number' &&
        typeof data.timestamp === 'number';
}
exports.isAudioAnalysisData = isAudioAnalysisData;
