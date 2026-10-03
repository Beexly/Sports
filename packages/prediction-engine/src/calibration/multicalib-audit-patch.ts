/**
 * Multicalibration Audit-and-Patch
 *
 * A global calibration curve can look perfect in aggregate while being badly
 * wrong on a subpopulation ("home underdogs at short prices", "NBA totals in
 * back-to-backs"). Aggregate reliability plots hide those failures because the
 * over- and under-confident cells cancel. This module makes them visible and
 * then repairs them: audit every (group × score-bin) cell for a calibration
 * gap, flag the cells that fail with enough evidence to accuse, fit a local
 * isotonic patch on exactly those cells, re-score, and re-audit until the
 * failures are gone or the iteration budget is spent.
 *
 * SCOPE — read this before assuming more than is delivered.
 * This is the BINARY / group-indicator special case of multicalibration: the
 * function class is the set of indicator functions over a finite, explicitly
 * supplied set of group labels, crossed with score bins. Full Venn-style
 * multicalibration over arbitrary (real-valued, learned, or adaptively chosen)
 * function classes is DELIBERATELY DEFERRED and is NOT implemented here. No
 * multiaccuracy guarantee over unseen or continuous subgroups is claimed or
 * implied. Groups must be named up front; overlapping groups must be encoded by
 * the caller as separate group labels on duplicated samples.
 *
 * Pure functions, deterministic output (groups and bins are emitted in sorted
 * order). Reuses fitLocalIsotonicPatch / applyLocalIsotonicPatch; does not
 * touch the PAV or IVAP cores.
 */

import {
  applyLocalIsotonicPatch,
  fitLocalIsotonicPatch,
  type LocalIsotonicPatchResult,
  type LocalPatchPoint,
} from "./local-isotonic-patch.js";

export interface AuditSample {
  /** Model score / predicted probability being audited. */
  readonly score: number;
  readonly label: 0 | 1;
  /** Group label. Overlapping memberships must be encoded as separate samples. */
  readonly group: string;
  /** Optional positive sample weight (default 1). */
  readonly weight?: number;
}

export type BinningStrategy = "equal-mass" | "equal-width";

export interface AuditCell {
  readonly group: string;
  readonly binIndex: number;
  readonly binLo: number;
  readonly binHi: number;
  readonly sampleSize: number;
  readonly meanPredicted: number;
  readonly meanObserved: number;
  /** meanObserved - meanPredicted. Positive = model is under-predicting this cell. */
  readonly gap: number;
  readonly failed: boolean;
}

export interface MulticalibAuditOptions {
  /** Number of score bins (default 10). */
  readonly bins?: number;
  /** How bin edges are chosen (default "equal-mass"). */
  readonly strategy?: BinningStrategy;
  /** |gap| strictly above this marks a cell failed (default 0.05). */
  readonly gapThreshold?: number;
  /** Minimum cell sample size before a cell may be accused / patched (default 20). */
  readonly minSamples?: number;
  /**
   * Blend strength handed to the local isotonic patch (default 1).
   * Deviation from the local-patch default of 0.5: an audit-and-patch loop with
   * a small iteration budget needs full correction to actually close the gap.
   */
  readonly patchLambda?: number;
}

export interface AuditAndPatchResult {
  readonly iterations: number;
  /** Cells from the FINAL audit, i.e. after every patch has been applied. */
  readonly cells: readonly AuditCell[];
  /** Accumulated patches keyed `${group}#${binIndex}`; later iterations win. */
  readonly patches: ReadonlyMap<string, LocalIsotonicPatchResult>;
  readonly converged: boolean;
  readonly remainingFailures: number;
}

const DEFAULT_BINS = 10;
const DEFAULT_STRATEGY: BinningStrategy = "equal-mass";
const DEFAULT_GAP_THRESHOLD = 0.05;
const DEFAULT_MIN_SAMPLES = 20;
const DEFAULT_PATCH_LAMBDA = 1;

