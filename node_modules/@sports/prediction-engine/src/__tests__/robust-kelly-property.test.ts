/**
 * Property-based fuzz over robust Kelly (Beta credible-set worst case).
 *
 * Guards the invariants of robust-kelly.ts without rewriting the sizing math.
 * The module treats p as Knightian-uncertain: it inverts a Beta(p·n+1, (1−p)·n+1)
 * CDF, takes the lower α-quantile, honesty-clamps it by min(p, ·), and runs
 * standard Kelly at that p_worst. These tests read that contract and hammer it.
 *
 * Invariants:
 *   stake in [0, cap] (and never above central Kelly);
 *   worse (wider) uncertainty ⇒ smaller or equal stake, on the region where
 *     the lower quantile — not the honesty clamp — is the worst case;
 *   degenerate p returns a finite zero, never NaN.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { robustKellyFraction } from "../robust-kelly.js";

const RUNS = 500;

/**
 * Shared assert params. `numRuns` is the coverage knob; the rest is a hang guard.
 * Same shape as calibration-property.test.ts: fc.assert is synchronous, so a
 * wedged shrink cannot be killed by vitest's testTimeout. A 30s ceiling is far
 * above a healthy property (~tens of ms) and markInterruptAsFailure makes a
 * hang a loud failure instead of a silent pass.
 */
const FUZZ = {
  numRuns: RUNS,
  interruptAfterTimeLimit: 30_000,
  markInterruptAsFailure: true,
};

/** Finite p in a range where the Beta lower tail typically sits at or below p. */
const probability = fc.double({ min: 0.35, max: 0.95, noNaN: true, noDefaultInfinity: true });
/** Paying decimal odds (b = decimalOdds − 1 > 0). */
const decimalOdds = fc.double({ min: 1.05, max: 11, noNaN: true, noDefaultInfinity: true });
/** Effective sample size large enough that the honesty clamp is usually slack. */
const sampleSize = fc.double({ min: 5, max: 5_000, noNaN: true, noDefaultInfinity: true });
const alpha = fc.double({ min: 0.01, max: 0.25, noNaN: true, noDefaultInfinity: true });
const cap = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true });

describe("robustKellyFraction — stake bounds under fuzz", () => {
  it("stake is finite, in [0, 1], and never above the optional cap", () => {
    fc.assert(
      fc.property(probability, decimalOdds, sampleSize, alpha, cap, (p, odds, n, a, ceiling) => {
        const result = robustKellyFraction({
          probability: p,
          decimalOdds: odds,
          effectiveSampleSize: n,
          alpha: a,
          cap: ceiling,
        });
        expect(Number.isFinite(result.robustFraction)).toBe(true);
        expect(Number.isNaN(result.robustFraction)).toBe(false);
        expect(result.robustFraction).toBeGreaterThanOrEqual(0);
        expect(result.robustFraction).toBeLessThanOrEqual(1 + 1e-12);
        expect(result.robustFraction).toBeLessThanOrEqual(ceiling + 1e-12);
        expect(result.robustFraction).toBeLessThanOrEqual(result.centralKellyFraction + 1e-12);
        expect(Number.isFinite(result.worstCaseProbability)).toBe(true);
        expect(result.worstCaseProbability).toBeGreaterThanOrEqual(0);
        expect(result.worstCaseProbability).toBeLessThanOrEqual(result.probability + 1e-12);
      }),
      FUZZ,
    );
  });

  it("uncapped stake stays in [0, 1] and ≤ central Kelly", () => {
    fc.assert(
      fc.property(probability, decimalOdds, sampleSize, alpha, (p, odds, n, a) => {
        const result = robustKellyFraction({
          probability: p,
          decimalOdds: odds,
          effectiveSampleSize: n,
          alpha: a,
        });
        expect(Number.isFinite(result.robustFraction)).toBe(true);
        expect(result.robustFraction).toBeGreaterThanOrEqual(0);
        expect(result.robustFraction).toBeLessThanOrEqual(1 + 1e-12);
        expect(result.robustFraction).toBeLessThanOrEqual(result.centralKellyFraction + 1e-12);
        expect(result.cap).toBeNull();
      }),
      FUZZ,
    );
  });
});

