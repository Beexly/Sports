/**
 * Local Isotonic Patch
 *
 * Used by multicalibration audit-and-patch loops: on a detected group × bin
 * violation, fit a local PAV / isotonic correction and softly blend it back
 * into the base probability map with strength λ.
 *
 * Pure functions. Min-sample guards prevent overfitting on tiny groups.
 * Reuses the extracted pavIsotonic; does not touch IVAP core.
 */

import { pavIsotonic } from "./pav.js";

export interface LocalPatchPoint {
  readonly score: number;
  readonly label: 0 | 1;
  /** Optional sample weight */
  readonly weight?: number;
}

export interface LocalIsotonicPatchOptions {
  /** Minimum samples required to apply a patch (default 20). */
  readonly minSamples?: number;
  /** Soft blend strength in [0, 1]. 0 = no patch, 1 = full local isotonic. Default 0.5. */
  readonly lambda?: number;
  /** Whether to clamp fitted values to [0, 1]. Default true. */
  readonly clamp?: boolean;
}

export interface LocalIsotonicPatchResult {
  readonly applied: boolean;
  readonly sampleSize: number;
  /** Score-sorted unique knot points and fitted values (for lookup). */
  readonly knots: readonly { score: number; fitted: number }[];
  readonly lambda: number;
  readonly reason?: string;
}

function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

/**
 * Fit a local isotonic regression on a group/bin subset.
 * Returns knots for later interpolation / nearest-neighbor lookup.
 */
export function fitLocalIsotonicPatch(
  points: readonly LocalPatchPoint[],
  options: LocalIsotonicPatchOptions = {},
): LocalIsotonicPatchResult {
  const minSamples = options.minSamples ?? 20;
  const lambda = Math.min(1, Math.max(0, options.lambda ?? 0.5));
  const doClamp = options.clamp ?? true;

  if (points.length < minSamples) {
    return {
      applied: false,
      sampleSize: points.length,
      knots: [],
      lambda,
      reason: `insufficient samples (${points.length} < ${minSamples})`,
    };
  }

  // Sort by score ascending
  const sorted = [...points].sort((a, b) => a.score - b.score);
  const ys = sorted.map((p) => p.label);
  const ws = sorted.map((p) => (p.weight !== undefined ? Math.max(Number.EPSILON, p.weight) : 1));

  let fitted = pavIsotonic(ys, ws);
  if (doClamp) {
    fitted = fitted.map(clamp01);
  }

  const knots = sorted.map((p, i) => ({
    score: p.score,
    fitted: fitted[i]!,
  }));

  return {
    applied: true,
    sampleSize: points.length,
    knots,
    lambda,
  };
}

/**
 * Apply a fitted local patch to a base probability at a given score.
 * Uses nearest-knot lookup (or linear interp between neighbors) then blends:
 *   p_patched = (1 - λ) * p_base + λ * p_local
 */
export function applyLocalIsotonicPatch(
  baseProb: number,
  score: number,
  patch: LocalIsotonicPatchResult,
): number {
  if (!patch.applied || patch.knots.length === 0 || patch.lambda <= 0) {
    return clamp01(baseProb);
  }

  const knots = patch.knots;
  // Nearest or linear interpolate
  let local: number;
  if (score <= knots[0]!.score) {
    local = knots[0]!.fitted;
  } else if (score >= knots[knots.length - 1]!.score) {
    local = knots[knots.length - 1]!.fitted;
  } else {
    // Find rightmost knot <= score
    let lo = 0;
    let hi = knots.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (knots[mid]!.score <= score) lo = mid;
      else hi = mid - 1;
    }
    const left = knots[lo]!;
    const right = knots[Math.min(lo + 1, knots.length - 1)]!;
    if (right.score === left.score) {
      local = left.fitted;
    } else {
      const t = (score - left.score) / (right.score - left.score);
      local = left.fitted + t * (right.fitted - left.fitted);
    }
  }

  const blended = (1 - patch.lambda) * baseProb + patch.lambda * local;
  return clamp01(blended);
}
