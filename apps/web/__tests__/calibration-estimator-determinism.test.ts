/**
 * Determinism guard for the calibration gate (2026-09-11).
 *
 * The defect this pins: on 09-10 the eligibility gate flipped GREEN → RED 15
 * minutes apart with EVERY measured field identical (n 392, brier 0.2111, ece
 * 0.0639; deployed n 270, raw ece 0.0969, eceDebiased 0.060636). The only
 * numbers that moved were the seeded noise estimate and its bootstrap bound
 * (0.051233 → 0.051463; bound 0.045248 → 0.050217), which crossed the 0.05
 * floor and auto-unpublished the product.
 *
 * Root cause: both seeded estimators consume rows in array order, and the
 * canonical pick query has no ORDER BY. Same rows, different permutation,
 * different verdict.
 *
 * These tests fail if that ever comes back.
 */

import { describe, expect, it } from "vitest";
import type { CalibrationSample } from "@sports/prediction-engine";
import {
  canonicalSampleOrder,
  sampleSignature,
} from "@/lib/calibration/canonical-sample-order";
import { debiasedExpectedCalibrationError } from "@/lib/calibration/ece-debiased";
import {
  bootstrapDebiasedEceLowerBound,
  sliceCalibrationMetrics,
} from "@/lib/calibration/metric-slices";
import { verdictStabilityOnIdenticalMetrics } from "@/lib/ops/calibration-eligibility-durable";
import type { CalibrationEligibilityReport } from "@/lib/ops/calibration-eligibility";

/** A fixed, ugly sample: duplicates, extreme p, mixed outcomes. */
const BASE: CalibrationSample[] = [
  { p: 0.62, y: 1 },
  { p: 0.71, y: 1 },
  { p: 0.62, y: 0 },
  { p: 0.44, y: 0 },
  { p: 0.93, y: 1 },
  { p: 0.51, y: 1 },
  { p: 0.38, y: 0 },
  { p: 0.77, y: 0 },
  { p: 0.55, y: 1 },
  { p: 0.66, y: 1 },
  { p: 0.29, y: 0 },
  { p: 0.84, y: 1 },
  { p: 0.47, y: 0 },
  { p: 0.58, y: 1 },
  { p: 0.69, y: 0 },
  { p: 0.36, y: 1 },
  { p: 0.61, y: 1 },
  { p: 0.5, y: 0 },
  { p: 0.88, y: 1 },
  { p: 0.42, y: 0 },
  { p: 0.73, y: 1 },
  { p: 0.31, y: 0 },
  { p: 0.95, y: 1 },
  { p: 0.57, y: 0 },
  { p: 0.64, y: 1 },
  { p: 0.46, y: 1 },
  { p: 0.82, y: 0 },
  { p: 0.53, y: 0 },
  { p: 0.6, y: 1 },
  { p: 0.68, y: 1 },
];

/** Deterministic shuffle so the test itself is reproducible. */
function rotate<T>(rows: readonly T[], by: number): T[] {
  const k = ((by % rows.length) + rows.length) % rows.length;
  return [...rows.slice(k), ...rows.slice(0, k)];
}

describe("canonical sample order", () => {
  it("is order-independent: every rotation produces one signature", () => {
    const sigs = new Set<string>();
    for (let i = 0; i < BASE.length; i += 1) sigs.add(sampleSignature(rotate(BASE, i)));
    expect(sigs.size).toBe(1);
  });

  it("does not mutate its input", () => {
    const before = BASE.map((s) => `${s.p}:${s.y}`).join(",");
    canonicalSampleOrder(BASE);
    expect(BASE.map((s) => `${s.p}:${s.y}`).join(",")).toBe(before);
  });
});

describe("seeded estimators are permutation-invariant once canonically ordered", () => {
  it("debiasedExpectedCalibrationError: same rows, any rotation → same noise and debiased", () => {
    const expected = debiasedExpectedCalibrationError(canonicalSampleOrder(BASE));
    for (let i = 1; i < BASE.length; i += 1) {
      const got = debiasedExpectedCalibrationError(
        canonicalSampleOrder(rotate(BASE, i)),
      );
      expect(got.noise).toBe(expected.noise);
      expect(got.debiased).toBe(expected.debiased);
      expect(got.reliability).toBe(expected.reliability);
    }
  });

  it("bootstrapDebiasedEceLowerBound: same rows, any rotation → same 5th-percentile bound", () => {
    // 5th-percentile bound of the variance-corrected ECE — the number the
    // deployed-version floor reads, and the one that flipped on 09-10.
    expect(BASE.length).toBeGreaterThanOrEqual(30);
    const expected = bootstrapDebiasedEceLowerBound(canonicalSampleOrder(BASE));
    expect(expected).not.toBeNull();
    for (let i = 1; i < BASE.length; i += 1) {
      expect(bootstrapDebiasedEceLowerBound(canonicalSampleOrder(rotate(BASE, i)))).toBe(
        expected,
      );
    }
  });

  it("slice metrics are identical under rotation (this is the guard that would have caught 09-10)", () => {
    const tagged = BASE.map((s, i) => ({ ...s, modelVersion: i % 2 === 0 ? "v5.2.7" : "v5.2.6" }));
    const expected = JSON.stringify(sliceCalibrationMetrics(tagged, (s) => s.modelVersion));
    for (let i = 1; i < tagged.length; i += 1) {
      expect(
        JSON.stringify(sliceCalibrationMetrics(rotate(tagged, i), (s) => s.modelVersion)),
      ).toBe(expected);
    }
  });
});

describe("verdict stability guard", () => {
  const report = (
    over: Partial<CalibrationEligibilityReport>,
  ): CalibrationEligibilityReport =>
    ({
      status: "GREEN",
      n: 392,
      brier: 0.2111,
      ece: 0.0639,
      eceDebiased: 0.039878,
      ...over,
    }) as CalibrationEligibilityReport;

  it("flags a GREEN → RED flip when every measured metric is identical", () => {
    const prior = report({ status: "GREEN" });
    const next = report({ status: "RED" });
    const stability = verdictStabilityOnIdenticalMetrics(prior, next);
    expect(stability?.flagged).toBe(true);
    expect(stability?.note).toContain("Same metrics, different verdict");
    expect(stability?.note).toContain("GREEN → RED");
  });

  it("does not flag when the metrics actually moved", () => {
    expect(
      verdictStabilityOnIdenticalMetrics(report({ status: "GREEN" }), report({ status: "RED", n: 400 })),
    ).toBeUndefined();
    expect(
      verdictStabilityOnIdenticalMetrics(
        report({ status: "GREEN" }),
        report({ status: "RED", eceDebiased: 0.051 }),
      ),
    ).toBeUndefined();
  });

  it("does not flag when the verdict is unchanged, or with no prior snap", () => {
    expect(verdictStabilityOnIdenticalMetrics(report({}), report({}))).toBeUndefined();
    expect(verdictStabilityOnIdenticalMetrics(null, report({ status: "RED" }))).toBeUndefined();
  });
});
