/**
 * Core statistics for the GSE Fantasy Engine — pure, deterministic, glass-box.
 *
 * The fantasy suite is deliberately the OPPOSITE posture from the betting
 * engine: every weight, threshold, and formula in this package is public and
 * documented, because "open inputs and open math" IS the product thesis here.
 * The incumbents sell sealed numbers; GSE ships the same class of metric with
 * the reasoning, the inputs, and a reproducible back-test attached.
 *
 * Conventions match the validated clean-room reference implementation:
 *   - z-scores use the POPULATION standard deviation (ddof=0), not sample —
 *     the population being scored IS the population of interest.
 *   - Missing/non-finite values are excluded from the mean/sd and z-score to
 *     NaN, which callers must handle explicitly (never silently zero).
 */

/** Arithmetic mean over the finite values. NaN when none are finite. */
export function mean(values: readonly number[]): number {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n === 0 ? Number.NaN : sum / n;
}

/** POPULATION standard deviation (ddof=0) over the finite values. */
export function populationStd(values: readonly number[]): number {
  const m = mean(values);
  if (!Number.isFinite(m)) return Number.NaN;
  let sumSq = 0;
  let n = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      sumSq += (v - m) * (v - m);
      n++;
    }
  }
  return n === 0 ? Number.NaN : Math.sqrt(sumSq / n);
}

/**
 * Z-scores against the population's own mean/sd (ddof=0). A zero-spread
 * population z-scores to 0 (every member IS the mean — no signal, no noise).
 * Non-finite inputs map to NaN.
 */
export function zscores(values: readonly number[]): number[] {
  const m = mean(values);
  const sd = populationStd(values);
  return values.map((v) => {
    if (!Number.isFinite(v)) return Number.NaN;
    if (!Number.isFinite(m) || !Number.isFinite(sd)) return Number.NaN;
    if (sd === 0) return 0;
    return (v - m) / sd;
  });
}

/** Readable "OVR"-style scale: mean 50, sd 10. */
export function to100(z: number): number {
  return 50 + 10 * z;
}

/**
 * Percentile rank in [0, 1] using the average-rank convention for ties
 * (matches pandas `rank(pct=True)`, the reference implementation's choice).
 * Non-finite inputs map to NaN and are excluded from everyone else's rank.
 */
export function percentileRanks(values: readonly number[]): number[] {
  const finite: Array<{ v: number; i: number }> = [];
  values.forEach((v, i) => {
    if (Number.isFinite(v)) finite.push({ v, i });
  });
  const n = finite.length;
  const out = values.map(() => Number.NaN);
  if (n === 0) return out;

  const sorted = [...finite].sort((a, b) => a.v - b.v);
  // Average rank for ties: walk runs of equal values.
  let start = 0;
  while (start < n) {
    let end = start;
    while (end + 1 < n && sorted[end + 1]!.v === sorted[start]!.v) end++;
    // 1-indexed ranks start+1 .. end+1; average of an arithmetic run.
    const avgRank = (start + 1 + (end + 1)) / 2;
    for (let k = start; k <= end; k++) {
      out[sorted[k]!.i] = avgRank / n;
    }
    start = end + 1;
  }
  return out;
}

/** Round to `digits` decimal places (display parity with the reference CSVs). */
export function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
