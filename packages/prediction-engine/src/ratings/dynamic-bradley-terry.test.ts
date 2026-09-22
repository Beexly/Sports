/**
 * Nonparametric dynamic Bradley-Terry — tests (arXiv 2003.00083).
 *
 * ACCEPTANCE GATE: tracks time-varying strengths on synthetic data, LOOCV
 * picks a finite bandwidth, existence guardrail refuses degenerate fits,
 * empty input returns null.
 */
import { describe, expect, it } from "vitest";
import {
  existenceViolations,
  fitDynamicBT,
  kernelWeights,
  looLogLik,
  tuneBandwidthLOOCV,
  type BTGame,
} from "./dynamic-bradley-terry";

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

function epochGames(weeks: number, teams: string[], seed: number): BTGame[] {
  // Two epochs with reversed strength order; every pair meets every week so
  // each team always has weighted wins and losses (existence holds).
  const rand = mulberry32(seed);
  const games: BTGame[] = [];
  const str = (t: string, w: number): number => {
    const i = teams.indexOf(t);
    const base = ((teams.length - 1) / 2 - i) * 0.9; // A strongest in epoch 1
    return w <= weeks / 2 ? base : -base; // reversed in epoch 2
  };
  for (let w = 1; w <= weeks; w++) {
    for (let a = 0; a < teams.length; a++) {
      for (let b = a + 1; b < teams.length; b++) {
        const home = teams[a] as string;
        const away = teams[b] as string;
        const p = 1 / (1 + Math.exp(-(str(home, w) - str(away, w))));
        games.push({ week: w, home, away, homeWin: rand() < p });
      }
    }
  }
  return games;
}

const TEAMS = ["A", "B", "C", "D"];

describe("fitDynamicBT", () => {
  it("tracks the reversed strength ordering across epochs", () => {
    const games = epochGames(10, TEAMS, 61);
    const early = fitDynamicBT(games, 3, 2)!;
    const late = fitDynamicBT(games, 8, 2)!;
    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    const topEarly = [...TEAMS].sort((a, b) => (early.ratings[b] ?? 0) - (early.ratings[a] ?? 0))[0];
    const topLate = [...TEAMS].sort((a, b) => (late.ratings[b] ?? 0) - (late.ratings[a] ?? 0))[0];
    expect(topEarly).toBe("A");
    expect(topLate).toBe("D");
    // Sum-to-zero identification.
    const sum = TEAMS.reduce((s, t) => s + (early.ratings[t] ?? 0), 0);
    expect(sum).toBeCloseTo(0, 8);
    expect(early.effN).toBeGreaterThan(0);
  });

  it("returns null when the existence condition fails (all wins)", () => {
    const games: BTGame[] = [
      { week: 1, home: "A", away: "B", homeWin: true },
      { week: 1, home: "A", away: "B", homeWin: true },
    ];
    expect(fitDynamicBT(games, 1, 1)).toBeNull();
    expect(existenceViolations(games, kernelWeights(games, 1, 1))).toContain("A");
  });

  it("returns null on empty input", () => {
    expect(fitDynamicBT([], 1, 2)).toBeNull();
  });
});

describe("kernelWeights", () => {
  it("peaks at the target week and decays symmetrically", () => {
    const games: BTGame[] = [1, 2, 3, 4, 5].map((w) => ({
      week: w,
      home: "A",
      away: "B",
      homeWin: true,
    }));
    const w = kernelWeights(games, 3, 1);
    expect(w[2]).toBeCloseTo(1, 12);
    expect(w[1]).toBeCloseTo(w[3] as number, 12);
    expect(w[0]).toBeLessThan(w[1] as number);
    expect(() => kernelWeights(games, 3, 0)).toThrow();
  });
});

describe("tuneBandwidthLOOCV", () => {
  it("selects a finite bandwidth with the best LOO score", () => {
    const games = epochGames(10, TEAMS, 63);
    const { h, scores } = tuneBandwidthLOOCV(games, [0.5, 1, 2, 4, 8]);
    expect(Number.isFinite(h)).toBe(true);
    expect(scores.length).toBeGreaterThan(0);
    // The chosen bandwidth has the best LOO score.
    const best = scores.reduce((a, s) => (s.loo > a.loo ? s : a), scores[0] as { h: number; loo: number });
    expect(h).toBe(best.h);
  });

  it("LOO log-likelihood favors the tuned bandwidth over an over-smoothed one", () => {
    const games = epochGames(10, TEAMS, 65);
    const overSmooth = looLogLik(games, 8);
    const tuned = tuneBandwidthLOOCV(games, [1, 2, 4]);
    const tunedScore = looLogLik(games, tuned.h);
    // Over-smoothing mixes the two reversed epochs into ~zero strengths.
    expect(tunedScore).toBeGreaterThan(overSmooth);
  });

  it("throws when every candidate fails", () => {
    const games: BTGame[] = [{ week: 1, home: "A", away: "B", homeWin: true }];
    expect(() => tuneBandwidthLOOCV(games, [0.5, 1])).toThrow();
    expect(() => tuneBandwidthLOOCV(games, [])).toThrow();
  });
});
