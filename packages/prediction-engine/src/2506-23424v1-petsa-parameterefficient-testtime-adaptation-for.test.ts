/**
 * Vitest suite for arXiv:2506.23424v1 (PETSA: Parameter-Efficient Test-Time Adaptation for Time Series Forecasting).
 * Gate: ADOPT if on 2020-2025 walk-forward the overlay beats the frozen model on anytime Brier by >=0.002 with ECE neutral-or-better AND captures >=80% of the full-refit gain.
 */
import { describe, it, expect } from "vitest";
import { aossUpdate, aossRun } from "./2506-23424v1-petsa-parameterefficient-testtime-adaptation-for";

describe("2506-23424v1 AOSS dual-rate online learning", () => {
  it("uses the fast rate on loss decreases, slow on increases", () => {
    const { values, fastSteps } = aossRun(0, [
      { grad: 1, loss: 1.0 },
      { grad: 1, loss: 0.5 }, // decrease -> alpha
      { grad: 1, loss: 0.8 }, // increase -> beta
    ], 0.5, 0.1);
    expect(values[2]).toBeCloseTo(-0.6, 10);
    expect(values[3]).toBeCloseTo(-0.7, 10);
    expect(fastSteps).toBe(1);
    expect(() => aossUpdate(0, 1, 1, 0.5, 0, 0.1)).toThrow();
  });
});
