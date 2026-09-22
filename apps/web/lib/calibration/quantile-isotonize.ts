/**
 * Post-sort isotonization for quantile vectors — arXiv 2103.00083
 * ("Flexible Model Aggregation for Quantile Regression").
 *
 * ADDITIVE utility. Not wired into any publish path (that wiring changes
 * published intervals and is a NEEDS HUMAN CALL — see WIRING-PLAN.md).
 *
 * Prop. 2 (paper): applying Sort (or PAVA) to a quantile vector cannot worsen
 * the weighted interval score (WIS) and enforces non-crossing at every x.
 * Improvement-ledger gate: ADOPT into the publish path only if raw GSE
 * quantile outputs show crossing violations on 2025 data.
 */

/** Sort a quantile vector non-decreasing: enforces non-crossing at every x. */
export function sortQuantiles(quantiles: readonly number[]): number[] {
  return [...quantiles].sort((a, b) => a - b);
}

/**
 * Pool-Adjacent-Violators Algorithm: isotonic (non-decreasing) regression of a
 * sequence. Pools adjacent violators by block averaging until the block means
 * are non-decreasing. Returns a new array; input untouched.
 */
export function pavaIsotonic(values: readonly number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const sums: number[] = [];
  const counts: number[] = [];
  for (const v of values) {
    sums.push(v);
    counts.push(1);
    while (sums.length >= 2) {
      const m = sums.length;
      const avgPrev = sums[m - 2]! / counts[m - 2]!;
      const avgLast = sums[m - 1]! / counts[m - 1]!;
      if (avgPrev <= avgLast) break;
      sums[m - 2] = sums[m - 2]! + sums[m - 1]!;
      counts[m - 2] = counts[m - 2]! + counts[m - 1]!;
      sums.pop();
      counts.pop();
    }
  }
  const out: number[] = [];
  for (let b = 0; b < sums.length; b++) {
    const avg = sums[b]! / counts[b]!;
    for (let i = 0; i < counts[b]!; i++) out.push(avg);
  }
  return out;
}

/** True when every adjacent pair is non-decreasing (no quantile crossing). */
export function isNonCrossing(quantiles: readonly number[]): boolean {
  for (let i = 1; i < quantiles.length; i++) {
    if (quantiles[i]! < quantiles[i - 1]!) return false;
  }
  return true;
}
