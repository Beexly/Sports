/**
 * Isotonic calibration map.
 *
 * WHY THIS EXISTS
 * ---------------
 * Measured on production (read-only Neon `gse-postgres`, 2026-09-30) over
 * 1,823 settled picks carrying `picks.factorBreakdown->independentEdge->trueProb`:
 *
 *   Brier, as published:            0.2484
 *   Brier, coin flip (p = 0.5):     0.2500
 *   ECE, as published:              0.0638
 *
 * So as a SCORE the model was worth 0.0016 over chance. But the RANKING is
 * genuinely informative:
 *
 *   published < 0.55        43.4% win   (n=364)
 *   published 0.55 - 0.65   58.2% win   (n=737)
 *   published > 0.65        61.8% win   (n=722)
 *
 * An 18.4-point monotone spread. The model DISCRIMINATES; its published
 * numbers are simply INFLATED — the mean published probability was 0.6185
 * against an actual win rate of 0.5666, about 5.2 points of overconfidence.
 *
 * That combination is the fixable case. A model with no ranking power needs a
 * rebuild; a model with ranking power and a miscalibrated level needs a MAP.
 * Fitting one on 1,276 picks and evaluating on the 547 held out:
 *
 *   Brier  0.2498 -> 0.2420      ECE  0.0638 -> 0.0274
 *
 * Both lookups (floor and piecewise-linear) give the same held-out Brier, so
 * the gain is not an artifact of the interpolation choice.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This map was fit on settled NFL picks pooled across bet types. Pooling bet
 * types is unsound in general — a SPREAD cover and a MONEYLINE win are
 * different questions — and `family-reliability.ts` documents that. The map is
 * therefore a MEASURED, honest recalibration of what is currently published,
 * not a claim that the model is correct for every market. Per-bet-type maps are
 * the follow-on and need per-type samples large enough to fit.
 *
 * It is also fit ONCE, on data already settled. It is deliberately not applied
 * anywhere automatically: activation is a MODEL_VERSION decision, and applying
 * an unactivated map would change customer-facing numbers without a recorded
 * decision, which is the exact failure this repo's doctrine exists to prevent.
 */

export interface CalibrationPoint {
  /** Published probability, ascending. */
  readonly published: number;
  /** Calibrated probability. Non-decreasing across the map. */
  readonly calibrated: number;
  /** Settled picks that fell in this cell. */
  readonly n: number;
}

export interface IsotonicMap {
  readonly points: readonly CalibrationPoint[];
  /** Cell count; the map's resolution. */
  readonly size: number;
}

/**
 * Pool-adjacent-violators. Fits a non-decreasing sequence to observations by
 * repeatedly merging adjacent blocks whose fitted values are out of order.
 * Returns the fitted value for every input, preserving input length.
 */
export function poolAdjacentViolators(values: readonly number[]): number[] {
  // Each block: [fittedValue, weight]
  const blocks: [number, number][] = values.map((v) => [v, 1]);
  let i = 0;
  while (i < blocks.length - 1) {
    // `noUncheckedIndexedAccess` is enabled in this repo, so index access is
    // `T | undefined`. The loop bound guarantees both exist; binding them to
    // locals satisfies the checker without a non-null assertion, which would
    // silence a real bug if the bound ever changed.
    const cur = blocks[i];
    const next = blocks[i + 1];
    if (cur === undefined || next === undefined) break;
    if (cur[0] > next[0]) {
      const w = cur[1] + next[1];
      const v = (cur[0] * cur[1] + next[0] * next[1]) / w;
      blocks.splice(i, 2, [v, w]);
      // A merge can create a violation to the left; re-check it.
      i = Math.max(i - 1, 0);
    } else {
      i += 1;
    }
  }
  const out: number[] = [];
  for (const [v, w] of blocks) {
    for (let k = 0; k < w; k += 1) out.push(v);
  }
  return out;
}

/**
 * Fit an isotonic map from settled (published, outcome) pairs.
 *
 * `cells` bounds the resolution: bins are formed on the published value, each
 * cell's outcome rate is averaged, and PAVA enforces monotonicity across cells.
 * A finer grid fits the training data more tightly and generalizes worse, so
 * the caller picks a floor on cell size rather than using every distinct value.
 */
