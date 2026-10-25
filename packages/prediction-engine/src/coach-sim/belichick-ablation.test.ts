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
 */
import { describe, expect, it } from "vitest";
import { simulateCoachGame, type CoachSimInput } from "./markov-simulator.js";
import type { BelichickMetricInputs } from "../nfl/belichick-ten-metrics.js";

const base: CoachSimInput = {
  homeTeam: "BAL",
  awayTeam: "CIN",
  week: 7,
  coachSupport: 6,
  staffAggression: 0.75,
  shadows: [{ wr: "J.Chase", shadowRate: 0.62 }],
};

/**
 * Extreme metric tables so the delta is unambiguous:
 * - every dropback is a sub-2.0s sack        → quickPressureSackRate = 1.0
 * - every third down converts                → thirdDownConvProb = 1.0
 * - every red-zone trip scores               → redZoneTdRate = 1.0
 * - every punt pins the returner at the 40   → drive start = 40, not 25
 */
const metrics: BelichickMetricInputs = {
  pressureSnaps: Array.from({ length: 12 }, () => ({
    rushers: 5,
    coverage: "man" as const,
    timeToThrow: 1.4,
    sack: true,
    pressure: true,
  })),
  thirdDownSnaps: Array.from({ length: 12 }, () => ({
    coverage: "man" as const,
    distance: 3,
    converted: true,
  })),
  redZoneSnaps: Array.from({ length: 12 }, () => ({
    playType: "pass" as const,
    yardline: 95,
    touchdown: true,
  })),
  specialTeamsPlays: Array.from({ length: 12 }, () => ({
    kind: "punt" as const,
    returnYards: 10,
  })),
};

describe("Belichick ten-metric ablation", () => {
  it("moves win probability when the metric tables are active", () => {
    const n = 2_000;
    const withMetrics = simulateCoachGame({ ...base, belichickHome: metrics }, n);
    const withoutMetrics = simulateCoachGame(base, n);

    expect(Math.abs(withMetrics.winProbHome - withoutMetrics.winProbHome)).toBeGreaterThan(0);
  });

  it("moves the margin mean when the metric tables are active", () => {
    const n = 2_000;
    const withMetrics = simulateCoachGame({ ...base, belichickHome: metrics }, n);
    const withoutMetrics = simulateCoachGame(base, n);

    expect(Math.abs(withMetrics.marginMean - withoutMetrics.marginMean)).toBeGreaterThan(0);
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
