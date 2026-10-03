/**
 * Median consensus — tests (arXiv 2207.08924v2).
 *
 * ACCEPTANCE GATE: the median matches the mean on clean symmetric
 * inputs, resists a single wild constituent, flags dissent past 3pp,
 * and the backtest verdict adopts the median when it is no worse than
 * the mean within 0.5% with a >= 2% beat-all rate; empty inputs throw.
 */
import { describe, expect, it } from "vitest";
import { consensus, evaluateConsensus } from "./median-consensus";

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

describe("consensus", () => {
  it("matches the mean on symmetric inputs", () => {
    const c = consensus([0.4, 0.5, 0.6]);
    expect(c.median).toBeCloseTo(0.5, 12);
    expect(c.mean).toBeCloseTo(0.5, 12);
    expect(c.combined).toBe(c.median);
    expect(c.dissent).toBe(false);
  });

  it("resists one wild constituent", () => {
    const c = consensus([0.55, 0.58, 0.6, 0.57, 0.99]);
    expect(c.median).toBe(0.58);
    expect(c.mean).toBeGreaterThan(0.6);
    expect(c.disagreementPp).toBeGreaterThan(0.03);
    expect(c.dissent).toBe(true);
  });

  it("does not flag small disagreements", () => {
    const c = consensus([0.5, 0.51, 0.52, 0.53]);
    expect(c.dissent).toBe(false);
  });

  it("throws on empty input", () => {
    expect(() => consensus([])).toThrow();
  });
});

describe("evaluateConsensus", () => {
  it("adopts the median when it matches the mean and beats constituents", () => {
    const rand = mulberry32(191);
    // One occasionally-wild constituent: the median resists it while the
    // mean gets dragged.
    const forecasts: number[][] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 300; i++) {
      const y = rand() < 0.5 ? 1 : 0;
      outcomes.push(y);
      const base = y === 1 ? 0.65 : 0.35;
      const row = [0, 1, 2, 3].map(() =>
        Math.min(0.99, Math.max(0.01, base + (rand() - 0.5) * 0.2)),
      );
      if (rand() < 0.3) row[Math.floor(rand() * 4)] = rand() < 0.5 ? 0.01 : 0.99;
      forecasts.push(row);
    }
    const ev = evaluateConsensus([{ forecasts, outcomes }]);
    expect(ev.relativeGap).toBeLessThanOrEqual(0.005);
    expect(ev.beatAllRate).toBeGreaterThanOrEqual(0.02);
    expect(ev.verdict).toBe("adopt");
    expect(() => evaluateConsensus([])).toThrow();
  });

  it("rejects when the median is > 1% worse than the mean", () => {
    // Confidently-wrong constituents: the median follows them while the
    // mean hedges via the dissenter.
    const weeks = [
      {
        forecasts: Array.from({ length: 300 }, () => [0.9, 0.9, 0.9, 0.1]),
        outcomes: Array.from({ length: 300 }, () => 0),
      },
    ];
    const ev = evaluateConsensus(weeks);
    // Mean 0.7 hedges; median 0.9 is overconfident and wrong.
    expect(ev.relativeGap).toBeGreaterThan(0.01);
    expect(ev.verdict).toBe("reject");
  });
});
