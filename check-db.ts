import { prisma } from './src/lib/prisma';

async function main() {
  const clips = await prisma.clip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('--- LATEST CLIPS ---');
  clips.forEach(c => {
    console.log(`[${c.status}] ID: ${c.id} | Title: ${c.title} | Error: ${c.error || 'NONE'}`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
