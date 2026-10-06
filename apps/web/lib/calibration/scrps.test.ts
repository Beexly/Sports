import { describe, it, expect } from "vitest";
import { crpsFromSamples, scrpsFromSamples, ensembleSpread } from "@/lib/calibration/scrps";

// ============================================================
// arXiv 1912.05642v4 — scaled CRPS (local scale invariance).
// Additive only; no source edits.
// ============================================================

describe("SCRPS — 1912.05642v4", () => {
  it("is scale-invariant: SCRPS(c·F, c·y) = SCRPS(F, y)", () => {
    const forecast = [1.2, 2.5, 3.1, 4.0, 2.8];
    const y = 2.9;
    const base = scrpsFromSamples(forecast, y);
    for (const c of [2, 10, 0.25]) {
      const scaled = scrpsFromSamples(forecast.map((x) => x * c), y * c);
      expect(scaled).toBeCloseTo(base, 10);
    }
  });

  it("CRPS scales linearly with the unit (the problem SCRPS fixes)", () => {
    const forecast = [1.2, 2.5, 3.1, 4.0, 2.8];
    const y = 2.9;
    const base = crpsFromSamples(forecast, y);
    const scaled = crpsFromSamples(forecast.map((x) => x * 10), y * 10);
    // Exact linearity: a totals market measured in different units would
    // dominate a spreads market 10x under mean CRPS.
    expect(scaled).toBeCloseTo(10 * base, 8);
    expect(Math.abs(scaled - base)).toBeGreaterThan(0.5);
  });

  it("perfect ensemble scores 0 under both rules", () => {
    const perfect = [3, 3, 3, 3];
    expect(crpsFromSamples(perfect, 3)).toBe(0);
    expect(scrpsFromSamples(perfect, 3)).toBe(0);
  });

  it("degenerate-but-wrong forecast scores +∞ under SCRPS (honest blowup)", () => {
    expect(scrpsFromSamples([5, 5, 5], 3)).toBe(Number.POSITIVE_INFINITY);
  });

  it("empty forecast returns NaN (never a fake 0)", () => {
    expect(crpsFromSamples([], 3)).toBeNaN();
    expect(scrpsFromSamples([], 3)).toBeNaN();
  });

  it("ensembleSpread is 0 for fewer than 2 draws", () => {
    expect(ensembleSpread([])).toBe(0);
    expect(ensembleSpread([4])).toBe(0);
  });

  it("better-centered ensemble scores lower CRPS", () => {
    const good = [2.8, 3.0, 3.2, 2.9, 3.1];
    const bad = [5.0, 5.2, 4.8, 5.1, 4.9];
    expect(crpsFromSamples(good, 3)).toBeLessThan(crpsFromSamples(bad, 3));
  });
});
