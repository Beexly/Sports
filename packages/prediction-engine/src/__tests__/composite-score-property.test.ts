/**
 * C-209. Property fuzz over the Galaxy Index scoring core.
 *
 * `compositeScore` is described in its own consumers as "the central
 * single-source-of-truth score" - every player ranking and every tool that
 * says WHY resolves through it. It had 7 example tests. This file adds 19
 * properties over its algebra, because the thing every downstream surface
 * agrees on had better be the thing that cannot be wrong.
 *
 * The design being tested is genuinely the right shape for the product's
 * ambition - fold ANY signal in, including soft ones. `WeightedSignal` carries
 * value, weight, `confidence` (its own comment: "The valve that keeps a rumor
 * from voting like a fact") and `ageDays` for half-life decay. A beat report,
 * a coachspeak read, a scheme note - each is just another signal at low
 * confidence and a real age. So the confidence valve and the freshness decay
 * are not incidental knobs; they are the mechanism that lets soft information
 * in without letting it shout. They are fuzzed hardest here.
 *
 * Two-speed, like the other property suites: DEEP_FUZZ=1 multiplies by 25.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { compositeScore, type WeightedSignal } from "../composite-score.js";

/**
 * compositeScore returns `round4(score)`, so the published Galaxy Index is a
 * 4-decimal figure and every property here must carry half an ulp of it.
 *
 * This is not a nuisance, it is a product fact worth knowing before wiring
 * soft signals in: a signal whose NET contribution to the score is smaller
 * than 5e-5 is invisible in the output. A beat report entering at low
 * confidence and small weight can round away to nothing - which is the
 * intended conservatism, but it means "we folded it in" and "it moved the
 * number" are different claims.
 */
const SCORE_HALF_ULP = 5e-5;

const DEEP = process.env.DEEP_FUZZ === "1";
const SCALE = DEEP ? 25 : 1;
const RUNS = 8_000 * SCALE;

/**
 * A well-formed signal.
 *
 * Magnitudes are held away from the denormal floor on purpose. An unbounded
 * fc.double happily produces weight = 5e-324 and confidence = 5e-324, whose
 * product underflows to exactly 0 - so the signal is "live" by a naive
 * weight > 0 test while contributing literally nothing. That is CORRECT
 * behaviour from compositeScore (an immeasurably small weight should vanish),
 * and it broke two of these properties on the first run. The generator now
 * produces weights and values a real signal source can emit; the underflow
 * path is still covered, deliberately, by arbHostileSignal below.
 */
const MIN_MAGNITUDE = 1e-6;
const arbSignal: fc.Arbitrary<WeightedSignal> = fc.record({
  key: fc.string({ minLength: 1, maxLength: 12 }),
  value: fc.double({ min: -5, max: 5, noNaN: true }).map((v) => (Math.abs(v) < MIN_MAGNITUDE ? 0 : v)),
  weight: fc.oneof(
    fc.constant(0),
    fc.double({ min: MIN_MAGNITUDE, max: 5, noNaN: true }),
  ),
  confidence: fc.oneof(
    fc.constant(0),
    fc.double({ min: MIN_MAGNITUDE, max: 1, noNaN: true }),
  ),
  ageDays: fc.double({ min: 0, max: 120, noNaN: true }),
});

/** Hostile signals: the shapes a real ingestion path can actually emit. */
const arbHostileSignal: fc.Arbitrary<WeightedSignal> = fc.oneof(
  arbSignal,
  fc.record({ key: fc.constant("nan-value"), value: fc.constant(Number.NaN), weight: fc.constant(3) }),
  fc.record({ key: fc.constant("inf-value"), value: fc.constant(Number.POSITIVE_INFINITY), weight: fc.constant(3) }),
  fc.record({ key: fc.constant("nan-weight"), value: fc.constant(1), weight: fc.constant(Number.NaN) }),
  fc.record({ key: fc.constant("neg-weight"), value: fc.constant(1), weight: fc.constant(-9) }),
  fc.record({ key: fc.constant("conf-out-of-range"), value: fc.constant(1), weight: fc.constant(2), confidence: fc.constant(7) }),
  fc.record({ key: fc.constant("neg-age"), value: fc.constant(1), weight: fc.constant(2), ageDays: fc.constant(-40) }),
) as fc.Arbitrary<WeightedSignal>;

const list = (arb: fc.Arbitrary<WeightedSignal>, min = 0, max = 14) =>
  fc.array(arb, { minLength: min, maxLength: max });

