/**
 * C-193. Property fuzz over the odds and calibration arithmetic.
 *
 * Everything here feeds a number a customer reads or a gate the founder
 * trusts: implied probability drives edge, de-vig drives the market anchor the
 * calibration floors are measured against, and the Brier/ECE terms ARE the
 * PROVEN gate. An example-based test pins the cases someone thought of. These
 * pin the algebra itself, over the whole input domain including the hostile
 * edges books actually quote: pick'em, the +/-100 discontinuity, four-figure
 * longshots, underround books, and three-way soccer markets.
 *
 * Nothing here relaxes a threshold or touches production logic (law 9). Each
 * property is a restatement of an invariant the module's own doc comment
 * already claims.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  americanToImpliedProbability,
  impliedProbabilityToAmerican,
  averageAmericanPrices,
  removeVig,
} from "../scoring.js";
import { noVigFromAmericanPrices } from "../market-read.js";
import { shinDevig, gotoConversion, powerDevig, impliedFromDecimalOdds } from "../shin-devig.js";
import { brierDecomposition, expectedCalibrationError } from "../probability-calibration.js";

/**
 * Two-speed fuzz. CI runs the fast tier on every push; the deep tier is opt-in
 * via DEEP_FUZZ=1 (nightly, or before a release) and multiplies every property
 * by 25. The fast tier is NOT the real coverage claim - it is the amount of
 * coverage that fits in a pre-merge budget. Stating both numbers is the point:
 * "we fuzz this" means nothing without the case count behind it.
 */
const DEEP = process.env.DEEP_FUZZ === "1";
const SCALE = DEEP ? 25 : 1;
const RUNS = 20_000 * SCALE;

/** Real American prices: never 0, never strictly inside (-100, 100). */
const arbAmerican = fc
  .oneof(
    fc.integer({ min: 100, max: 100_000 }),
    fc.integer({ min: -100_000, max: -100 }),
  )
  .filter((n) => n !== 0);

const arbProb = fc.double({ min: 0.001, max: 0.999, noNaN: true });

describe("American <-> implied probability (fuzz)", () => {
  it("always lands strictly inside (0,1)", () => {
    fc.assert(
      fc.property(arbAmerican, (odds) => {
        const p = americanToImpliedProbability(odds);
        expect(Number.isFinite(p)).toBe(true);
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }),
      { numRuns: RUNS },
    );
  });

  it("is monotone: a longer price is never a higher probability", () => {
    fc.assert(
      fc.property(arbAmerican, arbAmerican, (x, y) => {
        // Compare in a single ordering: more positive American = longer shot.
        const [lo, hi] = x <= y ? [x, y] : [y, x];
        if (Math.sign(lo) !== Math.sign(hi)) return; // straddles the discontinuity
        const pLo = americanToImpliedProbability(lo);
        const pHi = americanToImpliedProbability(hi);
        expect(pLo).toBeGreaterThanOrEqual(pHi - 1e-12);
      }),
      { numRuns: RUNS },
    );
  });

  it("round-trips probability -> American -> probability within rounding", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.02, max: 0.98, noNaN: true }), (p) => {
        const back = americanToImpliedProbability(impliedProbabilityToAmerican(p));
        // American prices are integers, so the round trip is lossy by at most
        // one tick; assert the tick, not exact equality.
        expect(Math.abs(back - p)).toBeLessThan(0.005);
      }),
      { numRuns: RUNS },
    );
  });

  it("never emits an invalid American price from the inverse", () => {
    fc.assert(
      fc.property(arbProb, (p) => {
        const a = impliedProbabilityToAmerican(p);
        expect(Number.isFinite(a)).toBe(true);
        expect(Math.abs(a)).toBeGreaterThanOrEqual(100);
      }),
      { numRuns: RUNS },
    );
  });
});

