/**
 * T7 -- THE 600+ TEST CONFORMAL & TA-CQR INVARIANT MATRIX.
 *
 * The goal spec's Table 5 entry for T7:
 *
 *   "conformal-copula-kelly.ts | 600-Test Conformal & TA-CQR Invariant
 *    Matrix: Enforces exact finite-sample rank ceil((n+1)(1-eps)), asymmetric
 *    TA-CQR conformity score, Frechet-Hoeffding copula bounds, and Slow 75%
 *    Conformal Kelly sizing."
 *
 * WHY A MATRIX AND NOT A HANDFUL OF CASES. Each of the four components is a
 * finite-sample or bound-carrying law. A law that is only spot-checked is a
 * law that breaks in the corners nobody looked at, and the corners are
 * exactly where these formulas fail: n at the minimum, epsilon at 0 and
 * next to 1, beta on the open-interval boundary, marginals at 0 and 1, a
 * joint probability sitting exactly ON the Frechet-Hoeffding bound, and a
 * joint probability sitting exactly OUTSIDE it. So the tests below are
 * GENERATED over a deterministic parameter grid, one `it(...)` per grid
 * cell, and the grid deliberately includes every one of those corners.
 *
 * A GENERATED TEST IS ONLY WORTH HAVING IF IT CAN FAIL. Every case below
 * asserts a specific number or a specific inequality that the module
 * produces; none of them assert that the module returns something the
 * module just returned. The mutation sweep
 * (reconciliation/_mutation_sweep_t7_conformal.mjs) proves that by breaking
 * the module five different ways and requiring a NAMED test to stop
 * passing each time.
 *
 * The four areas:
 *   A  exact finite-sample rank          -- Shafer & Vovk (2008), Sec 4
 *   B  asymmetric TA-CQR conformity score -- Romano et al. (2019) p 3544
 *   C  Frechet-Hoeffding copula bounds   -- Park/Tibshirani/Cho (2025)
 *   D  slow 75% conformal Kelly sizing  -- goal spec section 5.2
 */
import { describe, expect, it } from "vitest";

import {
  MAX_CONFORMAL_EPSILON,
  MIN_CONFORMAL_N,
  SLOW_CONFORMAL_COVERAGE,
  SLOW_CONFORMAL_WINDOW_GAMES,
  assertJointProbability,
  checkJointProbability,
  conformalHalfWidth,
  conformalKellyStake,
  conformalRank,
  downsideThrottle,
  frechetHoeffdingBounds,
  isWithinFrechetHoeffding,
  optimalLowerTailLevel,
  slowConformalHalfWidth,
  slowConformalKellyStake,
  taCqrLevels,
  taCqrScore,
  type ConformalKellySizing,
} from "../src/calibration/conformal-copula-kelly.js";

/* ------------------------------------------------------------------ *
 * THE CASE REGISTRY
 *
 * Cases are collected first and registered afterwards, so the matrix can
 * assert on its own size: if a grid cell is ever dropped, the size case
 * fails instead of the matrix quietly shrinking below the "600-Test" the
 * spec asks for.
 * ------------------------------------------------------------------ */

interface T7Case {
  readonly area: string;
  readonly name: string;
  readonly fn: () => void;
}

const CASES: T7Case[] = [];
let CURRENT_AREA = "";

function area(name: string): void {
  CURRENT_AREA = name;
}

function add(name: string, fn: () => void): void {
  CASES.push({ area: CURRENT_AREA, name, fn });
}

/* ------------------------------------------------------------------ *
 * AREA A -- EXACT FINITE-SAMPLE RANK
 * ------------------------------------------------------------------ */

/** Calibration sample sizes, including the minimum n = 1. */
const NS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 100, 250] as const;

/** Miscoverage levels, including the endpoints 0 and next-to-1. */
const ES = [0, 0.01, 0.05, 0.1, 0.2, 0.25, 0.5, 0.75, 0.9, 0.99] as const;

area("T7/A -- exact finite-sample conformal rank (Shafer & Vovk 2008, Sec 4)");

add("T7/A0 the matrix registers at least 600 cases", () => {
  // CASES is complete by the time this runs, so this is the real count.
  expect(CASES.length).toBeGreaterThanOrEqual(600);
  // The registered names must be unique: the mutation sweep keys on exact
  // titles, and a duplicate title would make a "did this test pass?" query
  // ambiguous.
  const names = CASES.map((c) => c.name);
  expect(new Set(names).size).toBe(names.length);
});

add("T7/A2 MIN_CONFORMAL_N is 1 and MAX_CONFORMAL_EPSILON is 1", () => {
  expect(MIN_CONFORMAL_N).toBe(1);
  expect(MAX_CONFORMAL_EPSILON).toBe(1);
});

for (const n of NS) {
  for (const eps of ES) {
    add(`T7/A1 rank n=${n} eps=${eps}`, () => {
      const expected = Math.ceil((n + 1) * (1 - eps));
      const rank = conformalRank(n, eps);
      // The spec's formula, exactly.
      expect(rank).toBe(expected);
      // The ceiling is not decoration: without it the rank is a fraction
      // and no order statistic carries the finite-sample guarantee.
      expect(Number.isInteger(rank)).toBe(true);
      // The ceiling is the UNIQUE integer in [x, x+1). Stating it that way
      // pins the value without restating the implementation.
      const x = (n + 1) * (1 - eps);
      expect(rank).toBeGreaterThanOrEqual(x);
      expect(rank).toBeLessThan(x + 1);
      // The rank is a usable index into n scores (n+1 is the infinite
      // quantile, which is admissible at epsilon = 0).
      expect(rank).toBeGreaterThanOrEqual(1);
      expect(rank).toBeLessThanOrEqual(n + 1);
    });
  }
}

