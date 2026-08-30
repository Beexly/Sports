import { describe, it, expect } from "vitest";
import { brierScore } from "@/lib/calibration/brier";
import { confidenceBuckets, expectedCalibrationError, maximumCalibrationError } from "@/lib/calibration/ece";

// ============================================================
// Boundary coverage for the calibration primitives.
// agent-os-runtime.test.ts asserts one happy-path sample; this file
// adds the MISSING edges: empty→0 (never NaN), perfect/worst Brier
// bounds, bucket geometry, the inclusive top bucket (p===1), and the
// ECE<=MCE relationship. Additive only; no source edits.
// ============================================================

type Sample = { readonly probability: number; readonly outcome: 0 | 1 };

describe("calibration boundaries — brier / ece", () => {
  it("returns 0 (never NaN) for empty input", () => {
    expect(brierScore([])).toBe(0);
    expect(expectedCalibrationError([])).toBe(0);
    expect(maximumCalibrationError([])).toBe(0);
  });

  it("scores a perfectly-calibrated set 0 and a perfectly-wrong set 1, bounded in [0,1]", () => {
    const perfect: Sample[] = [
      { probability: 1, outcome: 1 },
      { probability: 0, outcome: 0 },
    ];
    expect(brierScore(perfect)).toBe(0);

    const worst: Sample[] = [
      { probability: 1, outcome: 0 },
      { probability: 0, outcome: 1 },
    ];
    expect(brierScore(worst)).toBe(1);

    // Mixed set stays inside the unit interval.
    const mixed: Sample[] = [
      { probability: 0.6, outcome: 1 },
      { probability: 0.4, outcome: 0 },
      { probability: 0.9, outcome: 0 },
    ];
    const score = brierScore(mixed);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("returns exactly bucketCount buckets with lower/upper = i/n..(i+1)/n and gap=|avgConfidence-accuracy|", () => {
    const n = 4;
    const samples: Sample[] = [
      { probability: 0.1, outcome: 0 },
      { probability: 0.35, outcome: 1 },
      { probability: 0.6, outcome: 1 },
      { probability: 0.85, outcome: 0 },
    ];
    const buckets = confidenceBuckets(samples, n);
    expect(buckets).toHaveLength(n);
    buckets.forEach((bucket, i) => {
      expect(bucket.lower).toBeCloseTo(i / n, 10);
      expect(bucket.upper).toBeCloseTo((i + 1) / n, 10);
      expect(bucket.gap).toBeCloseTo(Math.abs(bucket.avgConfidence - bucket.accuracy), 10);
    });
  });

  it("includes probability===1 in the top bucket (inclusive upper edge), not dropped", () => {
    const n = 5;
    const samples: Sample[] = [{ probability: 1, outcome: 1 }];
    const buckets = confidenceBuckets(samples, n);
    const top = buckets[n - 1]!;
    expect(top.count).toBe(1);
    // Lower buckets must not have captured the p===1 sample.
    const lowerTotal = buckets.slice(0, n - 1).reduce((sum, b) => sum + b.count, 0);
    expect(lowerTotal).toBe(0);
  });

  it("holds ECE <= MCE for any sample set", () => {
    const samples: Sample[] = [
      { probability: 0.05, outcome: 1 },
      { probability: 0.25, outcome: 0 },
      { probability: 0.55, outcome: 1 },
      { probability: 0.65, outcome: 0 },
      { probability: 0.95, outcome: 1 },
      { probability: 1, outcome: 0 },
    ];
    const ece = expectedCalibrationError(samples);
    const mce = maximumCalibrationError(samples);
    expect(ece).toBeLessThanOrEqual(mce + 1e-12);
  });

  it("is deterministic for identical input", () => {
    const samples: Sample[] = [
      { probability: 0.3, outcome: 0 },
      { probability: 0.7, outcome: 1 },
      { probability: 0.5, outcome: 1 },
    ];
    expect(brierScore(samples)).toBe(brierScore(samples));
    expect(expectedCalibrationError(samples)).toBe(expectedCalibrationError(samples));
    expect(confidenceBuckets(samples)).toEqual(confidenceBuckets(samples));
  });
});
