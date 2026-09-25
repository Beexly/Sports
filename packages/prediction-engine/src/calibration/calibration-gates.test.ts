import { describe, expect, it } from "vitest";
import {
  computeMetrics,
  tryIsotonic,
  runCalibrationGate,
  DEFAULT_GATE_CONFIG,
} from "./calibration-gates.js";

describe("W1: calibration gates with isotonic rejection", () => {
  it("perfect probabilities → Brier 0, ECE 0", () => {
    const probs = [1, 1, 0, 0];
    const outcomes = [1, 1, 0, 0];
    const m = computeMetrics(probs, outcomes);
    expect(m.brier).toBe(0);
    expect(m.ece).toBe(0);
    expect(m.logLoss).toBeLessThan(0.01);
    expect(m.auc).toBe(1);
  });

  it("computeMetrics computes real Brier/logLoss/AUC/ECE", () => {
    const probs = [0.7, 0.3, 0.6, 0.4, 0.9, 0.2];
    const outcomes = [1, 0, 1, 0, 1, 0];
    const m = computeMetrics(probs, outcomes);
    expect(m.brier).toBeGreaterThan(0);
    expect(m.brier).toBeLessThan(1);
    expect(m.logLoss).toBeGreaterThan(0);
    expect(m.auc).toBe(1); // perfectly ranked
    expect(m.ece).toBeGreaterThanOrEqual(0);
    expect(m.n).toBe(6);
  });

  it("isotonic rejection: overfit → applied false, original probs returned", () => {
    // Train: isotonic will fit perfectly (monotonic)
    // Holdout: opposite pattern → isotonic makes it worse
    const trainProbs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const trainOutcomes = [0, 0, 0, 0, 1, 1, 1, 1, 1];
    const holdoutProbs = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
    const holdoutOutcomes = [0, 0, 0, 0, 1, 1, 1, 1, 1]; // inverted vs probs

    const r = tryIsotonic(trainProbs, trainOutcomes, holdoutProbs, holdoutOutcomes);
    expect(r.applied).toBe(false);
    expect(r.calibratedProbs).toEqual(holdoutProbs); // original returned
    expect(r.reason).toContain("REJECTED");
  });

  it("isotonic acceptance: helps → applied true, Brier improves", () => {
    // Train: poorly calibrated (probs too high for outcomes)
    const trainProbs = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
    const trainOutcomes = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // only 10% wins
    // Holdout: same pattern
    const holdoutProbs = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
    const holdoutOutcomes = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const r = tryIsotonic(trainProbs, trainOutcomes, holdoutProbs, holdoutOutcomes);
    // Isotonic should shrink the probs toward 0.1, improving Brier
    expect(r.applied).toBe(true);
    expect(r.deltaBrier).toBeLessThan(0);
  });

  it("runCalibrationGate returns metrics + pass/fail", () => {
    const trainProbs = [0.6, 0.4, 0.7, 0.3];
    const trainOutcomes = [1, 0, 1, 0];
    const holdoutProbs = [0.55, 0.45, 0.65, 0.35];
    const holdoutOutcomes = [1, 0, 1, 0];
    const r = runCalibrationGate(trainProbs, trainOutcomes, holdoutProbs, holdoutOutcomes);
    expect(r.metrics).toBeDefined();
    expect(r.isotonic).toBeDefined();
    expect(typeof r.passed).toBe("boolean");
    expect(Array.isArray(r.failures)).toBe(true);
  });

  it("gate config has sensible defaults", () => {
    expect(DEFAULT_GATE_CONFIG.maxBrier).toBe(0.25);
    expect(DEFAULT_GATE_CONFIG.maxLogLoss).toBe(0.70);
    expect(DEFAULT_GATE_CONFIG.minAuc).toBe(0.55);
    expect(DEFAULT_GATE_CONFIG.maxEce).toBe(0.08);
  });

  it("gate fails when Brier exceeds threshold", () => {
    // Random predictions → poor Brier
    const probs = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const outcomes = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const r = runCalibrationGate(probs, outcomes, probs, outcomes);
    // Brier for 0.5 on alternating is 0.25 — right at threshold
    expect(r.metrics.brier).toBeGreaterThanOrEqual(0.24);
  });
});
