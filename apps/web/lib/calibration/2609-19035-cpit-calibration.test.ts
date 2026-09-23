import { describe, expect, it } from "vitest";

import {
  ENABLED,
  centralCoverage,
  cpitGate,
  cpitTransform,
  pitCvm,
  sampleCRPS,
  samplePIT,
} from "@/lib/calibration/2609-19035-cpit-calibration";

describe("CPIT calibration", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("samplePIT is ~uniform for calibrated samples", () => {
    let s = 13;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const pits: number[] = [];
    for (let i = 0; i < 400; i++) {
      const samples = Array.from({ length: 200 }, () => rnd() * 20 - 10);
      const y = rnd() * 20 - 10;
      pits.push(samplePIT(samples, y));
    }
    expect(pitCvm(pits)).toBeLessThan(0.01);
  });

  it("cpitTransform corrects a biased forecaster toward uniform PITs", () => {
    // Forecaster is biased high by +3: PITs pile near 0.
    let s = 14;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const calibPits: number[] = [];
    for (let i = 0; i < 300; i++) {
      const samples = Array.from({ length: 100 }, () => 3 + (rnd() - 0.5) * 6);
      calibPits.push(samplePIT(samples, (rnd() - 0.5) * 6));
    }
    const raw = Array.from({ length: 100 }, () => 3 + (rnd() - 0.5) * 6);
    const recal = cpitTransform(raw, calibPits);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    // Recalibrated draws shift back down toward the unbiased outcomes.
    expect(mean(recal)).toBeLessThan(mean(raw));
  });

  it("sampleCRPS is zero for a degenerate perfect forecast", () => {
    expect(sampleCRPS([7, 7, 7], 7)).toBeCloseTo(0, 10);
    expect(sampleCRPS([0, 10], 5)).toBeGreaterThan(0);
  });

  it("gate requires CvM -50%, CRPS +3%, coverage in [0.87, 0.93]", () => {
    const g = cpitGate(
      [0.01, 0.02, 0.03, 0.97, 0.98, 0.99],
      [0.2, 0.35, 0.45, 0.55, 0.65, 0.8],
      2.0,
      1.9,
      Array.from({ length: 100 }, (_, i) => i < 90),
    );
    expect(g.cvmReduction).toBeGreaterThan(0.5);
    expect(g.crpsImprovement).toBeCloseTo(0.05, 10);
    expect(g.coverage90).toBe(0.9);
    expect(g.adopt).toBe(true);
    const bad = cpitGate([0.5], [0.5], 2.0, 2.0, [true]);
    expect(bad.adopt).toBe(false);
  });

  it("centralCoverage checks the interval hit", () => {
    expect(centralCoverage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, 0.2)).toBe(true);
    expect(centralCoverage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1, 0.2)).toBe(false);
  });
});
