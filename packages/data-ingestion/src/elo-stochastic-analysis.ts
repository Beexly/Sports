/**
 * Stochastic analysis of the Elo rating algorithm in round-robin tournaments
 *
 * arXiv:2212.12015v2 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add the K-factor scheduler to GSE's Elo module: K_k = s'*beta_{o,k} with beta from the paper's
 * Eq. 71, v-hat estimated each offseason from the prior season's final rating spread (M=32, k =
 * games played so far) — large K early (fast convergence), decaying through the season; recompute
 * R for the NFL schedule (replace uniform Eq. 14 with the empirical matchup-frequency matrix), re-
 * derive tau1 for a preseason burn-in (ratings provisional before k ~= 3*tau1 games), and enforce
 * K_k < 2*v-hat*s' as a hard cap — then run the 2x2 with the luck-capped link (paper 0576):
 * fixed/scheduled K x standard/capped link on the walk-forward protocol, shipping both only if the
 * interaction is super-additive in the heavy-favorite tail, otherwise keeping the cheaper one.
 *
 * ACCEPTANCE GATE: ADOPT the scheduled K iff it beats fixed-K on pooled 2015-2025 log-loss by >=0.001 AND wins the
 * first-6-weeks split (early-season adaptivity is the mechanism; a win only late-season is
 * suspect); ADAPT (scheduler for weeks 1-6, fixed K after) if it wins early-season only; REJECT if
 * no improvement — the NFL's non-round-robin schedule may break the R assumption beyond what the
 * trace approximation tolerates.
 *
 * Ingest role: feature builder (Elo stochastic analysis: stationary variance + convergence diagnostics).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2212.12015v2" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the scheduled K iff it beats fixed-K on pooled 2015-2025 log-loss by >=0.001 AND wins the
 * first-6-weeks split (early-season adaptivity is the mechanism; a win only late-season is
 * suspect); ADAPT (scheduler for weeks 1-6, fixed K after) if it wins early-season only; REJECT if
 * no improvement — the NFL's non-round-robin schedule may break the R assumption beyond what the
 * trace approximation tolerates.`;

export const CONFIG = {
  enabled: false,
  analysis: "round-robin stochastic approximation",
  kRange: [8, 32],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Stationary variance of Elo ratings (paper's closed-form approximation). */
export function stationaryVariance(k: number, nTeams: number, matchNoise = 1): number | null {
  if (![k, nTeams, matchNoise].every(isFiniteNumber) || k <= 0 || nTeams < 2 || matchNoise <= 0) return null;
  return (k * matchNoise) / (4 * (nTeams - 1));
}

/** Convergence time (games) to stationarity: ~ 4(n-1)/k. */
export function convergenceGames(k: number, nTeams: number): number | null {
  if (![k, nTeams].every(isFiniteNumber) || k <= 0 || nTeams < 2) return null;
  return (4 * (nTeams - 1)) / k;
}

/** Optimal K minimizing stationary MSE (bias-variance trade-off). */
export function optimalK(nTeams: number, trueSpread: number, matchNoise = 1): number | null {
  if (![nTeams, trueSpread, matchNoise].every(isFiniteNumber) || nTeams < 2 || trueSpread <= 0 || matchNoise <= 0) return null;
  return Math.sqrt((4 * (nTeams - 1) * matchNoise) / trueSpread);
}

/** Simulate round-robin Elo to stationarity (offline validation recipe). */
export function simulateRoundRobin(
  nTeams: number,
  trueStrength: readonly number[],
  k: number,
  rounds: number,
  seed = 7,
): number[] | null {
  if (!Number.isInteger(nTeams) || nTeams < 2 || trueStrength.length !== nTeams) return null;
  if (![k, rounds].every(isFiniteNumber) || k <= 0 || !Number.isInteger(rounds) || rounds <= 0) return null;
  if (!trueStrength.every(isFiniteNumber)) return null;
  let a = (seed >>> 0) || 1;
  const rand = (): number => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const ratings = new Array<number>(nTeams).fill(1500);
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < nTeams; i++) {
      for (let j = i + 1; j < nTeams; j++) {
        const p = 1 / (1 + Math.pow(10, -((ratings[i] ?? 0) - (ratings[j] ?? 0)) / 400));
        const upset = (rand() - 0.5) * 200;
        const homeWin = (trueStrength[i] ?? 0) + upset > (trueStrength[j] ?? 0);
        const actual = homeWin ? 1 : 0;
        ratings[i] = (ratings[i] ?? 0) + k * (actual - p);
        ratings[j] = (ratings[j] ?? 0) + k * ((1 - actual) - (1 - p));
      }
    }
  }
  return ratings;
}
