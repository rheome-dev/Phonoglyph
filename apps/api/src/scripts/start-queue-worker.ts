import { QueueWorker } from '../services/queue-worker';
 
console.log('Starting stem separation queue worker...');
QueueWorker.start().catch(error => {
  console.error('Queue worker failed:', error);
  process.exit(1);
}); 