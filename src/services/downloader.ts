// eslint-disable-next-line @typescript-eslint/no-require-imports
const ytDlpExec = require('yt-dlp-exec');
import fs from 'fs';
import path from 'path';

// Use a getter to ensure environment variables are loaded
const getVout = () => {
  const binaryPath = process.env.YT_DLP_PATH || 'yt-dlp';
  return ytDlpExec.create(binaryPath);
};

export const getVideoMetadata = async (url: string) => {
  try {
    const ytDlp = getVout();
    console.log(`Fetching metadata for: ${url}`);
    const output = await ytDlp(url, {
      dumpJson: true,
      noWarnings: true
    } as any);

    // Filter available qualities (heights)
    const qualities = new Set<number>();
    if (output.formats) {
      output.formats.forEach((f: any) => {
        if (f.height && f.vcodec !== 'none') {
          qualities.add(f.height);
        }
      });
    }

    const availableQualities = Array.from(qualities)
      .sort((a, b) => b - a)
      .map(h => ({
        label: `${h}p`,
        height: h
      }));

    return {
      ...output,
      availableQualities,
      availableFormats: ['mp4', 'mp3', 'webm'] // Standard offerings
    };
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    if (error.command) console.error('Failed command:', error.command);
    if (error.stderr) console.error('Error output (stderr):', error.stderr);
    throw new Error('Failed to fetch video metadata');
  }
};

import { spawn } from 'child_process';

export const downloadVideoSection = async (
  videoId: string,
  startTime: number,
  endTime: number,
  format: string = 'mp4',
  quality?: string,
  onProgress?: (percent: number) => void,
  outputDir: string = './public/temp'
): Promise<{ filePath: string; fileName: string }> => {
  // Ensure temp directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ext = format === 'mp3' ? 'mp3' : (format === 'webm' ? 'webm' : 'mp4');
  const qualitySuffix = quality ? `_${quality}` : '';
  const outputFileName = `${videoId}_${startTime}_${endTime}${qualitySuffix}.${ext}`;
  const outputPath = path.join(outputDir, outputFileName);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    if (fs.existsSync(outputPath)) {
        if (onProgress) onProgress(100);
        return { filePath: outputPath, fileName: outputFileName };
    }

    console.log(`Downloading section: ${videoUrl} [${startTime}-${endTime}] as ${format} (${quality || 'best'})`);
    
    const binaryPath = process.env.YT_DLP_PATH || 'yt-dlp';
    const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

    const args = [
      videoUrl,
      '--download-sections', `*${startTime}-${endTime}`,
      '--output', outputPath,
      '--newline', // Easier to parse line by line
      '--progress'
    ];

    if (FFMPEG_PATH) {
      args.push('--ffmpeg-location', FFMPEG_PATH);
    }

    if (format === 'mp3') {
      args.push('--extract-audio', '--audio-format', 'mp3');
      if (quality) {
        // quality can be '128' or '320'
        args.push('--audio-quality', quality.endsWith('k') ? quality : `${quality}k`);
      }
      args.push('--format', 'bestaudio/best');
    } else {
      const height = quality ? quality.replace('p', '') : null;
      if (height) {
        args.push('--format', `bestvideo[height<=${height}][ext=${ext}]+bestaudio[ext=m4a]/best[height<=${height}][ext=${ext}]/best`);
      } else {
        args.push('--format', `bestvideo[ext=${ext}]+bestaudio/best[ext=${ext}]/best`);
      }
    }

    const logPath = './logs/yt-dlp.log';
    if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
    fs.appendFileSync(logPath, `\n\n--- [${new Date().toISOString()}] Starting Download ---\n`);
    fs.appendFileSync(logPath, `Command: ${binaryPath} ${args.join(' ')}\n`);

    return new Promise((resolve, reject) => {
      const childProcess = spawn(binaryPath, args);

      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        fs.appendFileSync(logPath, `STDOUT: ${output}`);
        // Regex for percentage: [download]  10.0% of ...
        const match = output.match(/(\d+\.\d+)%/);
        if (match && onProgress) {
          const percent = parseFloat(match[1]);
          onProgress(Math.floor(percent));
        }
      });

      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        fs.appendFileSync(logPath, `STDERR: ${output}`);
        console.error(`yt-dlp stderr: ${output}`);
      });

      childProcess.on('close', (code) => {
        fs.appendFileSync(logPath, `Closed with code: ${code}\n`);
        if (code === 0) {
          if (onProgress) onProgress(100);
          resolve({ filePath: outputPath, fileName: outputFileName });
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });

      childProcess.on('error', (err) => {
        fs.appendFileSync(logPath, `Spawn ERROR: ${err.message}\n`);
        reject(err);
      });
    });

  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};
