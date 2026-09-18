/**
 * League percentile 0–100 as documented in COMPUTATION_NOTES.md:
 * 100 = best. Average ties. NaN kept as null. n < 2 → every finite input
 * returns null (cannot rank a one-team league).
 *
 * Implementation matches the NOTES (invert lower-is-better so 100 is still
 * best), not the double-invert branch in compute_advanced_metrics.py.
 */

import { rankAverage, round } from "../expected-metrics/numeric.js";

export function leaguePercentile(
  values: readonly (number | null)[],
  higherBetter: boolean,
): (number | null)[] {
  const idx: number[] = [];
  const finite: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v === "number" && Number.isFinite(v)) {
      idx.push(i);
      finite.push(v);
    }
  }
  const out: (number | null)[] = values.map(() => null);
  const n = finite.length;
  if (n < 2) return out;
  const ranks = rankAverage(finite); // 1 = smallest
  const denom = n - 1;
  for (let k = 0; k < n; k++) {
    const r = ranks[k] ?? 1;
    const pct = higherBetter ? ((r - 1) / denom) * 100 : ((n - r) / denom) * 100;
    out[idx[k] ?? 0] = round(pct, 5);
  }
  return out;
}
