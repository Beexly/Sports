/**
 * LIVE PROOF (read-only): run the real loaders against prod Neon and print
 * what each bundle surface actually returns for real upcoming NFL games.
 *
 * This is a verification harness, not a test. It is NOT part of the suite:
 * it needs DATABASE_URL and a network path, and it makes no writes.
 *
 *   DATABASE_URL=... npx tsx scripts/ops/proof-bundle-db-wiring.ts
 */
import { PrismaClient } from "@prisma/client";

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("proof-bundle-db-wiring: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const NFL_NAME_TO_ABBR: Record<string, string> = {
  "arizona cardinals": "ARI", "atlanta falcons": "ATL", "baltimore ravens": "BAL",
  "buffalo bills": "BUF", "carolina panthers": "CAR", "chicago bears": "CHI",
  "cincinnati bengals": "CIN", "cleveland browns": "CLE", "dallas cowboys": "DAL",
  "denver broncos": "DEN", "detroit lions": "DET", "green bay packers": "GB",
  "houston texans": "HOU", "indianapolis colts": "IND", "jacksonville jaguars": "JAX",
  "kansas city chiefs": "KC", "las vegas raiders": "LV", "los angeles chargers": "LAC",
  "los angeles rams": "LA", "miami dolphins": "MIA", "minnesota vikings": "MIN",
  "new england patriots": "NE", "new orleans saints": "NO", "new york giants": "NYG",
  "new york jets": "NYJ", "philadelphia eagles": "PHI", "pittsburgh steelers": "PIT",
  "san francisco 49ers": "SF", "seattle seahawks": "SEA", "tampa bay buccaneers": "TB",
  "tennessee titans": "TEN", "washington commanders": "WAS",
};
const abbr = (n: string | null | undefined) =>
  NFL_NAME_TO_ABBR[String(n ?? "").trim().toLowerCase()] ?? null;

function seasonOf(d: Date): number {
  return d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}
function seasonWeekOf(d: Date): { season: number; week: number } {
  const season = seasonOf(d);
  const sep8 = Date.UTC(season, 8, 8);
  const openDow = new Date(sep8).getUTCDay();
  const toThu = (4 - openDow + 7) % 7;
  const w1 = sep8 + toThu * 86_400_000;
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { season, week: t < w1 ? 1 : Math.min(Math.floor((t - w1) / 604_800_000) + 1, 22) };
}

async function main(): Promise<void> {
  const games = await prisma.game.findMany({
    where: {
      sport: { key: "americanfootball_nfl" },
      commenceTime: { gte: new Date() },
    },
    select: {
      id: true,
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      _count: { select: { gameSignals: true } },
    },
    orderBy: { commenceTime: "asc" },
    take: 6,
  });

  console.log(`upcoming NFL games sampled: ${games.length}\n`);

  let totals = {
    injuries: 0, ratings: 0, snaps: 0, ngs: 0, playerStats: 0, gameSignals: 0, weather: 0,
  };

  for (const g of games) {
    const h = abbr(g.homeTeamName);
    const a = abbr(g.awayTeamName);
    const sw = seasonWeekOf(g.commenceTime);
    if (!h || !a) {
      console.log(`SKIP ${g.homeTeamName} v ${g.awayTeamName} — abbreviation unresolved`);
      continue;
    }
    const [inj, gse, snap, ngs, pgs, sig] = await Promise.all([
      prisma.injury.findMany({ where: { season: sw.season, week: { lte: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.teamGameEfficiency.findMany({ where: { season: sw.season, seasonType: "REG", week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.snapCount.findMany({ where: { season: sw.season, week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.nextGenStat.findMany({ where: { season: sw.season, week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.playerGameStat.findMany({ where: { season: sw.season, week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.gameSignal.findMany({ where: { gameId: g.id }, select: { sourceCategory: true, signalKey: true } }),
    ]);
    const weather = sig.filter((s) => ["WEATHER", "VENUE_ENVIRONMENT"].includes(String(s.sourceCategory)));
    totals.injuries += inj.length;
    totals.ratings += gse.length;
    totals.snaps += snap.length;
    totals.ngs += ngs.length;
    totals.playerStats += pgs.length;
    totals.gameSignals += sig.length - weather.length;
    totals.weather += weather.length;
    const weeks = (r: { week: number }[]) => [...new Set(r.map((x) => x.week))].sort().join(",") || "-";
    console.log(
      `${g.commenceTime.toISOString().slice(0, 16)} ${h} v ${a}  ` +
        `inj=${inj.length}(w${weeks(inj)}) ratings=${gse.length}(w${weeks(gse)}) ` +
        `snaps=${snap.length}(w${weeks(snap)}) ngs=${ngs.length}(w${weeks(ngs)}) ` +
        `pgs=${pgs.length} signals=${sig.length} weather=${weather.length}`,
    );
  }

  console.log("\nTOTALS across sampled games:", totals);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
