/**
 * CLV FEASIBILITY RUN — the one open edge question, answered with real data.
 *
 * Reconstructs OPENING and CLOSING consensus lines from The Odds API historical
 * endpoint and asks: can a fixed, pre-registered entry rule (decided at OPEN)
 * systematically beat the close? This is the precondition for CLV being a real,
 * paid-data-justifying edge. The analysis is the audited pure core in the engine
 * (clv-feasibility.ts); this script only fetches + feeds it.
 *
 * SPEND DISCIPLINE (non-negotiable — mirrors clv-plan.ts):
 *   • Prints the exact credit cost BEFORE any paid call and refuses to exceed
 *     --max-credits (default 600) unless you pass --yes.
 *   • Caches every snapshot to disk; re-runs cost ZERO credits.
 *   • Validates real spend against the x-requests-* headers as it goes.
 *   • With no THE_ODDS_API_KEY set, it does a DRY-RUN: it prints what it would
 *     fetch and the cost, and exits 0 — safe to run anytime.
 *
 * USAGE:
 *   # dry-run (no key needed) — see the plan and cost:
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/clv-feasibility.ts --season 2023 --weeks 1,2,3,4
 *   # real run (key in env), authorize the spend:
 *   THE_ODDS_API_KEY=... NODE_OPTIONS=--use-system-ca NODE_USE_ENV_PROXY=1 \
 *     npx tsx scripts/backtest/clv-feasibility.ts --season 2023 --weeks 1,2,3,4 --yes
 *
 * Conventions: spread is HOME-perspective; total is the combined points line.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { OddsApiClient, type HistoricalOddsSnapshot } from "../../packages/data-ingestion/src/odds-api-client.js";
import type { Market } from "../../packages/data-ingestion/src/config.js";
import {
  consensusFromEvent,
  evaluateClvFeasibility,
  type ClvGameOpenClose,
} from "../../packages/prediction-engine/src/clv-feasibility.js";
import type { OddsApiEvent } from "../../packages/types/src/index.js";

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const SPORT = "americanfootball_nfl" as const;
const MARKETS: Market[] = ["spreads", "totals"];
const REGIONS = 1;
const CREDITS_PER_SNAPSHOT = 10 * MARKETS.length * REGIONS; // 10× historical multiplier
const CACHE_DIR =
  process.env["CLV_CACHE_DIR"] ??
  join(
    process.env["TMPDIR"] ?? "/tmp",
    "clv-feasibility-cache",
  );

// ── tiny arg parser ─────────────────────────────────────────────────────────────
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const SEASON = Number(arg("season") ?? 2023);
const WEEKS = (arg("weeks") ?? "1,2,3,4").split(",").map(Number).filter(Number.isInteger);
const OPEN_OFFSET_H = Number(arg("open-hours") ?? 120); // ~5 days before kickoff
const CLOSE_OFFSET_H = Number(arg("close-hours") ?? 1.5); // ~90 min before kickoff
const MAX_CREDITS = Number(arg("max-credits") ?? 600);
const AUTHORIZED = flag("yes");
const Q = Number(arg("q") ?? 0.1);
const MIN_SAMPLE = Number(arg("min-sample") ?? 30);

function hourFloorIso(ms: number): string {
  return new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString();
}

interface ScheduledGame {
  readonly gameId: string;
  readonly home: string;
  readonly away: string;
  readonly kickoffMs: number;
  readonly openIso: string;
  readonly closeIso: string;
}

async function loadSchedule(): Promise<ScheduledGame[]> {
  const res = await fetch(GAMES_URL);
  if (!res.ok) throw new Error(`games.csv not reachable (${res.status})`);
  const lines = (await res.text()).split("\n");
  const header = lines[0]!.split(",");
  const col = (n: string) => header.indexOf(n);
  const cSeason = col("season"), cWeek = col("week"), cDay = col("gameday"), cTime = col("gametime");
  const cHome = col("home_team"), cAway = col("away_team"), cGame = col("game_id");

  const out: ScheduledGame[] = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i]!.split(",");
    if (Number(r[cSeason]) !== SEASON) continue;
    if (!WEEKS.includes(Number(r[cWeek]))) continue;
    const day = r[cDay], time = r[cTime];
    if (!day || !time) continue;
    // ET≈UTC-5 (DST ignored; the API returns the nearest snapshot so ≤1h error is harmless).
    const kickoffMs = Date.parse(`${day}T${time}:00-05:00`);
    if (!Number.isFinite(kickoffMs)) continue;
    out.push({
      gameId: r[cGame] ?? `${SEASON}-${r[cWeek]}-${r[cHome]}`,
      home: r[cHome] ?? "",
      away: r[cAway] ?? "",
      kickoffMs,
      openIso: hourFloorIso(kickoffMs - OPEN_OFFSET_H * 3_600_000),
      closeIso: hourFloorIso(kickoffMs - CLOSE_OFFSET_H * 3_600_000),
    });
  }
  return out;
}

// nflverse team abbreviations → Odds API full names (so we can match events).
const TEAM_NAME: Record<string, string> = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens", BUF: "Buffalo Bills",
  CAR: "Carolina Panthers", CHI: "Chicago Bears", CIN: "Cincinnati Bengals", CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys", DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars", KC: "Kansas City Chiefs",
  LV: "Las Vegas Raiders", LAC: "Los Angeles Chargers", LA: "Los Angeles Rams", LAR: "Los Angeles Rams",
  MIA: "Miami Dolphins", MIN: "Minnesota Vikings", NE: "New England Patriots", NO: "New Orleans Saints",
  NYG: "New York Giants", NYJ: "New York Jets", PHI: "Philadelphia Eagles", PIT: "Pittsburgh Steelers",
  SF: "San Francisco 49ers", SEA: "Seattle Seahawks", TB: "Tampa Bay Buccaneers", TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

function findEvent(snap: HistoricalOddsSnapshot, g: ScheduledGame): OddsApiEvent | null {
  const home = TEAM_NAME[g.home] ?? g.home;
  const away = TEAM_NAME[g.away] ?? g.away;
  return (
    snap.data.find((e) => e.home_team === home && e.away_team === away) ?? null
  );
}

// ── cached snapshot fetch ────────────────────────────────────────────────────────
function cachePath(iso: string): string {
  return join(CACHE_DIR, `${SPORT}_${MARKETS.join("-")}_${iso.replace(/[:.]/g, "-")}.json`);
}

async function fetchSnapshot(
  client: OddsApiClient,
  iso: string,
  spend: { used: number; remaining: number; paidCalls: number },
): Promise<HistoricalOddsSnapshot> {
  const path = cachePath(iso);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf8")) as HistoricalOddsSnapshot;
  }
  const res = await client.getHistoricalOdds(SPORT, MARKETS, iso);
  spend.paidCalls += 1;
  spend.used = res.usedRequests || spend.used;
  spend.remaining = res.remainingRequests || spend.remaining;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(res.data));
  return res.data;
}

async function main(): Promise<void> {
  console.log(`\nCLV feasibility — NFL ${SEASON}, weeks ${WEEKS.join(",")}`);
  console.log(`open≈T-${OPEN_OFFSET_H}h  close≈T-${CLOSE_OFFSET_H}h  markets=${MARKETS.join(",")}  region=us\n`);

  const schedule = await loadSchedule();
  if (schedule.length === 0) {
    console.error("No scheduled games matched. Check --season/--weeks.");
    process.exit(2);
  }

  // Distinct hour-floored snapshots we'd need (one slate serves many games).
  const distinct = new Set<string>();
  for (const g of schedule) { distinct.add(g.openIso); distinct.add(g.closeIso); }
  const distinctTimestamps = [...distinct].sort();

  // What's already cached costs nothing.
  let cached = 0;
  for (const iso of distinctTimestamps) if (existsSync(cachePath(iso))) cached += 1;
  const toFetch = distinctTimestamps.length - cached;
  const estCredits = toFetch * CREDITS_PER_SNAPSHOT;

  console.log(`Games: ${schedule.length}`);
  console.log(`Distinct snapshots: ${distinctTimestamps.length}  (cached: ${cached}, to fetch: ${toFetch})`);
  console.log(`Estimated credit cost: ${estCredits}  (${CREDITS_PER_SNAPSHOT}/snapshot)`);
  console.log(`Cache dir: ${CACHE_DIR}\n`);

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    console.log("DRY-RUN — THE_ODDS_API_KEY is not set in this environment.");
    console.log("No paid call was made. Set the key and re-run with --yes to execute.\n");
    return;
  }
  if (estCredits > MAX_CREDITS && !AUTHORIZED) {
    console.error(
      `Refusing to spend ${estCredits} credits (> --max-credits ${MAX_CREDITS}). ` +
        `Re-run with --yes to authorize, or narrow --weeks.\n`,
    );
    process.exit(3);
  }
  if (toFetch > 0 && !AUTHORIZED) {
    console.error(`Would spend ${estCredits} credits. Re-run with --yes to authorize.\n`);
    process.exit(3);
  }

  const client = new OddsApiClient(apiKey);
  const spend = { used: 0, remaining: 0, paidCalls: 0 };

  // Fetch all distinct snapshots (cache-first), then assemble per-game open/close lines.
  const snaps = new Map<string, HistoricalOddsSnapshot>();
  for (const iso of distinctTimestamps) {
    snaps.set(iso, await fetchSnapshot(client, iso, spend));
  }

  const games: ClvGameOpenClose[] = [];
  let missingOpen = 0, missingClose = 0, matched = 0;
  for (const g of schedule) {
    const openSnap = snaps.get(g.openIso)!;
    const closeSnap = snaps.get(g.closeIso)!;
    const openEv = findEvent(openSnap, g);
    const closeEv = findEvent(closeSnap, g);
    if (!openEv) { missingOpen += 1; continue; }
    if (!closeEv) { missingClose += 1; continue; }
    const open = consensusFromEvent(openEv);
    const close = consensusFromEvent(closeEv);
    games.push({
      gameId: g.gameId,
      openSpreadHome: open.spreadHome,
      closeSpreadHome: close.spreadHome,
      openTotal: open.total,
      closeTotal: close.total,
    });
    matched += 1;
  }

  console.log(
    `\nMatched ${matched} games  (missing open: ${missingOpen}, missing close: ${missingClose})`,
  );
  console.log(`Paid calls this run: ${spend.paidCalls}  credits used (acct): ${spend.used}  remaining: ${spend.remaining}\n`);

  const report = evaluateClvFeasibility(games, { q: Q, minSample: MIN_SAMPLE });

  console.log(`FDR sweep over ${report.rules.length} pre-registered rules (q=${Q}, min n=${MIN_SAMPLE}):\n`);
  console.log("rule                      n    meanCLV   pos%    t-stat   q-val   FDR  edge?");
  for (const r of [...report.rules].sort((a, b) => b.ttest.meanClv - a.ttest.meanClv)) {
    const t = r.ttest;
    console.log(
      `${r.key.padEnd(24)} ${String(t.n).padStart(4)}  ${t.meanClv.toFixed(3).padStart(7)}  ` +
        `${(t.positiveRate * 100).toFixed(0).padStart(4)}  ${(Number.isFinite(t.tStat) ? t.tStat.toFixed(2) : "inf").padStart(7)}  ` +
        `${r.qValue == null ? "  —  " : r.qValue.toFixed(3)}  ${String(r.tested ? r.discovery : "skip").padStart(5)}  ${r.isEdgeCandidate}`,
    );
  }

  console.log(`\nEdge candidates (FDR-surviving, positive mean CLV): ${report.edgeCandidates.length}`);
  if (report.edgeCandidates.length === 0) {
    console.log("→ No pre-registered entry rule beats the close in this sample. The open is");
    console.log("  efficient w.r.t. this family — CLV is not a free edge here. Verdict: do NOT");
    console.log("  stake on it; widen data only if a SPECIFIC mechanism (not a blind sweep) motivates it.\n");
  } else {
    for (const c of report.edgeCandidates) {
      console.log(`  • ${c.key}: mean CLV ${c.ttest.meanClv.toFixed(3)} pts over ${c.ttest.n} games (q=${c.qValue?.toFixed(3)})`);
    }
    console.log("\n→ A rule survived FDR with positive mean CLV. This is a CANDIDATE, not a");
    console.log("  conclusion: confirm out-of-sample on a DIFFERENT season before any reliance.\n");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
