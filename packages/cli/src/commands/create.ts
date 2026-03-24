import { Command } from 'commander';
import { readFileSync, statSync } from 'fs';
import { basename, extname } from 'path';
import ora from 'ora';
import { getClient } from '../lib/client';
import { poll } from '../lib/poll';

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

export const createCommand = new Command('create')
  .description('Create a project, upload audio, and trigger stem separation')
  .argument('<name>', 'Project name')
  .requiredOption('--audio <path>', 'Path to audio file (mp3, wav, flac)')
  .option('--description <desc>', 'Project description')
  .option('--stems <variant>', 'Stem separation variant (2stems, 4stems, 5stems)', '4stems')
  .option('--no-separate', 'Skip stem separation')
  .action(async (name: string, opts) => {
    const client = getClient();

    // 1. Create project
    const projectSpinner = ora('Creating project...').start();
    let project: any;
    try {
      project = await client.mutate('project.create', {
        name,
        description: opts.description || '',
      });
      projectSpinner.succeed(`Project created: ${project.id}`);
    } catch (err: any) {
      projectSpinner.fail(`Failed to create project: ${err.message}`);
      process.exit(1);
    }

    // 2. Upload audio file
    const uploadSpinner = ora('Uploading audio file...').start();
    try {
      const audioBuffer = readFileSync(opts.audio);
      const base64 = audioBuffer.toString('base64');
      const fileName = basename(opts.audio);
      const ext = extname(opts.audio).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'audio/mpeg';
      const fileSize = statSync(opts.audio).size;

      const uploadResult = await client.mutate('file.uploadFile', {
        fileName,
        fileData: base64,
        fileType: 'audio',
        mimeType,
        fileSize,
        projectId: project.id,
        isMaster: true,
      });

      uploadSpinner.succeed(`Audio uploaded: ${fileName} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

      if (opts.separate === false) {
        console.log(`\nProject ID: ${project.id}`);
        return;
      }

      // 3. Trigger stem separation
      const stemSpinner = ora('Triggering stem separation...').start();
      try {
        const stemJob = await client.mutate('stem.createSeparationJob', {
          fileId: uploadResult.fileId || uploadResult.id,
          config: {
            model: 'spleeter',
            modelVariant: opts.stems,
            stems: {
              drums: true,
              bass: true,
              vocals: true,
              other: true,
            },
            quality: {
              sampleRate: '44100',
              outputFormat: 'wav',
            },
          },
        });
        stemSpinner.succeed('Stem separation started');

        // 4. Poll for completion
        await poll({
          fn: () => client.query('stem.getJobStatus', { jobId: stemJob.jobId }),
          isDone: (status: any) => status.status === 'completed',
          isFailed: (status: any) =>
            status.status === 'failed'
              ? `Stem separation failed: ${status.error || 'Unknown error'}`
              : false,
          getProgress: (status: any) => status.progress || 0,
          intervalMs: 5000,
          message: 'Separating stems',
        });

        console.log(`\nProject ready: ${project.id}`);
        console.log('Stems separated. Use "raybox render" to create a video.');
      } catch (err: any) {
        stemSpinner.fail(`Stem separation failed: ${err.message}`);
        console.log(`\nProject created but stems failed. Project ID: ${project.id}`);
        process.exit(1);
      }
    } catch (err: any) {
      uploadSpinner.fail(`Upload failed: ${err.message}`);
      process.exit(1);
    }
  });
