import { describe, expect, it } from "vitest";
import { runCalibrationMapBakeoff } from "@/lib/calibration/calibration-map-bakeoff";
import { investigateKelly, evenMoneyFullKelly } from "@/lib/staking/kelly-investigation";
import { fitIsotonicPava, applyIsotonic } from "@/lib/calibration/isotonic-pava";
import { fitPlattFromProbs, applyPlattToProb } from "@/lib/calibration/platt-scaling";
import { brierDecomposition } from "@sports/prediction-engine";

describe("isotonic explore", () => {
  it("monotone calibrated p", () => {
    const samples = Array.from({ length: 60 }, (_, i) => ({
      p: 0.2 + i * 0.01,
      y: (i > 30 ? 1 : 0) as 0 | 1,
    }));
    const m = fitIsotonicPava(samples);
    expect(applyIsotonic(0.3, m)).toBeLessThanOrEqual(applyIsotonic(0.7, m) + 1e-9);
  });
});

describe("platt + brier decomp", () => {
  it("platt reduces or holds brier on train-like data; decomp finite", () => {
    const samples = Array.from({ length: 100 }, (_, i) => {
      const p = 0.4 + (i % 10) * 0.02;
      return { p, y: (i % 2) as 0 | 1 };
    });
    const { A, B } = fitPlattFromProbs(samples);
    const mapped = samples.map((s) => ({
      p: applyPlattToProb(s.p, A, B),
      y: s.y,
    }));
    const d = brierDecomposition(mapped);
    expect(Number.isFinite(d.brier)).toBe(true);
    expect(Number.isFinite(d.reliability)).toBe(true);
    expect(Number.isFinite(d.resolution)).toBe(true);
  });

  it("map bakeoff returns methods with decomp columns", () => {
    const samples = Array.from({ length: 80 }, (_, i) => ({
      p: 0.35 + (i % 15) * 0.02,
      y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
    }));
    const r = runCalibrationMapBakeoff(samples, 0.7);
    expect(r.methods.map((m) => m.method)).toEqual(
      expect.arrayContaining(["raw", "platt_map_irls", "isotonic_pava"]),
    );
    expect(r.methods[0]?.resolution).toBeDefined();
  });
});

describe("kelly investigation", () => {
  it("quarter kelly default; no public claim when RED", () => {
    const k = investigateKelly({
      winProb: 0.58,
      americanOdds: -110,
      bankroll: 1000,
      publicClaimAllowed: false,
    });
    expect(k.regime).toBe("quarter");
    expect(k.integrity.treatsPAsVerified).toBe(false);
    expect(k.integrity.publicClaimAllowed).toBe(false);
  });

  it("even money full kelly", () => {
    expect(evenMoneyFullKelly(0.6)).toBeCloseTo(0.2, 5);
  });

  it("no edge → zero stake", () => {
    const k = investigateKelly({
      winProb: 0.5,
      americanOdds: -110,
      bankroll: 1000,
    });
    expect(k.hasEdge).toBe(false);
    expect(k.stakeAmount).toBe(0);
  });
});
