import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getFileBuffer } from './r2-storage';
import { spawn } from 'child_process';
import { join } from 'path';
import { promises as fs } from 'fs';
import { logger } from '../lib/logger';

// Validation schema for stem separation config
export const StemSeparationConfigSchema = z.object({
  model: z.literal('spleeter'),
  modelVariant: z.enum(['2stems', '4stems', '5stems']),
  stems: z.object({
    drums: z.boolean().optional(),
    bass: z.boolean().optional(),
    vocals: z.boolean().default(true),
    other: z.boolean().default(true),
    piano: z.boolean().optional(),
  }),
  quality: z.object({
    sampleRate: z.enum(['44100', '48000']).default('44100'),
    outputFormat: z.enum(['wav', 'mp3']).default('wav'),
    bitrate: z.number().optional(),
  }),
});

export type StemSeparationConfig = z.infer<typeof StemSeparationConfigSchema>;

export interface StemSeparationJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  config: StemSeparationConfig;
  progress: number;
  estimatedTimeRemaining?: number;
  results?: {
    stems: Record<string, string>; // URLs to separated stems
  };
  error?: string;
}

export class StemSeparator {
  private static jobs = new Map<string, StemSeparationJob>();

  /**
   * Create a new stem separation job
   */
  static createJob(config: StemSeparationConfig): StemSeparationJob {
    const job: StemSeparationJob = {
      id: randomUUID(),
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
  static getJob(jobId: string): StemSeparationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Process audio file using Spleeter
   */
  static async processStem(
    jobId: string,
    fileKey: string,
    outputDir: string
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    try {
      job.status = 'processing';
      this.jobs.set(jobId, job);

      // Get file buffer from storage
      const buffer = await getFileBuffer(fileKey);

      // Create temporary input file
      const inputPath = join(outputDir, 'input.wav');
      const outputPath = join(outputDir, 'output');

      // Write buffer to temporary file
      await fs.writeFile(inputPath, buffer);

      // Run Spleeter in Docker
      await new Promise<void>((resolve, reject) => {
        const docker = spawn('docker', [
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
          logger.log(`Spleeter stdout: ${data}`);
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
          logger.error(`Spleeter stderr: ${data}`);
        });

        docker.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
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
          vocals: join(outputPath, 'vocals.wav'),
          other: join(outputPath, 'accompaniment.wav'),
          ...(job.config.stems.drums && { drums: join(outputPath, 'drums.wav') }),
          ...(job.config.stems.bass && { bass: join(outputPath, 'bass.wav') }),
          ...(job.config.stems.piano && { piano: join(outputPath, 'piano.wav') }),
        },
      };

      this.jobs.set(jobId, job);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.jobs.set(jobId, job);
      throw error;
    }
  }
} 