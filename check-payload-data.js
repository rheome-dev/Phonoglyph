
const fs = require('fs');
const path = require('path');

const payloadPath = path.join(__dirname, 'apps/web/src/remotion/debug-payload.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

console.log('📦 Checking Payload Data Quality...');

let totalNonZero = 0;
let totalValues = 0;

payload.audioAnalysisData.forEach((analysis, idx) => {
    console.log(`\nAnalysis ${idx + 1}: ${analysis.stemType} (${analysis.fileMetadataId})`);

    const fft = analysis.analysisData.fft || [];
    const rms = analysis.analysisData.rms || [];

    const nonZeroFFT = fft.filter(v => v > 0.0001).length;
    const nonZeroRMS = rms.filter(v => v > 0.0001).length;

    console.log(`   - FFT Values: ${fft.length} (Non-zero: ${nonZeroFFT})`);
    console.log(`   - RMS Values: ${rms.length} (Non-zero: ${nonZeroRMS})`);

    totalNonZero += nonZeroFFT + nonZeroRMS;
    totalValues += fft.length + rms.length;
});

if (totalNonZero === 0) {
    console.log('\n❌ CRITICAL: Payload contains NO audio data (all zeros).');
    console.log('   This explains why overlays are static.');
} else {
    console.log(`\n✅ Found ${totalNonZero} non-zero values.`);
}
