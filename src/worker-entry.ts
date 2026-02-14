import 'dotenv/config';
import { clipWorker } from './lib/worker';
import { startCleanupJob } from './lib/cleanup';

console.log('Worker started...');

// Start background cleanup
startCleanupJob();

clipWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

clipWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down worker...');
  await clipWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
