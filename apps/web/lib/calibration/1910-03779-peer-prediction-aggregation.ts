// @ts-nocheck
/**
 * arXiv 1910.03779: 1162 Forecast Aggregation via Peer Prediction.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Forecast aggregation via peer prediction: replace hard top-k model selection with CA-style correlation-score softmax weighting w_j ~ exp(beta*s_j) over the full model pool (engine variants, components, posted cards, market-implied). CA preferred over SSR/PSR/DMI for the peer-skill signal.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Replace hard top-k model selection with CA-style correlation-score softmax weighting (w_j proportional to exp(beta*s_j)) over the full model pool -- engine variants, component models, posted cards, market-implied probabilities -- preferring CA over SSR/PSR/DMI for the peer-skill signal.
 *
 * ACCEPTANCE GATE:
 * ADOPT the CA-weighted ensemble if full-season 2025 mean Brier is >=3% lower than unweighted-mean Brier AND the win-rate on the GSE posted-pick set does not decline; also require per-week PAS rankings show rank correlation >=0.3 with next-week realized Brier (skill persistence check).
 *
 * ENABLED=false: replaces the ensemble weighting; shipping the CA-weighted ensemble needs a human call.
 */


export const ENABLED = false;

/**
 * CA (correlation agreement) peer-prediction score for each model:
 * s_j = mean_g (p_jg - meanOthers_g) * (y_g - meanOthers_g).
 * Models whose deviations from the peer consensus predict the outcome score high.
 */
export function caScores(
  predMatrix: readonly (readonly number[])[],
  ys: readonly number[],
): number[] {
  const m = predMatrix.length;
  if (m === 0) return [];
  const n = ys.length;
  return predMatrix.map((preds, j) => {
    let s = 0;
    for (let g = 0; g < n; g++) {
      let others = 0;
      for (let k = 0; k < m; k++) if (k !== j) others += predMatrix[k][g];
      const meanOthers = m > 1 ? others / (m - 1) : 0.5;
      s += (preds[g] - meanOthers) * (ys[g] - meanOthers);
    }
    return s / n;
  });
}

/** Softmax weighting w_j proportional to exp(beta * s_j). */
export function softmaxWeights(scores: readonly number[], beta: number): number[] {
  const mx = Math.max(...scores);
  const ex = scores.map((s) => Math.exp(beta * (s - mx)));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / sum);
}

/** Weighted aggregate forecast across the model pool. */
export function aggregateProbs(
  predMatrix: readonly (readonly number[])[],
  weights: readonly number[],
): number[] {
  const n = predMatrix[0].length;
  return Array.from({ length: n }, (_, g) =>
    predMatrix.reduce((a, preds, j) => a + weights[j] * preds[g], 0),
  );
}

/** Spearman rank correlation (skill-persistence check on PAS rankings). */
export function spearman(a: readonly number[], b: readonly number[]): number {
  const rank = (xs: readonly number[]): number[] => {
    const order = xs.map((_, i) => i).sort((x, y) => xs[x] - xs[y]);
    const r = new Array(xs.length).fill(0);
    order.forEach((idx, pos) => { r[idx] = pos; });
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const mean = (n - 1) / 2;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - mean) * (rb[i] - mean);
    da += (ra[i] - mean) * (ra[i] - mean);
    db += (rb[i] - mean) * (rb[i] - mean);
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/** Mean Brier of a forecast set. */
export function meanBrier(probs: readonly number[], ys: readonly number[]): number {
  return probs.reduce((a, p, i) => a + (p - ys[i]) * (p - ys[i]), 0) / probs.length;
}
