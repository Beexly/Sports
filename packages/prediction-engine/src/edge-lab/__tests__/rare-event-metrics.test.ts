import { describe, it, expect } from "vitest";
import {
  inverseFrequencyClassWeights,
  precisionAtRecall,
} from "../rare-event-metrics.js";

describe("inverseFrequencyClassWeights", () => {
  it("matches the source paper's own printed numbers exactly (train split: n=5336, 130 DPI positives)", () => {
    const labels: (0 | 1)[] = [...Array(130).fill(1), ...Array(5206).fill(0)];
    const weights = inverseFrequencyClassWeights(labels);
    expect(weights.weightNegative).toBeCloseTo(0.51, 2);
    expect(weights.weightPositive).toBeCloseTo(20.52, 2);
  });

  it("gives equal weights for a balanced dataset", () => {
    const labels: (0 | 1)[] = [1, 0, 1, 0];
    const weights = inverseFrequencyClassWeights(labels);
    expect(weights.weightNegative).toBeCloseTo(1, 10);
    expect(weights.weightPositive).toBeCloseTo(1, 10);
  });

  it("throws on empty input", () => {
    expect(() => inverseFrequencyClassWeights([])).toThrow(RangeError);
  });

  it("throws when one class is entirely absent", () => {
    expect(() => inverseFrequencyClassWeights([1, 1, 1])).toThrow(RangeError);
    expect(() => inverseFrequencyClassWeights([0, 0, 0])).toThrow(RangeError);
  });
});

describe("precisionAtRecall", () => {
  // Hand-verified fixture, walked threshold by threshold in the module's
  // docstring derivation: 3 positives among 6 scored rows.
  const scores = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
  const labels: (0 | 1)[] = [1, 1, 0, 1, 0, 0];

  it("finds the max-precision operating point at recall >= 0.8 (hand-verified: threshold 0.6, precision 0.75)", () => {
    const result = precisionAtRecall(scores, labels, 0.8);
    expect(result.threshold).toBeCloseTo(0.6, 10);
    expect(result.precision).toBeCloseTo(0.75, 10);
    expect(result.recall).toBeCloseTo(1.0, 10);
    expect(result.truePositives).toBe(3);
    expect(result.falsePositives).toBe(1);
    expect(result.totalPositives).toBe(3);
  });

  it("finds a tighter, higher-precision operating point at a lower recall bar (hand-verified: threshold 0.8, precision 1.0)", () => {
    const result = precisionAtRecall(scores, labels, 2 / 3);
    expect(result.threshold).toBeCloseTo(0.8, 10);
    expect(result.precision).toBeCloseTo(1.0, 10);
    expect(result.recall).toBeCloseTo(2 / 3, 10);
    expect(result.truePositives).toBe(2);
    expect(result.falsePositives).toBe(0);
  });

  it("at targetRecall=0, returns the single highest-scoring point (best possible precision)", () => {
    const result = precisionAtRecall(scores, labels, 0);
    expect(result.threshold).toBeCloseTo(0.9, 10);
    expect(result.precision).toBeCloseTo(1.0, 10);
  });

  it("at targetRecall=1, must include every positive (predict-all is always feasible)", () => {
    const result = precisionAtRecall(scores, labels, 1);
    expect(result.recall).toBeCloseTo(1.0, 10);
    expect(result.truePositives).toBe(3);
  });

  it("demonstrates the paper's own honesty lesson: a strong discriminator at a low base rate still yields low precision", () => {
    // 1000 rows, 2.3% base rate (23 positives), a genuinely informative
    // scorer (positives score systematically higher) but far from perfect.
    const n = 1000;
    const nPos = 23;
    const rowScores: number[] = [];
    const rowLabels: (0 | 1)[] = [];
    for (let i = 0; i < n; i++) {
      const isPos = i < nPos;
      // deterministic separation: positives centered higher, with overlap
      rowScores.push(isPos ? 0.5 + (i % 5) * 0.05 : 0.1 + (i % 9) * 0.05);
      rowLabels.push(isPos ? 1 : 0);
    }
    const result = precisionAtRecall(rowScores, rowLabels, 0.8);
    expect(result.recall).toBeGreaterThanOrEqual(0.8);
    // The point of this test: even a real, tuned signal at a rare base
    // rate lands at low precision -- not a defect, the honest floor.
    expect(result.precision).toBeLessThan(0.3);
  });

  it("resolves tied scores as one shared threshold, not as separate steps", () => {
    const tiedScores = [0.5, 0.5, 0.5, 0.1];
    const tiedLabels: (0 | 1)[] = [1, 0, 1, 0];
    const result = precisionAtRecall(tiedScores, tiedLabels, 1.0);
    // At threshold 0.5, all three tied rows are included together.
    expect(result.threshold).toBeCloseTo(0.5, 10);
    expect(result.truePositives).toBe(2);
    expect(result.falsePositives).toBe(1);
  });

  it("throws on mismatched lengths", () => {
    expect(() => precisionAtRecall([0.5, 0.6], [1], 0.8)).toThrow(RangeError);
  });

  it("throws on empty input", () => {
    expect(() => precisionAtRecall([], [], 0.8)).toThrow(RangeError);
  });

  it("throws on an out-of-range targetRecall", () => {
    expect(() => precisionAtRecall(scores, labels, 1.5)).toThrow(RangeError);
    expect(() => precisionAtRecall(scores, labels, -0.1)).toThrow(RangeError);
  });

  it("throws when there are no positive labels at all", () => {
    expect(() => precisionAtRecall([0.5, 0.6], [0, 0], 0.5)).toThrow(RangeError);
  });

  it("throws on a non-finite score instead of hanging -- NaN === NaN is false, so the tie-block scan would otherwise never advance", () => {
    expect(() => precisionAtRecall([0.5, NaN, 0.3], [1, 0, 1] as const, 0.5)).toThrow(RangeError);
    expect(() => precisionAtRecall([0.5, Infinity, 0.3], [1, 0, 1] as const, 0.5)).toThrow(RangeError);
    expect(() => precisionAtRecall([0.5, -Infinity, 0.3], [1, 0, 1] as const, 0.5)).toThrow(RangeError);
  });
});
