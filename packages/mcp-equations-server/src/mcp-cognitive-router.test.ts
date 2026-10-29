import { describe, expect, it } from "vitest";
import {
  buildContextMask,
  maskToArray,
  MASK_WORDS,
  MAX_ABS_DELTA_LOG_ODDS,
  MIN_SAMPLE,
  SIGNAL_FAMILIES,
  stageC,
  stageD,
  toVectorLiteral,
} from "./mcp-cognitive-router.js";

describe("context mask", () => {
  it("sets the bit for a fired family", () => {
    const m = buildContextMask([{ family: 1, displacement: 0.4, n: 100 }]);
    expect(m[0]).toBe(2);
  });

  it("does not set a bit on zero displacement", () => {
    expect(buildContextMask([{ family: 1, displacement: 0, n: 100 }])[0]).toBe(0);
  });

  it("does not set a bit on a thin sample", () => {
    expect(buildContextMask([{ family: 1, displacement: 0.4, n: MIN_SAMPLE - 1 }])[0]).toBe(0);
  });

  it("spans words — family 32 lands in word 1, not word 0", () => {
    const m = buildContextMask([{ family: 32, displacement: 1, n: 50 }]);
    expect(m[0]).toBe(0);
    expect(m[1]).toBe(1);
  });

  it("rejects an out-of-range family", () => {
    expect(() => buildContextMask([{ family: SIGNAL_FAMILIES, displacement: 1, n: 50 }])).toThrow();
    expect(() => buildContextMask([{ family: -1, displacement: 1, n: 50 }])).toThrow();
  });

  it("emits exactly nine words", () => {
    expect(maskToArray(buildContextMask([]))).toHaveLength(MASK_WORDS);
  });

  it("keeps the top bit addressable", () => {
    // family 31 is the top bit of word 0. Postgres int is signed 32-bit, so it stores as
    // -2147483648 — that is the correct two's-complement pattern and bitwise AND still
    // works. What must not happen is the bit vanishing.
    const arr = maskToArray(buildContextMask([{ family: 31, displacement: 1, n: 50 }]));
    expect(arr[0]).toBe(-2147483648);
    expect((arr[0]! & -2147483648) !== 0).toBe(true);
  });
});

describe("vector literal", () => {
  it("formats for pgvector", () => {
    expect(toVectorLiteral([0.1, -0.2])).toBe("[0.1,-0.2]");
  });
});

describe("Stage C spectral orthogonalization & Stage D James-Stein Jacobian coupling", () => {
  it("attenuates redundant same-cluster premises in stageC", () => {
    const premises = [
      { id: "p1", premise: "A1", cluster: "trench", similarity: 0.92, rawLogOddsDelta: 0.15 },
      { id: "p2", premise: "A2", cluster: "trench", similarity: 0.90, rawLogOddsDelta: 0.14 },
      { id: "p3", premise: "B1", cluster: "motion", similarity: 0.85, rawLogOddsDelta: 0.12 },
      { id: "p4", premise: "C1", cluster: "coverage", similarity: 0.80, rawLogOddsDelta: 0.10 },
    ];
    const out = stageC(premises, { limit: 3, clusterRedundancyGamma: 1.0 });
    expect(out).toHaveLength(3);
    // p1 (trench rank 0 -> 0.92) and p3 (motion rank 0 -> 0.85) and p4 (coverage rank 0 -> 0.80)
    // beat p2 (trench rank 1 -> 0.90 / sqrt(2) = 0.636)
    expect(out.map((r) => r.id)).toEqual(["p1", "p3", "p4"]);
  });

  it("applies positive-part James-Stein shrinkage and clamps |Δ log-odds| <= 0.35 in stageD", () => {
    const spectral = stageC([
      { id: "p1", premise: "A1", cluster: "c1", similarity: 0.95, rawLogOddsDelta: 0.22 },
      { id: "p2", premise: "B1", cluster: "c2", similarity: 0.92, rawLogOddsDelta: 0.20 },
      { id: "p3", premise: "C1", cluster: "c3", similarity: 0.90, rawLogOddsDelta: 0.18 },
    ]);
    const res = stageD(spectral, { noiseVarianceSigma2: 0.0025, tauHatCoach: 0.55 });
    expect(res.jamesSteinShrinkageFactor).toBeGreaterThan(0);
    expect(res.jamesSteinShrinkageFactor).toBeLessThan(1);
    expect(res.clamped).toBe(true);
    expect(res.clampedTotalLogOddsDelta).toBe(MAX_ABS_DELTA_LOG_ODDS);
    expect(res.tauHatCoachPriorBonus).toBeCloseTo((0.55 - 0.42) * 0.12, 5);
  });
});
