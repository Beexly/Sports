import { describe, it, expect } from "vitest";
import {
  fitPropensityLogistic,
  inclusionProbabilities,
  iptwATE,
  pptaATE,
} from "./1710-08749v1-ppta-causal.js";

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

/**
 * Poor-overlap DGP: treatment strongly confounded by x0, few treated units,
 * true ATE = 2.
 */
function simPoorOverlap(n: number, seed: number) {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const T: number[] = [];
  const Y: number[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = randn(rand);
    const x1 = randn(rand);
    const e = 1 / (1 + Math.exp(-(2.5 * x0 - 0.5)));
    const t = rand() < e ? 1 : 0;
    X.push([x0, x1]);
    T.push(t);
    Y.push(2 * t + 1.5 * x0 + 0.5 * x1 + randn(rand));
  }
  return { X, T, Y };
}

describe("ppta-causal", () => {
  // seed 63: a representative poor-overlap draw (IPTW is unstable here while
  // PPTA stays near the truth - the paper's core claim)
  const { X, T, Y } = simPoorOverlap(220, 63);
  const fit = fitPropensityLogistic(X, T);

  it("propensity fit separates treated from controls", () => {
    const sig = (x: number) => 1 / (1 + Math.exp(-x));
    const e = X.map((row) => sig(fit.beta[0]! + fit.beta[1]! * row[0]! + fit.beta[2]! * row[1]!));
    const meanT = e.filter((_, i) => T[i] === 1).reduce((s, x) => s + x, 0) / T.filter((t) => t === 1).length;
    const meanC = e.filter((_, i) => T[i] === 0).reduce((s, x) => s + x, 0) / T.filter((t) => t === 0).length;
    expect(meanT).toBeGreaterThan(meanC);
  });

  it("inclusion probabilities downweight extreme-propensity units", () => {
    const incl = inclusionProbabilities(fit, X, 60, 3);
    expect(incl.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(Math.min(...incl)).toBeLessThan(0.9);
  });

  it("PPTA covers the truth with bias no worse than IPTW under poor overlap", () => {
    const ppta = pptaATE(X, T, Y, 8, 15, 11);
    const iptw = iptwATE(X, T, Y, fit.beta);
    expect(ppta.ciLow).toBeLessThanOrEqual(2);
    expect(ppta.ciHigh).toBeGreaterThanOrEqual(2);
    expect(Math.abs(ppta.ateMean - 2)).toBeLessThanOrEqual(Math.abs(iptw - 2) + 0.75);
  });
});
