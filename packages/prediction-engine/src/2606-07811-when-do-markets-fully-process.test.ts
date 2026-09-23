/**
 * Vitest suite for arXiv:2606.07811 (When Do Markets Fully Process Public Information? Evidence from Real-Time Prediction Markets).
 * Gate: Adapt the updating-gap framework into GSE's in-play product if, on 2024–2025 NFL: (i) β is significantly below 1 and drift ρ significantly positive net of benchmark changes; and (ii) the drift-follow signal survives bid–ask costs with positive expected value over ≥500 in-play events, OR the liquidity-gated blender beats a fixed 50/50 market/model blend on Brier score by ≥0.002.
 */
import { describe, it, expect } from "vitest";
import { updatingRegression, driftFollowSignal } from "./2606-07811-when-do-markets-fully-process";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2606-07811 in-play updating-gap audit", () => {
  it("recovers beta < 1 under under-updating markets", () => {
    const rng = lcg(111);
    const pairs = Array.from({ length: 300 }, () => {
      const dq = (rng() - 0.5) * 0.2;
      const dp = 0.3 * dq + (rng() - 0.5) * 0.02; // market moves 30% of benchmark
      return { dq, dp };
    });
    const { beta } = updatingRegression(pairs);
    expect(beta).toBeGreaterThan(0.15);
    expect(beta).toBeLessThan(0.5); // significantly below 1
    expect(() => updatingRegression([{ dq: 0, dp: 0 }])).toThrow();
  });
  it("only follows drift when the soft book lags the sharp book", () => {
    expect(driftFollowSignal(0.5, 0.56, 0.03, 1)).toBe(true);
    expect(driftFollowSignal(0.55, 0.56, 0.03, 1)).toBe(false);
    expect(driftFollowSignal(0.6, 0.54, 0.03, -1)).toBe(true);
    expect(() => driftFollowSignal(0.5, 0.6, 0, 1)).toThrow();
  });
});
