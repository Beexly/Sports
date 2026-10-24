import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "apps/web/.env.production.local" });
dotenv.config({ path: "apps/web/.env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const picks = await prisma.pick.findMany({
    where: { isPublished: true },
    include: { game: { include: { sport: true } }, signalSnapshot: true },
    orderBy: { generatedAt: "desc" },
    take: 100,
  });
  console.log(`Found ${picks.length} published picks:`);
  const bySportType: Record<string, number> = {};
  for (const p of picks) {
    const key = `${p.game?.sport?.key ?? "unknown"}_${p.pickType}`;
    bySportType[key] = (bySportType[key] || 0) + 1;
    console.log(
      `- [${p.game?.sport?.key}] [${p.pickType}] ${p.selection} line=${p.line} books=${p.bookmakerCount} snapBooks=${p.signalSnapshot?.bookmakerCount} conf=${p.confidence} game=${p.game?.homeTeamName} vs ${p.game?.awayTeamName} commence=${p.game?.commenceTime?.toISOString()}`
    );
  }
  console.log("Summary by sport & pickType:", bySportType);

  // Check TOTAL picks specifically in the database:
  const totals = await prisma.pick.findMany({
    where: { pickType: "TOTAL" },
    include: { game: { include: { sport: true } } },
    take: 20,
  });
  console.log(`Found ${totals.length} TOTAL picks in DB:`);
  for (const t of totals) {
    console.log(
      `TOTAL: id=${t.id} sport=${t.game?.sport?.key} sel=${t.selection} line=${t.line} isPub=${t.isPublished} books=${t.bookmakerCount} conf=${t.confidence}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
