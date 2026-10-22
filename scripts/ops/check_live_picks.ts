import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const picks = await prisma.pick.findMany({
    where: { game: { sport: { key: "americanfootball_nfl" } } },
    orderBy: { generatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      selection: true,
      line: true,
      isPublished: true,
      isBootstrap: true,
      tier: true,
      result: true,
      dataFreshnessAt: true,
      generatedAt: true,
      game: {
        select: {
          commenceTime: true,
          homeTeamName: true,
          awayTeamName: true,
          dataQualityScore: true,
          mergedIntoGameId: true,
        },
      },
    },
  });

  console.log(`Found ${picks.length} NFL picks in DB:`);
  for (const p of picks) {
    console.log({
      id: p.id,
      selection: p.selection,
      isPublished: p.isPublished,
      isBootstrap: p.isBootstrap,
      tier: p.tier,
      result: p.result,
      commenceTime: p.game?.commenceTime,
      dataQualityScore: p.game?.dataQualityScore,
      mergedInto: p.game?.mergedIntoGameId,
    });
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