interface ResolvedOptions {
  readonly bins: number;
  readonly strategy: BinningStrategy;
  readonly gapThreshold: number;
  readonly minSamples: number;
  readonly patchLambda: number;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

function resolveOptions(options: MulticalibAuditOptions): ResolvedOptions {
  const rawBins = options.bins ?? DEFAULT_BINS;
  const bins = Number.isFinite(rawBins) ? Math.max(1, Math.floor(rawBins)) : DEFAULT_BINS;

  const rawGap = options.gapThreshold ?? DEFAULT_GAP_THRESHOLD;
  const gapThreshold = Number.isFinite(rawGap) ? Math.max(0, rawGap) : DEFAULT_GAP_THRESHOLD;

  const rawMin = options.minSamples ?? DEFAULT_MIN_SAMPLES;
  const minSamples = Number.isFinite(rawMin) ? Math.max(1, Math.floor(rawMin)) : DEFAULT_MIN_SAMPLES;

  const rawLambda = options.patchLambda ?? DEFAULT_PATCH_LAMBDA;
  const patchLambda = Number.isFinite(rawLambda) ? Math.min(1, Math.max(0, rawLambda)) : DEFAULT_PATCH_LAMBDA;

  return {
    bins,
    strategy: options.strategy ?? DEFAULT_STRATEGY,
    gapThreshold,
    minSamples,
    patchLambda,
  };
}

/** Drop samples that cannot honestly contribute (NaN/Inf score, bad label, bad weight). */
function usableSamples(samples: readonly AuditSample[]): AuditSample[] {
  const out: AuditSample[] = [];
  for (const s of samples) {
    if (!Number.isFinite(s.score)) continue;
    if (s.label !== 0 && s.label !== 1) continue;
    if (s.weight !== undefined && (!Number.isFinite(s.weight) || s.weight <= 0)) continue;
    out.push(s);
  }
  return out;
}

function weightOf(s: AuditSample): number {
  return s.weight !== undefined ? Math.max(Number.EPSILON, s.weight) : 1;
}

/**
 * Bin edges of length bins+1, non-decreasing. Empty input yields an empty array,
 * which callers treat as "no bins, no cells".
 */
function computeEdges(scores: readonly number[], opts: ResolvedOptions): number[] {
  const n = scores.length;
  if (n === 0) return [];

  if (opts.strategy === "equal-width") {
    let lo = scores[0]!;
    let hi = scores[0]!;
    for (const v of scores) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!(hi > lo)) return [lo, hi];
    const edges = new Array<number>(opts.bins + 1);
    const width = (hi - lo) / opts.bins;
    for (let j = 0; j <= opts.bins; j++) edges[j] = lo + width * j;
    edges[opts.bins] = hi;
    return edges;
  }

  // equal-mass: quantile edges over the observed score distribution.
  const sorted = [...scores].sort((a, b) => a - b);
  const edges = new Array<number>(opts.bins + 1);
  edges[0] = sorted[0]!;
  edges[opts.bins] = sorted[n - 1]!;
  for (let j = 1; j < opts.bins; j++) {
    const idx = Math.min(n - 1, Math.floor((j * n) / opts.bins));
    edges[j] = sorted[idx]!;
  }
  // Enforce monotone edges (duplicated scores can produce equal edges; that is
  // fine — the corresponding bin is simply empty).
  for (let j = 1; j <= opts.bins; j++) {
    if (edges[j]! < edges[j - 1]!) edges[j] = edges[j - 1]!;
  }
  return edges;
}

/** Index of the bin owning `score`, given edges. Returns -1 when there are no bins. */
function binIndexFor(score: number, edges: readonly number[]): number {
  const binCount = edges.length - 1;
  if (binCount < 1) return -1;
  if (score <= edges[0]!) return 0;
  if (score >= edges[binCount]!) return binCount - 1;
  for (let j = 0; j < binCount; j++) {
    if (score < edges[j + 1]!) return j;
  }
  return binCount - 1;
}

