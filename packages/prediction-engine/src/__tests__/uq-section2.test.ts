/**
 * UQ Section-2 test suite.
 *
 * WHY this file exists: the Section-2 modules (levene-welch, lwt-mcps-sketch,
 * multicalib-audit-patch, plus the Mondrian / taxonomy / local-isotonic-patch
 * surfaces they build on) all promise TOTALITY — no throws, no NaN, no Infinity
 * — and all of them earn their keep through HONESTY GUARDS rather than through
 * raw numbers: a sparse Mondrian leaf must fall back rather than publish a
 * quantile computed from 3 residuals, a small audit cell must not be accused of
 * miscalibration, a degenerate variance test must report valid:false rather
 * than a plausible-looking statistic, and a split search must refuse a split it
 * cannot support with minLeafSize samples on both sides.
 *
 * Those guards are exactly the behaviour that regresses silently, because a
 * broken guard still returns a number. So every test here asserts the guard
 * itself — which branch fired, what the fallback chain was, whether
 * failed / valid / applied is set — and asserts Number.isFinite on every
 * statistic that crosses a module boundary, never merely that "a value came
 * back".
 *
 * Sibling of uq-calibration.test.ts; makes no claim about the IVAP/PAV cores
 * beyond the multiprobability ordering invariant in the final block.
 */

import { describe, expect, it } from "vitest";

import {
  arithmeticMeanAggregation,
  logSpaceGeometricMeanAggregation,
  toFull,
  type Multiprobability,
} from "../calibration/aggregation.js";
import { cvapPredict } from "../calibration/cvap.js";
import type { IvapCalibrationPoint } from "../calibration/ivap.js";
import {
  applyLocalIsotonicPatch,
  fitLocalIsotonicPatch,
  type LocalPatchPoint,
} from "../calibration/local-isotonic-patch.js";
import {
  auditCells,
  runAuditAndPatch,
  type AuditSample,
} from "../calibration/multicalib-audit-patch.js";
import {
  brownForsythe,
  levene,
  splitQuality,
  welchT,
} from "../conformal/levene-welch.js";
import {
  bestSplit,
  greedyPartition,
  leafQuantile,
  ROOT_LEAF_ID,
  type PartitionSample,
} from "../conformal/lwt-mcps-sketch.js";
import { MondrianResidualManager } from "../conformal/mondrian.js";
import {
  assignMondrianCategory,
  parentCategory,
  restBucket,
  tier2Intersections,
  type SportsGameContext,
} from "../conformal/sports-taxonomy.js";

/* ------------------------------------------------------------------ */
/* Deterministic fixtures (no RNG library, no external deps)           */
/* ------------------------------------------------------------------ */

/** Tiny deterministic LCG so the property sweeps reproduce byte-for-byte. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** Heteroscedastic partition fixture: residual SCALE jumps at index >= breakpoint. */
const TIGHT_CYCLE = [-0.1, 0.1, -0.05, 0.05] as const;
const WIDE_CYCLE = [-5, 5, -2.5, 2.5] as const;

function scaleSplitSamples(count: number, breakpoint: number): PartitionSample[] {
  return Array.from({ length: count }, (_, i) => {
    const cycle = i < breakpoint ? TIGHT_CYCLE : WIDE_CYCLE;
    return {
      features: { x: i, parity: i % 2 },
      residual: cycle[i % cycle.length]!,
    };
  });
}

/**
 * Audit fixture. Scores rise linearly through [0.300, 0.300 + 0.001*(count-1)],
 * so the mean predicted probability sits near 0.32; `positivesPerTen` sets the
 * observed rate exactly, which is what injects (or withholds) the gap.
 */
function auditSamples(
  group: string,
  count: number,
  positivesPerTen: number,
): AuditSample[] {
  return Array.from({ length: count }, (_, i) => ({
    score: 0.3 + i * 0.001,
    label: (i % 10 < positivesPerTen ? 1 : 0) as 0 | 1,
    group,
  }));
}

/* ------------------------------------------------------------------ */
/* 1. Mondrian hierarchical fallback                                   */
/* ------------------------------------------------------------------ */

