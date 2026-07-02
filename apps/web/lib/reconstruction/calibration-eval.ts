import type { ReconstructedFeature } from "./provenance";

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

export function calibrationReport(pairs: readonly TruthPair[]): CalibrationReport {
  const n = pairs.length;
  if (n === 0) {
    return {
      n: 0,
      rmse: Number.NaN,
      meanAbsError: Number.NaN,
      empiricalCoverage: Number.NaN,
      nominalCoverage: Number.NaN,
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
    meetsRmseTarget: rmse <= TARGET_RMSE_YARDS,
  };
}
