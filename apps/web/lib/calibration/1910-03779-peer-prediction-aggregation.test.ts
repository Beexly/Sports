import { describe, expect, it } from "vitest";

import {
  ENABLED,
  aggregateProbs,
  caScores,
  meanBrier,
  softmaxWeights,
  spearman,
} from "@/lib/calibration/1910-03779-peer-prediction-aggregation";

describe("peer-prediction (CA) aggregation", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("CA scores reward the model that deviates correctly from consensus", () => {
    const ys = [1, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    const good = [0.9, 0.85, 0.15, 0.2, 0.8, 0.25, 0.9, 0.1, 0.75, 0.3];
    const bad = [0.1, 0.2, 0.9, 0.8, 0.15, 0.75, 0.2, 0.85, 0.1, 0.7];
    const scores = caScores([good, bad], ys);
    expect(scores[0]).toBeGreaterThan(scores[1]);
    const w = softmaxWeights(scores, 50);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w[0]).toBeGreaterThan(0.9);
  });

  it("CA-weighted ensemble beats the unweighted mean on Brier", () => {
    const ys = [1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0];
    const good = ys.map((y) => (y === 1 ? 0.85 : 0.15));
    const bad = ys.map((y) => (y === 1 ? 0.2 : 0.8));
    const mid = ys.map(() => 0.5);
    const scores = caScores([good, bad, mid], ys);
    const w = softmaxWeights(scores, 30);
    const agg = aggregateProbs([good, bad, mid], w);
    const unweighted = aggregateProbs([good, bad, mid], [1 / 3, 1 / 3, 1 / 3]);
    const rel = (meanBrier(unweighted, ys) - meanBrier(agg, ys)) / meanBrier(unweighted, ys);
    expect(rel).toBeGreaterThanOrEqual(0.03); // gate: >=3% Brier improvement
  });

  it("spearman detects persistent skill rankings", () => {
    expect(spearman([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
    expect(Math.abs(spearman([3, 1, 4, 2], [3, 1, 4, 2]))).toBeGreaterThanOrEqual(0.3);
  });
});
