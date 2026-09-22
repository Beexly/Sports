/**
 * 1169 From Proper Scoring Rules to Max-Min Optimal Forecast Aggregation
 *
 * arXiv:2102.07081 · lane:ensembles · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Operator-scoring-rule match (immediate): evaluate component models with log loss -> aggregate
 * with logarithmic (geometric) pooling; evaluate with Brier -> linear pooling; never mix
 * (concavity fails under mismatch); GSE's primary metric is log loss -> default to log pooling for
 * the ensemble. Online weight learning (~1-2 days): implement Algorithm B.3 -- online gradient
 * descent on the simplex of model weights, loss = -(log score of the QA pool) per week, weights
 * warm-started at equal weights.
 *
 * ACCEPTANCE GATE: ADOPT log pooling as GSE's default ensemble operator if it beats linear pooling on 2025 full-
 * season log loss, and ADOPT OGD-learned weights if the OGD ensemble beats equal weights on 2025
 * log loss with realized regret vs best-hindsight-mixture consistent with O(sqrt(T)). REJECT fixed
 * equal weighting if OGD's learned weights concentrate (>0.5 on one model) while beating equal
 * weights.
 *
 * Ingest role: feature builder (max-min optimal forecast aggregation: minimax regret weights).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2102.07081" as const;
export const LANE = "ensembles" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT log pooling as GSE's default ensemble operator if it beats linear pooling on 2025 full-
 * season log loss, and ADOPT OGD-learned weights if the OGD ensemble beats equal weights on 2025
 * log loss with realized regret vs best-hindsight-mixture consistent with O(sqrt(T)). REJECT fixed
 * equal weighting if OGD's learned weights concentrate (>0.5 on one model) while beating equal
 * weights.`;

export const CONFIG = {
  enabled: false,
  aggregation: "max-min optimal linear pool",
  rule: "proper scoring rules",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function simplexProject(w: readonly number[]): number[] | null {
  if (w.length === 0 || !w.every(isFiniteNumber)) return null;
  const sorted = [...w].sort((a, b) => b - a);
  let rho = 0;
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    sum += sorted[i] ?? 0;
    const t = (sum - 1) / (i + 1);
    if ((sorted[i] ?? 0) - t > 0) rho = i + 1;
    else break;
  }
  if (rho === 0) return new Array<number>(w.length).fill(1 / w.length);
  let s2 = 0;
  for (let i = 0; i < rho; i++) s2 += sorted[i] ?? 0;
  const theta = (s2 - 1) / rho;
  return w.map((v) => Math.max(0, v - theta));
}

/**
 * Max-min weights: minimize worst-case regret vs the best single expert
 * under the log score. Solved here by exponentiated-gradient on the simplex
 * over historical expert log-scores (offline recipe).
 */
export function maxMinWeights(
  expertLogScores: ReadonlyArray<readonly number[]>,
  iters = 200,
  eta = 0.5,
): number[] | null {
  const m = expertLogScores.length;
  if (m === 0 || !Number.isInteger(iters) || iters <= 0 || !isFiniteNumber(eta) || eta <= 0) return null;
  const T = expertLogScores[0]?.length ?? 0;
  if (T === 0 || !expertLogScores.every((e) => e.length === T && e.every(isFiniteNumber))) return null;
  let w = new Array<number>(m).fill(1 / m);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(m).fill(0);
    for (let t = 0; t < T; t++) {
      const col = expertLogScores.map((e) => e[t] ?? 0);
      const worst = Math.max(...col);
      const wi = w.map((x, i) => x * (worst - (col[i] ?? 0)));
      const tot = wi.reduce((a, b) => a + b, 0);
      if (tot > 0) for (let i = 0; i < m; i++) grad[i] = (grad[i] ?? 0) + (wi[i] ?? 0) / tot / T;
    }
    const nw = w.map((x, i) => x * Math.exp(-eta * (grad[i] ?? 0)));
    const proj = simplexProject(nw);
    if (!proj) return null;
    w = proj;
  }
  return w;
}

/** Linear opinion pool with weights. */
export function linearPool(probs: readonly number[], weights: readonly number[]): number | null {
  if (probs.length !== weights.length || probs.length === 0) return null;
  if (!probs.every((p) => isFiniteNumber(p) && p >= 0 && p <= 1)) return null;
  if (!weights.every((w) => isFiniteNumber(w) && w >= 0)) return null;
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum === 0) return null;
  return probs.reduce((s, p, i) => s + (p * (weights[i] ?? 0)) / wSum, 0);
}

/** Log score of a pooled forecast. */
export function logScore(p: number, y: 0 | 1): number | null {
  if (!isFiniteNumber(p) || p <= 0 || p >= 1) return null;
  return y === 1 ? Math.log(p) : Math.log(1 - p);
}
