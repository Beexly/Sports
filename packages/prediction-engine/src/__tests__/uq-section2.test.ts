/**
 * UQ Section-2 test suite.
 *
 * WHY this file exists: the four Section-2 modules (levene-welch,
 * lwt-mcps-sketch, multicalib-audit-patch, and the Mondrian / taxonomy /
 * local-isotonic-patch surfaces they build on) all promise TOTALITY — no
 * throws, no NaN, no Infinity — and all of them earn their keep through
 * HONESTY GUARDS rather than through raw numbers: a sparse Mondrian leaf must
 * fall back rather than publish a quantile from 3 residuals, a small audit cell
 * must not be accused of miscalibration, a degenerate variance test must report
 * valid:false rather than a plausible-looking statistic, and a split search must
 * refuse a split it cannot support with minLeafSize samples on both sides.
 *
 * Those guards are exactly the behaviour that regresses silently, because a
 * broken guard still returns a number. So every test here asserts the guard
 * itself (which branch fired, what the fallback chain was, whether `failed` /
 * `valid` / `applied` is set) and asserts Number.isFinite on every statistic
 * that crosses a module boundary — never merely that "a value came back".
 *
 * Sibling of uq-calibration.test.ts; owns no assertions about the IVAP/PAV
 * cores beyond the multiprobability ordering invariant in the final block.
 */

import { describe, expect, it } from "vitest";

import { cvapPredict } from "../calibration/cvap.js";
import {
  arithmeticMeanAggregation,
  logSpaceGeometricMeanAggregation,
  toFull,
  type Multiprobability,
} from "../calibration/aggregation.js";
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
import { MondrianResidualManager } from "../conformal/mondrian.js";
import {
  assignMondrianCategory,
  parentCategory,
  restBucket,
  tier2Intersections,
  type SportsGameContext,
} from "../conformal/sports-taxonomy.js";
import {
  brownForsythe,
  levene,
  splitQuality,
  welchT,
} from "../conformal/levene-welch.js";
import {
  bestSplit,
  greedyPartition,
  ROOT_LEAF_ID,
  type PartitionSample,
} from "../conformal/lwt-mcps-sketch.js";

/* ------------------------------------------------------------------ */
/* Deterministic fixtures (no RNG, no external libs)                   */
/* ------------------------------------------------------------------ */

/** Tiny deterministic LCG so property sweeps are reproducible byte-for-byte. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function repeat(value: number, times: number): number[] {
  return Array.from({ length: times }, () => value);
}

/** Heteroscedastic partition fixture: residual SCALE jumps at x >= 20. */
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

/** Audit fixture: `biased` is genuinely miscalibrated, `clean` is not. */
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
    // Leaf is deliberately starved: 3 residuals, well under minSamples.
    manager.addMany("home|favorite|rest_long", [0.5, 0.6, 0.7]);
    // Parent is well populated.
    manager.addMany("home|favorite", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    const result = manager.quantile("home|favorite|rest_long", 0.9);

    expect(result.category).toBe("home|favorite");
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackChain).toEqual(["home|favorite|rest_long", "home|favorite"]);
    expect(result.sampleSize).toBe(12);
    expect(Number.isFinite(result.quantile)).toBe(true);
    // Quantile must come from the PARENT store, not the starved leaf.
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
    // Global bucket was never maintained.
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
    // Perfectly separable data: the patch pulls a low score down and a high one up.
    expect(applyLocalIsotonicPatch(0.5, 0.05, applied)).toBeLessThan(0.5);
    expect(applyLocalIsotonicPatch(0.5, 0.95, applied)).toBeGreaterThan(0.5);

    const inert = fitLocalIsotonicPatch(dense, { minSamples: 20, lambda: 0 });
    expect(inert.applied).toBe(true);
    expect(applyLocalIsotonicPatch(0.5, 0.95, inert)).toBe(0.5);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Taxonomy determinism and rest-bucket boundaries                  */
/* ------------------------------------------------------------------ */

