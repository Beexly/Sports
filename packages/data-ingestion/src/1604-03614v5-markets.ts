/**
 * The Market for English Premier League Odds
 *
 * arXiv:1604.03614v5 · lane:markets · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Racetrack-market efficiency diagnostics ported to NFL lines: bucket a spread/total line time series
 * from open to close, track concentration (Herfindahl of side shares) and the average-vs-efficient
 * return (AR/EAR) curves, and locate interior AR~EAR crossings - the timestamps where the market's
 * read is most informative. A single monotonic path means the phenomenon does not transfer.
 *
 * Improvement (wiring record): Engine-honesty infrastructure: GSE currently holds static market snapshots, not a belief-state
 * model. Build a live market-implied win probability with an implied-volatility path: invert in-play
 * moneyline/spread/total odds feeds (OddsPapi, APIVault, etc.) into implied scoring rates at each
 * snapshot using an NFL-appropriate likelihood (drive-outcome point process or two-Poisson
 * scoring-play model), and publish the implied win probability plus the implied-volatility path
 * sigma_IV,t -- using sigma_IV,t as a live-betting opportunity screen (high implied vol = market
 * expects chaos) and as a diagnostic of whether GSE's win prob moves with or against market-implied
 * vol.
 *
 * ACCEPTANCE GATE: ADOPT the implied-volatility feature iff the calibrated model beats raw moneyline-implied win
 * probability by >= 0.003 mean Brier on the 50-game 2024 sample AND the implied-vol path visibly
 * reacts to major in-game events (turnovers, injuries) in the case-study plots.
 *
 * Ingest role: market-efficiency diagnostics (efficiency-phase curves + crossing detection on line time series).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1604.03614v5" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the implied-volatility feature iff the calibrated model beats raw moneyline-implied win probability by >= 0.003 mean Brier on the 50-game 2024 sample AND the implied-vol path visibly reacts to major in-game events (turnovers, injuries) in the case-study plots.`;

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
