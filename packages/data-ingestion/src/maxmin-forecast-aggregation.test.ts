/**
 * Tests for ./maxmin-forecast-aggregation (arXiv:2102.07081, lane=ensembles).
 *
 * ACCEPTANCE GATE: ADOPT log pooling as GSE's default ensemble operator if it beats linear pooling on 2025 full-
 * season log loss, and ADOPT OGD-learned weights if the OGD ensemble beats equal weights on 2025
 * log loss with realized regret vs best-hindsight-mixture consistent with O(sqrt(T)). REJECT fixed
 * equal weighting if OGD's learned weights concentrate (>0.5 on one model) while beating equal
 * weights.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./maxmin-forecast-aggregation";

describe("max-min forecast aggregation (arXiv:2102.07081)", () => {
  it("simplex projection", () => {
    const w = mod.simplexProject([0.2, 0.2, 0.2])!;
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w.every((v) => v >= 0)).toBe(true);
    expect(mod.simplexProject([])).toBeNull();
  });
  it("max-min weights concentrate on the best expert", () => {
    const w = mod.maxMinWeights(
      [
        [0.1, 0.1, 0.1],
        [-0.5, -0.6, -0.4],
      ],
      200,
      1,
    )!;
    expect(w[0]).toBeGreaterThan(w[1]!);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });
  it("linear pool", () => {
    expect(mod.linearPool([0.6, 0.4], [1, 1])).toBeCloseTo(0.5, 10);
    expect(mod.linearPool([0.6], [1, 1])).toBeNull();
    expect(mod.linearPool([2], [1])).toBeNull();
  });
  it("log score", () => {
    expect(mod.logScore(0.5, 1)).toBeCloseTo(Math.log(0.5), 10);
    expect(mod.logScore(0, 1)).toBeNull();
  });
});
