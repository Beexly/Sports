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
      pickType: { in: ["SPREAD", "TOTAL"] },
    },
    include: { game: true, signalSnapshot: true },
    orderBy: { generatedAt: "desc" },
    take: 40,
  });
  console.log(`Found ${ncaafPicks.length} NCAAF SPREAD/TOTAL picks:`);
  for (const p of ncaafPicks) {
    console.log(
      `NCAAF: id=${p.id} type=${p.pickType} sel=${p.selection} line=${p.line} isPub=${p.isPublished} books=${p.bookmakerCount} conf=${p.confidence} game=${p.game?.homeTeamName} vs ${p.game?.awayTeamName} time=${p.game?.commenceTime?.toISOString()}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
