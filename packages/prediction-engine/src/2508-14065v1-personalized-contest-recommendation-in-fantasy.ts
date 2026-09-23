/**
 * arXiv:2508.14065v1 — Personalized Contest Recommendation in Fantasy Sports
 *
 * Three-tower personalization for ranking surfaces (user / item / interaction towers trained with pairwise
 * hinge loss). Disabled: the trained towers and implicit-feedback data are unavailable; the scoring and
 * loss math ships as the spec.
 *
 * Improvement: GSE personalizes its ranking surfaces (which picks/articles/contests each subscriber sees, notification priority) with a three-tower model on implicit feedback: user tower, item tower, and interaction tower trained with pairwise hinge loss.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if the offline test beats the LightGBM baseline by >=5% relative on P/R@5 on the time-ordered test window; REJECT if the deep model can't beat gradient boosting at GSE's data scale.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Dot-product score between user and item tower embeddings. */
export function towerScore(user: readonly number[], item: readonly number[]): number {
  if (user.length !== item.length || user.length === 0) throw new Error("towerScore: dim mismatch");
  return user.reduce((s, u, i) => s + u * (item[i] ?? 0), 0);
}

/**
 * Pairwise hinge loss: sum over (pos, neg) pairs of max(0, margin - (s+ - s-)).
 */
export function pairwiseHingeLoss(
  posScores: readonly number[],
  negScores: readonly number[],
  margin: number,
): number {
  if (margin < 0) throw new Error("pairwiseHingeLoss: margin >= 0");
  let loss = 0;
  let n = 0;
  for (const sp of posScores) {
    for (const sn of negScores) {
      loss += Math.max(0, margin - (sp - sn));
      n++;
    }
  }
  return n === 0 ? 0 : loss / n;
}

/** Interaction tower: elementwise product pooled to a scalar. */
export function interactionScore(
  user: readonly number[],
  item: readonly number[],
  w: readonly number[],
): number {
  if (user.length !== item.length || user.length !== w.length) {
    throw new Error("interactionScore: dim mismatch");
  }
  return user.reduce((s, u, i) => s + u * (item[i] ?? 0) * (w[i] ?? 0), 0);
}

/** Combined ranking score: user-item dot + interaction term. */
export function rankScore(
  user: readonly number[],
  item: readonly number[],
  w: readonly number[],
): number {
  return towerScore(user, item) + interactionScore(user, item, w);
}
