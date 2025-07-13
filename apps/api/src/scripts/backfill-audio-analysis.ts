import { createSupabaseServerClient } from '../lib/supabase';
import dotenv from 'dotenv';

dotenv.config();

async function backfillAudioAnalysis() {
  const supabase = createSupabaseServerClient();
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
      const { AudioAnalyzer } = await import('../services/audio-analyzer');
      const audioAnalyzer = new AudioAnalyzer();
      await audioAnalyzer.analyzeAndCache(
        file.id,
        file.user_id,
        'master', // or use file.file_name or another label if needed
        nodeBuffer
      );
      analyzedCount++;
      console.log(`✅ Backfilled analysis for file ${file.file_name} (${file.id})`);
    } catch (err) {
      console.error(`❌ Failed to analyze file ${file.file_name} (${file.id}):`, err);
    }
  }
  console.log(`Backfill complete. Analyzed ${analyzedCount} files.`);
}

backfillAudioAnalysis().catch((err) => {
  console.error('Backfill script failed:', err);
  process.exit(1);
}); 