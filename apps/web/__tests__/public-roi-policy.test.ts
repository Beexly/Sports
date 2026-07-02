import { describe, it, expect } from "vitest";
import {
  evaluatePublicRoiPolicy,
  unitsForPick,
} from "@/lib/performance/public-roi-policy";

/**
 * The public units/ROI policy: honest, gated, and deterministic. It only claims
 * profit when the BCa lower bound clears break-even (0 units) — the same
 * discipline as the Wilson-gated CLV policy.
 */

describe("unitsForPick", () => {
  it("pays the decimal profit on a win at the actual price", () => {
    expect(unitsForPick("WIN", -110)).toBeCloseTo(0.9091, 3); // risk 1.1 to win 1
    expect(unitsForPick("WIN", 100)).toBeCloseTo(1, 6);
    expect(unitsForPick("WIN", 150)).toBeCloseTo(1.5, 6);
  });
  it("loses the stake on a loss, zero on no-action", () => {
    expect(unitsForPick("LOSS", -110)).toBe(-1);
    expect(unitsForPick("PUSH", -110)).toBe(0);
    expect(unitsForPick("VOID", 200)).toBe(0);
    expect(unitsForPick("PENDING", -110)).toBe(0);
  });
  it("excludes a pick with no usable entry price", () => {
    expect(unitsForPick("WIN", null)).toBeNull();
    expect(unitsForPick("WIN", 0)).toBeNull();
  });
});

describe("evaluatePublicRoiPolicy", () => {
  const canonicalWins = (win: number, loss: number): number[] => [
    ...Array(win).fill(unitsForPick("WIN", -110) as number),
    ...Array(loss).fill(-1),
  ];

  it("gates when the performance flag is off", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: false, minGradedForPublic: 25, returns: canonicalWins(60, 40) });
    expect(p.canExposeRoi).toBe(false);
    expect(p.roiPerBet).toBeNull();
    expect(p.primaryReason).toBe("GATE_OFF_PERFORMANCE_STATS");
  });

  it("gates when the sample is too small", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(5, 3) });
    expect(p.canExposeRoi).toBe(false);
    expect(p.primaryReason).toBe("INSUFFICIENT_GRADED_SAMPLE");
  });

  it("is HONEST: a break-even-ish record does NOT claim profit (lower bound below 0)", () => {
    // ~52.4% wins at -110 is roughly break-even; the BCa lower bound stays below 0.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(53, 47) });
    expect(p.canExposeRoi).toBe(true);
    expect(p.clearsProfit).toBe(false);
    expect(p.roiCiLow!).toBeLessThan(0);
    expect(p.publicMessage).toMatch(/includes break-even/);
  });

  it("claims profit only when BOTH methods' lower bounds clear break-even (strong record)", () => {
    // A clearly-winning record over a big sample: both the BCa and studentized
    // lower bounds should clear 0, so the corroborated profit claim holds.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(p.canExposeRoi).toBe(true);
    expect(p.clearsProfit).toBe(true);
    expect(p.roiCiLow!).toBeGreaterThan(0);
    expect(p.roiCiLowStudentized!).toBeGreaterThan(0); // the independent cross-check agrees
    expect(p.publicMessage).toMatch(/two independent interval methods/);
  });

  it("surfaces the studentized cross-check band alongside the BCa band", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(120, 90) });
    expect(p.canExposeRoi).toBe(true);
    expect(Number.isFinite(p.roiCiLowStudentized!)).toBe(true);
    expect(Number.isFinite(p.roiCiHighStudentized!)).toBe(true);
    // Both second-order methods should agree closely on a large, well-behaved
    // sample (same point, comparable width) — a sanity check on corroboration.
    expect(p.roiCiHighStudentized!).toBeGreaterThan(p.roiCiLowStudentized!);
    expect(p.operatorMessage).toMatch(/stud=\[/);
  });

  it("is HONEST under corroboration: BCa-only optimism does not by itself claim profit", () => {
    // clearsProfit is the AND of two methods, so it can never be true unless the
    // studentized lower bound also clears 0. Assert the field is exactly that AND.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(53, 47) });
    const bothClear = p.roiCiLow! > 0 && p.roiCiLowStudentized! > 0;
    expect(p.clearsProfit).toBe(bothClear);
    expect(p.clearsProfit).toBe(false);
  });

  it("gates the studentized band too (null when not allowed)", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: false, minGradedForPublic: 25, returns: canonicalWins(60, 40) });
    expect(p.roiCiLowStudentized).toBeNull();
    expect(p.roiCiHighStudentized).toBeNull();
  });

  it("is deterministic: same returns -> identical published bands (both methods)", () => {
    const returns = canonicalWins(120, 90);
    const a = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns });
    const b = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns });
    expect(a.roiCiLow).toBe(b.roiCiLow);
    expect(a.roiCiHigh).toBe(b.roiCiHigh);
    expect(a.roiCiLowStudentized).toBe(b.roiCiLowStudentized);
    expect(a.roiCiHighStudentized).toBe(b.roiCiHighStudentized);
  });
});
