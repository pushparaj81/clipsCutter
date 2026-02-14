import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisConnection } from './redis';
import { CLIPS_QUEUE_NAME, ClipJobData } from './queue';
import { trimVideo } from './video';
import { prisma } from './prisma';
import { create } from 'yt-dlp-exec';
import path from 'path';
import fs from 'fs';

const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const ytdlp = create(YTDLP_PATH);

// Ensure the output directory exists
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'clips');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`--- Worker: Created output directory: ${OUTPUT_DIR} ---`);
}

/**
 * The main job processor function.
 * This is the "Chef" that does the actual video cutting work.
 */
async function processClipJob(job: Job<ClipJobData>) {
    const { clipId, youtubeUrl, startTime, endTime, format, quality } = job.data;

    console.log(`--- Worker: Starting Job ${job.id} ---`);
    console.log(`    Clip ID: ${clipId}`);
    console.log(`    URL: ${youtubeUrl}`);
    console.log(`    Time: ${startTime} -> ${endTime}`);
    console.log(`    Format: ${format} | Quality: ${quality}`);

    try {
        // Step 1: Update DB status to PROCESSING
        await prisma.clip.update({
            where: { id: clipId },
            data: { status: 'PROCESSING' },
        });
        console.log(`    [1/5] Status updated to PROCESSING`);

        // Step 2: Get the best direct download URL from yt-dlp
        const isAudioOnly = format === 'mp3';
        const height = quality === 'best' ? '' : `[height<=${quality.replace('p', '')}]`;

        const formatSelector = isAudioOnly
            ? 'bestaudio/best'
            : `bestvideo${height}+bestaudio/best${height}/best`;

        console.log(`    [2/5] Fetching download URL (format: ${formatSelector})...`);

        const metadata = await ytdlp(youtubeUrl, {
            dumpJson: true,
            noWarnings: true,
            format: formatSelector,
        }) as any;

        // Log keys for debugging
        console.log(`    [2/5] yt-dlp Metadata Keys: ${Object.keys(metadata).join(', ')}`);

        let downloadUrl = metadata.url;

        // If it's a merged format, metadata.url might be missing, check requested_formats
        if (!downloadUrl && metadata.requested_formats) {
            console.log(`    [2/5] Merged formats detected: ${metadata.requested_formats.length}`);
            // If it's merged, we take the one with a URL (or we'll just throw for now to see)
            downloadUrl = metadata.requested_formats[0]?.url;
        }

        if (!downloadUrl && metadata.requested_downloads?.[0]?.url) {
            downloadUrl = metadata.requested_downloads[0].url;
        }

        if (!downloadUrl) {
            console.log('    [2/5] Error: metadata.url is missing.');
            // Dump the first 500 chars of metadata to log
            console.log('    [2/5] Metadata snippet:', JSON.stringify(metadata).substring(0, 500) + '...');
            throw new Error('Could not find a suitable download URL from yt-dlp');
        }
        console.log(`    [2/5] Download URL obtained: ${downloadUrl.substring(0, 50)}...`);

        // Step 3: Build output file path
        const safeTitle = (metadata.title || 'clip')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);
        const outputFileName = `${safeTitle}_${clipId}.${format}`;
        const outputPath = path.join(OUTPUT_DIR, outputFileName);
        console.log(`    [3/5] Output file: ${outputFileName}`);

        // Step 4: Trim the video/audio using FFmpeg
        console.log(`    [4/5] Trimming with FFmpeg...`);
        await trimVideo(downloadUrl, startTime, endTime, outputPath);
        console.log(`    [4/5] Trimming complete!`);

        // Step 5: Update DB with the download link
        const publicDownloadUrl = `/clips/${outputFileName}`;
        await prisma.clip.update({
            where: { id: clipId },
            data: {
                status: 'COMPLETED',
                downloadUrl: publicDownloadUrl,
                storagePath: outputPath,
                title: metadata.title || 'Untitled Clip',
            },
        });
        console.log(`    [5/5] Job COMPLETED! Download: ${publicDownloadUrl}`);
        console.log(`--- Worker: Finished Job ${job.id} ---`);

        return { downloadUrl: publicDownloadUrl };

    } catch (error: any) {
        console.error(`--- Worker: Job ${job.id} FAILED ---`, error.message);

        // Update DB with the error
        await prisma.clip.update({
            where: { id: clipId },
            data: {
                status: 'FAILED',
                error: error.message || 'Unknown error occurred',
            },
        });

        throw error; // Re-throw so BullMQ can retry
    }
}

// Create and start the Worker
const worker = new Worker<ClipJobData>(
    CLIPS_QUEUE_NAME,
    processClipJob,
    {
        connection: redisConnection,
        concurrency: 1, // Process one job at a time (CPU-heavy work)
    }
);

// Worker event listeners for logging
worker.on('ready', () => {
    console.log('--- Worker: Ready and listening for jobs! ---');
});

worker.on('completed', (job) => {
    console.log(`--- Worker: Job ${job.id} completed successfully ---`);
});

worker.on('failed', (job, err) => {
    console.error(`--- Worker: Job ${job?.id} failed --- Error: ${err.message}`);
});

worker.on('error', (err) => {
    console.error('--- Worker: Error ---', err);
});

console.log('--- Worker: Process started, waiting for jobs... ---');
