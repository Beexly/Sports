/**
 * Property-based fuzz over the calibration core (WS2).
 *
 * pav.ts / ivap.ts are under a standing law: never rewritten without a proven
 * bug plus tests. Fuzz is the law-sanctioned way to GUARD them — these tests
 * read the modules' own stated invariants and hammer them with thousands of
 * random inputs, so any future "harmless refactor" that bends an invariant
 * fails loudly. No production logic is touched.
 *
 * The invariants under test are the mathematical guarantees behind every
 * displayed probability:
 *   PAV : output non-decreasing; weighted mean preserved; idempotent;
 *         bounded by input range; total on empty.
 *   IVAP: p0 <= p1; width >= 0; both in [0,1]; empty calibration -> 0.5/0.5;
 *         finite for ANY finite test score.
 *   CVAP: same interval sanity; deterministic under a fixed seed; total on
 *         degenerate label sets (all-0s / all-1s); folds clamped to n.
 *   AGG : Neumaier sum matches naive sum on well-conditioned inputs and stays
 *         finite on adversarial magnitude mixes; geometric aggregation keeps
 *         ordering.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { pavIsotonic } from "../calibration/pav.js";
import { ivapPredict, type IvapCalibrationPoint } from "../calibration/ivap.js";
import { cvapPredict } from "../calibration/cvap.js";
import { neumaierSum, logSpaceGeometricMeanAggregation } from "../calibration/aggregation.js";

const RUNS = 500;

/** Arbitrary: a finite double in a sane score range. */
const score = fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true });

/** Arbitrary: calibration set of (score, 0|1 label) pairs. */
const calibrationSet = (minLength: number, maxLength: number) =>
  fc.array(
    fc.record({
      score,
      label: fc.constantFrom(0, 1) as fc.Arbitrary<0 | 1>,
    }),
    { minLength, maxLength },
  ) as fc.Arbitrary<IvapCalibrationPoint[]>;

