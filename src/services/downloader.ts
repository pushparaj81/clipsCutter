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
    return output;
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    if (error.command) console.error('Failed command:', error.command);
    if (error.stderr) console.error('Error output (stderr):', error.stderr);
    throw new Error('Failed to fetch video metadata');
  }
};

export const downloadVideoSection = async (
  videoId: string,
  startTime: number,
  endTime: number,
  outputDir: string = './public/temp'
): Promise<{ filePath: string; fileName: string }> => {
  // Ensure temp directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFileName = `${videoId}_${startTime}_${endTime}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Check if file already exists to save bandwidth (basic caching)
    if (fs.existsSync(outputPath)) {
        return { filePath: outputPath, fileName: outputFileName };
    }

    console.log(`Downloading section: ${videoUrl} [${startTime}-${endTime}]`);
    
    const ytDlp = getVout();
    const FFMPEG_PATH = process.env.FFMPEG_PATH;

    await ytDlp(videoUrl, {
      format: 'best[ext=mp4]',
      downloadSections: `*${startTime}-${endTime}`,
      output: outputPath,
      ffmpegLocation: FFMPEG_PATH || undefined,
    } as any);

    return { filePath: outputPath, fileName: outputFileName };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};
