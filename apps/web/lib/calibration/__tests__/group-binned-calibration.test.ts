import { describe, expect, it } from "vitest";
import {
  computeGroupBinnedCalibration,
  MIN_PUBLISH_N,
  MIN_QUANTILE_N,
  type GroupCalibrationInput,
} from "@/lib/calibration/group-binned-calibration";

function fiftyFifty(
  n: number,
  overrides: Partial<GroupCalibrationInput> = {},
): GroupCalibrationInput[] {
  const half = n / 2;
  const rows: GroupCalibrationInput[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: `${overrides.sport ?? "MLB"}-${overrides.market ?? "SPREAD"}-${i}`,
      confidence: 70,
      result: i < half ? "WIN" : "LOSS",
      sport: "MLB",
      pickType: "SPREAD",
      bookmakerCount: 5,
      ...overrides,
    });
  }
  return rows;
}

describe("computeGroupBinnedCalibration", () => {
  it("returns an empty, well-formed report for no input", () => {
    const report = computeGroupBinnedCalibration([]);
    expect(report.bins).toEqual([]);
    expect(report.alpha).toBe(0.1);
    expect(report.minQuantileN).toBe(MIN_QUANTILE_N);
    expect(report.minPublishN).toBe(MIN_PUBLISH_N);
    expect(report.note).toMatch(/no.*borrowing/i);
  });

  it("threshold constants match the pre-registered anchors (n>=9 quantile, n>=138 publish)", () => {
    expect(MIN_QUANTILE_N).toBe(9);
    expect(MIN_PUBLISH_N).toBe(138);
  });

  it("a bin below MIN_QUANTILE_N refuses a quantile outright, with no numeric fields to misread", () => {
    const report = computeGroupBinnedCalibration(fiftyFifty(4));
    expect(report.bins).toHaveLength(1);
    const bin = report.bins[0]!;
    expect(bin.status).toBe("insufficient_for_quantile");
    expect(bin.n).toBe(4);
    if (bin.status === "insufficient_for_quantile") {
      expect(bin.minQuantileN).toBe(MIN_QUANTILE_N);
    }
    // The type is a discriminated union: fields from the other branches must
    // not be present on this one, so a caller cannot read a stale/undefined
    // qHat and mistake it for a real value.
    expect("qHat" in bin).toBe(false);
  });

  it("a bin at or above MIN_QUANTILE_N but below MIN_PUBLISH_N computes but withholds publication", () => {
    const report = computeGroupBinnedCalibration(fiftyFifty(20));
    expect(report.bins).toHaveLength(1);
    const bin = report.bins[0]!;
    expect(bin.status).toBe("computed_not_publishable");
    expect(bin.n).toBe(20);
    if (bin.status === "computed_not_publishable") {
      expect(bin.qHat).toBeCloseTo(0.7, 6);
      expect(bin.meanResidual).toBeCloseTo(0.5, 6);
      expect(bin.hitRate).toBeCloseTo(0.5, 6);
      expect(bin.coverage).toBeCloseTo(1.0, 6);
      expect(bin.minPublishN).toBe(MIN_PUBLISH_N);
    }
  });

  it("a bin at or above MIN_PUBLISH_N publishes, with the denominator carried alongside", () => {
    const report = computeGroupBinnedCalibration(fiftyFifty(150));
    expect(report.bins).toHaveLength(1);
    const bin = report.bins[0]!;
    expect(bin.status).toBe("published");
    expect(bin.n).toBe(150);
    if (bin.status === "published") {
      expect(bin.qHat).toBeCloseTo(0.7, 6);
      expect(bin.meanResidual).toBeCloseTo(0.5, 6);
      expect(bin.hitRate).toBeCloseTo(0.5, 6);
      expect(bin.coverage).toBeCloseTo(1.0, 6);
      expect(bin.clopperPearsonLow).toBeTypeOf("number");
      expect(bin.clopperPearsonHigh).toBeTypeOf("number");
    }
  });

  it("never borrows across groups: two thin sport groups stay two thin bins, never merged into one", () => {
    const rows = [
      ...fiftyFifty(5, { sport: "NFL", market: "SPREAD" }),
      ...fiftyFifty(5, { sport: "MLB", market: "SPREAD" }),
    ];
    const report = computeGroupBinnedCalibration(rows);
    expect(report.bins).toHaveLength(2);
    for (const bin of report.bins) {
      expect(bin.status).toBe("insufficient_for_quantile");
      expect(bin.n).toBe(5);
    }
  });

  it("buckets an unknown bookmaker count separately from a confirmed zero", () => {
    const rows = [
      ...fiftyFifty(5, { bookmakerCount: 0 }),
      ...fiftyFifty(5, { bookmakerCount: null }),
    ];
    const report = computeGroupBinnedCalibration(rows);
    expect(report.bins).toHaveLength(2);
    const buckets = report.bins.map((bin) => bin.key.bookmakerBucket).sort();
    expect(buckets).toEqual(["0", "unknown"]);
  });

  it("excludes PUSH, VOID and PENDING from n, the same decided-only convention as compute.ts", () => {
    const rows: GroupCalibrationInput[] = [
      ...fiftyFifty(4),
      { id: "push", confidence: 70, result: "PUSH", sport: "MLB", pickType: "SPREAD" },
      { id: "void", confidence: 70, result: "VOID", sport: "MLB", pickType: "SPREAD" },
      { id: "pending", confidence: 70, result: "PENDING", sport: "MLB", pickType: "SPREAD" },
    ];
    const report = computeGroupBinnedCalibration(rows);
    expect(report.bins).toHaveLength(1);
    expect(report.bins[0]!.n).toBe(4);
  });

  it("carries the Defect-A caveat: partitioning is not a repair for an inverted score", () => {
    const report = computeGroupBinnedCalibration(fiftyFifty(20));
    expect(report.note).toMatch(/does not repair an inverted/i);
  });
});
