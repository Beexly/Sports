/**
 * Re-injury cascade — tests (arXiv 2210.11802).
 *
 * ACCEPTANCE GATE: the IRLS fit recovers a known odds ratio on
 * synthetic cohort data with p < 0.05; the verdict adopts at OR >= 2
 * and rejects below 1.3; the availability multiplier lifts risk
 * coherently; empty inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  availabilityMultiplier,
  cascadeVerdict,
  fitCascade,
  type PlayerWeek,
} from "./reinjury-cascade";

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

describe("fitCascade", () => {
  it("recovers a known odds ratio", () => {
    const rand = mulberry32(271);
    const rows: PlayerWeek[] = [];
    // True model: logit = -2 + 1.1*exposed + 0.05*(age-25).
    for (let i = 0; i < 1200; i++) {
      const exposed = rand() < 0.25 ? 1 : 0;
      const age = 22 + rand() * 12;
      const eta = -2 + 1.1 * exposed + 0.05 * (age - 25);
      const p = 1 / (1 + Math.exp(-eta));
      rows.push({ exposed, outcome: rand() < p ? 1 : 0, covariates: [age - 25] });
    }
    const { oddsRatio, ciLo, ciHi, pValue } = fitCascade(rows);
    expect(oddsRatio).toBeGreaterThan(2);
    expect(oddsRatio).toBeLessThan(5); // true OR = e^1.1 ~= 3.0
    expect(ciLo).toBeGreaterThan(1);
    expect(ciHi).toBeGreaterThan(ciLo);
    expect(pValue).toBeLessThan(0.05);
    expect(cascadeVerdict(oddsRatio, pValue)).toBe("adopt");
    expect(() => fitCascade([])).toThrow();
  });

  it("rejects when the cascade is absent", () => {
    const rand = mulberry32(273);
    const rows: PlayerWeek[] = [];
    for (let i = 0; i < 1200; i++) {
      const exposed = rand() < 0.25 ? 1 : 0;
      const eta = -2 + 0.05 * exposed; // true OR ~= 1.05
      const p = 1 / (1 + Math.exp(-eta));
      rows.push({ exposed, outcome: rand() < p ? 1 : 0, covariates: [] });
    }
    const { oddsRatio } = fitCascade(rows);
    expect(oddsRatio).toBeLessThan(1.3);
    expect(cascadeVerdict(oddsRatio, 0.4)).toBe("reject");
  });
});

describe("cascadeVerdict + availabilityMultiplier", () => {
  it("is inconclusive in the gray zone", () => {
    expect(cascadeVerdict(1.6, 0.02)).toBe("inconclusive");
    expect(cascadeVerdict(2.5, 0.2)).toBe("inconclusive");
  });

  it("lifts availability risk coherently", () => {
    const m = availabilityMultiplier(3, 0.1);
    expect(m).toBeGreaterThan(1);
    // OR=3 on a 10% base rate -> ~25% risk -> 2.5x multiplier.
    expect(m).toBeCloseTo(2.5, 1);
    expect(availabilityMultiplier(1, 0.1)).toBeCloseTo(1, 12);
    expect(() => availabilityMultiplier(2, 0)).toThrow();
  });
});
