/**
 * Triple CSF comparison — tests (arXiv 2201.01168).
 *
 * ACCEPTANCE GATE: all three forms are valid probabilities, symmetric at
 * zero differential; OLS-alpha recovers a known Tullock exponent;
 * LOOCV comparison runs and names a winner with a sane paired test;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  compareCsf,
  csf,
  fitAlphaOls,
  loocvRmse,
  type TeamSeason,
} from "./csf-triple-compare";

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

function synthTullock(n: number, alpha: number, seed: number): TeamSeason[] {
  const rand = mulberry32(seed);
  const out: TeamSeason[] = [];
  for (let i = 0; i < n; i++) {
    const pf = 300 + rand() * 300;
    const pa = 300 + rand() * 300;
    const a = Math.pow(pf, alpha);
    const p = a / (a + Math.pow(pa, alpha));
    let wins = 0;
    for (let g = 0; g < 17; g++) if (rand() < p) wins++;
    out.push({ pf, pa, wins, games: 17 });
  }
  return out;
}

describe("csf", () => {
  it("returns valid probabilities, symmetric at zero", () => {
    const alphas = { tullock: 2, difference: 0.02, serial: 0.02 } as const;
    for (const form of ["tullock", "difference", "serial"] as const) {
      const a = alphas[form];
      expect(csf(400, 400, a, form)).toBeCloseTo(0.5, 12);
      const hi = csf(500, 400, a, form);
      expect(hi).toBeGreaterThan(0.5);
      expect(hi).toBeLessThan(1);
      expect(csf(400, 500, a, form)).toBeCloseTo(1 - hi, 10);
    }
    expect(() => csf(0, 400, 2, "tullock")).toThrow();
  });
});

describe("fitAlphaOls + loocvRmse", () => {
  it("recovers the Tullock exponent and runs LOOCV", () => {
    const seasons = synthTullock(120, 2.37, 141);
    const a = fitAlphaOls(seasons, "tullock");
    expect(a).toBeGreaterThan(1.8);
    expect(a).toBeLessThan(3.0);
    const rmse = loocvRmse(seasons, "tullock");
    expect(rmse).toBeGreaterThan(0);
    expect(rmse).toBeLessThan(0.25);
    expect(() => fitAlphaOls([], "tullock")).toThrow();
    expect(() => loocvRmse(seasons.slice(0, 2), "tullock")).toThrow();
  });
});

describe("compareCsf", () => {
  it("names the best LOOCV form with a paired serial-vs-Tullock test", () => {
    const seasons = synthTullock(60, 2.37, 143);
    const c = compareCsf(seasons);
    // Data are Tullock-generated: Tullock should win or tie closely.
    expect(c.rmse.tullock).toBeLessThanOrEqual(c.rmse.serial + 0.02);
    expect(["tullock", "difference", "serial"]).toContain(c.winner);
    expect(c.serialVsTullock.pValue).toBeGreaterThanOrEqual(0);
    expect(c.serialVsTullock.pValue).toBeLessThanOrEqual(1);
    for (const f of ["tullock", "difference", "serial"] as const) {
      expect(c.alpha[f]).toBeGreaterThan(0);
    }
  });
});
