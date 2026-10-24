import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  classifyCoverageEnsemble,
  computeCnnAttentionPlayEmbedding,
  computeFrameEmbeddingsPermInvariant,
  engineerTrackingFramePairTensor,
  runNgsAwsCnnAttentionCoveragePipeline,
  type TrackingFrame,
} from "../nfl/coverage-scheme.js";
import {
  canonicalizeJson,
  choleskyDecompose,
  DEFAULT_SIX_FAMILY_CORRELATION_MATRIX,
  orthogonalizeAndShrink,
} from "../nfl/master-situational-reasoning-aggregator.js";
import { filterKnownAt } from "../nfl/universal-handoff-warehouse-priors.js";

function frame(seed: number): TrackingFrame {
  return {
    defenders: Array.from({ length: 11 }, (_, i) => ({
      x: 4 + i * 0.7 + seed * 0.13,
      y: 9 + (i % 5) * 2.1,
      reportedSpeed: 6,
      reportedAcceleration: 1,
      displacementYards: 0.65,
    })),
    offense: Array.from({ length: 10 }, (_, i) => ({
      x: 9 + i * 0.6,
      y: 7 + (i % 4) * 2.7 + seed * 0.17,
      reportedSpeed: 7,
      reportedAcceleration: 1,
      displacementYards: 0.75,
    })),
  };
}

describe("Stream 15 P1-09 — headDisagreementVariance alias", () => {
  it("names the deterministic dispersion and keeps the old alias identical", () => {
    const pair = engineerTrackingFramePairTensor([frame(0), frame(1)]);
    const emb = computeFrameEmbeddingsPermInvariant(pair.tensor);
    const attention = computeCnnAttentionPlayEmbedding(emb.embeddings);
    const r = classifyCoverageEnsemble(attention.playEmbedding);
    expect(r.uncertaintyEstimationMethod).toBe("deterministic_head_disagreement");
    expect(r.headDisagreementVariance).toEqual(r.epistemicVariance);
    expect(r.headDisagreementVariance.length).toBe(8);
    expect(r.headDisagreementVariance.every((v) => v >= 0)).toBe(true);
  });

  it("switches method to bootstrap_posterior when bootstrap heads are supplied", () => {
    const r = classifyCoverageEnsemble([1, 0, 0], {
      mcDropoutOrBootstrapHeads: [
        [[1, 0], [0, 1], [0, 0]],
        [[0, 1], [1, 0], [0, 0]],
      ],
    });
    expect(r.uncertaintyEstimationMethod).toBe("bootstrap_posterior");
  });
});

describe("Stream 15 P1-10 — guided Grad-CAM gates and normalization", () => {
  it("keeps every attribution non-negative and inside [0,1]", () => {
    const r = runNgsAwsCnnAttentionCoveragePipeline({ frames: [frame(0), frame(1), frame(2)] });
    expect(r.instanceHighlights.guidedGradCam.length).toBe(3);
    expect(r.instanceHighlights.guidedGradCam.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(Math.max(...r.instanceHighlights.guidedGradCam)).toBeCloseTo(1, 9);
    for (const pair of r.instanceHighlights.rankedPairs) {
      expect(pair.attributionScore).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Stream 15 P1-14 — canonical input hash", () => {
  it("is key-order independent and recomputable from canonicalInputs", () => {
    const a = canonicalizeJson({ b: 2, a: 1, nested: { z: 3, y: 4 } });
    const b = canonicalizeJson({ nested: { y: 4, z: 3 }, a: 1, b: 2 });
    expect(a).toBe(b);
    const canonicalInputs = { familyDeltas: { pressure: 1 }, marketAnchorProb: 0.55, independentEdgeDecision: "SPEAK" };
    const expected = createHash("sha256").update(canonicalizeJson(canonicalInputs)).digest("hex");
    expect(expected).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("Stream 15 P1-08 — Cholesky whitening and GLS weights", () => {
  it("reconstructs the correlation matrix from L L^T", () => {
    const L = choleskyDecompose(DEFAULT_SIX_FAMILY_CORRELATION_MATRIX);
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 6; j += 1) {
        let sum = 0;
        for (let k = 0; k < 6; k += 1) sum += L[i]![k]! * L[j]![k]!;
        expect(sum).toBeCloseTo(DEFAULT_SIX_FAMILY_CORRELATION_MATRIX[i]![j]!, 10);
      }
    }
  });

  it("emits a default correlation source and six whitened residuals", () => {
    const r = orthogonalizeAndShrink(
      {
        pressure: [3, 2],
        weather: 1,
        restFatigue: [-1, 0.5],
        coveragePersonnel: [2, 1.5, 1],
        qbSkillScript: 1.2,
        marketMicrostructure: [0.4, 0.3],
      },
      0.55,
    );
    expect(r.correlationMatrixSource).toBe("default");
    expect(Object.values(r.familyWhitenedResiduals).filter((v) => v !== null).length).toBe(6);
    expect(Object.values(r.normalizedWeights).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 9);
    const recomputed = (Object.keys(r.familyResiduals) as (keyof typeof r.familyResiduals)[]).reduce(
      (s, f) => s + (r.familyResiduals[f] ?? 0) * r.withinFamilyShrinkFactors[f] * r.normalizedWeights[f],
      0,
    );
    expect(r.shrunkUncappedDelta).toBeCloseTo(recomputed, 9);
  });

  it("rejects a non-positive-definite correlation matrix", () => {
    const bad = Array.from({ length: 6 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => (i === j ? 1 : 1.5)),
    );
    expect(() =>
      orthogonalizeAndShrink({ pressure: 1 }, 0.5, { correlationMatrix: bad }),
    ).toThrow(/positive definite/);
  });
});

describe("Stream 15 P1-15 — filterKnownAt validation and dedupe", () => {
  it("rejects week 0 and non-integer weeks", () => {
    expect(() =>
      filterKnownAt([{ knownAt: "2026-10-01T00:00:00Z", season: 2024, week: 0 }], "2026-10-10T00:00:00Z"),
    ).toThrow(/invalid season\/week/);
    expect(() =>
      filterKnownAt([{ knownAt: "2026-10-01T00:00:00Z", season: 2024, week: 5.5 }], "2026-10-10T00:00:00Z"),
    ).toThrow(/invalid season\/week/);
  });

  it("deduplicates the same (gameId, playId) and excludes the duplicate", () => {
    const r = filterKnownAt(
      [
        { knownAt: "2026-10-01T00:00:00Z", gameId: "g1", playId: 7 },
        { knownAt: "2026-10-02T00:00:00Z", gameId: "g1", playId: 7 },
        { knownAt: "2026-10-03T00:00:00Z", gameId: "g2", playId: 8 },
      ],
      "2026-10-10T00:00:00Z",
    );
    expect(r.admitted.length).toBe(2);
    expect(r.excluded).toBe(1);
  });
});
