/**
 * arXiv 2302.13386: NBA2Vec: Dense Feature Representations of NBA Players
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Port NBA2Vec as GSE's learned player/lineup representation layer: play-by-play with 10 on-court players per play and a discrete outcome taxonomy (~20 classes); train the embedding + MLP model (embedding dim 8-32, hidden 128, cross-entropy) on all non-holdout games; validate on held-out games (mean KL per matchup; require the plateau-by-30-plays behavior as a sanity check); export frozen player embeddings as features into the fantasy/prop projection stack (concatenated with box-score priors); refresh on a rolling window (last 2 seasons) to capture form/role drift -- then replace mean-pooling with an attention/SET-transformer over the 10 embeddings (captures who-guards-whom) and add a temporal component (rolling embeddings).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Port NBA2Vec as GSE's learned player/lineup representation layer: play-by-play with 10 on-court players per play and a discrete outcome taxonomy (~20 classes); train the embedding + MLP model (embedding dim 8-32, hidden 128, cross-entropy) on all non-holdout games; validate on held-out games (mean KL per matchup; require the plateau-by-30-plays behavior as a sanity check); export frozen player embeddings as features into the fantasy/prop projection stack (concatenated with box-score priors); refresh on a rolling window (last 2 seasons) to capture form/role drift — then replace mean-pooling with an attention/SET-transformer over the 10 embeddings (captures who-guards-whom) and add a temporal component (rolling embeddings).
 *
 * ACCEPTANCE GATE (verbatim):
 * Gate (ADAPT): the embedding-plus-MLP predicts play-outcome distributions with mean KL ~= 0.3 on held-out playoff games, embeddings recover known roles, and the matchup optimizer produces sensible orderings; adopt as ADAPT (weakened only by missing baselines); improvement success = held-out KL <= 0.25 (>= ~17% relative improvement) with the same 25-game validation protocol.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Plain biased matrix factorization trained by SGD (win-prob / fantasy-points). */
export function mfSgd(
  obs: { u: number; i: number; r: number }[],
  nU: number,
  nI: number,
  k: number,
  epochs: number,
  lr: number,
  lambda: number,
  rand: () => number,
): { P: number[][]; Q: number[][]; mu: number } {
  const mu = obs.reduce((s, x) => s + x.r, 0) / obs.length;
  const P = Array.from({ length: nU }, () => Array.from({ length: k }, () => (rand() - 0.5) * 0.1));
  const Q = Array.from({ length: nI }, () => Array.from({ length: k }, () => (rand() - 0.5) * 0.1));
  for (let ep = 0; ep < epochs; ep++) {
    for (const { u, i, r } of obs) {
      const pred = mu + P[u]!.reduce((s, v, f) => s + v * Q[i]![f]!, 0);
      const e = r - pred;
      for (let f = 0; f < k; f++) {
        const pu = P[u]![f]!;
        const qi = Q[i]![f]!;
        P[u]![f] = pu + lr * (e * qi - lambda * pu);
        Q[i]![f] = qi + lr * (e * pu - lambda * qi);
      }
    }
  }
  return { P, Q, mu };
}

/** MF prediction. */
export function mfPredict(P: number[][], Q: number[][], mu: number, u: number, i: number): number {
  return mu + P[u]!.reduce((s, v, f) => s + v * Q[i]![f]!, 0);
}
