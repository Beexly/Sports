import { describe, it, expect } from "vitest";
import { computeWalshCalibrationGate } from "../calibration-map.js";

describe("computeWalshCalibrationGate (Brier Score & Skill Decomposition)", () => {
  it("computes empirical base-rate Brier, model Brier, and Skill Score correctly", () => {
    // Perfectly calibrated predictions with outcomes:
    // e.g. for p in [0.999, 0.001]
    const samples: { p: number; y: 0 | 1 }[] = [
      { p: 0.999, y: 1 },
      { p: 0.999, y: 1 },
      { p: 0.999, y: 1 },
      { p: 0.001, y: 0 },
      { p: 0.001, y: 0 },
      { p: 0.001, y: 0 },
    ];

    const gate = computeWalshCalibrationGate(samples);

    expect(gate.baseRateBrier).toBe(0.25); // 0.5 * (1 - 0.5) = 0.25
    expect(gate.brier).toBeLessThan(0.001); // near zero MSE
    expect(gate.brierSkillScore).toBeGreaterThan(0.99); // massive skill over base rate
    expect(gate.classwiseEce).toBeLessThan(0.01);
    expect(gate.gatePass).toBe(true);
  });

  it("fails the gate if model has negative skill compared to climatology base-rate", () => {
    // Inverted predictions (predicting high when 0, low when 1)
    const samples: { p: number; y: 0 | 1 }[] = [
      { p: 0.9, y: 0 },
      { p: 0.9, y: 0 },
      { p: 0.1, y: 1 },
      { p: 0.1, y: 1 },
    ];

    const gate = computeWalshCalibrationGate(samples);
    expect(gate.brierSkillScore).toBeLessThan(0);
    expect(gate.gatePass).toBe(false);
  });

  it("handles empty arrays gracefully without crashing", () => {
    const gate = computeWalshCalibrationGate([]);
    expect(gate.gatePass).toBe(false);
    expect(gate.brierSkillScore).toBe(-1);
  });
});
