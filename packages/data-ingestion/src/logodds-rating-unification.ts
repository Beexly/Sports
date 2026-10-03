/**
 * 0004 Modelling Competitive Sports: Bradley-Terry-Élő Models for Supervised and On-Line Learning of Paired Competition Outcomes (arXiv:1701.08055v1)
 *
 * arXiv:1701.08055v1 · lane:team_ratings · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Unify GSE's rating stack on the structured log-odds view: refactor the existing Bradley-
 * Terry/Elo implementations so the log-odds matrix L is explicit (P = sigma(L); base L = theta.1^T
 * - 1.theta^T + h.1.1^T; gradient step d-ell/d-theta = (Y - p).dL/d-theta, eq. 14) with rank,
 * antisymmetry, home term, and feature terms as composable options; adopt two-stage training for
 * NFL Elo (Stage 1: batch MLE on a multi-season block with no fixed K; Stage 2: online per-game
 * updates with tuned learning rate), keeping vanilla rank-2 + home advantage + small binary
 * covariates (rookie QB, short rest); add the Skellam score-difference head as an auxiliary
 * training objective (predict margin distribution, derive win prob from P(Y>0)) for paired-
 * competition outcomes.
 *
 * ACCEPTANCE GATE: ADOPT the unified log-odds refactor + two-stage training if, on the 2017-2025 NFL test window:
 * (a) two-stage beats online Elo on mean log-likelihood with paired p < 0.01 (replicating H1); (b)
 * the refactored implementation reproduces the legacy Elo ratings to within 1e-6 on the training
 * block; (c) no adopted model variant underperforms vanilla Elo by more than 0.002 nats.
 *
 * Ingest role: feature builder (structured log-odds rating stack + Skellam margin head).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1701.08055v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the unified log-odds refactor + two-stage training if, on the 2017-2025 NFL test window:
 * (a) two-stage beats online Elo on mean log-likelihood with paired p < 0.01 (replicating H1); (b)
 * the refactored implementation reproduces the legacy Elo ratings to within 1e-6 on the training
 * block; (c) no adopted model variant underperforms vanilla Elo by more than 0.002 nats.`;

export const CONFIG = {
  enabled: false,
  stage1: "batch MLE, no fixed K",
  stage2: "online per-game updates, tuned lr",
  covariates: ["home", "rookie_qb", "short_rest"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Explicit log-odds matrix L = theta 1^T - 1 theta^T + h 1 1^T
 * (paper's structured view; P = sigma(L)).
 */
export function logOddsMatrix(thetas: readonly number[], homeAdv: number): number[][] | null {
  if (!isFiniteNumber(homeAdv) || !thetas.every(isFiniteNumber) || thetas.length === 0) return null;
  const n = thetas.length;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) row.push((thetas[i] ?? 0) - (thetas[j] ?? 0) + homeAdv);
    out.push(row);
  }
  return out;
}

/** Antisymmetry check: L_ij should equal -(L_ji - 2h)... base part antisymmetric. */
export function baseAntisymmetryError(L: readonly number[][], homeAdv: number): number | null {
  const n = L.length;
  if (n === 0) return null;
  let err = 0;
  for (let i = 0; i < n; i++) {
    const row = L[i];
    if (!row || row.length !== n) return null;
    for (let j = 0; j < n; j++) {
      const base = (row[j] ?? 0) - homeAdv;
      const other = ((L[j]?.[i] ?? 0) - homeAdv);
      err = Math.max(err, Math.abs(base + other));
    }
  }
  return err;
}

/**
 * Gradient step d-ell/d-theta = (Y - p) * dL/d-theta (paper eq. 14).
 * For the rank-2 + home base, dL_ij/d-theta_i = 1, dL_ij/d-theta_j = -1.
 */
export function gradientStepTheta(
  thetas: readonly number[],
  i: number,
  j: number,
  y: number,
  p: number,
  lr: number,
): number[] | null {
  if (![y, p, lr].every(isFiniteNumber) || lr <= 0 || y < 0 || y > 1 || p < 0 || p > 1) return null;
  if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= thetas.length || j >= thetas.length) return null;
  const next = [...thetas];
  next[i] = (next[i] ?? 0) + lr * (y - p);
  next[j] = (next[j] ?? 0) - lr * (y - p);
  return next;
}

/** Max abs diff between legacy and refactored ratings (gate (b): <= 1e-6). */
export function refactorReproError(legacy: readonly number[], refactored: readonly number[]): number | null {
  if (legacy.length !== refactored.length || legacy.length === 0) return null;
  if (!legacy.every(isFiniteNumber) || !refactored.every(isFiniteNumber)) return null;
  return Math.max(...legacy.map((v, i) => Math.abs(v - (refactored[i] ?? 0))));
}

/** Skellam margin head: P(home win) = P(Y > 0), Y ~ Skellam via normal approx. */
export function skellamWinProb(mu: number, sd: number): number | null {
  if (!isFiniteNumber(mu) || !isFiniteNumber(sd) || sd <= 0) return null;
  const z = mu / sd;
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