interface CellAccumulator {
  group: string;
  binIndex: number;
  count: number;
  weightSum: number;
  weightedScoreSum: number;
  weightedLabelSum: number;
}

function accumulateCells(
  samples: readonly AuditSample[],
  edges: readonly number[],
): Map<string, CellAccumulator> {
  const acc = new Map<string, CellAccumulator>();
  for (const s of samples) {
    const binIndex = binIndexFor(s.score, edges);
    if (binIndex < 0) continue;
    const key = `${s.group}#${binIndex}`;
    let cell = acc.get(key);
    if (cell === undefined) {
      cell = {
        group: s.group,
        binIndex,
        count: 0,
        weightSum: 0,
        weightedScoreSum: 0,
        weightedLabelSum: 0,
      };
      acc.set(key, cell);
    }
    const w = weightOf(s);
    cell.count += 1;
    cell.weightSum += w;
    cell.weightedScoreSum += w * s.score;
    cell.weightedLabelSum += w * s.label;
  }
  return acc;
}

/**
 * Audit every populated (group × score-bin) cell for a calibration gap.
 *
 * Cells with fewer than `minSamples` observations are reported but NEVER marked
 * failed — too little evidence to accuse. Empty cells are not emitted at all.
 * Output is sorted by group (lexicographic), then bin index (ascending).
 */
export function auditCells(
  samples: readonly AuditSample[],
  options: MulticalibAuditOptions = {},
): readonly AuditCell[] {
  const opts = resolveOptions(options);
  const valid = usableSamples(samples);
  if (valid.length === 0) return [];

  const edges = computeEdges(
    valid.map((s) => s.score),
    opts,
  );
  if (edges.length < 2) return [];

  const acc = accumulateCells(valid, edges);

  const cells: AuditCell[] = [];
  for (const cell of acc.values()) {
    const wSum = cell.weightSum;
    const meanPredicted = wSum > 0 ? cell.weightedScoreSum / wSum : 0;
    const meanObserved = wSum > 0 ? cell.weightedLabelSum / wSum : 0;
    const gap = Number.isFinite(meanObserved - meanPredicted) ? meanObserved - meanPredicted : 0;
    cells.push({
      group: cell.group,
      binIndex: cell.binIndex,
      binLo: edges[cell.binIndex]!,
      binHi: edges[cell.binIndex + 1]!,
      sampleSize: cell.count,
      meanPredicted,
      meanObserved,
      gap,
      failed: cell.count >= opts.minSamples && Math.abs(gap) > opts.gapThreshold,
    });
  }

  cells.sort((a, b) =>
    a.group === b.group ? a.binIndex - b.binIndex : a.group < b.group ? -1 : 1,
  );
  return cells;
}

/**
 * Fit one local isotonic patch per FAILED cell, using only that cell's samples.
 * Key format: `${group}#${binIndex}`. Cells that are not failed are skipped, and
 * a patch whose fit declines (too few samples) is not stored.
 *
 * `cells` must come from an `auditCells` call on the same samples/options, since
 * the bin edges are recomputed here to assign samples to cells.
 */
