import { describe, expect, it } from "vitest";
import { computeSkillMetrics } from "@/lib/calibration/skill-metrics";

/**
 * Synthetic-forecaster contract for skill metrics (ASTRA A-12 / DeepSeek Phase 0).
 *
 * These tests pin the MATH, not a floor change. Nothing here flips a gate.
 *
 * Hand-worked examples live in the comments so a silent arithmetic drift fails
 * the suite instead of quietly changing what "skill" means on the ops surface.
 */

function constantForecast(n: number, p: number): { p: number; y: 0 | 1 }[] {
  // Deterministic y so the base rate is exactly p when p*n is an integer.
  const wins = Math.round(p * n);
  return Array.from({ length: n }, (_, i) => ({ p, y: (i < wins ? 1 : 0) as 0 | 1 }));
}

function perfectlyCalibrated(n: number): { p: number; y: 0 | 1 }[] {
  // Two-level perfect calibration: half the sample at 0.3 (30% wins), half at
  // 0.7 (70% wins). Constructed so observed == forecast in each bin exactly.
  const rows: { p: number; y: 0 | 1 }[] = [];
  const half = n / 2;
  const lowWins = Math.round(0.3 * half);
  const highWins = Math.round(0.7 * half);
  for (let i = 0; i < half; i++) rows.push({ p: 0.3, y: (i < lowWins ? 1 : 0) as 0 | 1 });
  for (let i = 0; i < half; i++) rows.push({ p: 0.7, y: (i < highWins ? 1 : 0) as 0 | 1 });
  return rows;
}

function overconfident(n: number): { p: number; y: 0 | 1 }[] {
  // Claims 0.9, wins half the time. Real calibration error.
  const wins = Math.round(0.5 * n);
  return Array.from({ length: n }, (_, i) => ({ p: 0.9, y: (i < wins ? 1 : 0) as 0 | 1 }));
}

describe("computeSkillMetrics — empty sample", () => {
  it("stays dark, never invents a number", () => {
    const m = computeSkillMetrics([]);
    expect(m.sampleSize).toBe(0);
    expect(m.bss).toBeNull();
    expect(m.note).toMatch(/No settled sample/);
  });
});

describe("computeSkillMetrics — constant base-rate forecaster", () => {
  it("has BSS = 0, RES = 0, and ECE inside the null band (calibrated but useless)", () => {
    // n=200, base rate 0.7. Brier of a constant 0.7 forecast on outcomes with
    // rate 0.7 is p(1-p) = 0.21 exactly when wins = 140.
    //   BSS = 1 - 0.21/0.21 = 0
    //   RES = 0 (every bin is the same rate as the base rate)
    const rows = constantForecast(200, 0.7);
    const m = computeSkillMetrics(rows, { nullReps: 80 });

    expect(m.sampleSize).toBe(200);
    expect(m.brier).toBeCloseTo(0.21, 4);
    expect(m.bss).toBeCloseTo(0, 4);
    expect(m.murphy.resolution).toBe(0);
    expect(m.murphy.baseRate).toBeCloseTo(0.7, 4);
    // A constant forecast is perfectly calibrated by construction.
    expect(m.nullBand.withinNullBand).toBe(true);
    expect(m.note).toMatch(/no ranking power|constant-in-disguise|RES 0/);
  });
});

describe("computeSkillMetrics — perfectly calibrated two-level forecaster", () => {
  it("has BSS ≈ 0 (no skill beyond base rate) but positive RES", () => {
    // Base rate = 0.5 (half at 0.3 with 30% wins, half at 0.7 with 70% wins).
    // Brier of a perfectly calibrated two-level forecaster at base 0.5:
    //   REL = 0, RES = (0.2)^2 = 0.04, UNC = 0.25
    //   Brier ≈ REL - RES + UNC = 0.21
    //   BSS = 1 - 0.21/0.25 = 0.16  (positive: it ranks)
    const rows = perfectlyCalibrated(200);
    const m = computeSkillMetrics(rows, { nullReps: 80 });

    expect(m.murphy.baseRate).toBeCloseTo(0.5, 3);
    expect(m.murphy.reliability).toBeCloseTo(0, 3);
    expect(m.murphy.resolution).toBeCloseTo(0.04, 3);
    expect(m.brier).toBeCloseTo(0.21, 3);
    expect(m.bss).toBeCloseTo(0.16, 3);
    expect(m.nullBand.withinNullBand).toBe(true);
  });
});

describe("computeSkillMetrics — overconfident forecaster", () => {
  it("has BSS < 0 and ECE outside the null band", () => {
    // Claims 0.9, wins 0.5. Brier = (0.9-1)^2*0.5 + (0.9-0)^2*0.5 = 0.41
    // UNC = 0.5*0.5 = 0.25
    // BSS = 1 - 0.41/0.25 = -0.64  (worse than no-skill)
    const rows = overconfident(200);
    const m = computeSkillMetrics(rows, { nullReps: 80 });

    expect(m.brier).toBeCloseTo(0.41, 3);
    expect(m.bss).toBeCloseTo(-0.64, 3);
    expect(m.bss!).toBeLessThan(0);
    // 0.4 claimed vs 0.5 observed is a 0.4 gap — far outside any null band.
    expect(m.nullBand.withinNullBand).toBe(false);
    expect(m.note).toMatch(/worse Brier|OUTSIDE/);
  });
});

describe("computeSkillMetrics — NLL", () => {
  it("is finite, positive, and the reference NLL is the base-rate entropy", () => {
    const rows = constantForecast(200, 0.7);
    const m = computeSkillMetrics(rows, { nullReps: 40 });
    // NLL of a constant 0.7 forecast on a 0.7 base rate is the binary entropy:
    //   H = -0.7*ln(0.7) - 0.3*ln(0.3) ≈ 0.6109
    expect(m.nll).toBeCloseTo(0.6109, 3);
    expect(m.nllReference).toBeCloseTo(0.6109, 3);
    expect(m.nll).toBeGreaterThan(0);
  });
});

describe("computeSkillMetrics — determinism", () => {
  it("same seed + same sample → identical output", () => {
    const rows = perfectlyCalibrated(120);
    const a = computeSkillMetrics(rows, { seed: 42, nullReps: 50 });
    const b = computeSkillMetrics(rows, { seed: 42, nullReps: 50 });
    expect(a).toEqual(b);
  });
});
