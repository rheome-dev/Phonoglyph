import { createClient } from '@supabase/supabase-js';
import { StemProcessor } from './stem-processor';
import { AudioAnalysisProcessor } from './audio-analysis-processor';
import { logger } from '../lib/logger';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StemSeparationJob {
  id: string;
  user_id: string;
  file_metadata_id: string;
  status: string;
}

interface AudioAnalysisJob {
  id: string;
  user_id: string;
  file_metadata_id: string;
  status: string;
}

export class QueueWorker {
  private static isRunning = false;
  private static readonly POLL_INTERVAL = 5000; // 5 seconds

  /**
   * Start the queue worker
   */
  static async start() {
    if (this.isRunning) {
      logger.log('Queue worker is already running');
      return;
    }

    this.isRunning = true;
    logger.log('🚀 Starting queue worker...');

    while (this.isRunning) {
      try {
        // Get next pending stem separation job
        const { data: stemJobs, error: stemFetchError } = await supabase
          .from('stem_separations')
          .select(`
            id,
            user_id,
            file_metadata_id,
            status
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1)
          .returns<StemSeparationJob[]>();

        if (stemFetchError) {
          logger.error('Error fetching stem jobs:', stemFetchError);
        } else if (stemJobs && stemJobs.length > 0) {
          const job = stemJobs[0]!;
          logger.log(`📝 Processing stem separation job: ${job.id}`);
          await StemProcessor.processStemSeparation(job.file_metadata_id, job.user_id);
          logger.log(`✅ Completed stem separation job: ${job.id}`);
          continue; // Process one job per cycle
        }

        // Get next pending audio analysis job
        const { data: audioJobs, error: audioFetchError } = await supabase
          .from('audio_analysis_jobs')
          .select(`
            id,
            user_id,
            file_metadata_id,
            status
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1)
          .returns<AudioAnalysisJob[]>();

        if (audioFetchError) {
          logger.error('Error fetching audio analysis jobs:', audioFetchError);
        } else if (audioJobs && audioJobs.length > 0) {
          const job = audioJobs[0]!;
          logger.log(`📝 Processing audio analysis job: ${job.id}`);
          await AudioAnalysisProcessor.processJob(job);
          logger.log(`✅ Completed audio analysis job: ${job.id}`);
          continue; // Process one job per cycle
        }
        
        // No pending jobs, wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));

      } catch (error) {
        logger.error('Queue worker error:', error);
        await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
      }
    }
  }

  /**
   * Stop the queue worker
   */
  static stop() {
    logger.log('🛑 Stopping queue worker...');
    this.isRunning = false;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  QueueWorker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  QueueWorker.stop();
  process.exit(0);
}); 