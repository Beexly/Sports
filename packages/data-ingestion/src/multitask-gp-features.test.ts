/**
 * Tests for ./multitask-gp-features (arXiv:1806.01930v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt the nested formulation iff on the 2015-2025 walk-forward: (a) nested log loss beats
 * independent Poisson by >= 0.005; AND (b) E2 ordinal score on playoff-stage probabilities beats
 * the engine baseline (strict improvement); AND (c) the model is stable to +/-2-year training-
 * window shifts. Otherwise keep independent Poisson and note nested conditioning as overfit on
 * soccer.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./multitask-gp-features";

describe("multi-task GP features (arXiv:1804.03676v2)", () => {
  const X = [[0, 0], [1, 0], [0, 1]];
  it("RBF self-similarity = variance", () => {
    expect(mod.rbfKernel([1, 2], [1, 2], 1)).toBeCloseTo(1, 10);
    expect(mod.rbfKernel([0], [10], 0.1)).toBeLessThan(1e-10);
    expect(mod.rbfKernel([1], [1], 0)).toBeNull();
  });
  it("linear kernel", () => {
    expect(mod.linearKernel([1, 2], [3, 4])).toBeCloseTo(11, 10);
    expect(mod.linearKernel([1], [1, 2])).toBeNull();
  });
  it("kernel algebra preserves shapes", () => {
    const K = mod.gramMatrix(X, (a, b) => mod.rbfKernel(a, b, 1))!;
    expect(mod.gramSanity(K)).toBe(true);
    const S = mod.kernelSum(K, K)!;
    expect(S[0]![0]).toBeCloseTo(2, 10);
    const P = mod.kernelProduct(K, K)!;
    expect(P[0]![0]).toBeCloseTo(1, 10);
    expect(mod.kernelSum(K, [[1]])).toBeNull();
    expect(mod.kernelProduct(K, [])).toBeNull();
  });
  it("outcome x wind kernel", () => {
    const k = mod.outcomeWindKernel([1, 2], [1, 2], [5], [5], 2)!;
    expect(k).toBeCloseTo(1, 10);
    expect(mod.outcomeWindKernel([1], [1, 2], [5], [5])).toBeNull();
  });
  it("gramMatrix null on empty", () => {
    expect(mod.gramMatrix([], (a, b) => mod.rbfKernel(a, b, 1))).toBeNull();
  });
});
