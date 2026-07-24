import { describe, it, expect } from "vitest";
import { redactUnpublishableBuckets } from "./public-redaction";
import { computeCalibration, type CalibrationPickInput } from "./compute";

/**
 * The public `/api/calibration` JSON export must not leak a bucket's
 * observed win rate before it clears the same publish floor the rendered
 * UI already enforces (`sufficientSample`) — see
 * `__tests__/calibration-min-sample-floor.test.ts` for why `computeCalibration`
 * itself must keep computing the raw value for internal (proposal/Brier)
 * consumers. This test covers the API-boundary redaction specifically.
 */

function picks(confidence: number, count: number): CalibrationPickInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${confidence}-${i}`,
    confidence,
    result: i % 2 === 0 ? "WIN" : "LOSS",
  }));
}

describe("redactUnpublishableBuckets", () => {
  it("nulls observedWinRate and delta for a below-floor bucket", () => {
    const report = computeCalibration([
      { id: "w1", confidence: 95, result: "WIN" },
      { id: "w2", confidence: 95, result: "WIN" },
    ]);
    const redacted = redactUnpublishableBuckets(report.buckets);
    const b = redacted.find((x) => x.label === "90-100");
    expect(b?.sufficientSample).toBe(false);
    expect(b?.observedWinRate).toBeNull();
    expect(b?.delta).toBeNull();
    // sampleSize (a bare count, not a rate) is not a substantiation concern —
    // it stays visible so the UI can render "N/30 settled".
    expect(b?.sampleSize).toBe(2);
  });

  it("passes an at-or-above-floor bucket through unredacted", () => {
    const report = computeCalibration(picks(75, 35));
    const redacted = redactUnpublishableBuckets(report.buckets);
    const b = redacted.find((x) => x.label === "70-79");
    expect(b?.sufficientSample).toBe(true);
    expect(b?.observedWinRate).not.toBeNull();
    expect(typeof b?.observedWinRate).toBe("number");
  });

  it("redacts every below-floor bucket in a mixed report, leaving above-floor ones intact", () => {
    const report = computeCalibration([...picks(75, 35), ...picks(85, 5)]);
    const redacted = redactUnpublishableBuckets(report.buckets);
    for (const b of redacted) {
      if (b.sufficientSample) {
        expect(typeof b.observedWinRate).toBe("number");
      } else {
        expect(b.observedWinRate).toBeNull();
        expect(b.delta).toBeNull();
      }
    }
    expect(redacted.some((b) => b.sufficientSample)).toBe(true);
    expect(redacted.some((b) => !b.sufficientSample)).toBe(true);
  });

  it("every bucket is redacted when the calibration set is empty", () => {
    const report = computeCalibration([]);
    const redacted = redactUnpublishableBuckets(report.buckets);
    expect(redacted.length).toBeGreaterThan(0);
    expect(redacted.every((b) => b.observedWinRate === null && b.delta === null)).toBe(true);
  });
});
