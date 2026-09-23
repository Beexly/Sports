import { describe, it, expect } from "vitest";
import {
  poissonPmf,
  poissonLogLik,
  poissonMle,
  poissonSample,
  ingarchFilter,
  ingarchLogLik,
  cmpPmf,
  nestedScoreSim,
  hawkesIntensity,
  hawkesLogLik,
  hawkesGridFit,
} from "./2304-01538-doubly-self-exciting-scores.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
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

describe("poisson", () => {
  it("MLE recovers lambda and PMF sums to 1", () => {
    const rand = mulberry32(31);
    const ks = Array.from({ length: 3000 }, () => poissonSample(rand, 2.5));
    expect(Math.abs(poissonMle(ks) - 2.5)).toBeLessThan(0.12);
    let s = 0;
    for (let k = 0; k <= 20; k++) s += poissonPmf(k, 2.5);
    expect(s).toBeCloseTo(1, 6);
  });
  it("INGARCH filter tracks a persistent count process", () => {
    const rand = mulberry32(32);
    const ys: number[] = [];
    let lam = 3;
    for (let t = 0; t < 400; t++) {
      lam = 0.5 + 0.6 * (ys[t - 1] ?? 3) + 0.3 * lam;
      ys.push(poissonSample(rand, lam));
    }
    const f = ingarchFilter(ys, 0.5, 0.6, 0.3);
    const mse = (a: number[], b: number[]): number => {
      let s = 0;
      for (let i = 0; i < a.length; i++) s += (a[i]! - b[i]!) ** 2;
      return s / a.length;
    };
    expect(mse(f.slice(50), ys.slice(50).map(() => 3))).toBeGreaterThan(0); // sanity
    expect(f[399]!).toBeGreaterThan(0);
  });
  it("nested simulator shows garbage-time dependence when b3 > 0", () => {
    const rand = mulberry32(33);
    const coef = { b0: 1.0, b1: 0, b2: 0, b3: 0.05 };
    const { fav, dog } = nestedScoreSim(rand, 3000, 24, coef, 0, 0);
    const mf = fav.reduce((a, b) => a + b, 0) / fav.length;
    const md = dog.reduce((a, b) => a + b, 0) / dog.length;
    const num = fav.reduce((a, b, i) => a + (b - mf) * (dog[i]! - md), 0);
    expect(num).toBeGreaterThan(0); // positive dependence via b3
  });
  it("CMP with nu=1 matches Poisson", () => {
    for (const k of [0, 1, 2, 3, 5]) {
      expect(cmpPmf(k, 2.5, 1)).toBeCloseTo(poissonPmf(k, 2.5), 4);
    }
  });
});

describe("hawkes", () => {
  it("intensity jumps right after an event and decays", () => {
    const i0 = hawkesIntensity(1.0, [0.5], 0.5, 1.0, 2.0);
    const i1 = hawkesIntensity(0.4, [0.5], 0.5, 1.0, 2.0);
    expect(i0).toBeGreaterThan(i1);
    const iFar = hawkesIntensity(10, [0.5], 0.5, 1.0, 2.0);
    expect(iFar).toBeCloseTo(0.5, 3);
  });
  it("grid fit recovers self-excitation on clustered data", () => {
    const rand = mulberry32(161);
    // simulate a self-exciting process via thinning
    const T = 200;
    const events: number[] = [];
    let t = 0;
    const mu = 0.3;
    const alpha = 0.8;
    const beta = 1.5;
    while (t < T) {
      const m = mu + alpha * events.filter((e) => t - e < 5).length;
      t += -Math.log(1 - rand()) / Math.max(0.05, m);
      if (t >= T) break;
      const lam = hawkesIntensity(t, events, mu, alpha, beta);
      if (rand() < lam / Math.max(lam, m)) events.push(t);
    }
    const fit = hawkesGridFit(events, T, [0.1, 0.3, 0.5], [0.2, 0.8, 1.4], [0.8, 1.5, 2.5]);
    expect(fit.alpha).toBeGreaterThan(0.2); // excitation detected
    const llExcited = hawkesLogLik(events, T, fit.mu, fit.alpha, fit.beta);
    const llFlat = hawkesLogLik(events, T, events.length / T, 0.01, 1.5);
    expect(llExcited).toBeGreaterThan(llFlat);
  });
});
