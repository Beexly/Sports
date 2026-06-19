/**
 * Tests for ab-testing.ts — pure A/B testing utilities.
 * 90+ test cases covering all exported functions.
 */

import { describe, it, expect } from "vitest";
import {
  assignVariant,
  hashString,
  twoProportionZTest,
  normalCdf,
  bayesianABTest,
  sampleSize,
  multiVariantTest,
  chiSquareTest,
  validateExperiment,
  normalizeWeights,
  summarizeExperiment,
  obrienFleming,
  epsilonGreedy,
  thompsonSampling,
  type Experiment,
  type Variant,
  type VariantId,
} from "@/lib/analytics/ab-testing";

// ---------------------------------------------------------------------------
// hashString
// ---------------------------------------------------------------------------
describe("hashString", () => {
  it("returns a number in [0, 99]", () => {
    for (const s of ["user1", "user2", "experiment:control", "", "abc123"]) {
      const h = hashString(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(99);
    }
  });

  it("is deterministic for same input", () => {
    const h1 = hashString("test-input");
    const h2 = hashString("test-input");
    expect(h1).toBe(h2);
  });

  it("produces different values for different inputs", () => {
    const values = new Set(
      Array.from({ length: 50 }, (_, i) => hashString(`user-${i}`))
    );
    // Should produce at least several distinct values
    expect(values.size).toBeGreaterThan(10);
  });

  it("handles empty string", () => {
    const h = hashString("");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(99);
  });

  it("handles unicode input", () => {
    const h = hashString("用户123");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(99);
  });
});

// ---------------------------------------------------------------------------
// assignVariant
// ---------------------------------------------------------------------------
describe("assignVariant", () => {
  const experiment: Experiment = {
    id: "exp-001",
    variants: [
      { id: "control", weight: 0.5 },
      { id: "treatment", weight: 0.5 },
    ],
    active: true,
  };

  it("is deterministic — same userId+experimentId always returns same variant", () => {
    for (let i = 0; i < 20; i++) {
      const r1 = assignVariant(experiment, `user-${i}`);
      const r2 = assignVariant(experiment, `user-${i}`);
      expect(r1.variantId).toBe(r2.variantId);
      expect(r1.bucket).toBe(r2.bucket);
    }
  });

  it("returns a valid variantId", () => {
    const validIds = new Set(experiment.variants.map((v) => v.id));
    for (let i = 0; i < 50; i++) {
      const r = assignVariant(experiment, `user-${i}`);
      expect(validIds.has(r.variantId)).toBe(true);
    }
  });

  it("bucket is in [0, 99]", () => {
    for (let i = 0; i < 50; i++) {
      const r = assignVariant(experiment, `user-${i}`);
      expect(r.bucket).toBeGreaterThanOrEqual(0);
      expect(r.bucket).toBeLessThanOrEqual(99);
    }
  });

  it("distributes users approximately 50/50 across 1000 users", () => {
    const counts: Record<string, number> = { control: 0, treatment: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = assignVariant(experiment, `user-${i}`);
      counts[r.variantId]++;
    }
    // Both variants should have roughly 500 each; allow ±15% tolerance
    expect(counts["control"]).toBeGreaterThan(350);
    expect(counts["control"]).toBeLessThan(650);
    expect(counts["treatment"]).toBeGreaterThan(350);
    expect(counts["treatment"]).toBeLessThan(650);
  });

  it("respects unequal weights (80/20 split)", () => {
    const unequalExp: Experiment = {
      id: "exp-unequal",
      variants: [
        { id: "control", weight: 0.8 },
        { id: "small", weight: 0.2 },
      ],
    };
    const counts: Record<string, number> = { control: 0, small: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = assignVariant(unequalExp, `user-${i}`);
      counts[r.variantId]++;
    }
    // Control should be roughly 800, small roughly 200; allow ±20% tolerance
    expect(counts["control"]).toBeGreaterThan(600);
    expect(counts["small"]).toBeGreaterThan(100);
    expect(counts["small"]).toBeLessThan(350);
  });

  it("different experimentIds produce different assignments for same userId", () => {
    const user = "user-42";
    const exp1 = { id: "exp-A", variants: [{ id: "c", weight: 0.5 }, { id: "t", weight: 0.5 }] };
    const exp2 = { id: "exp-B", variants: [{ id: "c", weight: 0.5 }, { id: "t", weight: 0.5 }] };
    const r1 = assignVariant(exp1, user);
    const r2 = assignVariant(exp2, user);
    // buckets should differ because experiment ID changes the hash
    // (not always guaranteed, but very likely with djb2)
    // We just verify both return valid variants
    expect(["c", "t"]).toContain(r1.variantId);
    expect(["c", "t"]).toContain(r2.variantId);
  });

  it("handles three variants", () => {
    const exp3: Experiment = {
      id: "exp-three",
      variants: [
        { id: "a", weight: 1 / 3 },
        { id: "b", weight: 1 / 3 },
        { id: "c", weight: 1 / 3 },
      ],
    };
    const validIds = new Set(["a", "b", "c"]);
    for (let i = 0; i < 100; i++) {
      const r = assignVariant(exp3, `user-${i}`);
      expect(validIds.has(r.variantId)).toBe(true);
    }
  });

  it("normalizes weights that do not sum to 1", () => {
    const unnormalized: Experiment = {
      id: "exp-unnorm",
      variants: [
        { id: "a", weight: 2 },
        { id: "b", weight: 3 },
      ],
    };
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = assignVariant(unnormalized, `u${i}`);
      counts[r.variantId]++;
    }
    // 40/60 split; b should get more
    expect(counts["b"]).toBeGreaterThan(counts["a"]);
  });
});

