/**
 * Simplified Kalman Filter for Online Rating: One-Fits-All Approach
 *
 * arXiv:2104.14012v1 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Replace/augment GSE's static Elo update with the vSKF recursions (44-49) under the Bradley-Terry
 * model (NFL init: s=1, v_0=0.02, eps=1e-4, beta=1, eta=0.06, frequency-estimated HFA recomputed
 * on 2015-2025) and keep the per-team uncertainty v_{t,m}: use it to widen/shrink confidence on
 * published picks, reset v for a team after a QB change to force fast re-convergence (the paper's
 * day-40 switch protocol), and feed it as a feature into the pick-confidence model — then extend
 * beyond binary outcomes by plugging a margin-of-victory likelihood (Skellam or discretized-normal
 * on point differential) into the same vSKF machinery so the Elo learns from blowouts vs close
 * wins.
 *
 * ACCEPTANCE GATE: Adopt if vSKF beats SG-Elo log-score by >=0.3% in the converged window OR reaches 90%-of-final
 * ratings >=2 games faster on average (the paper's Fig. 5 effect). Reject if neither holds on
 * 2018-2025 data: plain Elo remains the GSE default.
 *
 * Ingest role: feature builder (simplified Kalman online rating: scalar update + RLS equivalence).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2104.14012v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt if vSKF beats SG-Elo log-score by >=0.3% in the converged window OR reaches 90%-of-final
 * ratings >=2 games faster on average (the paper's Fig. 5 effect). Reject if neither holds on
 * 2018-2025 data: plain Elo remains the GSE default.`;

export const CONFIG = {
  enabled: false,
  model: "one-fits-all scalar Kalman",
  processNoise: "tuned per sport",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface KalmanState {
  readonly theta: number;
  readonly p: number;
}

/** One scalar Kalman update: x observed with noise R, process noise Q. */
export function kalmanUpdate(state: KalmanState, x: number, R: number, Q = 0): KalmanState | null {
  if (![state.theta, state.p, x, R, Q].every(isFiniteNumber)) return null;
  if (state.p < 0 || R <= 0 || Q < 0) return null;
  const pPred = state.p + Q;
  const K = pPred / (pPred + R);
  return {
    theta: state.theta + K * (x - state.theta),
    p: (1 - K) * pPred,
  };
}

/** Batch RLS-equivalent: process a whole season of game margins. */
export function kalmanSeason(
  games: ReadonlyArray<{ margin: number; home: boolean }>,
  R: number,
  Q: number,
  init: KalmanState = { theta: 0, p: 1 },
): KalmanState[] | null {
  if (games.length === 0 || !isFiniteNumber(R) || !isFiniteNumber(Q) || R <= 0 || Q < 0) return null;
  const out: KalmanState[] = [];
  let s = init;
  for (const g of games) {
    if (!isFiniteNumber(g.margin) || typeof g.home !== "boolean") return null;
    const x = g.home ? g.margin : -g.margin;
    const ns = kalmanUpdate(s, x, R, Q);
    if (!ns) return null;
    out.push(ns);
    s = ns;
  }
  return out;
}

/** Steady-state gain (closed form for the scalar case). */
export function steadyStateGain(R: number, Q: number): number | null {
  if (![R, Q].every(isFiniteNumber) || R <= 0 || Q < 0) return null;
  if (Q === 0) return 0;
  const p = (Q + Math.sqrt(Q * Q + 4 * Q * R)) / 2;
  return p / (p + R);
}

/** Effective memory (games) of the filter: ~ 1/K. */
export function effectiveMemory(R: number, Q: number): number | null {
  const K = steadyStateGain(R, Q);
  if (K === null || K <= 0) return null;
  return 1 / K;
}
