/**
 * Benchmark: latestPriorRow + callers at N=1000.
 * Pure leak-safe covariate lookup — microbenchmarked to establish a
 * throughput/latency baseline and expose any quadratic or allocation hot spots.
 */
import { bench, describe } from "vitest";

import {
  type CovariateRow,
  latestPriorRow,
  nextGameCovariate,
  sepForKickoff,
} from "../covariate-bus.js";

const STAT_TYPES = ["receiving", "passing", "rushing"] as const;
const GSIS_IDS = Array.from({ length: 12 }, (_, i) => `00-00305${String(i).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
const SEASONS = [2022, 2023, 2024];

function base(overrides: Partial<CovariateRow> = {}): CovariateRow {
  return {
    gsisId: "00-0030501-00",
    season: 2024,
    week: 1,
    statType: "receiving",
    avgSeparation: 2.5,
    avgCushion: 4.0,
    airYardsShare: 0.18,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    avgYac: 4.3,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...overrides,
  };
}

/**
 * Build N realistic rows. ~8% are week=0 (season aggregates), weeks span
 * 0..18, statType/season/gsisId are evenly mixed so the scan exercises every
 * `continue` guard. `kickoffWeek=9` places a matching week-8 target row.
 */
function makeRows(n: number): CovariateRow[] {
  const rows: CovariateRow[] = [];
  for (let i = 0; i < n; i++) {
    const roll = i % 10;
    const week =
      roll === 0
        ? 0 // season aggregate — filtered by week===0 and week<=0 guards
        : roll <= 2
          ? 10 + (i % 9) // future/same-week (>= kickoff = 9) — filtered by week>=kickoff guard
          : i % 9; // eligible prior weeks 1..8
    rows.push(
      base({
        gsisId: GSIS_IDS[i % GSIS_IDS.length]!,
        season: SEASONS[i % SEASONS.length],
        statType: STAT_TYPES[i % STAT_TYPES.length],
        week,
        avgSeparation: 1 + (i % 50) * 0.1,
      }),
    );
  }
  // Guarantee a matching week-8 target for the primary scan case.
  rows.push(
    base({
      gsisId: GSIS_IDS[0]!,
      season: 2024,
      week: 8,
      statType: "receiving",
      avgSeparation: 3.3,
    }),
  );
  return rows;
}

const N = 1000;
const rows = makeRows(N);
const targetId = GSIS_IDS[0]!;

describe(`latestPriorRow @ N=${N}`, () => {
  bench("linear scan — target present (week 8, kickoff 9)", () => {
    const r = latestPriorRow(rows, targetId, 2024, "receiving", 9);
    if (r === null || r.week !== 8) throw new Error("regression: expected week 8");
  });

  bench("worst case — scan returns null (no prior per-game row)", () => {
    // kickoffWeek=1: nothing strictly prior can match → full scan of all N.
    const r = latestPriorRow(rows, targetId, 2024, "receiving", 1);
    if (r !== null) throw new Error("regression: expected null");
  });

  bench("full-stack caller — nextGameCovariate (avgSeparation)", () => {
    const c = nextGameCovariate(rows, targetId, 2024, 9, "receiving", "avgSeparation");
    if (c === null || c.value !== 3.3) throw new Error("regression: expected 3.3");
  });

  bench("full-stack caller — sepForKickoff", () => {
    const c = sepForKickoff(rows, targetId, 2024, 9);
    if (c === null || c.value !== 3.3) throw new Error("regression: expected 3.3");
  });
});