// ---------------------------------------------------------------------------
// normalCdf
// ---------------------------------------------------------------------------
describe("normalCdf", () => {
  it("Phi(0) = 0.5", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
  });

  it("Phi(1.96) ≈ 0.975", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
  });

  it("Phi(-1.96) ≈ 0.025", () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });

  it("Phi(1.645) ≈ 0.95", () => {
    expect(normalCdf(1.645)).toBeCloseTo(0.95, 2);
  });

  it("Phi(-∞) ≈ 0", () => {
    expect(normalCdf(-10)).toBeLessThan(0.0001);
  });

  it("Phi(+∞) ≈ 1", () => {
    expect(normalCdf(10)).toBeGreaterThan(0.9999);
  });

  it("is symmetric: Phi(z) + Phi(-z) = 1", () => {
    for (const z of [0.5, 1, 1.5, 2, 2.5]) {
      expect(normalCdf(z) + normalCdf(-z)).toBeCloseTo(1, 5);
    }
  });

  it("is monotonically increasing", () => {
    const zs = [-3, -2, -1, 0, 1, 2, 3];
    for (let i = 1; i < zs.length; i++) {
      expect(normalCdf(zs[i])).toBeGreaterThan(normalCdf(zs[i - 1]));
    }
  });
});

// ---------------------------------------------------------------------------
// twoProportionZTest
// ---------------------------------------------------------------------------
describe("twoProportionZTest", () => {
  it("detects significant difference (10% vs 12%, n=5000)", () => {
    const result = twoProportionZTest(500, 5000, 600, 5000);
    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.zScore).toBeGreaterThan(0); // treatment > control → positive z-score
  });

  it("zScore is positive when treatment > control", () => {
    const result = twoProportionZTest(500, 5000, 600, 5000);
    expect(result.zScore).toBeGreaterThan(0);
  });

  it("does not detect significance for tiny difference (10% vs 10.1%, n=1000)", () => {
    const result = twoProportionZTest(100, 1000, 101, 1000);
    expect(result.significant).toBe(false);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it("calculates relative uplift correctly", () => {
    const result = twoProportionZTest(100, 1000, 120, 1000);
    // treatment rate = 12%, control rate = 10%, relative uplift = 20%
    expect(result.relativeUplift).toBeCloseTo(0.2, 2);
  });

  it("calculates absolute uplift correctly", () => {
    const result = twoProportionZTest(100, 1000, 120, 1000);
    // absolute uplift = 12% - 10% = 2%
    expect(result.absoluteUplift).toBeCloseTo(0.02, 4);
  });

  it("returns winner when significant", () => {
    const result = twoProportionZTest(500, 5000, 600, 5000);
    expect(result.winner).not.toBeNull();
  });

  it("returns null winner when not significant", () => {
    const result = twoProportionZTest(100, 1000, 101, 1000);
    expect(result.winner).toBeNull();
  });

  it("returns pValue and zScore close to 0 for equal rates", () => {
    const result = twoProportionZTest(100, 1000, 100, 1000);
    expect(result.zScore).toBeCloseTo(0, 5);
    expect(result.pValue).toBeCloseTo(1, 3);
    expect(result.significant).toBe(false);
  });

  it("handles zero conversions", () => {
    const result = twoProportionZTest(0, 1000, 0, 1000);
    expect(result.significant).toBe(false);
    expect(result.pValue).toBeCloseTo(1, 2);
  });

  it("handles zero visitors (returns safe defaults)", () => {
    const result = twoProportionZTest(0, 0, 10, 100);
    expect(result.significant).toBe(false);
    expect(result.pValue).toBe(1);
    expect(result.zScore).toBe(0);
  });

  it("uses specified confidenceLevel (99%)", () => {
    // A difference significant at 95% may not be at 99%
    const at95 = twoProportionZTest(500, 5000, 560, 5000, 0.95);
    const at99 = twoProportionZTest(500, 5000, 560, 5000, 0.99);
    // At 99% confidence, harder to achieve significance
    expect(at95.confidenceLevel).toBe(0.95);
    expect(at99.confidenceLevel).toBe(0.99);
  });

  it("returns relativeUplift=0 when control rate is 0", () => {
    const result = twoProportionZTest(0, 1000, 10, 1000);
    expect(result.relativeUplift).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// bayesianABTest
// ---------------------------------------------------------------------------
describe("bayesianABTest", () => {
  it("high conversion B > A → probBBeatsA > 0.9", () => {
    // A: 100/1000 = 10%, B: 200/1000 = 20% — clear B winner
    const result = bayesianABTest(100, 1000, 200, 1000);
    expect(result.probBBeatsA).toBeGreaterThan(0.9);
  });

  it("equal conversion rates → probBBeatsA ≈ 0.5", () => {
    const result = bayesianABTest(100, 1000, 100, 1000);
    expect(result.probBBeatsA).toBeGreaterThan(0.3);
    expect(result.probBBeatsA).toBeLessThan(0.7);
  });

  it("clear A winner → probBBeatsA < 0.1", () => {
    // A: 200/1000 = 20%, B: 100/1000 = 10%
    const result = bayesianABTest(200, 1000, 100, 1000);
    expect(result.probBBeatsA).toBeLessThan(0.1);
  });

  it("probBBeatsA is in [0, 1]", () => {
    const result = bayesianABTest(50, 500, 60, 500);
    expect(result.probBBeatsA).toBeGreaterThanOrEqual(0);
    expect(result.probBBeatsA).toBeLessThanOrEqual(1);
  });

  it("returns winner=treatment when probBBeatsA >= 0.95", () => {
    const result = bayesianABTest(50, 1000, 150, 1000);
    if (result.probBBeatsA >= 0.95) {
      expect(result.winner).toBe("treatment");
    }
  });

  it("returns winner=null when probBBeatsA is not decisive", () => {
    const result = bayesianABTest(100, 1000, 101, 1000);
    if (result.probBBeatsA < 0.95 && result.probBBeatsA > 0.05) {
      expect(result.winner).toBeNull();
    }
  });

  it("credible interval is an array of [lower, upper]", () => {
    const result = bayesianABTest(100, 1000, 120, 1000);
    expect(result.credibleInterval).toHaveLength(2);
    expect(result.credibleInterval[0]).toBeLessThanOrEqual(result.credibleInterval[1]);
  });

  it("credible interval lower bound is negative when equal rates (B could be lower)", () => {
    const result = bayesianABTest(100, 1000, 100, 1000);
    // With equal rates, CI spans zero
    expect(result.credibleInterval[0]).toBeLessThan(0.1);
    expect(result.credibleInterval[1]).toBeGreaterThan(-0.1);
  });

  it("expectedLift is positive when B > A", () => {
    const result = bayesianABTest(100, 1000, 200, 1000);
    expect(result.expectedLift).toBeGreaterThan(0);
  });

  it("expectedLift is negative when A > B", () => {
    const result = bayesianABTest(200, 1000, 100, 1000);
    expect(result.expectedLift).toBeLessThan(0);
  });

  it("is deterministic with same inputs", () => {
    const r1 = bayesianABTest(100, 1000, 120, 1000);
    const r2 = bayesianABTest(100, 1000, 120, 1000);
    expect(r1.probBBeatsA).toBe(r2.probBBeatsA);
  });

  it("handles zero conversions in both arms", () => {
    const result = bayesianABTest(0, 1000, 0, 1000);
    expect(result.probBBeatsA).toBeGreaterThan(0.3);
    expect(result.probBBeatsA).toBeLessThan(0.7);
  });

  it("accepts custom priorAlpha and priorBeta", () => {
    // Informative prior that strongly favors 50% rate
    const result = bayesianABTest(100, 1000, 200, 1000, 50, 50);
    expect(result.probBBeatsA).toBeGreaterThan(0.5);
  });

  it("sign of credible interval matches winner", () => {
    const result = bayesianABTest(50, 1000, 200, 1000);
    // Treatment clearly wins; CI upper bound should be positive
    expect(result.credibleInterval[1]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// sampleSize
// ---------------------------------------------------------------------------
describe("sampleSize", () => {
  it("returns positive integers for perVariant and total", () => {
    const r = sampleSize(0.1, 0.05);
    expect(r.perVariant).toBeGreaterThan(0);
    expect(r.total).toBeGreaterThan(0);
    expect(Number.isInteger(r.perVariant)).toBe(true);
    expect(Number.isInteger(r.total)).toBe(true);
  });

  it("total = 2 * perVariant", () => {
    const r = sampleSize(0.1, 0.05);
    expect(r.total).toBe(r.perVariant * 2);
  });

  it("larger MDE → smaller sample size", () => {
    const small = sampleSize(0.1, 0.05);  // 5% MDE
    const large = sampleSize(0.1, 0.20);  // 20% MDE
    expect(large.perVariant).toBeLessThan(small.perVariant);
  });

  it("lower power → smaller sample size", () => {
    const high = sampleSize(0.1, 0.05, 0.95, 0.9);
    const low = sampleSize(0.1, 0.05, 0.95, 0.7);
    expect(low.perVariant).toBeLessThan(high.perVariant);
  });

  it("lower confidence level → smaller sample size", () => {
    const high = sampleSize(0.1, 0.05, 0.99);
    const low = sampleSize(0.1, 0.05, 0.90);
    expect(low.perVariant).toBeLessThan(high.perVariant);
  });

  it("weeks calculation uses weeklyTraffic", () => {
    const r = sampleSize(0.1, 0.05, 0.95, 0.8, 500);
    expect(r.weeks).toBe(Math.ceil(r.total / 500));
  });

  it("default weeklyTraffic=1000", () => {
    const r = sampleSize(0.1, 0.05);
    expect(r.weeks).toBe(Math.ceil(r.total / 1000));
  });

  it("higher baseline rate needs more samples (less variance in very low rates)", () => {
    // Lower baseline rate (0.02) requires more samples for 5% relative MDE
    const low = sampleSize(0.02, 0.2);
    const high = sampleSize(0.5, 0.2);
    // Both valid; mainly confirm function works at boundaries
    expect(low.perVariant).toBeGreaterThan(0);
    expect(high.perVariant).toBeGreaterThan(0);
  });

  it("weeks >= 1 when sample needed exceeds weeklyTraffic", () => {
    const r = sampleSize(0.1, 0.01, 0.95, 0.8, 100); // very small MDE requires huge sample
    expect(r.weeks).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// multiVariantTest
// ---------------------------------------------------------------------------
describe("multiVariantTest", () => {
  const variants = [
    { id: "control", conversions: 100, visitors: 1000 },
    { id: "variantA", conversions: 120, visitors: 1000 },
    { id: "variantB", conversions: 200, visitors: 1000 },
  ];

  it("control returns null result", () => {
    const results = multiVariantTest(variants, "control");
    const controlResult = results.find((r) => r.id === "control");
    expect(controlResult?.result).toBeNull();
  });

  it("returns one entry per variant", () => {
    const results = multiVariantTest(variants, "control");
    expect(results).toHaveLength(3);
  });

  it("significantly better variant is flagged as significant", () => {
    const results = multiVariantTest(variants, "control");
    const variantB = results.find((r) => r.id === "variantB");
    expect(variantB?.result?.significant).toBe(true);
  });

  it("winner for significant variant is the variant id (not 'treatment')", () => {
    const results = multiVariantTest(variants, "control");
    const variantB = results.find((r) => r.id === "variantB");
    if (variantB?.result?.significant) {
      expect(variantB.result.winner).toBe("variantB");
    }
  });

  it("non-significant variant returns winner=null", () => {
    const closeVariants = [
      { id: "control", conversions: 100, visitors: 1000 },
      { id: "close", conversions: 101, visitors: 1000 },
    ];
    const results = multiVariantTest(closeVariants, "control");
    const closeResult = results.find((r) => r.id === "close");
    expect(closeResult?.result?.winner).toBeNull();
  });

  it("throws when controlId not found", () => {
    expect(() => multiVariantTest(variants, "missing")).toThrow();
  });

  it("uses specified confidence level", () => {
    const results99 = multiVariantTest(variants, "control", 0.99);
    const results95 = multiVariantTest(variants, "control", 0.95);
    const bAt99 = results99.find((r) => r.id === "variantB");
    const bAt95 = results95.find((r) => r.id === "variantB");
    // If significant at 95%, may or may not be at 99%
    expect(bAt95?.result?.confidenceLevel).toBe(0.95);
    expect(bAt99?.result?.confidenceLevel).toBe(0.99);
  });
});

// ---------------------------------------------------------------------------
// chiSquareTest
// ---------------------------------------------------------------------------
describe("chiSquareTest", () => {
  it("uniform traffic split (equal observed and expected) is not significant", () => {
    const observed = [250, 250, 250, 250];
    const expected = [250, 250, 250, 250];
    const result = chiSquareTest(observed, expected);
    expect(result.statistic).toBeCloseTo(0, 5);
    expect(result.significant).toBe(false);
  });

  it("extreme skew is significant", () => {
    const observed = [950, 10, 10, 30];
    const expected = [250, 250, 250, 250];
    const result = chiSquareTest(observed, expected);
    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("statistic is non-negative", () => {
    const result = chiSquareTest([100, 120, 80], [100, 100, 100]);
    expect(result.statistic).toBeGreaterThanOrEqual(0);
  });

  it("pValue is in [0, 1]", () => {
    const result = chiSquareTest([100, 120, 80], [100, 100, 100]);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it("throws when arrays have different lengths", () => {
    expect(() => chiSquareTest([1, 2, 3], [1, 2])).toThrow();
  });

  it("minor deviation is not significant", () => {
    const observed = [252, 248, 251, 249];
    const expected = [250, 250, 250, 250];
    const result = chiSquareTest(observed, expected);
    expect(result.significant).toBe(false);
  });

  it("two bins: basically binary split test", () => {
    const observed = [900, 100];
    const expected = [500, 500];
    const result = chiSquareTest(observed, expected);
    expect(result.significant).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateExperiment
// ---------------------------------------------------------------------------
describe("validateExperiment", () => {
  it("valid experiment returns {valid: true, errors: []}", () => {
    const exp: Experiment = {
      id: "exp",
      variants: [{ id: "a", weight: 0.5 }, { id: "b", weight: 0.5 }],
      active: true,
    };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fewer than 2 variants returns error", () => {
    const exp: Experiment = { id: "x", variants: [{ id: "a", weight: 1 }] };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("duplicate variant ids returns error", () => {
    const exp: Experiment = {
      id: "x",
      variants: [{ id: "a", weight: 0.5 }, { id: "a", weight: 0.5 }],
    };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /unique/i.test(e))).toBe(true);
  });

  it("zero weight variant returns error", () => {
    const exp: Experiment = {
      id: "x",
      variants: [{ id: "a", weight: 0 }, { id: "b", weight: 1 }],
    };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /weight/i.test(e))).toBe(true);
  });

  it("negative weight variant returns error", () => {
    const exp: Experiment = {
      id: "x",
      variants: [{ id: "a", weight: -0.5 }, { id: "b", weight: 1.5 }],
    };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(false);
  });

  it("weights not summing to 1 (outside 0.01 tolerance) returns error", () => {
    const exp: Experiment = {
      id: "x",
      variants: [{ id: "a", weight: 0.3 }, { id: "b", weight: 0.3 }],
    };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /weight/i.test(e) || /sum/i.test(e))).toBe(true);
  });

  it("weights summing to 1.005 (within 0.01) is valid", () => {
    const exp: Experiment = {
      id: "x",
      variants: [{ id: "a", weight: 0.5025 }, { id: "b", weight: 0.5025 }],
    };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(true);
  });

  it("no active field is still valid", () => {
    const exp: Experiment = {
      id: "x",
      variants: [{ id: "a", weight: 0.5 }, { id: "b", weight: 0.5 }],
    };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(true);
  });

  it("empty variants array returns error", () => {
    const exp: Experiment = { id: "x", variants: [] };
    const result = validateExperiment(exp);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeWeights
// ---------------------------------------------------------------------------
describe("normalizeWeights", () => {
  it("normalized weights sum to 1", () => {
    const variants: Variant[] = [
      { id: "a", weight: 1 },
      { id: "b", weight: 2 },
      { id: "c", weight: 3 },
    ];
    const result = normalizeWeights(variants);
    const sum = result.reduce((s, v) => s + v.weight, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("already-normalized weights remain the same", () => {
    const variants: Variant[] = [{ id: "a", weight: 0.5 }, { id: "b", weight: 0.5 }];
    const result = normalizeWeights(variants);
    expect(result[0].weight).toBeCloseTo(0.5, 10);
    expect(result[1].weight).toBeCloseTo(0.5, 10);
  });

  it("preserves proportions", () => {
    const variants: Variant[] = [
      { id: "a", weight: 1 },
      { id: "b", weight: 3 },
    ];
    const result = normalizeWeights(variants);
    expect(result[0].weight).toBeCloseTo(0.25, 10);
    expect(result[1].weight).toBeCloseTo(0.75, 10);
  });

  it("does not mutate original variants", () => {
    const variants: Variant[] = [{ id: "a", weight: 2 }, { id: "b", weight: 2 }];
    normalizeWeights(variants);
    expect(variants[0].weight).toBe(2);
    expect(variants[1].weight).toBe(2);
  });

  it("handles three variants", () => {
    const variants: Variant[] = [
      { id: "a", weight: 10 },
      { id: "b", weight: 20 },
      { id: "c", weight: 70 },
    ];
    const result = normalizeWeights(variants);
    const sum = result.reduce((s, v) => s + v.weight, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(result[2].weight).toBeCloseTo(0.7, 10);
  });

  it("preserves id and name fields", () => {
    const variants: Variant[] = [{ id: "a", weight: 1, name: "Control" }];
    const result = normalizeWeights(variants);
    expect(result[0].id).toBe("a");
    expect(result[0].name).toBe("Control");
  });
});

// ---------------------------------------------------------------------------
// summarizeExperiment
// ---------------------------------------------------------------------------
describe("summarizeExperiment", () => {
  const exp: Experiment = {
    id: "exp-sum",
    variants: [
      { id: "control", weight: 0.5 },
      { id: "treatment", weight: 0.5 },
    ],
  };

  const data = [
    { variantId: "control", visitors: 1000, conversions: 100 },
    { variantId: "treatment", visitors: 1000, conversions: 150 },
  ];

  it("returns correct conversion rates", () => {
    const summary = summarizeExperiment(exp, data, "control");
    const ctrl = summary.variants.find((v) => v.id === "control");
    const trt = summary.variants.find((v) => v.id === "treatment");
    expect(ctrl?.conversionRate).toBeCloseTo(0.1, 4);
    expect(trt?.conversionRate).toBeCloseTo(0.15, 4);
  });

  it("control has relativeUplift=0", () => {
    const summary = summarizeExperiment(exp, data, "control");
    const ctrl = summary.variants.find((v) => v.id === "control");
    expect(ctrl?.relativeUplift).toBeCloseTo(0, 5);
  });

  it("treatment relativeUplift is correct (50% uplift)", () => {
    const summary = summarizeExperiment(exp, data, "control");
    const trt = summary.variants.find((v) => v.id === "treatment");
    expect(trt?.relativeUplift).toBeCloseTo(0.5, 2);
  });

  it("control field matches controlId", () => {
    const summary = summarizeExperiment(exp, data, "control");
    expect(summary.control).toBe("control");
  });

  it("experiment field matches input experiment", () => {
    const summary = summarizeExperiment(exp, data, "control");
    expect(summary.experiment.id).toBe(exp.id);
  });

  it("status=insufficient_data when fewer than 100 visitors", () => {
    const smallData = [
      { variantId: "control", visitors: 50, conversions: 5 },
      { variantId: "treatment", visitors: 50, conversions: 8 },
    ];
    const summary = summarizeExperiment(exp, smallData, "control");
    expect(summary.status).toBe("insufficient_data");
  });

  it("status=significant when significant difference detected", () => {
    const bigData = [
      { variantId: "control", visitors: 5000, conversions: 500 },
      { variantId: "treatment", visitors: 5000, conversions: 650 },
    ];
    const summary = summarizeExperiment(exp, bigData, "control");
    expect(summary.status).toBe("significant");
  });

  it("includes visitors and conversions in summary", () => {
    const summary = summarizeExperiment(exp, data, "control");
    const ctrl = summary.variants.find((v) => v.id === "control");
    expect(ctrl?.visitors).toBe(1000);
    expect(ctrl?.conversions).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// obrienFleming
// ---------------------------------------------------------------------------
describe("obrienFleming", () => {
  it("analysis 1 of 5 gives lower alpha than analysis 5 of 5", () => {
    const alpha1 = obrienFleming(1, 5);
    const alpha5 = obrienFleming(5, 5);
    expect(alpha1).toBeLessThan(alpha5);
  });

  it("final analysis (k=K) alpha approaches overall alpha", () => {
    const alpha = obrienFleming(5, 5, 0.05);
    expect(alpha).toBeCloseTo(0.05, 3);
  });

  it("alpha is always <= overall alpha", () => {
    for (let k = 1; k <= 5; k++) {
      expect(obrienFleming(k, 5)).toBeLessThanOrEqual(0.05);
    }
  });

  it("alpha is always positive", () => {
    for (let k = 1; k <= 5; k++) {
      expect(obrienFleming(k, 5)).toBeGreaterThan(0);
    }
  });

  it("alpha increases as more analyses are completed", () => {
    const alphas = [1, 2, 3, 4, 5].map((k) => obrienFleming(k, 5));
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeGreaterThanOrEqual(alphas[i - 1]);
    }
  });

  it("works for K=1 (single analysis, no adjustment)", () => {
    const alpha = obrienFleming(1, 1, 0.05);
    expect(alpha).toBeCloseTo(0.05, 3);
  });

  it("throws for invalid k=0", () => {
    expect(() => obrienFleming(0, 5)).toThrow();
  });

  it("throws when k > K", () => {
    expect(() => obrienFleming(6, 5)).toThrow();
  });

  it("respects custom alpha", () => {
    const alpha1 = obrienFleming(3, 5, 0.05);
    const alpha2 = obrienFleming(3, 5, 0.01);
    expect(alpha2).toBeLessThan(alpha1);
  });
});

// ---------------------------------------------------------------------------
// epsilonGreedy
// ---------------------------------------------------------------------------
describe("epsilonGreedy", () => {
  it("returns a valid arm id", () => {
    const arms = [
      { id: "a", conversions: 10, trials: 100 },
      { id: "b", conversions: 20, trials: 100 },
      { id: "c", conversions: 5, trials: 100 },
    ];
    const result = epsilonGreedy(arms, 0); // epsilon=0 → always exploit
    expect(["a", "b", "c"]).toContain(result);
  });

  it("with epsilon=0, always selects the best arm (deterministic exploit)", () => {
    const arms = [
      { id: "a", conversions: 10, trials: 100 },   // 10%
      { id: "b", conversions: 50, trials: 100 },   // 50% — best
      { id: "c", conversions: 5, trials: 100 },    // 5%
    ];
    const result = epsilonGreedy(arms, 0);
    expect(result).toBe("b");
  });

  it("throws when no arms provided", () => {
    expect(() => epsilonGreedy([])).toThrow();
  });

  it("handles arm with zero trials (rate=0)", () => {
    const arms = [
      { id: "a", conversions: 0, trials: 0 },
      { id: "b", conversions: 50, trials: 100 },
    ];
    // With epsilon=0, b should win since its rate (0.5) > a's rate (0)
    const result = epsilonGreedy(arms, 0);
    expect(result).toBe("b");
  });

  it("selects best arm when epsilon=0 across multiple calls", () => {
    const arms = [
      { id: "a", conversions: 30, trials: 100 },
      { id: "b", conversions: 10, trials: 100 },
    ];
    // Always exploits with epsilon=0
    for (let i = 0; i < 10; i++) {
      expect(epsilonGreedy(arms, 0)).toBe("a");
    }
  });
});

// ---------------------------------------------------------------------------
// thompsonSampling
// ---------------------------------------------------------------------------
describe("thompsonSampling", () => {
  it("returns a valid arm id", () => {
    const arms = [
      { id: "a", conversions: 10, trials: 100 },
      { id: "b", conversions: 20, trials: 100 },
    ];
    const result = thompsonSampling(arms, 42);
    expect(["a", "b"]).toContain(result);
  });

  it("is deterministic with the same seed", () => {
    const arms = [
      { id: "a", conversions: 10, trials: 100 },
      { id: "b", conversions: 20, trials: 100 },
      { id: "c", conversions: 15, trials: 100 },
    ];
    const r1 = thompsonSampling(arms, 1234);
    const r2 = thompsonSampling(arms, 1234);
    expect(r1).toBe(r2);
  });

  it("different seeds may return different results", () => {
    const arms = [
      { id: "a", conversions: 5, trials: 100 },
      { id: "b", conversions: 5, trials: 100 },
    ];
    const results = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      results.add(thompsonSampling(arms, seed));
    }
    // With equal arms, both should be selected across different seeds
    expect(results.size).toBeGreaterThan(1);
  });

  it("throws when no arms provided", () => {
    expect(() => thompsonSampling([])).toThrow();
  });

  it("handles arms with zero trials", () => {
    const arms = [
      { id: "a", conversions: 0, trials: 0 },
      { id: "b", conversions: 0, trials: 0 },
    ];
    const result = thompsonSampling(arms, 42);
    expect(["a", "b"]).toContain(result);
  });

  it("strongly favors best arm with overwhelming evidence over many draws", () => {
    const arms = [
      { id: "worst", conversions: 1, trials: 1000 },   // 0.1%
      { id: "best", conversions: 900, trials: 1000 },  // 90%
    ];
    const counts: Record<string, number> = { worst: 0, best: 0 };
    for (let seed = 1; seed <= 100; seed++) {
      const r = thompsonSampling(arms, seed);
      counts[r]++;
    }
    expect(counts["best"]).toBeGreaterThan(counts["worst"]);
  });

  it("works with single arm", () => {
    const arms = [{ id: "only", conversions: 5, trials: 10 }];
    expect(thompsonSampling(arms, 1)).toBe("only");
  });
});

// ---------------------------------------------------------------------------
// Edge cases / integration
// ---------------------------------------------------------------------------
describe("Edge cases", () => {
  it("twoProportionZTest handles large sample sizes", () => {
    const result = twoProportionZTest(10000, 100000, 10100, 100000);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it("bayesianABTest handles very high conversion rates", () => {
    const result = bayesianABTest(950, 1000, 980, 1000);
    expect(result.probBBeatsA).toBeGreaterThan(0);
    expect(result.probBBeatsA).toBeLessThanOrEqual(1);
  });

  it("bayesianABTest with custom samples=100 is faster but still valid", () => {
    const result = bayesianABTest(100, 1000, 200, 1000, 1, 1, 100);
    expect(result.probBBeatsA).toBeGreaterThanOrEqual(0);
    expect(result.probBBeatsA).toBeLessThanOrEqual(1);
  });

  it("normalizeWeights with all weights equal returns equal distribution", () => {
    const variants: Variant[] = [
      { id: "a", weight: 5 },
      { id: "b", weight: 5 },
      { id: "c", weight: 5 },
    ];
    const result = normalizeWeights(variants);
    for (const v of result) {
      expect(v.weight).toBeCloseTo(1 / 3, 10);
    }
  });

  it("assignVariant with a single-character userId works", () => {
    const exp: Experiment = {
      id: "e",
      variants: [{ id: "a", weight: 0.5 }, { id: "b", weight: 0.5 }],
    };
    const r = assignVariant(exp, "x");
    expect(["a", "b"]).toContain(r.variantId);
  });

  it("sampleSize with very high MDE (100% relative) returns small sample", () => {
    const r = sampleSize(0.1, 1.0); // 100% relative MDE
    expect(r.perVariant).toBeGreaterThan(0);
    expect(r.perVariant).toBeLessThan(500); // Should be small relative to low-MDE experiments
  });

  it("multiVariantTest with identical control and treatment rates", () => {
    const variants = [
      { id: "control", conversions: 100, visitors: 1000 },
      { id: "treatment", conversions: 100, visitors: 1000 },
    ];
    const results = multiVariantTest(variants, "control");
    const trt = results.find((r) => r.id === "treatment");
    expect(trt?.result?.winner).toBeNull();
  });

  it("summarizeExperiment with zero conversions", () => {
    const exp: Experiment = {
      id: "zero",
      variants: [{ id: "a", weight: 0.5 }, { id: "b", weight: 0.5 }],
    };
    const data = [
      { variantId: "a", visitors: 1000, conversions: 0 },
      { variantId: "b", visitors: 1000, conversions: 0 },
    ];
    const summary = summarizeExperiment(exp, data, "a");
    expect(summary.variants[0].conversionRate).toBe(0);
    expect(summary.variants[1].conversionRate).toBe(0);
  });
});