describe("averageAmericanPrices averages in probability space (fuzz)", () => {
  it("returns a price whose implied probability lies within the input range", () => {
    // This is the exact defect the function exists to prevent: averaging
    // American prices directly across books that straddle pick'em produces a
    // price outside the range of its own inputs.
    fc.assert(
      fc.property(fc.array(arbAmerican, { minLength: 1, maxLength: 12 }), (prices) => {
        const out = averageAmericanPrices(prices);
        expect(out).not.toBeNull();
        const implied = prices.map(americanToImpliedProbability);
        const got = americanToImpliedProbability(out as number);
        expect(got).toBeGreaterThanOrEqual(Math.min(...implied) - 0.005);
        expect(got).toBeLessThanOrEqual(Math.max(...implied) + 0.005);
      }),
      { numRuns: RUNS },
    );
  });

  it("is null only on the empty set", () => {
    expect(averageAmericanPrices([])).toBeNull();
    fc.assert(
      fc.property(fc.array(arbAmerican, { minLength: 1, maxLength: 8 }), (prices) => {
        expect(averageAmericanPrices(prices)).not.toBeNull();
      }),
      { numRuns: 5_000 * SCALE },
    );
  });

  it("is invariant to the order the books are pooled in", () => {
    fc.assert(
      fc.property(fc.array(arbAmerican, { minLength: 2, maxLength: 10 }), (prices) => {
        const forward = averageAmericanPrices(prices);
        const backward = averageAmericanPrices([...prices].reverse());
        expect(backward).toBe(forward);
      }),
      { numRuns: 5_000 * SCALE },
    );
  });
});

