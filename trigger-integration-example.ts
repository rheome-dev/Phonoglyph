// Example Trigger.dev integration for Phonoglyph stem separation
import { TriggerClient, eventTrigger } from "@trigger.dev/sdk";
import { z } from "zod";

const client = new TriggerClient({
  id: "phonoglyph-stem-separation",
  apiKey: process.env.TRIGGER_API_KEY!,
});

// Define the job input schema
const StemSeparationInput = z.object({
  fileId: z.string(),
  userId: z.string(),
  s3Key: z.string(),
  config: z.object({
    modelVariant: z.enum(['2stems', '4stems', '5stems']),
    outputFormat: z.enum(['wav', 'mp3']),
    sampleRate: z.enum(['44100', '48000']),
  }),
});

// Trigger.dev job for stem separation
client.defineJob({
  id: "stem-separation",
  name: "Audio Stem Separation with Spleeter",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "stem.separation.requested",
    schema: StemSeparationInput,
  }),
  run: async (payload, io, ctx) => {
    const { fileId, userId, s3Key, config } = payload;

    // Step 1: Update job status to processing
    await io.runTask("update-status-processing", async () => {
      await updateJobStatus(fileId, "processing", 0);
    });

    // Step 2: Download file from R2
    const audioBuffer = await io.runTask("download-audio", async () => {
      return await downloadFromR2(s3Key);
    });

    // Step 3: Run Spleeter separation (using Python subprocess or API)
    const separatedStems = await io.runTask("separate-stems", async () => {
      // This would run Spleeter in a containerized environment
      // Trigger.dev provides isolated execution environments
      return await runSpleeterSeparation(audioBuffer, config);
    }, {
      // Configure timeout for long-running audio processing
      timeout: "30m",
      retry: {
        attempts: 2,
        delay: "5s",
      },
    });

    // Step 4: Upload stems back to R2
    const uploadedStems = await io.runTask("upload-stems", async () => {
      const uploads = [];
      for (const [stemType, stemBuffer] of Object.entries(separatedStems)) {
        const stemKey = generateStemKey(userId, fileId, stemType, config.outputFormat);
        await uploadToR2(stemKey, stemBuffer);
        uploads.push({ type: stemType, key: stemKey });
      }
      return uploads;
    });

    // Step 5: Create file metadata records
    await io.runTask("create-metadata", async () => {
      for (const stem of uploadedStems) {
        await createStemFileMetadata(userId, fileId, stem);
      }
    });

    // Step 6: Trigger audio analysis for each stem
    await io.runTask("trigger-analysis", async () => {
      for (const stem of uploadedStems) {
        await client.sendEvent({
          name: "audio.analysis.requested",
          payload: {
            fileId: stem.fileId,
            userId,
            stemType: stem.type,
          },
        });
      }
    });

    // Step 7: Update job status to completed
    await io.runTask("update-status-completed", async () => {
      await updateJobStatus(fileId, "completed", 100);
    });

    return {
      success: true,
      stems: uploadedStems,
      processingTime: ctx.run.duration,
    };
  },
});

// Audio analysis job (separate from stem separation)
client.defineJob({
  id: "audio-analysis",
  name: "Audio Analysis and Caching",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "audio.analysis.requested",
    schema: z.object({
      fileId: z.string(),
      userId: z.string(),
      stemType: z.string(),
    }),
  }),
  run: async (payload, io, ctx) => {
    // Run audio analysis using your existing AudioAnalyzer
    const analysisResult = await io.runTask("analyze-audio", async () => {
      const audioBuffer = await downloadFromR2(payload.fileId);
      return await analyzeAudioFeatures(audioBuffer, payload.stemType);
    });

    await io.runTask("cache-analysis", async () => {
      await cacheAnalysisResults(payload.fileId, payload.userId, analysisResult);
    });

    return analysisResult;
  },
});
