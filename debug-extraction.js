
const fs = require('fs');
const path = require('path');

// Mock debug log
const debugLog = {
    log: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};

// Load payload
const payloadPath = path.join(__dirname, 'apps/web/src/remotion/debug-payload.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

console.log('📦 Loaded Payload:', {
    layersCount: payload.layers.length,
    audioAnalysisCount: payload.audioAnalysisData.length,
});

// Mock functions from RayboxComposition.tsx
function getFeatureValueFromCached(cachedAnalysis, fileId, feature, time, stemType) {
    const featureParts = feature.includes('-') ? feature.split('-') : [feature];
    const parsedStem = featureParts.length > 1 ? featureParts[0] : (stemType ?? 'master');

    let analysis = cachedAnalysis.find(
        a => a.fileMetadataId === fileId && a.stemType === parsedStem
    );

    // FALLBACK: If strict ID match fails, try matching by stemType only
    if (!analysis) {
        console.log(`⚠️ [Fallback] No analysis found for ID ${fileId} and stem ${parsedStem}. Trying stemType match...`);
        analysis = cachedAnalysis.find(a => a.stemType === parsedStem);
        if (analysis) console.log(`✅ [Fallback] Found analysis by stemType: ${analysis.fileMetadataId}`);
    }

    if (!analysis?.analysisData) {
        console.log(`❌ No analysis data found for ${fileId} / ${parsedStem}`);
        return 0;
    }

    const { analysisData } = analysis;
    const featureName = featureParts.length > 1 ? featureParts.slice(1).join('-') : feature;

    // Time-series features - timestamp-based indexing using analysisData.frameTimes
    const getTimeSeriesValue = (arr) => {
        if (!arr || arr.length === 0) return 0;
        const times = analysisData.frameTimes;
        if (!times || times.length === 0) return 0;

        // Binary search: find last index with times[idx] <= time
        let lo = 0;
        let hi = Math.min(times.length - 1, arr.length - 1);
        while (lo < hi) {
            const mid = (lo + hi + 1) >>> 1;
            const tmid = times[mid];
            if (tmid <= time) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }
        const index = Math.max(0, Math.min(arr.length - 1, lo));
        return arr[index] ?? 0;
    };

    switch (featureName) {
        case 'rms': return getTimeSeriesValue(analysisData.rms);
        case 'loudness': return getTimeSeriesValue(analysisData.loudness);
        default: return 0;
    }
}

function extractAudioDataAtTime(cachedAnalysis, fileId, time, stemType) {
    if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
        return null;
    }

    // Get frequencies and timeData from the analysis
    let analysis = cachedAnalysis.find(
        a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
    );

    // FALLBACK: If strict ID match fails, try matching by stemType only
    if (!analysis) {
        analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
    }

    if (!analysis) {
        return null;
    }

    // Extract frequency data (FFT) at the current time
    const fft = analysis.analysisData.fft;
    const frameTimes = analysis.analysisData.frameTimes;
    let frequencies = [];

    if (fft && frameTimes && Array.isArray(fft) && Array.isArray(frameTimes) && frameTimes.length > 0) {
        // Find the frame index closest to the current time
        let frameIndex = 0;
        for (let i = 0; i < frameTimes.length; i++) {
            if (frameTimes[i] <= time) {
                frameIndex = i;
            } else {
                break;
            }
        }

        // Assuming 256 bins per frame (standard for this app)
        const binsPerFrame = 256;
        // If fft is a flat array (compressed), we slice. If it's array of arrays, we access index.
        // The payload usually has a flat Float32Array or array for FFT if compressed.
        // Let's check the structure in the payload.

        // In the payload, fft might be a flat array.
        if (fft.length > frameTimes.length * 10) {
            // Likely flat array
            const startIdx = frameIndex * binsPerFrame;
            const endIdx = Math.min(startIdx + binsPerFrame, fft.length);
            frequencies = fft.slice(startIdx, endIdx);
        } else {
            // Likely array of arrays
            frequencies = fft[frameIndex] || [];
        }
    }

    return {
        frequencies: frequencies.length > 0 ? frequencies : new Array(256).fill(0),
    };
}

// TEST EXECUTION
const overlayLayers = payload.layers.filter(l => l.type === 'overlay');
console.log(`\n🔍 Found ${overlayLayers.length} overlay layers`);

const testTime = 10.0; // Test at 10 seconds

overlayLayers.forEach(layer => {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing Layer: ${layer.name} (${layer.id})`);
    console.log(`Type: ${layer.effectType}`);

    const settings = layer.settings || {};
    const stemId = settings.stemId || settings.stem?.id;
    const stemType = settings.stemType || 'master';

    console.log(`Config: stemId=${stemId}, stemType=${stemType}`);

    if (!stemId) {
        console.log('❌ No stemId in settings');
        return;
    }

    // Test getFeatureDataForOverlay logic
    const analysis = payload.audioAnalysisData.find(a => a.fileMetadataId === stemId);
    if (!analysis) {
        console.log(`❌ Strict ID match failed for ${stemId}`);
    } else {
        console.log(`✅ Strict ID match found`);
    }

    // Test extraction
    console.log(`\nExtracting data at time ${testTime}s...`);
    const data = extractAudioDataAtTime(payload.audioAnalysisData, stemId, testTime, stemType);

    if (data) {
        const nonZero = data.frequencies.filter(v => v > 0).length;
        console.log(`📊 Extraction Result:`);
        console.log(`   - Frequencies count: ${data.frequencies.length}`);
        console.log(`   - Non-zero values: ${nonZero}`);
        console.log(`   - Sample values: ${data.frequencies.slice(0, 5).join(', ')}`);

        if (nonZero === 0) {
            console.warn('⚠️ ALL FREQUENCIES ARE ZERO - This explains the static overlay');
        } else {
            console.log('✅ Data looks valid (non-zero)');
        }
    } else {
        console.error('❌ Extraction returned null');
    }
});
