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

    // 2. Fetch project files (audio, images, etc.)
    const filesSpinner = ora('Fetching project files...').start();
    let projectFiles: any;
    try {
      projectFiles = await client.query('file.getUserFiles', {
        projectId: opts.projectId,
        limit: 100,
      });
      filesSpinner.succeed(`Found ${projectFiles.files?.length || 0} files`);
    } catch (err: any) {
      filesSpinner.fail(`Failed to fetch files: ${err.message}`);
      process.exit(1);
    }

    const files = projectFiles.files || [];

    // 3. Get signed download URLs for all files
    const urlSpinner = ora('Generating download URLs...').start();
    let stemUrlMap: Record<string, string> = {};
    try {
      const fileIds = files.map((f: any) => f.id);
      if (fileIds.length > 0) {
        const urlMap: Record<string, any> = await client.mutate('file.getDownloadUrls', {
          fileIds,
        });
        // Build URL map: id -> downloadUrl
        for (const [id, urlData] of Object.entries(urlMap)) {
          stemUrlMap[id] = (urlData as any).downloadUrl;
        }
      }
      urlSpinner.succeed(`Generated ${Object.keys(stemUrlMap).length} download URLs`);
    } catch (err: any) {
      urlSpinner.fail(`Failed to generate download URLs: ${err.message}`);
      process.exit(1);
    }

    // 4. Get cached audio analysis for all audio files
    const analysisSpinner = ora('Fetching audio analysis...').start();
    let cachedAnalysis: any[] = [];
    try {
      const audioFileIds = files
        .filter((f: any) => f.file_type === 'audio' || f.stem_type)
        .map((f: any) => f.id);

      if (audioFileIds.length > 0) {
        cachedAnalysis = await client.query('stem.getCachedAnalysis', {
          fileIds: audioFileIds,
        });
        cachedAnalysis = cachedAnalysis || [];
      }
      analysisSpinner.succeed(`Loaded ${cachedAnalysis.length} analysis entries`);
    } catch (err: any) {
      // Analysis fetch failed - continue with empty (render will proceed without audio-reactive data)
      analysisSpinner.warn(`Could not load analysis: ${err.message} (continuing without audio reactivity)`);
      cachedAnalysis = [];
    }

    // 5. Get auto-saved visualizer state
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

    // 6. Build render payload — mirrors getProjectExportPayload() from the web UI
    const renderSpinner = ora('Triggering render...').start();
    try {
      // Extract from auto-save's nested structure
      const timelineState = state.timelineState || {};
      const visualizationParams = state.visualizationParams || {};
      const stemMappings = state.stemMappings || {};
      const projectSettings = state.projectSettings || {};
      const effectSettings = state.effectSettings || {};

      // Resolve aspect ratio (same logic as UI)
      const resolvedAspectRatio = visualizationParams.aspectRatio || '9:16';

      // Find master audio URL — same logic as UI
      let masterAudioUrl = '';
      const masterFile = files.find((f: any) => f.is_master === true);
      if (masterFile?.id) {
        masterAudioUrl = stemUrlMap[masterFile.id] || '';
      }
      if (!masterAudioUrl && files.length > 0) {
        const firstAudioFile = files.find(
          (f: any) => f.file_type === 'audio' || f.downloadUrl
        );
        if (firstAudioFile?.id) {
          masterAudioUrl = stemUrlMap[firstAudioFile.id] || firstAudioFile.downloadUrl || '';
        }
      }

      // Hydrate image slideshow layers with fresh URLs
      const layers = (timelineState.layers || []).map((layer: any) => {
        if (layer.effectType === 'imageSlideshow' && layer.settings) {
          const imageIds = layer.settings.imageIds as string[];
          if (Array.isArray(imageIds) && imageIds.length > 0) {
            const currentImages = layer.settings.images as string[] | undefined;
            const hasOldUrls = currentImages?.some((url: string) =>
              url.includes('cloudflarestorage') ||
              url.includes('phonoglyph-uploads') ||
              url.includes('X-Amz-Signature')
            );
            const freshImages = imageIds
              .map((id: string) => stemUrlMap[id])
              .filter(Boolean);
            if (freshImages.length > 0 || hasOldUrls) {
              layer.settings.images = freshImages.length > 0 ? freshImages : currentImages;
            }
          }
        }
        return layer;
      });

      const renderPayload = {
        layers,
        audioAnalysisData: cachedAnalysis,
        visualizationSettings: {
          aspectRatio: resolvedAspectRatio,
          ...(visualizationParams.colorScheme ? { colorScheme: visualizationParams.colorScheme } : {}),
        },
        masterAudioUrl,
        mappings: stemMappings,
        baseParameterValues: visualizationParams.baseParameterValues || {},
        featureDecayTimes: visualizationParams.featureDecayTimes || {},
        featureSensitivities: visualizationParams.featureSensitivities || {},
        backgroundColor: projectSettings.backgroundColor,
        isBackgroundVisible: projectSettings.isBackgroundVisible,
      };

      console.log(`  Layers: ${layers.length}`);
      console.log(`  Audio entries: ${cachedAnalysis.length}`);
      console.log(`  Master audio: ${masterAudioUrl ? 'found' : 'NOT FOUND'}`);
      console.log(`  Aspect ratio: ${resolvedAspectRatio}`);

      const result = await client.mutate('render.triggerRender', renderPayload);
      renderSpinner.succeed(`Render started: ${result.renderId}`);

      // 7. Poll for completion
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
        // 8. Download the MP4
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
