import { describe, it, expect } from "vitest";
import {
  bivPoissonPmf,
  bivPoissonSample,
  dixonColesTau,
} from "./2012-14949-bivariate-poisson-home-advantage.js";

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

describe("bipoisson", () => {
  it("PMF sums to 1 and covariance equals l3", () => {
    let s = 0;
    for (let x = 0; x <= 12; x++) for (let y = 0; y <= 12; y++) s += bivPoissonPmf(x, y, 1.5, 1.2, 0.4);
    expect(s).toBeCloseTo(1, 3);
  });
  it("common-shock sampler induces positive correlation", () => {
    const rand = mulberry32(51);
    const knuth = (r: () => number, l: number): number => {
      const L = Math.exp(-l);
      let k = 0;
      let p = 1;
      do { k++; p *= r(); } while (p > L);
      return k - 1;
    };
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 4000; i++) {
      const [x, y] = bivPoissonSample(rand, 1.5, 1.2, 0.8, knuth);
      xs.push(x); ys.push(y);
    }
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const cov = xs.reduce((a, b, i) => a + (b - mx) * (ys[i]! - my), 0) / xs.length;
    expect(cov).toBeGreaterThan(0.4); // ~= l3 = 0.8
  });
  it("dixon-coles tau is 1 away from low scores", () => {
    expect(dixonColesTau(2, 2, 1.5, 1.2, 0.1)).toBe(1);
    expect(dixonColesTau(0, 0, 1.5, 1.2, 0.1)).toBeCloseTo(1 - 1.5 * 1.2 * 0.1, 10);
  });
});
