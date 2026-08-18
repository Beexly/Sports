import { describe, expect, it } from "vitest";
import {
  bernoulli,
  eStep,
  mixtureEProcess,
  mulberry32,
  type BernoulliOutcome,
} from "../bernoulli-eprocess.js";

const LAMBDA = 0.2;
const Y0 = 0.5;
const PHAT_NULL = 0.5;

function binomSlackUpper(alpha: number, n: number, z = 4): number {
  return alpha + z * Math.sqrt((alpha * (1 - alpha)) / n);
}

describe("eStep", () => {
  it("grows on a win against y0=0.5", () => {
    const step = eStep({ pHat: 0.6, y: 1, y0: 0.5, lambda: LAMBDA });
    expect(step).not.toBeNull();
    expect(step!.factor).toBeCloseTo(1.1, 12);
    expect(step!.M).toBeCloseTo(1.1, 12);
  });

  it("shrinks on a loss against y0=0.5", () => {
    const step = eStep({ pHat: 0.6, y: 0, y0: 0.5, lambda: LAMBDA });
    expect(step).not.toBeNull();
    expect(step!.factor).toBeCloseTo(0.9, 12);
  });

  it("refuses a lambda that can make the increment non-positive", () => {
    expect(eStep({ pHat: 0.6, y: 1, y0: 0.5, lambda: 2 })).toBeNull();
    expect(eStep({ pHat: 0.6, y: 1, y0: 0.5, lambda: 0 })).toBeNull();
  });
});

describe("mixtureEProcess Ville bound under H0", () => {
  it("P(sup M ≥ 1/α) ≤ α for α=0.05 and 0.01 (binomial slack only)", () => {
    const sims = 2000;
    const horizon = 500;
    const rand = mulberry32(20260818);
    let cross05 = 0;
    let cross01 = 0;
    const thresh05 = 1 / 0.05;
    const thresh01 = 1 / 0.01;

    for (let s = 0; s < sims; s++) {
      const pHats = Array.from({ length: horizon }, () => PHAT_NULL);
      const lambdas = Array.from({ length: horizon }, () => LAMBDA);
      const ys: BernoulliOutcome[] = Array.from({ length: horizon }, () =>
        bernoulli(rand, Y0),
      );
      const run = mixtureEProcess(pHats, ys, Y0, lambdas);
      expect(run).not.toBeNull();
      if (run!.supM >= thresh05) cross05 += 1;
      if (run!.supM >= thresh01) cross01 += 1;
    }

    const rate05 = cross05 / sims;
    const rate01 = cross01 / sims;
    // Validity check. If this fails the increment is not a test-martingale.
    // Do not loosen the slack — fix eStep.
    expect(rate05).toBeLessThanOrEqual(binomSlackUpper(0.05, sims));
    expect(rate01).toBeLessThanOrEqual(binomSlackUpper(0.01, sims));
  });
});

describe("mixtureEProcess power (record, not a gate)", () => {
  it("records median picks to sup M ≥ 100 at a genuine 55% edge vs 50% market", () => {
    const sims = 400;
    const horizon = 4000;
    const pHat = 0.55;
    const rand = mulberry32(20260819);
    const times: number[] = [];

    for (let s = 0; s < sims; s++) {
      let M = 1;
      let sup = 1;
      let hit: number | null = null;
      for (let t = 1; t <= horizon; t++) {
        const y = bernoulli(rand, pHat);
        const step = eStep({ pHat, y, y0: Y0, lambda: LAMBDA, M0: M });
        if (step === null) {
          hit = null;
          break;
        }
        M = step.M;
        if (M > sup) sup = M;
        if (sup >= 100) {
          hit = t;
          break;
        }
      }
      if (hit !== null) times.push(hit);
    }

    times.sort((a, b) => a - b);
    const median = times.length
      ? times[Math.floor(times.length / 2)]!
      : Number.POSITIVE_INFINITY;
    // Recorded for the ledger — not an assertion. Expect roughly 900.
    // eslint-disable-next-line no-console
    console.log(
      `H-C median picks to supM>=100 (pHat=0.55, y0=0.5, lambda=0.2): ${median} (hits ${times.length}/${sims})`,
    );
    expect(times.length).toBeGreaterThan(sims / 2);
    expect(Number.isFinite(median)).toBe(true);
  });
});
