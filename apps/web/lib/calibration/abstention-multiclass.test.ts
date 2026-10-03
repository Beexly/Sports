import { describe, it, expect } from "vitest";
import {
  ABSTAIN,
  abstainDecision,
  tauFromCost,
  calibrateTauForAbstentionRate,
  abstentionRate,
  abstainAgreement,
} from "@/lib/calibration/abstention-multiclass";

// ============================================================
// arXiv 1505.04137v1 — multiclass abstention. Additive only.
// ============================================================

describe("multiclass abstention — 1505.04137v1", () => {
  it("predicts argmax when it clears tau", () => {
    const d = abstainDecision([0.1, 0.7, 0.2], 0.6);
    expect(d.abstained).toBe(false);
    expect(d.prediction).toBe(1);
    expect(d.maxProb).toBeCloseTo(0.7, 10);
  });

  it("abstains when no class clears tau", () => {
    const d = abstainDecision([0.3, 0.35, 0.35], 0.5);
    expect(d.abstained).toBe(true);
    expect(d.prediction).toBe(ABSTAIN);
  });

  it("abstains on empty input", () => {
    const d = abstainDecision([], 0.5);
    expect(d.abstained).toBe(true);
    expect(d.prediction).toBe(ABSTAIN);
  });

  it("tauFromCost maps alpha 0.25 to tau 0.75", () => {
    expect(tauFromCost(0.25)).toBeCloseTo(0.75, 10);
    expect(tauFromCost(0)).toBe(1);
    expect(tauFromCost(1)).toBe(0);
  });

  it("calibrateTauForAbstentionRate hits the target rate", () => {
    const rows = [
      [0.9, 0.1],
      [0.8, 0.2],
      [0.6, 0.4],
      [0.55, 0.45],
      [0.51, 0.49],
    ];
    const tau = calibrateTauForAbstentionRate(rows, 0.4);
    const rate = abstentionRate(rows, tau);
    expect(rate).toBeGreaterThanOrEqual(0.4);
  });

  it("abstentionRate is monotone in tau", () => {
    const rows = [[0.9, 0.1], [0.6, 0.4], [0.55, 0.45]];
    expect(abstentionRate(rows, 0.5)).toBeLessThanOrEqual(
      abstentionRate(rows, 0.95),
    );
  });

  it("abstentionRate is 0 on empty input", () => {
    expect(abstentionRate([], 0.5)).toBe(0);
  });

  it("abstainAgreement measures policy concordance", () => {
    expect(abstainAgreement([true, false, true], [true, false, false])).toBeCloseTo(
      2 / 3,
      10,
    );
    expect(abstainAgreement([], [])).toBe(0);
    expect(abstainAgreement([true], [true, false])).toBe(0);
  });
});