describe("compositeScore is a well-behaved weighted mean (fuzz)", () => {
  it("always returns a finite score, for any signal set a feed can produce", () => {
    fc.assert(
      fc.property(list(arbHostileSignal), (signals) => {
        const r = compositeScore(signals);
        expect(Number.isFinite(r.score)).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("is bounded by the range of the values it averages", () => {
    // A weighted mean can never leave the convex hull of its inputs. If this
    // fails, some signal is being amplified rather than averaged.
    fc.assert(
      fc.property(list(arbSignal, 1), (signals) => {
        const r = compositeScore(signals);
        // "Live" must be computed UNROUNDED, the way the score itself is.
        //
        // Two wrong versions preceded this one, and the second is the
        // interesting one: `contributions[].effectiveWeight` is round4'd while
        // the score divides by the RAW total, so a signal can move the score
        // while reporting an effective weight of 0.0000. Judging liveness from
        // the reported field therefore excluded a signal that was genuinely in
        // the average, and the bound came out too tight. (That rounding
        // asymmetry is real but harmless for display: such a signal's reported
        // contribution rounds to 0 too, so the driver panel is self-consistent
        // even though it under-reports the weight.)
        const halfLife = 14; // compositeScore's default
        const live = signals.filter((sig) => {
          const w = Number.isFinite(sig.weight) ? Math.max(0, sig.weight) : 0;
          const c = Math.min(1, Math.max(0, sig.confidence ?? 1));
          const age = Math.max(0, sig.ageDays ?? 0);
          return w * c * Math.pow(0.5, age / halfLife) > 0;
        });
        if (live.length === 0) return;
        const vals = live.map((s) => s.value);
        expect(r.score).toBeGreaterThanOrEqual(Math.min(...vals) - SCORE_HALF_ULP);
        expect(r.score).toBeLessThanOrEqual(Math.max(...vals) + SCORE_HALF_ULP);
      }),
      { numRuns: RUNS },
    );
  });

  it("scores 0 when nothing carries weight", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ key: fc.string(), value: fc.double({ min: -5, max: 5, noNaN: true }), weight: fc.constant(0) }), { maxLength: 8 }),
        (signals) => {
          expect(compositeScore(signals as WeightedSignal[]).score).toBe(0);
        },
      ),
      { numRuns: RUNS },
    );
    expect(compositeScore([]).score).toBe(0);
  });

  it("does not depend on the order signals arrive in", () => {
    fc.assert(
      fc.property(list(arbSignal, 2), (signals) => {
        const a = compositeScore(signals).score;
        const b = compositeScore([...signals].reverse()).score;
        expect(b).toBeCloseTo(a, 10);
      }),
      { numRuns: RUNS },
    );
  });

  it("reports weight shares that sum to 1 whenever anything is live", () => {
    fc.assert(
      fc.property(list(arbSignal, 1), (signals) => {
        const r = compositeScore(signals);
        const total = r.contributions.reduce((s, c) => s + c.weightShare, 0);
        if (r.contributions.some((c) => c.weightShare > 0)) {
          // Tolerance DERIVED from the rounding contract, not picked. Each
          // share is round4'd independently, so each carries up to half an ulp
          // (5e-5) of error and the sum carries up to n of them. Found in
          // review: toBeCloseTo(1, 3) fixes the budget at 5e-4 regardless of n,
          // which a 14-signal case (this generator's maximum) can exceed at
          // 7e-4 - a test that passes because the generator usually draws
          // fewer, not because the property holds.
          const tolerance = r.contributions.length * 0.00005;
          expect(Math.abs(total - 1)).toBeLessThanOrEqual(tolerance);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("sorts its drivers by absolute contribution, strongest first", () => {
    // The panel that says WHY reads this order. If it is not sorted, the
    // headline driver shown to a user is not the biggest one.
    fc.assert(
      fc.property(list(arbSignal, 2), (signals) => {
        const c = compositeScore(signals).contributions;
        for (let i = 1; i < c.length; i++) {
          expect(Math.abs(c[i - 1]!.contribution)).toBeGreaterThanOrEqual(
            Math.abs(c[i]!.contribution) - 1e-9,
          );
        }
      }),
      { numRuns: RUNS },
    );
  });
});

describe("the confidence valve — how a rumor is stopped from voting like a fact (fuzz)", () => {
  it("a zero-confidence signal is completely inert, whatever it claims", () => {
    // The strongest statement of the valve: an unverified report, however
    // extreme its value or heavy its nominal weight, moves the score by
    // exactly nothing until someone gives it confidence.
    fc.assert(
      fc.property(
        list(arbSignal, 1),
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (signals, wildValue, heavyWeight) => {
          const before = compositeScore(signals).score;
          const withRumor = compositeScore([
            ...signals,
            { key: "unverified-beat-report", value: wildValue, weight: heavyWeight, confidence: 0 },
          ]).score;
          expect(withRumor).toBeCloseTo(before, 10);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("influence rises monotonically with confidence, never falls", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (c1, c2) => {
          const [lo, hi] = c1 <= c2 ? [c1, c2] : [c2, c1];
          const anchor: WeightedSignal = { key: "anchor", value: 0, weight: 2, confidence: 1 };
          const at = (c: number) =>
            compositeScore([anchor, { key: "soft", value: 1, weight: 2, confidence: c }]).score;
          expect(at(hi)).toBeGreaterThanOrEqual(at(lo) - 1e-9);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("a low-confidence signal cannot outvote a high-confidence one of equal weight", () => {
    // The product statement: a beat report never overrules measured production
    // at the same nominal weight. Asserted as "the score stays on the
    // confident signal's side of the midpoint".
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.49, noNaN: true }),
        fc.double({ min: 0.51, max: 1, noNaN: true }),
        (soft, hard) => {
          const r = compositeScore([
            { key: "measured", value: -1, weight: 2, confidence: hard },
            { key: "rumor", value: +1, weight: 2, confidence: soft },
          ]);
          expect(r.score).toBeLessThan(0);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("treats a missing confidence as full confidence", () => {
    // TWO signals, not one (C-236). With a single signal the score is
    // sum(value*ew)/totalWeight, which collapses to exactly `value` for ANY
    // effectiveWeight > 0 - so the default confidence cancels and the assertion
    // holds whatever the default is. Verified by mutation: with the default
    // changed from 1 to 0.2, the one-signal form passed 200,000 randomised
    // cases without a single failure. It could only ever have caught a default
    // of 0, which is not what the test is named for.
    //
    // A zero-valued anchor of fixed weight keeps the denominator fixed, so the
    // subject's effective weight moves the blended score and any default below
    // 1 separates the two calls.
    fc.assert(
      fc.property(arbSignal, (s) => {
        const anchor = { key: "anchor", value: 0, weight: 1, confidence: 1, ageDays: 0 };
        const withOut = compositeScore([
          anchor,
          { key: s.key, value: s.value, weight: s.weight },
        ]).score;
        const withOne = compositeScore([anchor, { ...s, confidence: 1, ageDays: 0 }]).score;
        expect(withOut).toBeCloseTo(withOne, 10);
      }),
      { numRuns: RUNS },
    );
  });
});

describe("freshness decay — how old information stops counting (fuzz)", () => {
  it("influence falls monotonically with age", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 400, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        (a1, a2) => {
          const [young, old] = a1 <= a2 ? [a1, a2] : [a2, a1];
          const anchor: WeightedSignal = { key: "anchor", value: 0, weight: 2 };
          const at = (age: number) =>
            compositeScore([anchor, { key: "aged", value: 1, weight: 2, ageDays: age }]).score;
          expect(at(young)).toBeGreaterThanOrEqual(at(old) - 1e-9);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("halves a signal's effective weight after exactly one half-life", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 90, noNaN: true }),
        fc.double({ min: 0.1, max: 5, noNaN: true }),
        (halfLifeDays, weight) => {
          const fresh = compositeScore([{ key: "s", value: 1, weight, ageDays: 0 }], { halfLifeDays });
          const aged = compositeScore([{ key: "s", value: 1, weight, ageDays: halfLifeDays }], { halfLifeDays });
          expect(aged.contributions[0]!.effectiveWeight).toBeCloseTo(
            fresh.contributions[0]!.effectiveWeight / 2,
            3,
          );
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("applies no decay at all when the half-life is zero", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 500, noNaN: true }), (age) => {
        const r = compositeScore([{ key: "s", value: 1, weight: 2, ageDays: age }], { halfLifeDays: 0 });
        expect(r.contributions[0]!.effectiveWeight).toBeCloseTo(2, 6);
      }),
      { numRuns: RUNS },
    );
  });
});

describe("invariances a weighted mean must have (fuzz)", () => {
  it("adding a zero-weight signal changes nothing", () => {
    fc.assert(
      fc.property(list(arbSignal, 1), fc.double({ min: -50, max: 50, noNaN: true }), (signals, v) => {
        const before = compositeScore(signals).score;
        const after = compositeScore([...signals, { key: "inert", value: v, weight: 0 }]).score;
        expect(after).toBeCloseTo(before, 10);
      }),
      { numRuns: RUNS },
    );
  });

  it("scaling every weight by the same positive factor changes nothing", () => {
    fc.assert(
      fc.property(list(arbSignal, 1), fc.double({ min: 0.01, max: 50, noNaN: true }), (signals, k) => {
        const a = compositeScore(signals).score;
        const b = compositeScore(signals.map((s) => ({ ...s, weight: s.weight * k }))).score;
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        expect(b).toBeCloseTo(a, 6);
      }),
      { numRuns: RUNS },
    );
  });

  it("duplicating the whole signal set changes nothing", () => {
    fc.assert(
      fc.property(list(arbSignal, 1), (signals) => {
        const a = compositeScore(signals).score;
        const b = compositeScore([...signals, ...signals]).score;
        expect(b).toBeCloseTo(a, 8);
      }),
      { numRuns: RUNS },
    );
  });

  it("a single live signal scores exactly its own value", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -5, max: 5, noNaN: true }),
        fc.double({ min: 0.01, max: 5, noNaN: true }),
        (value, weight) => {
          // RELATIVE comparison. toBeCloseTo uses an absolute epsilon, so at
          // value = -5e-11 it demands agreement tighter than the value itself
          // and fails on arithmetic that is in fact exact.
          const score = compositeScore([{ key: "only", value, weight }]).score;
          expect(Math.abs(score - value)).toBeLessThanOrEqual(
            Math.abs(value) * 1e-9 + SCORE_HALF_ULP,
          );
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe("hostile input cannot corrupt the score (fuzz)", () => {
  it("a NaN or Infinity value is neutralised, not propagated", () => {
    fc.assert(
      fc.property(list(arbSignal, 1), fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY), (signals, bad) => {
        const r = compositeScore([...signals, { key: "bad", value: bad, weight: 3 }]);
        expect(Number.isFinite(r.score)).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("a negative weight is floored at zero rather than subtracting", () => {
    // A negative weight would let one bad row invert the whole ranking.
    fc.assert(
      fc.property(list(arbSignal, 1), fc.double({ min: -100, max: -0.01, noNaN: true }), (signals, neg) => {
        const before = compositeScore(signals).score;
        const after = compositeScore([...signals, { key: "neg", value: 99, weight: neg }]).score;
        expect(after).toBeCloseTo(before, 10);
      }),
      { numRuns: RUNS },
    );
  });

  it("clamps an out-of-range confidence into [0,1]", () => {
    fc.assert(
      fc.property(fc.double({ min: 1.01, max: 500, noNaN: true }), (over) => {
        const wild = compositeScore([{ key: "a", value: 1, weight: 2, confidence: over }]);
        const capped = compositeScore([{ key: "a", value: 1, weight: 2, confidence: 1 }]);
        expect(wild.contributions[0]!.effectiveWeight).toBeCloseTo(
          capped.contributions[0]!.effectiveWeight,
          6,
        );
      }),
      { numRuns: RUNS },
    );
  });
});

describe("the published score is a 4-decimal figure (fuzz)", () => {
  it("never returns more than four decimal places", () => {
    fc.assert(
      fc.property(list(arbHostileSignal, 1), (signals) => {
        const { score } = compositeScore(signals);
        expect(Math.abs(score * 10_000 - Math.round(score * 10_000))).toBeLessThan(1e-6);
      }),
      { numRuns: RUNS },
    );
  });

  it("rounds away a signal too small to register, rather than pretending it counted", () => {
    // Stated as a property because it bounds what "we folded the beat report
    // in" can honestly mean. A contribution under half an ulp of the 4dp
    // output does not move the published number at all.
    const anchor: WeightedSignal = { key: "anchor", value: 0, weight: 5, confidence: 1 };
    fc.assert(
      fc.property(fc.double({ min: 1e-9, max: 1e-6, noNaN: true }), (tinyWeight) => {
        const withTiny = compositeScore([
          anchor,
          { key: "faint-report", value: 1, weight: tinyWeight, confidence: 1e-3 },
        ]).score;
        expect(withTiny).toBe(compositeScore([anchor]).score);
      }),
      { numRuns: RUNS },
    );
  });
});
