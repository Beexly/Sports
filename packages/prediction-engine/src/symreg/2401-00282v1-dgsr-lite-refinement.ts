/**
 * arXiv 2401.00282v1: Deep Generative Symbolic Regression
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Reimplement DGSR-lite: Set Transformer encoder + Transformer decoder with tree-state embeddings, pre-trained on synthetic sports-plausible equations (from the NSR Phase-2 generator) with d=4-8 variables; at inference, encode nflverse slices and run NGPQT-style refinement (or REINFORCE fine-tuning on NMSE) before Monte-Carlo MAP search -- with a refinement curriculum: refine first on GP-denoised targets, then raw data, testing whether staged refinement beats single-stage on recovery of known synthetic sports equations with injected noise.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Reimplement DGSR-lite: Set Transformer encoder + Transformer decoder with tree-state embeddings, pre-trained on synthetic sports-plausible equations (from the NSR Phase-2 generator) with d=4-8 variables; at inference, encode nflverse slices and run NGPQT-style refinement (or REINFORCE fine-tuning on NMSE) before Monte-Carlo MAP search - with a refinement curriculum: refine first on GP-denoised targets, then raw data, testing whether staged refinement beats single-stage on recovery of known synthetic sports equations with injected noise.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT inference-time refinement if it improves held-out RMSE by >=8% over no-refinement decoding at equal-or-fewer equation evaluations on the 2024-2025 window; REJECT if refinement gains vanish on noisy real data or merely recover the pre-training prior's favorite shapes.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: symreg_equation_discovery | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Normalized mean squared error. */
export function nmse(y: number[], pred: number[]): number {
  const m = y.reduce((a, b) => a + b, 0) / y.length;
  const denom = y.reduce((a, b) => a + (b - m) ** 2, 0);
  const num = y.reduce((a, b, i) => a + (b - pred[i]!) ** 2, 0);
  return denom <= 0 ? num : num / denom;
}

/** Random-restart hill climbing on numeric parameters of a candidate expression. */
export function hillClimbRefine(
  loss: (params: number[]) => number,
  init: number[],
  rand: () => number,
  steps: number,
  stepSize: number,
  restarts: number,
): { params: number[]; loss: number } {
  let bestP = init.slice();
  let bestL = loss(bestP);
  for (let r = 0; r < restarts; r++) {
    let p = r === 0 ? init.slice() : init.map((v) => v + (rand() - 0.5) * 2);
    let l = loss(p);
    for (let s = 0; s < steps; s++) {
      const q = p.map((v) => v + (rand() - 0.5) * 2 * stepSize);
      const lq = loss(q);
      if (lq < l) {
        p = q;
        l = lq;
      }
    }
    if (l < bestL) {
      bestL = l;
      bestP = p;
    }
  }
  return { params: bestP, loss: bestL };
}

/** Staged refinement curriculum: GP-denoised targets first, then raw. */
export function stagedRefine(
  lossDenoised: (p: number[]) => number,
  lossRaw: (p: number[]) => number,
  init: number[],
  rand: () => number,
): { params: number[]; loss: number } {
  const stage1 = hillClimbRefine(lossDenoised, init, rand, 40, 0.2, 3);
  return hillClimbRefine(lossRaw, stage1.params, rand, 40, 0.1, 2);
}
