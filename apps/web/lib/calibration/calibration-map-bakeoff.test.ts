import { describe, expect, it } from "vitest";
import { runCalibrationMapBakeoff } from "@/lib/calibration/calibration-map-bakeoff";
import type { CalibrationSample } from "@sports/prediction-engine";

function overconfident(n: number, seed = 1): CalibrationSample[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const trueP = i % 2 === 0 ? 0.7 : 0.3;
    const y = (rand() < trueP ? 1 : 0) as 0 | 1;
    // Push scores toward extremes (overconfident)
    const p = trueP > 0.5 ? 0.9 : 0.1;
    out.push({ p, y });
  }
  return out;
}

describe("runCalibrationMapBakeoff", () => {
  it("includes beta_calibration, temperature_nll, isotonic debug on overconfident sample", () => {
    const samples = overconfident(300, 42);
    const result = runCalibrationMapBakeoff(samples, 0.7);
    expect(result.nTest).toBeGreaterThan(50);
    expect(result.applyOff).toBe(true);
    const methods = result.methods.map((m) => m.method);
    expect(methods).toContain("raw");
    expect(methods).toContain("temperature_nll");
    expect(methods).toContain("platt_map_irls");
    expect(methods).toContain("beta_calibration");
    expect(methods).toContain("isotonic_pava");
    expect(methods).toContain("isotonic_cir");
    const beta = result.methods.find((m) => m.method === "beta_calibration");
    expect(beta).toBeDefined();
    const raw = result.methods.find((m) => m.method === "raw")!;
    const anyBetter = result.methods.some(
      (m) =>
        m.method !== "raw" &&
        Number.isFinite(m.brier) &&
        (m.brier < raw.brier || m.logLoss < raw.logLoss),
    );
    expect(anyBetter).toBe(true);
    expect(result.rankingFirst.toLowerCase()).toMatch(/res|modelprob|selective|independent/);
    expect(result.note.toLowerCase()).toContain("offline");
    expect(result.isotonicDebug).toBeDefined();
    expect(result.isotonicDebug!.n).toBe(300);
    expect(result.isotonicDebug!.applyOff).toBe(true);
    expect(result.logLossDiagnose).toBeDefined();
    expect(result.logLossDiagnose!.meanLogLoss).toBeGreaterThan(0);
    expect(typeof result.temperatureT === "number" || result.temperatureT === null).toBe(true);
  });
});
