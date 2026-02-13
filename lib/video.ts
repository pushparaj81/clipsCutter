import 'dotenv/config';
import { create } from 'yt-dlp-exec';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

// Initialize yt-dlp
const ytdlp = create(YTDLP_PATH);

// Configure ffmpeg
ffmpeg.setFfmpegPath(FFMPEG_PATH);

export interface VideoQuality {
    label: string;   // e.g. "1080p", "720p"
    height: number;  // e.g. 1080, 720
}

export interface VideoInfo {
    title: string;
    duration: number;
    thumbnail: string;
    url: string;
    availableQualities: VideoQuality[];
    availableFormats: string[];  // e.g. ["mp4", "webm"]
}

/**
 * Fetches video metadata + available qualities using yt-dlp
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
    try {
        const metadata = await ytdlp(url, {
            dumpJson: true,
            noWarnings: true,
            preferFreeFormats: true,
        }) as any;

        // Extract unique video qualities and formats from the formats list
        const qualitySet = new Set<number>();
        const formatSet = new Set<string>();
        const availableQualities: VideoQuality[] = [];

        // Formats we support for output
        const supportedFormats = ['mp4', 'webm', 'mkv', 'mp3'];

        if (metadata.formats && Array.isArray(metadata.formats)) {
            for (const fmt of metadata.formats) {
                // Extract qualities (only formats with video)
                if (fmt.height && fmt.height > 0 && !qualitySet.has(fmt.height)) {
                    qualitySet.add(fmt.height);
                    availableQualities.push({
                        label: `${fmt.height}p`,
                        height: fmt.height,
                    });
                }

                // Extract container formats (e.g. mp4, webm)
                if (fmt.ext && supportedFormats.includes(fmt.ext)) {
                    formatSet.add(fmt.ext);
                }
            }
        }

        // Sort qualities from highest to lowest
        availableQualities.sort((a, b) => b.height - a.height);

        // Always include mp4 and mp3 (FFmpeg can convert/extract to these)
        const availableFormats = Array.from(formatSet);
        if (!availableFormats.includes('mp4')) availableFormats.unshift('mp4');
        if (!availableFormats.includes('mp3')) availableFormats.push('mp3');

        return {
            title: metadata.title,
            duration: metadata.duration,
            thumbnail: metadata.thumbnail,
            url: url,
            availableQualities,
            availableFormats,
        };
    } catch (error) {
        console.error('Error fetching video info:', error);
        throw new Error('Failed to fetch video metadata');
    }
}

/**
 * Trims a video segment using FFmpeg
 */
export async function trimVideo(
    inputUrl: string,
    startTime: string,
    endTime: string,
    outputPath: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        ffmpeg(inputUrl)
            .setStartTime(startTime)
            .setDuration(calculateDuration(startTime, endTime))
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .run();
    });
}

function calculateDuration(start: string, end: string): number {
    // Convert HH:MM:SS or SS to seconds and subtract
    const s = parseTimeToSeconds(start);
    const e = parseTimeToSeconds(end);
    return e - s;
}

function parseTimeToSeconds(time: string): number {
    if (!time.includes(':')) return parseFloat(time);
    const parts = time.split(':').reverse();
    let seconds = 0;
    if (parts[0]) seconds += parseFloat(parts[0]);
    if (parts[1]) seconds += parseFloat(parts[1]) * 60;
    if (parts[2]) seconds += parseFloat(parts[2]) * 3600;
    return seconds;
}