export function fitPatchesForFailures(
  samples: readonly AuditSample[],
  cells: readonly AuditCell[],
  options: MulticalibAuditOptions = {},
): ReadonlyMap<string, LocalIsotonicPatchResult> {
  const patches = new Map<string, LocalIsotonicPatchResult>();
  const opts = resolveOptions(options);
  const valid = usableSamples(samples);
  if (valid.length === 0) return patches;

  const failedKeys = new Set<string>();
  for (const c of cells) {
    if (c.failed) failedKeys.add(`${c.group}#${c.binIndex}`);
  }
  if (failedKeys.size === 0) return patches;

  const edges = computeEdges(
    valid.map((s) => s.score),
    opts,
  );
  if (edges.length < 2) return patches;

  const buckets = new Map<string, LocalPatchPoint[]>();
  for (const s of valid) {
    const binIndex = binIndexFor(s.score, edges);
    if (binIndex < 0) continue;
    const key = `${s.group}#${binIndex}`;
    if (!failedKeys.has(key)) continue;
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(
      s.weight !== undefined
        ? { score: s.score, label: s.label, weight: weightOf(s) }
        : { score: s.score, label: s.label },
    );
  }

  for (const key of [...buckets.keys()].sort()) {
    const points = buckets.get(key)!;
    const patch = fitLocalIsotonicPatch(points, {
      minSamples: opts.minSamples,
      lambda: opts.patchLambda,
      clamp: true,
    });
    if (patch.applied) patches.set(key, patch);
  }

  return patches;
}

/**
 * Apply the patch owning (group, score), if any, to a base probability.
 * Falls back to the clamped base probability when the group is unknown, no cell
 * covers the score, or the covering cell was never patched.
 */
export function applyPatches(
  baseProb: number,
  score: number,
  group: string,
  cells: readonly AuditCell[],
  patches: ReadonlyMap<string, LocalIsotonicPatchResult>,
): number {
  const base = clamp01(baseProb);
  if (!Number.isFinite(score) || patches.size === 0 || cells.length === 0) return base;

  let chosen: AuditCell | undefined;
  let lowest: AuditCell | undefined;
  let highest: AuditCell | undefined;

  for (const cell of cells) {
    if (cell.group !== group) continue;
    if (lowest === undefined || cell.binIndex < lowest.binIndex) lowest = cell;
    if (highest === undefined || cell.binIndex > highest.binIndex) highest = cell;
    if (score >= cell.binLo && score <= cell.binHi) {
      if (chosen === undefined || cell.binIndex < chosen.binIndex) chosen = cell;
    }
  }

  if (chosen === undefined) {
    if (lowest === undefined || highest === undefined) return base;
    chosen = score < lowest.binLo ? lowest : highest;
  }

  const patch = patches.get(`${chosen.group}#${chosen.binIndex}`);
  if (patch === undefined) return base;
  return applyLocalIsotonicPatch(base, score, patch);
}

/**
 * Iterative audit → patch → re-score → re-audit loop.
 *
 * Each round re-scores every sample through the patches fitted in THAT round,
 * so the next audit bins on the corrected scores. Stops early once an audit
 * finds no failing cells (converged), when no failing cell can actually be
 * patched, or when the iteration budget is exhausted (converged = false).
 */
export function runAuditAndPatch(
  samples: readonly AuditSample[],
  options: MulticalibAuditOptions & { readonly maxIterations?: number } = {},
): AuditAndPatchResult {
  const rawMax = options.maxIterations ?? 3;
  const maxIterations = Number.isFinite(rawMax) ? Math.max(0, Math.floor(rawMax)) : 3;

  const patches = new Map<string, LocalIsotonicPatchResult>();
  let current: AuditSample[] = usableSamples(samples);
  let cells = auditCells(current, options);
  let iterations = 0;

  while (iterations < maxIterations && cells.some((c) => c.failed)) {
    const round = fitPatchesForFailures(current, cells, options);
    iterations += 1;
    if (round.size === 0) break;

    for (const key of [...round.keys()].sort()) {
      patches.set(key, round.get(key)!);
    }

    const roundCells = cells;
    current = current.map((s) => ({
      score: applyPatches(s.score, s.score, s.group, roundCells, round),
      label: s.label,
      group: s.group,
      ...(s.weight !== undefined ? { weight: s.weight } : {}),
    }));
    cells = auditCells(current, options);
  }

  let remainingFailures = 0;
  for (const c of cells) if (c.failed) remainingFailures += 1;

  return {
    iterations,
    cells,
    patches,
    converged: remainingFailures === 0,
    remainingFailures,
  };
}
