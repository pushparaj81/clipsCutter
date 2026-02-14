
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- FAILED CLIPS REPORT ---');
  const failedClips = await prisma.clip.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  if (failedClips.length === 0) {
    console.log('No failed clips found.');
  } else {
    failedClips.forEach(clip => {
      console.log(`[${clip.createdAt.toISOString()}] ID: ${clip.id}`);
      console.log(`Video: ${clip.videoId} (${clip.startTime}-${clip.endTime})`);
      console.log(`Error: ${clip.error || 'N/A'}`);
      console.log('---');
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
