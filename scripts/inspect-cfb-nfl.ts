import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ncaafPicks = await prisma.pick.findMany({
    where: {
      game: {
        sport: { key: { contains: "ncaaf" } },
      },
    },
    include: { game: true, signalSnapshot: true },
    orderBy: { generatedAt: "desc" },
    take: 40,
  });
  console.log(`Found ${ncaafPicks.length} NCAAF picks:`);
  for (const p of ncaafPicks) {
    console.log(
      `NCAAF: id=${p.id} type=${p.pickType} sel=${p.selection} line=${p.line} isPub=${p.isPublished} books=${p.bookmakerCount} conf=${p.confidence} game=${p.game?.homeTeamName} vs ${p.game?.awayTeamName} time=${p.game?.commenceTime?.toISOString()}`
    );
  }

  const nflPicks = await prisma.pick.findMany({
    where: {
      game: {
        sport: { key: { contains: "nfl" } },
      },
    },
    include: { game: true, signalSnapshot: true },
    orderBy: { generatedAt: "desc" },
    take: 30,
  });
  console.log(`Found ${nflPicks.length} NFL picks:`);
  for (const p of nflPicks) {
    console.log(
      `NFL: id=${p.id} type=${p.pickType} sel=${p.selection} line=${p.line} isPub=${p.isPublished} books=${p.bookmakerCount} conf=${p.confidence} game=${p.game?.homeTeamName} vs ${p.game?.awayTeamName} time=${p.game?.commenceTime?.toISOString()}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
