import { Command } from 'commander';
import { saveConfig, loadConfig } from '../lib/config';

export const configCommand = new Command('config')
  .description('Configure CLI settings')
  .option('--api-key <key>', 'Set API key for authentication')
  .option('--api-url <url>', 'Set API server URL')
  .option('--show', 'Show current configuration')
  .action((opts) => {
    if (opts.show) {
      const config = loadConfig();
      console.log('Current configuration:');
      console.log(`  API URL: ${config.apiUrl}`);
      console.log(`  API Key: ${config.apiKey ? config.apiKey.substring(0, 12) + '...' : '(not set)'}`);
      return;
    }

    const updates: Record<string, string> = {};

    if (opts.apiKey) {
      updates.apiKey = opts.apiKey;
      console.log('API key saved.');
    }

    if (opts.apiUrl) {
      updates.apiUrl = opts.apiUrl;
      console.log(`API URL set to: ${opts.apiUrl}`);
    }

    if (Object.keys(updates).length === 0) {
      console.log('No options provided. Use --help to see available options.');
      return;
    }

    saveConfig(updates);
  });
