require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCachedAnalysis() {
  try {
    // First, let's see what's in the audio_analysis_cache table
    console.log('🔍 Checking audio_analysis_cache table...');
    const { data: cacheData, error: cacheError } = await supabase
      .from('audio_analysis_cache')
      .select('*')
      .limit(5);

    if (cacheError) {
      console.error('❌ Error fetching cache data:', cacheError);
      return;
    }

    console.log('📊 Found cached analysis entries:', cacheData?.length || 0);
    if (cacheData && cacheData.length > 0) {
      console.log('📋 Sample entry:', {
        id: cacheData[0].id,
        file_metadata_id: cacheData[0].file_metadata_id,
        stem_type: cacheData[0].stem_type,
        user_id: cacheData[0].user_id,
        created_at: cacheData[0].created_at
      });
    }

    // Now let's check what audio files exist
    console.log('\n🔍 Checking file_metadata for audio files...');
    const { data: audioFiles, error: filesError } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('file_type', 'audio')
      .eq('upload_status', 'completed')
      .limit(5);

    if (filesError) {
      console.error('❌ Error fetching audio files:', filesError);
      return;
    }

    console.log('📁 Found audio files:', audioFiles?.length || 0);
    if (audioFiles && audioFiles.length > 0) {
      console.log('📋 Sample audio file:', {
        id: audioFiles[0].id,
        file_name: audioFiles[0].file_name,
        user_id: audioFiles[0].user_id,
        upload_status: audioFiles[0].upload_status
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCachedAnalysis(); 