/**
 * An Elo-type rating model for players and teams of variable strength
 *
 * arXiv:2109.15046v2 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build a variance-aware Elo: per-team performance variance sigma_i^2(w) estimated weekly from (a)
 * trailing 8-week variance of team EPA/play, (b) injury load (starters out / snap-weighted WAR
 * lost), (c) QB-change indicator; update rule = standard Elo with expected score E = b(theta_i -
 * theta_j) + 1/2 b''(theta_i - theta_j)(sigma_i^2 + sigma_j^2), b(z) = tanh(nu z) calibrated to
 * NFL scale (start from FiveThirtyEight NFL Elo scale, shrink per the paper's (B')-style
 * diagnostic) so injury-hit/high-variance teams' ratings shrink toward the mean automatically;
 * serve weekly alongside the existing Elo and emit per-team sigma as an engine feature — then
 * learn sigma_i^2 as a latent parameter in a hierarchical model from squared Elo residuals
 * (Glicko-style, but for outcome variance) and publish the per-team sigma series as a GSE
 * 'consistency rating'.
 *
 * ACCEPTANCE GATE: Adopt if variance-corrected Elo beats standard Elo log-loss by >=0.5% overall on 2019-2025
 * rolling AND by >=1.5% on top-quartile-sigma team-weeks, with no weekly refit instability (max
 * week-to-week rating swing <= 2x the baseline's).
 *
 * Ingest role: feature builder (Elo with time-varying team strength: state-space + EM recipe).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2109.15046v2" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt if variance-corrected Elo beats standard Elo log-loss by >=0.5% overall on 2019-2025
 * rolling AND by >=1.5% on top-quartile-sigma team-weeks, with no weekly refit instability (max
 * week-to-week rating swing <= 2x the baseline's).`;

export const CONFIG = {
  enabled: false,
  stateSpace: "theta_t = theta_{t-1} + noise",
  inference: "EM offline; this module ships the filter core",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface VarState {
  readonly theta: number;
  readonly p: number;
}

/** Probit win probability from strength difference + HFA. */
export function probitWinProb(dTheta: number, hfa: number, sigma = 1): number | null {
  if (![dTheta, hfa, sigma].every(isFiniteNumber) || sigma <= 0) return null;
  const z = (dTheta + hfa) / (sigma * Math.SQRT2);
  return 0.5 * (1 + erf(z));
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/**
 * Extended-Kalman-ish update of a team's latent strength after one game.
 * Linearized probit observation; pure function.
 */
export function strengthUpdate(
  state: VarState,
  dThetaOpp: number,
  home: boolean,
  won: boolean,
  hfa: number,
  R: number,
  Q: number,
): VarState | null {
  if (![state.theta, state.p, dThetaOpp, hfa, R, Q].every(isFiniteNumber)) return null;
  if (state.p < 0 || R <= 0 || Q < 0) return null;
  const d = home ? state.theta - dThetaOpp + hfa : state.theta - dThetaOpp - hfa;
  const p = probitWinProb(d, 0);
  if (p === null) return null;
  const y = won ? 1 : 0;
  const phi = Math.exp(-d * d / 2) / Math.sqrt(2 * Math.PI);
  const H = phi;
  const pPred = state.p + Q;
  const K = (pPred * H) / (H * pPred * H + R);
  return {
    theta: state.theta + K * (y - p),
    p: Math.max(0, (1 - K * H) * pPred),
  };
}

/** Season trajectory of one team's strength. */
export function strengthTrajectory(
  games: ReadonlyArray<{ oppTheta: number; home: boolean; won: boolean }>,
  hfa: number,
  R: number,
  Q: number,
  init: VarState = { theta: 0, p: 1 },
): VarState[] | null {
  if (games.length === 0) return null;
  const out: VarState[] = [];
  let s = init;
  for (const g of games) {
    if (![g.oppTheta].every(isFiniteNumber) || typeof g.home !== "boolean" || typeof g.won !== "boolean") return null;
    const ns = strengthUpdate(s, g.oppTheta, g.home, g.won, hfa, R, Q);
    if (!ns) return null;
    out.push(ns);
    s = ns;
  }
  return out;
}
