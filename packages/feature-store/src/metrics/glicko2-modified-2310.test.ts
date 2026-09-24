import { describe, expect, it } from "vitest";
import {
  expectation, updateRating, seasonStartUpdate, winProb, HOME_ADVANTAGE,
  GSE_GLICKO2_MOD_ENABLED,
} from "./glicko2-modified-2310.js";

const R = { mu: 0, phi: 2.0, sigma: 0.06 };

describe("modified glicko-2", () => {
  it("home advantage raises the expectation", () => {
    expect(expectation(0, 0, 1, true)).toBeGreaterThan(0.5);
    expect(expectation(0, 0, 1, false)).toBeLessThan(0.5);
    // signed HFA is symmetric: E(+h) + E(-h) = 1
    expect(expectation(0, 0, 1, true) + expectation(0, 0, 1, false)).toBeCloseTo(1, 6);
  });
  it("a win raises mu, a loss lowers it", () => {
    const w = updateRating(R, [{ oppMu: 0, oppPhi: 1, score: 1, home: false }]);
    const l = updateRating(R, [{ oppMu: 0, oppPhi: 1, score: 0, home: false }]);
    expect(w.mu).toBeGreaterThan(R.mu);
    expect(l.mu).toBeLessThan(R.mu);
  });
  it("season-start update inflates uncertainty", () => {
    expect(seasonStartUpdate(R).phi).toBeGreaterThan(R.phi);
  });
  it("empty game list returns the rating unchanged", () => {
    expect(updateRating(R, [])).toEqual(R);
  });
  it("winProb is symmetric and home-shifted", () => {
    expect(winProb(R, R, true)).toBeGreaterThan(0.5);
    expect(winProb(R, R, true) + winProb(R, R, false)).toBeCloseTo(1, 6);
  });
  it("HFA constant is positive", () => {
    expect(HOME_ADVANTAGE).toBeGreaterThan(0);
  });
  it("stays off until the log-loss gate clears", () => {
    expect(GSE_GLICKO2_MOD_ENABLED).toBe(false);
  });
});

