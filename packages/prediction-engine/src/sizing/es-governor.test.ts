/**
 * Kelly with ES tail governor — tests (arXiv 2112.14451v1).
 *
 * ACCEPTANCE GATE: a risky slate gets governed (s < 1, ES within budget);
 * a tame slate passes through (s = 1); the mean-ES frontier is anchored
 * at the growth-optimal endpoint with max mean and max ES, and ES
 * shrinks as s shrinks; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  esGovernor,
  meanEsFrontier,
  simulateSlateLogReturns,
  tailStats,
} from "./es-governor";

const RISKY = [
  { kellyFrac: 0.15, decimalOdds: 2.0, winProb: 0.6 },
  { kellyFrac: 0.15, decimalOdds: 2.0, winProb: 0.6 },
  { kellyFrac: 0.15, decimalOdds: 2.0, winProb: 0.6 },
];

const TAME = [{ kellyFrac: 0.02, decimalOdds: 2.0, winProb: 0.6 }];

describe("tailStats", () => {
  it("computes mean, VaR and ES with ES >= VaR", () => {
    const sims = simulateSlateLogReturns(RISKY, 1, 5000, 7);
    const st = tailStats(sims, 0.95);
    expect(st.es).toBeGreaterThanOrEqual(st.var);
    expect(st.mean).toBeGreaterThan(0); // +EV slate
    expect(() => tailStats([], 0.95)).toThrow();
    expect(() => tailStats(sims, 1.5)).toThrow();
    expect(() => simulateSlateLogReturns([], 1, 100)).toThrow();
    expect(() => simulateSlateLogReturns(RISKY, 2, 100)).toThrow();
  });
});

describe("esGovernor", () => {
  it("governs a risky slate and leaves a tame slate alone", () => {
    const g = esGovernor(RISKY, 0.95, 0.15, 20000, 7);
    expect(g.governed).toBe(true);
    expect(g.s).toBeLessThan(1);
    expect(g.s).toBeGreaterThan(0);
    expect(g.stats.es).toBeLessThanOrEqual(0.15 + 0.01); // MC tolerance
    const t = esGovernor(TAME, 0.95, 0.15, 20000, 7);
    expect(t.governed).toBe(false);
    expect(t.s).toBe(1);
  });
});

describe("meanEsFrontier", () => {
  it("is anchored at growth-optimal and ES falls as s falls", () => {
    const f = meanEsFrontier(RISKY, 0.95, 11, 20000, 7);
    expect(f).toHaveLength(11);
    expect(f[0]!.s).toBe(1);
    // Growth-optimal endpoint: max mean and max ES.
    const maxMean = Math.max(...f.map((p) => p.mean));
    const maxEs = Math.max(...f.map((p) => p.es));
    expect(f[0]!.mean).toBeCloseTo(maxMean, 2);
    expect(f[0]!.es).toBeCloseTo(maxEs, 2);
    // Monotone ES decline along the frontier (up to MC noise).
    expect(f[f.length - 1]!.es).toBeLessThan(f[0]!.es / 2);
    // Finite min-ES termination.
    expect(Number.isFinite(f[f.length - 1]!.es)).toBe(true);
  });
});
