/**
 * Localized Weighted / Mondrian Conformal Partition Sketch (LWT / MCPS).
 *
 * WHY this module exists: the fixed sports taxonomy in sports-taxonomy.ts is
 * hand-authored (home/away x favorite/underdog x rest bucket). It is a good
 * prior, but it cannot discover that — say — residual scale explodes only for
 * long-rest road underdogs in primetime. This module is the first step toward
 * LEARNING the Mondrian partition from the residuals themselves: it searches
 * axis-aligned binary splits of a feature space, scoring each candidate with
 * splitQuality (Brown-Forsythe variance heterogeneity + a small Welch mean-shift
 * bonus) from levene-welch.ts, and emits leaf definitions whose ids are shaped
 * so the existing MondrianResidualManager can key residual stores by them.
 *
 * WHAT THIS IS NOT — read this before trusting anything downstream:
 *
 *  1. This is a GREEDY, BOUNDED-DEPTH PROTOTYPE (default maxDepth 2). It is not
 *     the full LWT/MCPS construction. There is no localized kernel weighting, no
 *     honest sample splitting inside the grower, no pruning, no cross-validated
 *     depth selection, no multi-way or oblique splits, no surrogate handling for
 *     missing features. A full recursive tree grower is deliberately deferred.
 *
 *  2. It does NOT by itself provide the LWT/MCPS theoretical coverage
 *     guarantee. Nothing in this file computes a conformal quantile. The only
 *     conformal validity available here is INHERITED from
 *     MondrianResidualManager.quantile — its per-category (n+1) finite-sample
 *     correction and its parent/global fallback chain. That is why leafQuantile
 *     delegates instead of reimplementing the quantile: reimplementing it would
 *     be the easiest possible way to silently lose the correction.
 *
 *  3. EXCHANGEABILITY WARNING, stated plainly: choosing the split points by
 *     looking at the SAME residuals that later populate the calibration store
 *     breaks exchangeability. The partition then depends on the calibration
 *     data, the per-leaf residuals are no longer exchangeable with a future test
 *     residual, and the (n+1) quantile's coverage guarantee no longer holds —
 *     realized coverage will typically sit BELOW nominal, because the search
 *     actively hunts for the leaves with the most extreme residual spread. The
 *     only sound usage is: fit the partition (bestSplit / greedyPartition) on a
 *     SEPARATE fold, freeze the resulting LeafDefinitions, and only then feed a
 *     disjoint calibration fold into the manager keyed by those frozen leaf ids.
 *     This module does not and cannot enforce that discipline — the caller must.
 *     Treat any coverage number produced without that separation as diagnostic,
 *     not as a guarantee.
 *
 * Leaf ids are built as "|"-joined decision-path segments starting at "root", so
 * that parentCategory() (which drops the last "|" segment) walks a leaf up to
 * its own parent node in this very tree. That makes the manager's sparse-leaf
 * fallback chain coincide with the tree's ancestry for free.
 *
 * Every function here is pure and total: no throws, no NaN, no Infinity.
 */

import { splitQuality } from "./levene-welch.js";
import type { MondrianResidualManager, QuantileLookupResult } from "./mondrian.js";

/** Root node id; every leaf id is this plus its decision-path segments. */
export const ROOT_LEAF_ID = "root";

/** Returned by assignLeafId when the features do not satisfy the given path. */
export const UNMATCHED_LEAF_ID = "unmatched";

/**
 * Upper bound on candidate thresholds evaluated per feature. When a feature has
 * more than this many interior midpoints, we SUBSAMPLE to exactly this many
 * quantile-spaced (rank-spaced over the sorted unique values) candidates rather
 * than scanning all of them. This is a deliberate cost/fidelity trade: it keeps
 * bestSplit O(featureKeys * 32 * n) instead of O(featureKeys * n^2), at the
 * price of possibly missing the single globally optimal threshold. Saying so
 * explicitly because it is an approximation, not an exact search.
 */
const MAX_THRESHOLD_CANDIDATES = 32;

/** One scored axis-aligned binary split candidate. */
export interface SplitCandidate {
  readonly featureKey: string;
  /** Samples with a finite feature value <= threshold go LEFT. */
  readonly threshold: number;
  /** splitQuality score of the two residual children. Higher is better. */
  readonly quality: number;
  readonly leftCount: number;
  readonly rightCount: number;
}

/** A single decision-path step: which test, and which side was taken. */
export interface LeafPathStep {
  readonly featureKey: string;
  readonly threshold: number;
  readonly goesLeft: boolean;
}

/** A terminal region of the learned partition. */
export interface LeafDefinition {
  /** "root" plus one "|"-joined segment per decision-path step. */
  readonly leafId: string;
  readonly path: readonly LeafPathStep[];
  /** Number of training samples that reached this leaf. */
  readonly sampleCount: number;
}

/** One observation available to the partition search. */
export interface PartitionSample {
  readonly features: Readonly<Record<string, number>>;
  /** Conformity score / residual. Signed or absolute; only its spread matters. */
  readonly residual: number;
}

