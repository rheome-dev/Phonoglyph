"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioAnalysisProcessor = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const audio_analyzer_1 = require("./audio-analyzer");
const r2_storage_1 = require("./r2-storage");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class AudioAnalysisProcessor {
    static async processJob(job) {
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
            const fileBuffer = await (0, r2_storage_1.getFileBuffer)(fileMetadata.s3_key);
            const audioAnalyzer = new audio_analyzer_1.AudioAnalyzer();
            const stemType = fileMetadata.file_name.replace(/\.[^/.]+$/, '');
            await audioAnalyzer.analyzeAndCache(fileMetadata.id, job.user_id, stemType, fileBuffer);
            await this.updateJobStatus(job.id, 'completed');
        }
        catch (error) {
            console.error(`Error processing audio analysis job ${job.id}:`, error);
            await this.updateJobStatus(job.id, 'failed', error.message);
        }
    }
    static async updateJobStatus(jobId, status, error) {
        const { error: updateError } = await supabase
            .from('audio_analysis_jobs')
            .update({ status, error: error, updated_at: new Date().toISOString() })
            .eq('id', jobId);
        if (updateError) {
            console.error(`Failed to update status for audio analysis job ${jobId}:`, updateError);
        }
    }
}
exports.AudioAnalysisProcessor = AudioAnalysisProcessor;
//# sourceMappingURL=audio-analysis-processor.js.map