describe("de-vig normalizes and preserves ordering (fuzz)", () => {
  it("removeVig always sums to 1", () => {
    fc.assert(
      fc.property(arbProb, arbProb, (h, a) => {
        const { home, away } = removeVig(h, a);
        expect(home + away).toBeCloseTo(1, 10);
      }),
      { numRuns: RUNS },
    );
  });

  it("noVigFromAmericanPrices sums to 1 and stays inside (0,1)", () => {
    fc.assert(
      fc.property(
        fc.array(arbAmerican, { minLength: 2, maxLength: 3 }),
        (prices) => {
          const read = noVigFromAmericanPrices(prices);
          if (read === null) return;
          const sum = read.fairProbabilities.reduce((s, p) => s + p, 0);
          expect(sum).toBeCloseTo(1, 8);
          for (const p of read.fairProbabilities) {
            expect(Number.isFinite(p)).toBe(true);
            expect(p).toBeGreaterThan(0);
            expect(p).toBeLessThan(1);
          }
          expect(read.bookHoldPct).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("noVigFromAmericanPrices preserves the market's ordering of sides", () => {
    // De-vig may move every number, but it must never re-rank the favourite
    // and the underdog - that would flip which side the engine calls value.
    fc.assert(
      fc.property(arbAmerican, arbAmerican, (x, y) => {
        const read = noVigFromAmericanPrices([x, y]);
        if (read === null) return;
        const rawX = americanToImpliedProbability(x);
        const rawY = americanToImpliedProbability(y);
        const [fx, fy] = read.fairProbabilities;
        if (fx === undefined || fy === undefined) return;
        const rawOrder = Math.sign(rawX - rawY);
        const fairOrder = Math.sign(fx - fy);

        // NEVER REVERSED is the invariant that actually protects the product:
        // a flip changes which side the engine calls value. This must hold at
        // every price, with no tolerance.
        if (rawOrder !== 0 && fairOrder !== 0) {
          expect(fairOrder).toBe(rawOrder);
        }

        // Collapsing to a TIE is legitimate at the precision limit and is not
        // a defect: fuzz found -11986 vs -11987, two prices whose raw implied
        // probabilities differ by 7e-6 and which are indistinguishable after
        // de-vig and rounding. So only require STRICT preservation once the
        // gap is materially larger than that rounding floor.
        if (Math.abs(rawX - rawY) > 1e-3) {
          expect(fairOrder).toBe(rawOrder);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("every de-vig method returns a finite, normalized distribution", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 1.01, max: 200, noNaN: true }), { minLength: 2, maxLength: 4 }),
        (decimals) => {
          const raw = impliedFromDecimalOdds(decimals);
          for (const probs of [
            shinDevig(raw).probabilities,
            gotoConversion(raw),
            powerDevig(raw).probabilities,
          ]) {
            for (const p of probs) {
              expect(Number.isFinite(p), `non-finite from de-vig: ${p}`).toBe(true);
              expect(p).toBeGreaterThanOrEqual(0);
              expect(p).toBeLessThanOrEqual(1);
            }
          }
        },
      ),
      { numRuns: 10_000 * SCALE },
    );
  });
});

describe("Brier decomposition and ECE obey their own algebra (fuzz)", () => {
  const arbSamples = fc.array(
    fc.record({ p: fc.double({ min: 0, max: 1, noNaN: true }), y: fc.constantFrom(0, 1) }),
    { minLength: 1, maxLength: 400 },
  ) as unknown as fc.Arbitrary<{ p: number; y: 0 | 1 }[]>;

  it("keeps every term non-negative and uncertainty = baseRate(1-baseRate)", () => {
    fc.assert(
      fc.property(arbSamples, (samples) => {
        const d = brierDecomposition(samples);
        expect(d.brier).toBeGreaterThanOrEqual(0);
        expect(d.reliability).toBeGreaterThanOrEqual(0);
        expect(d.resolution).toBeGreaterThanOrEqual(0);
        expect(d.uncertainty).toBeGreaterThanOrEqual(0);
        expect(d.uncertainty).toBeCloseTo(d.baseRate * (1 - d.baseRate), 3);
        expect(d.uncertainty).toBeLessThanOrEqual(0.25 + 1e-9);
      }),
      { numRuns: 10_000 * SCALE },
    );
  });

  it("satisfies brier = reliability - resolution + uncertainty when bins are exact", () => {
    // The module states the identity is exact only when forecasts are constant
    // within a bin. Generate exactly that case - one forecast value per bin -
    // so the identity is testable rather than approximately asserted.
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            bin: fc.integer({ min: 0, max: 9 }),
            y: fc.constantFrom(0, 1),
          }),
          { minLength: 1, maxLength: 300 },
        ),
        (rows) => {
          const samples = rows.map((r) => ({ p: r.bin / 10 + 0.05, y: r.y as 0 | 1 }));
          const d = brierDecomposition(samples);
          expect(d.reliability - d.resolution + d.uncertainty).toBeCloseTo(d.brier, 2);
        },
      ),
      { numRuns: 10_000 * SCALE },
    );
  });

  it("ECE stays in [0,1] and does not depend on sample order", () => {
    fc.assert(
      fc.property(arbSamples, (samples) => {
        const ece = expectedCalibrationError(samples);
        expect(Number.isFinite(ece)).toBe(true);
        expect(ece).toBeGreaterThanOrEqual(0);
        expect(ece).toBeLessThanOrEqual(1);
        expect(expectedCalibrationError([...samples].reverse())).toBeCloseTo(ece, 12);
      }),
      { numRuns: 10_000 * SCALE },
    );
  });

  it("a perfectly calibrated forecaster scores ECE at the rounding floor", () => {
    // Build a forecaster that is calibrated BY CONSTRUCTION: in each bin the
    // observed win rate is set as close to the forecast as an integer number
    // of wins allows. The residual is therefore bounded exactly by 1/(2n) per
    // bin, so assert THAT bound rather than a magic tolerance - it is the
    // tightest true statement and it fails if the estimator drifts at all.
    //
    // The floor is not cosmetic: fuzz first ran this with n as small as 1,
    // where a p=0.5 bin can only be observed at 0 or 1 and the "perfectly
    // calibrated" premise is unconstructable. Small n is excluded because the
    // property is undefined there, not because it was inconvenient.
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 20, max: 200 }), { minLength: 1, maxLength: 10 }),
        (counts) => {
          const bins = counts.length;
          const samples: { p: number; y: 0 | 1 }[] = [];
          let worstGap = 0;
          counts.forEach((n, i) => {
            const p = (i + 0.5) / bins;
            const wins = Math.round(n * p);
            worstGap = Math.max(worstGap, Math.abs(wins / n - p));
            for (let k = 0; k < n; k++) samples.push({ p, y: k < wins ? 1 : 0 });
          });
          // expectedCalibrationError returns round(value, 4) (see the module's
          // `round` helper), so the reported number can exceed the exact
          // construction bound by up to half an ulp at 4dp. Fuzz found this
          // with n=75: the true gap is 0.0066666..., reported as 0.0067. Carry
          // the rounding term explicitly instead of padding the bound - the
          // published ECE the PROVEN gate reads is a 4dp figure, and that is
          // worth stating in a test rather than discovering during a flip.
          const ECE_HALF_ULP = 0.00005;
          const ece = expectedCalibrationError(samples, bins);
          expect(ece).toBeLessThanOrEqual(worstGap + ECE_HALF_ULP + 1e-9);
          expect(ece).toBeLessThanOrEqual(0.5 / Math.min(...counts) + ECE_HALF_ULP + 1e-9);
        },
      ),
      { numRuns: 5_000 * SCALE },
    );
  });
});
