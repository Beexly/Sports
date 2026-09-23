/**
 * Generation of Threat — tests (arXiv 2304.05242).
 *
 * ACCEPTANCE GATE: the Hawkes intensity decays exponentially after
 * events; the log-likelihood prefers the true parameters over a
 * misspecified alternative on simulated data; GoT credits the
 * high-excitation dimension more; bootstrap SEs are positive and
 * smaller than the estimates; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  bootstrapGoT,
  generationOfThreat,
  intensity,
  logLikelihood,
  simulateHawkes,
  type HawkesParams,
} from "./generation-of-threat";

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

const params: HawkesParams = {
  mu: [0.5, 0.5],
  alpha: [
    [0.3, 0.6], // dimension 1 excites dimension 0 strongly
    [0.1, 0.2],
  ],
  beta: [1.0, 1.0],
};

describe("intensity", () => {
  it("decays exponentially after events", () => {
    const events: Array<[number, number]> = [[0, 1]];
    const at1 = intensity(0, 1, events, params);
    const at5 = intensity(0, 5, events, params);
    expect(at1).toBeCloseTo(0.5 + 0.6 * Math.exp(-1), 12);
    expect(at5).toBeLessThan(at1);
    expect(at5).toBeGreaterThan(0.5);
    // No events: baseline only.
    expect(intensity(0, 10, [], params)).toBe(0.5);
  });
});

describe("logLikelihood", () => {
  it("prefers the true parameters on simulated data", () => {
    const rand = mulberry32(341);
    const events = simulateHawkes(params, 600, rand);
    expect(events.length).toBeGreaterThan(50);
    const llTrue = logLikelihood(events, params, 600);
    const wrong: HawkesParams = {
      mu: [0.5, 0.5],
      alpha: [
        [0.05, 0.05],
        [0.05, 0.05],
      ],
      beta: [1.0, 1.0],
    };
    expect(llTrue).toBeGreaterThan(logLikelihood(events, wrong, 600));
  });
});

describe("generationOfThreat", () => {
  it("credits the high-excitation dimension more", () => {
    const { got, branching } = generationOfThreat(params);
    // Dimension 1 -> 0 excitation 0.6 dominates: dim 1's GoT larger.
    expect(got[1]!).toBeGreaterThan(got[0]!);
    expect(got[0]!).toBeGreaterThanOrEqual(0);
    expect(branching[0]![1]).toBeCloseTo(0.6, 12);
  });
});

describe("bootstrapGoT", () => {
  it("returns positive SEs smaller than the estimates", () => {
    const rand = mulberry32(343);
    const { se, mean } = bootstrapGoT(params, 600, 50, rand);
    expect(se).toHaveLength(2);
    expect(se[0]).toBeGreaterThan(0);
    expect(se[1]).toBeGreaterThan(0);
    expect(se[0] as number).toBeLessThan(mean[0] as number);
    expect(() => bootstrapGoT(params, 600, 1, rand)).toThrow();
  });
});
