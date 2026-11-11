/**
 * Probability calibration — binned reliability + PAVA isotonic recalibration.
 *
 * Method transcribed from arXiv:1912.08726v4 (the repo's existing
 * `1912-08726v4-calibration.ts` module): group predicted probabilities into bins,
 * measure expected calibration error as the count-weighted |observed − predicted|
 * gap, then refit a monotone non-decreasing correction so recalibrated
 * probabilities match empirical frequencies.
 *
 * Pure: no I/O, no Date, no RNG. Malformed input is rejected, never coerced.
 */
import { isFiniteNumber } from "./types.js";

export interface ReliabilityBin {
  readonly lo: number;
  readonly hi: number;
  readonly meanPred: number;
  readonly meanObs: number;
  readonly count: number;
}

export interface CalibrationPair {
  readonly p: number;
  readonly y: number;
}

function validPair(pr: CalibrationPair): boolean {
  return isFiniteNumber(pr.p) && pr.p >= 0 && pr.p <= 1 && (pr.y === 0 || pr.y === 1);
}

/** Group (p, y) pairs into `nBins` equal-width reliability bins over [0, 1]. */
export function reliabilityBins(
  pairs: readonly CalibrationPair[],
  nBins = 10,
): ReliabilityBin[] {
  if (!Number.isInteger(nBins) || nBins < 1) {
    throw new RangeError(`nBins must be a positive integer, got ${String(nBins)}`);
  }
  const clean = pairs.filter(validPair);
  const width = 1 / nBins;
  const out: ReliabilityBin[] = [];
  for (let i = 0; i < nBins; i += 1) {
    const lo = i * width;
    const hi = i === nBins - 1 ? 1 : (i + 1) * width;
    let sumP = 0;
    let sumY = 0;
    let count = 0;
    for (const pr of clean) {
      const inBin = i === nBins - 1 ? pr.p >= lo && pr.p <= hi : pr.p >= lo && pr.p < hi;
      if (!inBin) continue;
      sumP += pr.p;
      sumY += pr.y;
      count += 1;
    }
    out.push({
      lo,
      hi,
      meanPred: count === 0 ? 0 : sumP / count,
      meanObs: count === 0 ? 0 : sumY / count,
      count,
    });
  }
  return out;
}

/** Count-weighted mean |observed − predicted| across non-empty bins. */
export function expectedCalibrationError(bins: readonly ReliabilityBin[]): number {
  let weighted = 0;
  let n = 0;
  for (const b of bins) {
    if (b.count <= 0) continue;
    weighted += b.count * Math.abs(b.meanObs - b.meanPred);
    n += b.count;
  }
  return n === 0 ? 0 : weighted / n;
}

/**
 * Pool-adjacent-violators. Returns a non-decreasing sequence minimizing squared
 * error against `values` — the isotonic correction the paper specifies.
 * Empty input returns empty; a single value returns itself.
 */
export function pavaIsotonic(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const vals = values.map((v) => (isFiniteNumber(v) ? v : 0));

  // Each block keeps its own sum and count, so merges are weighted by block size.
  // Merging two bare means (the wrong version) silently mis-fits multi-element blocks.
  const sums: number[] = [];
  const counts: number[] = [];

  for (const v of vals) {
    sums.push(v);
    counts.push(1);
    while (sums.length >= 2) {
      const last = sums.length - 1;
      const meanPrev = sums[last - 1]! / counts[last - 1]!;
      const meanCur = sums[last]! / counts[last]!;
      if (meanPrev <= meanCur) break; // monotonicity holds
      sums[last - 1] = sums[last - 1]! + sums[last]!;
      counts[last - 1] = counts[last - 1]! + counts[last]!;
      sums.pop();
      counts.pop();
    }
  }

  const out: number[] = [];
  for (let i = 0; i < sums.length; i += 1) {
    const mean = sums[i]! / counts[i]!;
    for (let k = 0; k < counts[i]!; k += 1) out.push(mean);
  }
  return out;
}

/**
 * Build a monotone recalibration map from empirical pairs.
 *
 * Empty bins carry no information, so they are dropped before isotonizing rather
 * than fabricated as (midpoint, midpoint). If fewer than two informative bins
 * survive, no correction is possible and an empty map is returned — callers must
 * treat that as "cannot calibrate", not as identity.
 */
export function buildCalibrationMap(
  pairs: readonly CalibrationPair[],
  nBins = 10,
): Array<{ x: number; y: number }> {
  const bins = reliabilityBins(pairs, nBins).filter((b) => b.count > 0);
  if (bins.length < 2) return [];
  const fitted = pavaIsotonic(bins.map((b) => b.meanObs));
  const map = bins.map((b, i) => ({ x: b.meanPred, y: fitted[i]! }));
  map.sort((a, b) => a.x - b.x);
  return map;
}

/**
 * Apply a calibration map by piecewise-linear interpolation, clamped at the ends.
 * An empty map returns the input unchanged — the honest no-op, since no
 * calibration was estimable.
 */
export function applyCalibration(map: ReadonlyArray<{ x: number; y: number }>, p: number): number {
  if (!isFiniteNumber(p)) return p;
  if (map.length === 0) return p;
  if (p <= map[0]!.x) return map[0]!.y;
  const last = map[map.length - 1]!;
  if (p >= last.x) return last.y;
  for (let i = 1; i < map.length; i += 1) {
    const a = map[i - 1]!;
    const b = map[i]!;
    if (p <= b.x) {
      const span = b.x - a.x;
      if (span <= 0) return b.y;
      const t = (p - a.x) / span;
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}
