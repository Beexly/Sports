import { describe, expect, it } from "vitest";
import { detectEnvRegime } from "./mlb-environment-regime";
import type { EnvRegimePoint } from "./mlb-environment-regime";

function series(rates: number[], startWeek = 1): EnvRegimePoint[] {
  return rates.map((rate, k) => ({ period: `2026-W${startWeek + k}`, rate }));
}

describe("mlb-environment-regime", () => {
  it("detects a sustained mid-season step up in HR/G (the juiced-ball shape)", () => {
    // 12 weeks at ~1.05 HR/G, then 10 weeks at ~1.30 HR/G with noise.
    const rates = [
      1.04, 1.07, 1.02, 1.08, 1.05, 1.03, 1.09, 1.06, 1.04, 1.07, 1.05, 1.06,
      1.31, 1.28, 1.33, 1.29, 1.32, 1.27, 1.3, 1.34, 1.28, 1.31,
    ];
    const out = detectEnvRegime(series(rates));
    expect(out.shifts.length).toBe(1);
    expect(out.shifts[0]!.direction).toBe("up");
    expect(out.shifts[0]!.period).toBe("2026-W13");
    expect(out.shifts[0]!.magnitude).toBeGreaterThan(0.15);
    expect(out.currentEraStart).toBe("2026-W13");
  });

  it("does not fire on noisy flat data (no regime, no false era)", () => {
    const rates = [1.05, 1.08, 1.02, 1.09, 1.04, 1.07, 1.03, 1.08, 1.05, 1.06, 1.04, 1.07, 1.05, 1.08, 1.06, 1.04, 1.07, 1.05];
    const out = detectEnvRegime(series(rates));
    expect(out.shifts.length).toBe(0);
    expect(out.currentEraStart).toBe("2026-W1");
  });

  it("ignores a single-week spike (not a sustained step)", () => {
    const rates = [1.05, 1.06, 1.04, 1.07, 1.05, 1.06, 1.04, 1.07, 1.05, 1.06, 1.45, 1.05, 1.06, 1.04, 1.07, 1.05, 1.06, 1.05];
    const out = detectEnvRegime(series(rates));
    expect(out.shifts.length).toBe(0);
  });

  it("detects a step down and ignores dust-level changes", () => {
    const rates = [
      1.3, 1.32, 1.28, 1.31, 1.29, 1.33, 1.3, 1.28, 1.31, 1.29, 1.32, 1.3,
      1.02, 1.04, 1.0, 1.03, 1.05, 1.01, 1.04, 1.02, 1.03, 1.05,
    ];
    const out = detectEnvRegime(series(rates));
    expect(out.shifts.length).toBe(1);
    expect(out.shifts[0]!.direction).toBe("down");
    expect(out.shifts[0]!.magnitude).toBeLessThan(-0.15);
  });

  it("handles too-short series gracefully", () => {
    const out = detectEnvRegime(series([1.05, 1.06, 1.04]));
    expect(out.shifts.length).toBe(0);
    expect(out.currentMean).toBeCloseTo(1.05, 2);
  });
});
