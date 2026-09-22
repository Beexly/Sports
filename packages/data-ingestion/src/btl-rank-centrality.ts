/**
 * Dynamic Ranking with the BTL Model: A Nearest Neighbor based Rank Centrality Method
 *
 * arXiv:2109.13743v2 · lane:markets · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Ship a GSE dynamic rating service on the spectral BTL method: per-week union graph over a
 * trailing window, Rank Centrality eigenvector for team strengths, delta chosen by the paper's
 * T^{2/3} rule tuned by LOOCV on GSE data; serve weekly strength + rank with the l-infinity bound
 * as a published uncertainty envelope — then make delta adaptive: let the window shrink after
 * detected regime changes (blowout losses, QB injury) and expand in stable periods (change-point-
 * aware delta(t)), testing whether adaptive-delta beats fixed-delta* on rolling week-ahead log-
 * likelihood. Engine-honesty infrastructure for fast, uncertainty-quantified ratings.
 *
 * ACCEPTANCE GATE: ADAPT confirmed if DRC's week-ahead log-likelihood on 2024 NFL is within 0.005/game of GSE's
 * current rating AND DRC rebuild time is >=3x faster. Speed parity alone justifies the port given
 * the theory.
 *
 * Ingest role: feature builder (dynamic BTL ratings: kNN rank centrality + time decay).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2109.13743v2" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT confirmed if DRC's week-ahead log-likelihood on 2024 NFL is within 0.005/game of GSE's
 * current rating AND DRC rebuild time is >=3x faster. Speed parity alone justifies the port given
 * the theory.`;

export const CONFIG = {
  enabled: false,
  kNeighbors: 10,
  timeDecay: 0.98,
  powerIters: 200,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TimedGame {
  readonly home: string;
  readonly away: string;
  readonly homeWin: boolean;
  readonly playedAt: string;
}

/** Time-decayed win counts (kNN-in-time: recent games weigh more). */
export function decayedWinCounts(
  games: readonly TimedGame[],
  teams: readonly string[],
  decay = 0.98,
  nowMs = Date.now(),
): number[][] | null {
  if (teams.length === 0 || !isFiniteNumber(decay) || decay <= 0 || decay > 1) return null;
  const idx = new Map(teams.map((t, i) => [t, i]));
  const n = teams.length;
  const W: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const g of games) {
    const i = idx.get(g.home);
    const j = idx.get(g.away);
    const t = Date.parse(g.playedAt);
    if (i === undefined || j === undefined || !Number.isFinite(t)) return null;
    const weeks = Math.max(0, (nowMs - t) / (7 * 86400 * 1000));
    const w = Math.pow(decay, weeks);
    const row = W[g.homeWin ? i : j];
    const col = g.homeWin ? j : i;
    const r = row;
    if (r) r[col] = (r[col] ?? 0) + w;
  }
  return W;
}

/**
 * Rank centrality: stationary distribution of the random walk
 * P(i->j) = W[j][i] / sum_k W[k][i] (power iteration).
 */
export function rankCentrality(W: readonly number[][], iters = 200, tol = 1e-10): number[] | null {
  const n = W.length;
  if (n === 0 || !W.every((r) => r.length === n && r.every((v) => isFiniteNumber(v) && v >= 0))) return null;
  let pi = new Array<number>(n).fill(1 / n);
  for (let it = 0; it < iters; it++) {
    const next = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      let outSum = 0;
      for (let k = 0; k < n; k++) outSum += W[k]?.[i] ?? 0;
      for (let j = 0; j < n; j++) {
        const wji = W[j]?.[i] ?? 0;
        next[j] = (next[j] ?? 0) + (outSum > 0 ? (pi[i] ?? 0) * (wji / outSum) : (pi[i] ?? 0) / n);
      }
    }
    const tot = next.reduce((a, b) => a + b, 0);
    if (tot === 0) return null;
    for (let j = 0; j < n; j++) next[j] = (next[j] ?? 0) / tot;
    const diff = next.reduce((s, v, j) => s + Math.abs(v - (pi[j] ?? 0)), 0);
    pi = next;
    if (diff < tol) break;
  }
  return pi;
}

/** BTL win probability from centrality scores. */
export function btlWinProb(piI: number, piJ: number): number | null {
  if (![piI, piJ].every(isFiniteNumber) || piI < 0 || piJ < 0 || piI + piJ === 0) return null;
  return piI / (piI + piJ);
}
