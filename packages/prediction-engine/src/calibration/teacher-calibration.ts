/**
 * Empirical-rate teacher calibration with M=25 empirical-Bayes backoff.
 *
 * A teacher model supplies (probability, outcome) pairs. Bin the teacher's
 * probabilities into B bins; the empirical rate in bin b is shrunk toward the
 * global base rate with backoff strength M = 25:
 *
 *   rate_b = (hits_b + M * base) / (n_b + M)
 *
 * A student's forecast p is then calibrated by linear interpolation of the
 * binned teacher mapping. Small bins borrow strength from the base rate
 * instead of trusting noisy empirical frequencies.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2607.00164v1 — Verifiable Rewards for Calibrated
 * Probabilistic Forecasting.
 *
 * ACCEPTANCE GATE: teacher-calibrated student beats the raw student on ECE
 * and log-loss.
 */

export const TEACHER_BACKOFF_M = 25;

export interface TeacherBin {
  /** Bin center (teacher probability). */
  readonly center: number;
  /** EB-shrunk empirical event rate in the bin. */
  readonly rate: number;
  /** Raw count in the bin (for diagnostics). */
  readonly n: number;
}

/** Empirical-Bayes shrinkage of a bin rate toward the base rate (M=25). */
export function ebBackoff(hits: number, n: number, baseRate: number, m = TEACHER_BACKOFF_M): number {
  if (!(n >= 0) || !Number.isFinite(hits) || !Number.isFinite(n)) {
    throw new Error("teacher-calibration: hits/n must be finite, n >= 0");
  }
  if (!(baseRate >= 0 && baseRate <= 1)) throw new Error("teacher-calibration: baseRate in [0,1]");
  if (!(m > 0)) throw new Error("teacher-calibration: m must be > 0");
  if (hits < 0 || hits > n) throw new Error("teacher-calibration: hits must be in [0, n]");
  return (hits + m * baseRate) / (n + m);
}

/**
 * Fit the teacher's binned empirical-rate mapping.
 * @param probs teacher predicted probabilities in [0,1].
 * @param outcomes binary outcomes aligned with probs.
 * @param nBins number of equal-width bins.
 */
export function fitTeacherMap(
  probs: readonly number[],
  outcomes: readonly number[],
  nBins: number,
  m = TEACHER_BACKOFF_M,
): TeacherBin[] {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("teacher-calibration: aligned non-empty inputs required");
  }
  if (!(nBins >= 1) || !Number.isInteger(nBins)) {
    throw new Error("teacher-calibration: nBins must be a positive integer");
  }
  const base = outcomes.reduce((s, y) => s + y, 0) / outcomes.length;
  const hits = new Array<number>(nBins).fill(0);
  const ns = new Array<number>(nBins).fill(0);
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i] ?? 0;
    if (!(p >= 0 && p <= 1)) throw new Error("teacher-calibration: probs must be in [0,1]");
    const y = outcomes[i] ?? 0;
    if (y !== 0 && y !== 1) throw new Error("teacher-calibration: outcomes must be binary");
    const b = Math.min(nBins - 1, Math.floor(p * nBins));
    hits[b]! += y;
    ns[b]! += 1;
  }
  return hits.map((h, b) => ({
    center: (b + 0.5) / nBins,
    rate: ebBackoff(h, ns[b] ?? 0, base, m),
    n: ns[b] ?? 0,
  }));
}

/** Calibrate one student probability through the teacher map (linear interp). */
export function calibrateWithTeacher(p: number, bins: readonly TeacherBin[]): number {
  if (bins.length === 0) throw new Error("teacher-calibration: need >= 1 bin");
  if (!(p >= 0 && p <= 1)) throw new Error("teacher-calibration: p must be in [0,1]");
  const sorted = [...bins].sort((a, b) => a.center - b.center);
  if (p <= (sorted[0]?.center ?? 0)) return sorted[0]?.rate ?? 0;
  const last = sorted[sorted.length - 1]!;
  if (p >= last.center) return last.rate;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (p >= a.center && p <= b.center) {
      const t = (p - a.center) / Math.max(b.center - a.center, 1e-12);
      return a.rate + t * (b.rate - a.rate);
    }
  }
  return last.rate;
}
