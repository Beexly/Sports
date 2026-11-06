/**
 * Independent modelProb aggregation — the C-28 bottleneck.
 *
 * Implements docs/edge/MODELPROB_DESIGN.md (cycle R71): player-level, market-free
 * signals (YACoe rolling signal, TPR smoothed rate, ...) normalized against a
 * league-season baseline, shrunk toward the league mean by sample size, and
 * aggregated to a game-level probability by offense-side weight.
 *
 * LAW (spec §"Market data invariant"): ZERO market/price/line/consensus/depth
 * data enters this module. Every input is `priced: false` by construction. Do
 * not import anything from ./devig.js, ./market-consensus-q.js, ../consensus.js,
 * ./cross-market.js, or apps/web scoring/calibration modules — a market-free
 * pipeline that imports a market-aware one is not market-free.
 *
 * DESIGN-DOC AMBIGUITY, RESOLVED HERE (documented, not silently patched): the
 * spec's formula `p_i_shrunk = p_league + shrink · (z_i_normalized − p_league)`
 * subtracts a probability (p_league, ~0..1) from a z-score (mean 0, std 1,
 * unbounded) — dimensionally inconsistent as literally written. This module
 * resolves it the standard way: the z-score is first passed through a logistic
 * link (`zToProbability`) to become a probability-space quantity BEFORE the
 * shrinkage subtraction, so every term in the shrinkage formula is a
 * probability. At z=0 (a player exactly at the league mean) this correctly
 * yields p=0.5 pre-shrinkage, and shrinkage then pulls that toward `pLeague`.
 *
 * Status: pure code + synthetic-fixture tests only, per the design doc's own
 * "Status: design / NOT SHIP". No real-data claim is made or implied by this
 * file. `tau` and `minTotalN` are REQUIRED, not defaulted — a silently-defaulted
 * shrinkage/floor parameter is exactly the kind of pre-signature drift the
 * design doc's "frozen tau, minimum n" prereg requirement exists to prevent
 * (see docs/edge/MODELPROB_DESIGN.md "Next actions").
 */

export const MODELPROB_AGGREGATION_METHOD_TAG = "independent_modelprob_aggregation_v1" as const;

/** One player-level signal observation feeding the aggregator. */
export interface PlayerSignal {
  readonly playerId: string;
  /**
   * The raw signal value (e.g. RollingSignalResult.signal, TprBacktestRow.signal).
   * `null` means the underlying producer refused to emit a signal (fail-closed
   * upstream, e.g. TPR below minSample) — this observation is dropped, never
   * imputed to 0 or the league mean.
   */
  readonly signal: number | null;
  /** Sample size backing `signal` (rows, routes, targets — whatever the producer used). */
  readonly n: number;
  /** Offense-side aggregation weight (snap-weight / target-share). Must be > 0. */
  readonly weight: number;
}

export interface LeagueBaseline {
  readonly mean: number;
  readonly std: number;
  /** Count of non-null signals the baseline was computed from. */
  readonly n: number;
}

/**
 * League-season baseline for z-normalization. Computed from `priorSignals` —
 * the caller's responsibility to pass only signals from games strictly BEFORE
 * the target game (the design doc: "not including the target game"). This
 * function does no time filtering itself; it has no notion of "game" or
 * "week" to filter on, by design, so it cannot silently leak the target game
 * in the way a convenience default might.
 *
 * Returns `null` (fail-closed) when fewer than 2 non-null signals exist —
 * variance is undefined below n=2, and a single-observation "baseline" is not
 * a baseline.
 */
export function computeLeagueBaseline(priorSignals: readonly PlayerSignal[]): LeagueBaseline | null {
  const values = priorSignals
    .map((s) => s.signal)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const n = values.length;
  if (n < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1); // sample variance
  const std = Math.sqrt(variance);
  if (!Number.isFinite(std) || std === 0) return null; // degenerate: no spread to normalize against
  return { mean, std, n };
}

/** z = (s - mu) / sigma against a league-season baseline. */
export function zScore(signal: number, baseline: LeagueBaseline): number {
  return (signal - baseline.mean) / baseline.std;
}

/**
 * Standard logistic link, z -> probability. z=0 -> 0.5. This is the resolution
 * to the design-doc dimensional ambiguity documented in the module header.
 */
