import { describe, it, expect } from "vitest";
import {
  lockForecast,
  brierScore,
  logLoss,
  meanScore,
  openClosedBookEffect,
  fitPoolWeight,
  poolAdoptionGate,
} from "@/lib/calibration/llm-benchmark-harness";

// ============================================================
// arXiv 2607.24573 — LLM benchmark harness. Additive only.
// ============================================================

describe("LLM benchmark harness — 2607.24573", () => {
  it("lockForecast clamps and records", () => {
    const f = lockForecast("g1", 1.5, 24, "closed", "2026-09-01T00:00:00Z");
    expect(f.prob).toBe(1);
    expect(f.lockHorizonHours).toBe(24);
    expect(f.lockedAt).toBe("2026-09-01T00:00:00Z");
  });

  it("brierScore and logLoss match textbook values", () => {
    expect(brierScore(1, 1)).toBe(0);
    expect(brierScore(0.5, 1)).toBeCloseTo(0.25, 10);
    expect(logLoss(1, 1)).toBeCloseTo(0, 6);
    expect(logLoss(0.5, 1)).toBeCloseTo(Math.log(2), 6);
  });

  it("meanScore skips games without outcomes", () => {
    const fs = [lockForecast("g1", 0.7, 24, "open"), lockForecast("g2", 0.7, 24, "open")];
    expect(meanScore(fs, { g1: 1 })).toBeCloseTo(0.09, 10);
    expect(meanScore([], {})).toBeNaN();
  });

  it("openClosedBookEffect is positive when closed book wins", () => {
    const fs = [
      lockForecast("g1", 0.5, 24, "open"),
      lockForecast("g1", 0.9, 24, "closed"),
      lockForecast("g2", 0.5, 24, "open"),
      lockForecast("g2", 0.9, 24, "closed"),
    ];
    const effect = openClosedBookEffect(fs, { g1: 1, g2: 1 });
    expect(effect).toBeCloseTo(0.25 - 0.01, 10);
  });

  it("fitPoolWeight finds the better source", () => {
    // Engine is perfect, LLM is noise: weight should go to 0.
    const llm = [0.5, 0.5, 0.5, 0.5];
    const engine = [1, 0, 1, 0];
    const outcomes = [1, 0, 1, 0] as Array<0 | 1>;
    const { weight } = fitPoolWeight(llm, engine, outcomes);
    expect(weight).toBe(0);
  });

  it("poolAdoptionGate requires the improvement threshold", () => {
    const outcomes = [1, 0, 1, 0, 1, 0, 1, 0] as Array<0 | 1>;
    const engine = [0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4];
    const llm = [1, 0, 1, 0, 1, 0, 1, 0];
    // Pool at w=1 is perfect: improvement = 0.16 - 0 = 0.16 >= 0.005.
    expect(poolAdoptionGate(llm, engine, outcomes, 1)).toBe(true);
    // Same source twice: no improvement.
    expect(poolAdoptionGate(engine, engine, outcomes, 0.5)).toBe(false);
    expect(poolAdoptionGate([], [], [], 0.5)).toBe(false);
  });
});
