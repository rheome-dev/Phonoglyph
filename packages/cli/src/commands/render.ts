import { Command } from 'commander';
import { writeFileSync } from 'fs';
import ora from 'ora';
import { getClient } from '../lib/client';
import { poll } from '../lib/poll';

export const renderCommand = new Command('render')
  .description('Trigger a Lambda render for a project and download the result')
  .requiredOption('--project-id <id>', 'Project ID to render')
  .option('--output <path>', 'Output file path', 'output.mp4')
  .option('--no-download', 'Skip downloading the output file')
  .action(async (opts) => {
    const client = getClient();

    // 1. Get project data
    const projectSpinner = ora('Loading project...').start();
    let project: any;
    try {
      project = await client.query('project.get', { id: opts.projectId });
      projectSpinner.succeed(`Project loaded: ${project.name}`);
    } catch (err: any) {
      projectSpinner.fail(`Failed to load project: ${err.message}`);
      process.exit(1);
    }

    // 2. Get auto-saved state for full visualizer configuration
    let autoSave: any;
    try {
      autoSave = await client.query('autoSave.getCurrentState', { projectId: opts.projectId });
    } catch {
      console.error('No saved visualizer state found for this project.');
      console.error('Open the project in the web UI, configure the visualizer, and save before rendering.');
      process.exit(1);
    }

    if (!autoSave?.data) {
      console.error('No saved visualizer state found. Configure the project in the web UI first.');
      process.exit(1);
    }

    const state = typeof autoSave.data === 'string' ? JSON.parse(autoSave.data) : autoSave.data;

    // 3. Build render payload from auto-saved state
    const renderSpinner = ora('Triggering render...').start();
    try {
      const renderPayload = {
        layers: state.layers || [],
        audioAnalysisData: state.audioAnalysisData || [],
        visualizationSettings: state.visualizationSettings || {},
        masterAudioUrl: state.masterAudioUrl || '',
        mappings: state.mappings || {},
        baseParameterValues: state.baseParameterValues || {},
        featureDecayTimes: state.featureDecayTimes || {},
        featureSensitivities: state.featureSensitivities || {},
        backgroundColor: state.backgroundColor,
        isBackgroundVisible: state.isBackgroundVisible,
      };

      const result = await client.mutate('render.triggerRender', renderPayload);
      renderSpinner.succeed(`Render started: ${result.renderId}`);

      // 4. Poll for completion
      const finalStatus: any = await poll({
        fn: () =>
          client.mutate('render.getRenderStatus', {
            renderId: result.renderId,
            bucketName: result.bucketName,
            functionName: result.functionName,
          }),
        isDone: (status: any) => status.done === true,
        isFailed: (status: any) =>
          status.fatalErrorEncountered
            ? `Render failed: ${status.errors?.map((e: any) => e.message).join(', ') || 'Unknown'}`
            : false,
        getProgress: (status: any) => status.overallProgress || 0,
        intervalMs: 5000,
        maxAttempts: 720, // 1 hour at 5s intervals
        message: 'Rendering video',
      });

      const outputUrl = finalStatus.outputFile;
      if (!outputUrl) {
        console.error('Render completed but no output URL returned.');
        process.exit(1);
      }

      console.log(`\nOutput URL: ${outputUrl}`);

      if (opts.download !== false) {
        // 5. Download the MP4
        const dlSpinner = ora(`Downloading to ${opts.output}...`).start();
        try {
          const response = await fetch(outputUrl);
          if (!response.ok) {
            throw new Error(`Download failed: HTTP ${response.status}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          writeFileSync(opts.output, buffer);
          dlSpinner.succeed(`Downloaded: ${opts.output} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
        } catch (err: any) {
          dlSpinner.fail(`Download failed: ${err.message}`);
          console.log(`You can manually download from: ${outputUrl}`);
        }
      }
    } catch (err: any) {
      renderSpinner.fail(`Render failed: ${err.message}`);
      process.exit(1);
    }
  });
