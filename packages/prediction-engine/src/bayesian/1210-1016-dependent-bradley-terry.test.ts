import { describe, it, expect } from "vitest";
import {
  fitBradleyTerry,
  naiveSEs,
  sandwichSEs,
  Comparison,
} from "./1210-1016-dependent-bradley-terry.js";

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

function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Synthetic panel: true worths + per-(rater,team) random effects (dependence within rater). */
function simulatePanel(seed: number): { comps: Comparison[]; truth: number[]; nTeams: number } {
  const rand = mulberry32(seed);
  const nTeams = 8;
  const nRaters = 6;
  const truth = Array.from({ length: nTeams }, (_, i) => -1 + (2 * i) / (nTeams - 1));
  // rater r perceives team i with an idiosyncratic bias: comparisons judged by
  // the same rater share that rater's bias vector -> positive dependence
  const raterBias = Array.from({ length: nRaters }, () =>
    Array.from({ length: nTeams }, () => randn(rand) * 0.9),
  );
  const comps: Comparison[] = [];
  for (let r = 0; r < nRaters; r++) {
    for (let k = 0; k < 60; k++) {
      let a = Math.floor(rand() * nTeams);
      let b = Math.floor(rand() * nTeams);
      if (a === b) b = (b + 1) % nTeams;
      const pa =
        1 / (1 + Math.exp(-(truth[a]! + raterBias[r]![a]! - (truth[b]! + raterBias[r]![b]!))));
      const winner = rand() < pa ? a : b;
      comps.push({ winner, loser: winner === a ? b : a, rater: r });
    }
  }
  return { comps, truth, nTeams };
}

describe("fitBradleyTerry", () => {
  it("recovers the worth ordering under rater dependence", () => {
    const { comps, truth, nTeams } = simulatePanel(3);
    const w = fitBradleyTerry(comps, nTeams);
    const corr = (a: number[], b: number[]) => {
      const ma = a.reduce((s, x) => s + x, 0) / a.length;
      const mb = b.reduce((s, x) => s + x, 0) / b.length;
      const num = a.reduce((s, x, i) => s + (x - ma) * (b[i]! - mb), 0);
      const den = Math.sqrt(
        a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, x) => s + (x - mb) ** 2, 0),
      );
      return num / den;
    };
    expect(corr(w, truth)).toBeGreaterThan(0.9);
  });
});

describe("sandwichSEs vs naiveSEs", () => {
  it("sandwich SEs are wider than naive SEs when raters induce dependence", () => {
    const { comps, nTeams } = simulatePanel(5);
    const w = fitBradleyTerry(comps, nTeams);
    const naive = naiveSEs(comps, w, nTeams);
    const sand = sandwichSEs(comps, w, nTeams);
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(mean(sand)).toBeGreaterThan(mean(naive));
  });
  it("sandwich 95% CIs cover at least as well as naive CIs", () => {
    const { comps, truth, nTeams } = simulatePanel(5);
    const w = fitBradleyTerry(comps, nTeams);
    const naive = naiveSEs(comps, w, nTeams);
    const sand = sandwichSEs(comps, w, nTeams);
    const cover = (se: number[]) =>
      truth.filter((t, i) => Math.abs(w[i]! - t) <= 1.96 * se[i]!).length / nTeams;
    expect(cover(sand)).toBeGreaterThanOrEqual(cover(naive));
  });
});
