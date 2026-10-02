import { describe, expect, it } from "vitest";

import {
  DECAY_LAMBDAS,
  ENABLED,
  MIN_ADOPTION_GAMES,
  btAdoptionGate,
  btConnectivityGate,
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

  it("refuses adoption below the sample floor and still refuses to publish at the floor", () => {
    expect(btAdoptionGate(2).refused).toBe(true);
    expect(btAdoptionGate(MIN_ADOPTION_GAMES - 1).refused).toBe(true);
    const cleared = btAdoptionGate(MIN_ADOPTION_GAMES);
    expect(cleared.refused).toBe(false);
    expect(ENABLED).toBe(false);
  });

  it("connectivity gate refuses a week-1 schedule (disjoint pairs) — Condition 4.1 floor", () => {
    const g = [
      { home: 0, away: 1, homeWin: 1 as const },
      { home: 2, away: 3, homeWin: 0 as const },
    ];
    const r = btConnectivityGate(4, g);
    expect(r.ok).toBe(false);
    expect(r.components).toBe(2);
    expect(r.reason).toContain("2 components");
    expect(ENABLED).toBe(false);
  });

  it("connectivity gate clears a connected schedule and labels the paper condition unverified", () => {
    const g = [
      { home: 0, away: 1, homeWin: 1 as const },
      { home: 1, away: 2, homeWin: 0 as const },
      { home: 2, away: 3, homeWin: 1 as const },
    ];
    const r = btConnectivityGate(4, g);
    expect(r.ok).toBe(true);
    expect(r.components).toBe(1);
    expect(r.reason).toContain("unverified");
  });

  it("connectivity gate refuses empty schedules, self-pairs only, and a one-team field", () => {
    expect(btConnectivityGate(32, []).ok).toBe(false);
    const selfOnly = [{ home: 3, away: 3, homeWin: 1 as const }];
    expect(btConnectivityGate(32, selfOnly).ok).toBe(false);
    expect(btConnectivityGate(1, []).ok).toBe(false);
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
