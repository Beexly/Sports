/**
 * Sentiment Correlation in Financial News Networks and Associated Market Movements
 *
 * arXiv:2011.06430v2 · lane:markets · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Racetrack-market efficiency diagnostics ported to NFL lines: bucket a spread/total line time series
 * from open to close, track concentration (Herfindahl of side shares) and the average-vs-efficient
 * return (AR/EAR) curves, and locate interior AR~EAR crossings - the timestamps where the market's
 * read is most informative. A single monotonic path means the phenomenon does not transfer.
 *
 * Improvement (wiring record): Build the NFL news co-occurrence network: entities = teams/players from sports news (ESPN, beat
 * writers), edges = co-mention cosine similarity, Louvain groups (~divisions/conferences + cross-links
 * like shared agents or coordinators); entity-level sentiment per team/player per day; event study on
 * line moves -- does a negative-sentiment QB event propagate to his team's total and the opponent's
 * spread?
 *
 * ACCEPTANCE GATE: ADOPT as a monitoring layer if sentiment events predict line moves beyond the official injury
 * designations (i.e., the network catches what the designation dummies miss); REJECT if all line
 * movement is explained by designations + market steam (then the network is descriptive, not
 * predictive).
 *
 * Ingest role: market-efficiency diagnostics (efficiency-phase curves + crossing detection on line time series).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2011.06430v2" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as a monitoring layer if sentiment events predict line moves beyond the official injury designations (i.e., the network catches what the designation dummies miss); REJECT if all line movement is explained by designations + market steam (then the network is descriptive, not predictive).`;

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
