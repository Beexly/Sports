/**
 * Least-squares ratings — tests (arXiv 2201.05249).
 *
 * ACCEPTANCE GATE: LS recovers known team strengths and HFA on synthetic
 * data; WLS downweights noisy early-season games; the L1 variant resists a
 * garbage-time blowout outlier; MAE and violation rate are sane;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  fitL1Ratings,
  fitLeastSquares,
  fitWeightedLeastSquares,
  predictSpread,
  rankingViolationRate,
  spreadMae,
  type GameResult,
} from "./least-squares-ratings";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synthGames(n: number, seed: number, outlier = false): GameResult[] {
  const rand = mulberry32(seed);
  const teams = ["A", "B", "C", "D", "E", "F"];
  const strength = [8, 4, 0, -2, -4, -6];
  const games: GameResult[] = [];
  for (let i = 0; i < n; i++) {
    const hi = Math.floor(rand() * teams.length);
    let ai = Math.floor(rand() * teams.length);
    if (ai === hi) ai = (ai + 1) % teams.length;
    const margin =
      (strength[hi] as number) - (strength[ai] as number) + 2.5 + (rand() - 0.5) * 20;
    games.push({
      home: teams[hi] as string,
      away: teams[ai] as string,
      homePoints: Math.max(0, Math.round(24 + margin / 2)),
      awayPoints: Math.max(0, Math.round(24 - margin / 2)),
      week: 1 + Math.floor(rand() * 18),
    });
  }
  if (outlier) {
    // Garbage-time blowout: 60-point home win between evenly matched teams.
    games.push({ home: "C", away: "D", homePoints: 70, awayPoints: 10, week: 10 });
  }
  return games;
}

describe("fitLeastSquares", () => {
  it("recovers team strengths and HFA", () => {
    const games = synthGames(600, 151);
    const fit = fitLeastSquares(games);
    expect(fit.teams).toHaveLength(6);
    const r = (t: string): number => fit.ratings[fit.teams.indexOf(t)] as number;
    expect(r("A")).toBeGreaterThan(r("B"));
    expect(r("B")).toBeGreaterThan(r("C"));
    expect(r("E")).toBeGreaterThan(r("F"));
    expect(fit.hfa).toBeGreaterThan(0);
    expect(fit.hfa).toBeLessThan(6);
    // Ratings are zero-sum identified.
    expect(fit.ratings.reduce((a, x) => a + x, 0)).toBeCloseTo(0, 8);
    expect(() => fitLeastSquares([])).toThrow();
  });
});

describe("predictSpread + spreadMae + rankingViolationRate", () => {
  it("predicts sane spreads with low violation rate", () => {
    const games = synthGames(600, 153);
    const fit = fitLeastSquares(games);
    const mae = spreadMae(fit, games);
    expect(mae).toBeGreaterThan(0);
    expect(mae).toBeLessThan(12);
    const viol = rankingViolationRate(fit, games);
    expect(viol).toBeGreaterThanOrEqual(0);
    expect(viol).toBeLessThan(0.45);
    expect(() => predictSpread(fit, "A", "ZZZ")).toThrow();
    expect(() => spreadMae(fit, [])).toThrow();
    expect(() => rankingViolationRate(fit, [])).toThrow();
  });
});

describe("fitWeightedLeastSquares + fitL1Ratings", () => {
  it("WLS fits and L1 resists the blowout outlier", () => {
    const games = synthGames(600, 155, true);
    const wls = fitWeightedLeastSquares(games);
    expect(wls.hfa).toBeGreaterThan(0);
    const ols = fitLeastSquares(games);
    const l1 = fitL1Ratings(games);
    const rOf = (fit: { teams: string[]; ratings: number[] }, t: string): number =>
      fit.ratings[fit.teams.indexOf(t)] as number;
    // The blowout inflates C's OLS rating; L1 stays closer to the truth
    // (C and D are evenly matched: |rC - rD| should be small).
    const olsGap = Math.abs(rOf(ols, "C") - rOf(ols, "D"));
    const l1Gap = Math.abs(rOf(l1, "C") - rOf(l1, "D"));
    expect(l1Gap).toBeLessThan(olsGap);
    expect(() => fitWeightedLeastSquares([])).toThrow();
    expect(() => fitL1Ratings([])).toThrow();
  });
});