describe("robustKellyFraction — wider uncertainty never raises the stake", () => {
  it("smaller n_eff (wider Beta set) ⇒ smaller or equal stake when the quantile binds", () => {
    fc.assert(
      fc.property(
        probability,
        decimalOdds,
        sampleSize,
        fc.double({ min: 1.05, max: 20, noNaN: true, noDefaultInfinity: true }),
        alpha,
        (p, odds, nSmall, nRatio, a) => {
          const nLarge = nSmall * nRatio;
          const thin = robustKellyFraction({
            probability: p,
            decimalOdds: odds,
            effectiveSampleSize: nSmall,
            alpha: a,
          });
          const thick = robustKellyFraction({
            probability: p,
            decimalOdds: odds,
            effectiveSampleSize: nLarge,
            alpha: a,
          });
          // Honesty clamp: at tiny n the Laplace +1 prior can put Q(α) ABOVE p,
          // and min(p, Q) then equals p. The "wider ⇒ smaller stake" claim is
          // the maximin-at-the-lower-tail, so only assert it when both worst
          // cases are the quantile, not the clamp.
          const thinBinds = thin.worstCaseProbability < thin.probability - 1e-12;
          const thickBinds = thick.worstCaseProbability < thick.probability - 1e-12;
          if (thinBinds && thickBinds) {
            expect(thin.robustFraction).toBeLessThanOrEqual(thick.robustFraction + 1e-12);
            expect(thin.confidenceSet.width).toBeGreaterThanOrEqual(thick.confidenceSet.width - 1e-12);
          }
          expect(thin.robustFraction).toBeGreaterThanOrEqual(0);
          expect(thick.robustFraction).toBeGreaterThanOrEqual(0);
        },
      ),
      FUZZ,
    );
  });

  it("smaller alpha (deeper lower tail, wider one-sided set) ⇒ smaller or equal stake", () => {
    fc.assert(
      fc.property(
        probability,
        decimalOdds,
        sampleSize,
        fc.double({ min: 0.02, max: 0.25, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.02, max: 0.9, noNaN: true, noDefaultInfinity: true }),
        (p, odds, n, aLoose, shrink) => {
          const aTight = aLoose * shrink;
          const loose = robustKellyFraction({
            probability: p,
            decimalOdds: odds,
            effectiveSampleSize: n,
            alpha: aLoose,
          });
          const tight = robustKellyFraction({
            probability: p,
            decimalOdds: odds,
            effectiveSampleSize: n,
            alpha: aTight,
          });
          expect(tight.robustFraction).toBeLessThanOrEqual(loose.robustFraction + 1e-12);
        },
      ),
      FUZZ,
    );
  });
});

describe("robustKellyFraction — degenerate p fails closed (zero, not NaN)", () => {
  it("non-finite p yields a finite zero stake (clamped to 0, never NaN)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
        decimalOdds,
        sampleSize,
        (p, odds, n) => {
          const result = robustKellyFraction({
            probability: p,
            decimalOdds: odds,
            effectiveSampleSize: n,
          });
          expect(Number.isNaN(result.robustFraction)).toBe(false);
          expect(Number.isFinite(result.robustFraction)).toBe(true);
          expect(result.robustFraction).toBe(0);
          expect(result.probability).toBe(0);
          expect(Number.isNaN(result.worstCaseProbability)).toBe(false);
          expect(Number.isFinite(result.worstCaseProbability)).toBe(true);
        },
      ),
      FUZZ,
    );
  });

  it("finite out-of-range p is clamped to [0, 1] and still returns a finite non-NaN stake", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(-1e6, -0.4, 1.4, 2, 1e308),
        decimalOdds,
        sampleSize,
        (p, odds, n) => {
          const result = robustKellyFraction({
            probability: p,
            decimalOdds: odds,
            effectiveSampleSize: n,
          });
          expect(Number.isNaN(result.robustFraction)).toBe(false);
          expect(Number.isFinite(result.robustFraction)).toBe(true);
          expect(result.robustFraction).toBeGreaterThanOrEqual(0);
          expect(result.probability).toBeGreaterThanOrEqual(0);
          expect(result.probability).toBeLessThanOrEqual(1);
        },
      ),
      FUZZ,
    );
  });

  it("non-paying / non-finite odds yield a finite zero stake", () => {
    fc.assert(
      fc.property(
        probability,
        fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, 0, 1, 0.5, -2),
        sampleSize,
        (p, odds, n) => {
          const result = robustKellyFraction({
            probability: p,
            decimalOdds: odds,
            effectiveSampleSize: n,
          });
          expect(Number.isNaN(result.robustFraction)).toBe(false);
          expect(Number.isFinite(result.robustFraction)).toBe(true);
          expect(result.robustFraction).toBe(0);
        },
      ),
      FUZZ,
    );
  });
});
