/**
 * Black-Box Batch Active Learning for Regression
 *
 * arXiv:2302.08981v2 · lane:active_learning · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the black-box active-learning acquisition pipeline for GSE's regression heads (spread
 * margin, total, team yardage): maintain a small ensemble K=10 (or reuse existing GBM bagged folds
 * as a free virtual ensemble), compute centered prediction vectors per pool game, build the
 * empirical predictive covariance Gram matrix, and run black-box BADGE (k-means++ on prediction-
 * disagreement embeddings) and black-box Core-Set for weekly charting queues — needs only
 * predictions, so it works unchanged across the heterogeneous stack; monitor the failure signal
 * (if inter-member disagreement collapses, e.g., late season, fall back to uniform/geometric
 * sampling); divide the acquisition score by charting cost c(game) for the knapsack rule (ledger
 * 2008) — then test disagreement-weighted virtual ensembles: weight each member's contribution to
 * the predictive covariance by its validation-set skill instead of uniform q_k = 1/K.
 *
 * ACCEPTANCE GATE: ADOPT black-box BADGE iff it matches or beats white-box BADGE on 2024 held-out margin RMSE at
 * equal batch size (delta-RMSE <= 0 — no accuracy cost for dropping gradient access) AND runs >=
 * 3x faster per acquisition round, with the win replicated on a second head (totals); REJECT if
 * black-box underperforms white-box by > 0.05 RMSE points (the Fisher-kernel approximation is
 * carrying real signal), or if pool disagreement collapses so black-box ~= uniform (their CatBoost
 * failure mode).
 *
 * Ingest role: feature builder (black-box batch active learning for regression: query-by-committee).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2302.08981v2" as const;
export const LANE = "active_learning" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT black-box BADGE iff it matches or beats white-box BADGE on 2024 held-out margin RMSE at
 * equal batch size (delta-RMSE <= 0 — no accuracy cost for dropping gradient access) AND runs >=
 * 3x faster per acquisition round, with the win replicated on a second head (totals); REJECT if
 * black-box underperforms white-box by > 0.05 RMSE points (the Fisher-kernel approximation is
 * carrying real signal), or if pool disagreement collapses so black-box ~= uniform (their CatBoost
 * failure mode).`;

export const CONFIG = {
  enabled: false,
  method: "query-by-committee batch AL",
  batchSize: 16,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type CommitteeModel = (x: readonly number[]) => number | null;

/** Committee disagreement: variance of member predictions. */
export function committeeDisagreement(models: readonly CommitteeModel[], x: readonly number[]): number | null {
  if (models.length < 2 || x.length === 0 || !x.every(isFiniteNumber)) return null;
  const preds: number[] = [];
  for (const m of models) {
    const p = m(x);
    if (p === null || !isFiniteNumber(p)) return null;
    preds.push(p);
  }
  const mean = preds.reduce((a, b) => a + b, 0) / preds.length;
  return preds.reduce((a, p) => a + (p - mean) * (p - mean), 0) / preds.length;
}

/** Greedy diverse batch: iteratively add the max-disagreement point with min distance to selected. */
export function diverseBatch(
  candidates: ReadonlyArray<readonly number[]>,
  models: readonly CommitteeModel[],
  batchSize: number,
  lambda = 0.5,
): number[] | null {
  if (candidates.length === 0 || !Number.isInteger(batchSize) || batchSize <= 0 || batchSize > candidates.length) return null;
  if (!isFiniteNumber(lambda) || lambda < 0) return null;
  const score = (x: readonly number[]): number | null => committeeDisagreement(models, x);
  const selected: number[] = [];
  const remaining = new Set(candidates.map((_, i) => i));
  const dist = (a: readonly number[], b: readonly number[]): number => {
    let s = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) s += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
    return Math.sqrt(s);
  };
  while (selected.length < batchSize && remaining.size > 0) {
    let best = -1;
    let bestV = -Infinity;
    for (const i of remaining) {
      const d = score(candidates[i] ?? []);
      if (d === null) return null;
      let minD = Infinity;
      for (const s of selected) minD = Math.min(minD, dist(candidates[i] ?? [], candidates[s] ?? []));
      const v = d + lambda * (selected.length === 0 ? 0 : minD);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    }
    if (best === -1) break;
    selected.push(best);
    remaining.delete(best);
  }
  return selected;
}

/** Expected improvement proxy: disagreement x predicted |residual| scale. */
export function expectedGain(disagreement: number, residualScale: number): number | null {
  if (![disagreement, residualScale].every(isFiniteNumber) || disagreement < 0 || residualScale < 0) return null;
  return disagreement * residualScale;
}
