import { describe, expect, it } from "vitest";
import { sliceCalibrationMetrics } from "./metric-slices";
import { DEFAULT_CALIBRATION_FLOORS } from "@/lib/ops/calibration-eligibility";

type Sample = { readonly p: number; readonly y: 0 | 1; readonly sportKey: string };

function samples(sportKey: string, n: number): Sample[] {
  return Array.from({ length: n }, (_, i) => ({
    p: 0.6,
    y: i % 2 === 0 ? 1 : 0,
    sportKey,
  }));
}

describe("sliceCalibrationMetrics smallSample flag (ledger C-176/178)", () => {
  it("flags a slice below the pooled eligibility floor as smallSample", () => {
    const rows = samples("americanfootball_ncaaf", 65);
    const [slice] = sliceCalibrationMetrics(rows, (s) => s.sportKey);
    expect(slice!.n).toBe(65);
    expect(slice!.n).toBeLessThan(DEFAULT_CALIBRATION_FLOORS.n);
    expect(slice!.smallSample).toBe(true);
  });

  it("does not flag a slice at or above the pooled eligibility floor", () => {
    const rows = samples("baseball_mlb", DEFAULT_CALIBRATION_FLOORS.n);
    const [slice] = sliceCalibrationMetrics(rows, (s) => s.sportKey);
    expect(slice!.n).toBe(DEFAULT_CALIBRATION_FLOORS.n);
    expect(slice!.smallSample).toBe(false);
  });

  it("computes the flag independently per slice, not off the pooled total", () => {
    // A thin NCAAF slice sitting beside a large MLB slice must still read
    // smallSample=true for NCAAF even though the pooled n clears the floor —
    // the pooled number cannot vouch for the thin slice (AGENTS.md's own
    // "MLB carries the pool" finding).
    const rows = [...samples("americanfootball_ncaaf", 28), ...samples("baseball_mlb", 365)];
    const slices = sliceCalibrationMetrics(rows, (s) => s.sportKey);
    const ncaaf = slices.find((s) => s.key === "americanfootball_ncaaf")!;
    const mlb = slices.find((s) => s.key === "baseball_mlb")!;
    expect(ncaaf.smallSample).toBe(true);
    expect(mlb.smallSample).toBe(false);
  });
});
