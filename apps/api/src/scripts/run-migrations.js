#!/usr/bin/env node
import { logger } from '../lib/logger';

const { spawn } = require('child_process');
const path = require('path');

// Set the path to the .env file in the root directory
const envPath = path.resolve(__dirname, '../../../.env');

// Use spawn to run ts-node with the required dotenv configuration
const migrationProcess = spawn(
  'npx',
  [
    'ts-node',
    '-r',
    'dotenv/config',
    path.resolve(__dirname, '../db/migrations/migrate.ts')
  ],
  {
    stdio: 'inherit', // Inherit stdin, stdout, and stderr
    shell: true,
    env: {
      ...process.env,
      DOTENV_CONFIG_PATH: envPath
    }
  }
);

migrationProcess.on('close', (code) => {
  logger.log(`Migration process exited with code ${code}`);
  if (code !== 0) {
    logger.error('Migration failed. Please check the output above.');
    process.exit(1);
  } else {
    logger.log('Migration completed successfully.');
  }
});

migrationProcess.on('error', (err) => {
  logger.error('Failed to start migration process:', err);
  process.exit(1);
}); 