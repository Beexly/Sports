import { describe, it, expect } from "vitest";
import {
  empiricalRisk,
  hoeffdingBentkusUcb,
  empiricalBernsteinUcb,
  selectLambdaHat,
  realizedRiskAudit,
  maxDrawdown,
} from "@/lib/calibration/risk-controlling-sets";

// ============================================================
// arXiv 2101.02703 — risk-controlling prediction sets. Additive.
// ============================================================

describe("risk-controlling sets — 2101.02703", () => {
  it("empiricalRisk is the mean loss", () => {
    expect(empiricalRisk([1, 0, 1, 0])).toBeCloseTo(0.5, 10);
    expect(empiricalRisk([])).toBe(0);
  });

  it("UCBs upper-bound the empirical risk", () => {
    const losses = [1, 0, 0, 1, 0, 0, 0, 1, 0, 0];
    const r = empiricalRisk(losses);
    expect(hoeffdingBentkusUcb(losses, 0.1)).toBeGreaterThanOrEqual(r);
    expect(empiricalBernsteinUcb(losses, 0.1)).toBeGreaterThanOrEqual(r);
    expect(hoeffdingBentkusUcb(losses, 0.1)).toBeLessThanOrEqual(1);
  });

  it("UCBs shrink with more data", () => {
    const losses = Array.from({ length: 50 }, (_, i) => (i % 4 === 0 ? 1 : 0));
    const small = losses.slice(0, 10);
    expect(hoeffdingBentkusUcb(losses, 0.1)).toBeLessThanOrEqual(
      hoeffdingBentkusUcb(small, 0.1),
    );
  });

  it("UCBs are vacuous (1) on empty input", () => {
    expect(hoeffdingBentkusUcb([], 0.1)).toBe(1);
    expect(empiricalBernsteinUcb([], 0.1)).toBe(1);
  });

  it("selectLambdaHat picks the smallest risk-controlling lambda", () => {
    // |edge| thresholds; low-edge games lose more often.
    const absEdges = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2];
    const lost = [true, true, true, false, false, false, false, false, false, false, false, false];
    const { lambdaHat, table } = selectLambdaHat(
      [0.01, 0.05, 0.1],
      absEdges,
      lost,
      0.45,
      0.1,
    );
    expect(table.length).toBe(3);
    expect(lambdaHat).toBe(0.05);
    // Monotone volume: higher lambda selects fewer games.
    expect(table[0]!.volume).toBeGreaterThanOrEqual(table[2]!.volume);
  });

  it("selectLambdaHat returns null when nothing controls risk", () => {
    const absEdges = [0.1, 0.2];
    const lost = [true, true];
    const { lambdaHat } = selectLambdaHat([0.05], absEdges, lost, 0.01, 0.1);
    expect(lambdaHat).toBeNull();
  });

  it("realizedRiskAudit counts windows within alpha", () => {
    expect(realizedRiskAudit([0.3, 0.5, 0.4], 0.45)).toBeCloseTo(2 / 3, 10);
    expect(realizedRiskAudit([], 0.45)).toBe(0);
  });

  it("maxDrawdown measures peak-to-trough decline", () => {
    expect(maxDrawdown([1, 1, -3, 1])).toBeCloseTo(3, 10);
    expect(maxDrawdown([1, 1, 1])).toBe(0);
    expect(maxDrawdown([])).toBe(0);
  });
});