export function fitIsotonicMap(
  settled: ReadonlyArray<readonly [published: number, outcome: number]>,
  opts: { readonly minCellSize?: number } = {},
): IsotonicMap {
  const minCellSize = opts.minCellSize ?? 25;
  if (settled.length < minCellSize) {
    throw new Error(
      `isotonic: ${settled.length} settled picks is below minCellSize ${minCellSize}; ` +
        `refusing to fit a map from a sample too small to be monotone`,
    );
  }

  // Sort by published probability, then greedily form equal-count cells.
  const sorted = [...settled].sort((a, b) => a[0] - b[0]);
  const nCells = Math.max(1, Math.floor(sorted.length / minCellSize));
  const cells: { pub: number[]; y: number[] }[] = [];
  for (let c = 0; c < nCells; c += 1) {
    const lo = Math.floor((c * sorted.length) / nCells);
    const hi = Math.floor(((c + 1) * sorted.length) / nCells);
    const slice = sorted.slice(lo, hi);
    if (slice.length === 0) continue;
    cells.push({ pub: slice.map((s) => s[0]), y: slice.map((s) => s[1]) });
  }

  const rates = cells.map((cell) => cell.y.reduce((a, b) => a + b, 0) / cell.y.length);
  const monotone = poolAdjacentViolators(rates);

  // PAVA preserves input length, so `monotone[i]` exists for every cell.
  // `noUncheckedIndexedAccess` cannot see that, and it should not have to: an
  // invariant violation here would silently write `undefined` into a customer
  // probability, so it is checked rather than asserted.
  const points: CalibrationPoint[] = cells.map((cell, i) => {
    const calibrated = monotone[i];
    if (calibrated === undefined) {
      throw new Error(
        `isotonic: PAVA returned ${monotone.length} values for ${cells.length} cells`,
      );
    }
    return {
      published: cell.pub.reduce((a, b) => a + b, 0) / cell.pub.length,
      calibrated,
      n: cell.y.length,
    };
  });

  return { points, size: points.length };
}

/**
 * Apply a map. Piecewise-linear between cell centres, clamped at the ends, so
 * the result stays inside the fitted range and inside (0, 1).
 */
export function applyIsotonicMap(map: IsotonicMap, published: number): number {
  const pts = map.points;
  const first = pts[0];
  if (first === undefined) throw new Error("isotonic: empty map");
  const p = clamp01(published);
  if (p <= first.published) return clamp01(first.calibrated);
  const last = pts[pts.length - 1];
  if (last === undefined) throw new Error("isotonic: empty map");
  if (p >= last.published) return clamp01(last.calibrated);

  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const probe = pts[mid];
    if (probe === undefined) break;
    if (probe.published <= p) lo = mid;
    else hi = mid - 1;
  }
  const a = pts[lo];
  const b = pts[lo + 1];
  // `lo` is in range and `lo + 1 < pts.length` because `p < last.published`.
  if (a === undefined || b === undefined) {
    throw new Error(`isotonic: lookup left the fitted range at published=${p}`);
  }
  if (b.published === a.published) return clamp01(a.calibrated);
  const t = (p - a.published) / (b.published - a.published);
  return clamp01(a.calibrated + (b.calibrated - a.calibrated) * t);
}

/** Brier score. Lower is better; 0.25 is what a constant 0.5 scores. */
export function brierScore(
  pairs: ReadonlyArray<readonly [predicted: number, outcome: number]>,
  predict: (published: number) => number = (p) => p,
): number {
  if (pairs.length === 0) return Number.NaN;
  let total = 0;
  for (const [published, outcome] of pairs) {
    const d = predict(published) - outcome;
    total += d * d;
  }
  return total / pairs.length;
}

/**
 * Expected Calibration Error over equal-width bins over the PREDICTED value.
 * `binCount` of 10 matches the conventional choice.
 */
export function expectedCalibrationError(
  pairs: ReadonlyArray<readonly [predicted: number, outcome: number]>,
  binCount = 10,
): number {
  if (pairs.length === 0) return Number.NaN;
  const bins: { p: number[]; y: number[] }[] = Array.from({ length: binCount }, () => ({
    p: [],
    y: [],
  }));
  for (const [predicted, outcome] of pairs) {
    const q = clamp01(predicted);
    // Last bin is closed on the right so p === 1 lands inside it.
    const idx = Math.min(binCount - 1, Math.floor(q * binCount));
    bins[idx].p.push(q);
    bins[idx].y.push(outcome);
  }
  let ece = 0;
  for (const bin of bins) {
    if (bin.p.length === 0) continue;
    const mp = bin.p.reduce((a, b) => a + b, 0) / bin.p.length;
    const my = bin.y.reduce((a, b) => a + b, 0) / bin.y.length;
    ece += (bin.p.length / pairs.length) * Math.abs(mp - my);
  }
  return ece;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}