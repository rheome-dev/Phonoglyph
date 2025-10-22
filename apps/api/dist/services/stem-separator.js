"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StemSeparator = exports.StemSeparationConfigSchema = void 0;
const zod_1 = require("zod");
const crypto_1 = require("crypto");
const r2_storage_1 = require("./r2-storage");
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_1 = require("fs");
const logger_1 = require("../lib/logger");
// Validation schema for stem separation config
exports.StemSeparationConfigSchema = zod_1.z.object({
    model: zod_1.z.literal('spleeter'),
    modelVariant: zod_1.z.enum(['2stems', '4stems', '5stems']),
    stems: zod_1.z.object({
        drums: zod_1.z.boolean().optional(),
        bass: zod_1.z.boolean().optional(),
        vocals: zod_1.z.boolean().default(true),
        other: zod_1.z.boolean().default(true),
        piano: zod_1.z.boolean().optional(),
    }),
    quality: zod_1.z.object({
        sampleRate: zod_1.z.enum(['44100', '48000']).default('44100'),
        outputFormat: zod_1.z.enum(['wav', 'mp3']).default('wav'),
        bitrate: zod_1.z.number().optional(),
    }),
});
class StemSeparator {
    /**
     * Create a new stem separation job
     */
    static createJob(config) {
        const job = {
            id: (0, crypto_1.randomUUID)(),
            status: 'queued',
            config,
            progress: 0,
        };
        this.jobs.set(job.id, job);
        return job;
    }
    /**
     * Get job status
     */
    static getJob(jobId) {
        return this.jobs.get(jobId);
    }
    /**
     * Process audio file using Spleeter
     */
    static async processStem(jobId, fileKey, outputDir) {
        const job = this.jobs.get(jobId);
        if (!job)
            throw new Error('Job not found');
        try {
            job.status = 'processing';
            this.jobs.set(jobId, job);
            // Get file buffer from storage
            const buffer = await (0, r2_storage_1.getFileBuffer)(fileKey);
            // Create temporary input file
            const inputPath = (0, path_1.join)(outputDir, 'input.wav');
            const outputPath = (0, path_1.join)(outputDir, 'output');
            // Write buffer to temporary file
            await fs_1.promises.writeFile(inputPath, buffer);
            // Run Spleeter in Docker
            await new Promise((resolve, reject) => {
                const docker = (0, child_process_1.spawn)('docker', [
                    'run',
                    '--rm',
                    '-v', `${outputDir}:/app/input`,
                    '-v', `${outputDir}:/app/output`,
                    'spleeter',
                    'python',
                    'process-audio.py',
                    '--model', job.config.modelVariant,
                    '--output-format', job.config.quality.outputFormat,
                    '--sample-rate', job.config.quality.sampleRate,
                ]);
                docker.stdout.on('data', (data) => {
                    logger_1.logger.log(`Spleeter stdout: ${data}`);
                    // Update progress based on output
                    if (data.toString().includes('Progress')) {
                        const match = data.toString().match(/Progress: (\d+)%/);
                        if (match) {
                            job.progress = parseInt(match[1], 10);
                            this.jobs.set(jobId, job);
                        }
                    }
                });
                docker.stderr.on('data', (data) => {
                    logger_1.logger.error(`Spleeter stderr: ${data}`);
                });
                docker.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error(`Spleeter process exited with code ${code}`));
                    }
                });
            });
            // Update job with results
            job.status = 'completed';
            job.progress = 100;
            job.results = {
                stems: {
                    // Add stem file paths based on config
                    vocals: (0, path_1.join)(outputPath, 'vocals.wav'),
                    other: (0, path_1.join)(outputPath, 'accompaniment.wav'),
                    ...(job.config.stems.drums && { drums: (0, path_1.join)(outputPath, 'drums.wav') }),
                    ...(job.config.stems.bass && { bass: (0, path_1.join)(outputPath, 'bass.wav') }),
                    ...(job.config.stems.piano && { piano: (0, path_1.join)(outputPath, 'piano.wav') }),
                },
            };
            this.jobs.set(jobId, job);
        }
        catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : 'Unknown error';
            this.jobs.set(jobId, job);
            throw error;
        }
    }
}
exports.StemSeparator = StemSeparator;
StemSeparator.jobs = new Map();
//# sourceMappingURL=stem-separator.js.map