import { describe, expect, it } from "vitest";
import {
  SUPPRESSION_CURVE_SEED,
  curveAtRates,
  curveGap,
  oracleBaseline,
  oraclePolicy,
  randomBaseline,
  randomPolicy,
  unfilteredValue,
  type Outcome,
} from "../suppression-curve.js";

const RATES = [0, 0.25, 0.5, 0.75, 1];

function fixture(): { scores: number[]; outcomes: Outcome[] } {
  // 20 picks, 12 wins → unfiltered accuracy 0.6. Varied scores.
  const outcomes: Outcome[] = [
    1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0,
  ];
  const scores = [
    0.91, 0.82, 0.2, 0.77, 0.15, 0.7, 0.66, 0.31, 0.88, 0.74, 0.22, 0.69, 0.8, 0.18, 0.73, 0.25,
    0.61, 0.58, 0.4, 0.35,
  ];
  return { scores, outcomes };
}

describe("suppression-curve DROP semantics", () => {
  it("uses seed 20260818", () => {
    expect(SUPPRESSION_CURVE_SEED).toBe(20260818);
  });

  it("at f=0 all three curves equal the unfiltered value exactly", () => {
    const { scores, outcomes } = fixture();
    const u = unfilteredValue(scores, outcomes);
    const policy = curveAtRates(scores, outcomes, [0], randomPolicy);
    const rnd = randomBaseline(outcomes, [0], 200);
    const ora = oracleBaseline(outcomes, [0]);
    expect(policy[0]!.accuracy).toBe(u.accuracy);
    expect(rnd[0]!.mean).toBe(u.accuracy);
    expect(ora[0]!.accuracy).toBe(u.accuracy);
  });

  it("a RANDOM policy lands inside the random band at every rate with survivors", () => {
    const { scores, outcomes } = fixture();
    const policy = curveAtRates(scores, outcomes, RATES, randomPolicy, 7);
    const band = randomBaseline(outcomes, RATES, 1000);
    for (let i = 0; i < RATES.length; i++) {
      if (policy[i]!.accuracy === null || band[i]!.lo === null) continue;
      expect(policy[i]!.accuracy!).toBeGreaterThanOrEqual(band[i]!.lo! - 1e-12);
      expect(policy[i]!.accuracy!).toBeLessThanOrEqual(band[i]!.hi! + 1e-12);
    }
  });

  it("an ORACLE policy fed in as policy matches oracleBaseline exactly", () => {
    const { scores, outcomes } = fixture();
    const asPolicy = curveAtRates(scores, outcomes, RATES, oraclePolicy);
    const baseline = oracleBaseline(outcomes, RATES);
    asPolicy.forEach((p, i) => {
      expect(p.nKept).toBe(baseline[i]!.nKept);
      if (p.accuracy === null) expect(baseline[i]!.accuracy).toBeNull();
      else expect(p.accuracy).toBe(baseline[i]!.accuracy);
    });
  });

  it("oracle >= random mean >= 0 at every rate with a defined mean", () => {
    const { outcomes } = fixture();
    const ora = oracleBaseline(outcomes, RATES);
    const rnd = randomBaseline(outcomes, RATES, 400);
    for (let i = 0; i < RATES.length; i++) {
      if (ora[i]!.accuracy === null || rnd[i]!.mean === null) continue;
      expect(rnd[i]!.mean!).toBeGreaterThanOrEqual(0);
      expect(ora[i]!.accuracy!).toBeGreaterThanOrEqual(rnd[i]!.mean! - 1e-9);
    }
  });

  it("suppressing 100% is defined, not NaN or a crash", () => {
    const { scores, outcomes } = fixture();
    const p = curveAtRates(scores, outcomes, [1], randomPolicy);
    expect(p[0]!.nKept).toBe(0);
    expect(p[0]!.accuracy).toBeNull();
    expect(p[0]!.brier).toBeNull();
    const b = randomBaseline(outcomes, [1], 50);
    expect(b[0]!.mean).toBeNull();
    const o = oracleBaseline(outcomes, [1]);
    expect(o[0]!.accuracy).toBeNull();
  });

  it("the random band contains its own mean at every rate", () => {
    const { outcomes } = fixture();
    const band = randomBaseline(outcomes, RATES, 1000);
    for (const b of band) {
      if (b.mean === null || b.lo === null || b.hi === null) continue;
      expect(b.mean).toBeGreaterThanOrEqual(b.lo - 1e-12);
      expect(b.mean).toBeLessThanOrEqual(b.hi + 1e-12);
    }
  });

  it("curveGap is a finite number", () => {
    const { scores, outcomes } = fixture();
    const policy = curveAtRates(scores, outcomes, RATES, oraclePolicy);
    const rnd = randomBaseline(outcomes, RATES, 200);
    const g = curveGap(policy, rnd);
    expect(Number.isFinite(g)).toBe(true);
    expect(g).toBeGreaterThan(0);
  });
});