describe("MondrianResidualManager hierarchical fallback", () => {
  it("uses the leaf itself when it holds at least minSamples residuals", () => {
    const manager = new MondrianResidualManager({ minSamples: 3 });
    manager.addMany("home|favorite|rest_long", [1, 2, 3, 4, 5]);

    const result = manager.quantile("home|favorite|rest_long", 0.9);

    expect(result.category).toBe("home|favorite|rest_long");
    expect(result.usedFallback).toBe(false);
    expect(result.fallbackChain).toEqual(["home|favorite|rest_long"]);
    expect(result.sampleSize).toBe(5);
    expect(Number.isFinite(result.quantile)).toBe(true);
    expect(result.quantile).toBeGreaterThan(0);
  });

  it("falls back to the PARENT category when the leaf is under minSamples", () => {
    const manager = new MondrianResidualManager({ minSamples: 10 });
    // Leaf is deliberately starved: 3 residuals, far under minSamples.
    manager.addMany("home|favorite|rest_long", [0.5, 0.6, 0.7]);
    // Parent is well populated, and its residuals are strictly larger, so the
    // returned quantile proves WHICH store was actually read.
    manager.addMany("home|favorite", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    const result = manager.quantile("home|favorite|rest_long", 0.9);

    expect(result.category).toBe("home|favorite");
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackChain).toEqual(["home|favorite|rest_long", "home|favorite"]);
    expect(result.sampleSize).toBe(12);
    expect(Number.isFinite(result.quantile)).toBe(true);
    expect(result.quantile).toBeGreaterThan(0.7);
  });

  it('walks leaf -> parent -> grandparent -> global "*" when no ancestor qualifies', () => {
    const manager = new MondrianResidualManager({ minSamples: 10 });
    manager.addMany("away|underdog|rest_short", [1, 2, 3, 4]);

    const result = manager.quantile("away|underdog|rest_short", 0.9);

    expect(result.category).toBe("*");
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackChain).toEqual([
      "away|underdog|rest_short",
      "away|underdog",
      "away",
      "*",
    ]);
    // The global bucket mirrors every add(), so it holds the same 4 residuals.
    expect(result.sampleSize).toBe(4);
    expect(Number.isFinite(result.quantile)).toBe(true);
    expect(result.quantile).toBeGreaterThanOrEqual(0);
  });

  it("returns an honest zero (no fallback) when global fallback is disabled", () => {
    const manager = new MondrianResidualManager({
      minSamples: 10,
      useGlobalFallback: false,
    });
    manager.addMany("away|underdog", [1, 2, 3]);

    const result = manager.quantile("away|underdog", 0.9);

    expect(result.usedFallback).toBe(false);
    expect(result.category).toBe("away|underdog");
    expect(result.sampleSize).toBe(0);
    expect(result.quantile).toBe(0);
    expect(Number.isFinite(result.quantile)).toBe(true);
    expect(result.fallbackChain).toEqual(["away|underdog", "away"]);
    // The global bucket was never maintained at all.
    expect(manager.size("*")).toBe(0);
  });

  it("stores absolute residuals so sign cannot shrink a quantile", () => {
    const manager = new MondrianResidualManager({ minSamples: 2 });
    manager.addMany("home|favorite", [-8, -8, -8, -8]);

    const result = manager.quantile("home|favorite", 0.5);

    expect(result.quantile).toBe(8);
    expect(Number.isFinite(result.quantile)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Local isotonic patch small-sample identity                       */
/* ------------------------------------------------------------------ */

describe("fitLocalIsotonicPatch / applyLocalIsotonicPatch small-sample guard", () => {
  const sparse: readonly LocalPatchPoint[] = [
    { score: 0.1, label: 0 },
    { score: 0.2, label: 1 },
    { score: 0.3, label: 1 },
    { score: 0.4, label: 0 },
    { score: 0.5, label: 1 },
  ];

  it("declines to fit (applied:false) when n < minSamples", () => {
    const patch = fitLocalIsotonicPatch(sparse, { minSamples: 20, lambda: 1 });

    expect(patch.applied).toBe(false);
    expect(patch.sampleSize).toBe(5);
    expect(patch.knots).toEqual([]);
    expect(patch.reason).toBeDefined();
    expect(patch.lambda).toBe(1);
  });

  it("behaves as the identity on the base probability when the fit declined", () => {
    const patch = fitLocalIsotonicPatch(sparse, { minSamples: 20, lambda: 1 });

    for (const base of [0, 0.05, 0.25, 0.5, 0.73, 1]) {
      const out = applyLocalIsotonicPatch(base, 0.3, patch);
      expect(out).toBe(base);
      expect(Number.isFinite(out)).toBe(true);
    }
  });

  it("declines on an empty group without producing NaN", () => {
    const patch = fitLocalIsotonicPatch([], { minSamples: 20 });

    expect(patch.applied).toBe(false);
    expect(patch.sampleSize).toBe(0);
    expect(patch.knots).toEqual([]);
    expect(applyLocalIsotonicPatch(0.42, 0.5, patch)).toBe(0.42);
  });

  it("does fit once minSamples is met, and lambda=0 still leaves the base untouched", () => {
    const dense: LocalPatchPoint[] = Array.from({ length: 24 }, (_, i) => ({
      score: i / 24,
      label: (i >= 12 ? 1 : 0) as 0 | 1,
    }));

    const applied = fitLocalIsotonicPatch(dense, { minSamples: 20, lambda: 1 });
    expect(applied.applied).toBe(true);
    expect(applied.knots).toHaveLength(24);
    for (const knot of applied.knots) {
      expect(Number.isFinite(knot.fitted)).toBe(true);
      expect(knot.fitted).toBeGreaterThanOrEqual(0);
      expect(knot.fitted).toBeLessThanOrEqual(1);
    }
    // Perfectly separable data: the patch pulls a low score down, a high one up.
    expect(applyLocalIsotonicPatch(0.5, 0.02, applied)).toBeLessThan(0.5);
    expect(applyLocalIsotonicPatch(0.5, 0.98, applied)).toBeGreaterThan(0.5);

    // lambda = 0 is the documented "no patch" strength.
    const inert = fitLocalIsotonicPatch(dense, { minSamples: 20, lambda: 0 });
    expect(inert.applied).toBe(true);
    expect(applyLocalIsotonicPatch(0.5, 0.98, inert)).toBe(0.5);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Taxonomy determinism and rest-bucket boundaries                  */
/* ------------------------------------------------------------------ */

describe("sports taxonomy", () => {
  it("restBucket boundaries are inclusive at 3 and 7", () => {
    expect(restBucket(0)).toBe("rest_short");
    expect(restBucket(3)).toBe("rest_short");
    expect(restBucket(3.5)).toBe("rest_normal");
    expect(restBucket(4)).toBe("rest_normal");
    expect(restBucket(7)).toBe("rest_normal");
    expect(restBucket(7.5)).toBe("rest_long");
    expect(restBucket(8)).toBe("rest_long");
    expect(restBucket(30)).toBe("rest_long");
    // Negative rest is nonsense upstream, but it must still land in the SHORT
    // bucket rather than falling through to the long-rest tail.
    expect(restBucket(-1)).toBe("rest_short");
  });

  it("assignMondrianCategory is deterministic for the same context", () => {
    const ctx: SportsGameContext = {
      isHome: true,
      isFavorite: false,
      restDays: 6,
      isPrimetime: true,
    };

    const first = assignMondrianCategory(ctx, 1);
    const second = assignMondrianCategory({ ...ctx }, 1);
    const third = assignMondrianCategory(ctx, 1);

    expect(first).toBe("home|underdog");
    expect(second).toBe(first);
    expect(third).toBe(first);

    const deep = assignMondrianCategory(ctx, 2);
    expect(deep).toBe("home|underdog|rest_normal");
    expect(assignMondrianCategory({ ...ctx }, 2)).toBe(deep);
    // Levels must nest: the level-1 key is a strict prefix of the level-2 key.
    expect(deep.startsWith(`${first}|`)).toBe(true);
  });

  it("level-2 categories are children of level-1 categories under parentCategory", () => {
    const ctx: SportsGameContext = { isHome: false, isFavorite: true, restDays: 10 };

    const level1 = assignMondrianCategory(ctx, 1);
    const level2 = assignMondrianCategory(ctx, 2);

    expect(level2).toBe("away|favorite|rest_long");
    expect(parentCategory(level2)).toBe(level1);
    expect(parentCategory(level1)).toBe("away");
    expect(parentCategory("away")).toBeNull();
    expect(tier2Intersections(ctx)).toContain(level2);
  });

  it("varying any single axis changes the level-2 category (no collisions)", () => {
    const base: SportsGameContext = { isHome: true, isFavorite: true, restDays: 5 };
    const seen = new Set<string>();
    for (const isHome of [true, false]) {
      for (const isFavorite of [true, false]) {
        for (const restDays of [1, 5, 12]) {
          seen.add(assignMondrianCategory({ ...base, isHome, isFavorite, restDays }, 2));
        }
      }
    }
    expect(seen.size).toBe(12);
  });
});

/* ------------------------------------------------------------------ */
/* 4. Levene / Brown-Forsythe / Welch / splitQuality                   */
/* ------------------------------------------------------------------ */

const TIGHT_GROUP: readonly number[] = [-1, -0.5, 0, 0.5, 1];
const WIDE_GROUP: readonly number[] = [-10, -5, 0, 5, 10];

const DEGENERATE_VARIANCE_CASES: readonly (readonly [
  string,
  readonly (readonly number[])[],
])[] = [
  ["no groups", []],
  ["a single group", [[1, 2, 3]]],
  ["one empty group", [[], [1, 2, 3]]],
  ["both groups empty", [[], []]],
  ["singletons only", [[1], [2]]],
  ["all-identical values", [[5, 5, 5], [5, 5, 5]]],
  ["constant within each group", [[2, 2, 2, 2], [9, 9, 9, 9]]],
  ["a group with no finite entries", [[Number.NaN, Number.POSITIVE_INFINITY], [1, 2, 3]]],
];

describe("brownForsythe", () => {
  it("scores a clearly heteroscedastic pair well above an identical pair", () => {
    const different = brownForsythe([TIGHT_GROUP, WIDE_GROUP]);
    const identical = brownForsythe([TIGHT_GROUP, [...TIGHT_GROUP]]);

    expect(different.valid).toBe(true);
    expect(identical.valid).toBe(true);
    expect(Number.isFinite(different.statistic)).toBe(true);
    expect(Number.isFinite(identical.statistic)).toBe(true);
    expect(different.statistic).toBeGreaterThan(identical.statistic);
    expect(different.statistic).toBeGreaterThan(1);
  });

  it("gives a statistic of exactly 0 for two identical groups", () => {
    const result = brownForsythe([TIGHT_GROUP, [...TIGHT_GROUP]]);

    expect(result.valid).toBe(true);
    expect(result.statistic).toBe(0);
    expect(result.df1).toBe(1);
    expect(result.df2).toBe(8);
    expect(result.groupCount).toBe(2);
    expect(result.totalSamples).toBe(10);
  });

  it("shares the degrees-of-freedom shape with classic Levene", () => {
    const bf = brownForsythe([TIGHT_GROUP, WIDE_GROUP]);
    const lv = levene([TIGHT_GROUP, WIDE_GROUP]);

    expect(lv.valid).toBe(true);
    expect(bf.df1).toBe(lv.df1);
    expect(bf.df2).toBe(lv.df2);
    expect(Number.isFinite(lv.statistic)).toBe(true);
    expect(lv.statistic).toBeGreaterThan(0);
  });

  it.each(DEGENERATE_VARIANCE_CASES)(
    "returns valid:false with finite zeros for %s",
    (_label, groups) => {
      const result = brownForsythe(groups);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.statistic).toBe(0);
      expect(Number.isFinite(result.statistic)).toBe(true);
      expect(Number.isFinite(result.df1)).toBe(true);
      expect(Number.isFinite(result.df2)).toBe(true);
      expect(Number.isFinite(result.groupCount)).toBe(true);
      expect(Number.isFinite(result.totalSamples)).toBe(true);
    },
  );

  it("drops non-finite entries instead of poisoning the statistic", () => {
    const withJunk = [-1, Number.NaN, -0.5, 0, Number.POSITIVE_INFINITY, 0.5, 1];
    const result = brownForsythe([withJunk, WIDE_GROUP]);

    expect(result.valid).toBe(true);
    expect(result.totalSamples).toBe(10);
    expect(Number.isFinite(result.statistic)).toBe(true);
    // Identical to the clean fixture: the junk contributed exactly nothing.
    expect(result.statistic).toBeCloseTo(
      brownForsythe([TIGHT_GROUP, WIDE_GROUP]).statistic,
      12,
    );
  });
});

const DEGENERATE_TWO_SAMPLE_CASES: readonly (readonly [
  string,
  readonly number[],
  readonly number[],
])[] = [
  ["empty left", [], [1, 2, 3]],
  ["empty right", [1, 2, 3], []],
  ["singleton left", [1], [1, 2, 3]],
  ["singleton right", [1, 2, 3], [7]],
  ["both sides constant", [5, 5, 5], [9, 9, 9]],
  ["no finite entries on the left", [Number.NaN, Number.NaN, Number.NaN], [1, 2, 3]],
];

describe("welchT", () => {
  it("is exactly 0 for identical samples and finite in both legs", () => {
    const a = [1, 2, 3, 4, 5];
    const result = welchT(a, [...a]);

    expect(result.valid).toBe(true);
    expect(result.t).toBe(0);
    expect(Number.isFinite(result.t)).toBe(true);
    expect(Number.isFinite(result.df)).toBe(true);
    expect(result.df).toBeGreaterThan(0);
  });

  it("is signed in the mean(a) - mean(b) direction", () => {
    const low = [1, 2, 3, 4, 5];
    const high = [11, 12, 13, 14, 15];

    const forward = welchT(high, low);
    const reverse = welchT(low, high);

    expect(forward.valid).toBe(true);
    expect(reverse.valid).toBe(true);
    expect(forward.t).toBeGreaterThan(0);
    expect(reverse.t).toBeLessThan(0);
    expect(forward.t).toBeCloseTo(-reverse.t, 12);
    expect(forward.df).toBeCloseTo(reverse.df, 12);
    expect(Number.isFinite(forward.df)).toBe(true);
  });

  it.each(DEGENERATE_TWO_SAMPLE_CASES)(
    "returns valid:false with finite zeros for %s",
    (_label, a, b) => {
      const result = welchT(a, b);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.t).toBe(0);
      expect(result.df).toBe(0);
      expect(Number.isFinite(result.t)).toBe(true);
      expect(Number.isFinite(result.df)).toBe(true);
    },
  );
});

describe("splitQuality", () => {
  it("prefers a scale-separating split over a null split", () => {
    const separating = splitQuality(TIGHT_GROUP, WIDE_GROUP);
    const nullSplit = splitQuality(TIGHT_GROUP, [...TIGHT_GROUP]);

    expect(separating.valid).toBe(true);
    expect(nullSplit.valid).toBe(true);
    expect(Number.isFinite(separating.score)).toBe(true);
    expect(Number.isFinite(nullSplit.score)).toBe(true);
    expect(separating.score).toBeGreaterThan(nullSplit.score);
    expect(nullSplit.score).toBe(0);
  });

  it("weights the variance leg far above the mean-shift leg", () => {
    // A pure mean shift with IDENTICAL spread: the variance leg is exactly 0,
    // so the whole score is the SATURATED mean leg 0.15 * (|t| / (1 + |t|)),
    // and must stay far below a real scale split. The saturation IS the
    // dominance property: |t| grows without bound as the children separate in
    // location, so a linear `0.15 * |t|` term would let a large enough mean
    // shift outscore any amount of genuine scale separation. Asserted
    // numerically AND as the strict bound the saturation guarantees.
    const shifted = splitQuality(TIGHT_GROUP, TIGHT_GROUP.map((v) => v + 1));
    const scaled = splitQuality(TIGHT_GROUP, WIDE_GROUP);

    expect(shifted.valid).toBe(true);
    expect(shifted.varianceStatistic).toBe(0);
    expect(Math.abs(shifted.meanStatistic)).toBeGreaterThan(0);

    const absT = Math.abs(shifted.meanStatistic);
    expect(shifted.score).toBeCloseTo(0.15 * (absT / (1 + absT)), 12);
    // The mean leg alone can never reach MEAN_SHIFT_WEIGHT, however large |t|.
    expect(shifted.score).toBeLessThan(0.15);
    expect(scaled.score).toBeGreaterThan(shifted.score);
    expect(Number.isFinite(shifted.score)).toBe(true);
  });

  it("refuses a candidate whose variance test is undefined", () => {
    // Both children constant within themselves: Brown-Forsythe is 0/0 and Welch
    // has a zero pooled standard error, so the candidate must be refused rather
    // than scored from a half-defined leg.
    const result = splitQuality([2, 2, 2, 2], [9, 9, 9, 9]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.score).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it.each(DEGENERATE_TWO_SAMPLE_CASES.slice(0, 4))(
    "returns valid:false with finite zeros for %s",
    (_label, left, right) => {
      const result = splitQuality(left, right);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.score).toBe(0);
      expect(result.varianceStatistic).toBe(0);
      expect(result.meanStatistic).toBe(0);
      expect(Number.isFinite(result.score)).toBe(true);
      expect(Number.isFinite(result.varianceStatistic)).toBe(true);
      expect(Number.isFinite(result.meanStatistic)).toBe(true);
    },
  );

  it("never emits a non-finite statistic across a randomized magnitude sweep", () => {
    const rand = lcg(0x5eed);
    for (let trial = 0; trial < 200; trial++) {
      const nLeft = 1 + Math.floor(rand() * 8);
      const nRight = 1 + Math.floor(rand() * 8);
      // Deliberately span 18 orders of magnitude to stress the sums of squares.
      const scale = trial % 3 === 0 ? 1e-9 : trial % 3 === 1 ? 1 : 1e9;
      const left = Array.from({ length: nLeft }, () => (rand() - 0.5) * scale);
      const right = Array.from({ length: nRight }, () => (rand() - 0.5) * scale * 4);

      const quality = splitQuality(left, right);
      const variance = brownForsythe([left, right]);
      const welch = welchT(left, right);

      expect(Number.isFinite(quality.score)).toBe(true);
      expect(Number.isFinite(quality.varianceStatistic)).toBe(true);
      expect(Number.isFinite(quality.meanStatistic)).toBe(true);
      expect(Number.isFinite(variance.statistic)).toBe(true);
      expect(Number.isFinite(variance.df1)).toBe(true);
      expect(Number.isFinite(variance.df2)).toBe(true);
      expect(Number.isFinite(welch.t)).toBe(true);
      expect(Number.isFinite(welch.df)).toBe(true);
      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(variance.statistic).toBeGreaterThanOrEqual(0);
      expect(variance.df1).toBeGreaterThanOrEqual(0);
      expect(variance.df2).toBeGreaterThanOrEqual(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 5. Multicalibration audit-and-patch                                 */
/* ------------------------------------------------------------------ */

const AUDIT_OPTIONS = {
  bins: 1,
  gapThreshold: 0.05,
  minSamples: 20,
  patchLambda: 1,
} as const;

describe("auditCells", () => {
  it("marks a cell failed when a real gap is backed by enough samples", () => {
    // 40 samples at 7 positives per 10 => observed 0.70 vs ~0.32 predicted.
    const samples = [
      ...auditSamples("biased", 40, 7),
      ...auditSamples("clean", 40, 3),
    ];

    const cells = auditCells(samples, AUDIT_OPTIONS);
    const biased = cells.find((c) => c.group === "biased");
    const clean = cells.find((c) => c.group === "clean");

    expect(biased).toBeDefined();
    expect(clean).toBeDefined();

    expect(biased!.sampleSize).toBe(40);
    expect(biased!.meanObserved).toBeCloseTo(0.7, 12);
    expect(Math.abs(biased!.gap)).toBeGreaterThan(AUDIT_OPTIONS.gapThreshold);
    expect(biased!.failed).toBe(true);

    expect(clean!.sampleSize).toBe(40);
    expect(clean!.meanObserved).toBeCloseTo(0.3, 12);
    expect(Math.abs(clean!.gap)).toBeLessThanOrEqual(AUDIT_OPTIONS.gapThreshold);
    expect(clean!.failed).toBe(false);

    for (const cell of cells) {
      expect(Number.isFinite(cell.gap)).toBe(true);
      expect(Number.isFinite(cell.meanPredicted)).toBe(true);
      expect(Number.isFinite(cell.meanObserved)).toBe(true);
      expect(cell.gap).toBeCloseTo(cell.meanObserved - cell.meanPredicted, 12);
    }
  });

  it("does NOT mark the same gap failed below minSamples (small-sample honesty)", () => {
    // An even LARGER gap than the case above, but only 10 samples behind it.
    const samples = [
      ...auditSamples("biased", 10, 9),
      ...auditSamples("clean", 40, 3),
    ];

    const cells = auditCells(samples, AUDIT_OPTIONS);
    const biased = cells.find((c) => c.group === "biased");

    expect(biased).toBeDefined();
    expect(biased!.sampleSize).toBe(10);
    expect(biased!.sampleSize).toBeLessThan(AUDIT_OPTIONS.minSamples);
    // The gap is genuinely, measurably there ...
    expect(Math.abs(biased!.gap)).toBeGreaterThan(AUDIT_OPTIONS.gapThreshold);
    // ... but there is not enough evidence to accuse the cell.
    expect(biased!.failed).toBe(false);

    // Lowering minSamples below the cell size flips exactly that decision,
    // proving the guard (not the gap) is what suppressed the failure.
    const relaxed = auditCells(samples, { ...AUDIT_OPTIONS, minSamples: 5 });
    expect(relaxed.find((c) => c.group === "biased")!.failed).toBe(true);
  });

  it("emits cells sorted by group then bin, and emits nothing for unusable input", () => {
    const samples = [
      ...auditSamples("zebra", 40, 7),
      ...auditSamples("alpha", 40, 3),
    ];

    expect(auditCells(samples, AUDIT_OPTIONS).map((c) => c.group)).toEqual([
      "alpha",
      "zebra",
    ]);

    expect(auditCells([], AUDIT_OPTIONS)).toEqual([]);
    expect(
      auditCells([{ score: Number.NaN, label: 1, group: "g" }], AUDIT_OPTIONS),
    ).toEqual([]);
    expect(
      auditCells(
        [{ score: Number.POSITIVE_INFINITY, label: 0, group: "g" }],
        AUDIT_OPTIONS,
      ),
    ).toEqual([]);
  });
});

describe("runAuditAndPatch", () => {
  const samples: readonly AuditSample[] = [
    ...auditSamples("biased", 40, 7),
    ...auditSamples("clean", 40, 3),
  ];

  it("closes an injected gap and reports converged/iterations sanely", () => {
    const result = runAuditAndPatch(samples, { ...AUDIT_OPTIONS, maxIterations: 3 });

    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.iterations).toBeLessThanOrEqual(3);
    expect(result.remainingFailures).toBeGreaterThanOrEqual(0);
    expect(result.converged).toBe(result.remainingFailures === 0);
    expect(result.converged).toBe(true);
    expect(result.remainingFailures).toBe(0);
    // Only the genuinely failing cell was patched.
    expect(result.patches.has("biased#0")).toBe(true);
    expect(result.patches.has("clean#0")).toBe(false);

    for (const cell of result.cells) {
      expect(cell.failed).toBe(false);
      expect(Number.isFinite(cell.gap)).toBe(true);
      expect(Number.isFinite(cell.meanPredicted)).toBe(true);
      expect(Number.isFinite(cell.meanObserved)).toBe(true);
    }
  });

  it("never exceeds maxIterations, including maxIterations = 0", () => {
    for (const maxIterations of [0, 1, 2, 5]) {
      const result = runAuditAndPatch(samples, { ...AUDIT_OPTIONS, maxIterations });
      expect(Number.isInteger(result.iterations)).toBe(true);
      expect(result.iterations).toBeGreaterThanOrEqual(0);
      expect(result.iterations).toBeLessThanOrEqual(maxIterations);
    }

    // With no budget at all, nothing may be patched and the failure must stand.
    const zero = runAuditAndPatch(samples, { ...AUDIT_OPTIONS, maxIterations: 0 });
    expect(zero.iterations).toBe(0);
    expect(zero.patches.size).toBe(0);
    expect(zero.converged).toBe(false);
    expect(zero.remainingFailures).toBeGreaterThan(0);
  });

  it("terminates and reports honestly under an unsatisfiable gap threshold", () => {
    // gapThreshold 0 accuses any cell whose gap is not EXACTLY zero, which the
    // patch loop can essentially never achieve. The loop must stop at the
    // budget and report converged honestly rather than spinning forever.
    const result = runAuditAndPatch(samples, {
      bins: 1,
      gapThreshold: 0,
      minSamples: 20,
      patchLambda: 1,
      maxIterations: 4,
    });

    expect(result.iterations).toBeLessThanOrEqual(4);
    expect(result.iterations).toBeGreaterThanOrEqual(0);
    expect(result.converged).toBe(result.remainingFailures === 0);
    expect(Number.isInteger(result.remainingFailures)).toBe(true);
    expect(result.remainingFailures).toBeGreaterThanOrEqual(0);
    for (const cell of result.cells) {
      expect(Number.isFinite(cell.gap)).toBe(true);
      expect(Number.isFinite(cell.meanObserved)).toBe(true);
      expect(Number.isFinite(cell.meanPredicted)).toBe(true);
    }
  });

  it("is deterministic: the same input twice yields identical cells", () => {
    const options = { ...AUDIT_OPTIONS, maxIterations: 3 };
    const first = runAuditAndPatch(samples, options);
    const second = runAuditAndPatch(samples, options);

    expect(second.cells).toEqual(first.cells);
    expect(second.iterations).toBe(first.iterations);
    expect(second.converged).toBe(first.converged);
    expect(second.remainingFailures).toBe(first.remainingFailures);
    expect([...second.patches.keys()].sort()).toEqual([...first.patches.keys()].sort());
  });

  it("is stable under reordering of independent groups", () => {
    const options = { ...AUDIT_OPTIONS, maxIterations: 3 };
    const forward = runAuditAndPatch(samples, options);
    const reversed = runAuditAndPatch([...samples].reverse(), options);

    expect(reversed.cells.map((c) => c.group)).toEqual(forward.cells.map((c) => c.group));
    expect(reversed.cells.map((c) => c.sampleSize)).toEqual(
      forward.cells.map((c) => c.sampleSize),
    );
    expect(reversed.converged).toBe(forward.converged);
  });
});

/* ------------------------------------------------------------------ */
/* 6. LWT / MCPS partition sketch                                      */
/* ------------------------------------------------------------------ */

describe("bestSplit", () => {
  it("picks the scale-carrying feature and honours minLeafSize on both children", () => {
    const samples = scaleSplitSamples(40, 20);

    const split = bestSplit(samples, ["x", "parity"], 10);
    // "parity" carries a mean shift but NO scale information, so it must lose.
    const parityOnly = bestSplit(samples, ["parity"], 10);

    expect(split).not.toBeNull();
    expect(parityOnly).not.toBeNull();
    expect(split!.featureKey).toBe("x");
    expect(split!.leftCount).toBeGreaterThanOrEqual(10);
    expect(split!.rightCount).toBeGreaterThanOrEqual(10);
    expect(split!.leftCount + split!.rightCount).toBe(40);
    expect(Number.isFinite(split!.quality)).toBe(true);
    expect(Number.isFinite(split!.threshold)).toBe(true);
    expect(split!.quality).toBeGreaterThan(0);
    expect(split!.quality).toBeGreaterThan(parityOnly!.quality);
    // parity's two children are variance-identical, so its entire score comes
    // from the deliberately small Welch bonus.
    expect(parityOnly!.quality).toBeLessThan(1);
  });

  it("returns null when minLeafSize cannot be satisfied", () => {
    const samples = scaleSplitSamples(20, 10);

    // 20 samples can never yield 15 (or even 11) on both sides.
    expect(bestSplit(samples, ["x"], 15)).toBeNull();
    expect(bestSplit(samples, ["x"], 11)).toBeNull();
    // Exactly 10/10 is achievable, so this one must succeed.
    const exact = bestSplit(samples, ["x"], 10);
    expect(exact).not.toBeNull();
    expect(exact!.leftCount).toBe(10);
    expect(exact!.rightCount).toBe(10);
  });

  it("respects minLeafSize even when the sample count clears the 2*n floor", () => {
    // 25 samples with minLeafSize 12: only near-central thresholds survive.
    const samples = scaleSplitSamples(25, 12);
    const split = bestSplit(samples, ["x"], 12);

    expect(split).not.toBeNull();
    expect(split!.leftCount).toBeGreaterThanOrEqual(12);
    expect(split!.rightCount).toBeGreaterThanOrEqual(12);
    expect(split!.leftCount + split!.rightCount).toBe(25);
  });

  it("returns null for empty samples or no usable feature keys", () => {
    const samples = scaleSplitSamples(40, 20);

    expect(bestSplit([], ["x"], 2)).toBeNull();
    expect(bestSplit(samples, [], 10)).toBeNull();
    // Empty-string keys are dropped by the deduper, leaving nothing to search.
    expect(bestSplit(samples, [""], 10)).toBeNull();
    // A feature nobody carries yields no thresholds, hence no split.
    expect(bestSplit(samples, ["missing"], 10)).toBeNull();
  });

  it("is deterministic across repeated calls", () => {
    const samples = scaleSplitSamples(40, 20);

    expect(bestSplit(samples, ["x", "parity"], 5)).toEqual(
      bestSplit(samples, ["x", "parity"], 5),
    );
    // Duplicate keys must not change the answer (dedupe is order-preserving).
    expect(bestSplit(samples, ["x", "x", "parity", "x"], 5)).toEqual(
      bestSplit(samples, ["x", "parity"], 5),
    );
  });

  it("tolerates non-finite residuals and features without producing NaN", () => {
    const samples: PartitionSample[] = [
      ...scaleSplitSamples(40, 20),
      { features: { x: Number.NaN, parity: 0 }, residual: 1 },
      { features: { x: 5 }, residual: Number.NaN },
      { features: {}, residual: Number.POSITIVE_INFINITY },
    ];

    const split = bestSplit(samples, ["x", "parity"], 10);

    expect(split).not.toBeNull();
    expect(Number.isFinite(split!.quality)).toBe(true);
    expect(Number.isFinite(split!.threshold)).toBe(true);
    expect(split!.quality).toBeGreaterThanOrEqual(0);
  });
});

describe("greedyPartition", () => {
  const samples = scaleSplitSamples(40, 20);

  it("returns a single root leaf at maxDepth 0", () => {
    const leaves = greedyPartition(samples, ["x"], { maxDepth: 0, minLeafSize: 5 });

    expect(leaves).toHaveLength(1);
    expect(leaves[0]!.leafId).toBe(ROOT_LEAF_ID);
    expect(leaves[0]!.path).toEqual([]);
    expect(leaves[0]!.sampleCount).toBe(40);
  });

  it.each([1, 2, 3])("never exceeds maxDepth %i and stays a true partition", (maxDepth) => {
    const leaves = greedyPartition(samples, ["x", "parity"], {
      maxDepth,
      minLeafSize: 5,
    });

    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.path.length).toBeLessThanOrEqual(maxDepth);
      expect(leaf.leafId.startsWith(ROOT_LEAF_ID)).toBe(true);
      // The leaf id carries exactly one "|" segment per decision step, which is
      // what makes parentCategory() walk this tree's own ancestry.
      expect(leaf.leafId.split("|").length - 1).toBe(leaf.path.length);
      expect(Number.isInteger(leaf.sampleCount)).toBe(true);
      expect(leaf.sampleCount).toBeGreaterThan(0);
    }

    // Disjoint and covering.
    const total = leaves.reduce((acc, leaf) => acc + leaf.sampleCount, 0);
    expect(total).toBe(samples.length);
    expect(new Set(leaves.map((l) => l.leafId)).size).toBe(leaves.length);
  });

  it("actually splits at depth 1, left child first", () => {
    const leaves = greedyPartition(samples, ["x"], { maxDepth: 1, minLeafSize: 5 });

    expect(leaves).toHaveLength(2);
    expect(leaves[0]!.path).toHaveLength(1);
    expect(leaves[1]!.path).toHaveLength(1);
    expect(leaves[0]!.path[0]!.goesLeft).toBe(true);
    expect(leaves[1]!.path[0]!.goesLeft).toBe(false);
    expect(leaves[0]!.leafId).not.toBe(leaves[1]!.leafId);
  });

  it("is deterministic across repeated calls and copied inputs", () => {
    const options = { maxDepth: 2, minLeafSize: 5 } as const;
    const first = greedyPartition(samples, ["x", "parity"], options);

    expect(greedyPartition(samples, ["x", "parity"], options)).toEqual(first);
    expect(greedyPartition([...samples], ["x", "parity"], options)).toEqual(first);
  });

  it("returns no leaves for an empty sample set", () => {
    expect(greedyPartition([], ["x"], { maxDepth: 2 })).toEqual([]);
  });

  it("produces leaf ids whose parentCategory walks back up the tree", () => {
    const leaves = greedyPartition(samples, ["x"], { maxDepth: 2, minLeafSize: 5 });
    const deep = leaves.find((l) => l.path.length === 2);

    expect(deep).toBeDefined();
    const parent = parentCategory(deep!.leafId);
    expect(parent).not.toBeNull();
    expect(parent!.startsWith(ROOT_LEAF_ID)).toBe(true);
    expect(parentCategory(parent!)).toBe(ROOT_LEAF_ID);
    expect(parentCategory(ROOT_LEAF_ID)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* 7. Multiprobability ordering property                               */
/* ------------------------------------------------------------------ */

describe("multiprobability invariants (width >= 0, p0 <= p1)", () => {
  function assertOrdered(mp: Multiprobability): void {
    expect(Number.isFinite(mp.p0)).toBe(true);
    expect(Number.isFinite(mp.p1)).toBe(true);
    expect(mp.p0).toBeLessThanOrEqual(mp.p1);

    const full = toFull(mp);
    expect(Number.isFinite(full.width)).toBe(true);
    expect(full.width).toBeGreaterThanOrEqual(0);
    expect(full.midpoint).toBeGreaterThanOrEqual(full.p0);
    expect(full.midpoint).toBeLessThanOrEqual(full.p1);
  }

  it("holds for both aggregation rules on deliberately unordered folds", () => {
    const rand = lcg(0xc0ffee);
    for (let trial = 0; trial < 150; trial++) {
      const k = 1 + Math.floor(rand() * 6);
      const folds: Multiprobability[] = Array.from({ length: k }, () => ({
        // NOT pre-ordered: the aggregators themselves must impose p0 <= p1.
        p0: rand(),
        p1: rand(),
      }));

      assertOrdered(logSpaceGeometricMeanAggregation(folds));
      assertOrdered(arithmeticMeanAggregation(folds));
    }
  });

  it("holds for degenerate folds pinned at the probability boundaries", () => {
    const boundaries: Multiprobability[][] = [
      [{ p0: 0, p1: 0 }],
      [{ p0: 1, p1: 1 }],
      [{ p0: 1, p1: 0 }],
      [
        { p0: 0, p1: 1 },
        { p0: 1, p1: 0 },
      ],
    ];

    for (const folds of boundaries) {
      assertOrdered(logSpaceGeometricMeanAggregation(folds));
      assertOrdered(arithmeticMeanAggregation(folds));
    }
  });

  it("holds for every CVAP prediction reachable from a calibration set", () => {
    const rand = lcg(0x1234_5678);

    for (const n of [0, 1, 2, 7, 40]) {
      const calibration: IvapCalibrationPoint[] = Array.from({ length: n }, (_, i) => ({
        score: rand(),
        label: (i % 3 === 0 ? 1 : 0) as 0 | 1,
      }));

      for (const testScore of [-1, 0, 0.001, 0.25, 0.5, 0.75, 0.999, 1, 2]) {
        for (const aggregation of ["geometric", "arithmetic"] as const) {
          const pred = cvapPredict(calibration, testScore, { aggregation, folds: 3 });

          expect(Number.isFinite(pred.p0)).toBe(true);
          expect(Number.isFinite(pred.p1)).toBe(true);
          expect(pred.p0).toBeLessThanOrEqual(pred.p1);
          expect(pred.width).toBeGreaterThanOrEqual(0);
          expect(pred.width).toBeCloseTo(pred.p1 - pred.p0, 12);
          expect(pred.midpoint).toBeGreaterThanOrEqual(pred.p0);
          expect(pred.midpoint).toBeLessThanOrEqual(pred.p1);
          expect(pred.foldsUsed).toBeGreaterThanOrEqual(0);

          for (const fold of pred.foldPredictions) {
            expect(Number.isFinite(fold.p0)).toBe(true);
            expect(Number.isFinite(fold.p1)).toBe(true);
            expect(fold.p0).toBeLessThanOrEqual(fold.p1);
          }
        }
      }
    }
  });

  it("keeps the Mondrian half-width non-negative, so any interval it builds is ordered", () => {
    const manager = new MondrianResidualManager({ minSamples: 2 });
    manager.addMany("home|favorite", [-3, 2, -7, 4, 0]);

    for (const probability of [0.05, 0.5, 0.9, 0.99, 1]) {
      const half = manager.quantile("home|favorite", probability).quantile;
      expect(Number.isFinite(half)).toBe(true);
      expect(half).toBeGreaterThanOrEqual(0);

      const lower = 10 - half;
      const upper = 10 + half;
      expect(upper - lower).toBeGreaterThanOrEqual(0);
      expect(lower).toBeLessThanOrEqual(upper);
    }
  });

  it("never yields a non-finite half-width for an out-of-range probability", () => {
    const manager = new MondrianResidualManager({ minSamples: 2 });
    manager.addMany("home|favorite", [1, 2, 3, 4]);

    // KNOWN DEFECT (mondrian.ts finiteSampleQuantile): a NaN probability makes
    // `rank` NaN, so the clamped index is NaN and `sorted[index]!` yields
    // undefined, which is returned through a `number`-typed field. This case is
    // written to the CORRECT behaviour (an honest finite half-width) rather
    // than to the current output. mondrian.ts is owned by another work item,
    // so the fix belongs there, not here.
    for (const probability of [0, -0.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const half = manager.quantile("home|favorite", probability).quantile;
      expect(Number.isFinite(half)).toBe(true);
      expect(half).toBeGreaterThanOrEqual(0);
    }
  });

  it("leafQuantile refuses an out-of-range probability before it reaches the store", () => {
    // lwt-mcps-sketch DOES guard this, which is what makes the manager-level
    // hole above reachable only through the raw manager API.
    const manager = new MondrianResidualManager({ minSamples: 2 });
    manager.addMany(`${ROOT_LEAF_ID}|x<=1.5`, [1, 2, 3, 4]);

    for (const probability of [0, -0.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = leafQuantile(manager, `${ROOT_LEAF_ID}|x<=1.5`, probability);
      expect(result.quantile).toBe(0);
      expect(Number.isFinite(result.quantile)).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.fallbackChain).toEqual([`${ROOT_LEAF_ID}|x<=1.5`]);
    }

    // A valid probability still delegates to the manager (and its (n+1) rule).
    const ok = leafQuantile(manager, `${ROOT_LEAF_ID}|x<=1.5`, 0.9);
    expect(ok.sampleSize).toBe(4);
    expect(Number.isFinite(ok.quantile)).toBe(true);
    expect(ok.quantile).toBeGreaterThan(0);
  });
});
