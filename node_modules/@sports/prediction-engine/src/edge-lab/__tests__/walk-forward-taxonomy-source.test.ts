import { describe, it, expect } from "vitest";
import {
  realGameContextFromPreGame,
  settledHistoricalPickToTaxonomyRow,
  nflverseScheduleRowsToTaxonomyRows,
} from "../walk-forward-taxonomy-source.js";
import { runWalkForwardTaxonomy, type WalkForwardTaxonomyRow } from "../walk-forward-taxonomy.js";
import {
  assemblePreGameFeatures,
  replayAndSettleGame,
  type RawScheduleRow,
} from "../../historical-replay.js";

// A representative settled nflverse `schedules` row — same shape and
// convention as historical-replay.test.ts's baseRow(): KC home, favored by 3
// (home-perspective spread_line = -3), total 47, KC ML -150 / DET +130, rest
// 7/7, final 27-20 (KC by 7). This is REAL in mechanism (real nflverse
// `schedules` column shape, real frozen scorer, real settlement) even though
// the specific line/score combination here is illustrative rather than a
// citation-checked box score — exactly the same convention the existing
// historical-replay test suite already uses for this fixture.
function baseRow(overrides: Partial<RawScheduleRow> = {}): RawScheduleRow {
  return {
    gameKey: "2023_05_DET_KC",
    season: 2023,
    week: 5,
    gameType: "REG",
    homeTeam: "KC",
    awayTeam: "DET",
    commenceTime: "2023-10-08T17:00:00.000Z",
    spreadLine: -3,
    totalLine: 47,
    homeMoneyline: -150,
    awayMoneyline: 130,
    restHome: 7,
    restAway: 7,
    homeScore: 27,
    awayScore: 20,
    result: 7,
    ...overrides,
  };
}

describe("walk-forward-taxonomy-source: REAL nflverse-backed wiring (context-only)", () => {
  it("realGameContextFromPreGame derives a real, non-invented context for the home favorite", () => {
    const features = assemblePreGameFeatures({ ...baseRow(), homeScore: null, awayScore: null, result: null });
    const ctx = realGameContextFromPreGame(features, /* isHomeSelection */ true);
    expect(ctx).toEqual({ isHome: true, isFavorite: true, restDays: 7 });
  });

  it("realGameContextFromPreGame derives the mirrored underdog context for the away side", () => {
    const features = assemblePreGameFeatures({ ...baseRow(), homeScore: null, awayScore: null, result: null });
    const ctx = realGameContextFromPreGame(features, /* isHomeSelection */ false);
    expect(ctx).toEqual({ isHome: false, isFavorite: false, restDays: 7 });
  });

  it("falls back to the moneyline sign when there is no spread line", () => {
    const features = assemblePreGameFeatures({
      ...baseRow({ spreadLine: null, homeMoneyline: -200, awayMoneyline: 170 }),
      homeScore: null,
      awayScore: null,
      result: null,
    });
    const ctx = realGameContextFromPreGame(features, true);
    expect(ctx).toEqual({ isHome: true, isFavorite: true, restDays: 7 });
  });

  it("never invents a favorite for a true pick'em (no spread, no moneyline) — returns null", () => {
    const features = assemblePreGameFeatures({
      ...baseRow({ spreadLine: 0, homeMoneyline: null, awayMoneyline: null }),
      homeScore: null,
      awayScore: null,
      result: null,
    });
    expect(realGameContextFromPreGame(features, true)).toBeNull();
    expect(realGameContextFromPreGame(features, false)).toBeNull();
  });

  it("never invents rest days when the schedule row lacks them — returns null", () => {
    const features = assemblePreGameFeatures({
      ...baseRow({ restHome: null, restAway: null }),
      homeScore: null,
      awayScore: null,
      result: null,
    });
    expect(realGameContextFromPreGame(features, true)).toBeNull();
  });

  it("nflverseScheduleRowsToTaxonomyRows produces real rows with context but WITHOUT covered/width/residual", () => {
    const rows = nflverseScheduleRowsToTaxonomyRows([baseRow()]);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.context).toEqual({ isHome: true, isFavorite: true, restDays: 7 });
      // The honest limit of this adapter (see module doc): real context, but
      // no fabricated coverage/width/residual.
      expect(row.covered).toBeUndefined();
      expect(row.width).toBeUndefined();
      expect(row.residual).toBeUndefined();
      expect(row.rowId).toContain("2023_05_DET_KC");
    }
  });

  it("an unplayed game (no final score) contributes nothing — never guessed", () => {
    const rows = nflverseScheduleRowsToTaxonomyRows([
      baseRow({ homeScore: null, awayScore: null, result: null }),
    ]);
    expect(rows).toEqual([]);
  });

  it("a settled pick'em game (no honest favorite signal) is dropped at the per-pick level, not fabricated", () => {
    // Settled (has a final score) but the lines cannot honestly distinguish a
    // favorite — this exercises the per-pick context-drop path specifically,
    // as opposed to the "never settled" path above.
    const pickEmRow = baseRow({ spreadLine: 0, homeMoneyline: null, awayMoneyline: null });
    // Confirm this game DOES settle at least one pick upstream (so the empty
    // result below is really the context guard, not an empty settlement).
    expect(replayAndSettleGame(pickEmRow).length).toBeGreaterThan(0);
    const rows = nflverseScheduleRowsToTaxonomyRows([pickEmRow]);
    expect(rows).toEqual([]);
  });

  it("feeding real rows through the UNMODIFIED runWalkForwardTaxonomy keeps the never-invent contract end to end", () => {
    const rows = nflverseScheduleRowsToTaxonomyRows([
      baseRow(),
      baseRow({ gameKey: "2023_06_DET_KC", week: 6, homeScore: 30, awayScore: 24, result: 6 }),
    ]);
    expect(rows.length).toBeGreaterThan(0);
    const report = runWalkForwardTaxonomy(rows, { minSamplesForTrust: 1 });
    expect(report.totalRows).toBe(rows.length);
    // No row supplied covered/width, so the harness must not invent them —
    // same contract walk-forward-taxonomy.test.ts already asserts.
    expect(report.overallCoverage).toBeNull();
    expect(report.overallMeanWidth).toBeNull();
    const homeFav = report.perCategory.find((c) => c.category === "home|favorite");
    expect(homeFav).toBeDefined();
    expect(homeFav!.sampleSize).toBeGreaterThan(0);
  });

  it("settledHistoricalPickToTaxonomyRow round-trips a single settled pick honestly", () => {
    const features = assemblePreGameFeatures({ ...baseRow(), homeScore: null, awayScore: null, result: null });
    const [settledPick] = replayAndSettleGame(baseRow());
    expect(settledPick).toBeDefined();
    const row = settledHistoricalPickToTaxonomyRow(settledPick!, features);
    expect(row).not.toBeNull();
    expect(row!.rowId).toBe(settledPick!.idempotencyKey);
  });
});

