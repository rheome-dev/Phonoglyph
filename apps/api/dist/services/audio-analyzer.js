"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioAnalyzer = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const wav_1 = require("wav");
const stream_1 = require("stream");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const stream_2 = require("stream");
class AudioAnalyzer {
    constructor() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl) {
            throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required');
        }
        if (!supabaseKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
        }
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    /**
     * Analyze an audio file and cache the results
     */
    async analyzeAndCache(fileMetadataId, userId, stemType, audioBuffer) {
        const startTime = Date.now();
        try {
            logger_1.logger.log(`🎵 Starting audio analysis for ${stemType} stem (file: ${fileMetadataId})`);
            // Convert any audio format to WAV first
            const wavBuffer = await this.convertToWav(audioBuffer);
            // Analyze the audio buffer
            const analysisData = await this.analyzeAudioBuffer(wavBuffer);
            const waveformData = await this.generateWaveformData(wavBuffer);
            const analysisDuration = Date.now() - startTime;
            // Prepare metadata
            const metadata = {
                sampleRate: 44100, // Assuming standard sample rate
                duration: waveformData.duration,
                bufferSize: 512, // The buffer size used for chunking analysis
                featuresExtracted: Object.keys(analysisData),
                analysisDuration
            };
            // Cache the analysis results
            const { data: cachedAnalysis, error } = await this.supabase
                .from('audio_analysis_cache')
                .insert({
                user_id: userId,
                file_metadata_id: fileMetadataId,
                stem_type: stemType,
                analysis_version: '1.0',
                sample_rate: metadata.sampleRate,
                duration: metadata.duration,
                buffer_size: metadata.bufferSize,
                features_extracted: metadata.featuresExtracted,
                analysis_data: analysisData,
                waveform_data: waveformData,
                analysis_duration: analysisDuration
            })
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to cache analysis: ${error.message}`);
            }
            logger_1.logger.log(`✅ Audio analysis completed for ${stemType} stem in ${analysisDuration}ms`);
            return {
                id: cachedAnalysis.id,
                fileMetadataId,
                stemType,
                analysisData,
                waveformData,
                metadata
            };
        }
        catch (error) {
            logger_1.logger.error(`❌ Audio analysis failed for ${stemType} stem:`, error);
            throw error;
        }
    }
    /**
     * Retrieve cached analysis for a file
     */
    async getCachedAnalysis(fileMetadataId, userId, stemType) {
        try {
            // Check if this is a guest user
            const isGuestUser = userId.startsWith('guest_');
            let query = this.supabase
                .from('audio_analysis_cache')
                .select('*')
                .eq('file_metadata_id', fileMetadataId);
            // Only filter by user_id for authenticated users
            if (!isGuestUser) {
                query = query.eq('user_id', userId);
            }
            if (stemType) {
                query = query.eq('stem_type', stemType);
            }
            const { data, error } = await query;
            logger_1.logger.log('getCachedAnalysis query:', { fileMetadataId, userId, stemType });
            logger_1.logger.log('getCachedAnalysis result:', data);
            if (error) {
                throw new Error(`Failed to retrieve cached analysis: ${error.message}`);
            }
            // For guest users, return null since they won't have cached analysis
            if (isGuestUser) {
                return null;
            }
            if (Array.isArray(data) && data.length > 0) {
                const row = data[0];
                return {
                    id: row.id,
                    fileMetadataId: row.file_metadata_id,
                    stemType: row.stem_type,
                    analysisData: row.analysis_data,
                    waveformData: row.waveform_data,
                    metadata: {
                        sampleRate: row.sample_rate,
                        duration: row.duration,
                        bufferSize: row.buffer_size,
                        featuresExtracted: row.features_extracted,
                        analysisDuration: row.analysis_duration
                    }
                };
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to retrieve cached analysis:', error);
            throw error;
        }
    }
    /**
     * Retrieve cached analysis for multiple files
     */
    async getBatchCachedAnalysis(fileMetadataIds, userId, stemType) {
        try {
            // Check if this is a guest user
            const isGuestUser = userId.startsWith('guest_');
            if (isGuestUser)
                return [];
            let query = this.supabase
                .from('audio_analysis_cache')
                .select('*')
                .in('file_metadata_id', fileMetadataIds)
                .eq('user_id', userId);
            if (stemType) {
                query = query.eq('stem_type', stemType);
            }
            const { data, error } = await query;
            if (error) {
                throw new Error(`Failed to retrieve batch cached analysis: ${error.message}`);
            }
            if (!Array.isArray(data) || data.length === 0)
                return [];
            return data.map(row => ({
                id: row.id,
                fileMetadataId: row.file_metadata_id,
                stemType: row.stem_type,
                analysisData: row.analysis_data,
                waveformData: row.waveform_data,
                metadata: {
                    sampleRate: row.sample_rate,
                    duration: row.duration,
                    bufferSize: row.buffer_size,
                    featuresExtracted: row.features_extracted,
                    analysisDuration: row.analysis_duration
                }
            }));
        }
        catch (error) {
            logger_1.logger.error('getBatchCachedAnalysis error:', error);
            throw error;
        }
    }
    /**
     * Convert any audio format to a WAV buffer for analysis
     */
    async convertToWav(inputBuffer) {
        return new Promise((resolve, reject) => {
            const readableStream = new stream_2.PassThrough();
            readableStream.end(inputBuffer);
            const chunks = [];
            const writableStream = new stream_1.Writable({
                write(chunk, encoding, callback) {
                    chunks.push(chunk);
                    callback();
                }
            });
            writableStream.on('finish', () => {
                resolve(Buffer.concat(chunks));
            });
            writableStream.on('error', err => {
                reject(new Error(`FFmpeg conversion error: ${err.message}`));
            });
            (0, fluent_ffmpeg_1.default)(readableStream)
                .toFormat('wav')
                .on('error', (err) => {
                // This error handler is crucial for catching FFmpeg-specific errors
                reject(new Error(`FFmpeg processing error: ${err.message}`));
            })
                .pipe(writableStream);
        });
    }
    /**
     * Analyze an audio buffer and return structured data
     */
    async analyzeAudioBuffer(buffer) {
        try {
            const samples = await this.getAudioSamples(buffer);
            const sampleRate = 44100; // Standard assumption
            const frameSize = 1024; // A common frame size for analysis
            const hopLength = 512; // Overlap for smoother results
            // Expanded feature set for comprehensive analysis
            const features = {
                rms: [],
                spectralCentroid: [],
                spectralRolloff: [],
                spectralFlatness: [],
                spectralSpread: [],
                zcr: [],
                loudness: [],
                energy: [],
                mfcc_0: [],
                mfcc_1: [],
                mfcc_2: [],
                mfcc_3: [],
                mfcc_4: [],
                mfcc_5: [],
                mfcc_6: [],
                mfcc_7: [],
                mfcc_8: [],
                mfcc_9: [],
                mfcc_10: [],
                mfcc_11: [],
                mfcc_12: [],
                perceptualSpread: [],
                perceptualSharpness: [],
                chroma_0: [], chroma_1: [], chroma_2: [], chroma_3: [], chroma_4: [], chroma_5: [],
                chroma_6: [], chroma_7: [], chroma_8: [], chroma_9: [], chroma_10: [], chroma_11: [],
            };
            const featureNames = Object.keys(features);
            // Process audio in frames
            for (let i = 0; i + frameSize <= samples.length; i += hopLength) {
                const frame = samples.subarray(i, i + frameSize);
                for (const featureName of featureNames) {
                    let value;
                    switch (featureName) {
                        case 'rms':
                            value = this.calculateRMS(frame);
                            break;
                        case 'spectralCentroid':
                            value = this.calculateSpectralCentroid(frame);
                            break;
                        case 'spectralRolloff':
                            value = this.calculateSpectralRolloff(frame);
                            break;
                        case 'spectralFlatness':
                            value = this.calculateSpectralFlatness(frame);
                            break;
                        case 'spectralSpread':
                            value = this.calculateSpectralSpread(frame);
                            break;
                        case 'zcr':
                            value = this.calculateZCR(frame);
                            break;
                        case 'loudness':
                            value = this.calculateLoudness(frame);
                            break;
                        case 'energy':
                            value = this.calculateEnergy(frame);
                            break;
                        case 'perceptualSpread':
                            value = this.calculatePerceptualSpread(frame);
                            break;
                        case 'perceptualSharpness':
                            value = this.calculatePerceptualSharpness(frame);
                            break;
                        default:
                            if (featureName.startsWith('mfcc_')) {
                                const parts = featureName.split('_');
                                const mfccIndex = parts[1] ? parseInt(parts[1]) : 0;
                                const mfccValues = this.calculateMFCC(frame);
                                value = mfccValues[mfccIndex] || 0;
                            }
                            else if (featureName.startsWith('chroma_')) {
                                const parts = featureName.split('_');
                                const chromaIndex = parts[1] ? parseInt(parts[1]) : 0;
                                const chromaValues = this.calculateChromaVector(frame);
                                value = chromaValues[chromaIndex] || 0;
                            }
                            else {
                                value = 0;
                            }
                    }
                    const featureArray = features[featureName];
                    if (featureArray) {
                        featureArray.push(value);
                    }
                }
            }
            // Normalize all feature arrays between 0 and 1
            for (const featureName of featureNames) {
                const values = features[featureName];
                if (!values || values.length === 0)
                    continue;
                const maxVal = Math.max(...values);
                const minVal = Math.min(...values);
                const range = maxVal - minVal;
                if (range > 0) {
                    features[featureName] = values.map(v => (v - minVal) / range);
                }
                else if (maxVal > 0) {
                    // If all values are the same but non-zero, normalize to 0.5
                    features[featureName] = values.map(() => 0.5);
                }
            }
            return features;
        }
        catch (error) {
            logger_1.logger.error('Error analyzing audio buffer:', error);
            throw new Error('Failed to analyze audio buffer.');
        }
    }
    async getAudioSamples(buffer) {
        return new Promise((resolve, reject) => {
            const readable = new stream_2.PassThrough();
            readable.end(buffer);
            const chunks = [];
            readable
                .pipe(new wav_1.Reader())
                .on('format', format => {
                if (format.audioFormat !== 1) { // 1 is PCM
                    return reject(new Error('Only WAV files with PCM audio format are supported for direct analysis.'));
                }
            })
                .pipe(new stream_1.Writable({
                write(chunk, encoding, callback) {
                    chunks.push(chunk);
                    callback();
                }
            }))
                .on('finish', () => {
                const pcmData = Buffer.concat(chunks);
                // Assuming 16-bit signed PCM
                const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
                resolve(samples);
            })
                .on('error', reject);
        });
    }
    /**
     * Generate waveform data from an audio buffer
     */
    async generateWaveformData(buffer) {
        return new Promise((resolve, reject) => {
            const reader = new wav_1.Reader();
            const samples = [];
            let format = {};
            reader.on('format', (f) => {
                format = f;
            });
            reader.on('data', (chunk) => {
                if (!format || !format.byteRate || !format.sampleRate)
                    return;
                for (let i = 0; i < chunk.length; i += 2) { // Assuming 16-bit audio
                    if (chunk.length >= i + 2) {
                        samples.push(chunk.readInt16LE(i) / 32768); // Normalize to -1 to 1
                    }
                }
            });
            reader.on('end', () => {
                if (!format.sampleRate || samples.length === 0) {
                    // Fallback for non-WAV files or empty files
                    const duration = 10; // Assume 10s
                    const sampleRate = 44100;
                    const numPoints = 1000;
                    const points = Array.from({ length: numPoints }, () => (Math.random() * 2 - 1) * 0.1);
                    logger_1.logger.warn('⚠️ Could not decode WAV, generating fallback waveform.');
                    return resolve({
                        points: points,
                        sampleRate: sampleRate,
                        duration: duration,
                        markers: [],
                    });
                }
                const downsampleFactor = Math.max(1, Math.floor(samples.length / 2000)); // Max 2000 points
                const downsampled = [];
                for (let i = 0; i < samples.length; i += downsampleFactor) {
                    const sample = samples[i];
                    if (sample !== undefined) {
                        downsampled.push(sample);
                    }
                }
                const duration = samples.length / format.sampleRate;
                resolve({
                    points: downsampled,
                    sampleRate: format.sampleRate,
                    duration: duration,
                    markers: [], // Placeholder for future marker detection
                });
            });
            reader.on('error', (err) => {
                logger_1.logger.error('❌ Error decoding audio file for waveform:', err);
                // Fallback for decoding errors
                const duration = 10;
                const sampleRate = 44100;
                const numPoints = 1000;
                const points = Array.from({ length: numPoints }, () => (Math.random() * 2 - 1) * 0.1);
                resolve({
                    points: points,
                    sampleRate: sampleRate,
                    duration: duration,
                    markers: [],
                });
            });
            // Pipe the buffer into the WAV reader
            const bufferStream = new stream_1.Writable();
            bufferStream._write = (chunk, encoding, next) => {
                reader.write(chunk);
                next();
            };
            bufferStream.end(buffer);
        });
    }
    // Helper methods for audio analysis
    calculateRMS(samples) {
        let sumOfSquares = 0;
        for (let i = 0; i < samples.length; i++) {
            sumOfSquares += ((samples[i] ?? 0) / 32768) ** 2;
        }
        return Math.sqrt(sumOfSquares / samples.length);
    }
    calculateSpectralCentroid(samples) {
        let weightedSum = 0;
        let sum = 0;
        const fftData = this.performFFT(samples);
        for (let i = 0; i < fftData.length; i++) {
            const freq = (i * 44100) / fftData.length;
            const magnitude = Math.abs(fftData[i] ?? 0);
            weightedSum += freq * magnitude;
            sum += magnitude;
        }
        return sum > 0 ? weightedSum / sum : 0;
    }
    calculateSpectralRolloff(samples) {
        const fftData = this.performFFT(samples);
        const totalEnergy = fftData.reduce((sum, val) => sum + Math.abs(val) ** 2, 0);
        const threshold = totalEnergy * 0.85; // 85% energy threshold
        let cumulativeEnergy = 0;
        for (let i = 0; i < fftData.length; i++) {
            cumulativeEnergy += Math.abs(fftData[i] ?? 0) ** 2;
            if (cumulativeEnergy >= threshold) {
                return (i * 44100) / fftData.length;
            }
        }
        return 22050; // Nyquist frequency as fallback
    }
    calculateSpectralFlatness(samples) {
        const fftData = this.performFFT(samples);
        const magnitudes = fftData.map(val => Math.abs(val ?? 0));
        const geometricMean = Math.exp(magnitudes.reduce((sum, mag) => sum + Math.log(Math.max(mag, 1e-10)), 0) / magnitudes.length);
        const arithmeticMean = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
        return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
    }
    calculateSpectralSpread(samples) {
        const fftData = this.performFFT(samples);
        const centroid = this.calculateSpectralCentroid(samples);
        let weightedSum = 0;
        let sum = 0;
        for (let i = 0; i < fftData.length; i++) {
            const freq = (i * 44100) / fftData.length;
            const magnitude = Math.abs(fftData[i] ?? 0);
            const diff = freq - centroid;
            weightedSum += (diff ** 2) * magnitude;
            sum += magnitude;
        }
        return sum > 0 ? Math.sqrt(weightedSum / sum) : 0;
    }
    calculateZCR(samples) {
        let crossings = 0;
        for (let i = 1; i < samples.length; i++) {
            const prev = (samples[i - 1] ?? 0) / 32768;
            const curr = (samples[i] ?? 0) / 32768;
            if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
                crossings++;
            }
        }
        return crossings / samples.length;
    }
    calculateLoudness(samples) {
        // Simplified loudness calculation using A-weighting approximation
        const fftData = this.performFFT(samples);
        let weightedSum = 0;
        for (let i = 0; i < fftData.length; i++) {
            const freq = (i * 44100) / fftData.length;
            const magnitude = Math.abs(fftData[i] ?? 0);
            // Simplified A-weighting curve
            let aWeight = 1;
            if (freq < 1000) {
                aWeight = 0.5 + 0.5 * (freq / 1000);
            }
            else if (freq > 1000) {
                aWeight = 1 - 0.3 * Math.log10(freq / 1000);
            }
            weightedSum += magnitude * aWeight;
        }
        return weightedSum / fftData.length;
    }
    calculateMFCC(samples) {
        // Simplified MFCC calculation
        const fftData = this.performFFT(samples);
        const magnitudes = fftData.map(val => Math.abs(val ?? 0));
        // Simple mel-scale filter bank (13 coefficients)
        const mfcc = [];
        for (let i = 0; i < 13; i++) {
            let sum = 0;
            for (let j = 0; j < magnitudes.length; j++) {
                const freq = (j * 44100) / magnitudes.length;
                const melFreq = 2595 * Math.log10(1 + freq / 700);
                const filterWeight = Math.exp(-((melFreq - i * 200) ** 2) / (2 * 100 ** 2));
                sum += (magnitudes[j] ?? 0) * filterWeight;
            }
            mfcc.push(Math.log(Math.max(sum, 1e-10)));
        }
        return mfcc;
    }
    calculateEnergy(samples) {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += ((samples[i] ?? 0) / 32768) ** 2;
        }
        return sum / samples.length;
    }
    calculatePerceptualSpread(samples) {
        // Simplified perceptual spread using spectral centroid and spread
        const centroid = this.calculateSpectralCentroid(samples);
        const spread = this.calculateSpectralSpread(samples);
        return spread / Math.max(centroid, 1);
    }
    calculatePerceptualSharpness(samples) {
        // Simplified sharpness calculation
        const fftData = this.performFFT(samples);
        let weightedSum = 0;
        let sum = 0;
        for (let i = 0; i < fftData.length; i++) {
            const freq = (i * 44100) / fftData.length;
            const magnitude = Math.abs(fftData[i] ?? 0);
            // Sharpness increases with frequency
            const sharpnessWeight = Math.min(freq / 10000, 1);
            weightedSum += magnitude * sharpnessWeight;
            sum += magnitude;
        }
        return sum > 0 ? weightedSum / sum : 0;
    }
    calculateChromaVector(samples) {
        // Simplified chroma vector (12 semitones)
        const fftData = this.performFFT(samples);
        const chroma = new Array(12).fill(0);
        for (let i = 0; i < fftData.length; i++) {
            const freq = (i * 44100) / fftData.length;
            if (freq > 0) {
                // Convert frequency to semitone
                const semitone = Math.round(12 * Math.log2(freq / 440)) % 12;
                const magnitude = Math.abs(fftData[i] ?? 0);
                chroma[semitone] += magnitude;
            }
        }
        // Normalize
        const maxVal = Math.max(...chroma);
        return maxVal > 0 ? chroma.map(val => val / maxVal) : chroma;
    }
    generateFrequencyData(samples) {
        const fftData = this.performFFT(samples);
        return Array.from(fftData.slice(0, fftData.length / 2)).map(val => Math.abs(val ?? 0));
    }
    generateTimeData(samples) {
        const downsampled = [];
        const factor = Math.floor(samples.length / 1024);
        if (factor < 1)
            return Array.from(samples).map(s => (s ?? 0) / 32768);
        for (let i = 0; i < samples.length; i += factor) {
            const sample = samples[i];
            if (sample !== undefined) {
                downsampled.push(sample / 32768);
            }
        }
        return downsampled;
    }
    calculateBandEnergy(frequencies, minFreq, maxFreq) {
        if (frequencies.length === 0)
            return 0;
        const sampleRate = 44100;
        const binWidth = sampleRate / 2 / frequencies.length;
        const startBin = Math.floor(minFreq / binWidth);
        const endBin = Math.ceil(maxFreq / binWidth);
        let sum = 0;
        for (let i = startBin; i <= endBin && i < frequencies.length; i++) {
            const freq = frequencies[i];
            if (freq !== undefined) {
                sum += freq;
            }
        }
        return sum;
    }
    detectFeatureMarkers(samples) {
        // Simplified placeholder
        return [];
    }
    /**
     * Simplified FFT implementation
     */
    performFFT(samples) {
        const floatSamples = new Float32Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            floatSamples[i] = sample !== undefined ? sample / 32768 : 0;
        }
        return this.simpleFFT(floatSamples);
    }
    simpleFFT(samples) {
        const N = samples.length;
        if (N <= 1)
            return samples;
        // Radix-2 FFT
        if (N % 2 !== 0) {
            // For non-power-of-2, you'd need a more complex FFT or padding.
            // For simplicity, we'll just return magnitudes of 0.
            logger_1.logger.warn(`FFT size is not a power of 2 (${N}), which is not optimal. Padding or a different FFT algorithm should be used.`);
            return new Float32Array(N / 2);
        }
        const even = this.simpleFFT(samples.filter((_, i) => i % 2 === 0));
        const odd = this.simpleFFT(samples.filter((_, i) => i % 2 !== 0));
        const result = new Float32Array(N / 2);
        for (let k = 0; k < N / 2; k++) {
            const t_val = odd[k];
            const e_val = even[k];
            if (t_val !== undefined && e_val !== undefined) {
                const t = t_val * Math.cos(-2 * Math.PI * k / N);
                const e = e_val;
                result[k] = Math.sqrt((e + t) ** 2);
            }
            else {
                result[k] = 0; // Assign a default value if components are undefined
            }
        }
        return result;
    }
}
exports.AudioAnalyzer = AudioAnalyzer;
//# sourceMappingURL=audio-analyzer.js.map