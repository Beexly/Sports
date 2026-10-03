import { describe, expect, it } from "vitest";
import {
  conditionalCdf, conditionalQuantile, kernelWeights,
  silvermanBandwidth, unconditionalQuantile,
} from "./conditional-score-dist";
import type { ScoredGame } from "./conditional-score-dist";

const games: ScoredGame[] = [
  { context: [0], margin: -7 }, { context: [0], margin: -3 },
  { context: [0], margin: 3 }, { context: [0], margin: 7 },
  { context: [10], margin: 14 }, { context: [10], margin: 17 },
  { context: [10], margin: 21 }, { context: [10], margin: 24 },
];

describe("conditional-score-dist", () => {
  it("kernelWeights concentrates on nearby contexts", () => {
    const w = kernelWeights(games, [0], 2);
    expect(w[0] ?? 0).toBeGreaterThan(w[4] ?? 0);
    expect(w.reduce((s, v) => s + v, 0)).toBeGreaterThan(0);
  });
  it("conditionalCdf is monotone and bounded", () => {
    const c1 = conditionalCdf(games, [0], 0, 2);
    const c2 = conditionalCdf(games, [0], 10, 2);
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(c2).toBeLessThanOrEqual(1);
    expect(c2).toBeGreaterThanOrEqual(c1);
    // Near context [0]: half the nearby mass is <= 0.
    expect(c1).toBeCloseTo(0.5, 1);
  });
  it("conditionalQuantile tracks the local margin regime", () => {
    const q0 = conditionalQuantile(games, [0], 0.5, 2);
    const q10 = conditionalQuantile(games, [10], 0.5, 2);
    expect(q10).toBeGreaterThan(q0);
    expect(q0).toBeGreaterThanOrEqual(-3);
    expect(q0).toBeLessThanOrEqual(3);
  });
  it("degenerate contexts fall back to the unweighted CDF", () => {
    const same: ScoredGame[] = [
      { context: [5], margin: 1 }, { context: [5], margin: 2 }, { context: [5], margin: 3 },
    ];
    expect(silvermanBandwidth([0, 0, 0])).toBe(0);
    expect(conditionalCdf(same, [5], 2)).toBeCloseTo(2 / 3, 12);
    expect(unconditionalQuantile([3, 1, 2], 0.5)).toBe(2);
  });
  it("throws on degenerate inputs", () => {
    expect(() => kernelWeights([], [0])).toThrow();
    expect(() => kernelWeights(games, [0, 1])).toThrow();
    expect(() => conditionalQuantile(games, [0], 1.5)).toThrow();
    expect(() => unconditionalQuantile([], 0.5)).toThrow();
  });
});
