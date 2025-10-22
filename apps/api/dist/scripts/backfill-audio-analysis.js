"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../lib/supabase");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function backfillAudioAnalysis() {
    const supabase = (0, supabase_1.createSupabaseServerClient)();
    // Remove this line:
    // const audioAnalyzer = new AudioAnalyzer();
    // Find all audio files with upload_status 'completed' and no cached analysis
    const { data: files, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('file_type', 'audio')
        .eq('upload_status', 'completed');
    if (error) {
        console.error('Failed to fetch audio files:', error);
        process.exit(1);
    }
    let analyzedCount = 0;
    for (const file of files) {
        // Check if analysis already exists
        const { data: existing, error: analysisError } = await supabase
            .from('audio_analysis_cache')
            .select('id')
            .eq('file_metadata_id', file.id)
            .maybeSingle();
        if (analysisError) {
            console.error(`Failed to check analysis for file ${file.id}:`, analysisError);
            continue;
        }
        if (existing) {
            console.log(`Analysis already exists for file ${file.file_name} (${file.id}), skipping.`);
            continue;
        }
        // Download file buffer from storage
        try {
            const { data: fileBuffer, error: bufferError } = await supabase.storage
                .from(file.s3_bucket)
                .download(file.s3_key);
            if (bufferError || !fileBuffer) {
                console.error(`Failed to download buffer for file ${file.file_name}:`, bufferError);
                continue;
            }
            const arrayBuffer = await fileBuffer.arrayBuffer();
            const nodeBuffer = Buffer.from(arrayBuffer);
            // Analyze and cache the file
            const { AudioAnalyzer } = await Promise.resolve().then(() => __importStar(require('../services/audio-analyzer')));
            const audioAnalyzer = new AudioAnalyzer();
            await audioAnalyzer.analyzeAndCache(file.id, file.user_id, 'master', // or use file.file_name or another label if needed
            nodeBuffer);
            analyzedCount++;
            console.log(`✅ Backfilled analysis for file ${file.file_name} (${file.id})`);
        }
        catch (err) {
            console.error(`❌ Failed to analyze file ${file.file_name} (${file.id}):`, err);
        }
    }
    console.log(`Backfill complete. Analyzed ${analyzedCount} files.`);
}
backfillAudioAnalysis().catch((err) => {
    console.error('Backfill script failed:', err);
    process.exit(1);
});
//# sourceMappingURL=backfill-audio-analysis.js.map