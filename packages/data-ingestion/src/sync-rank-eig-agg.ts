/**
 * Sync-Rank: Robust Ranking, Constrained Ranking and Rank Aggregation via Eigenvector and Semidefinite Programming Synchronization
 *
 * arXiv:1504.01070v1 · lane:team_ratings · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build a rating-fusion engine with the paper's Sync-Rank EIG-AGG: convert weekly rating snapshots
 * (engine win probs -> pairwise logit-difference matrices, Elo differences, market-implied
 * ratings, FPI) into angle matrices Theta^(u)_ij = pi*C^(u)_ij/C_max, sum to H-bar with accuracy-
 * based source weights, and take the top eigenvector as the consensus ranking -- for the published
 * weekly power-ranking graphic and outlier detection where sources disagree (large angular
 * residuals flagged for analyst review).
 *
 * ACCEPTANCE GATE: Adopt EIG-AGG fusion iff on 2023-2025 walk-forward: (a) consensus log loss beats the best single
 * source by >= 0.002; AND (b) beats simple rank-averaging by >= 0.001; AND (c) runtime per weekly
 * fusion < 30 s.
 *
 * Ingest role: feature builder (rating-fusion consensus + outlier detection for power rankings).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1504.01070v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt EIG-AGG fusion iff on 2023-2025 walk-forward: (a) consensus log loss beats the best single
 * source by >= 0.002; AND (b) beats simple rank-averaging by >= 0.001; AND (c) runtime per weekly
 * fusion < 30 s.`;

export const CONFIG = { enabled: false, powerIters: 200, runtimeBudgetSec: 30 } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Angle matrix Theta^(u)_ij = pi * C^(u)_ij / C_max from one source's pairwise
 * logit-difference matrix C. cMax = global scale across sources.
 */
export function angleMatrix(c: readonly number[][], cMax: number): number[][] | null {
  if (!isFiniteNumber(cMax) || cMax <= 0 || c.length === 0) return null;
  const n = c.length;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = c[i];
    if (!row || row.length !== n || !row.every(isFiniteNumber)) return null;
    out.push(row.map((v) => (Math.PI * v) / cMax));
  }
  return out;
}

/** Weighted sum H-bar = sum_u w_u * H^(u). Sources must share dimension. */
export function weightedSum(thetas: ReadonlyArray<readonly number[][]>, weights: readonly number[]): number[][] | null {
  if (thetas.length === 0 || thetas.length !== weights.length) return null;
  const first = thetas[0];
  if (!first) return null;
  const n = first.length;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let u = 0; u < thetas.length; u++) {
    const t = thetas[u];
    const w = weights[u];
    if (!t || !isFiniteNumber(w) || t.length !== n) return null;
    for (let i = 0; i < n; i++) {
      const row = t[i];
      const orow = out[i];
      if (!row || !orow || row.length !== n) return null;
      for (let j = 0; j < n; j++) orow[j] = (orow[j] ?? 0) + w * (row[j] ?? 0);
    }
  }
  return out;
}

/** Top eigenvector of H-bar by power iteration (the Sync-Rank EIG-AGG consensus). */
export function powerIteration(h: readonly number[][], iters = 200): number[] | null {
  const n = h.length;
  if (n === 0 || iters <= 0) return null;
  let v = new Array<number>(n).fill(1 / Math.sqrt(n));
  for (let t = 0; t < iters; t++) {
    const w = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const row = h[i];
      if (!row || row.length !== n) return null;
      let s = 0;
      for (let j = 0; j < n; j++) s += (row[j] ?? 0) * (v[j] ?? 0);
      w[i] = s;
    }
    const norm = Math.sqrt(w.reduce((a, b) => a + b * b, 0));
    if (norm === 0) return null;
    v = w.map((x) => x / norm);
  }
  return v;
}

/** Consensus ranking (team indices, strongest first). */
export function consensusRanking(scores: readonly number[]): number[] {
  return scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s).map((x) => x.i);
}

/**
 * Angular residuals |H_ij - (s_i - s_j)| wrapped to [0, pi]: large residuals
 * flag sources that disagree with the consensus (analyst-review outliers).
 */
export function angularResiduals(h: readonly number[][], scores: readonly number[]): number[][] | null {
  const n = h.length;
  if (n === 0 || scores.length !== n) return null;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = h[i];
    if (!row || row.length !== n) return null;
    const r: number[] = [];
    for (let j = 0; j < n; j++) {
      let d = Math.abs((row[j] ?? 0) - ((scores[i] ?? 0) - (scores[j] ?? 0)));
      d = d % (2 * Math.PI);
      if (d > Math.PI) d = 2 * Math.PI - d;
      r.push(d);
    }
    out.push(r);
  }
  return out;
}
