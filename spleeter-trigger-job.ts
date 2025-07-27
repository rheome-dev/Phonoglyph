// src/trigger/jobs/spleeter-separation.ts
import { client } from "../client";
import { eventTrigger } from "@trigger.dev/sdk";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

const StemSeparationPayload = z.object({
  fileId: z.string(),
  userId: z.string(),
  s3Key: z.string(),
  config: z.object({
    modelVariant: z.enum(['2stems', '4stems', '5stems']),
    outputFormat: z.enum(['wav', 'mp3']),
    sampleRate: z.enum(['44100', '48000']),
  }),
});

client.defineJob({
  id: "spleeter-stem-separation",
  name: "Spleeter Audio Stem Separation",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "stem.separation.requested",
    schema: StemSeparationPayload,
  }),
  run: async (payload, io, ctx) => {
    const { fileId, userId, s3Key, config } = payload;
    
    // Create temporary processing directory
    const processingDir = join(tmpdir(), `spleeter-${ctx.run.id}`);
    await io.runTask("create-temp-dir", async () => {
      await mkdir(processingDir, { recursive: true });
    });

    // Download audio file from R2
    const audioBuffer = await io.runTask("download-audio", async () => {
      const response = await fetch(`${process.env.R2_PUBLIC_URL}/${s3Key}`);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    });

    // Write audio to temp file
    const inputPath = join(processingDir, "input.wav");
    await io.runTask("write-input-file", async () => {
      await writeFile(inputPath, audioBuffer);
    });

    // Install Spleeter if not available (in Trigger.dev environment)
    await io.runTask("install-spleeter", async () => {
      try {
        await execAsync("spleeter --version");
      } catch {
        // Install Spleeter
        await execAsync("pip install spleeter==2.3.0");
      }
    });

    // Run Spleeter separation
    const outputDir = join(processingDir, "output");
    await io.runTask("run-spleeter", async () => {
      const command = [
        "spleeter",
        "separate",
        `-p spleeter:${config.modelVariant}-16kHz`,
        `-o ${outputDir}`,
        inputPath
      ].join(" ");

      const { stdout, stderr } = await execAsync(command, {
        timeout: 30 * 60 * 1000, // 30 minutes timeout
      });

      if (stderr && !stderr.includes("WARNING")) {
        throw new Error(`Spleeter error: ${stderr}`);
      }

      return { stdout, stderr };
    }, {
      timeout: "35m", // Trigger.dev timeout
      retry: {
        attempts: 2,
        delay: "30s",
      },
    });

    // Read separated stems
    const stems = await io.runTask("read-stems", async () => {
      const stemFiles = [];
      const stemTypes = config.modelVariant === '2stems' 
        ? ['vocals', 'accompaniment']
        : config.modelVariant === '4stems'
        ? ['vocals', 'drums', 'bass', 'other']
        : ['vocals', 'drums', 'bass', 'piano', 'other'];

      for (const stemType of stemTypes) {
        const stemPath = join(outputDir, "input", `${stemType}.wav`);
        try {
          const stemBuffer = await readFile(stemPath);
          stemFiles.push({
            type: stemType,
            buffer: stemBuffer,
            size: stemBuffer.length,
          });
        } catch (error) {
          console.warn(`Stem ${stemType} not found, skipping`);
        }
      }

      return stemFiles;
    });

    // Upload stems to R2
    const uploadedStems = await io.runTask("upload-stems", async () => {
      const uploads = [];
      
      for (const stem of stems) {
        const stemKey = `stems/${userId}/${fileId}/${stem.type}.${config.outputFormat}`;
        
        // Get presigned upload URL
        const uploadResponse = await fetch(`${process.env.API_URL}/api/storage/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: stemKey,
            contentType: `audio/${config.outputFormat}`,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to get upload URL for ${stem.type}`);
        }

        const { uploadUrl } = await uploadResponse.json();

        // Upload stem to R2
        const uploadResult = await fetch(uploadUrl, {
          method: 'PUT',
          body: stem.buffer,
          headers: {
            'Content-Type': `audio/${config.outputFormat}`,
          },
        });

        if (!uploadResult.ok) {
          throw new Error(`Failed to upload ${stem.type} stem`);
        }

        uploads.push({
          type: stem.type,
          key: stemKey,
          size: stem.size,
        });
      }

      return uploads;
    });

    // Update database with results
    await io.runTask("update-database", async () => {
      // Update job status
      await fetch(`${process.env.API_URL}/api/internal/update-job-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: fileId,
          status: 'completed',
          results: uploadedStems,
        }),
      });

      // Create file metadata for each stem
      for (const stem of uploadedStems) {
        await fetch(`${process.env.API_URL}/api/internal/create-stem-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            originalFileId: fileId,
            stemType: stem.type,
            s3Key: stem.key,
            fileSize: stem.size,
            outputFormat: config.outputFormat,
          }),
        });
      }
    });

    // Trigger audio analysis for each stem
    await io.runTask("trigger-analysis", async () => {
      for (const stem of uploadedStems) {
        await client.sendEvent({
          name: "audio.analysis.requested",
          payload: {
            stemKey: stem.key,
            stemType: stem.type,
            userId,
            originalFileId: fileId,
          },
        });
      }
    });

    // Cleanup temp directory
    await io.runTask("cleanup", async () => {
      await execAsync(`rm -rf ${processingDir}`);
    });

    return {
      success: true,
      jobId: fileId,
      stems: uploadedStems,
      processingTime: ctx.run.duration,
      config,
    };
  },
});
