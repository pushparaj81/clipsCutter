import { Queue } from 'bullmq';
import { redisConnection } from './redis';

// Name of our queue
export const CLIPS_QUEUE_NAME = 'video-clipping';

// Define the data structure for a clip job
export interface ClipJobData {
    clipId: string;
    youtubeUrl: string;
    startTime: string;
    endTime: string;
    format: string;
    quality: string;
}

// Create the BullMQ queue
export const clipsQueue = new Queue<ClipJobData>(CLIPS_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

console.log(`--- BullMQ: Queue "${CLIPS_QUEUE_NAME}" Initialized ---`);
