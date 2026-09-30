/**
 * LIVE PROOF (read-only): run the real loaders against prod Neon and print
 * what each bundle surface actually returns for real upcoming NFL games.
 *
 * This is a verification harness, not a test. It is NOT part of the suite:
 * it needs DATABASE_URL and a network path, and it makes no writes.
 *
 *   DATABASE_URL=... npx tsx scripts/ops/proof-bundle-db-wiring.ts
 *
 * WHAT THIS NOW SHOWS FOR playerStats AND weather
 *
 * playerStats — FIXED here, and this harness is the regression check.
 *   `player_game_stats.team` is NULL on every prod row for the 2025 and 2026
 *   seasons (measured 2026-09-30: 2026 = 1,091 rows / 0 non-null; 2025 = 6,396
 *   / 0 non-null; 2024 and earlier are 100% populated). Filtering on it
 *   returned zero rows on 100% of picks. The loader now recovers the team from
 *   the row's `opponent` via the live NFL schedule, and the `stored=` column
 *   below is what the OLD filter returned — it should read 0 while `total`
 *   does not. If `total` ever returns to 0, the schedule join regressed.
 *
 * weather — NOT FIXABLE from the database, and this harness is the evidence.
 *   `game_signals` holds only SCHEDULE rows from `schedule-internal`
 *   (5,172 rows / 2,586 games, keys schedule_density_7d_home and
 *   schedule_density_7d_away). Zero rows carry WEATHER or VENUE_ENVIRONMENT,
 *   and the only writer of game_signals in the repo
 *   (packages/data-ingestion/src/context-enrichment.ts) writes SCHEDULE rows
 *   only. It could not be keyed today even with a writer: an information_schema
 *   scan of every column in every table found no venue, stadium, latitude,
 *   longitude or altitude column anywhere in the schema, and a weather fetch
 *   needs a grid coordinate per game. So `weather` below stays 0 by
 *   construction, and the loader's note says "no producer" rather than
 *   implying a pending backfill.
 */
import { PrismaClient } from "@prisma/client";

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("proof-bundle-db-wiring: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

// Mirrors NFL_NAME_TO_ABBR in packages/ingestion-pipeline/src/nfl-team-abbr.ts.
// Kept inline (not imported) because the published package cannot be loaded by
// bare tsx without a build; if the two ever drift this harness prints the
// same zero the app would, which is the signal to reconcile them.
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

  // The whole NFL schedule, bucketed the same way the loaders bucket it.
  const schedule = await prisma.game.findMany({
    where: { sport: { key: "americanfootball_nfl" } },
    select: { homeTeamName: true, awayTeamName: true, commenceTime: true },
  });
  const byTeamWeek = new Map<string, Set<string>>();
  for (const s of schedule) {
    const sh = abbr(s.homeTeamName);
    const sa = abbr(s.awayTeamName);
    if (!sh || !sa) continue;
    const sw = seasonWeekOf(s.commenceTime);
    for (const [team, opp] of [[sh, sa], [sa, sh]] as const) {
      const k = `${sw.season}:${sw.week}:${team}`;
      if (!byTeamWeek.has(k)) byTeamWeek.set(k, new Set());
      byTeamWeek.get(k)!.add(opp);
    }
  }

  let totals = {
    injuries: 0, ratings: 0, snaps: 0, ngs: 0,
    playerStatsStored: 0, playerStatsTotal: 0, gameSignals: 0, weather: 0,
  };

  for (const g of games) {
    const h = abbr(g.homeTeamName);
    const a = abbr(g.awayTeamName);
    const sw = seasonWeekOf(g.commenceTime);
    if (!h || !a) {
      console.log(`SKIP ${g.homeTeamName} v ${g.awayTeamName} — abbreviation unresolved`);
      continue;
    }

    // Opponents these two clubs actually faced in the lagged window. This is
    // the set the fixed loader asks for; filtering on (h, a) would miss most of
    // the home club's rows.
    const oppFilter = new Set<string>();
    for (const team of [h, a]) {
      for (let week = 1; week < sw.week; week++) {
        const opps = byTeamWeek.get(`${sw.season}:${week}:${team}`);
        if (opps && opps.size === 1) oppFilter.add([...opps][0]!);
      }
    }

    const [inj, gse, snap, ngs, pgsStored, pgsNull, sig] = await Promise.all([
      prisma.injury.findMany({ where: { season: sw.season, week: { lte: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.teamGameEfficiency.findMany({ where: { season: sw.season, seasonType: "REG", week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.snapCount.findMany({ where: { season: sw.season, week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      prisma.nextGenStat.findMany({ where: { season: sw.season, week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      // The OLD filter, kept so the regression stays visible.
      prisma.playerGameStat.findMany({ where: { season: sw.season, week: { lt: sw.week }, team: { in: [h, a] } }, select: { team: true, week: true } }),
      oppFilter.size > 0
        ? prisma.playerGameStat.findMany({ where: { season: sw.season, week: { lt: sw.week }, team: null, opponent: { in: [...oppFilter] } }, select: { playerId: true, week: true } })
        : Promise.resolve([]),
      prisma.gameSignal.findMany({ where: { gameId: g.id }, select: { sourceCategory: true, signalKey: true } }),
    ]);

    const weather = sig.filter((s) => ["WEATHER", "VENUE_ENVIRONMENT"].includes(String(s.sourceCategory)));
    totals.injuries += inj.length;
    totals.ratings += gse.length;
    totals.snaps += snap.length;
    totals.ngs += ngs.length;
    totals.playerStatsStored += pgsStored.length;
    totals.playerStatsTotal += pgsStored.length + pgsNull.length;
    totals.gameSignals += sig.length - weather.length;
    totals.weather += weather.length;

    const weeks = (r: { week: number }[]) => [...new Set(r.map((x) => x.week))].sort((a, b) => a - b).join(",") || "-";
    console.log(
      `${g.commenceTime.toISOString().slice(0, 16)} ${h} v ${a}  ` +
        `inj=${inj.length}(w${weeks(inj)}) ratings=${gse.length}(w${weeks(gse)}) ` +
        `snaps=${snap.length}(w${weeks(snap)}) ngs=${ngs.length}(w${weeks(ngs)}) ` +
        `pgs stored=${pgsStored.length} recovered=${pgsNull.length} ` +
        `signals=${sig.length} weather=${weather.length}`,
    );
  }

  console.log("\nTOTALS across sampled games:", totals);
  console.log(
    `\nEXPECTED: playerStatsStored = 0 (the team column is empty for these seasons) ` +
      `and playerStatsTotal > 0 (the schedule join recovered them). ` +
      `weather = 0 permanently — no producer, no venue/coordinate column.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
