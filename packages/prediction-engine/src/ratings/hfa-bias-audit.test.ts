import { describe, expect, it } from "vitest";
import {
  hfaBiasAudit,
  mixedEffectsHFA,
  simulateNonrandomSchedule,
  teamFixedEffectsHFA,
  unadjustedHFA,
  type HFAGame,
} from "./hfa-bias-audit";

const TRUE_GAMMA = 3;

/** Mean estimation error of an estimator across replications. */
function meanError(
  hostBias: number,
  estimate: (games: HFAGame[]) => number,
  reps = 15,
): number {
  let err = 0;
  for (let s = 0; s < reps; s++) {
    const { games } = simulateNonrandomSchedule({ hostBias, seed: 1000 + s });
    err += estimate(games) - TRUE_GAMMA;
  }
  return err / reps;
}

describe("hfa-bias-audit", () => {
  it("unadjusted HFA is biased upward under nonrandom scheduling; mixed-effects recovers the truth", () => {
    const naiveBias = meanError(0.9, unadjustedHFA);
    const mixedBias = meanError(0.9, (g) => mixedEffectsHFA(g).gamma);
    const feBias = meanError(0.9, (g) => teamFixedEffectsHFA(g).gamma);
    // Paper's phenomenon: strong teams host more -> pooled mean overstates HFA.
    expect(naiveBias).toBeGreaterThan(1.5);
    // Mixed-effects (random team intercepts) recovers ~truth.
    expect(Math.abs(mixedBias)).toBeLessThan(0.75);
    expect(Math.abs(mixedBias)).toBeLessThan(Math.abs(naiveBias) / 2);
    // Team-FE reference is unbiased too (noisier in short panels).
    expect(Math.abs(feBias)).toBeLessThan(1.0);
  });

  it("all estimators agree under a balanced schedule", () => {
    const naiveBias = meanError(0, unadjustedHFA, 10);
    const mixedBias = meanError(0, (g) => mixedEffectsHFA(g).gamma, 10);
    expect(Math.abs(naiveBias)).toBeLessThan(0.75);
    expect(Math.abs(mixedBias)).toBeLessThan(0.75);
  });

  it("audit flags material disagreement under nonrandom scheduling", () => {
    const { games } = simulateNonrandomSchedule({ hostBias: 0.9, seed: 7 });
    const audit = hfaBiasAudit(games, 0.5);
    expect(audit.material).toBe(true);
    // Mixed < unadjusted: the gap exposes the upward scheduling bias.
    expect(audit.gap).toBeLessThan(0);
    expect(audit.unadjusted).toBeGreaterThan(audit.mixed.gamma);
    const clean = hfaBiasAudit(
      simulateNonrandomSchedule({ hostBias: 0, seed: 7 }).games,
      3,
    );
    expect(clean.material).toBe(false);
  });

  it("team-FE recovers team ordering on simple data", () => {
    const games: HFAGame[] = [
      { homeTeam: "A", awayTeam: "B", homeMargin: 10 },
      { homeTeam: "B", awayTeam: "A", homeMargin: -6 },
      { homeTeam: "A", awayTeam: "B", homeMargin: 8 },
      { homeTeam: "B", awayTeam: "A", homeMargin: -8 },
    ];
    const fe = teamFixedEffectsHFA(games);
    expect(fe.theta["A"]).toBeGreaterThan(fe.theta["B"] ?? 0);
    // gamma = ((10+8)/2 + (-6-8)/2)/2 = 1.
    expect(fe.gamma).toBeCloseTo(1, 6);
    expect(unadjustedHFA(games)).toBeCloseTo(1, 10);
  });

  it("mixed-effects shrinks team strengths toward zero", () => {
    const { games } = simulateNonrandomSchedule({ hostBias: 0.5, seed: 21 });
    const mixed = mixedEffectsHFA(games);
    const fe = teamFixedEffectsHFA(games);
    const spread = (t: Record<string, number>): number => {
      const v = Object.values(t);
      return Math.max(...v) - Math.min(...v);
    };
    expect(spread(mixed.theta)).toBeLessThanOrEqual(spread(fe.theta));
    expect(mixed.sigmaT).toBeGreaterThan(0);
  });

  it("empty input throws", () => {
    expect(() => unadjustedHFA([])).toThrow();
    expect(() => teamFixedEffectsHFA([])).toThrow();
    expect(() => mixedEffectsHFA([])).toThrow();
    expect(() => hfaBiasAudit([])).toThrow();
  });
});
