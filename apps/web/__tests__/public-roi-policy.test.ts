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

  it("claims profit only when the BCa lower bound clears break-even (strong record)", () => {
    // A clearly-winning record over a big sample: lower bound should clear 0.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(p.canExposeRoi).toBe(true);
    expect(p.clearsProfit).toBe(true);
    expect(p.roiCiLow!).toBeGreaterThan(0);
    expect(p.publicMessage).toMatch(/clears break-even/);
  });

  it("is deterministic: same returns -> identical published band", () => {
    const returns = canonicalWins(120, 90);
    const a = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns });
    const b = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns });
    expect(a.roiCiLow).toBe(b.roiCiLow);
    expect(a.roiCiHigh).toBe(b.roiCiHigh);
  });
});
