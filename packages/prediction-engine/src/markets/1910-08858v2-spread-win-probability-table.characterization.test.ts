/**
 * Characterization tests — PE-125 (gate-sweep batch 1, 2026-10-15).
 * Extends the co-located synthetic test with exact-value pins and the
 * module's error/edge contracts. DEFECT PINNED, NOT FIXED: despite the
 * filename, this module implements NO spread->win-probability table —
 * it is a generic scoring-utility set (brier/logLoss/RPS/ECE/pairedT/
 * spearman/fbeta/classWeightedBCE), and its own header records the
 * P(Win|PS) acceptance gate as NOT EVALUATED.
 * Registry: intelligence/gate-wiring/shadow-registry.json (weight 0).
 */
import { describe, expect, it } from "vitest";
import {
  ENABLED,
  brierScore,
  classWeightedBCE,
  eceProbs,
  logLoss,
  normalCdfLocal,
  spearman,
} from "./1910-08858v2-spread-win-probability-table.js";

describe("PE-125 — flag and error contracts", () => {
  it("pins ENABLED === false (module ships disabled)", () => {
    expect(ENABLED).toBe(false);
  });

  it("brierScore throws on empty or length-mismatched input", () => {
    expect(() => brierScore([], [])).toThrow(/length mismatch/);
    expect(() => brierScore([0.5], [1, 0])).toThrow(/length mismatch/);
  });

  it("logLoss throws on length mismatch", () => {
    expect(() => logLoss([0.5], [1, 0])).toThrow(/length mismatch/);
  });
});

describe("PE-125 — exact-value pins", () => {
  it("brierScore is 0 for a perfect forecast and 0.25 for a coin flip on one event", () => {
    expect(brierScore([1, 0], [1, 0])).toBe(0);
    expect(brierScore([0.5], [1])).toBeCloseTo(0.25, 12);
  });

  it("logLoss clips extreme probabilities instead of returning Infinity", () => {
    expect(logLoss([0], [0])).toBeLessThan(1e-9);
    expect(logLoss([1], [1])).toBeLessThan(1e-9);
    expect(Number.isFinite(logLoss([0], [1]))).toBe(true);
  });

  it("eceProbs is 0 for a calibrated pair and routes p === 1 into the last bin", () => {
    expect(eceProbs([0.5, 0.5], [1, 0])).toBeCloseTo(0, 12);
    expect(eceProbs([1], [1])).toBeCloseTo(0, 12);
    expect(eceProbs([1], [0])).toBeCloseTo(1, 12);
  });

  it("normalCdfLocal(0) is 0.5 under the Abramowitz-Stegun approximation", () => {
    expect(normalCdfLocal(0)).toBeCloseTo(0.5, 4);
  });

  it("spearman is -1 for a perfectly reversed ranking", () => {
    expect(spearman([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12);
  });

  it("DEFECT PIN (not fixed): spearman breaks ties by position instead of averaging ranks, so a constant series scores as perfectly monotone", () => {
    // The rank helper assigns ranks 1..n in sorted order with no tie
    // averaging, so [2,2,2] receives ranks [1,2,3] and correlates
    // perfectly with any increasing series. Standard Spearman would
    // return 0/undefined for a constant input. The dx<=0 guard never
    // fires because positional ranks always have variance.
    expect(spearman([2, 2, 2], [1, 2, 3])).toBe(1);
    expect(spearman([2, 2, 2], [3, 2, 1])).toBe(-1);
  });

  it("classWeightedBCE scales the positive class by posWeight", () => {
    expect(classWeightedBCE(0.5, 1, 2)).toBeCloseTo(2 * Math.LN2, 12);
    expect(classWeightedBCE(0.5, 0, 1)).toBeCloseTo(Math.LN2, 12);
  });
});