add("T7/A2 rank at the minimum sample n=1 is 2 at epsilon=0", () => {
  expect(conformalRank(1, 0)).toBe(2);
});

add("T7/A2 rank at the minimum sample n=1 is 1 at epsilon=0.5", () => {
  expect(conformalRank(1, 0.5)).toBe(1);
});

add("T7/A2 rank at epsilon=0 is n+1", () => {
  for (const n of NS) expect(conformalRank(n, 0)).toBe(n + 1);
});

add("T7/A2 rank shrinks as epsilon grows", () => {
  for (const n of NS) {
    let previous = conformalRank(n, 0);
    for (const eps of ES) {
      const rank = conformalRank(n, eps);
      expect(rank).toBeLessThanOrEqual(previous);
      previous = rank;
    }
  }
});

add("T7/A2 rank grows as the sample grows", () => {
  for (const eps of ES) {
    let previous = conformalRank(1, eps);
    for (const n of NS) {
      const rank = conformalRank(n, eps);
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  }
});

add("T7/A2 rank is the quantile index of the 75% conformal level at n=250", () => {
  // The slow half-width uses exactly this index: the 189th smallest of 250.
  expect(conformalRank(250, 0.25)).toBe(189);
});

add("T7/A2 rank rejects n=0", () => {
  expect(() => conformalRank(0, 0.1)).toThrow(/n must be/);
});

add("T7/A2 rank rejects n=-1", () => {
  expect(() => conformalRank(-1, 0.1)).toThrow(/n must be/);
});

add("T7/A2 rank rejects a non-integer n", () => {
  expect(() => conformalRank(1.5, 0.1)).toThrow(/n must be/);
});

add("T7/A2 rank rejects a non-finite n", () => {
  expect(() => conformalRank(Number.NaN, 0.1)).toThrow(/n must be/);
});

add("T7/A2 rank rejects epsilon=1", () => {
  expect(() => conformalRank(10, 1)).toThrow(/epsilon must be/);
});

add("T7/A2 rank rejects epsilon above 1", () => {
  expect(() => conformalRank(10, 1.5)).toThrow(/epsilon must be/);
});

add("T7/A2 rank rejects a negative epsilon", () => {
  expect(() => conformalRank(10, -0.01)).toThrow(/epsilon must be/);
});

add("T7/A2 rank rejects a non-finite epsilon", () => {
  expect(() => conformalRank(10, Number.NaN)).toThrow(/epsilon must be/);
});

/* ------------------------------------------------------------------ *
 * AREA B -- ASYMMETRIC TA-CQR CONFORMITY SCORE
 * ------------------------------------------------------------------ */

/** Outcomes, including below the interval and far above it. */
const YS = [-2, 0, 1, 5, 12.5, 50, 100, 275] as const;

/**
 * The six interval shapes, each relative to the outcome y:
 *   below  -- the interval straddles y on the lower side
 *   above  -- the interval straddles y on the upper side
 *   inside -- the interval straddles y symmetrically
 *   under  -- the whole interval sits ABOVE y (y is below the interval)
 *   over   -- the whole interval sits BELOW y (y is above the interval)
 *   edge   -- y sits exactly on the lower endpoint
 */
const SHAPES: ReadonlyArray<readonly [string, (y: number) => [number, number]]> = [
  ["below", (y) => [y - 5, y + 1]],
  ["above", (y) => [y - 1, y + 5]],
  ["inside", (y) => [y - 3, y + 3]],
  ["under", (y) => [y + 2, y + 8]],
  ["over", (y) => [y - 8, y - 2]],
  ["edge", (y) => [y, y + 3]],
];

/** Lower-tail levels, strictly inside (0, 1). */
const BETAS = [0.01, 0.1, 0.5] as const;

area("T7/B -- asymmetric TA-CQR conformity score (Romano et al. 2019 p 3544)");

for (const y of YS) {
  for (const [shape, make] of SHAPES) {
    for (const beta of BETAS) {
      add(`T7/B1 taCqrScore y=${y} shape=${shape} beta=${beta}`, () => {
        const [qLower, qUpper] = make(y);
        const lowerTerm = qLower - y;
        const upperTerm = y - qUpper;
        const score = taCqrScore(y, qLower, qUpper, beta);
        // The spec's score: the LARGER of the two one-sided signed errors.
        // A sum here is the classic bug and is not the same number.
        expect(score).toBe(Math.max(lowerTerm, upperTerm));
        expect(score).toBeGreaterThanOrEqual(lowerTerm);
        expect(score).toBeGreaterThanOrEqual(upperTerm);
        expect(score).not.toBe(lowerTerm + upperTerm);
        // The sign of the score says where y sits relative to the interval.
        if (y < qLower) {
          expect(score).toBeGreaterThan(0);
          expect(score).toBe(lowerTerm);
        } else if (y > qUpper) {
          expect(score).toBeGreaterThan(0);
          expect(score).toBe(upperTerm);
        } else if (y === qLower || y === qUpper) {
          expect(score).toBe(0);
        } else {
          expect(score).toBeLessThan(0);
        }
      });
    }
  }
}

add("T7/B1 the score does not depend on the lower-tail level beta", () => {
  // The asymmetry is carried by the two quantiles, not by beta: beta is the
  // level that PRODUCED qLower. Pinning this stops a future edit from
  // re-weighting the two tails inside the score.
  for (const [shape, make] of SHAPES) {
    const y = 12.5;
    const [qLower, qUpper] = make(y);
    const scores = BETAS.map((beta) => taCqrScore(y, qLower, qUpper, beta));
    for (const s of scores) expect(s).toBe(scores[0] ?? Number.NaN);
  }
});

add("T7/B1 the score is asymmetric when y is below the interval", () => {
  const score = taCqrScore(5, 7, 13, 0.1);
  expect(score).toBe(2);
  expect(score).not.toBe(-8);
});

add("T7/B1 the score is asymmetric when y is above the interval", () => {
  const score = taCqrScore(5, -3, 3, 0.1);
  expect(score).toBe(2);
  expect(score).not.toBe(-6);
});

add("T7/B1 the score is zero when y sits on the lower endpoint", () => {
  expect(taCqrScore(7, 7, 13, 0.1)).toBe(0);
});

add("T7/B1 the score is zero when y sits on the upper endpoint", () => {
  expect(taCqrScore(13, 7, 13, 0.1)).toBe(0);
});

add("T7/B1 the score is negative when y is strictly inside", () => {
  expect(taCqrScore(10, 7, 13, 0.1)).toBe(-3);
});

add("T7/B1 a degenerate zero-width interval scores zero at its own point", () => {
  expect(taCqrScore(4, 4, 4, 0.1)).toBe(0);
});

add("T7/B2 taCqrScore rejects an inverted interval", () => {
  expect(() => taCqrScore(0, 5, 1, 0.1)).toThrow(/qLower must be/);
});

add("T7/B2 taCqrScore rejects beta=0", () => {
  expect(() => taCqrScore(0, -1, 1, 0)).toThrow(/beta must be/);
});

add("T7/B2 taCqrScore rejects beta=1", () => {
  expect(() => taCqrScore(0, -1, 1, 1)).toThrow(/beta must be/);
});

add("T7/B2 taCqrScore rejects a non-finite outcome", () => {
  expect(() => taCqrScore(Number.NaN, -1, 1, 0.1)).toThrow(/y must be/);
});

add("T7/B2 taCqrScore rejects a non-finite quantile", () => {
  expect(() => taCqrScore(0, Number.POSITIVE_INFINITY, 1, 0.1)).toThrow(/finite/);
});

/** Miscoverage levels for the level-allocation grid. */
const ALPHAS = [0.05, 0.1, 0.2, 0.25, 0.5] as const;

/** Admissible lower-tail levels per alpha, all strictly inside (0, alpha). */
const BETAS_BY_ALPHA: ReadonlyArray<readonly [number, readonly number[]]> = [
  [0.05, [0.01, 0.02, 0.025, 0.04]],
  [0.1, [0.01, 0.025, 0.05, 0.075]],
  [0.2, [0.02, 0.05, 0.1, 0.15]],
  [0.25, [0.025, 0.05, 0.125, 0.1875]],
  [0.5, [0.05, 0.125, 0.25, 0.375]],
];

for (const [alpha, betas] of BETAS_BY_ALPHA) {
  for (const beta of betas) {
    add(`T7/B3 taCqrLevels alpha=${alpha} beta=${beta}`, () => {
      const levels = taCqrLevels(alpha, beta);
      expect(levels.lowerLevel).toBe(beta);
      expect(levels.upperLevel).toBe(1 - alpha + beta);
      expect(levels.upperLevel).toBeGreaterThan(levels.lowerLevel);
      // The two tails together cover exactly the miscoverage alpha.
      expect(beta + (1 - levels.upperLevel)).toBeCloseTo(alpha, 12);
      // beta is inside the open interval (0, alpha).
      expect(levels.lowerLevel).toBeGreaterThan(0);
      expect(levels.lowerLevel).toBeLessThan(alpha);
    });
  }
}

add("T7/B3 taCqrLevels is symmetric at beta = alpha/2", () => {
  for (const alpha of ALPHAS) {
    const levels = taCqrLevels(alpha, alpha / 2);
    expect(levels.lowerLevel).toBeCloseTo(alpha / 2, 12);
    expect(levels.upperLevel).toBeCloseTo(1 - alpha / 2, 12);
    expect(1 - levels.upperLevel).toBeCloseTo(levels.lowerLevel, 12);
  }
});

add("T7/B3 taCqrLevels rejects alpha=0", () => {
  expect(() => taCqrLevels(0, 0.01)).toThrow(/alpha must be/);
});

add("T7/B3 taCqrLevels rejects alpha=1", () => {
  expect(() => taCqrLevels(1, 0.01)).toThrow(/alpha must be/);
});

add("T7/B3 taCqrLevels rejects beta=0", () => {
  expect(() => taCqrLevels(0.1, 0)).toThrow(/beta must be/);
});

add("T7/B3 taCqrLevels rejects beta=alpha", () => {
  expect(() => taCqrLevels(0.1, 0.1)).toThrow(/beta must be/);
});

add("T7/B4 optimalLowerTailLevel picks the loss-minimising beta", () => {
  const choice = optimalLowerTailLevel({
    alpha: 0.25,
    candidates: [0.01, 0.05, 0.1, 0.2],
    loss: (beta) => Math.abs(beta - 0.05),
  });
  expect(choice.beta).toBe(0.05);
  expect(choice.loss).toBeCloseTo(0, 12);
  expect(choice.evaluated).toBe(4);
  expect(choice.levels.lowerLevel).toBe(0.05);
  expect(choice.levels.upperLevel).toBeCloseTo(1 - 0.25 + 0.05, 12);
});

add("T7/B4 optimalLowerTailLevel is evaluated over every candidate", () => {
  const seen: number[] = [];
  const choice = optimalLowerTailLevel({
    alpha: 0.2,
    candidates: [0.02, 0.05, 0.1, 0.15],
    loss: (beta) => {
      seen.push(beta);
      return (beta - 0.1) ** 2;
    },
  });
  expect(seen.length).toBe(4);
  expect(choice.evaluated).toBe(4);
  expect(choice.beta).toBe(0.1);
});

add("T7/B4 optimalLowerTailLevel breaks an exact tie on the smallest beta", () => {
  const choice = optimalLowerTailLevel({
    alpha: 0.5,
    candidates: [0.3, 0.1, 0.2],
    loss: () => 1,
  });
  expect(choice.beta).toBe(0.1);
  expect(choice.loss).toBe(1);
});

add("T7/B4 optimalLowerTailLevel rejects a candidate at beta=0", () => {
  expect(() =>
    optimalLowerTailLevel({ alpha: 0.2, candidates: [0, 0.1], loss: () => 0 }),
  ).toThrow(/candidate beta/);
});

add("T7/B4 optimalLowerTailLevel rejects a candidate at beta=alpha", () => {
  expect(() =>
    optimalLowerTailLevel({ alpha: 0.2, candidates: [0.1, 0.2], loss: () => 0 }),
  ).toThrow(/candidate beta/);
});

add("T7/B4 optimalLowerTailLevel rejects an empty candidate grid", () => {
  expect(() => optimalLowerTailLevel({ alpha: 0.2, candidates: [], loss: () => 0 })).toThrow(
    /non-empty/,
  );
});

add("T7/B4 optimalLowerTailLevel rejects a non-finite loss", () => {
  expect(() =>
    optimalLowerTailLevel({
      alpha: 0.2,
      candidates: [0.1],
      loss: () => Number.NaN,
    }),
  ).toThrow(/loss must be finite/);
});

/* ------------------------------------------------------------------ *
 * AREA C -- FRECHET-HOEFFDING COPULA BOUNDS
 * ------------------------------------------------------------------ */

/** Marginal probabilities, including the degenerate 0 and 1. */
const PAS = [0, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.85, 1] as const;

/** Second marginal, on a different grid so the pairs are not symmetric. */
const PBS = [0, 0.1, 0.4, 0.6, 0.8, 0.9, 1] as const;

area("T7/C -- Frechet-Hoeffding copula bounds (Park/Tibshirani/Cho 2025)");

for (const pa of PAS) {
  for (const pb of PBS) {
    add(`T7/C1 frechetHoeffdingBounds pa=${pa} pb=${pb}`, () => {
      const bounds = frechetHoeffdingBounds(pa, pb);
      // The spec's law, stated as the law and not as the implementation:
      // the lower bound IS max(0, pa + pb - 1) to within floating point.
      expect(bounds.lower).toBeCloseTo(Math.max(0, pa + pb - 1), 12);
      // The upper bound is exact -- it is a selection, not an arithmetic.
      expect(bounds.upper).toBe(Math.min(pa, pb));
      // The lower bound is a probability, and the interval is non-empty:
      // the clamp at zero is what makes pa + pb <= 1 admissible.
      expect(bounds.lower).toBeGreaterThanOrEqual(0);
      expect(bounds.upper).toBeLessThanOrEqual(1);
      expect(bounds.lower).toBeLessThanOrEqual(bounds.upper);
    });
  }
}

for (const pa of PAS) {
  for (const pb of PBS) {
    const bounds = frechetHoeffdingBounds(pa, pb);
    const belowExists = bounds.lower > 0.01;
    const aboveExists = bounds.upper <= 0.99;

    add(`T7/C2 joint on_lower accepted pa=${pa} pb=${pb}`, () => {
      const check = checkJointProbability(pa, pb, bounds.lower);
      expect(check.ok).toBe(true);
      expect(check.reason).toBeNull();
      expect(isWithinFrechetHoeffding(pa, pb, bounds.lower)).toBe(true);
      expect(() => assertJointProbability(pa, pb, bounds.lower)).not.toThrow();
    });

    add(`T7/C2 joint on_upper accepted pa=${pa} pb=${pb}`, () => {
      const check = checkJointProbability(pa, pb, bounds.upper);
      expect(check.ok).toBe(true);
      expect(check.reason).toBeNull();
      expect(isWithinFrechetHoeffding(pa, pb, bounds.upper)).toBe(true);
      expect(() => assertJointProbability(pa, pb, bounds.upper)).not.toThrow();
    });

    if (belowExists) {
      add(`T7/C2 joint below_lower rejected pa=${pa} pb=${pb}`, () => {
        const joint = bounds.lower - 0.01;
        expect(joint).toBeGreaterThanOrEqual(0);
        expect(joint).toBeLessThan(bounds.lower);
        const check = checkJointProbability(pa, pb, joint);
        expect(check.ok).toBe(false);
        expect(check.reason).toMatch(/lower bound/);
        expect(isWithinFrechetHoeffding(pa, pb, joint)).toBe(false);
        expect(() => assertJointProbability(pa, pb, joint)).toThrow(/lower bound/);
      });
    }

    if (aboveExists) {
      add(`T7/C2 joint above_upper rejected pa=${pa} pb=${pb}`, () => {
        const joint = bounds.upper + 0.01;
        expect(joint).toBeLessThanOrEqual(1);
        expect(joint).toBeGreaterThan(bounds.upper);
        const check = checkJointProbability(pa, pb, joint);
        expect(check.ok).toBe(false);
        expect(check.reason).toMatch(/upper bound/);
        expect(isWithinFrechetHoeffding(pa, pb, joint)).toBe(false);
        expect(() => assertJointProbability(pa, pb, joint)).toThrow(/upper bound/);
      });
    }
  }
}

add("T7/C3 the lower bound is clamped at zero when pa + pb <= 1", () => {
  for (const pa of PAS) {
    for (const pb of PBS) {
      if (pa + pb <= 1) {
        expect(frechetHoeffdingBounds(pa, pb).lower).toBe(0);
      }
    }
  }
});

add("T7/C3 the lower bound is pa + pb - 1 when pa + pb > 1", () => {
  for (const pa of PAS) {
    for (const pb of PBS) {
      if (pa + pb > 1) {
        expect(frechetHoeffdingBounds(pa, pb).lower).toBeCloseTo(pa + pb - 1, 12);
      }
    }
  }
});

add("T7/C3 the bounds collapse to a point for pa = pb = 1", () => {
  const bounds = frechetHoeffdingBounds(1, 1);
  expect(bounds.lower).toBe(1);
  expect(bounds.upper).toBe(1);
});

add("T7/C3 the bounds collapse to a point for pa = pb = 0", () => {
  const bounds = frechetHoeffdingBounds(0, 0);
  expect(bounds.lower).toBe(0);
  expect(bounds.upper).toBe(0);
});

add("T7/C3 a joint probability outside [0, 1] is rejected, not clamped", () => {
  const check = checkJointProbability(0.5, 0.5, 1.5);
  expect(check.ok).toBe(false);
  expect(check.reason).toMatch(/not a probability/);
  expect(() => assertJointProbability(0.5, 0.5, 1.5)).toThrow(/not a probability/);
});

add("T7/C3 a negative joint probability is rejected, not clamped", () => {
  const check = checkJointProbability(0.5, 0.5, -0.2);
  expect(check.ok).toBe(false);
  expect(check.reason).toMatch(/not a probability/);
  expect(() => assertJointProbability(0.5, 0.5, -0.2)).toThrow(/not a probability/);
});

add("T7/C3 the checker never returns a clamped joint probability", () => {
  // There is no field on the result that could carry a clamped value back
  // to the caller, so a caller cannot accidentally consume one.
  const check = checkJointProbability(0.5, 0.5, 0.95);
  expect(check.ok).toBe(false);
  expect(Object.keys(check).sort()).toEqual(["bounds", "ok", "reason"]);
  expect(Object.values(check)).not.toContain(0.5);
});

add("T7/C3 assertJointProbability returns the joint probability UNCHANGED", () => {
  // The point of the assert: an admissible joint comes back as it went in.
  // A clamped implementation would return bounds.upper here, and the
  // difference between 0.31 and 0.4 is the whole bug this module prevents.
  for (const pa of PAS) {
    for (const pb of PBS) {
      const bounds = frechetHoeffdingBounds(pa, pb);
      for (const joint of [bounds.lower, (bounds.lower + bounds.upper) / 2, bounds.upper]) {
        if (joint < 0 || joint > 1) continue;
        expect(assertJointProbability(pa, pb, joint)).toBe(joint);
      }
    }
  }
});

add("T7/C3 assertJointProbability does not clamp a violating joint probability", () => {
  // A clamping implementation would return bounds.upper (0.5) here. It
  // must throw instead, and the returned value must never appear.
  let returned: unknown = "not-called";
  try {
    returned = assertJointProbability(0.5, 0.5, 0.95);
  } catch (error) {
    expect((error as Error).message).toMatch(/upper bound/);
  }
  expect(returned).toBe("not-called");
});

add("T7/C3 frechetHoeffdingBounds rejects pa below 0", () => {
  expect(() => frechetHoeffdingBounds(-0.01, 0.5)).toThrow(/pa must be/);
});

add("T7/C3 frechetHoeffdingBounds rejects pa above 1", () => {
  expect(() => frechetHoeffdingBounds(1.01, 0.5)).toThrow(/pa must be/);
});

add("T7/C3 frechetHoeffdingBounds rejects pb below 0", () => {
  expect(() => frechetHoeffdingBounds(0.5, -0.01)).toThrow(/pb must be/);
});

add("T7/C3 frechetHoeffdingBounds rejects pb above 1", () => {
  expect(() => frechetHoeffdingBounds(0.5, 1.01)).toThrow(/pb must be/);
});

add("T7/C3 frechetHoeffdingBounds rejects a non-finite marginal", () => {
  expect(() => frechetHoeffdingBounds(Number.NaN, 0.5)).toThrow(/pa must be/);
});

/* ------------------------------------------------------------------ *
 * AREA D -- SLOW 75% CONFORMAL KELLY SIZING
 * ------------------------------------------------------------------ */

/** Win probabilities. */
const PS = [0.05, 0.2, 0.35, 0.5, 0.55, 0.65, 0.8, 0.95] as const;

/** Slow conformal half-widths, including the zero-width case. */
const SIGMAS = [0, 0.05, 0.1, 0.2, 0.4] as const;

/** Downside break-rate dial readings, inside and past the allowance. */
const DBREAKS = [0, 0.05, 0.15, 0.3] as const;

/** The fixed sizing constants of the grid. */
const LAMBDA_KELLY = 0.25;
const K_CAPITAL = 1000;
const B_SCALE = 0.91;
const KAPPA_SIGMA = 0.5;
const ALPHA_DOWN = 0.1;

area("T7/D -- slow 75% conformal Kelly sizing (goal spec section 5.2)");

for (const p of PS) {
  for (const sigma of SIGMAS) {
    for (const dBreak of DBREAKS) {
      add(`T7/D1 conformalKellyStake p=${p} sigma=${sigma} dBreak=${dBreak}`, () => {
        const input: ConformalKellySizing = {
          lambdaKelly: LAMBDA_KELLY,
          k: K_CAPITAL,
          b: B_SCALE,
          p,
          sigmaConf: sigma,
          kappaSigma: KAPPA_SIGMA,
          dBreak,
          alphaDown: ALPHA_DOWN,
        };
        const result = conformalKellyStake(input);

        const throttle = Math.max(0, 1 - Math.max(0, dBreak - ALPHA_DOWN) / ALPHA_DOWN);
        const upside = LAMBDA_KELLY * K_CAPITAL * B_SCALE * p;
        const downside =
          (1 - p) * B_SCALE * (1 + KAPPA_SIGMA * sigma * sigma) * throttle;

        expect(result.throttle).toBeCloseTo(throttle, 12);
        expect(result.upside).toBeCloseTo(upside, 12);
        expect(result.downside).toBeCloseTo(downside, 12);
        expect(result.fStake).toBeCloseTo(upside - downside, 12);
        expect(result.stake).toBeCloseTo(Math.max(0, upside - downside), 12);

        // The throttle is a factor in [0, 1].
        expect(result.throttle).toBeGreaterThanOrEqual(0);
        expect(result.throttle).toBeLessThanOrEqual(1);

        // Inside the allowance the downside is charged in full; two
        // allowances past it the downside is charged not at all.
        if (dBreak <= ALPHA_DOWN) {
          expect(result.throttle).toBe(1);
        }
        if (dBreak >= 2 * ALPHA_DOWN) {
          expect(result.throttle).toBe(0);
          // With no downside charge left, f_stake IS the upside term.
          expect(result.fStake).toBeCloseTo(result.upside, 12);
          expect(result.downside).toBe(0);
        }

        // A wider conformal interval can only cost downside, never buy it.
        const wider = conformalKellyStake({ ...input, sigmaConf: sigma + 0.1 });
        expect(wider.downside).toBeGreaterThanOrEqual(result.downside);
        expect(wider.fStake).toBeLessThanOrEqual(result.fStake + 1e-12);

        // A harsher break rate can only reduce the downside charge.
        const harsher = conformalKellyStake({ ...input, dBreak: dBreak + 0.1 });
        expect(harsher.throttle).toBeLessThanOrEqual(result.throttle);
        expect(harsher.downside).toBeLessThanOrEqual(result.downside + 1e-12);
      });
    }
  }
}

add("T7/D2 the throttle is 1 inside the downside allowance", () => {
  expect(downsideThrottle(0, 0.1)).toBe(1);
  expect(downsideThrottle(0.05, 0.1)).toBe(1);
  expect(downsideThrottle(0.1, 0.1)).toBe(1);
});

add("T7/D2 the throttle falls linearly past the downside allowance", () => {
  expect(downsideThrottle(0.15, 0.1)).toBeCloseTo(0.5, 12);
  expect(downsideThrottle(0.2, 0.1)).toBeCloseTo(0, 12);
});

add("T7/D2 the throttle is 0 two allowances past the allowance", () => {
  expect(downsideThrottle(0.25, 0.1)).toBe(0);
  expect(downsideThrottle(0.9, 0.1)).toBe(0);
});

add("T7/D2 the throttle is 1 at the allowance exactly", () => {
  expect(downsideThrottle(0.1, 0.1)).toBe(1);
});

add("T7/D2 the throttle rejects a zero allowance", () => {
  expect(() => downsideThrottle(0.1, 0)).toThrow(/alphaDown must be/);
});

add("T7/D2 the throttle rejects a negative break rate", () => {
  expect(() => downsideThrottle(-0.1, 0.1)).toThrow(/dBreak must be/);
});

add("T7/D2 the stake is floored at zero when the downside dominates", () => {
  const result = conformalKellyStake({
    lambdaKelly: 0.25,
    k: 50,
    b: 0.91,
    p: 0.05,
    sigmaConf: 0.4,
    kappaSigma: 0.5,
    dBreak: 0,
    alphaDown: 0.1,
  });
  expect(result.fStake).toBeLessThan(0);
  expect(result.stake).toBe(0);
});

add("T7/D2 a zero width removes the width-variance charge", () => {
  const base = {
    lambdaKelly: 0.25,
    k: 1000,
    b: 0.91,
    p: 0.55,
    kappaSigma: 0.5,
    dBreak: 0,
    alphaDown: 0.1,
  };
  const zero = conformalKellyStake({ ...base, sigmaConf: 0 });
  const wide = conformalKellyStake({ ...base, sigmaConf: 0.5 });
  expect(zero.downside).toBeCloseTo((1 - 0.55) * 0.91, 12);
  expect(wide.downside).toBeGreaterThan(zero.downside);
});

add("T7/D2 a wider conformal interval lowers the stake", () => {
  const base = {
    lambdaKelly: 0.25,
    k: 1000,
    b: 0.91,
    p: 0.65,
    kappaSigma: 0.5,
    dBreak: 0,
    alphaDown: 0.1,
  };
  const narrow = conformalKellyStake({ ...base, sigmaConf: 0.05 });
  const wide = conformalKellyStake({ ...base, sigmaConf: 0.4 });
  expect(wide.fStake).toBeLessThan(narrow.fStake);
  expect(wide.stake).toBeLessThan(narrow.stake);
});

add("T7/D2 a past-allowance break rate zeroes the downside charge", () => {
  const result = conformalKellyStake({
    lambdaKelly: 0.25,
    k: 1000,
    b: 0.91,
    p: 0.55,
    sigmaConf: 0.2,
    kappaSigma: 0.5,
    dBreak: 0.3,
    alphaDown: 0.1,
  });
  expect(result.throttle).toBe(0);
  expect(result.downside).toBe(0);
  expect(result.fStake).toBeCloseTo(result.upside, 12);
});

add("T7/D2 conformalKellyStake rejects lambdaKelly above 1", () => {
  expect(() =>
    conformalKellyStake({
      lambdaKelly: 1.5,
      k: 1000,
      b: 0.91,
      p: 0.55,
      sigmaConf: 0.2,
      kappaSigma: 0.5,
      dBreak: 0,
      alphaDown: 0.1,
    }),
  ).toThrow(/lambdaKelly must be/);
});

add("T7/D2 conformalKellyStake rejects a probability above 1", () => {
  expect(() =>
    conformalKellyStake({
      lambdaKelly: 0.25,
      k: 1000,
      b: 0.91,
      p: 1.2,
      sigmaConf: 0.2,
      kappaSigma: 0.5,
      dBreak: 0,
      alphaDown: 0.1,
    }),
  ).toThrow(/p must be/);
});

add("T7/D2 conformalKellyStake rejects a negative capital scale", () => {
  expect(() =>
    conformalKellyStake({
      lambdaKelly: 0.25,
      k: -1000,
      b: 0.91,
      p: 0.55,
      sigmaConf: 0.2,
      kappaSigma: 0.5,
      dBreak: 0,
      alphaDown: 0.1,
    }),
  ).toThrow(/K must be/);
});

add("T7/D2 conformalKellyStake rejects a negative conformal width", () => {
  expect(() =>
    conformalKellyStake({
      lambdaKelly: 0.25,
      k: 1000,
      b: 0.91,
      p: 0.55,
      sigmaConf: -0.2,
      kappaSigma: 0.5,
      dBreak: 0,
      alphaDown: 0.1,
    }),
  ).toThrow(/sigmaConf must be/);
});

add("T7/D2 conformalKellyStake rejects a negative width penalty", () => {
  expect(() =>
    conformalKellyStake({
      lambdaKelly: 0.25,
      k: 1000,
      b: 0.91,
      p: 0.55,
      sigmaConf: 0.2,
      kappaSigma: -0.5,
      dBreak: 0,
      alphaDown: 0.1,
    }),
  ).toThrow(/kappaSigma must be/);
});

/* ---- the slow conformal half-width -------------------------------- */

area("T7/D -- the slow (unweighted) 250-game rolling 75% conformal half-width");

/** A deterministic residual history: 400 residuals, 0.001 .. 0.400. */
const RESIDUALS = Array.from({ length: 400 }, (_, i) => (i + 1) / 1000);

add("T7/D3 the slow half-width is the 189th smallest of the last 250 residuals", () => {
  const half = slowConformalHalfWidth(RESIDUALS);
  const window = [...RESIDUALS].slice(-SLOW_CONFORMAL_WINDOW_GAMES).sort((a, b) => a - b);
  const rank = conformalRank(SLOW_CONFORMAL_WINDOW_GAMES, 1 - SLOW_CONFORMAL_COVERAGE);
  expect(rank).toBe(189);
  expect(half).toBe(window[rank - 1]);
  expect(half).toBeCloseTo(0.339, 12);
});

add("T7/D3 the slow half-width uses only the trailing 250 games", () => {
  const early = slowConformalHalfWidth(RESIDUALS);
  // Prepending history must not move the slow width at all.
  const padded = [...RESIDUALS, ...RESIDUALS];
  expect(slowConformalHalfWidth(padded)).toBe(early);
});

add("T7/D3 the slow half-width is unweighted: a recent spike does not move it", () => {
  // 250 residuals of 1 followed by 61 of 10. The window holds 189 ones and
  // 61 tens, so the 189th smallest is 1. A recency-weighted (fast) width
  // would jump to 10 here; the slow unweighted width does not.
  const history = [...Array.from({ length: 250 }, () => 1), ...Array.from({ length: 61 }, () => 10)];
  expect(slowConformalHalfWidth(history)).toBe(1);
});

add("T7/D3 a short window tracks a recent spike that the slow window ignores", () => {
  const history = [...Array.from({ length: 250 }, () => 1), ...Array.from({ length: 20 }, () => 10)];
  const slow = slowConformalHalfWidth(history);
  const fast = conformalHalfWidth(history, 20, SLOW_CONFORMAL_COVERAGE);
  expect(slow).toBe(1);
  expect(fast).toBe(10);
});

add("T7/D3 the short window takes the 16th smallest of its 20 scores", () => {
  const half = conformalHalfWidth(RESIDUALS, 20, SLOW_CONFORMAL_COVERAGE);
  const window = [...RESIDUALS].slice(-20).sort((a, b) => a - b);
  expect(conformalRank(20, 1 - SLOW_CONFORMAL_COVERAGE)).toBe(16);
  expect(half).toBe(window[15]);
  expect(half).toBeCloseTo(0.396, 12);
});

add("T7/D3 the half-width of a constant residual history is that constant", () => {
  expect(conformalHalfWidth(Array.from({ length: 300 }, () => 0.42), 250, 0.75)).toBe(0.42);
});

add("T7/D3 the half-width is the conformal rank order statistic, not the mean", () => {
  // A mean would be ~0.2 here; the 189th smallest of the trailing 250 is
  // 0.339. Pin the difference so a mean-based rewrite cannot pass.
  const half = slowConformalHalfWidth(RESIDUALS);
  const mean = RESIDUALS.slice(-250).reduce((a, b) => a + b, 0) / 250;
  expect(mean).toBeCloseTo(0.2755, 6);
  expect(half).toBeCloseTo(0.339, 12);
  expect(half).not.toBeCloseTo(mean, 6);
});

add("T7/D3 the half-width rejects an empty residual history", () => {
  expect(() => conformalHalfWidth([])).toThrow(/at least one/);
});

add("T7/D3 the half-width rejects a negative residual", () => {
  expect(() => conformalHalfWidth([0.1, -0.2])).toThrow(/finite non-negative/);
});

add("T7/D3 the half-width rejects a window below 1", () => {
  expect(() => conformalHalfWidth([0.1], 0)).toThrow(/window must be/);
});

add("T7/D3 the half-width rejects a coverage outside (0, 1)", () => {
  expect(() => conformalHalfWidth([0.1], 250, 1)).toThrow(/coverage must be/);
});

add("T7/D4 slowConformalKellyStake sizes with the slow width it builds", () => {
  const result = slowConformalKellyStake({
    lambdaKelly: LAMBDA_KELLY,
    k: K_CAPITAL,
    b: B_SCALE,
    p: 0.55,
    kappaSigma: KAPPA_SIGMA,
    dBreak: 0,
    alphaDown: ALPHA_DOWN,
    absoluteResiduals: RESIDUALS,
  });
  const direct = conformalKellyStake({
    lambdaKelly: LAMBDA_KELLY,
    k: K_CAPITAL,
    b: B_SCALE,
    p: 0.55,
    sigmaConf: slowConformalHalfWidth(RESIDUALS),
    kappaSigma: KAPPA_SIGMA,
    dBreak: 0,
    alphaDown: ALPHA_DOWN,
  });
  expect(result.fStake).toBeCloseTo(direct.fStake, 12);
  expect(result.downside).toBeCloseTo(direct.downside, 12);
  expect(result.downside).toBeCloseTo(
    (1 - 0.55) * B_SCALE * (1 + KAPPA_SIGMA * 0.339 * 0.339),
    12,
  );
});

add("T7/D4 a wider residual history lowers the slow-stake", () => {
  const narrow = slowConformalKellyStake({
    lambdaKelly: LAMBDA_KELLY,
    k: K_CAPITAL,
    b: B_SCALE,
    p: 0.55,
    kappaSigma: KAPPA_SIGMA,
    dBreak: 0,
    alphaDown: ALPHA_DOWN,
    absoluteResiduals: Array.from({ length: 300 }, () => 0.05),
  });
  const wide = slowConformalKellyStake({
    lambdaKelly: LAMBDA_KELLY,
    k: K_CAPITAL,
    b: B_SCALE,
    p: 0.55,
    kappaSigma: KAPPA_SIGMA,
    dBreak: 0,
    alphaDown: ALPHA_DOWN,
    absoluteResiduals: RESIDUALS,
  });
  expect(wide.fStake).toBeLessThan(narrow.fStake);
});

add("T7/D4 slowConformalKellyStake rejects an empty residual history", () => {
  expect(() =>
    slowConformalKellyStake({
      lambdaKelly: LAMBDA_KELLY,
      k: K_CAPITAL,
      b: B_SCALE,
      p: 0.55,
      kappaSigma: KAPPA_SIGMA,
      dBreak: 0,
      alphaDown: ALPHA_DOWN,
      absoluteResiduals: [],
    }),
  ).toThrow(/at least one/);
});

/* ------------------------------------------------------------------ *
 * REGISTRATION
 * ------------------------------------------------------------------ */

const AREA_NAMES: string[] = [];
for (const c of CASES) {
  if (!AREA_NAMES.includes(c.area)) AREA_NAMES.push(c.area);
}

for (const name of AREA_NAMES) {
  describe(name, () => {
    for (const c of CASES) {
      if (c.area === name) it(c.name, c.fn);
    }
  });
}
