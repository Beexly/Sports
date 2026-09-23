/**
 * arXiv 2305.02968v1: Masked Trajectory Models for Prediction, Representation, and Control (MTM)
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Train MTM on NFL 10Hz tracking 2018-2024 as 'states' (22 agents + ball kinematics, snap-relative), 'actions' = per-player frame-to-frame displacements, 'returns' = play EPA / outcome class as a per-play conditioning token -- heteromodal regimes (tracking-only, tracking+charting, tracking+charting+odds plays) with missing-modality loss masking -- inference modes: (a) forward-dynamics mask -> ball-carrier trajectory forecasting (rushing-yard props); (b) outcome-conditioned generation -> counterfactual play simulation ('what if the safety bites?'); (c) frozen MTM embeddings as features for prop models -- with a two-level hierarchy (player-level encoder -> play-level encoder) instead of flat 22-agent sequences, and a 'coverage concept' modality from FTN charting (man/zone/blitz discrete tokens) for coaching queries like 'generate the most likely route combination vs Cover 3'.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Train MTM on NFL 10Hz tracking 2018-2024 as 'states' (22 agents + ball kinematics, snap-relative), 'actions' = per-player frame-to-frame displacements, 'returns' = play EPA / outcome class as a per-play conditioning token - heteromodal regimes (tracking-only, tracking+charting, tracking+charting+odds plays) with missing-modality loss masking - inference modes: (a) forward-dynamics mask -> ball-carrier trajectory forecasting (rushing-yard props); (b) outcome-conditioned generation -> counterfactual play simulation ('what if the safety bites?'); (c) frozen MTM embeddings as features for prop models - with a two-level hierarchy (player-level encoder -> play-level encoder) instead of flat 22-agent sequences, and a 'coverage concept' modality from FTN charting (man/zone/blitz discrete tokens) for coaching queries like 'generate the most likely route combination vs Cover 3'.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if: (a) heteromodal MTM masked-frame RMSE >= 15% lower than the full-modality-only model on held-out weeks, OR (b) prop-model log-loss improves >= 0.002 with MTM embeddings vs without, on held-out weeks 13-18; REJECT if neither holds.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: selfsupervised_tracking | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Random binary mask over n positions with keep-probability (1 - p). */
export function randomMask(n: number, p: number, rand: () => number): boolean[] {
  return Array.from({ length: n }, () => rand() > p);
}

/** Masked reconstruction error vs a baseline predictor. */
export function maskedReconError(
  xs: number[][],
  mask: boolean[],
  baseline: (i: number) => number[],
): number {
  let s = 0;
  let c = 0;
  for (let i = 0; i < xs.length; i++) {
    if (!mask[i]) continue;
    const pred = baseline(i);
    const xi = xs[i]!;
    for (let d = 0; d < xi.length; d++) s += (xi[d]! - pred[d]!) ** 2;
    c += xi.length;
  }
  return c === 0 ? 0 : s / c;
}

/** Heteromodal loss: sum over modalities with missing-modality masking. */
export function heteromodalLoss(losses: number[], present: boolean[]): number {
  let s = 0;
  let c = 0;
  for (let i = 0; i < losses.length; i++) {
    if (present[i]) {
      s += losses[i]!;
      c++;
    }
  }
  return c === 0 ? 0 : s / c;
}

/** Focal-length attention weights over a trajectory (multi-scale pooling). */
export function focalPool(xs: number[][], focalLengths: number[], alphas: number[]): number[] {
  const T = xs.length;
  const d = xs[0]!.length;
  const out = new Array<number>(d).fill(0);
  const asum = alphas.reduce((a, b) => a + b, 0);
  focalLengths.forEach((L, fi) => {
    const w = alphas[fi]! / asum;
    const start = Math.max(0, T - L);
    for (let t = start; t < T; t++) {
      const xt = xs[t]!;
      for (let k = 0; k < d; k++) out[k]! += (w / Math.max(1, T - start)) * xt[k]!;
    }
  });
  return out;
}
