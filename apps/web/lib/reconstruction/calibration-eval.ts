import type { ReconstructedFeature } from "./provenance";
import { normalQuantile } from "./separation-reconstruct";

/**
 * Calibration harness — the honest scoreboard for the reconstruction engine.
 *
 * A reconstruction is only as good as it matches reality. Against a legal
 * truth set of REAL coordinates (the NGS Highlights sample today, a licensed
 * feed later) this measures two things that cannot be faked:
 *   - accuracy: RMSE of the point estimate vs the measured value (in yards).
 *   - honesty of the interval: empirical coverage vs the nominal level. An
 *     80% interval should contain the truth ~80% of the time; systematically
 *     less means we are overconfident, more means we are too timid.
 *
 * A synthesis proposed "RMSE < 0.3m" as the bar. That is a real, measurable
 * target (kept here as TARGET_RMSE_YARDS, converted), earned only when the
 * truth set says so — never asserted.
 */

/** Roughly 0.3 metres, expressed in yards (the engine's field unit). */
export const TARGET_RMSE_YARDS = 0.3 / 0.9144;

export interface TruthPair {
  readonly predicted: ReconstructedFeature;
  readonly actual: number; // measured value from the truth set (yards)
}

export interface CalibrationReport {
  readonly n: number;
  readonly rmse: number; // yards; NaN when n === 0
  readonly meanAbsError: number;
  readonly empiricalCoverage: number; // fraction of truths inside their interval
  readonly nominalCoverage: number; // 1 - mean(alpha)
  readonly standardizedErrorRms: number; // ~1.0 = honest intervals; >1 overconfident
  readonly meetsRmseTarget: boolean;
}

/**
 * 1-D empirical Wasserstein-1 distance between two samples: the area between
 * their CDFs, ∫|F(x) − G(x)|dx. A real distributional-distance metric — a
 * later synthesis proposed a d_W target, which is legitimate to MEASURE (never
 * to assert) once reconstruction and truth samples both exist.
 */
export function wasserstein1(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) return Number.NaN;
  const xs = [...a].sort((x, y) => x - y);
  const ys = [...b].sort((x, y) => x - y);
  const grid = [...new Set([...xs, ...ys])].sort((x, y) => x - y);
  const cdf = (s: readonly number[], v: number): number => {
    // fraction of s <= v (s is sorted)
    let lo = 0, hi = s.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid]! <= v) lo = mid + 1;
      else hi = mid;
    }
    return lo / s.length;
  };
  let area = 0;
  for (let i = 0; i + 1 < grid.length; i++) {
    const width = grid[i + 1]! - grid[i]!;
    area += Math.abs(cdf(xs, grid[i]!) - cdf(ys, grid[i]!)) * width;
  }
  return area;
}

/** Two-sample Kolmogorov statistic: max|F(x) − G(x)| over the pooled support. */
export function ksStatistic(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) return Number.NaN;
  const xs = [...a].sort((x, y) => x - y);
  const ys = [...b].sort((x, y) => x - y);
  const grid = [...new Set([...xs, ...ys])];
  const cdf = (s: readonly number[], v: number): number =>
    s.filter((x) => x <= v).length / s.length;
  let d = 0;
  for (const v of grid) d = Math.max(d, Math.abs(cdf(xs, v) - cdf(ys, v)));
  return d;
}

export function reconstructionRmse(pairs: readonly TruthPair[]): number {
  if (pairs.length === 0) return Number.NaN;
  const sse = pairs.reduce((s, p) => s + (p.predicted.value - p.actual) ** 2, 0);
  return Math.sqrt(sse / pairs.length);
}

/**
 * Standardized-error RMS (the honest kernel inside "Sasaki/Stein belief
 * manifold"): the natural geometry on a set of beliefs is not Euclidean — a
 * miss should be measured in units of the estimate's OWN uncertainty. We
 * recover each prediction's sd from its interval (halfWidth / z_alpha) and
 * report the RMS of z = (value − actual)/sd. A well-calibrated engine scores
 * ~1.0; >1 means overconfident (intervals too tight), <1 too timid. This
 * rewards a model that knows WHEN it is unsure, which raw RMSE cannot see.
 */
export function standardizedErrorRms(pairs: readonly TruthPair[]): number {
  let sz2 = 0;
  let n = 0;
  for (const p of pairs) {
    const z = normalQuantile(1 - p.predicted.alpha / 2);
    const halfWidth = (p.predicted.interval[1] - p.predicted.interval[0]) / 2;
    const sd = halfWidth / z;
    if (!(sd > 0)) continue; // a degenerate (zero-width) interval is unscorable
    sz2 += ((p.predicted.value - p.actual) / sd) ** 2;
    n += 1;
  }
  return n === 0 ? Number.NaN : Math.sqrt(sz2 / n);
}

/**
 * Skill score vs a baseline (the HONEST version of the dump's epistemic-alpha
 * α=(I−H)/frame). Instead of a fabricated information formula, we MEASURE how
 * much the reconstruction beats a naive baseline (e.g. the receiver's flat
 * tendency) in mean-squared error: 1 − MSE(model)/MSE(baseline). >0 means the
 * play-context reconstruction genuinely adds skill; ≤0 means it does not earn
 * its place and stays inert. This is the number that decides whether a feature
 * graduates — computed, never asserted.
 */
export function skillScore(
  pairs: readonly TruthPair[],
  baseline: readonly number[],
): number {
  if (pairs.length === 0 || baseline.length !== pairs.length) return Number.NaN;
  let mseModel = 0;
  let mseBase = 0;
  for (let i = 0; i < pairs.length; i++) {
    mseModel += (pairs[i]!.predicted.value - pairs[i]!.actual) ** 2;
    mseBase += (baseline[i]! - pairs[i]!.actual) ** 2;
  }
  if (mseBase <= 0) return Number.NaN; // baseline already perfect — lift undefined
  return 1 - mseModel / mseBase;
}

export function calibrationReport(pairs: readonly TruthPair[]): CalibrationReport {
  const n = pairs.length;
  if (n === 0) {
    return {
      n: 0,
      rmse: Number.NaN,
      meanAbsError: Number.NaN,
      empiricalCoverage: Number.NaN,
      nominalCoverage: Number.NaN,
      standardizedErrorRms: Number.NaN,
      meetsRmseTarget: false,
    };
  }
  const rmse = reconstructionRmse(pairs);
  const mae = pairs.reduce((s, p) => s + Math.abs(p.predicted.value - p.actual), 0) / n;
  const inside = pairs.filter(
    (p) => p.actual >= p.predicted.interval[0] && p.actual <= p.predicted.interval[1],
  ).length;
  const nominal = 1 - pairs.reduce((s, p) => s + p.predicted.alpha, 0) / n;
  return {
    n,
    rmse,
    meanAbsError: mae,
    empiricalCoverage: inside / n,
    nominalCoverage: nominal,
    standardizedErrorRms: standardizedErrorRms(pairs),
    meetsRmseTarget: rmse <= TARGET_RMSE_YARDS,
  };
}