describe("PAV isotonic regression — invariants under fuzz", () => {
  it("output is non-decreasing for ANY input sequence", () => {
    fc.assert(
      fc.property(fc.array(score, { maxLength: 200 }), (ys) => {
        const fitted = pavIsotonic(ys);
        for (let i = 1; i < fitted.length; i++) {
          expect(fitted[i]!).toBeGreaterThanOrEqual(fitted[i - 1]! - 1e-9);
        }
        expect(fitted).toHaveLength(ys.length);
      }),
      { numRuns: RUNS },
    );
  });

  it("preserves the weighted mean (pooling never invents mass)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            y: fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true }),
            w: fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
        (rows) => {
          const ys = rows.map((r) => r.y);
          const ws = rows.map((r) => r.w);
          const fitted = pavIsotonic(ys, ws);
          const before = ys.reduce((s, y, i) => s + y * ws[i]!, 0);
          const after = fitted.reduce((s, y, i) => s + y * ws[i]!, 0);
          const scale = Math.max(1, Math.abs(before));
          expect(Math.abs(before - after) / scale).toBeLessThan(1e-6);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("is idempotent — an isotonic sequence is its own fit", () => {
    fc.assert(
      fc.property(fc.array(score, { maxLength: 120 }), (ys) => {
        const once = pavIsotonic(ys);
        const twice = pavIsotonic(once);
        for (let i = 0; i < once.length; i++) {
          expect(Math.abs(twice[i]! - once[i]!)).toBeLessThan(1e-9);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("fitted values stay within the input range (no extrapolation)", () => {
    fc.assert(
      fc.property(fc.array(score, { minLength: 1, maxLength: 120 }), (ys) => {
        const lo = Math.min(...ys);
        const hi = Math.max(...ys);
        for (const f of pavIsotonic(ys)) {
          expect(f).toBeGreaterThanOrEqual(lo - 1e-9);
          expect(f).toBeLessThanOrEqual(hi + 1e-9);
        }
      }),
      { numRuns: RUNS },
    );
  });
});

describe("IVAP — interval invariants under fuzz", () => {
  it("p0 <= p1, width >= 0, everything in [0,1] and finite, for ANY calibration + score", () => {
    fc.assert(
      fc.property(calibrationSet(0, 150), score, (cal, s) => {
        const p = ivapPredict(cal, s);
        expect(Number.isFinite(p.p0)).toBe(true);
        expect(Number.isFinite(p.p1)).toBe(true);
        expect(p.p0).toBeGreaterThanOrEqual(0);
        expect(p.p1).toBeLessThanOrEqual(1);
        expect(p.p0).toBeLessThanOrEqual(p.p1 + 1e-12);
        expect(p.width).toBeGreaterThanOrEqual(-1e-12);
        expect(Math.abs(p.width - (p.p1 - p.p0))).toBeLessThan(1e-9);
        expect(p.pMid).toBeGreaterThanOrEqual(p.p0 - 1e-12);
        expect(p.pMid).toBeLessThanOrEqual(p.p1 + 1e-12);
      }),
      { numRuns: RUNS },
    );
  });

  it("empty calibration answers 0.5/0.5 — ignorance is stated, not guessed", () => {
    fc.assert(
      fc.property(score, (s) => {
        const p = ivapPredict([], s);
        expect(p.p0).toBe(0.5);
        expect(p.p1).toBe(0.5);
      }),
      { numRuns: 50 },
    );
  });

  it("degenerate all-same-label calibration stays total and bounded", () => {
    fc.assert(
      fc.property(
        fc.array(score, { minLength: 1, maxLength: 60 }),
        fc.constantFrom(0, 1) as fc.Arbitrary<0 | 1>,
        score,
        (scores, label, s) => {
          const cal = scores.map((sc) => ({ score: sc, label }));
          const p = ivapPredict(cal, s);
          expect(Number.isFinite(p.p0)).toBe(true);
          expect(Number.isFinite(p.p1)).toBe(true);
          expect(p.p0).toBeLessThanOrEqual(p.p1 + 1e-12);
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe("CVAP — cross-fold invariants under fuzz", () => {
  it("interval sanity holds for ANY calibration, score, folds and mode", () => {
    fc.assert(
      fc.property(
        calibrationSet(0, 100),
        score,
        fc.integer({ min: 2, max: 10 }),
        fc.constantFrom("geometric", "arithmetic") as fc.Arbitrary<"geometric" | "arithmetic">,
        (cal, s, folds, aggregation) => {
          const p = cvapPredict(cal, s, { folds, aggregation });
          expect(Number.isFinite(p.p0)).toBe(true);
          expect(Number.isFinite(p.p1)).toBe(true);
          expect(p.p0).toBeGreaterThanOrEqual(0);
          expect(p.p1).toBeLessThanOrEqual(1);
          expect(p.p0).toBeLessThanOrEqual(p.p1 + 1e-12);
          expect(p.width).toBeGreaterThanOrEqual(-1e-12);
          expect(p.foldsUsed).toBeLessThanOrEqual(Math.max(cal.length, 0));
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("deterministic under a fixed seed — same inputs, same interval, always", () => {
    fc.assert(
      fc.property(calibrationSet(1, 80), score, fc.integer({ min: 1, max: 1e9 }), (cal, s, seed) => {
        const a = cvapPredict(cal, s, { seed });
        const b = cvapPredict(cal, s, { seed });
        expect(a.p0).toBe(b.p0);
        expect(a.p1).toBe(b.p1);
        expect(a.foldsUsed).toBe(b.foldsUsed);
      }),
      { numRuns: RUNS },
    );
  });
});

describe("CVAP degenerate-calibration regression (found by this fuzz suite)", () => {
  // Counterexample the fuzzer produced on its second random input:
  // cvapPredict([{score:0,label:0}], 0, {folds:2}) reported foldsUsed: 2 for a
  // ONE-point calibration — the old clamp re-raised K above n, and the fold
  // holding the lone point trained on the FULL set via a silent fallback
  // (leave-one-out became leave-nothing-out). Now: a single inductive fit,
  // reported as exactly that.
  it("a 1-point calibration degrades to ONE inductive fit, never two fake folds", () => {
    const p = cvapPredict([{ score: 0, label: 0 }], 0, { folds: 2 });
    expect(p.foldsUsed).toBe(1);
    expect(p.foldPredictions).toHaveLength(1);
    expect(p.p0).toBeLessThanOrEqual(p.p1);
  });

  it("foldsUsed never exceeds the calibration size (the option's own contract)", () => {
    fc.assert(
      fc.property(calibrationSet(1, 30), fc.integer({ min: 2, max: 12 }), (cal, folds) => {
        const p = cvapPredict(cal, 0.5, { folds });
        expect(p.foldsUsed).toBeLessThanOrEqual(Math.max(1, cal.length));
        expect(p.foldPredictions).toHaveLength(p.foldsUsed);
      }),
      { numRuns: RUNS },
    );
  });
});

describe("aggregation — numeric safety under fuzz", () => {
  it("Neumaier sum equals naive sum on well-conditioned input and never goes non-finite on finite input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -1e12, max: 1e12, noNaN: true, noDefaultInfinity: true }), {
          maxLength: 300,
        }),
        (xs) => {
          const s = neumaierSum(xs);
          expect(Number.isFinite(s)).toBe(true);
          const naive = xs.reduce((a, b) => a + b, 0);
          const scale = Math.max(1, Math.abs(naive));
          expect(Math.abs(s - naive) / scale).toBeLessThan(1e-6);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("compensation beats naive summation on the classic catastrophic case", () => {
    // Not fuzz — the known adversarial input that motivates Neumaier at all.
    const xs = [1e16, 1, -1e16];
    expect(neumaierSum(xs)).toBe(1);
  });

  it("geometric aggregation preserves interval ordering for ANY multiprob set", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .tuple(
              fc.double({ min: 0, max: 1, noNaN: true }),
              fc.double({ min: 0, max: 1, noNaN: true }),
            )
            .map(([a, b]) => ({ p0: Math.min(a, b), p1: Math.max(a, b) })),
          { minLength: 1, maxLength: 40 },
        ),
        (mps) => {
          const agg = logSpaceGeometricMeanAggregation(mps);
          expect(Number.isFinite(agg.p0)).toBe(true);
          expect(Number.isFinite(agg.p1)).toBe(true);
          expect(agg.p0).toBeGreaterThanOrEqual(0);
          expect(agg.p1).toBeLessThanOrEqual(1);
          expect(agg.p0).toBeLessThanOrEqual(agg.p1 + 1e-12);
        },
      ),
      { numRuns: RUNS },
    );
  });
});