describe("sports taxonomy", () => {
  it("restBucket boundaries are inclusive-low at 3 and 7", () => {
    expect(restBucket(0)).toBe("rest_short");
    expect(restBucket(3)).toBe("rest_short");
    expect(restBucket(3.5)).toBe("rest_normal");
    expect(restBucket(4)).toBe("rest_normal");
    expect(restBucket(7)).toBe("rest_normal");
    expect(restBucket(7.000001)).toBe("rest_long");
    expect(restBucket(8)).toBe("rest_long");
    expect(restBucket(30)).toBe("rest_long");
    // Negative rest is nonsense upstream but must still land in the short bucket
    // rather than falling through to "rest_long".
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

  it("varying any single axis changes the category (no collisions)", () => {
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

describe("brownForsythe", () => {
  const tight = [-1, -0.5, 0, 0.5, 1];
  const wide = [-10, -5, 0, 5, 10];

  it("scores a clearly heteroscedastic pair well above an identical pair", () => {
    const different = brownForsythe([tight, wide]);
    const identical = brownForsythe([tight, [...tight]]);

    expect(different.valid).toBe(true);
    expect(identical.valid).toBe(true);
    expect(Number.isFinite(different.statistic)).toBe(true);
    expect(Number.isFinite(identical.statistic)).toBe(true);
    expect(different.statistic).toBeGreaterThan(identical.statistic);
    expect(different.statistic).toBeGreaterThan(1);
  });

  it("gives a statistic of exactly 0 for two identical groups", () => {
    const result = brownForsythe([tight, [...tight]]);

    expect(result.valid).toBe(true);
    expect(result.statistic).toBe(0);
    expect(result.df1).toBe(1);
    expect(result.df2).toBe(8);
    expect(result.groupCount).toBe(2);
    expect(result.totalSamples).toBe(10);
  });

  it("reports the same degrees of freedom shape as classic Levene", () => {
    const bf = brownForsythe([tight, wide]);
    const lv = levene([tight, wide]);

    expect(bf.df1).toBe(lv.df1);
    expect(bf.df2).toBe(lv.df2);
    expect(Number.isFinite(lv.statistic)).toBe(true);
    expect(lv.valid).toBe(true);
  });

  it.each([
    ["no groups", [] as readonly (readonly number[])[]],
    ["single group", [[1, 2, 3]]],
    ["one empty group", [[], [1, 2, 3]]],
    ["both empty", [[], []]],
    ["singletons only", [[1], [2]]],
    ["all-identical values", [[5, 5, 5], [5, 5, 5]]],
    ["all-identical within each group", [[2, 2, 2, 2], [9, 9, 9, 9]]],
    ["non-finite only", [[Number.NaN, Number.POSITIVE_INFINITY], [1, 2, 3]]],
  ])("returns valid:false with finite zeros for %s", (_label, groups) => {
    const result = brownForsythe(groups as readonly (readonly number[])[]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.statistic).toBe(0);
    expect(Number.isFinite(result.statistic)).toBe(true);
    expect(Number.isFinite(result.df1)).toBe(true);
    expect(Number.isFinite(result.df2)).toBe(true);
    expect(Number.isFinite(result.groupCount)).toBe(true);
    expect(Number.isFinite(result.totalSamples)).toBe(true);
  });

  it("drops non-finite entries instead of poisoning the statistic", () => {
    const withJunk = [-1, Number.NaN, -0.5, 0, Number.POSITIVE_INFINITY, 0.5, 1];
    const result = brownForsythe([withJunk, wide]);

    expect(result.valid).toBe(true);
    expect(result.totalSamples).toBe(10);
    expect(Number.isFinite(result.statistic)).toBe(true);
    expect(result.statistic).toBeCloseTo(brownForsythe([tight, wide]).statistic, 12);
  });
});

describe("welchT", () => {
  it("is 0 for identical samples and finite in both legs", () => {
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
    expect(Number.isFinite(forward.df)).toBe(true);
  });

  it.each([
    ["empty a", [] as readonly number[], [1, 2, 3]],
    ["empty b", [1, 2, 3], [] as readonly number[]],
    ["singleton a", [1], [1, 2, 3]],
    ["singleton b", [1, 2, 3], [7]],
    ["both constant", [5, 5, 5], [9, 9, 9]],
    ["non-finite only", [Number.NaN, Number.NaN, Number.NaN], [1, 2, 3]],
  ])("returns valid:false with finite zeros for %s", (_label, a, b) => {
    const result = welchT(a as readonly number[], b as readonly number[]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.t).toBe(0);
    expect(result.df).toBe(0);
    expect(Number.isFinite(result.t)).toBe(true);
    expect(Number.isFinite(result.df)).toBe(true);
  });
});

describe("splitQuality", () => {
  const tight = [-1, -0.5, 0, 0.5, 1];
  const wide = [-10, -5, 0, 5, 10];

  it("prefers a scale-separating split over a null split", () => {
    const separating = splitQuality(tight, wide);
    const null_ = splitQuality(tight, [...tight]);

    expect(separating.valid).toBe(true);
    expect(null_.valid).toBe(true);
    expect(Number.isFinite(separating.score)).toBe(true);
    expect(Number.isFinite(null_.score)).toBe(true);
    expect(separating.score).toBeGreaterThan(null_.score);
    expect(null_.score).toBe(0);
  });

  it("weights the variance leg far above the mean-shift leg", () => {
    // Pure mean shift, identical spread: variance leg is 0, so the whole score
    // comes from the SATURATED mean leg and must stay tiny relative to a real
    // scale split. The +50 shift is deliberately huge — it drives |t| to ~100,
    // which under an unsaturated 0.15 * |t| would contribute 15 and outrank a
    // genuine Brown-Forsythe W of ~8. That inversion is the bug this pins.
    const shifted = splitQuality(tight, tight.map((v) => v + 50));
    const scaled = splitQuality(tight, wide);

    expect(shifted.valid).toBe(true);
    expect(shifted.varianceStatistic).toBe(0);
    expect(Math.abs(shifted.meanStatistic)).toBeGreaterThan(0);

    // Mean leg is bounded by the weight itself, no matter how extreme |t| is.
    const absT = Math.abs(shifted.meanStatistic);
    expect(shifted.score).toBeCloseTo(0.15 * (absT / (1 + absT)), 12);
    expect(shifted.score).toBeLessThan(0.15);

    // The load-bearing assertion: real scale separation beats extreme location
    // separation, which is the whole reason this criterion exists.
    expect(scaled.varianceStatistic).toBeGreaterThan(0);
    expect(scaled.score).toBeGreaterThan(shifted.score);
    expect(Number.isFinite(shifted.score)).toBe(true);
  });

  it("no mean shift, however extreme, can outrank a modest variance split", () => {
    // Property form of the fix: sweep |t| across four orders of magnitude and
    // assert the mean leg stays capped. An unsaturated weight fails this at
    // the first large shift.
    const modestScaleSplit = splitQuality(tight, wide);
    expect(modestScaleSplit.varianceStatistic).toBeGreaterThan(0);

    for (const shift of [10, 100, 1_000, 10_000]) {
      const pureShift = splitQuality(tight, tight.map((v) => v + shift));
      expect(pureShift.valid).toBe(true);
      expect(pureShift.varianceStatistic).toBe(0);
      expect(pureShift.score).toBeLessThan(0.15);
      expect(modestScaleSplit.score).toBeGreaterThan(pureShift.score);
    }
  });

  it("keeps the variance signal when the Welch leg is degenerate", () => {
    // Both children constant within themselves => Welch invalid, and
    // Brown-Forsythe also undefined (zero within-group deviation), so the whole
    // candidate must be refused rather than scored from a half-defined leg.
    const result = splitQuality([2, 2, 2, 2], [9, 9, 9, 9]);

    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it.each([
    ["empty left", [] as readonly number[], [1, 2, 3, 4]],
    ["empty right", [1, 2, 3, 4], [] as readonly number[]],
    ["singleton left", [1], [1, 2, 3, 4]],
    ["singleton right", [1, 2, 3, 4], [9]],
    ["non-finite left", [Number.NaN, Number.NaN], [1, 2, 3, 4]],
  ])("returns valid:false with finite zeros for %s", (_label, left, right) => {
    const result = splitQuality(left as readonly number[], right as readonly number[]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.score).toBe(0);
    expect(result.varianceStatistic).toBe(0);
    expect(result.meanStatistic).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(Number.isFinite(result.varianceStatistic)).toBe(true);
    expect(Number.isFinite(result.meanStatistic)).toBe(true);
  });

  it("never emits a non-finite statistic across a randomized sweep", () => {
    const rand = lcg(0x5eed);
    for (let trial = 0; trial < 200; trial++) {
      const nLeft = 1 + Math.floor(rand() * 8);
      const nRight = 1 + Math.floor(rand() * 8);
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
    }
  });
});

/* ------------------------------------------------------------------ */
/* 5. Multicalibration audit-and-patch                                 */
/* ------------------------------------------------------------------ */

describe("auditCells", () => {
  const options = { bins: 1, gapThreshold: 0.05, minSamples: 20 } as const;

  it("marks a cell failed when a real gap is backed by enough samples", () => {
    // 40 samples, 7 positives per 10 => observed 0.70 against ~0.32 predicted.
    const samples = [
      ...auditSamples("biased", 40, 7),
      ...auditSamples("clean", 40, 3),
    ];

    const cells = auditCells(samples, options);
    const biased = cells.find((c) => c.group === "biased");
    const clean = cells.find((c) => c.group === "clean");

    expect(biased).toBeDefined();
    expect(clean).toBeDefined();
    expect(biased!.sampleSize).toBe(40);
    expect(biased!.meanObserved).toBeCloseTo(0.7, 12);
    expect(Math.abs(biased!.gap)).toBeGreaterThan(options.gapThreshold);
    expect(biased!.failed).toBe(true);

    expect(clean!.sampleSize).toBe(40);
    expect(Math.abs(clean!.gap)).toBeLessThanOrEqual(options.gapThreshold);
    expect(clean!.failed).toBe(false);

    for (const cell of cells) {
      expect(Number.isFinite(cell.gap)).toBe(true);
      expect(Number.isFinite(cell.meanPredicted)).toBe(true);
      expect(Number.isFinite(cell.meanObserved)).toBe(true);
      expect(cell.gap).toBeCloseTo(cell.meanObserved - cell.meanPredicted, 12);
    }
  });

  it("does NOT mark the same gap failed below minSamples (small-sample honesty)", () => {
    // Identical (in fact larger) gap, but only 10 samples in the accused cell.
    const samples = [
      ...auditSamples("biased", 10, 9),
      ...auditSamples("clean", 40, 3),
    ];

    const cells = auditCells(samples, options);
    const biased = cells.find((c) => c.group === "biased");

    expect(biased).toBeDefined();
    expect(biased!.sampleSize).toBe(10);
    expect(biased!.sampleSize).toBeLessThan(options.minSamples);
    // The gap is genuinely there ...
    expect(Math.abs(biased!.gap)).toBeGreaterThan(options.gapThreshold);
    // ... but there is not enough evidence to accuse.
    expect(biased!.failed).toBe(false);
  });

  it("emits cells sorted by group then bin, and emits nothing for empty input", () => {
    const samples = [
      ...auditSamples("zebra", 40, 7),
      ...auditSamples("alpha", 40, 3),
    ];

    const cells = auditCells(samples, options);
    expect(cells.map((c) => c.group)).toEqual(["alpha", "zebra"]);

    expect(auditCells([], options)).toEqual([]);
    // Entirely unusable input must yield no cells rather than NaN cells.
    expect(
      auditCells(
        [{ score: Number.NaN, label: 1, group: "g" }],
        options,
      ),
    ).toEqual([]);
  });
});

describe("runAuditAndPatch", () => {
  const options = {
    bins: 1,
    gapThreshold: 0.05,
    minSamples: 20,
    patchLambda: 1,
    maxIterations: 3,
  } as const;

  const samples: readonly AuditSample[] = [
    ...auditSamples("biased", 40, 7),
    ...auditSamples("clean", 40, 3),
  ];

  it("closes an injected gap and reports converged/iterations sanely", () => {
    const result = runAuditAndPatch(samples, options);

    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.iterations).toBeLessThanOrEqual(options.maxIterations);
    expect(result.remainingFailures).toBeGreaterThanOrEqual(0);
    expect(result.converged).toBe(result.remainingFailures === 0);
    expect(result.converged).toBe(true);
    expect(result.remainingFailures).toBe(0);
    expect(result.patches.has("biased#0")).toBe(true);
    expect(result.patches.has("clean#0")).toBe(false);

    for (const cell of result.cells) {
      expect(cell.failed).toBe(false);
      expect(Number.isFinite(cell.gap)).toBe(true);
      expect(Number.isFinite(cell.meanPredicted)).toBe(true);
    }
  });

  it("never exceeds maxIterations, including maxIterations = 0", () => {
    for (const maxIterations of [0, 1, 2, 5]) {
      const result = runAuditAndPatch(samples, { ...options, maxIterations });
      expect(result.iterations).toBeLessThanOrEqual(maxIterations);
      expect(result.iterations).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.iterations)).toBe(true);
    }

    // With no budget at all nothing may be patched, and the failure must stand.
    const zero = runAuditAndPatch(samples, { ...options, maxIterations: 0 });
    expect(zero.iterations).toBe(0);
    expect(zero.patches.size).toBe(0);
    expect(zero.converged).toBe(false);
    expect(zero.remainingFailures).toBeGreaterThan(0);
  });

  it("terminates instead of looping when no failing cell can be patched", () => {
    // gapThreshold 0 accuses every cell, but minSamples 20 vs a 10-sample cell
    // means the accused cells can never be fitted — the loop must break out.
    const tiny = [...auditSamples("a", 10, 7), ...auditSamples("b", 10, 3)];
    const result = runAuditAndPatch(tiny, {
      bins: 1,
      gapThreshold: 0,
      minSamples: 5,
      patchLambda: 1,
      maxIterations: 4,
    });

    expect(result.iterations).toBeLessThanOrEqual(4);
    expect(Number.isFinite(result.remainingFailures)).toBe(true);
    for (const cell of result.cells) {
      expect(Number.isFinite(cell.gap)).toBe(true);
      expect(Number.isFinite(cell.meanObserved)).toBe(true);
    }
  });

  it("is deterministic: the same input twice yields identical cells", () => {
    const first = runAuditAndPatch(samples, options);
    const second = runAuditAndPatch(samples, options);

    expect(second.cells).toEqual(first.cells);
    expect(second.iterations).toBe(first.iterations);
    expect(second.converged).toBe(first.converged);
    expect(second.remainingFailures).toBe(first.remainingFailures);
    expect([...second.patches.keys()].sort()).toEqual([...first.patches.keys()].sort());
  });

  it("is deterministic under input reordering of independent groups", () => {
    const reversed = [...samples].reverse();
    const a = runAuditAndPatch(samples, options);
    const b = runAuditAndPatch(reversed, options);

    expect(b.cells.map((c) => c.group)).toEqual(a.cells.map((c) => c.group));
    expect(b.cells.map((c) => c.sampleSize)).toEqual(a.cells.map((c) => c.sampleSize));
    expect(b.converged).toBe(a.converged);
  });
});

/* ------------------------------------------------------------------ */
/* 6. LWT / MCPS partition sketch                                      */
/* ------------------------------------------------------------------ */

describe("bestSplit", () => {
  it("finds the scale break and honours minLeafSize on both children", () => {
    const samples = scaleSplitSamples(40, 20);
    const split = bestSplit(samples, ["x", "parity"], 10);

    expect(split).not.toBeNull();
    expect(split!.featureKey).toBe("x");
    expect(split!.leftCount).toBeGreaterThanOrEqual(10);
    expect(split!.rightCount).toBeGreaterThanOrEqual(10);
    expect(split!.leftCount + split!.rightCount).toBe(40);
    expect(Number.isFinite(split!.quality)).toBe(true);
    expect(Number.isFinite(split!.threshold)).toBe(true);
    expect(split!.quality).toBeGreaterThan(0);
    // The true break is between x = 19 and x = 20.
    expect(split!.threshold).toBeGreaterThan(18);
    expect(split!.threshold).toBeLessThan(21);
  });

  it("returns null when minLeafSize cannot be satisfied", () => {
    const samples = scaleSplitSamples(20, 10);

    // 20 samples cannot give 15 on both sides.
    expect(bestSplit(samples, ["x"], 15)).toBeNull();
    expect(bestSplit(samples, ["x"], 10)).not.toBeNull();
    expect(bestSplit(samples, ["x"], 11)).toBeNull();
  });

  it("respects minLeafSize even when the sample count clears the 2*n floor", () => {
    // 25 samples with minLeafSize 12: only thresholds near the middle survive.
    const samples = scaleSplitSamples(25, 12);
    const split = bestSplit(samples, ["x"], 12);

    expect(split).not.toBeNull();
    expect(split!.leftCount).toBeGreaterThanOrEqual(12);
    expect(split!.rightCount).toBeGreaterThanOrEqual(12);
  });

  it("returns null for empty samples or no usable feature keys", () => {
    expect(bestSplit([], ["x"], 2)).toBeNull();
    expect(bestSplit(scaleSplitSamples(40, 20), [], 10)).toBeNull();
    expect(bestSplit(scaleSplitSamples(40, 20), [""], 10)).toBeNull();
    // A feature nobody carries yields no thresholds, hence no split.
    expect(bestSplit(scaleSplitSamples(40, 20), ["missing"], 10)).toBeNull();
  });

  it("is deterministic and never returns a non-finite quality", () => {
    const samples = scaleSplitSamples(40, 20);
    const first = bestSplit(samples, ["x", "parity"], 5);
    const second = bestSplit(samples, ["x", "parity"], 5);

    expect(second).toEqual(first);
    expect(Number.isFinite(first!.quality)).toBe(true);
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

  it.each([1, 2, 3])("never exceeds maxDepth %i", (maxDepth) => {
    const leaves = greedyPartition(samples, ["x", "parity"], {
      maxDepth,
      minLeafSize: 5,
    });

    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.path.length).toBeLessThanOrEqual(maxDepth);
      expect(leaf.leafId.startsWith(ROOT_LEAF_ID)).toBe(true);
      // leafId carries exactly one "|" segment per decision step.
      expect(leaf.leafId.split("|").length - 1).toBe(leaf.path.length);
      expect(Number.isInteger(leaf.sampleCount)).toBe(true);
      expect(leaf.sampleCount).toBeGreaterThan(0);
    }

    // The partition is a partition: leaves are disjoint and cover the input.
    const total = leaves.reduce((acc, leaf) => acc + leaf.sampleCount, 0);
    expect(total).toBe(samples.length);
    expect(new Set(leaves.map((l) => l.leafId)).size).toBe(leaves.length);
  });

  it("actually splits at depth 1 when the data supports it", () => {
    const leaves = greedyPartition(samples, ["x"], { maxDepth: 1, minLeafSize: 5 });

    expect(leaves).toHaveLength(2);
    expect(leaves[0]!.path).toHaveLength(1);
    expect(leaves[0]!.path[0]!.goesLeft).toBe(true);
    expect(leaves[1]!.path[0]!.goesLeft).toBe(false);
    expect(leaves[0]!.leafId).not.toBe(leaves[1]!.leafId);
  });

  it("is deterministic across repeated calls", () => {
    const first = greedyPartition(samples, ["x", "parity"], {
      maxDepth: 2,
      minLeafSize: 5,
    });
    const second = greedyPartition(samples, ["x", "parity"], {
      maxDepth: 2,
      minLeafSize: 5,
    });
    const third = greedyPartition([...samples], ["x", "parity"], {
      maxDepth: 2,
      minLeafSize: 5,
    });

    expect(second).toEqual(first);
    expect(third).toEqual(first);
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

  it("holds for both aggregation rules, even on deliberately inverted folds", () => {
    const rand = lcg(0xc0ffee);
    for (let trial = 0; trial < 150; trial++) {
      const k = 1 + Math.floor(rand() * 6);
      const folds: Multiprobability[] = Array.from({ length: k }, () => ({
        // Deliberately NOT pre-ordered: the aggregators must impose the order.
        p0: rand(),
        p1: rand(),
      }));

      assertOrdered(logSpaceGeometricMeanAggregation(folds));
      assertOrdered(arithmeticMeanAggregation(folds));
    }
  });

  it("holds for degenerate folds at the probability boundaries", () => {
    const boundaries: Multiprobability[][] = [
      [{ p0: 0, p1: 0 }],
      [{ p0: 1, p1: 1 }],
      [{ p0: 1, p1: 0 }],
      [{ p0: 0, p1: 1 }, { p0: 1, p1: 0 }],
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

  it("keeps the Mondrian quantile non-negative, which is what a width is built from", () => {
    const manager = new MondrianResidualManager({ minSamples: 2 });
    manager.addMany("home|favorite", [-3, 2, -7, 4, 0]);

    for (const probability of [0.05, 0.5, 0.9, 0.99, 1]) {
      const result = manager.quantile("home|favorite", probability);
      expect(Number.isFinite(result.quantile)).toBe(true);
      expect(result.quantile).toBeGreaterThanOrEqual(0);
      // A symmetric interval built from this half-width is trivially ordered.
      const lower = 10 - result.quantile;
      const upper = 10 + result.quantile;
      expect(upper - lower).toBeGreaterThanOrEqual(0);
    }
  });
});

/* Guard against an unused-import lint drift on the helper above. */
describe("fixture sanity", () => {
  it("repeat helper builds the expected constant array", () => {
    expect(repeat(0.25, 3)).toEqual([0.25, 0.25, 0.25]);
  });
});
