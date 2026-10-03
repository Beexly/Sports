import { describe, expect, it } from "vitest";
import {
  evidenceFactor,
  hasRejected,
  initEProcess,
  logRejectBoundary,
  makeEProcessConfig,
  runEProcess,
  updateEProcess,
  wealth,
  type Observation,
} from "../e-process.js";
import { bernoulli, mulberry32 } from "./prng.js";

describe("e-process kernel — construction validity", () => {
  it("rejects out-of-range config", () => {
    expect(() => makeEProcessConfig({ nullRate: 0, alpha: 0.05 })).toThrow();
    expect(() => makeEProcessConfig({ nullRate: 1, alpha: 0.05 })).toThrow();
    expect(() => makeEProcessConfig({ nullRate: 0.05, alpha: 0 })).toThrow();
    expect(() => makeEProcessConfig({ nullRate: 0.05, alpha: 1 })).toThrow();
    // lambda must be in (0, 1/p0]
    expect(() =>
      makeEProcessConfig({ nullRate: 0.05, alpha: 0.05, lambda: 0 }),
    ).toThrow();
    expect(() =>
      makeEProcessConfig({ nullRate: 0.05, alpha: 0.05, lambda: 1 / 0.05 + 0.1 }),
    ).toThrow();
    // default lambda is admissible
    expect(makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 }).lambda).toBe(1);
  });

  it("evidence factor is nonnegative for lambda in (0, 1/p0]", () => {
    const p0 = 0.05;
    for (const lambda of [0.5, 1, 5, 1 / p0]) {
      const cfg = makeEProcessConfig({ nullRate: p0, alpha: 0.05, lambda });
      expect(evidenceFactor(cfg, 0)).toBeGreaterThanOrEqual(0);
      expect(evidenceFactor(cfg, 1)).toBeGreaterThan(0);
    }
  });

  it("starts at wealth 1 (logWealth 0)", () => {
    const s = initEProcess();
    expect(s.logWealth).toBe(0);
    expect(wealth(s)).toBe(1);
  });

  it("a violation (1) raises wealth, a clean (0) lowers it (default lambda=1)", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 });
    const up = updateEProcess(cfg, initEProcess(), 1);
    const down = updateEProcess(cfg, initEProcess(), 0);
    expect(wealth(up)).toBeCloseTo(2 - 0.05, 10); // 1 + 1*(1-0.05)
    expect(wealth(down)).toBeCloseTo(1 - 0.05, 10); // 1 - 1*0.05
  });

  it("is purely functional (no mutation of input state)", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.1, alpha: 0.05 });
    const s0 = initEProcess();
    const s1 = updateEProcess(cfg, s0, 1);
    expect(s0.logWealth).toBe(0); // unchanged
    expect(s1.logWealth).not.toBe(0);
  });
});

describe("e-process kernel — budget-burn monotonicity", () => {
  it("wealth is monotonically non-decreasing as violations accumulate", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.02, alpha: 0.01 });
    let s = initEProcess();
    let prev = wealth(s);
    for (let i = 0; i < 200; i++) {
      s = updateEProcess(cfg, s, 1);
      const w = wealth(s);
      expect(w).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = w;
    }
    // an unbroken violation stream must eventually exhaust the budget
    expect(hasRejected(cfg, s)).toBe(true);
  });

  it("peak-wealth crossing is sticky (anytime-valid, robust to later decay)", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.02, alpha: 0.05 });
    // burn up past the boundary with violations...
    let s = runEProcess(cfg, Array<Observation>(400).fill(1));
    expect(hasRejected(cfg, s)).toBe(true);
    // ...then feed many clean observations; the decision must stay rejected.
    s = runEProcess(cfg, Array<Observation>(400).fill(0), s);
    expect(hasRejected(cfg, s)).toBe(true);
  });
});

describe("e-process kernel — Ville boundary", () => {
  it("logRejectBoundary equals -log(alpha)", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 });
    expect(logRejectBoundary(cfg)).toBeCloseTo(-Math.log(0.05), 12);
  });
});

/**
 * THE honest proof the math is correct: a Monte-Carlo simulation that
 * empirically confirms the anytime-valid false-positive rate under H0 stays at
 * or below alpha. We simulate at the BOUNDARY of the one-sided null (true rate
 * p = p0), which is the worst case for type-I error, and count how many of
 * many independent streams EVER cross the reject boundary at any peek — the
 * exact event Ville's inequality bounds by alpha.
 */
describe("e-process kernel — Monte-Carlo false-positive rate under H0 (Ville)", () => {
  it("empirical anytime-valid FPR <= alpha at the null boundary", () => {
    const p0 = 0.1;
    const alpha = 0.1;
    const cfg = makeEProcessConfig({ nullRate: p0, alpha });

    const NUM_STREAMS = 5000;
    const HORIZON = 500; // peek after every one of 500 observations
    const rng = mulberry32(0xc0ffee);

    let falseRejections = 0;
    for (let stream = 0; stream < NUM_STREAMS; stream++) {
      let s = initEProcess();
      let rejected = false;
      for (let t = 0; t < HORIZON; t++) {
        // under H0 boundary: X_t ~ Bernoulli(p0)
        s = updateEProcess(cfg, s, bernoulli(rng, p0));
        if (hasRejected(cfg, s)) {
          rejected = true;
          break; // stop at first crossing (a real anytime-valid stopping rule)
        }
      }
      if (rejected) falseRejections++;
    }

    const empiricalFpr = falseRejections / NUM_STREAMS;
    // Ville guarantees the TRUE anytime-valid FPR <= alpha. Allow a small
    // Monte-Carlo margin (binomial noise) above alpha; the empirical value is
    // typically far BELOW alpha (Ville is conservative for discrete streams).
    // eslint-disable-next-line no-console
    console.log(
      `[MC] p0=${p0} alpha=${alpha} streams=${NUM_STREAMS} horizon=${HORIZON} => empirical anytime-valid FPR = ${empiricalFpr.toFixed(4)} (target <= ${alpha})`,
    );
    const mcMargin = 0.02;
    expect(empiricalFpr).toBeLessThanOrEqual(alpha + mcMargin);
  });

  it("has power: under H1 (true rate >> p0) it rejects the vast majority of streams", () => {
    const p0 = 0.05;
    const alpha = 0.05;
    const cfg = makeEProcessConfig({ nullRate: p0, alpha });
    const NUM_STREAMS = 1000;
    const HORIZON = 500;
    const rng = mulberry32(0x1234);
    const pAlt = 0.25; // true violation rate well above tolerance

    let rejections = 0;
    for (let stream = 0; stream < NUM_STREAMS; stream++) {
      let s = initEProcess();
      for (let t = 0; t < HORIZON; t++) {
        s = updateEProcess(cfg, s, bernoulli(rng, pAlt));
        if (hasRejected(cfg, s)) break;
      }
      if (hasRejected(cfg, s)) rejections++;
    }
    const power = rejections / NUM_STREAMS;
    // eslint-disable-next-line no-console
    console.log(`[MC] power at pAlt=${pAlt}: ${power.toFixed(4)}`);
    expect(power).toBeGreaterThan(0.9);
  });
});
