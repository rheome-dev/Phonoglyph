import runpod from 'runpod';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

config(); // Load environment variables

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
if (!RUNPOD_API_KEY) {
  throw new Error('RUNPOD_API_KEY environment variable is required');
}

runpod.api_key = RUNPOD_API_KEY;

interface SeparationResult {
  model: 'spleeter' | 'demucs';
  duration: number; // processing time in seconds
  outputPaths: {
    vocals?: string;
    drums?: string;
    bass?: string;
    other?: string;
  };
}

async function testStemSeparation(audioPath: string): Promise<void> {
  console.log('Starting stem separation test...');
  console.time('Total test duration');

  // Test configurations
  const configs = [
    {
      model: 'spleeter',
      dockerImage: 'deezer/spleeter:3.0',
      gpuCount: 1,
    },
    {
      model: 'demucs',
      dockerImage: 'hdemucs/demucs:latest',
      gpuCount: 1,
    },
  ];

  for (const config of configs) {
    console.log(`\nTesting ${config.model}...`);
    console.time(`${config.model} processing time`);

    try {
      // Create RunPod endpoint
      const endpoint = runpod.Endpoint({
        name: `test-${config.model}`,
        modelId: config.dockerImage,
        gpuCount: config.gpuCount,
        idleTimeout: 5, // Shutdown after 5 minutes idle
      });

      // Upload audio file
      const fileName = path.basename(audioPath);
      const uploadUrl = await endpoint.getUploadUrl(fileName);
      await endpoint.uploadFile(uploadUrl, audioPath);

      // Run separation
      const result = await endpoint.runSync({
        input: {
          audio: fileName,
          model: config.model,
        },
      });

      console.timeEnd(`${config.model} processing time`);
      console.log(`${config.model} results:`, result);

      // Download results
      const outputDir = path.join(__dirname, '..', 'test-output', config.model);
      fs.mkdirSync(outputDir, { recursive: true });

      for (const [stem, url] of Object.entries(result.output.stems)) {
        const outputPath = path.join(outputDir, `${stem}.wav`);
        await endpoint.downloadFile(url as string, outputPath);
        console.log(`Downloaded ${stem} stem to ${outputPath}`);
      }

      // Cleanup
      await endpoint.delete();

    } catch (error) {
      console.error(`Error testing ${config.model}:`, error);
    }
  }

  console.timeEnd('Total test duration');
}

// Example usage
if (require.main === module) {
  const testFile = process.argv[2];
  if (!testFile) {
    console.error('Please provide a test audio file path');
    process.exit(1);
  }

  testStemSeparation(testFile)
    .catch(console.error);
} 