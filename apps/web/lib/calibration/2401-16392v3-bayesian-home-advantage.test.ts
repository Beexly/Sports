import { describe, expect, it } from "vitest";

import {
  ENABLED,
  fitHomeAdvantage,
  needsRebaseline,
  withinPaperCI,
} from "@/lib/calibration/2401-16392v3-bayesian-home-advantage";

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Bayesian home advantage", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("recovers a known home advantage from synthetic game logs", () => {
    const rand = mulberry(21);
    const games = [];
    for (let s = 2015; s <= 2024; s++) {
      for (let g = 0; g < 250; g++) {
        const u1 = Math.max(rand(), 1e-9);
        const u2 = rand();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        games.push({ season: s, diff: 1.73 + 13.5 * z }); // paper's 2023 estimate
      }
    }
    const fit = fitHomeAdvantage(games);
    expect(fit.haMean).toBeGreaterThan(1.0);
    expect(fit.haMean).toBeLessThan(2.5);
    expect(withinPaperCI(fit.haMean)).toBe(true); // gate: 2023 HA in (1.07, 2.39)
    expect(fit.ci95[0]).toBeLessThan(fit.haMean);
    expect(fit.ci95[1]).toBeGreaterThan(fit.haMean);
  });

  it("detects a declining trend", () => {
    const rand = mulberry(22);
    const games = [];
    for (let s = 2015; s <= 2024; s++) {
      const trueHa = 3.0 - 0.15 * (s - 2015); // steady decline
      for (let g = 0; g < 250; g++) {
        const u1 = Math.max(rand(), 1e-9);
        const u2 = rand();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        games.push({ season: s, diff: trueHa + 13.5 * z });
      }
    }
    const fit = fitHomeAdvantage(games, { refSeason: 2015 });
    expect(fit.drift).toBeLessThan(0);
    expect(fit.pDecline).toBeGreaterThan(0.9);
    expect(needsRebaseline(fit)).toBe(true);
  });

  it("flat trend does not trigger re-baselining", () => {
    // Zero empirical drift by construction: identical within-season pattern
    // every season (alternating 2.5/1.5 around a 2.0 mean) -> driftHat = 0,
    // pDecline = 0.5, deterministically below the 0.9 re-baseline bar.
    const games = [];
    for (let s = 2015; s <= 2024; s++) {
      for (let g = 0; g < 250; g++) {
        games.push({ season: s, diff: g % 2 === 0 ? 2.5 : 1.5 });
      }
    }
    const fit = fitHomeAdvantage(games, { refSeason: 2015 });
    expect(fit.drift).toBeCloseTo(0, 8);
    expect(fit.pDecline).toBeLessThan(0.9);
    expect(needsRebaseline(fit)).toBe(false);
  });
});
