import { describe, expect, it } from "vitest";
import {
  OFFLINE_CLV_FIXTURE,
  computeClv,
  runOfflineClvBrierDiagnostic,
} from "./offline-clv-brier-diagnostic";

describe("computeClv", () => {
  it("is model − close", () => {
    expect(computeClv(0.58, 0.55)).toBeCloseTo(0.03);
  });
  it("null for non-finite", () => {
    expect(computeClv(Number.NaN, 0.5)).toBeNull();
  });
});

describe("runOfflineClvBrierDiagnostic", () => {
  it("scores fixture without DB", () => {
    const r = runOfflineClvBrierDiagnostic(OFFLINE_CLV_FIXTURE);
    expect(r.overall.n).toBe(6);
    expect(r.overall.meanClv).not.toBeNull();
    expect(r.overall.brierModel).not.toBeNull();
    expect(r.bySport.length).toBe(3);
  });

  it("handles empty", () => {
    const r = runOfflineClvBrierDiagnostic([]);
    expect(r.overall.n).toBe(0);
    expect(r.overall.meanClv).toBeNull();
  });
});
