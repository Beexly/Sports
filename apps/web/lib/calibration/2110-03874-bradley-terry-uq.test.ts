import { describe, expect, it } from "vitest";

import {
  DECAY_LAMBDAS,
  ENABLED,
  btFit,
  btFitDecayed,
  btStandardErrors,
  shouldAbstain,
  winProbWithCI,
} from "@/lib/calibration/2110-03874-bradley-terry-uq";

describe("Bradley-Terry uncertainty quantification", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
    expect(DECAY_LAMBDAS).toEqual([0.9, 0.95, 0.98]);
  });

  it("symmetric teams get ~zero strengths and ~0.5 neutral-site probs", () => {
    const games = [];
    for (let i = 0; i < 40; i++) {
      games.push({ home: 0, away: 1, homeWin: (i % 2) as 0 | 1 });
    }
    const { theta, h } = btFit(2, games);
    expect(Math.abs(theta[0])).toBeLessThan(0.3);
    expect(Math.abs(theta[1])).toBeLessThan(0.3);
    expect(theta[0] + theta[1]).toBeCloseTo(0, 10); // centering constraint
    expect(Math.abs(h)).toBeLessThan(0.3);
  });

  it("dominant team gets positive strength; SEs are finite", () => {
    const games = [];
    for (let i = 0; i < 30; i++) games.push({ home: 0, away: 1, homeWin: 1 as const });
    for (let i = 0; i < 10; i++) games.push({ home: 0, away: 1, homeWin: 0 as const });
    const fit = btFit(2, games);
    expect(fit.theta[0]).toBeGreaterThan(fit.theta[1]);
    const { seTheta, seH } = btStandardErrors(2, games, fit);
    expect(seTheta.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(seH)).toBe(true);
  });

  it("90% CI abstains on toss-ups and bets on mismatches", () => {
    const tossup = winProbWithCI(0.01, 0.0, 0.0, 0.3, 0.3, 0.1);
    expect(shouldAbstain(tossup)).toBe(true);
    const mismatch = winProbWithCI(1.5, -1.5, 0.2, 0.15, 0.15, 0.05);
    expect(mismatch.p).toBeGreaterThan(0.9);
    expect(shouldAbstain(mismatch)).toBe(false);
    expect(mismatch.lo).toBeLessThan(mismatch.p);
    expect(mismatch.hi).toBeGreaterThan(mismatch.p);
  });

  it("decay-weighted fit tracks recent form (in-season strength change)", () => {
    // Team 0 was bad early, good late. lags: 0 = most recent.
    const games: { home: number; away: number; homeWin: 0 | 1 }[] = [];
    for (let i = 0; i < 10; i++) games.push({ home: 1, away: 0, homeWin: 1 }); // old: team0 loses
    for (let i = 0; i < 10; i++) games.push({ home: 0, away: 1, homeWin: 1 }); // new: team0 wins
    const lags = games.map((_, i) => games.length - 1 - i);
    const staticFit = btFit(2, games);
    const decayed = btFitDecayed(2, games, lags, 0.9);
    // Decayed fit should rate team 0 higher than the static fit (recent wins weigh more).
    expect(decayed.theta[0]).toBeGreaterThan(staticFit.theta[0]);
  });
});
