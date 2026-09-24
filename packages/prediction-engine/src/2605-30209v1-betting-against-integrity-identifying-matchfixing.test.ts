/**
 * Vitest suite for arXiv:2605.30209v1 (Betting Against Integrity: Identifying Match-Fixing Through In-Play Market Dynamics).
 * Gate: ADAPT conditional on §12: fit the baseline hurdle SSM on one season of live odds-movement data; require ΔAIC ≥ 10⁴ over the no-state hurdle before proceeding; adopt only if flagged residuals predict line moves above chance.
 */
import { describe, it, expect } from "vitest";
import { arxStateUpdate, standardizedResidual, ENABLED } from "./2605-30209v1-betting-against-integrity-identifying-matchfixing";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2605-30209v1 hurdle-ARX state-space (disabled)", () => {
  const p = { hurdleIntercept: -1, phi: 0.7, sigmaEta: 0.5, beta: [0.1, 0.05, -0.02, 0.03, 0.2] };
  const cell = { pregameImplied: 0.6, scoreDiff: 3, timeRemaining: 3, timeouts: 5, events: 1 };
  it("propagates the ARX(1) latent state", () => {
    const s1 = arxStateUpdate(p, 0, cell);
    const s2 = arxStateUpdate(p, s1, cell);
    expect(s2).toBeGreaterThan(s1); // persistence + fresh regressors
    expect(s1).toBeCloseTo(0.1 * 0.6 + 0.05 * 3 - 0.02 * 3 + 0.03 * 5 + 0.2 * 1, 10);
  });
  it("flags large standardized residuals", () => {
    const r = standardizedResidual(p, 0.2, 5);
    expect(Math.abs(r)).toBeGreaterThan(3);
    expect(standardizedResidual(p, 0.2, 0.2)).toBeLessThan(3);
  });
  it("is disabled pending live-odds data", () => {
    expect(ENABLED).toBe(false);
  });
});
