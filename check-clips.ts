import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clips = await prisma.clip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(clips, null, 2));
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
