const fs = require('fs');
const path = require('path');

const payloadPath = path.join(__dirname, 'apps/web/src/remotion/debug-payload.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

console.log('📦 Analyzing Fresh Payload Structure...\n');

payload.audioAnalysisData.forEach((analysis, idx) => {
    console.log(`Analysis ${idx + 1}: ${analysis.stemType} (${analysis.fileMetadataId})`);

    const fft = analysis.analysisData.fft || [];
    const frameTimes = analysis.analysisData.frameTimes || [];
    const rms = analysis.analysisData.rms || [];

    console.log(`   - Frame Times: ${frameTimes.length} frames`);
    console.log(`   - RMS Values: ${rms.length} frames`);
    console.log(`   - FFT Array Length: ${fft.length} values`);

    if (frameTimes.length > 0 && fft.length > 0) {
        const expectedBinsPerFrame = Math.floor(fft.length / frameTimes.length);
        console.log(`   - Expected Bins Per Frame: ${expectedBinsPerFrame}`);

        if (expectedBinsPerFrame > 0) {
            console.log(`   ✅ This looks like flattened FFT data!`);
            // Check if there's actual variation in the data
            const nonZeroFFT = fft.filter(v => Math.abs(v) > 0.0001).length;
            console.log(`   - Non-zero FFT values: ${nonZeroFFT} (${((nonZeroFFT / fft.length) * 100).toFixed(1)}%)`);
        } else {
            console.log(`   ❌ FFT data appears to be empty or incorrectly formatted`);
        }
    } else if (fft.length === 0) {
        console.log(`   ❌ FFT array is completely empty - analysis was done with OLD worker`);
    } else {
        console.log(`   ⚠️ Missing frameTimes - cannot verify FFT structure`);
    }
    console.log('');
});

console.log('\n📋 DIAGNOSIS:');
const allEmpty = payload.audioAnalysisData.every(a => (a.analysisData.fft || []).length === 0);
if (allEmpty) {
    console.log('❌ All FFT arrays are EMPTY');
    console.log('   This means the audio was analyzed BEFORE the worker fix was deployed.');
    console.log('\n💡 TO FIX:');
    console.log('   1. Go to the deployed app');
    console.log('   2. Delete this project OR clear its cached analysis');
    console.log('   3. Re-upload the audio file');
    console.log('   4. Wait for analysis to complete (check browser console for worker logs)');
    console.log('   5. Export again to get a fresh payload');
} else {
    console.log('✅ FFT data detected! Ready for testing.');
}
