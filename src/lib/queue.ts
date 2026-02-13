import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export const clipQueue = new Queue('clip-queue', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
        age: 3600, // keep for 1 hour
        count: 100
    },
    removeOnFail: {
        age: 24 * 3600 // keep for 24 hours
    }
  },
});
