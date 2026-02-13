import { Worker, Job } from 'bullmq';
import { downloadVideoSection } from '@/services/downloader';
// import { trimVideo } from '@/services/ffmpeg'; 
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

export const clipWorker = new Worker(
  'clip-queue',
  async (job: Job) => {
    const { videoId, startTime, endTime, clipId } = job.data;

    try {
      // Update status to PROCESSING
      await prisma.clip.update({
        where: { id: clipId },
        data: { status: 'PROCESSING' },
      });

      // 1. Download Section
      // BullMQ handles retries based on queue configuration (3 attempts)
      const { filePath, fileName } = await downloadVideoSection(videoId, startTime, endTime);

      // 2. (Optional) Additional Trimming if download wasn't precise enough
      // For now, trusting downloadVideoSection which uses yt-dlp section download.
      // If we needed to re-encode, we would use trimVideo here.
      
      const downloadUrl = `/temp/${fileName}`;

      // Update DB with result
      await prisma.clip.update({
        where: { id: clipId },
        data: {
          status: 'COMPLETED',
          filePath,
          downloadUrl,
        },
      });

      return { downloadUrl };
    } catch (error: any) {
      logger.error(`Job ${job.id} failed:`, error);
      await prisma.clip.update({
        where: { id: clipId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 5,
  }
);
