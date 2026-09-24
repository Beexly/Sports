// ============================================================
// Training-dynamics disagreement gate (NNTD) (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (AuRC +5% relative, top-disagreement abstentions enriched for losses) to
 * pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2205.13532 — "Selective Classification Via Neural Network Training Dynamics"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: during training, snapshot the model's predictions at
 * each epoch/seed; instances whose predicted label flips late in training
 * (high training-dynamics disagreement vs the final prediction) are the
 * ones the model is least sure about — a stronger abstention signal than
 * final-epoch confidence alone.
 *
 * IMPROVEMENT (from ledger): Build GSE-NNTD: during training snapshot
 * slate predictions at each boosting round/epoch/seed (25-50 snapshots);
 * per pick compute late-weighted disagreement of snapshot predictions vs
 * the final pick; add as a second gate feature alongside the learned score —
 * abstain when disagreement is high even if final edge looks good
 * ('changed its mind late' picks) — weighted by when flips happen relative
 * to line movement (a late-training flip on a pick whose market line moved
 * against it is doubly suspect).
 *
 * ACCEPTANCE GATE: ADAPT accepted iff adding the disagreement feature
 * improves AuRC by >=5% relative over the edge-only gate on walk-forward
 * seasons AND the top-disagreement abstentions are enriched for losses
 * (precision check); else REJECT the feature (keep snapshot logging off to
 * save storage).
 */

export interface SnapshotPick {
  id: string;
  /** Predicted win prob at each snapshot (25-50 snapshots). */
  snapshotProbs: number[];
  /** Final pick's win prob. */
  finalProb: number;
  /** Final pick side: true = bet the side. */
  finalSide: boolean;
  /** Signed line movement against the pick (points, >= 0). */
  lineMoveAgainst: number;
  won: boolean;
}

/**
 * Late-weighted disagreement: mean |snapshotProb - finalProb| weighted to
 * emphasize late snapshots (weight w_t = t/T — late flips count more).
 */
export function lateWeightedDisagreement(snap: SnapshotPick): number {
  const T = snap.snapshotProbs.length;
  if (T === 0) return 0;
  let acc = 0;
  let wSum = 0;
  for (let t = 0; t < T; t++) {
    const w = (t + 1) / T; // late-weighted
    acc += w * Math.abs(snap.snapshotProbs[t]! - snap.finalProb);
    wSum += w;
  }
  return acc / wSum;
}

/**
 * Flip-timing × line-move interaction: a late-training flip on a pick whose
 * market line moved against it is doubly suspect. Returns the combined
 * suspicion score.
 */
export function flipLineInteraction(snap: SnapshotPick, lateFlipThreshold = 0.75): number {
  const T = snap.snapshotProbs.length;
  if (T === 0) return 0;
  const lateStart = Math.floor(T * lateFlipThreshold);
  let lateFlip = 0;
  for (let t = lateStart; t < T; t++) {
    const side = snap.snapshotProbs[t]! >= 0.5;
    if (side !== snap.finalSide) lateFlip = 1;
  }
  const disagreement = lateWeightedDisagreement(snap);
  // Interaction: late flip AND adverse line move.
  return disagreement * (1 + lateFlip * Math.min(snap.lineMoveAgainst, 3));
}

/**
 * NNTD gate feature: combine with the learned score — abstain when the
 * suspicion score exceeds tau even if the final edge looks good.
 */
export function nntdAbstain(snap: SnapshotPick, tau: number): boolean {
  return flipLineInteraction(snap) >= tau;
}

/** Area under the risk-coverage curve for a score (lower = better). Lower score = publish first. */
export function aurcForScores(picks: SnapshotPick[], scores: number[]): number {
  const n = picks.length;
  if (n === 0) return 0;
  const order = scores.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s);
  let acc = 0;
  let cumLoss = 0;
  for (let k = 0; k < n; k++) {
    cumLoss += picks[order[k]!.i]!.won ? 0 : 1;
    acc += cumLoss / (k + 1);
  }
  return acc / n;
}

/**
 * Precision check: are the top-disagreement abstentions enriched for
 * losses? Returns the loss rate among the top-k suspicion picks.
 */
export function topDisagreementLossRate(picks: SnapshotPick[], k: number): number {
  const ranked = picks
    .map((p) => ({ p, s: flipLineInteraction(p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(1, k));
  const losses = ranked.filter((r) => !r.p.won).length;
  return ranked.length > 0 ? losses / ranked.length : 0;
}

/**
 * Gate helper: AuRC improves >= 5% relative over the edge-only gate AND
 * top-disagreement abstentions are enriched for losses vs the base rate.
 */
export function nntdGatePasses(
  aurcWith: number,
  aurcEdgeOnly: number,
  topKLossRate: number,
  baseLossRate: number,
): boolean {
  return aurcWith <= 0.95 * aurcEdgeOnly && topKLossRate > baseLossRate;
}
