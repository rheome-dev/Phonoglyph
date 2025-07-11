import { createClient } from '@supabase/supabase-js';
import { getFileBuffer, generateS3Key, r2Client, BUCKET_NAME } from './r2-storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface StemProcessingResult {
  success: boolean;
  error?: string;
  stems?: {
    drums: string;
    bass: string;
    vocals: string;
    other: string;
  };
  processingDuration?: number;
}

export class StemProcessor {
  private static readonly SPLEETER_IMAGE = 'deezer/spleeter:3.8';
  private static readonly OUTPUT_DIR = '/tmp/stems';

  /**
   * Process audio file and separate into stems
   */
  static async processStemSeparation(
    fileMetadataId: string,
    userId: string
  ): Promise<StemProcessingResult> {
    try {
      // Get file metadata
      const { data: fileMetadata, error: fetchError } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileMetadataId)
        .single();

      if (fetchError || !fileMetadata) {
        throw new Error('File metadata not found');
      }

      // Create stem separation record
      const { data: stemRecord, error: createError } = await supabase
        .from('stem_separations')
        .insert({
          user_id: userId,
          file_metadata_id: fileMetadataId,
          status: 'processing'
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create stem separation record');
      }

      // Get file from R2
      const fileBuffer = await getFileBuffer(fileMetadata.s3_key);
      
      // Create temporary directory for processing
      const processingId = randomUUID();
      const processingDir = path.join(this.OUTPUT_DIR, processingId);
      fs.mkdirSync(processingDir, { recursive: true });

      // Write file to temp directory
      const inputPath = path.join(processingDir, 'input.wav');
      fs.writeFileSync(inputPath, fileBuffer);

      // Process with Spleeter
      const startTime = Date.now();
      await this.runSpleeter(inputPath, processingDir);
      const processingDuration = Math.round((Date.now() - startTime) / 1000);

      // Upload stems to R2
      const stems = await this.uploadStems(processingDir, userId);

      // Update stem separation record
      const { error: updateError } = await supabase
        .from('stem_separations')
        .update({
          status: 'completed',
          drums_stem_key: stems.drums,
          bass_stem_key: stems.bass,
          vocals_stem_key: stems.vocals,
          other_stem_key: stems.other,
          processing_duration: processingDuration
        })
        .eq('id', stemRecord.id);

      if (updateError) {
        throw new Error('Failed to update stem separation record');
      }

      // Clean up
      fs.rmSync(processingDir, { recursive: true, force: true });

      return {
        success: true,
        stems,
        processingDuration
      };

    } catch (error) {
      console.error('Stem separation failed:', error);

      // Update record with error
      await supabase
        .from('stem_separations')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', fileMetadataId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run Spleeter in Docker container
   */
  private static async runSpleeter(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const spleeter = spawn('docker', [
        'run',
        '--platform=linux/amd64', // For M1/M2 compatibility
        '--rm',
        '-v', `${inputPath}:/input.wav`,
        '-v', `${outputDir}:/output`,
        this.SPLEETER_IMAGE,
        'separate',
        '-p', 'spleeter:4stems',
        '-o', '/output',
        '/input.wav'
      ]);

      let errorOutput = '';

      spleeter.stdout.on('data', (data) => {
        logger.log(`Spleeter output: ${data}`);
      });

      spleeter.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`Spleeter error: ${data}`);
      });

      spleeter.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Spleeter failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Upload stems to R2 storage
   */
  private static async uploadStems(
    processingDir: string,
    userId: string
  ): Promise<{ drums: string; bass: string; vocals: string; other: string }> {
    const stems = {
      drums: await this.uploadStem(processingDir, 'drums.wav', userId),
      bass: await this.uploadStem(processingDir, 'bass.wav', userId),
      vocals: await this.uploadStem(processingDir, 'vocals.wav', userId),
      other: await this.uploadStem(processingDir, 'other.wav', userId)
    };

    return stems;
  }

  /**
   * Upload a single stem file to R2
   */
  private static async uploadStem(
    processingDir: string,
    stemFile: string,
    userId: string
  ): Promise<string> {
    const stemPath = path.join(processingDir, 'input', stemFile);
    const stemBuffer = fs.readFileSync(stemPath);
    const s3Key = generateS3Key(userId, stemFile, 'audio');

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: stemBuffer,
      ContentType: 'audio/wav'
    });

    await r2Client.send(command);
    return s3Key;
  }
} 