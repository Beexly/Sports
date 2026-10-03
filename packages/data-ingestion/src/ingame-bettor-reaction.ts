/**
 * Bettors' Reaction to Match Dynamics — Evidence from In-Game Betting
 *
 * arXiv:2202.10085v2 · lane:markets · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the in-play market-sentiment monitor: Betfair Exchange NFL in-play volume per minute as
 * target, per-drive EPA differentials as the 'momentum' signal (NFL's discrete analogue of VAEP),
 * pre-game vig-adjusted probabilities + live WP + score diff, AR(1) sentiment state g_t with
 * P-spline time-varying coefficients; serving = one-step-ahead relative-volume forecast and a
 * momentum-divergence flag (market live prob vs GSE prob) — drive-level momentum vs minute-level
 * tested head-to-head.
 *
 * ACCEPTANCE GATE: ADAPT iff on 2024: (a) the momentum-SSM beats the no-momentum SSM on per-game log-likelihood
 * with the second-half beta_t effect replicating the paper's shape, AND (b) the momentum-
 * divergence rule produces positive CLV, or (c) the one-step-ahead relative-volume forecast
 * improves RMSE by >=15%.
 *
 * Ingest role: schemas (in-game bettor reaction study: momentum overreaction diagnostics).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2202.10085v2" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT iff on 2024: (a) the momentum-SSM beats the no-momentum SSM on per-game log-likelihood
 * with the second-half beta_t effect replicating the paper's shape, AND (b) the momentum-
 * divergence rule produces positive CLV, or (c) the one-step-ahead relative-volume forecast
 * improves RMSE by >=15%.`;

export const CONFIG = {
  enabled: false,
  market: "in-game betting",
  effect: "momentum overreaction",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface InGameTick {
  readonly gameId: string;
  readonly tSec: number;
  readonly scoreDiff: number;
  readonly liveSpread: number;
  readonly volume: number;
}

export function isInGameTick(x: unknown): x is InGameTick {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["gameId"] === "string" &&
    isFiniteNumber(o["tSec"]) && (o["tSec"] as number) >= 0 &&
    isFiniteNumber(o["scoreDiff"]) &&
    isFiniteNumber(o["liveSpread"]) &&
    isFiniteNumber(o["volume"]) && (o["volume"] as number) >= 0
  );
}

/** Overreaction metric: live spread move vs score-diff-implied move. */
export function overreaction(tick: InGameTick, pregameSpread: number, kPerPoint = 1): number | null {
  if (!isInGameTick(tick) || !isFiniteNumber(pregameSpread) || !isFiniteNumber(kPerPoint) || kPerPoint <= 0) return null;
  const implied = pregameSpread + kPerPoint * tick.scoreDiff;
  return tick.liveSpread - implied;
}

/** Volume-weighted overreaction across ticks. */
export function vwOverreaction(ticks: readonly unknown[], pregameSpread: number): number | null {
  const v: InGameTick[] = [];
  for (const t of ticks) if (isInGameTick(t)) v.push(t);
  if (v.length === 0) return null;
  let num = 0;
  let den = 0;
  for (const t of v) {
    const or = overreaction(t, pregameSpread);
    if (or === null) return null;
    num += t.volume * or;
    den += t.volume;
  }
  if (den === 0) return null;
  return num / den;
}

/** Momentum run detector: |scoreDiff| run of >= runLen within a window. */
export function momentumRun(diffs: readonly number[], runLen: number, thresh: number): boolean | null {
  if (diffs.length === 0 || !Number.isInteger(runLen) || runLen <= 0) return null;
  if (!isFiniteNumber(thresh) || !diffs.every(isFiniteNumber)) return null;
  let run = 0;
  for (const d of diffs) {
    if (Math.abs(d) >= thresh) {
      run++;
      if (run >= runLen) return true;
    } else {
      run = 0;
    }
  }
  return false;
}
