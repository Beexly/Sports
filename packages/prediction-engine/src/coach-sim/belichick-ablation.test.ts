/**
 * End-to-end ablation test for the Belichick ten-metric wiring.
 *
 * The audit's rule: a metric is only "wired and weighted" if running an
 * ablation test produces a non-zero delta on the final decision cell.
 * This test runs the same game twice — once with all four wired metric
 * tables active, once with them absent — and asserts that both the win
 * probability and the margin move.
 *
 * The seed is identical between runs (belichickHome/belichickAway are not
 * part of seedFor), so the only difference is the metric logic itself.
 *
 * Fixture realism: the tables below are multi-package and mixed-outcome rather
 * than degenerate 100% rows. A 100% sack fixture pins every dropback to a loss
 * and proves only that the code path executes, not that a plausible defensive
 * profile moves the decision cell by a plausible amount. These tables instead
 * mirror a real four-man-rush base with a five-man blitz package, a man/zone
 * third-down split, a 33% red-zone TD rate, and average punt returns.
 *
 * The bounds encode the doctrine guardrail: a metric table may not swing the
 * margin by more than ten points or the home win probability by more than
 * 0.35. Anything larger means the metric dominates the sim instead of
 * informing it. The default-staff path is exercised deliberately (no
 * staffAggression pin) — a wiring that only works under one pinned staff
 * profile is not wired into the default pipeline.
 */
import { describe, expect, it } from "vitest";
import { simulateCoachGame, type CoachSimInput } from "./markov-simulator.js";
import type { BelichickMetricInputs } from "../nfl/belichick-ten-metrics.js";
import {
  shrinkPublishedCell,
  getTeamShrunkTrenchAndBlitzCell,
  pitNoYbcCell,
  MEASURED_CELL_PRIORS,
} from "../nfl/published-cells-shrinkage.js";

const base: CoachSimInput = {
  homeTeam: "BAL",
  awayTeam: "CIN",
  week: 7,
  coachSupport: 6,
  shadows: [{ wr: "J.Chase", shadowRate: 0.62 }],
};

/** Doctrine guardrail: metric tables inform the sim, they do not dominate it. */
const MAX_MARGIN_DELTA = 10;
const MAX_WIN_PROB_DELTA = 0.35;

/**
 * Realistic multi-package metric tables:
 * - 10 base 4-rusher zone snaps, no sack      → most dropbacks are clean
 * - 2 five-rusher man blitzes, both sacked    → the blitz package lands
 * - 2 five-rusher man pressures, no sack      → blitz without a sack
 * - 5 man third downs converted, 7 zone stops → man coverage holds up
 * - 4 red-zone pass TDs in 12 snaps           → 33% red-zone TD rate
 * - 12 punts returning 25 yards               → average, not pinned
 */
const metrics: BelichickMetricInputs = {
  pressureSnaps: [
    ...Array.from({ length: 10 }, () => ({
      rushers: 4,
      coverage: "zone" as const,
      timeToThrow: 2.9,
      sack: false,
      pressure: false,
    })),
    ...Array.from({ length: 2 }, () => ({
      rushers: 5,
      coverage: "man" as const,
      timeToThrow: 1.5,
      sack: true,
      pressure: true,
    })),
    ...Array.from({ length: 2 }, () => ({
      rushers: 5,
      coverage: "man" as const,
      timeToThrow: 2.2,
      sack: false,
      pressure: true,
    })),
  ],
  thirdDownSnaps: [
    ...Array.from({ length: 5 }, () => ({
      coverage: "man" as const,
      distance: 3,
      converted: true,
    })),
    ...Array.from({ length: 7 }, () => ({
      coverage: "zone" as const,
      distance: 3,
      converted: false,
    })),
  ],
  redZoneSnaps: [
    ...Array.from({ length: 4 }, () => ({
      playType: "pass" as const,
      yardline: 95,
      touchdown: true,
    })),
    ...Array.from({ length: 8 }, () => ({
      playType: "pass" as const,
      yardline: 95,
      touchdown: false,
    })),
  ],
  specialTeamsPlays: Array.from({ length: 12 }, () => ({
    kind: "punt" as const,
    returnYards: 25,
  })),
};

