import { Worker, Job } from 'bullmq';
import { downloadVideoSection } from '@/services/downloader';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import fs from 'fs/promises';
import path from 'path';

export const clipWorker = new Worker(
  'clip-queue',
  async (job: Job) => {
    const { videoId, startTime, endTime, clipId, format, quality } = job.data;

    try {
      console.log(`[Worker] Processing clip ${clipId} (Job ${job.id})`);
      
      // Update status to PROCESSING (with retry if record not propagated yet)
      let clipRecord = null;
      for (let i = 0; i < 5; i++) {
        clipRecord = await prisma.clip.findUnique({ where: { id: clipId } });
        if (clipRecord) break;
        console.warn(`[Worker] Clip ${clipId} not found in DB, retrying... (Attempt ${i + 1}/5)`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!clipRecord) {
        throw new Error(`Clip record ${clipId} not found in database after retries.`);
      }

      await prisma.clip.update({
        where: { id: clipId },
        data: { status: 'PROCESSING' },
      });

      // 1. Download Section
      let lastLoggedProgress = -1;
      const { filePath, fileName } = await downloadVideoSection(
        videoId, 
        startTime, 
        endTime, 
        format || 'mp4', 
        quality,
        (percent: number) => {
          if (percent === 100 || percent - lastLoggedProgress >= 5) {
            lastLoggedProgress = percent;
            prisma.clip.update({
              where: { id: clipId },
              data: { progress: percent }
            }).then(() => {
              console.log(`[Worker] Clip ${clipId} progress: ${percent}%`);
            }).catch((err: Error) => {
              console.error(`[Worker] Failed to update progress for ${clipId}:`, err.message);
            });
          }
        }
      );

      // 2. Get file size
      const stats = await fs.stat(filePath);
      const fileSize = Math.round(stats.size);

      const downloadUrl = `/temp/${fileName}`;

      // Update DB with result (Status first)
      await prisma.clip.update({
        where: { id: clipId },
        data: {
          status: 'COMPLETED',
          filePath,
          downloadUrl,
        },
      });

      // Try to update metadata (fileSize) separately to avoid total failure if client is broken
      try {
        await prisma.clip.update({
          where: { id: clipId },
          data: { fileSize }
        });
        console.log(`[Worker] Updated metadata (size: ${fileSize}) for ${clipId}`);
      } catch (metaErr: any) {
        console.warn(`[Worker] Could not update fileSize metadata (Client might be outdated): ${metaErr.message}`);
      }
      
      console.log(`[Worker] Successfully completed clip ${clipId}`);

      return { downloadUrl, format };
    } catch (error: unknown) {
      const err = error as Error;
      const errorMsg = err.message || 'Unknown processing error';
      console.error(`Job ${job.id} failed:`, err);
      
      // Log to file for debugging
      try {
        const logPath = path.resolve('./logs/worker-error.log');
        const logDir = path.dirname(logPath);
        await fs.mkdir(logDir, { recursive: true });
        await fs.appendFile(logPath, `[${new Date().toISOString()}] Job ${job.id} (Clip ${clipId}) failed: ${errorMsg}\n${err.stack}\n---\n`);
      } catch (logErr) {
        console.error('Failed to write to log file:', logErr);
      }

      await prisma.clip.update({
        where: { id: clipId },
        data: { 
          status: 'FAILED',
          error: errorMsg
        },
      });
      throw err;
    }
  },
  {
    connection: redis as any,
    concurrency: 5,
    lockDuration: 300000, 
  }
);
