import { describe, it, expect } from "vitest";
import { clvAbsolute, summarizeClv } from "../edge-lab/features/clv-tracker.js";

describe("clvAbsolute", () => {
  it("absolute difference — no longshot explosion", () => {
    // Relative CLV would report (0.02-0.01)/0.01 = +100%; absolute is 0.01.
    expect(clvAbsolute(0.01, 0.02)).toBeCloseTo(0.01, 12);
    expect(clvAbsolute(0.6, 0.55)).toBeCloseTo(-0.05, 12);
  });

  it("fail closed on out-of-range probabilities", () => {
    expect(() => clvAbsolute(1.2, 0.5)).toThrow();
    expect(() => clvAbsolute(0.5, Number.NaN)).toThrow();
    expect(() => clvAbsolute(-0.1, 0.5)).toThrow();
  });
});

describe("summarizeClv", () => {
  const mk = (n: number, mean: number): ClvSampleLike[] =>
    Array.from({ length: n }, (_, i) => ({
      betFairProb: 0.5,
      closingFairProb: 0.5 + mean + (i % 2 === 0 ? 0.02 : -0.02),
      stake: 1,
    }));
  type ClvSampleLike = { betFairProb: number; closingFairProb: number; stake: number };

  it("below the sample gate: honest nulls, count still reported", () => {
    const r = summarizeClv(mk(10, 0.03));
    expect(r.n).toBe(10);
    expect(r.meanClv).toBeNull();
    expect(r.stdClv).toBeNull();
    expect(r.zScore).toBeNull();
  });

  it("at/above the gate: weighted mean and z are finite", () => {
    const samples = mk(40, 0.03); // alternating ±0.02 noise around +0.03
    const r = summarizeClv(samples);
    expect(r.n).toBe(40);
    expect(r.meanClv).not.toBeNull();
    expect(Number.isFinite(r.meanClv!)).toBe(true);
    expect(Math.abs(r.meanClv! - 0.03)).toBeLessThan(0.005);
    expect(r.zScore).not.toBeNull();
    expect(r.zScore!).toBeGreaterThan(3); // clearly significant vs 0
  });

  it("no edge stream: z near zero, not spuriously significant", () => {
    const flat = Array.from({ length: 50 }, (_, i) => ({
      betFairProb: 0.4,
      closingFairProb: i % 2 === 0 ? 0.4005 : 0.3995,
    }));
    const r = summarizeClv(flat);
    expect(Math.abs(r.zScore!)).toBeLessThan(1);
  });

  it("stake weighting moves the mean toward heavy bets", () => {
    const light = mk(30, 0.0).map((s) => ({ ...s, stake: 1 }));
    light[0]!.closingFairProb = 0.9; // one wild outlier bet
    const equal = summarizeClv(light);
    const weighted = summarizeClv(
      light.map((s, i) => ({ ...s, stake: i === 0 ? 0.001 : 100 })),
    );
    // Equal weighting lets the outlier dominate; tiny stake neutralizes it.
    expect(Math.abs(equal.meanClv!)).toBeGreaterThan(Math.abs(weighted.meanClv!));
  });

  it("fail closed on bad stakes", () => {
    expect(() => summarizeClv([{ betFairProb: 0.5, closingFairProb: 0.5, stake: -1 }])).toThrow();
    expect(() => summarizeClv([{ betFairProb: 0.5, closingFairProb: 0.5, stake: Number.NaN }])).toThrow();
  });
});
