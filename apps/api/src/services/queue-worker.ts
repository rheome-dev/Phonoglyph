import { createClient } from '@supabase/supabase-js';
import { StemProcessor } from './stem-processor';

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

export class QueueWorker {
  private static isRunning = false;
  private static readonly POLL_INTERVAL = 5000; // 5 seconds

  /**
   * Start the queue worker
   */
  static async start() {
    if (this.isRunning) {
      console.log('Queue worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting queue worker...');

    while (this.isRunning) {
      try {
        // Get next pending job
        const { data: jobs, error: fetchError } = await supabase
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

        if (fetchError) {
          console.error('Error fetching jobs:', fetchError);
          continue;
        }

        if (!jobs || jobs.length === 0) {
          // No pending jobs, wait before next poll
          await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
          continue;
        }

        // We know jobs[0] exists because we checked length > 0
        const job = jobs[0]!;

        // Process job
        console.log(`📝 Processing stem separation job: ${job.id}`);
        await StemProcessor.processStemSeparation(job.file_metadata_id, job.user_id);
        console.log(`✅ Completed stem separation job: ${job.id}`);

      } catch (error) {
        console.error('Queue worker error:', error);
        await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
      }
    }
  }

  /**
   * Stop the queue worker
   */
  static stop() {
    console.log('🛑 Stopping queue worker...');
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