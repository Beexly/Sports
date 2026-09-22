/**
 * Interval-score ROC curves for forecast assessment — arXiv 2607.28178
 * ("An Interval–Score ROC Curve for Assessment, Calibration and
 * Ensembling of Probabilistic Forecasts").
 *
 * ADDITIVE utility. Diagnostic and ensembling-analysis tool; not wired
 * into any publish path (wiring changes published intervals and is a
 * NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: for each sub-model, trace the empirical IS-ROC curve —
 * mean interval score vs empirical coverage across the alpha grid.
 * Crossing curves reveal regime-specific dominance that scalar metrics
 * hide. Assign per-coverage-level the best sub-model via the global lower
 * convex hull, and apply tangent calibration: at the target coverage, the
 * hull's tangent slope gives the local trade-off used to correct
 * systematic over/under-confidence (scale the interval by the tangent
 * factor).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT IS-ROC calibration as the
 * engine's standard interval-diagnostic if (a) at least one sub-model pair
 * shows crossing curves (regime-specific dominance the scalars hid), or
 * (b) tangent calibration reduces 90% interval score by >=3% on held-out
 * games; otherwise keep as a diagnostic-only tool.
 */

import { winklerScore } from "./mscp-intervals";

export interface IsRocPoint {
  /** Empirical coverage. */
  readonly coverage: number;
  /** Mean interval score at this alpha. */
  readonly score: number;
  readonly alpha: number;
}

export interface Interval {
  readonly lo: number;
  readonly hi: number;
}

/**
 * Empirical IS-ROC curve for one sub-model's intervals: for each alpha,
 * point = (empirical coverage, mean interval score). Sorted by coverage.
 */
export function isRocCurve(
  intervals: ReadonlyArray<Interval>,
  actuals: readonly number[],
  alphas: readonly number[],
): IsRocPoint[] {
  const n = Math.min(intervals.length, actuals.length);
  const pts = alphas.map((alpha) => {
    let covered = 0;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const iv = intervals[i]!;
      const y = actuals[i]!;
      if (y >= iv.lo && y <= iv.hi) covered++;
      s += winklerScore(iv.lo, iv.hi, y, alpha);
    }
    return {
      coverage: n === 0 ? Number.NaN : covered / n,
      score: n === 0 ? Number.NaN : s / n,
      alpha,
    };
  });
  return pts.sort((a, b) => a.coverage - b.coverage);
}

/**
 * Lower convex hull of (coverage, score) points (Andrew's monotone chain
 * on the lower hull): the efficient frontier for model selection.
 */
export function lowerConvexHull(points: ReadonlyArray<IsRocPoint>): IsRocPoint[] {
  const pts = [...points]
    .filter((p) => Number.isFinite(p.coverage) && Number.isFinite(p.score))
    .sort((a, b) => a.coverage - b.coverage || a.score - b.score);
  if (pts.length <= 1) return pts;
  const cross = (o: IsRocPoint, a: IsRocPoint, b: IsRocPoint) =>
    (a.coverage - o.coverage) * (b.score - o.score) -
    (a.score - o.score) * (b.coverage - o.coverage);
  const hull: IsRocPoint[] = [];
  for (const p of pts) {
    while (hull.length >= 2 && cross(hull[hull.length - 2]!, hull[hull.length - 1]!, p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }
  return hull;
}

/**
 * Detect crossing curves: two models' IS-ROC curves cross when their
 * score ordering flips between the low-coverage and high-coverage ends.
 */
export function curvesCross(a: ReadonlyArray<IsRocPoint>, b: ReadonlyArray<IsRocPoint>): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const first = Math.sign(a[0]!.score - b[0]!.score);
  const last = Math.sign(a[a.length - 1]!.score - b[b.length - 1]!.score);
  return first !== 0 && last !== 0 && first !== last;
}

/**
 * Tangent slope of the hull at target coverage (linear interpolation
 * between bracketing hull points): d(score)/d(coverage). Used for tangent
 * calibration — the local price of coverage.
 */
export function tangentSlopeAt(
  hull: ReadonlyArray<IsRocPoint>,
  targetCoverage: number,
): number {
  if (hull.length < 2) return Number.NaN;
  for (let i = 0; i < hull.length - 1; i++) {
    const p0 = hull[i]!;
    const p1 = hull[i + 1]!;
    if (targetCoverage >= p0.coverage && targetCoverage <= p1.coverage) {
      const dx = p1.coverage - p0.coverage;
      if (dx === 0) return Number.NaN;
      return (p1.score - p0.score) / dx;
    }
  }
  // Extrapolate with the nearest segment.
  const p0 = hull[hull.length - 2]!;
  const p1 = hull[hull.length - 1]!;
  const dx = p1.coverage - p0.coverage;
  return dx === 0 ? Number.NaN : (p1.score - p0.score) / dx;
}

/**
 * Per-coverage-level model assignment: at each target coverage, the
 * sub-model with the lowest hull-interpolated score wins.
 */
export function bestModelPerCoverage(
  hulls: Readonly<Record<string, ReadonlyArray<IsRocPoint>>>,
  targetCoverages: readonly number[],
): Readonly<Record<number, string>> {
  const out: Record<number, string> = {};
  for (const tc of targetCoverages) {
    let bestModel = "";
    let bestScore = Number.POSITIVE_INFINITY;
    for (const [model, hull] of Object.entries(hulls)) {
      const s = interpolatedScore(hull, tc);
      if (s < bestScore) {
        bestScore = s;
        bestModel = model;
      }
    }
    out[tc] = bestModel;
  }
  return out;
}

/** Linear interpolation of hull score at a coverage level. */
export function interpolatedScore(
  hull: ReadonlyArray<IsRocPoint>,
  coverage: number,
): number {
  if (hull.length === 0) return Number.NaN;
  if (hull.length === 1) return hull[0]!.score;
  for (let i = 0; i < hull.length - 1; i++) {
    const p0 = hull[i]!;
    const p1 = hull[i + 1]!;
    if (coverage >= p0.coverage && coverage <= p1.coverage) {
      const dx = p1.coverage - p0.coverage;
      const w = dx === 0 ? 0 : (coverage - p0.coverage) / dx;
      return p0.score + w * (p1.score - p0.score);
    }
  }
  return coverage < hull[0]!.coverage ? hull[0]!.score : hull[hull.length - 1]!.score;
}