// ============================================================
// SYNTHETIC fixture — NOT measured, NOT real replay data.
// ============================================================
//
// `nflverseScheduleRowsToTaxonomyRows` above is real but, by design (see
// walk-forward-taxonomy-source.ts's module doc), context-only: no in-repo
// source yet supplies genuine, calibrated, pre-outcome coverage/width for
// game-level Mondrian strata (that requires a real replay source — HEOS —
// wired through PAV/IVAP/CVAP/selective-gate, which is founder-gated behind
// PR #226; see docs/ops/WORK_PLAN_2026-07-28_VISION_ALIGNED.md WS5/WS6/WS1).
//
// `syntheticReplayRows` below is FABRICATED test fixture data used ONLY to
// exercise `runWalkForwardTaxonomy`'s alerting surface (underpowered /
// under_coverage / wide_intervals) end to end. Every numeric value here
// (covered/width/residual) is invented for test coverage, not measured from
// any real model or any real settled outcome. It MUST NEVER be presented,
// logged, or surfaced anywhere as a real coverage/width/performance figure —
// every row is namespaced "synthetic:" for exactly that reason, and this
// block lives only in a test file, never in production wiring.
function syntheticRow(
  overrides: Partial<WalkForwardTaxonomyRow> & { readonly context: WalkForwardTaxonomyRow["context"] },
  idx: number,
): WalkForwardTaxonomyRow {
  return {
    rowId: `synthetic:${idx}`,
    covered: true,
    width: 0.1,
    ...overrides,
  };
}

export const syntheticReplayRows: readonly WalkForwardTaxonomyRow[] = [
  // 40 well-powered "home|favorite" rows, mostly covered, normal width —
  // should NOT trip underpowered / under_coverage / wide_intervals.
  ...Array.from({ length: 40 }, (_, i) =>
    syntheticRow(
      { context: { isHome: true, isFavorite: true, restDays: 6 }, covered: i % 10 !== 0, width: 0.12 },
      i,
    ),
  ),
  // 40 "away|underdog" rows with wide intervals and poor coverage — SHOULD
  // trip both under_coverage and wide_intervals.
  ...Array.from({ length: 40 }, (_, i) =>
    syntheticRow(
      { context: { isHome: false, isFavorite: false, restDays: 4 }, covered: i % 2 === 0, width: 0.4 },
      40 + i,
    ),
  ),
  // 5 "home|underdog" rows — below minSamplesForTrust=30, SHOULD trip
  // underpowered only.
  ...Array.from({ length: 5 }, (_, i) =>
    syntheticRow({ context: { isHome: true, isFavorite: false, restDays: 5 }, covered: true, width: 0.1 }, 80 + i),
  ),
] as const;

describe("syntheticReplayRows: SYNTHETIC fixture, not measured", () => {
  it("every row is namespaced synthetic: — never mistakable for a real rowId", () => {
    for (const row of syntheticReplayRows) {
      expect(row.rowId).toMatch(/^synthetic:/);
    }
  });

  it("exercises the full alerting surface (underpowered, under_coverage, wide_intervals) via the UNMODIFIED harness", () => {
    const report = runWalkForwardTaxonomy(syntheticReplayRows, {
      minSamplesForTrust: 30,
      targetCoverage: 0.9,
      coverageSlack: 0.05,
    });
    expect(report.totalRows).toBe(syntheticReplayRows.length);
    expect(report.underpowered).toContain("home|underdog");
    expect(report.underCoverage).toContain("away|underdog");
    expect(report.alerts.some((a) => a.kind === "wide_intervals" && a.category === "away|underdog")).toBe(true);
    // The well-behaved stratum should NOT be flagged for coverage or width.
    expect(report.underCoverage).not.toContain("home|favorite");
  });
});