export interface GreedyPartitionOptions {
  /** Maximum decision-path length. Default 2 — this is an honest sketch. */
  readonly maxDepth?: number;
  /** Minimum samples each child must retain for a split to be valid. Default 10. */
  readonly minLeafSize?: number;
}

/**
 * Canonical, round-trip-stable text form of a threshold. toPrecision(12) strips
 * the last bits of float noise so that two paths that are numerically the same
 * split cannot produce two different leaf ids; Number(...) then normalizes away
 * trailing zeros and exponent formatting.
 */
function formatThreshold(threshold: number): string {
  if (!Number.isFinite(threshold)) return "nan";
  const normalized = Number(threshold.toPrecision(12));
  return Number.isFinite(normalized) ? String(normalized) : "nan";
}

/** "|" is the taxonomy's segment separator, so it must not appear inside a key. */
function sanitizeFeatureKey(featureKey: string): string {
  return featureKey.split("|").join("/");
}

/** Text form of one decision-path step. */
function formatStep(step: LeafPathStep): string {
  const key = sanitizeFeatureKey(step.featureKey);
  return `${key}${step.goesLeft ? "<=" : ">"}${formatThreshold(step.threshold)}`;
}

/** Build the deterministic leaf id for a decision path. */
function leafIdForPath(path: readonly LeafPathStep[]): string {
  let id = ROOT_LEAF_ID;
  for (const step of path) id += `|${formatStep(step)}`;
  return id;
}

/**
 * Routing rule, shared by scoring and by partitioning so counts always agree.
 * A missing or non-finite feature value is routed RIGHT. That is an arbitrary
 * but DETERMINISTIC default standing in for surrogate splits, which this sketch
 * does not implement; callers with meaningful missingness should impute before
 * calling rather than relying on this.
 */
function goesLeft(
  features: Readonly<Record<string, number>>,
  featureKey: string,
  threshold: number,
): boolean {
  const value = features[featureKey];
  if (value === undefined || !Number.isFinite(value)) return false;
  return value <= threshold;
}

