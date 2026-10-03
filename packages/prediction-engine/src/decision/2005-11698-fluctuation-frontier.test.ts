// Tests for decision/2005-11698-fluctuation-frontier.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  growthFluctuationFrontier,
  frontierFractionChoice,
  turInvariantHolds,
  frontierSlope,
  frontierGatePasses,
} from "./2005-11698-fluctuation-frontier.js";

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

const EDGE = (() => {
  const rand = mulberry32(41);
  return Array.from({ length: 2000 }, () => (rand() < 0.55 ? 0.91 : -1));
})();

describe("growthFluctuationFrontier (2005.11698)", () => {
  it("builds a monotone-fluctuation frontier with a vertical slope near full Kelly", () => {
    const fractions = [0.05, 0.1, 0.25, 0.5, 0.75, 1.0];
    const frontier = growthFluctuationFrontier(EDGE, fractions);
    expect(frontier).toHaveLength(6);
    for (let i = 1; i < frontier.length; i++) {
      expect(frontier[i]!.sigmaW).toBeGreaterThanOrEqual(frontier[i - 1]!.sigmaW);
    }
    // Vertical slope at Kelly: last segment gains little growth per fluctuation.
    const early = frontierSlope(frontier[0]!, frontier[1]!);
    const late = frontierSlope(frontier[frontier.length - 2]!, frontier[frontier.length - 1]!);
    expect(late).toBeLessThan(early); // diminishing growth per unit fluctuation
  });
  it("mean growth peaks then falls (overbetting past Kelly)", () => {
    // EDGE pays +0.91 w.p. 0.55 / -1 w.p. 0.45, so Kelly f* = 0.55 - 0.45/0.91.
    // Fractions straddle f*: growth rises toward Kelly, then falls past it.
    const kellyF = 0.55 - 0.45 / 0.91;
    const frontier = growthFluctuationFrontier(EDGE, [0.005, kellyF, 0.5, 1.0, 1.5]);
    const means = frontier.map((p) => p.meanLogGrowth);
    const maxIdx = means.indexOf(Math.max(...means));
    expect(maxIdx).toBeGreaterThan(0);
    expect(maxIdx).toBeLessThan(means.length - 1);
  });
});

describe("frontierFractionChoice", () => {
  it("picks a feasible fraction within the fluctuation budget", () => {
    const frontier = growthFluctuationFrontier(EDGE, [0.05, 0.1, 0.2, 0.3, 0.5]);
    const choice = frontierFractionChoice(frontier, 0.05);
    expect(choice).not.toBeNull();
    expect(choice!.sigmaW).toBeLessThanOrEqual(0.05);
    expect(frontierFractionChoice(frontier, 1e-9)).toBeNull(); // nothing feasible
  });
});

describe("turInvariantHolds", () => {
  it("flags inconsistent probability/odds inputs", () => {
    // sigma_W far below <W>/sigma_q -> violation.
    expect(turInvariantHolds(0.1, 0.01, 1.0)).toBe(false);
    expect(turInvariantHolds(0.1, 0.2, 1.0)).toBe(true);
    expect(turInvariantHolds(-0.05, 0.01, 1.0)).toBe(true); // vacuous for non-positive growth
  });
});

describe("frontierGatePasses", () => {
  it("encodes the 15%-of-frontier + beat-baseline gate", () => {
    expect(frontierGatePasses(0.10, 0.105, 0.04, 0.042, 0.09, 0.06)).toBe(true);
    expect(frontierGatePasses(0.13, 0.105, 0.04, 0.042, 0.09, 0.06)).toBe(false); // >15% off
    expect(frontierGatePasses(0.08, 0.105, 0.04, 0.042, 0.09, 0.06)).toBe(false); // below baseline
    expect(frontierGatePasses(0.10, 0.105, 0.04, 0.042, 0.09, 0.03)).toBe(false); // higher fluctuation
  });
});
