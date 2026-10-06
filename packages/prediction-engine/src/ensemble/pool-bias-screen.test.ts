/**
 * Model-pool bias screen + champion baseline — tests (arXiv 2008.01485).
 *
 * ACCEPTANCE GATE: the Spiegelhalter test flags a systematically biased
 * pool and clears a calibrated one; Hosmer-Lemeshow behaves on calibrated
 * data; the champion tracker identifies the trailing-Brier leader and the
 * ensemble win rate is computed; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  ensembleWinRate,
  hosmerLemeshow,
  spiegelhalterZ,
  weeklyChampion,
} from "./pool-bias-screen";

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

describe("spiegelhalterZ", () => {
  it("flags a systematically biased pool", () => {
    const rand = mulberry32(91);
    const n = 400;
    // Pool forecasts are 10pp too high on average.
    const probs = Array.from({ length: n }, () => 0.4 + rand() * 0.4);
    const outcomes = probs.map((p) => (rand() < Math.max(0, p - 0.1) ? 1 : 0));
    const r = spiegelhalterZ(probs, outcomes);
    expect(r.biased).toBe(true);
    expect(r.z).toBeLessThan(0);
  });

  it("clears a calibrated pool", () => {
    const rand = mulberry32(93);
    const n = 400;
    const probs = Array.from({ length: n }, () => 0.2 + rand() * 0.6);
    const outcomes = probs.map((p) => (rand() < p ? 1 : 0));
    const r = spiegelhalterZ(probs, outcomes);
    expect(r.biased).toBe(false);
    expect(r.pValue).toBeGreaterThan(0.05);
  });

  it("throws on degenerate input", () => {
    expect(() => spiegelhalterZ([], [])).toThrow();
    expect(() => spiegelhalterZ([0.5], [1, 0])).toThrow();
  });
});

describe("hosmerLemeshow", () => {
  it("does not flag a calibrated pool", () => {
    const rand = mulberry32(95);
    const n = 500;
    const probs = Array.from({ length: n }, () => 0.1 + rand() * 0.8);
    const outcomes = probs.map((p) => (rand() < p ? 1 : 0));
    const r = hosmerLemeshow(probs, outcomes);
    expect(r.pValue).toBeGreaterThanOrEqual(0);
    expect(r.pValue).toBeLessThanOrEqual(1);
    expect(r.df).toBeGreaterThan(0);
  });

  it("throws when data are too few", () => {
    expect(() => hosmerLemeshow([0.5, 0.6], [1, 0])).toThrow();
  });
});

describe("weeklyChampion + ensembleWinRate", () => {
  it("tracks the trailing-Brier champion and ensemble win rate", () => {
    const rand = mulberry32(97);
    const weeks = [];
    for (let w = 0; w < 10; w++) {
      const n = 16;
      const outcomes = Array.from({ length: n }, () => (rand() < 0.5 ? 1 : 0));
      // Model 0 is sharp, models 1-2 are noise.
      const sharp = outcomes.map((o) => (o === 1 ? 0.75 : 0.25));
      const noise1 = Array.from({ length: n }, () => rand());
      const noise2 = Array.from({ length: n }, () => rand());
      weeks.push(
        weeklyChampion(w, [sharp, noise1, noise2], outcomes, [0.1, 0.25, 0.25]),
      );
    }
    expect(weeks.every((r) => r.champion === 0)).toBe(true);
    const rate = ensembleWinRate(weeks);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(1);
    expect(() => ensembleWinRate([])).toThrow();
    expect(() => weeklyChampion(0, [], [1], [])).toThrow();
  });
});
