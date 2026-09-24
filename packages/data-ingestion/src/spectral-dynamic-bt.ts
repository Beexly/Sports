/**
 * A Spectral Approach for the Dynamic Bradley-Terry Model
 *
 * arXiv:2307.16642v2 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build a KRC module for NFL weekly power ratings: items = 32 teams; outcomes = game results with
 * game dates; Gaussian kernel, bandwidth selected by walk-forward accuracy (~1 season of effective
 * memory, tuned on 2015-2025 nflverse); stationary distribution pi-hat(t) as a weekly power-rating
 * vector, converted to win probabilities via the BT link pi_j/(pi_i+pi_j); implement Algorithm 2
 * (rank-one online update with the group inverse) so ratings refresh after each game in O(n^2)
 * without refitting - usable for in-week updates - with covariate-augmented KRC: weight each
 * game's kernel contribution by a matchup-specific factor (rest differential, QB injury flag,
 * dome/outdoor), i.e. K_h(t,t_k)*w(x_k) with w learned.
 *
 * ACCEPTANCE GATE: ADOPT KRC as a weekly power-rating component if it beats the repo's existing dynamic rating by
 * >=1.0pp pooled winner accuracy over 2015-2025 AND beats Elo on the same window; ADAPT if it
 * matches but does not beat - keep the online-update machinery (Algorithm 2) as the fast in-week
 * refresh; REJECT if it underperforms static RC or Elo on NFL data.
 *
 * Ingest role: feature builder (spectral dynamic Bradley-Terry: rank-centrality trajectory + change points).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2307.16642v2" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT KRC as a weekly power-rating component if it beats the repo's existing dynamic rating by
 * >=1.0pp pooled winner accuracy over 2015-2025 AND beats Elo on the same window; ADAPT if it
 * matches but does not beat - keep the online-update machinery (Algorithm 2) as the fast in-week
 * refresh; REJECT if it underperforms static RC or Elo on NFL data.`;

export const CONFIG = {
  enabled: false,
  method: "spectral dynamic BT",
  window: "rolling",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface DatedGame {
  readonly home: string;
  readonly away: string;
  readonly homeWin: boolean;
  readonly playedAt: string;
}

/** Win matrix for a time window. */
export function windowWinMatrix(
  games: readonly DatedGame[],
  teams: readonly string[],
  startMs: number,
  endMs: number,
): number[][] | null {
  if (teams.length === 0 || ![startMs, endMs].every(isFiniteNumber) || startMs >= endMs) return null;
  const idx = new Map(teams.map((t, i) => [t, i]));
  const n = teams.length;
  const W: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const g of games) {
    const t = Date.parse(g.playedAt);
    if (!Number.isFinite(t) || t < startMs || t >= endMs) continue;
    const i = idx.get(g.home);
    const j = idx.get(g.away);
    if (i === undefined || j === undefined) return null;
    const row = W[g.homeWin ? i : j];
    const col = g.homeWin ? j : i;
    if (row) row[col] = (row[col] ?? 0) + 1;
  }
  return W;
}

/** Spectral scores: stationary distribution of the win-flow random walk. */
export function spectralScores(W: readonly number[][], iters = 200): number[] | null {
  const n = W.length;
  if (n === 0 || !W.every((r) => r.length === n && r.every((v) => isFiniteNumber(v) && v >= 0))) return null;
  let pi = new Array<number>(n).fill(1 / n);
  for (let it = 0; it < iters; it++) {
    const next = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      let out = 0;
      for (let k = 0; k < n; k++) out += W[k]?.[i] ?? 0;
      for (let j = 0; j < n; j++) {
        next[j] = (next[j] ?? 0) + (out > 0 ? (pi[i] ?? 0) * ((W[j]?.[i] ?? 0) / out) : (pi[i] ?? 0) / n);
      }
    }
    const tot = next.reduce((a, b) => a + b, 0);
    if (tot === 0) return null;
    for (let j = 0; j < n; j++) next[j] = (next[j] ?? 0) / tot;
    pi = next;
  }
  return pi;
}

/** Trajectory of spectral scores over rolling windows. */
export function scoreTrajectory(
  games: readonly DatedGame[],
  teams: readonly string[],
  windowMs: number,
  stepMs: number,
): Array<{ at: number; scores: number[] }> | null {
  if (games.length === 0 || teams.length === 0) return null;
  if (![windowMs, stepMs].every(isFiniteNumber) || windowMs <= 0 || stepMs <= 0) return null;
  const times = games.map((g) => Date.parse(g.playedAt)).filter(Number.isFinite);
  if (times.length === 0) return null;
  const start = Math.min(...times);
  const end = Math.max(...times);
  const out: Array<{ at: number; scores: number[] }> = [];
  for (let s = start; s + windowMs <= end + stepMs; s += stepMs) {
    const W = windowWinMatrix(games, teams, s, s + windowMs);
    if (!W) return null;
    const sc = spectralScores(W);
    if (!sc) return null;
    out.push({ at: s, scores: sc });
  }
  return out;
}

/** Change-point score: max L1 movement between consecutive windows. */
export function maxTrajectoryShift(traj: ReadonlyArray<{ scores: number[] }>): number | null {
  if (traj.length < 2) return null;
  let mx = 0;
  for (let i = 1; i < traj.length; i++) {
    const a = traj[i - 1]?.scores ?? [];
    const b = traj[i]?.scores ?? [];
    if (a.length !== b.length) return null;
    const d = a.reduce((s, v, k) => s + Math.abs(v - (b[k] ?? 0)), 0);
    if (d > mx) mx = d;
  }
  return mx;
}
