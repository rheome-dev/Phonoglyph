import { QueueWorker } from '../services/queue-worker';
import { logger } from '../lib/logger';
 
logger.log('Starting queue worker...');
QueueWorker.start().catch(error => {
  logger.error('Queue worker failed:', error);
  process.exit(1);
}); 