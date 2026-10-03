import { describe, expect, it } from "vitest";
import {
  bernoulli,
  bettingEProcess,
  bettingEStep,
  eProcess,
  eStep,
  mixtureEProcess,
  mulberry32,
  type BernoulliOutcome,
} from "../bernoulli-eprocess.js";

const LAMBDA = 0.2;
const Y0 = 0.5;

function binomSlackUpper(alpha: number, n: number, z = 4): number {
  return alpha + z * Math.sqrt((alpha * (1 - alpha)) / n);
}

describe("eStep (v5 likelihood ratio)", () => {
  it("is exactly 1 when pHat === pMkt, either outcome", () => {
    expect(eStep(0.3, 0.3, 1)).toBe(1);
    expect(eStep(0.3, 0.3, 0)).toBe(1);
    expect(eStep(0.7, 0.7, 1)).toBe(1);
    expect(eStep(0.7, 0.7, 0)).toBe(1);
  });

  it("is pHat/pMkt on a win and (1-pHat)/(1-pMkt) on a loss", () => {
    expect(eStep(0.55, 0.5, 1)).toBeCloseTo(1.1, 12);
    expect(eStep(0.55, 0.5, 0)).toBeCloseTo(0.9, 12);
  });

  it("refuses the closed unit interval", () => {
    expect(eStep(0, 0.5, 1)).toBeNull();
    expect(eStep(1, 0.5, 1)).toBeNull();
    expect(eStep(0.5, 0, 1)).toBeNull();
    expect(eStep(0.5, 1, 1)).toBeNull();
  });
});

describe("eProcess (v5)", () => {
  it("stays identically 1 when pHat === pMkt for every pick", () => {
    const n = 40;
    const p = Array.from({ length: n }, () => 0.42);
    const y: BernoulliOutcome[] = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : 0));
    const run = eProcess(p, p, y);
    expect(run).not.toBeNull();
    for (const m of run!.series) expect(m).toBe(1);
    expect(run!.supM).toBe(1);
  });

  it("is strictly increasing under perfect prediction", () => {
    const pMkt = [0.3, 0.4, 0.6, 0.2];
    const y: BernoulliOutcome[] = [1, 1, 1, 0];
    const pHat = y.map((yi) => (yi === 1 ? 0.99 : 0.01));
    const run = eProcess(pHat, pMkt, y);
    expect(run).not.toBeNull();
    for (let i = 1; i < run!.series.length; i++) {
      expect(run!.series[i]!).toBeGreaterThan(run!.series[i - 1]!);
    }
  });

  it("log-space matches a naive product within 1e-9 at n=50", () => {
    const n = 50;
    const pHat = Array.from({ length: n }, () => 0.55);
    const pMkt = Array.from({ length: n }, () => 0.5);
    const y: BernoulliOutcome[] = Array.from({ length: n }, (_, i) => (i % 3 === 0 ? 0 : 1));
    const run = eProcess(pHat, pMkt, y);
    expect(run).not.toBeNull();
    let naive = 1;
    for (let i = 0; i < n; i++) {
      const f = eStep(pHat[i]!, pMkt[i]!, y[i]!);
      expect(f).not.toBeNull();
      naive *= f!;
      expect(run!.series[i]!).toBeCloseTo(naive, 9);
    }
  });

  it("does not underflow or explode on n=1000 ratios ~1.01", () => {
    const n = 1000;
    const pHat = Array.from({ length: n }, () => 0.505);
    const pMkt = Array.from({ length: n }, () => 0.5);
    const y: BernoulliOutcome[] = Array.from({ length: n }, () => 1);
    const run = eProcess(pHat, pMkt, y);
    expect(run).not.toBeNull();
    expect(Number.isFinite(run!.M)).toBe(true);
    expect(Number.isFinite(run!.supM)).toBe(true);
    expect(run!.M).toBeGreaterThan(0);
    expect(Number.isNaN(run!.M)).toBe(false);
  });
});

describe("mixtureEProcess (v5 average of series)", () => {
  it("of identical processes equals that process", () => {
    const pHat = [0.6, 0.6, 0.6];
    const pMkt = [0.5, 0.5, 0.5];
    const y: BernoulliOutcome[] = [1, 0, 1];
    const run = eProcess(pHat, pMkt, y);
    expect(run).not.toBeNull();
    const mix = mixtureEProcess([run!.series, run!.series, run!.series]);
    expect(mix).not.toBeNull();
    expect(mix!.series).toHaveLength(run!.series.length);
    mix!.series.forEach((v, i) => expect(v).toBeCloseTo(run!.series[i]!, 12));
  });
});

