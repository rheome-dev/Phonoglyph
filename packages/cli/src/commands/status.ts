import { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../lib/client';

export const statusCommand = new Command('status')
  .description('Check the status of a render job')
  .requiredOption('--render-id <id>', 'Render ID')
  .requiredOption('--bucket <name>', 'S3 bucket name')
  .requiredOption('--function <name>', 'Lambda function name')
  .action(async (opts) => {
    const client = getClient();

    const spinner = ora('Checking render status...').start();
    try {
      const status: any = await client.mutate('render.getRenderStatus', {
        renderId: opts.renderId,
        bucketName: opts.bucket,
        functionName: opts.function,
      });

      spinner.stop();

      const progress = Math.round((status.overallProgress || 0) * 100);

      if (status.done) {
        console.log('Status:  COMPLETED');
        if (status.outputFile) {
          console.log(`Output:  ${status.outputFile}`);
        }
      } else if (status.fatalErrorEncountered) {
        const errors = status.errors?.map((e: any) => e.message).join(', ') || 'Unknown';
        console.log('Status:  FAILED');
        console.log(`Errors:  ${errors}`);
      } else {
        console.log(`Status:  IN PROGRESS (${progress}%)`);
      }
    } catch (err: any) {
      spinner.fail(`Failed to get status: ${err.message}`);
      process.exit(1);
    }
  });
