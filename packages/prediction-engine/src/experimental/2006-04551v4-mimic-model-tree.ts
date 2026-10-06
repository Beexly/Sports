/**
 * arXiv 2006.04551v4: Cracking the Black Box: Distilling Deep Sports Analytics
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Distill the production probability model into a mimic model tree: engine soft labels on the full training corpus plus counterfactual augmentation (perturb game-state features: score diff +/-7, down/distance swaps, timeout changes), linear model tree (iterative segmented-regression splits, min 100 records/child, L1/L0 pruning); feature-importance ranking by summed variance reduction plus content-usable extracted rules; joint training on engine soft labels AND de-vigged market-implied probabilities for an interpretable engine-vs-market disagreement map.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Distill the production probability model into a mimic model tree: generate engine soft labels on the full training corpus plus counterfactual augmentation (perturb game-state features: score diff +/-7, down/distance swaps, timeout changes), fit a linear model tree (iterative segmented regression split-point heuristic, min 100 records/child, L1/L0 pruning); outputs: feature-importance ranking by summed variance reduction plus at least one content-usable extracted rule; train jointly on engine soft labels AND de-vigged market-implied probabilities for an interpretable engine-vs-market disagreement map.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the mimic-tree sidecar if: (i) fidelity correlation >= 0.95 and RMSE <= 0.03 on the time-ordered 2025 holdout; (ii) the top-10 importance ranking agrees with GSE's known drivers (no implausible top-3 feature); (iii) at least one extracted rule is content-usable by analysts.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Temperature-scaled softmax. */
export function temperatureSoftmax(logits: number[], T: number): number[] {
  const mx = Math.max(...logits);
  const e = logits.map((l) => Math.exp((l - mx) / T));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

/** Soft-target cross-entropy: student vs teacher probabilities. */
export function softCrossEntropy(student: number[], teacher: number[]): number {
  let s = 0;
  for (let i = 0; i < student.length; i++) {
    s -= teacher[i]! * Math.log(Math.max(1e-12, student[i]!));
  }
  return s;
}

/** Distillation loss: alpha * soft CE + (1-alpha) * hard CE. */
export function distillLoss(
  studentLogits: number[],
  teacherProbs: number[],
  hardLabel: number,
  T: number,
  alpha: number,
): number {
  const s = temperatureSoftmax(studentLogits, T);
  const soft = softCrossEntropy(s, teacherProbs);
  const hard = -Math.log(Math.max(1e-12, s[hardLabel]!));
  return alpha * T * T * soft + (1 - alpha) * hard;
}

/** Regime-OOD score: MMD-ish distance of a game feature vector to regime pool. */
export function regimeOODScore(x: number[], pool: number[][], h: number): number {
  let sim = 0;
  for (const p of pool) {
    let d = 0;
    for (let i = 0; i < x.length; i++) d += (x[i]! - p[i]!) ** 2;
    sim += Math.exp(-d / (2 * h * h));
  }
  return 1 - sim / pool.length; // 1 = far from every regime exemplar
}
