import { db } from '@sports/db';

async function checkPicks() {
  const picks = await db.pick.findMany({
    where: {
      selection: {
        contains: 'UTSA'
      }
    },
    take: 5,
    select: {
      id: true,
      selection: true,
      confidence: true,
      edgeScore: true,
      bookmakerCount: true,
      factorBreakdown: true,
      gameId: true
    }
  });
  console.log('UTSA picks:', JSON.stringify(picks, null, 2));
  await db.$disconnect();
}
checkPicks().catch(console.error);
