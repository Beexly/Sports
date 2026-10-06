/**
 * Vitest suite for arXiv:2605.02287 (Per-Market Information Leakage and Order-Flow Skill: Two Methodological Lenses on Informed Trading in Decentralized Prediction Markets).
 * Gate: ADAPT is confirmed if, on 2024 Polymarket NFL data, the sports-only replication achieves ≥35% out-of-sample retention of the skilled-winner label AND high-ILS markets show ≥4pp better move→outcome prediction than unflagged markets.
 */
import { describe, it, expect } from "vitest";
import { signRandomizationPValue, frontLoadingIls, watchlistMember } from "./2605-02287-permarket-information-leakage-and-orderflow";

describe("2605-02287 skilled-flow watchlist", () => {
  it("detects skill with the sign-randomization test", () => {
    const pnl = [10, 8, 12, 9, 11, 7, 10, 8];
    const p = signRandomizationPValue(pnl, pnl.reduce((a, b) => a + b, 0), 2000, 7);
    expect(p).toBeLessThan(0.01);
    const noise = [1, -1, 0.5, -0.5, 0.2, -0.2];
    const p2 = signRandomizationPValue(noise, noise.reduce((a, b) => a + b, 0), 2000, 7);
    expect(p2).toBeGreaterThan(0.05);
    expect(() => signRandomizationPValue([], 0, 10, 1)).toThrow();
  });
  it("measures pre-kickoff front-loading", () => {
    expect(frontLoadingIls([80, 10, 10], 1)).toBeCloseTo(0.8, 10);
    expect(frontLoadingIls([10, 10, 80], 1)).toBeCloseTo(0.1, 10);
    expect(watchlistMember(0.01, 0.7)).toBe(true);
    expect(watchlistMember(0.2, 0.7)).toBe(false);
  });
});
