import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- DB INSPECTION REPORT ---');
  try {
    const clips = await prisma.clip.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (clips.length === 0) {
      console.log('No clips found in database.');
    } else {
      clips.forEach(clip => {
        console.log(`[${clip.createdAt.toISOString()}] ID: ${clip.id}`);
        console.log(`Status: ${clip.status} | Progress: ${clip.progress}%`);
        console.log(`Video: ${clip.videoId}`);
        if (clip.error) console.log(`ERROR: ${clip.error}`);
        console.log('---');
      });
    }
  } catch (err) {
    console.error('Database query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
