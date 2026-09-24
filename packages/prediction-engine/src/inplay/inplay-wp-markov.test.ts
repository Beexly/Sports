import { describe, expect, it } from "vitest";
import {
  MAX_LEAD,
  N_STATES,
  buildTransitionMatrix,
  inPlayWinProb,
  precomputePowers,
  teamConditionedBalance,
} from "./inplay-wp-markov";

const flat = { tempo: 1, balanceAt: () => 0.5, pointsPerEvent: 7 };

describe("inplay-wp-markov", () => {
  it("transition rows are stochastic", () => {
    const P = buildTransitionMatrix(flat);
    expect(P).toHaveLength(N_STATES);
    for (const row of P) {
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
  });

  it("win prob is monotone in the lead", () => {
    const powers = precomputePowers(buildTransitionMatrix(flat), 5);
    const wps = [-14, -7, 0, 7, 14].map((L) => inPlayWinProb(powers, L, 5));
    for (let i = 1; i < wps.length; i++) {
      expect(wps[i]!).toBeGreaterThan(wps[i - 1]!);
    }
    expect(wps[2]).toBeCloseTo(0.5, 6);
  });

  it("a huge lead late is nearly certain", () => {
    const powers = precomputePowers(buildTransitionMatrix(flat), 3);
    expect(inPlayWinProb(powers, MAX_LEAD, 1)).toBeCloseTo(1, 6);
    expect(inPlayWinProb(powers, -MAX_LEAD, 1)).toBeCloseTo(0, 6);
  });

  it("zero events left resolves the current state", () => {
    const powers = precomputePowers(buildTransitionMatrix(flat), 3);
    expect(inPlayWinProb(powers, 3, 0)).toBe(1);
    expect(inPlayWinProb(powers, -3, 0)).toBe(0);
    expect(inPlayWinProb(powers, 0, 0)).toBe(0.5);
  });

  it("team-conditioned balance favors the stronger pregame team", () => {
    const fav = teamConditionedBalance(7)(7);
    const dog = teamConditionedBalance(-7)(7);
    expect(fav).toBeGreaterThan(dog);
    expect(fav).toBeLessThanOrEqual(0.95);
    expect(dog).toBeGreaterThanOrEqual(0.05);
  });

  it("rejects invalid balance and empty powers", () => {
    expect(() => buildTransitionMatrix({ ...flat, balanceAt: () => 2 })).toThrow();
    expect(() => inPlayWinProb([], 0, 3)).toThrow();
    expect(() => precomputePowers(buildTransitionMatrix(flat), 0)).toThrow();
  });
});
