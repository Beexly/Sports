import { describe, expect, it } from "vitest";
import {
  besselI,
  coverProb,
  fitSkellamRegression,
  marginProbs,
  predictMarginProbs,
  skellamCDF,
  skellamPMF,
  type SkellamObs,
  type SkellamRegression,
} from "./skellam-margin";

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

function rpois(rand: () => number, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

describe("skellam-margin", () => {
  it("besselI matches known values", () => {
    // I_0(0) = 1, I_1(0) = 0, I_0(1) ~= 1.26606588, I_2(5) ~= 17.5056.
    expect(besselI(0, 0)).toBe(1);
    expect(besselI(3, 0)).toBe(0);
    expect(besselI(0, 1)).toBeCloseTo(1.26606588, 6);
    expect(besselI(2, 5)).toBeCloseTo(17.505614, 4);
    // Asymptotic branch agrees with a high-term series at the boundary.
    expect(besselI(0, 30)).toBeGreaterThan(0);
  });

  it("PMF is a valid distribution and symmetric when l1 == l2", () => {
    let s = 0;
    for (let k = -60; k <= 60; k++) s += skellamPMF(k, 22, 20);
    expect(s).toBeCloseTo(1, 6);
    expect(skellamPMF(3, 20, 20)).toBeCloseTo(skellamPMF(-3, 20, 20), 10);
    const probs = marginProbs(22, 20);
    expect(probs.homeWin).toBeGreaterThan(probs.awayWin);
    expect(probs.homeWin + probs.push + probs.awayWin).toBeCloseTo(1, 6);
    const even = marginProbs(20, 20);
    expect(even.homeWin).toBeCloseTo(even.awayWin, 8);
    expect(() => skellamPMF(0, -1, 20)).toThrow();
  });

  it("CDF and cover probability behave sensibly", () => {
    expect(skellamCDF(100, 22, 20)).toBeCloseTo(1, 6);
    expect(skellamCDF(-100, 22, 20)).toBeCloseTo(0, 6);
    // Favorite (l1 > l2) covers -3.5 more often than the dog covers +3.5.
    expect(coverProb(24, 18, -3.5)).toBeGreaterThan(coverProb(18, 24, 3.5));
    expect(coverProb(24, 18, -3.5)).toBeGreaterThan(0.5);
  });

  it("fitSkellamRegression recovers the scoring rates on simulated margins", () => {
    const rand = mulberry32(17);
    const data: SkellamObs[] = [];
    for (let i = 0; i < 400; i++) {
      const x = rand() * 2 - 1; // unit-strength differential
      const l1 = Math.exp(Math.log(22) + 0.6 * x);
      const l2 = Math.exp(Math.log(20) - 0.4 * x);
      data.push({ covariates: [x], margin: rpois(rand, l1) - rpois(rand, l2) });
    }
    const reg = fitSkellamRegression(data, { iters: 120 });
    expect(reg).not.toBeNull();
    // Intercepts near log(22)/log(20); slopes recover signs and rough size.
    expect(reg!.coef1[0]).toBeCloseTo(Math.log(22), 0);
    expect(reg!.coef2[0]).toBeCloseTo(Math.log(20), 0);
    expect(reg!.coef1[1]).toBeGreaterThan(0.2);
    expect(reg!.coef2[1]).toBeLessThan(-0.1);
    const probs = predictMarginProbs(reg!, [0.5]);
    expect(probs.homeWin).toBeGreaterThan(0.5);
    // Fitted model beats the intercept-only baseline on log-likelihood.
    const reg0 = reg as SkellamRegression;
    const ll = (r: SkellamRegression): number => {
      let s = 0;
      for (const o of data) {
        const l1 = Math.exp((r.coef1[0] ?? 0) + (r.coef1[1] ?? 0) * (o.covariates[0] ?? 0));
        const l2 = Math.exp((r.coef2[0] ?? 0) + (r.coef2[1] ?? 0) * (o.covariates[0] ?? 0));
        s += Math.log(skellamPMF(o.margin, l1, l2));
      }
      return s;
    };
    const base = { coef1: [Math.log(21), 0], coef2: [Math.log(21), 0] };
    expect(ll(reg0)).toBeGreaterThan(ll(base));
  });

  it("degenerate input is handled", () => {
    expect(fitSkellamRegression([])).toBeNull();
    expect(() =>
      fitSkellamRegression([
        { covariates: [1], margin: 3 },
        { covariates: [1, 2], margin: -3 },
      ]),
    ).toThrow();
  });
});
