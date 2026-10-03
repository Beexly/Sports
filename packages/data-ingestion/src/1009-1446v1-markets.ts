/**
 * Comparing Prediction Market Structures, With an Application to Market Making
 *
 * arXiv:1009.1446v1 · lane:markets · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Racetrack-market efficiency diagnostics ported to NFL lines: bucket a spread/total line time series
 * from open to close, track concentration (Herfindahl of side shares) and the average-vs-efficient
 * return (AR/EAR) curves, and locate interior AR~EAR crossings - the timestamps where the market's
 * read is most informative. A single monotonic path means the phenomenon does not transfer.
 *
 * Improvement (wiring record): As bookmaker-modeling infrastructure, model the book as a Bayesian market maker: maintain a Gaussian
 * belief (mu_t, sigma_t^2) over the true de-vigged probability updated on observed line moves, use the
 * book's uncertainty sigma_t as GSE's confidence weight on the market-implied number in the ensemble,
 * and compute the consistency index C(history) over windows of recent line moves as a shock/steam
 * detector that widens effective uncertainty on one-sided flow instead of mechanically following it.
 *
 * ACCEPTANCE GATE: C(history) must fire on >=80% of known news shocks with <20% false-fire rate in quiet windows;
 * otherwise the transfer fails.
 *
 * Ingest role: market-efficiency diagnostics (efficiency-phase curves + crossing detection on line time series).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1009.1446v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `C(history) must fire on >=80% of known news shocks with <20% false-fire rate in quiet windows; otherwise the transfer fails.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "AR/EAR efficiency-phase diagnostic on line time series",
  minBuckets: 8,
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Herfindahl concentration index of vote/handle shares. Ranges from 1/n (dispersed)
 * to 1 (fully concentrated). Null on malformed input.
 */
export function concentrationIndex(shares: readonly number[]): number | null {
  if (shares.length === 0) return null;
  if (!shares.every((s) => isFiniteNumber(s) && s >= 0)) return null;
  const total = shares.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  return shares.reduce((a, s) => a + (s / total) * (s / total), 0);
}

/** Chronological bucket means of a time series (n contiguous buckets). */
export function bucketMeans(values: readonly number[], nBuckets: number): number[] | null {
  if (!Number.isInteger(nBuckets) || nBuckets <= 0) return null;
  if (values.length < nBuckets) return null;
  if (!values.every(isFiniteNumber)) return null;
  const out: number[] = [];
  const size = values.length / nBuckets;
  for (let b = 0; b < nBuckets; b++) {
    const lo = Math.floor(b * size);
    const hi = Math.max(Math.floor((b + 1) * size), lo + 1);
    const slice = values.slice(lo, hi);
    out.push(slice.reduce((a, v) => a + v, 0) / slice.length);
  }
  return out;
}

/**
 * Count AR~EAR crossings: sign changes of (a - b) between two equal-length series.
 * A non-monotonic concentration-dispersion-reconcentration path shows >= 1 interior crossing.
 */
export function countCrossings(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  if (!a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  let crossings = 0;
  let prev = Math.sign((a[0] ?? 0) - (b[0] ?? 0));
  for (let i = 1; i < a.length; i++) {
    const s = Math.sign((a[i] ?? 0) - (b[i] ?? 0));
    if (s === 0) continue;
    if (prev === 0) {
      prev = s;
      continue;
    }
    if (s !== prev) crossings++;
    prev = s;
  }
  return crossings;
}

/** True when the series changes direction at least once (non-monotonic efficiency path). */
export function isNonMonotonicPath(values: readonly number[]): boolean | null {
  if (values.length < 3 || !values.every(isFiniteNumber)) return null;
  let dir = 0;
  for (let i = 1; i < values.length; i++) {
    const d = Math.sign((values[i] ?? 0) - (values[i - 1] ?? 0));
    if (d === 0) continue;
    if (dir !== 0 && d !== dir) return true;
    dir = d;
  }
  return false;
}
