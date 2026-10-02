/**
 * Emits three real reasoning traces as saved artifacts — MONEYLINE, SPREAD and
 * TOTAL — from the same fixtures the test suite uses, so the committed traces
 * and the passing tests cannot drift apart.
 *
 * Run from packages/prediction-engine:
 *   ../../node_modules/.bin/tsx src/__tests__/traces/emit-traces.mts
 *
 * Output: src/__tests__/traces/{moneyline,spread,total}.trace.{txt,json}
 *
 * These are REAL emitted traces from REAL scorer output. Nothing here is
 * hand-written, and no calibration map is fitted: the TOTAL and SPREAD fixtures
 * supply none, and the MONEYLINE fixture's seam is explicitly ABSENT so the
 * trace shows the "absent means unchanged" LAW holding.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { scoreGame } from "../../scoring.js";
import { buildReasoningTrace } from "../../reasoning-trace.js";
import { renderReasoningTrace } from "../../reasoning-trace-render.js";
import { SKELLAM_COVER_SOURCE } from "../../skellam.js";
import type { GameContextInput, OddsInput, ScoredPick } from "@sports/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const AT = new Date("2026-04-15T12:00:00Z");

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];
const FIVE_BOOKS = TEN_BOOKS.slice(0, 5);

// ── 1. MONEYLINE ────────────────────────────────────────────────────────────
// Ten books, heavy home favourite. Two independent sources AGREE and both
// price the side above the book's own fair value, so the seam-adjacent
// independent path is live. NO calibrator is supplied, so the calibration seam
// is ABSENT and the trace must show the published probability unchanged.
const MONEYLINE: OddsInput = {
  gameId: "trace-ml-chiefs-eagles",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
    bookmaker,
    market: "H2H" as const,
    homePrice: -800,
    awayPrice: 650,
  })),
  context: {
    bookmakerCoverageMax: TEN_BOOKS.length,
    independentFairValues: [
      { source: "kalshi", homeFairProb: 0.93, awayFairProb: 0.07 },
      { source: "poisson", homeFairProb: 0.92, awayFairProb: 0.08 },
    ],
    // Rest and ATS buckets are supplied AND GATED so the trace shows both halves:
    // rest reads 2 days HOME vs 4 AWAY (fires), the AWAY ATS bucket is the
    // unpicked side (never read), and the H2H bucket is below the neutral band.
    restDaysHome: 2,
    restDaysAway: 4,
    homeAtsForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
    awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
    headToHeadForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
  },
};

// ── 2. SPREAD ───────────────────────────────────────────────────────────────
// Five books at a fixed -1.5 line. A real H2H market rides along so the scorer
// DERIVES its own cross-market moneyline and the +4 agreement factor actually
// fires — and is then excluded from confidence by the market-echo guard. A
// supplied context.mlFairProbHome is included deliberately so the trace records
// that the engine discarded it. The venue split fails the 5-game minimum.
const SPREAD: OddsInput = {
  gameId: "trace-spread-bruins-leafs",
  homeTeam: "Bruins",
  awayTeam: "Leafs",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NHL",
  bookmakerOdds: [
    ...FIVE_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: -1.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
    ...TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -500,
      awayPrice: 450,
    })),
  ],
  context: {
    bookmakerCoverageMax: FIVE_BOOKS.length,
    independentFairValues: [
      {
        source: SKELLAM_COVER_SOURCE,
        homeFairProb: 0.71,
        awayFairProb: 0.29,
      },
    ],
    mlFairProbHome: 0.9,
    restDaysHome: 3,
    restDaysAway: 3,
    homeAtsForm: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
    awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
    // 3 decided games: below the 5-game venue minimum, so it is gated.
    homeAtsFormAtHome: { wins: 2, losses: 1, pushes: 0, sampleSize: 3 },
    headToHeadForm: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
    // Equal densities: below the 2-game asymmetry gate.
    scheduleDensityHome: 2,
    scheduleDensityAway: 2,
    openingSpread: -1.0,
    currentSpread: -1.5,
  },
};

// ── 3. TOTAL ────────────────────────────────────────────────────────────────
// Ten books at 224.5 with a +2.0 line move that fires. Side-specific inputs
// (rest, ATS, H2H, schedule density) are ALL supplied and ALL structurally
// unread for a total — the clearest possible demonstration of the negative
// space the flat factor list cannot express. A kalshi fair value rides along
// that the TOTAL scorer never consults at all.
const TOTAL: OddsInput = {
  gameId: "trace-total-celtics-heat",
  homeTeam: "Celtics",
  awayTeam: "Heat",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NBA",
  bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
    bookmaker,
    market: "TOTALS" as const,
    total: 224.5,
    overPrice: -110,
    underPrice: -110,
  })),
  context: {
    bookmakerCoverageMax: TEN_BOOKS.length,
    openingTotal: 223.5,
    currentTotal: 225.5,
    restDaysHome: 3,
    restDaysAway: 1,
    homeAtsForm: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
    headToHeadForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
    scheduleDensityHome: 5,
    scheduleDensityAway: 1,
    independentFairValues: [
      { source: "kalshi", homeFairProb: 0.5, awayFairProb: 0.5 },
    ],
  },
};

const CASES: Array<{ slug: string; input: OddsInput; type: ScoredPick["pickType"] }> = [
  { slug: "moneyline", input: MONEYLINE, type: "MONEYLINE" },
  { slug: "spread", input: SPREAD, type: "SPREAD" },
  { slug: "total", input: TOTAL, type: "TOTAL" },
];

mkdirSync(HERE, { recursive: true });

let failures = 0;
for (const { slug, input, type } of CASES) {
  const pick = scoreGame(input, AT).find((p) => p.pickType === type);
  if (!pick) {
    console.error(`FAIL ${slug}: no ${type} pick produced`);
    failures++;
    continue;
  }
  const trace = buildReasoningTrace(pick, input);

  // Refuse to save a trace that does not reconcile: a non-reconciling trace is
  // an engine finding to report, not an artifact to publish.
  if (!trace.arithmetic.reconciles) {
    console.error(
      `FAIL ${slug}: trace did NOT reconcile (rebuilt ${Math.round(trace.arithmetic.clampedSum)} vs published ${pick.confidence}, residual ${trace.arithmetic.residual})`,
    );
    failures++;
    continue;
  }
  if (trace.calibrationSeam.fittedAtRuntime !== false) {
    console.error(`FAIL ${slug}: trace claims it fitted a calibration map`);
    failures++;
    continue;
  }

  const header =
    `# Reasoning trace — ${type}\n` +
    `# Emitted by src/__tests__/traces/emit-traces.mts from real scoreGame() output.\n` +
    `# gameId=${input.gameId}  modelVersion=${pick.modelVersion}  asOf=${AT.toISOString()}\n` +
    `# confidence=${pick.confidence}  rankingScore=${pick.rankingScore}  tier=${pick.tier}\n` +
    `# arithmetic reconciles: yes (residual 0)  calibration seam: ${trace.calibrationSeam.present ? "PRESENT" : "ABSENT — unchanged by law"}  fitted here: no\n`;

  writeFileSync(join(HERE, `${slug}.trace.txt`), `${header}\n${renderReasoningTrace(trace)}\n`);
  writeFileSync(join(HERE, `${slug}.trace.json`), `${JSON.stringify(trace, null, 2)}\n`);

  console.log(
    `OK ${slug.padEnd(10)} ${type.padEnd(9)} conf=${String(pick.confidence).padStart(3)} ` +
      `rank=${String(trace.ranking.rankingScore).padStart(3)} ` +
      `fired=${trace.fired.length} suppressed=${trace.suppressed.length} ` +
      `seam=${trace.calibrationSeam.present ? "present" : "absent"} ` +
      `reconciles=${trace.arithmetic.reconciles} unresolved=${trace.unresolved.length}`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} trace(s) refused. Nothing false was written.`);
  process.exit(1);
}
console.log(`\nWrote ${CASES.length} traces (txt + json) to ${HERE}`);