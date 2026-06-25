/**
 * PLAYER-PROP efficiency probe — is the prop market softer than sides/totals?
 *
 * Sides/totals closing lines are efficient (proven: 0/16 angles over 27 seasons; the
 * under "edge" died on settlement). Player props are LESS shopped and LESS sharp, so a
 * systematic over/under bias may survive at the close. This probe pulls historical
 * CLOSING prop lines, settles them against real nflverse player stats, and asks per
 * market: does betting the better side clear the 52.4% break-even — FDR-controlled?
 *
 * Honest by construction: pushes excluded, DNP players skipped (reported), minimum-sample
 * floor, Benjamini-Hochberg across the market family. A bias that survives here is a
 * CANDIDATE that must then replicate out-of-sample (a different season) — exactly the
 * gauntlet that killed the under.
 *
 * SPEND DISCIPLINE: prints the credit cost, refuses to exceed --max-credits without --yes,
 * caches every call (re-runs cost zero). Prop history exists from 2023-05-03.
 *
 * RUN:
 *   THE_ODDS_API_KEY=... npx tsx scripts/backtest/prop-efficiency-probe.ts \
 *     --season 2024 --weeks 1,2,3,4 --yes
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  OddsApiClient,
  type HistoricalEventsSnapshot,
  type HistoricalEventOddsSnapshot,
} from "../../packages/data-ingestion/src/odds-api-client.js";
import { median } from "../../packages/prediction-engine/src/clv-feasibility.js";
import { benjaminiHochberg, type PValueEntry } from "../../packages/prediction-engine/src/multiple-testing.js";

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const STATS_URL = (season: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_${season}.csv`;
const SPORT = "americanfootball_nfl" as const;
const BREAK_EVEN = 0.524;
const CLOSE_OFFSET_H = 1.5;
const MIN_SAMPLE = 100;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const SEASON = Number(arg("season") ?? 2024);
const WEEKS = (arg("weeks") ?? "1,2,3,4").split(",").map(Number).filter(Number.isInteger);
const MARKETS = (arg("markets") ?? "player_pass_yds,player_rush_yds,player_reception_yds").split(",");
const MAX_CREDITS = Number(arg("max-credits") ?? 2500);
const AUTHORIZED = flag("yes");
const CACHE_DIR = process.env["PROP_CACHE_DIR"] ?? join(process.env["TMPDIR"] ?? "/tmp", "prop-efficiency-cache");

// market key → nflverse stat column used to settle it
const STAT_FOR_MARKET: Record<string, string> = {
  player_pass_yds: "passing_yards",
  player_rush_yds: "rushing_yards",
  player_reception_yds: "receiving_yards",
  player_receptions: "receptions",
  player_pass_tds: "passing_tds",
};

function hourFloorIso(ms: number): string {
  return new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
}
function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

interface Game { home: string; away: string; closeIso: string; week: number; }

// Quote-aware CSV line parser — nflverse quotes fields that contain commas, so a naive
// split(",") shifts every column. Handles "" escapes; assumes no embedded newlines.
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
function parseCsvRows(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split("\n");
  const header = parseLine(lines[0]!.replace(/\r$/, ""));
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = parseLine(lines[i]!.replace(/\r$/, ""));
    if (cells.length >= header.length) rows.push(cells);
  }
  return { header, rows };
}

// ── stats ────────────────────────────────────────────────────────────────────────
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
  const p = hits / n, z = 1.96, z2 = z * z, denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [center - half, center + half];
}

async function main(): Promise<void> {
  console.log(`\nPLAYER-PROP efficiency probe — NFL ${SEASON} wks ${WEEKS.join(",")}`);
  console.log(`markets=${MARKETS.join(",")}  close≈T-${CLOSE_OFFSET_H}h  region=us\n`);

  // 1) settle map: normName|week → stat columns
  const statsRes = await fetch(STATS_URL(SEASON));
  if (!statsRes.ok) { console.error(`player_stats_${SEASON}.csv not reachable (${statsRes.status})`); process.exit(2); }
  const { header: sh, rows: srows } = parseCsvRows(await statsRes.text());
  const sc = (n: string) => sh.indexOf(n);
  const ciName = sc("player_display_name"), ciWeek = sc("week");
  const statCols = new Map(Object.values(STAT_FOR_MARKET).map((c) => [c, sc(c)]));
  const settle = new Map<string, Record<string, number>>();
  for (const r of srows) {
    // Match purely on player + week. Weeks 1-18 are regular season (POST is 19+), so for
    // early weeks there is no ambiguity and we avoid any season_type encoding mismatch.
    const name = r[ciName]; const wk = Number(r[ciWeek]);
    if (!name || !Number.isFinite(wk)) continue;
    const rec: Record<string, number> = {};
    for (const [col, idx] of statCols) rec[col] = idx >= 0 ? Number(r[idx] ?? 0) || 0 : 0;
    settle.set(`${normName(name)}|${wk}`, rec);
  }
  console.log(`Loaded ${settle.size} player-week stat rows.`);

  // 2) schedule
  const gamesRes = await fetch(GAMES_URL);
  if (!gamesRes.ok) { console.error("games.csv not reachable"); process.exit(2); }
  const { header: gh, rows: grows } = parseCsvRows(await gamesRes.text());
  const gc = (n: string) => gh.indexOf(n);
  const games: Game[] = [];
  for (const r of grows) {
    if (Number(r[gc("season")]) !== SEASON || !WEEKS.includes(Number(r[gc("week")]))) continue;
    const day = r[gc("gameday")], time = r[gc("gametime")];
    if (!day || !time) continue;
    const ms = Date.parse(`${day}T${time}:00-05:00`);
    if (!Number.isFinite(ms)) continue;
    games.push({
      home: r[gc("home_team")] ?? "", away: r[gc("away_team")] ?? "",
      closeIso: hourFloorIso(ms - CLOSE_OFFSET_H * 3_600_000), week: Number(r[gc("week")]),
    });
  }
  console.log(`Games: ${games.length}`);

  // cost plan
  const distinctCloses = new Set(games.map((g) => g.closeIso));
  const eventsToFetch = [...distinctCloses].filter((iso) => !existsSync(join(CACHE_DIR, `events_${iso.replace(/[:.]/g, "-")}.json`))).length;
  const oddsToFetch = games.filter((g) => !existsSync(join(CACHE_DIR, `odds_${g.away}_${g.home}_${g.closeIso}`.replace(/[:.\/ ]/g, "-") + ".json"))).length;
  const estCredits = eventsToFetch * 1 + oddsToFetch * 10 * MARKETS.length;
  console.log(`Estimated cost: ${estCredits} credits (events ${eventsToFetch}×1 + odds ${oddsToFetch}×${10 * MARKETS.length}). Cache: ${CACHE_DIR}\n`);

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) { console.log("DRY-RUN — no THE_ODDS_API_KEY. Plan only.\n"); return; }
  if (estCredits > MAX_CREDITS && !AUTHORIZED) { console.error(`Refusing ${estCredits} > --max-credits ${MAX_CREDITS}. Add --yes or narrow.\n`); process.exit(3); }
  if (estCredits > 0 && !AUTHORIZED) { console.error(`Would spend ${estCredits}. Add --yes.\n`); process.exit(3); }

  const client = new OddsApiClient(apiKey);
  mkdirSync(CACHE_DIR, { recursive: true });
  let lastRemaining = 0, paidCalls = 0;

  async function eventsAt(iso: string): Promise<HistoricalEventsSnapshot> {
    const p = join(CACHE_DIR, `events_${iso.replace(/[:.]/g, "-")}.json`);
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
    const r = await client.getHistoricalEvents(SPORT, iso); paidCalls++; lastRemaining = r.remainingRequests;
    writeFileSync(p, JSON.stringify(r.data)); return r.data;
  }
  async function oddsFor(g: Game, eventId: string): Promise<HistoricalEventOddsSnapshot | null> {
    const p = join(CACHE_DIR, `odds_${g.away}_${g.home}_${g.closeIso}`.replace(/[:.\/ ]/g, "-") + ".json");
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
    try {
      const r = await client.getHistoricalEventOdds(SPORT, eventId, MARKETS, g.closeIso); paidCalls++; lastRemaining = r.remainingRequests;
      writeFileSync(p, JSON.stringify(r.data)); return r.data;
    } catch (e) { console.error(`  odds fail ${g.away}@${g.home}: ${e instanceof Error ? e.message : e}`); return null; }
  }

  // 3) per market tallies
  type T = { over: number; under: number; push: number; unmatched: number };
  const tally: Record<string, T> = {};
  for (const m of MARKETS) tally[m] = { over: 0, under: 0, push: 0, unmatched: 0 };
  let gamesMatched = 0, gamesNoEvent = 0;

  for (const g of games) {
    const evs = await eventsAt(g.closeIso);
    const home = TEAM_NAME[g.home] ?? g.home, away = TEAM_NAME[g.away] ?? g.away;
    const ev = evs.data.find((e) => e.home_team === home && e.away_team === away);
    if (!ev) { gamesNoEvent++; continue; }
    const odds = await oddsFor(g, ev.id);
    if (!odds) continue;
    gamesMatched++;

    // collect median line per (market, player)
    const linesByMarket: Record<string, Map<string, number[]>> = {};
    for (const m of MARKETS) linesByMarket[m] = new Map();
    for (const book of odds.data.bookmakers ?? []) {
      for (const mk of book.markets ?? []) {
        if (!MARKETS.includes(mk.key)) continue;
        for (const o of mk.outcomes) {
          if (o.name !== "Over" || !o.description || typeof o.point !== "number") continue;
          const arr = linesByMarket[mk.key]!.get(o.description) ?? [];
          arr.push(o.point); linesByMarket[mk.key]!.set(o.description, arr);
        }
      }
    }
    // settle each player line
    for (const m of MARKETS) {
      const statCol = STAT_FOR_MARKET[m];
      if (!statCol) continue;
      for (const [player, pts] of linesByMarket[m]!) {
        const line = median(pts);
        if (line == null || pts.length < 2) continue; // need ≥2 books for a stable line
        const rec = settle.get(`${normName(player)}|${g.week}`);
        if (!rec) { tally[m]!.unmatched++; continue; }
        const actual = rec[statCol] ?? 0;
        if (actual === line) tally[m]!.push++;
        else if (actual > line) tally[m]!.over++;
        else tally[m]!.under++;
      }
    }
  }

  console.log(`\nGames matched: ${gamesMatched}  (no event id: ${gamesNoEvent})`);
  console.log(`Paid calls: ${paidCalls}  credits remaining: ${lastRemaining}\n`);

  // 4) per-market efficiency + FDR over the family (test the BETTER side vs 0.5)
  const fdrEntries: PValueEntry[] = [];
  const summaries: Array<{ m: string; n: number; overRate: number; betterRate: number; betterSide: string; p: number }> = [];
  for (const m of MARKETS) {
    const t = tally[m]!;
    const n = t.over + t.under;
    if (n === 0) continue;
    const overRate = t.over / n;
    const betterSide = t.over >= t.under ? "OVER" : "UNDER";
    const betterHits = Math.max(t.over, t.under);
    const p = binomP(betterHits, n);
    summaries.push({ m, n, overRate, betterRate: betterHits / n, betterSide, p });
    if (n >= MIN_SAMPLE) fdrEntries.push({ key: m, pValue: binomP(t.over, n) }); // two-sided vs 50/50
  }
  const fdr = benjaminiHochberg(fdrEntries, 0.1);
  const disc = new Map(fdr.results.map((r) => [r.key, r]));

  console.log("market                  n   over%   bias    better-side  rate   95% CI         p      FDR   beats52.4%");
  for (const s of summaries.sort((a, b) => b.betterRate - a.betterRate)) {
    const t = tally[s.m]!; const [lo, hi] = wilson(Math.max(t.over, t.under), s.n);
    const d = disc.get(s.m);
    const fdrStr = s.n < MIN_SAMPLE ? "thin" : String(d?.discovery ?? false);
    console.log(
      `${s.m.padEnd(22)} ${String(s.n).padStart(4)}  ${(s.overRate * 100).toFixed(1).padStart(5)}  ` +
        `${(s.overRate - 0.5 >= 0 ? "+" : "")}${((s.overRate - 0.5) * 100).toFixed(1).padStart(4)}   ` +
        `${s.betterSide.padEnd(6)}     ${(s.betterRate * 100).toFixed(1).padStart(5)}  ` +
        `[${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}]  ${s.p.toFixed(3)}  ${fdrStr.padStart(5)}  ${s.betterRate >= BREAK_EVEN}  (push ${t.push}, dnp ${t.unmatched})`,
    );
  }

  const winners = summaries.filter((s) => s.n >= MIN_SAMPLE && disc.get(s.m)?.discovery && s.betterRate >= BREAK_EVEN);
  console.log(`\nFDR-surviving prop biases clearing 52.4% at n≥${MIN_SAMPLE}: ${winners.length}`);
  if (winners.length === 0) {
    console.log("→ No settleable prop bias survived FDR at adequate sample. Prop closes look efficient here too,");
    console.log("  OR sample is thin. If a market is close to the bar, it earns an out-of-sample season next.\n");
  } else {
    for (const w of winners) console.log(`  • ${w.m}: bet ${w.betterSide} ${(w.betterRate * 100).toFixed(1)}% over ${w.n} (CANDIDATE — replicate on another season before reliance)`);
    console.log("");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
