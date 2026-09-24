/**
 * Selection metric bake-off — tests (arXiv 2303.06021v4).
 *
 * ACCEPTANCE GATE: classwise-ECE is ~0 on calibrated forecasts and
 * large on miscalibrated ones; the guard rejects degenerate score
 * distributions; the bake-off picks different winners per branch on a
 * constructed pair; fractional Kelly is capped at 1/8; empty inputs
 * throw.
 */
import { describe, expect, it } from "vitest";
import {
  accuracy,
  bakeOff,
  classwiseEce,
  fractionalKellyStake,
  selectionVerdict,
  type Forecast,
} from "./selection-metric";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("classwiseEce", () => {
  it("is ~0 on calibrated forecasts, large on miscalibrated", () => {
    const rand = mulberry32(331);
    const cal: Forecast[] = [];
    const mis: Forecast[] = [];
    for (let i = 0; i < 2000; i++) {
      const p = 0.05 + rand() * 0.9;
      const y = rand() < p ? 1 : 0;
      cal.push({ prob: p, outcome: y });
      // Overconfident: pushes probabilities toward extremes.
      const q = p > 0.5 ? Math.min(0.99, p + 0.15) : Math.max(0.01, p - 0.15);
      mis.push({ prob: q, outcome: y });
    }
    const eCal = classwiseEce(cal);
    const eMis = classwiseEce(mis);
    expect(eCal.ece).toBeLessThan(0.05);
    expect(eCal.guardPass).toBe(true);
    expect(eMis.ece).toBeGreaterThan(eCal.ece + 0.03);
    expect(() => classwiseEce([])).toThrow();
  });

  it("rejects degenerate score distributions via the guard", () => {
    const flat: Forecast[] = Array.from({ length: 100 }, (_, i) => ({
      prob: 0.5,
      outcome: i % 2,
    }));
    const { guardPass, nonemptyFraction } = classwiseEce(flat);
    expect(guardPass).toBe(false);
    expect(nonemptyFraction).toBeLessThan(0.8);
  });
});

describe("bakeOff", () => {
  it("runs the two-branch selection", () => {
    const rand = mulberry32(333);
    // Latent signals: acc-tuned sees s1+s2 (more information, but
    // overconfident); ece-tuned sees s1 only (calibrated).
    const mkA: Forecast[] = [];
    const mkB: Forecast[] = [];
    for (let i = 0; i < 1500; i++) {
      const s1 = (rand() - 0.5) * 3.2; // U[-1.6, 1.6]
      const s2 = (rand() - 0.5) * 2; // U[-1, 1]
      const q = 0.5 + 0.25 * s1 + 0.1 * s2; // in [0, 1]
      const y = rand() < q ? 1 : 0;
      const pA = Math.min(
        0.99,
        Math.max(0.01, 0.5 + 0.45 * (s1 + s2)),
      );
      const pB = Math.min(
        0.99,
        Math.max(0.01, 0.5 + 0.25 * s1 + (rand() - 0.5) * 0.02),
      );
      mkA.push({ prob: pA, outcome: y });
      mkB.push({ prob: pB, outcome: y });
    }
    const res = bakeOff([
      { name: "acc-tuned", forecasts: mkA },
      { name: "ece-tuned", forecasts: mkB },
    ]);
    expect(res.accuracyWinner).toBe("acc-tuned");
    expect(res.eceWinner).toBe("ece-tuned");
    expect(res.eceImprovementPp).toBeGreaterThan(5);
    expect(res.accuracyOfAccuracyWinner).toBeGreaterThan(res.accuracyOfEceWinner);
    expect(() => bakeOff([])).toThrow();
  });
});

describe("fractionalKellyStake", () => {
  it("caps the fraction at 1/8 and stakes nothing without edge", () => {
    const stake = fractionalKellyStake(0.6, 2.0, 1 / 8);
    // Kelly = (1*0.6 - 0.4)/1 = 0.2; eighth = 0.025.
    expect(stake).toBeCloseTo(0.025, 12);
    expect(fractionalKellyStake(0.4, 2.0, 1 / 8)).toBe(0);
    expect(() => fractionalKellyStake(0.6, 2.0, 0.5)).toThrow();
    expect(() => fractionalKellyStake(0.6, 2.0, 0)).toThrow();
  });
});

describe("selectionVerdict", () => {
  it("applies the pre-registered gate", () => {
    expect(selectionVerdict(4, 8, 5, 6, 4)).toBe("adopt-ece");
    expect(selectionVerdict(4, 1, 8, 6, 4)).toBe("reject"); // acc wins fixed by 7pp
    expect(selectionVerdict(1, 8, 5, 6, 4)).toBe("inconclusive");
  });
});
