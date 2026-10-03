/**
 * Analysing Long Short Term Memory Models for Cricket Match Outcome Prediction
 *
 * arXiv:2011.02122v1 · lane:win_spread_total · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Market-mapping primitives: logistic spread-to-win-probability conversion, over probability from a
 * normal total model centered on the projected total (Abramowitz-Stegun CDF), and push probability
 * from a key-number table with a flat fallback.
 *
 * Improvement (wiring record): Replicate the winning pattern on nflverse play-by-play (2000-2025) as the ball-by-ball analog:
 * per-timestep output heads trained on full game sequences with shared input embedding + recurrent
 * core (LSTM first, then GRU/Transformer), features (score differential, time remaining,
 * down/distance/yardline, timeouts, pre-game spread, pre-play WP), targets live spread P(home cover)
 * and total P(over) at each play, loss = mean BCE over all plays with the final spread/total outcome
 * as label at every timestep; append pre-game spread/total to every play input and ablate it
 * explicitly (the paper's +13% ablation analog).
 *
 * ACCEPTANCE GATE: ADOPT (proceed to productionization) if the all-outputs recurrent model beats the per-quarter
 * logistic baseline by >=0.01 Brier AND >=3pp accuracy at the half-time checkpoint across the
 * 2023-2025 test window; REJECT otherwise.
 *
 * Ingest role: market mapping (spread to win prob, total to over prob, push table).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2011.02122v1" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT (proceed to productionization) if the all-outputs recurrent model beats the per-quarter logistic baseline by >=0.01 Brier AND >=3pp accuracy at the half-time checkpoint across the 2023-2025 test window; REJECT otherwise.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "logistic spread mapping + normal total model + key-number push table",
  spreadScale: 0.28,
  totalSd: 13.5,
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Implied win probability for the team laying `spread` (negative spread = favorite). */
export function spreadToWinProb(spread: number): number | null {
  if (!isFiniteNumber(spread)) return null;
  return 1 / (1 + Math.exp(spread * 0.28));
}

/** Standard normal CDF via the Abramowitz-Stegun erf approximation. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-(z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - p : p;
}

/** Over probability given the market total and the model-projected total. */
export function totalToOverProb(marketTotal: number, projectedTotal: number, sd = 13.5): number | null {
  if (!isFiniteNumber(marketTotal) || !isFiniteNumber(projectedTotal)) return null;
  if (!isFiniteNumber(sd) || sd <= 0) return null;
  return 1 - normalCdf((marketTotal - projectedTotal) / sd);
}

/** Push probability from a key-number table, with a flat fallback for off-key numbers. */
export function pushProbability(spread: number): number | null {
  if (!isFiniteNumber(spread)) return null;
  const key = Math.abs(Math.round(spread));
  const table: Record<number, number> = {
    0: 0.0,
    1: 0.03,
    2: 0.03,
    3: 0.09,
    4: 0.04,
    5: 0.03,
    6: 0.05,
    7: 0.06,
    8: 0.03,
    9: 0.02,
    10: 0.04,
  };
  const v = table[key];
  return v === undefined ? 0.015 : v;
}
