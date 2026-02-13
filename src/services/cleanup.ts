import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

const CLIPS_DIR = path.join(process.cwd(), 'public/temp');

export const cleanupOldClips = async (maxAgeMinutes: number = 60) => {
  try {
    if (!fs.existsSync(CLIPS_DIR)) return;

    const files = fs.readdirSync(CLIPS_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(CLIPS_DIR, file);
      const stats = fs.statSync(filePath);
      const ageMinutes = (now - stats.mtimeMs) / (1000 * 60);

      if (ageMinutes > maxAgeMinutes) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted old clip: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up clips:', error);
  }
};
