import { describe, expect, it } from "vitest";
import { MODEL_VERSION } from "@sports/prediction-engine";
import { deployedVersionSlice } from "./calibration-eligibility-durable";

/**
 * The deployed-version slice lookup — the ONLY thing a MODEL_VERSION bump
 * changes in the calibration gate, and until now it had no tests at all.
 *
 * `MODEL_VERSION` is mostly a write-time stamp on new picks. The one place it
 * changes behaviour is here: the gate scores the version actually serving
 * traffic against its own settled rows, and it finds those rows by matching
 * this exact string. So on the day MODEL_VERSION changes, this function starts
 * looking for a key that does not exist yet.
 *
 * That makes its three branches worth pinning, because the suite was blind to
 * the single thing a bump moves. The one a reader should linger on is the
 * middle one.
 */

function slice(key: string, n: number) {
  return { key, n, brier: 0.19, ece: 0.03, eceNoise: 0.01, eceDebiased: 0.02 };
}

describe("deployedVersionSlice", () => {
  it("returns the deployed version's own slice when the sample has its rows", () => {
    const got = deployedVersionSlice({
      byModelVersion: [slice("v5.0.0", 40), slice(MODEL_VERSION, 245)],
    } as never);
    expect(got).not.toBeNull();
    expect(got!.key).toBe(MODEL_VERSION);
    expect(got!.n).toBe(245);
  });

  it("returns null when the artifact carries no byModelVersion breakdown at all", () => {
    // Legitimately unanswerable: artifacts written before the breakdown existed
    // cannot say anything about the deployed version, and retro-failing them on
    // a question their data does not contain would be wrong (C-275).
    expect(deployedVersionSlice({} as never)).toBeNull();
    expect(deployedVersionSlice({ byModelVersion: [] } as never)).toBeNull();
    expect(deployedVersionSlice(null)).toBeNull();
    expect(deployedVersionSlice(undefined)).toBeNull();
  });

  it("ALSO returns null when the breakdown exists but the deployed version is absent — the day-one-after-a-bump hole", () => {
    // THIS IS THE CASE TO UNDERSTAND BEFORE BUMPING MODEL_VERSION.
    //
    // The artifact here is current and complete: it HAS a breakdown, and that
    // breakdown says the deployed version has zero settled rows. That is not an
    // unanswerable question like the case above — it is an answer, and the
    // answer is "no evidence".
    //
    // Returning null collapses both cases into "no additional check", so
    // evaluateCalibrationEligibility skips its deployed-version block entirely
    // (`if (deployed) {`, calibration-eligibility.ts:206) and the gate reads
    // GREEN for a version nothing has been measured on.
    //
    // It self-corrects the moment ONE pick settles: sliceCalibrationMetrics
    // emits a slice for every group with at least one row, so n becomes 1, the
    // block runs, `1 < floors.n` fires, and the gate goes RED — which also
    // unpublishes the calibration receipt (calibration-publish-policy.ts:84).
    //
    // So a bump buys roughly one day of unearned GREEN followed by a RED that
    // darkens the public record. Closing the hole is a gate-behaviour change
    // and therefore founder-only (law 3); this test does not close it. It
    // makes it executable, so the next person to bump MODEL_VERSION meets it
    // here instead of in production.
    const got = deployedVersionSlice({
      byModelVersion: [slice("v5.0.0", 40), slice("v5.2.6", 110)],
    } as never);
    expect(got).toBeNull();
  });

  it("carries the C-292 corrected fields through, and keeps absent ones null", () => {
    // Absent means "this slice predates the correction", and the gate then
    // reads the raw ECE, which is the stricter direction. Undefined would leak.
    const withCorrection = deployedVersionSlice({
      byModelVersion: [slice(MODEL_VERSION, 200)],
    } as never);
    expect(withCorrection!.eceDebiased).toBe(0.02);

    const preCorrection = deployedVersionSlice({
      byModelVersion: [{ key: MODEL_VERSION, n: 200, brier: 0.19, ece: 0.03 }],
    } as never);
    expect(preCorrection!.eceDebiased).toBeNull();
    expect(preCorrection!.eceNoise).toBeNull();
    expect(preCorrection!.eceDebiasedCi90Lo).toBeNull();
  });
});