export function zToProbability(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** shrink(n, tau) = n / (n + tau). n=0 -> 0 (full shrinkage to league mean). tau must be > 0. */
export function shrinkageWeight(n: number, tau: number): number {
  if (!Number.isFinite(tau) || tau <= 0) {
    throw new RangeError(`shrinkageWeight: tau must be finite and > 0, got ${tau}`);
  }
  if (!Number.isFinite(n) || n < 0) {
    throw new RangeError(`shrinkageWeight: n must be finite and >= 0, got ${n}`);
  }
  return n / (n + tau);
}

export interface ShrinkOpts {
  /** League-level base rate to shrink toward. Required — never silently 0.5. */
  readonly pLeague: number;
  /** Season-level shrinkage parameter. Required, pre-registered, never tuned post-hoc. */
  readonly tau: number;
}

/**
 * One player's shrunk, probability-space signal: p_league + shrink(n,tau) *
 * (zToProbability(z) - p_league). At n=0, returns exactly pLeague (full
 * shrinkage). As n -> infinity, approaches zToProbability(z) (signal dominates).
 */
export function shrinkSignal(z: number, n: number, opts: ShrinkOpts): number {
  if (!Number.isFinite(opts.pLeague) || opts.pLeague < 0 || opts.pLeague > 1) {
    throw new RangeError(`shrinkSignal: pLeague must be a probability in 0..1, got ${opts.pLeague}`);
  }
  const raw = zToProbability(z);
  const w = shrinkageWeight(n, opts.tau);
  return opts.pLeague + w * (raw - opts.pLeague);
}

export interface AggregateOpts extends ShrinkOpts {
  /**
   * Minimum TOTAL sample size (sum of contributing signals' n) required to
   * commit a modelProb. Below this, aggregation returns null — honest
   * absence, never a low-confidence guess dressed as a real probability.
   * Required: a silently-defaulted floor is exactly what the design doc's
   * "pre-registered minimum_n" requirement exists to prevent.
   */
  readonly minTotalN: number;
}

export interface AggregationResult {
  readonly methodTag: typeof MODELPROB_AGGREGATION_METHOD_TAG;
  /** priced: false by construction — see module header LAW. */
  readonly priced: false;
  /**
   * `ok: true` -> a committable modelProb (round to 6 decimals at the receipt
   * boundary, per pick-proof-receipt.ts:111 — NOT rounded here, so this value
   * is exact until the caller commits it).
   * `ok: false` -> honest absence (no signals, or total n below minTotalN).
   * The receipt must commit `null`, never a fabricated value.
   */
  readonly ok: boolean;
  readonly modelProb: number | null;
  readonly totalN: number;
  readonly contributingSignals: number;
  readonly refuse?: "no_signals" | "starved_n";
}

/**
 * Aggregate player-level signals to one game-level, offense-weighted,
 * shrinkage-adjusted probability. Pure. No I/O. No market data (see module
 * header LAW). Dropped observations (null signal, non-finite weight, weight
 * <= 0) are excluded rather than imputed — fail-closed per this codebase's
 * standing convention (covariate-bus.ts, the props-hb-*-bind.ts family).
 */
export function aggregateModelProb(
  signals: readonly PlayerSignal[],
  baseline: LeagueBaseline,
  opts: AggregateOpts,
): AggregationResult {
  const usable = signals.filter(
    (s) => s.signal !== null && Number.isFinite(s.signal) && Number.isFinite(s.weight) && s.weight > 0,
  );
  if (usable.length === 0) {
    return {
      methodTag: MODELPROB_AGGREGATION_METHOD_TAG,
      priced: false,
      ok: false,
      modelProb: null,
      totalN: 0,
      contributingSignals: 0,
      refuse: "no_signals",
    };
  }

  const totalN = usable.reduce((sum, s) => sum + s.n, 0);
  if (totalN < opts.minTotalN) {
    return {
      methodTag: MODELPROB_AGGREGATION_METHOD_TAG,
      priced: false,
      ok: false,
      modelProb: null,
      totalN,
      contributingSignals: usable.length,
      refuse: "starved_n",
    };
  }

  const wSum = usable.reduce((sum, s) => sum + s.weight, 0);
  const pSum = usable.reduce((sum, s) => {
    const z = zScore(s.signal as number, baseline);
    const shrunk = shrinkSignal(z, s.n, opts);
    return sum + s.weight * shrunk;
  }, 0);
  const modelProb = pSum / wSum;

  return {
    methodTag: MODELPROB_AGGREGATION_METHOD_TAG,
    priced: false,
    ok: true,
    modelProb,
    totalN,
    contributingSignals: usable.length,
  };
}
