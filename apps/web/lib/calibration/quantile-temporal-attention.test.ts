import { describe, it, expect } from "vitest";
import {
  softmax,
  temporalAttention,
  perQuantilePrediction,
  attentionEntropy,
  attentionReport,
} from "@/lib/calibration/quantile-temporal-attention";

// ============================================================
// arXiv 2404.13371v1 — quantile temporal attention. Additive.
// ============================================================

describe("quantile temporal attention — 2404.13371v1", () => {
  it("softmax is a distribution", () => {
    const w = softmax([1, 2, 3]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w[2]!).toBeGreaterThan(w[0]!);
    expect(softmax([])).toEqual([]);
  });

  it("temporalAttention gives uniform weights for identical keys", () => {
    const w = temporalAttention([1, 0], [[1, 1], [1, 1], [1, 1]]);
    for (const x of w) expect(x).toBeCloseTo(1 / 3, 10);
  });

  it("temporalAttention upweights the most similar week", () => {
    const w = temporalAttention([1, 0], [[1, 0], [0, 1], [-1, 0]]);
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[1]!).toBeGreaterThan(w[2]!);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("perQuantilePrediction is a convex combination per head", () => {
    const out = perQuantilePrediction(
      [0.5, 0.5],
      [
        [40, 50],
        [44, 54],
      ],
    );
    expect(out).toEqual([42, 52]);
    expect(perQuantilePrediction([], [])).toEqual([]);
  });

  it("attentionEntropy is log n for uniform, 0 for degenerate", () => {
    expect(attentionEntropy([1 / 3, 1 / 3, 1 / 3])).toBeCloseTo(Math.log(3), 10);
    expect(attentionEntropy([1, 0, 0])).toBeCloseTo(0, 10);
  });

  it("attentionReport ranks weeks by weight", () => {
    const rep = attentionReport([0.2, 0.7, 0.1], ["w1", "w2", "w3"], 2);
    expect(rep.length).toBe(2);
    expect(rep[0]!.week).toBe("w2");
    expect(rep[0]!.weight).toBeCloseTo(0.7, 10);
  });
});
