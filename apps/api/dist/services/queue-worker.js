"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueWorker = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const stem_processor_1 = require("./stem-processor");
const audio_analysis_processor_1 = require("./audio-analysis-processor");
// Initialize Supabase client
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class QueueWorker {
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
                    .returns();
                if (stemFetchError) {
                    console.error('Error fetching stem jobs:', stemFetchError);
                }
                else if (stemJobs && stemJobs.length > 0) {
                    const job = stemJobs[0];
                    console.log(`📝 Processing stem separation job: ${job.id}`);
                    await stem_processor_1.StemProcessor.processStemSeparation(job.file_metadata_id, job.user_id);
                    console.log(`✅ Completed stem separation job: ${job.id}`);
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
                    .returns();
                if (audioFetchError) {
                    console.error('Error fetching audio analysis jobs:', audioFetchError);
                }
                else if (audioJobs && audioJobs.length > 0) {
                    const job = audioJobs[0];
                    console.log(`📝 Processing audio analysis job: ${job.id}`);
                    await audio_analysis_processor_1.AudioAnalysisProcessor.processJob(job);
                    console.log(`✅ Completed audio analysis job: ${job.id}`);
                    continue; // Process one job per cycle
                }
                // No pending jobs, wait before next poll
                await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
            }
            catch (error) {
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
exports.QueueWorker = QueueWorker;
QueueWorker.isRunning = false;
QueueWorker.POLL_INTERVAL = 5000; // 5 seconds
// Handle process termination
process.on('SIGINT', () => {
    QueueWorker.stop();
    process.exit(0);
});
process.on('SIGTERM', () => {
    QueueWorker.stop();
    process.exit(0);
});
//# sourceMappingURL=queue-worker.js.map