/** Deduplicate feature keys, preserving the caller's order (determinism). */
function dedupeKeys(featureKeys: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of featureKeys) {
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Interior midpoints of the sorted unique finite values of one feature,
 * subsampled to at most MAX_THRESHOLD_CANDIDATES rank-spaced candidates.
 */
function thresholdCandidates(
  samples: readonly PartitionSample[],
  featureKey: string,
): number[] {
  const values: number[] = [];
  for (const s of samples) {
    const v = s.features[featureKey];
    if (v !== undefined && Number.isFinite(v)) values.push(v);
  }
  if (values.length < 2) return [];

  values.sort((a, b) => a - b);
  const unique: number[] = [];
  for (const v of values) {
    if (unique.length === 0 || unique[unique.length - 1]! !== v) unique.push(v);
  }
  if (unique.length < 2) return [];

  const midpointCount = unique.length - 1;
  const allMidpoints: number[] = [];
  for (let i = 0; i < midpointCount; i++) {
    const mid = (unique[i]! + unique[i + 1]!) / 2;
    // Averaging two finite doubles can still overflow to Infinity at extremes.
    if (Number.isFinite(mid) && mid >= unique[i]! && mid < unique[i + 1]!) {
      allMidpoints.push(mid);
    }
  }
  if (allMidpoints.length <= MAX_THRESHOLD_CANDIDATES) return allMidpoints;

  const picked: number[] = [];
  let previousIndex = -1;
  for (let j = 0; j < MAX_THRESHOLD_CANDIDATES; j++) {
    const index = Math.round(
      (j * (allMidpoints.length - 1)) / (MAX_THRESHOLD_CANDIDATES - 1),
    );
    if (index === previousIndex) continue;
    previousIndex = index;
    picked.push(allMidpoints[index]!);
  }
  return picked;
}

/**
 * Search every (feature, threshold) candidate and return the best VALID split,
 * or null when no candidate leaves at least minLeafSize samples on both sides
 * with a well-defined splitQuality.
 *
 * Ordering is fully deterministic: features in the caller's (deduplicated)
 * order, thresholds ascending, and ties broken by keeping the FIRST candidate
 * encountered — a later candidate must be strictly better to win.
 */
export function bestSplit(
  samples: readonly PartitionSample[],
  featureKeys: readonly string[],
  minLeafSize = 10,
): SplitCandidate | null {
  if (samples.length === 0) return null;

  const keys = dedupeKeys(featureKeys);
  if (keys.length === 0) return null;

  // splitQuality itself needs >= 2 finite residuals per side; a minLeafSize
  // below that would only produce candidates it must reject.
  const floor = Number.isFinite(minLeafSize) ? Math.max(2, Math.floor(minLeafSize)) : 10;
  if (samples.length < 2 * floor) return null;

  let best: SplitCandidate | null = null;

  for (const featureKey of keys) {
    for (const threshold of thresholdCandidates(samples, featureKey)) {
      const left: number[] = [];
      const right: number[] = [];
      for (const s of samples) {
        if (!Number.isFinite(s.residual)) continue;
        if (goesLeft(s.features, featureKey, threshold)) left.push(s.residual);
        else right.push(s.residual);
      }
      if (left.length < floor || right.length < floor) continue;

      const quality = splitQuality(left, right);
      if (!quality.valid || !Number.isFinite(quality.score)) continue;

      if (best === null || quality.score > best.quality) {
        best = {
          featureKey,
          threshold,
          quality: quality.score,
          leftCount: left.length,
          rightCount: right.length,
        };
      }
    }
  }

  return best;
}

/**
 * Deterministic leaf id for a feature vector under a given decision path.
 *
 * The id is a pure function of the path, so the same path always yields the
 * same key regardless of which sample produced it. The features are checked
 * against the path: if they do not actually satisfy every step (i.e. this
 * vector belongs to a different leaf), UNMATCHED_LEAF_ID is returned rather
 * than a leaf id the vector does not really live in. Callers routing a live
 * sample should walk the tree and pass the path they actually took.
 */
export function assignLeafId(
  features: Readonly<Record<string, number>>,
  path: readonly LeafPathStep[],
): string {
  for (const step of path) {
    if (goesLeft(features, step.featureKey, step.threshold) !== step.goesLeft) {
      return UNMATCHED_LEAF_ID;
    }
  }
  return leafIdForPath(path);
}

function growLeaves(
  samples: readonly PartitionSample[],
  keys: readonly string[],
  path: readonly LeafPathStep[],
  depthRemaining: number,
  minLeafSize: number,
  out: LeafDefinition[],
): void {
  const terminate = (): void => {
    out.push({ leafId: leafIdForPath(path), path: [...path], sampleCount: samples.length });
  };

  if (depthRemaining <= 0 || samples.length < 2 * minLeafSize) {
    terminate();
    return;
  }

  const split = bestSplit(samples, keys, minLeafSize);
  if (split === null) {
    terminate();
    return;
  }

  const left: PartitionSample[] = [];
  const right: PartitionSample[] = [];
  for (const s of samples) {
    if (goesLeft(s.features, split.featureKey, split.threshold)) left.push(s);
    else right.push(s);
  }

  // Defensive: bestSplit scored only finite-residual samples, so the routed
  // counts can exceed the scored ones but never fall below minLeafSize by more.
  if (left.length === 0 || right.length === 0) {
    terminate();
    return;
  }

  // Left subtree first, always — depth-first, left-to-right leaf ordering.
  growLeaves(
    left,
    keys,
    [...path, { featureKey: split.featureKey, threshold: split.threshold, goesLeft: true }],
    depthRemaining - 1,
    minLeafSize,
    out,
  );
  growLeaves(
    right,
    keys,
    [...path, { featureKey: split.featureKey, threshold: split.threshold, goesLeft: false }],
    depthRemaining - 1,
    minLeafSize,
    out,
  );
}

/**
 * Grow a greedy, bounded-depth partition and return its leaves in depth-first,
 * left-to-right order (deterministic for identical inputs).
 *
 * maxDepth defaults to 2 on purpose: two levels give at most four regions,
 * which is about as much adaptivity as can be justified without the honest
 * fold-splitting and pruning machinery described in this module's header. An
 * empty sample set yields no leaves (not a fictitious empty root).
 */
export function greedyPartition(
  samples: readonly PartitionSample[],
  featureKeys: readonly string[],
  options: GreedyPartitionOptions = {},
): readonly LeafDefinition[] {
  if (samples.length === 0) return [];

  const rawDepth = options.maxDepth ?? 2;
  const maxDepth = Number.isFinite(rawDepth) ? Math.max(0, Math.floor(rawDepth)) : 2;
  const rawMin = options.minLeafSize ?? 10;
  const minLeafSize = Number.isFinite(rawMin) ? Math.max(2, Math.floor(rawMin)) : 10;

  const keys = dedupeKeys(featureKeys);
  const out: LeafDefinition[] = [];
  growLeaves(samples, keys, [], maxDepth, minLeafSize, out);
  return out;
}

/**
 * Residual quantile for one learned leaf.
 *
 * Deliberately a thin delegation to MondrianResidualManager.quantile so that
 * the split-conformal (n+1) finite-sample correction AND the parent/global
 * fallback chain are REUSED rather than reimplemented here. Because leaf ids
 * are "|"-joined decision paths, the manager's parent fallback walks a sparse
 * leaf up to its own parent node in this tree before reaching "root" and then
 * the global store.
 *
 * The inherited coverage guarantee is only meaningful if the partition was fit
 * on a fold disjoint from the residuals in the manager — see the module header.
 *
 * A non-finite probability, or one outside (0, 1], is refused with an honest
 * zero-quantile result instead of being clamped into a number that would look
 * like a real interval half-width.
 */
export function leafQuantile(
  manager: MondrianResidualManager,
  leafId: string,
  probability: number,
): QuantileLookupResult {
  if (!Number.isFinite(probability) || probability <= 0 || probability > 1) {
    return {
      category: leafId,
      quantile: 0,
      sampleSize: manager.size(leafId),
      usedFallback: false,
      fallbackChain: [leafId],
    };
  }
  return manager.quantile(leafId, probability);
}
