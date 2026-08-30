import { describe, expect, it } from "vitest";
import { assessDrift, computeWindowCalibration, type ScoredOutcome } from "../calibration-drift.js";

// Helper: n outcomes at prob p, the first `wins` of which won.
const window = (n: number, p: number, wins: number): ScoredOutcome[] =>
  Array.from({ length: n }, (_, i) => ({ prob: p, won: i < wins }));

describe("computeWindowCalibration", () => {
  it("computes Brier, accuracy and bias", () => {
    const c = computeWindowCalibration(window(10, 0.7, 7)); // 70% predicted, 70% actual
    expect(c.accuracy).toBe(0.7);
    expect(c.meanPredicted).toBe(0.7);
    expect(c.calibrationError).toBe(0); // perfectly calibrated on average
    expect(c.brier).toBeCloseTo(0.21, 4); // 0.7*0.09 + 0.3*0.49
  });
});

describe("assessDrift", () => {
  it("reports no drift when windows are similar", () => {
    const r = assessDrift(window(50, 0.7, 35), window(50, 0.7, 35));
    expect(r.severity).toBe("none");
    expect(r.drifted).toBe(false);
  });

  it("raises an alert when recent calibration degrades sharply", () => {
    // baseline well-calibrated; recent is confidently wrong (70% pred, 30% actual)
    const r = assessDrift(window(50, 0.7, 35), window(50, 0.7, 15));
    expect(r.brierDelta).toBeGreaterThan(0.05);
    expect(r.severity).toBe("alert");
    expect(r.drifted).toBe(true);
  });

  it("flags watch when recent Brier degrades mildly (watch ≤ delta < alert)", () => {
    // baseline 35/50 wins (brier 0.21); recent 30/50 wins (brier 0.25) → delta 0.04
    const r = assessDrift(window(50, 0.7, 35), window(50, 0.7, 30));
    expect(r.brierDelta).toBeGreaterThanOrEqual(0.02);
    expect(r.brierDelta).toBeLessThan(0.05);
    expect(r.severity).toBe("watch");
    expect(r.drifted).toBe(true);
  });

  it("returns insufficient when a window is too small to judge", () => {
    const r = assessDrift(window(5, 0.7, 3), window(50, 0.7, 15));
    expect(r.severity).toBe("insufficient");
    expect(r.drifted).toBe(false);
  });
});