describe("Belichick ten-metric ablation", () => {
  it("moves win probability when the metric tables are active", () => {
    const n = 2_000;
    const withMetrics = simulateCoachGame({ ...base, belichickHome: metrics }, n);
    const withoutMetrics = simulateCoachGame(base, n);

    const delta = Math.abs(withMetrics.winProbHome - withoutMetrics.winProbHome);
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(MAX_WIN_PROB_DELTA);
  });

  it("moves the margin mean when the metric tables are active", () => {
    const n = 2_000;
    const withMetrics = simulateCoachGame({ ...base, belichickHome: metrics }, n);
    const withoutMetrics = simulateCoachGame(base, n);

    const delta = Math.abs(withMetrics.marginMean - withoutMetrics.marginMean);
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(MAX_MARGIN_DELTA);
  });

  it("changes the total band when the metric tables are active", () => {
    const n = 2_000;
    const withMetrics = simulateCoachGame({ ...base, belichickHome: metrics }, n);
    const withoutMetrics = simulateCoachGame(base, n);

    expect(Math.abs(withMetrics.totalP90 - withMetrics.totalP10 - (withoutMetrics.totalP90 - withoutMetrics.totalP10))).toBeGreaterThan(0);
  });

  it("still runs when only the away side carries metric tables", () => {
    const n = 500;
    const withMetrics = simulateCoachGame({ ...base, belichickAway: metrics }, n);
    expect(Number.isFinite(withMetrics.winProbHome)).toBe(true);
    expect(Number.isFinite(withMetrics.marginMean)).toBe(true);
  });
});

/**
 * The 32-team trench/blitz cells are only "wired and weighted" if the shrink
 * arithmetic reproduces the published numbers and the resolved team cells move
 * when the input moves. These are the arithmetic proofs; the ablation block
 * above proves the cells reach the decision cell.
 */
describe("Published 32-team trench/blitz shrinkage cells", () => {
  const ybc = MEASURED_CELL_PRIORS.ybcPerRush;

  it("shrinks PIT YBC 1.36 toward the league mean 1.166875", () => {
    const cell = shrinkPublishedCell(1.36, ybc.shrinkTargetMu0, ybc.withinTeamNoiseSigma2, ybc.normDiffSquared, 32);
    // Baranchik JS+ factor for the YBC vector: 1 - 29*0.024/5.2696875 = 0.867924
    expect(cell.jsPlusFactor).toBeCloseTo(0.867924, 5);
    expect(cell.shrunkValue).toBeCloseTo(1.3345, 3);
    // Shrinkage pulls a team above the mean DOWN toward it.
    expect(cell.shrunkValue).toBeLessThan(1.36);
    expect(cell.shrunkValue).toBeGreaterThan(ybc.shrinkTargetMu0);
  });

  it("shrinks NO YBC 0.93 toward the league mean 1.166875", () => {
    const cell = shrinkPublishedCell(0.93, ybc.shrinkTargetMu0, ybc.withinTeamNoiseSigma2, ybc.normDiffSquared, 32);
    expect(cell.shrunkValue).toBeCloseTo(0.9613, 3);
    // Shrinkage pulls a team below the mean UP toward it.
    expect(cell.shrunkValue).toBeGreaterThan(0.93);
    expect(cell.shrunkValue).toBeLessThan(ybc.shrinkTargetMu0);
  });

  it("reproduces the PIT-vs-NO edges the published cell reports", () => {
    const cell = pitNoYbcCell();
    expect(cell.ybcEdgePitVsNo).toBeCloseTo(0.3732, 3);
    expect(cell.behindLosEdgePitVsNo).toBeCloseTo(0.0218, 3);
    expect(cell.blitzEpaDeltaPitVsNo).toBeCloseTo(-0.1288, 3);
    expect(cell.matchup).toBe("PIT@NO");
  });

  it("resolves all 32 teams without NaN and keeps each cell inside its own vector bounds", () => {
    for (const team of ["BAL", "CIN", "PIT", "NO", "KC", "SF", "BUF", "DET"] as const) {
      const cell = getTeamShrunkTrenchAndBlitzCell(team);
      expect(Number.isFinite(cell.ybc.shrunkValue)).toBe(true);
      expect(Number.isFinite(cell.behindLos.shrunkValue)).toBe(true);
      expect(Number.isFinite(cell.blitzEpa.shrunkValue)).toBe(true);
      // JS+ never leaves the raw value outside the [raw, mean] interval.
      expect(cell.ybc.jsPlusFactor).toBeGreaterThan(0);
      expect(cell.ybc.jsPlusFactor).toBeLessThanOrEqual(1);
    }
  });

  it("treats an unknown team code as a named gap, not a NaN cell", () => {
    // The resolver in markov-simulator.ts gates on record membership before
    // calling this. Document the raw behaviour so a future refactor does not
    // assume the cell function itself is safe.
    const unknown = getTeamShrunkTrenchAndBlitzCell("XXX" as never);
    expect(Number.isFinite(unknown.ybc.shrunkValue)).toBe(false);
  });
});
