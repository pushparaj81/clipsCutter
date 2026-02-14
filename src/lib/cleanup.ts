import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';

const TEMP_DIR = path.resolve('./public/temp');
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export const startCleanupJob = () => {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
        console.log('[Cleanup] Starting hourly temp file cleanup...');
        try {
            const files = await fs.readdir(TEMP_DIR);
            const now = Date.now();
            let deletedCount = 0;

            for (const file of files) {
                if (file === '.gitkeep') continue;
                
                const filePath = path.join(TEMP_DIR, file);
                try {
                    const stats = await fs.stat(filePath);
                    if (now - stats.mtimeMs > MAX_AGE_MS) {
                        await fs.unlink(filePath);
                        deletedCount++;
                    }
                } catch (err) {
                    // Ignore errors for individual files (e.g. if already deleted)
                }
            }
            if (deletedCount > 0) {
                console.log(`[Cleanup] Deleted ${deletedCount} old files.`);
            }
        } catch (err) {
            console.error('[Cleanup] Error reading temp directory:', err);
        }
    });
    
    console.log('[Cleanup] Cron job scheduled (Hourly).');
};
