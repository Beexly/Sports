/**
 * CLV backfill COST ESTIMATOR (no API key, no spend — pure arithmetic).
 *
 * Prints exactly how many Odds API credits a historical open->close line-movement pull
 * would consume, so the owner can confirm it fits the plan BEFORE any credit is touched.
 *
 * Cost model (The Odds API): a historical /odds snapshot of the whole slate costs
 *   10 (historical multiplier) x markets x regions  credits.
 * With markets = {spreads, totals} (2) and regions = {us} (1) -> 20 credits/snapshot.
 * (Add h2h -> 30.) One snapshot returns ALL games active at that timestamp, so we only
 * pay per DISTINCT timestamp. We snapshot each game at an "open" offset and a "close"
 * offset before kickoff, dedup timestamps to the hour, and count.
 *
 * RUN: NODE_OPTIONS=--use-system-ca NODE_USE_ENV_PROXY=1 npx tsx scripts/backtest/clv-plan.ts 2023 2024
 */

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const SEASONS = process.argv.slice(2).map(Number).filter(Number.isInteger).length
  ? process.argv.slice(2).map(Number).filter(Number.isInteger)
  : [2023, 2024];

const OPEN_OFFSET_H = 120;   // ~5 days before kickoff (opening number)
const CLOSE_OFFSET_H = 1.5;  // ~90 min before kickoff (closing number)
const MARKETS = 2;           // spreads + totals (the CLV-relevant markets)
const REGIONS = 1;           // us
const CREDITS_PER_SNAPSHOT = 10 * MARKETS * REGIONS;

function hourFloorIso(ms: number): string {
  return new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString();
}

async function main(): Promise<void> {
  const res = await fetch(GAMES_URL);
  if (!res.ok) { console.error("games.csv not reachable"); process.exit(2); }
  const lines = (await res.text()).split("\n");
  const header = lines[0]!.split(",");
  const col = (name: string) => header.indexOf(name);
  const cSeason = col("season"), cDay = col("gameday"), cTime = col("gametime");

  const perSeason = new Map<number, Set<string>>();
  let games = 0;
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i]!.split(",");
    const season = Number(r[cSeason]);
    if (!SEASONS.includes(season)) continue;
    const day = r[cDay], time = r[cTime];
    if (!day || !time) continue;
    // ET ~ UTC-5 (DST ignored; a <=1h error is harmless — the API returns the nearest snapshot).
    const kickoff = Date.parse(`${day}T${time}:00-05:00`);
    if (!Number.isFinite(kickoff)) continue;
    games++;
    const set = perSeason.get(season) ?? new Set<string>();
    set.add(hourFloorIso(kickoff - OPEN_OFFSET_H * 3_600_000));
    set.add(hourFloorIso(kickoff - CLOSE_OFFSET_H * 3_600_000));
    perSeason.set(season, set);
  }

  console.log(`\nCLV historical-backfill cost plan — seasons ${SEASONS.join(", ")}`);
  console.log(`markets=spreads,totals  regions=us  -> ${CREDITS_PER_SNAPSHOT} credits/snapshot (10x historical)\n`);
  let totalSnaps = 0;
  for (const s of SEASONS) {
    const snaps = perSeason.get(s)?.size ?? 0;
    totalSnaps += snaps;
    console.log(`  ${s}: ${snaps} distinct snapshots -> ${snaps * CREDITS_PER_SNAPSHOT} credits`);
  }
  console.log(`\n  TOTAL: ${games} games, ${totalSnaps} snapshots -> ${totalSnaps * CREDITS_PER_SNAPSHOT} credits`);
  console.log(`  (your plan: 20,000 credits/month; ~17,650 remaining this period)\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
