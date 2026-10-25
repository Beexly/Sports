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
