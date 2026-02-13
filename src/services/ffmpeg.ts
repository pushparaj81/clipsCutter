import ffmpeg from 'fluent-ffmpeg';

// Configure ffmpeg path if provided in environment
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

export const trimVideo = async (
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`Trimming video: ${inputPath} -> ${outputPath}`);

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      // Use 'copy' codec for fast cutting without re-encoding, similar to previous logic
      .videoCodec('copy')
      .audioCodec('copy') 
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
};
