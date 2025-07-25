import { createClient } from '@supabase/supabase-js';
import { AudioAnalyzer } from './audio-analyzer';
import { getFileBuffer } from './r2-storage';
import { buffer } from 'stream/consumers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class AudioAnalysisProcessor {
  static async processJob(job: { id: string, user_id: string, file_metadata_id: string }): Promise<void> {
    await this.updateJobStatus(job.id, 'processing');

    try {
      const { data: fileMetadata, error: fileError } = await supabase
        .from('file_metadata')
        .select('s3_key, file_name, id')
        .eq('id', job.file_metadata_id)
        .single();

      if (fileError || !fileMetadata) {
        throw new Error(`Failed to fetch file metadata for job ${job.id}: ${fileError?.message}`);
      }
      
      const fileBuffer = await getFileBuffer(fileMetadata.s3_key);
      const audioAnalyzer = new AudioAnalyzer();
      const stemType = fileMetadata.file_name.replace(/\.[^/.]+$/, '');

      await audioAnalyzer.analyzeAndCache(
        fileMetadata.id,
        job.user_id,
        stemType,
        fileBuffer
      );

      await this.updateJobStatus(job.id, 'completed');
    } catch (error: any) {
      console.error(`Error processing audio analysis job ${job.id}:`, error);
      await this.updateJobStatus(job.id, 'failed', error.message);
    }
  }

  private static async updateJobStatus(jobId: string, status: 'processing' | 'completed' | 'failed', error?: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('audio_analysis_jobs')
      .update({ status, error: error, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (updateError) {
      console.error(`Failed to update status for audio analysis job ${jobId}:`, updateError);
    }
  }
} 