describe("eProcess Ville bound under H0 (pHat = pMkt, no skill)", () => {
  it("P(sup M ≥ 1/α) ≤ α for α=0.05 and 0.01 (binomial slack only)", () => {
    const sims = 1000;
    const horizon = 1000;
    const rand = mulberry32(20260818);
    let cross05 = 0;
    let cross01 = 0;
    const thresh05 = 1 / 0.05;
    const thresh01 = 1 / 0.01;

    for (let s = 0; s < sims; s++) {
      const pMkt: number[] = [];
      const pHat: number[] = [];
      const ys: BernoulliOutcome[] = [];
      for (let t = 0; t < horizon; t++) {
        const m = 0.2 + rand() * 0.6;
        pMkt.push(m);
        pHat.push(m);
        ys.push(bernoulli(rand, m));
      }
      const run = eProcess(pHat, pMkt, ys);
      expect(run).not.toBeNull();
      if (run!.supM >= thresh05) cross05 += 1;
      if (run!.supM >= thresh01) cross01 += 1;
    }

    expect(cross05 / sims).toBeLessThanOrEqual(binomSlackUpper(0.05, sims));
    expect(cross01 / sims).toBeLessThanOrEqual(binomSlackUpper(0.01, sims));
  });
});

describe("eProcess power (record, not a gate)", () => {
  it("records median picks to sup M ≥ 100 at 55% vs 50% market", () => {
    const sims = 400;
    const horizon = 4000;
    const rand = mulberry32(20260819);
    const times: number[] = [];
    for (let s = 0; s < sims; s++) {
      const pHat: number[] = [];
      const pMkt: number[] = [];
      const ys: BernoulliOutcome[] = [];
      for (let t = 0; t < horizon; t++) {
        pHat.push(0.55);
        pMkt.push(0.5);
        ys.push(bernoulli(rand, 0.55));
      }
      const run = eProcess(pHat, pMkt, ys);
      expect(run).not.toBeNull();
      let hit: number | null = null;
      for (let t = 0; t < run!.series.length; t++) {
        if (run!.series[t]! >= 100) {
          hit = t + 1;
          break;
        }
      }
      if (hit !== null) times.push(hit);
    }
    times.sort((a, b) => a - b);
    const median = times.length ? times[Math.floor(times.length / 2)]! : Number.POSITIVE_INFINITY;
    // eslint-disable-next-line no-console
    console.log(
      `H-C v5 median picks to supM>=100 (pHat=0.55, pMkt=0.5): ${median} (hits ${times.length}/${sims})`,
    );
    expect(times.length).toBeGreaterThan(sims / 2);
    expect(Number.isFinite(median)).toBe(true);
  });
});

describe("bettingEStep (v4 increment, kept)", () => {
  it("grows on a win against y0=0.5", () => {
    const step = bettingEStep({ pHat: 0.6, y: 1, y0: 0.5, lambda: LAMBDA });
    expect(step).not.toBeNull();
    expect(step!.factor).toBeCloseTo(1.1, 12);
  });

  it("refuses a lambda that can make the increment non-positive", () => {
    expect(bettingEStep({ pHat: 0.6, y: 1, y0: 0.5, lambda: 2 })).toBeNull();
  });

  it("Ville-bounds the betting product under H0", () => {
    const sims = 2000;
    const horizon = 500;
    const rand = mulberry32(20260818);
    let cross05 = 0;
    const thresh05 = 1 / 0.05;
    for (let s = 0; s < sims; s++) {
      const pHats = Array.from({ length: horizon }, () => 0.5);
      const lambdas = Array.from({ length: horizon }, () => LAMBDA);
      const ys: BernoulliOutcome[] = Array.from({ length: horizon }, () => bernoulli(rand, Y0));
      const run = bettingEProcess(pHats, ys, Y0, lambdas);
      expect(run).not.toBeNull();
      if (run!.supM >= thresh05) cross05 += 1;
    }
    expect(cross05 / sims).toBeLessThanOrEqual(binomSlackUpper(0.05, sims));
  });
});
