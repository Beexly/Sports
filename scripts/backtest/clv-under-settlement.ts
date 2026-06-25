/**
 * CLV → PROFIT validation — does "UNDER at the open" actually WIN, not just earn CLV?
 *
 * CLV_FINDINGS.md established that NFL early-season totals drift toward the under from
 * open to close (replicated 3 seasons). CLV is a LEADING indicator — this script tests
 * the thing that actually matters: if you bet the UNDER at the OPENING total, did the
 * game settle under it ≥ 52.4% of the time (the −110 break-even)? And does betting at
 * the OPEN beat betting at the CLOSE on the same games?
 *
 * Uses ONLY cached snapshots (zero new credits) + free nflverse final scores. Pushes
 * are excluded. Reports per-season and pooled hit rate, Wilson 95% CI, a binomial
 * p-value vs 0.5, and the ≥52.4% verdict — with an honest minimum-sample posture.
 *
 * RUN (after the feasibility snapshots are cached):
 *   npx tsx scripts/backtest/clv-under-settlement.ts --seasons 2021,2022,2023 --weeks 1,2,3,4
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  consensusFromEvent,
  type ClvGameOpenClose,
} from "../../packages/prediction-engine/src/clv-feasibility.js";
import type { HistoricalOddsSnapshot } from "../../packages/data-ingestion/src/odds-api-client.js";

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const SPORT = "americanfootball_nfl";
const MARKETS = ["spreads", "totals"];
const BREAK_EVEN = 0.524;
const OPEN_OFFSET_H = 120;
const CACHE_DIR = process.env["CLV_CACHE_DIR"] ?? join(process.env["TMPDIR"] ?? "/tmp", "clv-feasibility-cache");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const SEASONS = (arg("seasons") ?? "2021,2022,2023").split(",").map(Number).filter(Number.isInteger);
const WEEKS = (arg("weeks") ?? "1,2,3,4").split(",").map(Number).filter(Number.isInteger);

function hourFloorIso(ms: number): string {
  return new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
}
function cachePath(iso: string): string {
  return join(CACHE_DIR, `${SPORT}_${MARKETS.join("-")}_${iso.replace(/[:.]/g, "-")}.json`);
}

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

interface Row { season: number; week: number; home: string; away: string; openIso: string; actualTotal: number; closeTotal: number; }

// ── stats helpers ────────────────────────────────────────────────────────────────
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function binomP(hits: number, n: number): number {
  if (n === 0) return 1;
  const z = (hits - n / 2) / Math.sqrt(n / 4);
  return Math.max(0, Math.min(1, 2 * (1 - normCdf(Math.abs(z)))));
}
function wilson(hits: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const p = hits / n, z = 1.96, z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [center - half, center + half];
}

// Settle a side at a line: 1 win, 0 loss, null push.
function settleUnder(actual: number, line: number): 0 | 1 | null {
  if (actual === line) return null;
  return actual < line ? 1 : 0;
}

interface Tally { hits: number; n: number; pushes: number; }
function tally(): Tally { return { hits: 0, n: 0, pushes: 0 }; }
function add(t: Tally, r: 0 | 1 | null): void {
  if (r === null) { t.pushes += 1; return; }
  t.n += 1; t.hits += r;
}
function line(label: string, t: Tally): void {
  if (t.n === 0) { console.log(`  ${label.padEnd(28)} (no settled bets)`); return; }
  const rate = t.hits / t.n;
  const [lo, hi] = wilson(t.hits, t.n);
  console.log(
    `  ${label.padEnd(28)} ${String(t.n).padStart(4)} bets  ${(rate * 100).toFixed(1).padStart(5)}%  ` +
      `[${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}]  p=${binomP(t.hits, t.n).toFixed(3)}  ` +
      `${rate >= BREAK_EVEN ? "≥52.4% ✓" : "<52.4%"}  (push ${t.pushes})`,
  );
}

async function main(): Promise<void> {
  console.log(`\nCLV → profit validation — UNDER at the OPEN vs at the CLOSE`);
  console.log(`seasons ${SEASONS.join(",")}  weeks ${WEEKS.join(",")}  break-even ${BREAK_EVEN}\n`);

  const res = await fetch(GAMES_URL);
  if (!res.ok) { console.error("games.csv not reachable"); process.exit(2); }
  const lines = (await res.text()).split("\n");
  const header = lines[0]!.split(",");
  const col = (n: string) => header.indexOf(n);
  const c = {
    season: col("season"), week: col("week"), day: col("gameday"), time: col("gametime"),
    home: col("home_team"), away: col("away_team"), total: col("total"), totalLine: col("total_line"),
  };

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i]!.split(",");
    const season = Number(r[c.season]);
    if (!SEASONS.includes(season) || !WEEKS.includes(Number(r[c.week]))) continue;
    const day = r[c.day], time = r[c.time];
    const actualTotal = Number(r[c.total]);
    const closeTotal = Number(r[c.totalLine]);
    if (!day || !time || !Number.isFinite(actualTotal) || !Number.isFinite(closeTotal)) continue;
    const kickoffMs = Date.parse(`${day}T${time}:00-05:00`);
    if (!Number.isFinite(kickoffMs)) continue;
    rows.push({
      season, week: Number(r[c.week]), home: r[c.home] ?? "", away: r[c.away] ?? "",
      openIso: hourFloorIso(kickoffMs - OPEN_OFFSET_H * 3_600_000), actualTotal, closeTotal,
    });
  }

  // Read open totals from the cache and settle both ways.
  const snapCache = new Map<string, HistoricalOddsSnapshot | null>();
  function loadSnap(iso: string): HistoricalOddsSnapshot | null {
    if (snapCache.has(iso)) return snapCache.get(iso)!;
    const p = cachePath(iso);
    const v = existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as HistoricalOddsSnapshot) : null;
    snapCache.set(iso, v);
    return v;
  }

  const perSeasonOpen = new Map<number, Tally>();
  const perSeasonClose = new Map<number, Tally>();
  const pooledOpen = tally(), pooledClose = tally();
  let missingOpen = 0, matched = 0;

  for (const r of rows) {
    const snap = loadSnap(r.openIso);
    if (!snap) { missingOpen += 1; continue; }
    const home = TEAM_NAME[r.home] ?? r.home, away = TEAM_NAME[r.away] ?? r.away;
    const ev = snap.data.find((e) => e.home_team === home && e.away_team === away);
    if (!ev) { missingOpen += 1; continue; }
    const openTotal = consensusFromEvent(ev).total;
    if (openTotal == null) { missingOpen += 1; continue; }
    matched += 1;

    const so = perSeasonOpen.get(r.season) ?? tally();
    const sc = perSeasonClose.get(r.season) ?? tally();
    const ro = settleUnder(r.actualTotal, openTotal);
    const rc = settleUnder(r.actualTotal, r.closeTotal);
    add(so, ro); add(pooledOpen, ro);
    add(sc, rc); add(pooledClose, rc);
    perSeasonOpen.set(r.season, so); perSeasonClose.set(r.season, sc);
  }

  console.log(`Settled ${matched} games (missing/unmatched open: ${missingOpen}).\n`);
  console.log("UNDER bet at the OPENING total:");
  for (const s of SEASONS) line(`  ${s}`, perSeasonOpen.get(s) ?? tally());
  line("POOLED (all seasons)", pooledOpen);
  console.log("\nUNDER bet at the CLOSING total (same games, for comparison):");
  for (const s of SEASONS) line(`  ${s}`, perSeasonClose.get(s) ?? tally());
  line("POOLED (all seasons)", pooledClose);

  // Honest verdict.
  console.log("\n— Verdict —");
  const openRate = pooledOpen.n ? pooledOpen.hits / pooledOpen.n : 0;
  const closeRate = pooledClose.n ? pooledClose.hits / pooledClose.n : 0;
  if (pooledOpen.n < 100) {
    console.log(`  Sample ${pooledOpen.n} < 100 — too thin for a headline. Add weeks/seasons.`);
  } else if (openRate >= BREAK_EVEN) {
    console.log(`  UNDER-at-open settled ${(openRate * 100).toFixed(1)}% ≥ 52.4% over ${pooledOpen.n} bets.`);
    console.log(`  Same games at the CLOSE: ${(closeRate * 100).toFixed(1)}%. The open is the exploitable number.`);
    console.log(`  Still a candidate — early-season only; validate liquidity + more weeks before staking.`);
  } else {
    console.log(`  UNDER-at-open settled ${(openRate * 100).toFixed(1)}% (< 52.4%) over ${pooledOpen.n} bets.`);
    console.log(`  CLV was real but did NOT convert to a winning record here: the open→close drift`);
    console.log(`  doesn't cross enough actual outcomes to clear vig. Honest null — do not stake.`);
  }
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
