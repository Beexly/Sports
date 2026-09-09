/**
 * C-192. Property-based fuzz over the board's sort contract.
 *
 * `comparePicksByRanking` decides the order EVERY customer sees: the public
 * board, the dashboard slate, the free-tier teaser slice. A comparator that
 * violates the total-order contract does not throw - `Array.prototype.sort`
 * simply produces an implementation-defined order, which for a product whose
 * whole premise is "deterministic, reproducible, math you can read" is a
 * correctness bug that no example-based test would surface. Two picks could
 * swap places between two renders of identical data.
 *
 * The contract a comparator must satisfy, and what each property here pins:
 *   sign-consistency : cmp(a,b) and cmp(b,a) have opposite signs
 *   reflexivity      : cmp(a,a) === 0
 *   transitivity     : a<=b and b<=c implies a<=c  (the one that silently rots)
 *   totality         : the result is always a finite number, never NaN
 *   determinism      : sorting a permuted array yields the same ranking keys
 *
 * The generators deliberately include the hostile inputs a database can hand
 * this function: NaN/Infinity confidence, factorBreakdown that is null, a
 * string, an array, or an object whose rankingP is a string; generatedAt as an
 * unparseable string, an epoch-0 date, or null.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
// Relative, not the "@/" alias: this file is also run by the root-level
// `npm run test:fuzz` script, where apps/web's path alias is not configured.
// With the alias the file did not fail - it did not RUN, and the summary still
// read "22 passed". A suite that vanishes silently is worse than a red one.
import { comparePicksByRanking, rankingSortKey } from "../lib/ranking/sort-key";

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

type Pick = Parameters<typeof comparePicksByRanking>[0];

/** factorBreakdown as the DB can actually produce it, valid and malformed. */
const arbFactorBreakdown = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant("not-an-object"),
  fc.constant([1, 2, 3]),
  fc.record({ rankingP: fc.double({ min: -5, max: 5, noNaN: false }) }),
  fc.record({ rankingP: fc.constant(Number.NaN) }),
  fc.record({ rankingP: fc.constant("0.7") }),
  fc.record({ rankingScore: fc.double({ min: -500, max: 500, noNaN: false }) }),
  fc.record({ rankingScore: fc.constant(Number.POSITIVE_INFINITY) }),
  fc.record({ unrelated: fc.string() }),
  fc.object(),
);

const arbGeneratedAt = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant("not-a-date"),
  fc.constant(""),
  fc.constant(new Date(0)),
  fc.date({ min: new Date(0), max: new Date(4_102_444_800_000) }),
  fc.integer({ min: -1e12, max: 1e12 }).map((ms) => new Date(ms).toISOString()),
);

const arbPick: fc.Arbitrary<Pick> = fc.record({
  confidence: fc.oneof(
    fc.double({ min: -100, max: 200, noNaN: false }),
    fc.constant(Number.NaN),
    fc.constant(Number.POSITIVE_INFINITY),
    fc.constant(Number.NEGATIVE_INFINITY),
  ),
  factorBreakdown: arbFactorBreakdown,
  isFeatured: fc.oneof(fc.boolean(), fc.constant(undefined)),
  generatedAt: arbGeneratedAt,
}) as fc.Arbitrary<Pick>;

const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);
/** `-sign(0)` is -0, and Object.is(0, -0) is false, so normalize before toBe. */
const negSign = (n: number): number => (n > 0 ? -1 : n < 0 ? 1 : 0);

describe("comparePicksByRanking is a total order (fuzz)", () => {
  it("never returns NaN, for any input the database can hold", () => {
    fc.assert(
      fc.property(arbPick, arbPick, (a, b) => {
        const r = comparePicksByRanking(a, b);
        expect(Number.isFinite(r)).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("is reflexive: an item compares equal to itself", () => {
    fc.assert(
      fc.property(arbPick, (a) => {
        expect(comparePicksByRanking(a, a)).toBe(0);
      }),
      { numRuns: RUNS },
    );
  });

  it("is antisymmetric: cmp(a,b) and cmp(b,a) have opposite signs", () => {
    fc.assert(
      fc.property(arbPick, arbPick, (a, b) => {
        expect(sign(comparePicksByRanking(a, b))).toBe(negSign(comparePicksByRanking(b, a)));
      }),
      { numRuns: RUNS },
    );
  });

  it("is transitive: a<=b and b<=c implies a<=c", () => {
    fc.assert(
      fc.property(arbPick, arbPick, arbPick, (a, b, c) => {
        const ab = sign(comparePicksByRanking(a, b));
        const bc = sign(comparePicksByRanking(b, c));
        const ac = sign(comparePicksByRanking(a, c));
        if (ab <= 0 && bc <= 0) expect(ac).toBeLessThanOrEqual(0);
        if (ab >= 0 && bc >= 0) expect(ac).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: RUNS },
    );
  });

  it("sorts to the same ranking-key sequence regardless of input order", () => {
    // The determinism claim the product makes, tested directly: shuffle the
    // same slate and the SORTED ranking keys must match. If the comparator
    // were partial, engine-defined sort order would make these diverge.
    fc.assert(
      fc.property(fc.array(arbPick, { minLength: 2, maxLength: 24 }), (picks) => {
        const keyOf = (p: Pick): string =>
          `${p.isFeatured ? 1 : 0}|${rankingSortKey(p).toFixed(12)}`;
        const forward = [...picks].sort(comparePicksByRanking).map(keyOf);
        const backward = [...picks].reverse().sort(comparePicksByRanking).map(keyOf);
        expect(backward).toEqual(forward);
      }),
      { numRuns: 5_000 * SCALE },
    );
  });
});

describe("rankingSortKey stays inside its stated range (fuzz)", () => {
  it("always returns a finite number", () => {
    fc.assert(
      fc.property(
        fc.record({
          confidence: fc.oneof(fc.double({ noNaN: false }), fc.constant(Number.NaN)),
          factorBreakdown: arbFactorBreakdown,
        }),
        (p) => {
          expect(Number.isFinite(rankingSortKey(p))).toBe(true);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("clamps to [0,1] whenever it reads a rankingP or rankingScore", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.constantFrom("rankingP", "rankingScore"),
        (v, field) => {
          const key = rankingSortKey({ confidence: 50, factorBreakdown: { [field]: v } });
          expect(key).toBeGreaterThanOrEqual(0);
          expect(key).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: RUNS },
    );
  });
});
