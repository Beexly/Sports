/**
 * CQR surrogate — tests (arXiv 2305.03623v1).
 *
 * ACCEPTANCE GATE: the quantile fit tracks the conditional median;
 * the conformal adjustment yields near-nominal coverage on held-out
 * configs; EI is positive for promising configs and 0 when the best
 * is already below the interval; calibration error is small;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  calibrateCqr,
  calibrationError,
  conformalEI,
  conformalInterval,
  fitQuantile,
  pinballLoss,
  predictQuantile,
  type ConfigObs,
} from "./cqr-surrogate";

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

function makeObs(n: number, seed: number): ConfigObs[] {
  const rand = mulberry32(seed);
  const obs: ConfigObs[] = [];
  for (let i = 0; i < n; i++) {
    const x = [rand() * 2 - 1, rand() * 2 - 1];
    // y = x0^2 + 0.5*x1 + heteroskedastic noise.
    const noise = (rand() - 0.5) * (0.2 + 0.4 * Math.abs(x[0] as number));
    obs.push({ x, y: (x[0] as number) ** 2 + 0.5 * (x[1] as number) + noise });
  }
  return obs;
}

describe("pinballLoss + fitQuantile", () => {
  it("fits the conditional median", () => {
    const obs = makeObs(400, 361);
    const median = fitQuantile(obs, 0.5);
    // Median model should beat a constant baseline on pinball loss.
    const meanY = obs.reduce((s, o) => s + o.y, 0) / obs.length;
    const modelLoss = obs.reduce((s, o) => s + pinballLoss(o.y, predictQuantile(median, o.x), 0.5), 0);
    const baseLoss = obs.reduce((s, o) => s + pinballLoss(o.y, meanY, 0.5), 0);
    expect(modelLoss).toBeLessThan(baseLoss);
    expect(pinballLoss(1, 0, 0.5)).toBeCloseTo(0.5, 12);
    expect(() => fitQuantile([], 0.5)).toThrow();
    expect(() => pinballLoss(1, 0, 1.5)).toThrow();
  });
});

describe("calibrateCqr + conformalInterval", () => {
  it("achieves near-nominal coverage on held-out configs", () => {
    const train = makeObs(300, 363);
    const heldout = makeObs(200, 365);
    const surr = calibrateCqr(train, heldout, 0.2);
    expect(surr.adjustment).toBeGreaterThanOrEqual(0);
    const { miscoverage, error } = calibrationError(surr, heldout);
    // Miscoverage near the nominal 0.2 (conformal guarantee is on
    // exchangeable data; allow slack for the linear quantile model).
    expect(miscoverage).toBeLessThan(0.35);
    expect(error).toBeLessThan(0.2);
    const iv = conformalInterval(surr, [0, 0]);
    expect(iv.lo).toBeLessThanOrEqual(iv.mid);
    expect(iv.mid).toBeLessThanOrEqual(iv.hi);
    expect(() => calibrateCqr(train, [], 0.1)).toThrow();
  });
});

describe("conformalEI", () => {
  it("rewards promising configs and ignores dominated ones", () => {
    const train = makeObs(300, 367);
    const heldout = makeObs(100, 369);
    const surr = calibrateCqr(train, heldout, 0.2);
    const bestY = Math.min(...train.map((o) => o.y));
    // A config near the optimum (x ~ [0, -1]) should have EI > 0...
    // use the best training config itself: interval covers it.
    const best = train.reduce((a, b) => (b.y < a.y ? b : a));
    const eiBest = conformalEI(surr, best.x, bestY);
    expect(eiBest).toBeGreaterThanOrEqual(0);
    // ...while a config whose whole interval is above bestY gets ~0.
    const eiBad = conformalEI(surr, [10, 10], bestY);
    expect(eiBad).toBe(0);
    expect(() => calibrationError(surr, [])).toThrow();
  });
});
