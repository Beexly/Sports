/**
 * arXiv 2306.00840v1: What Model Does MuZero Learn?
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build a planning-bounds harness for the NFL play simulator: (1) train the learned play simulator; (2) replicate the paper's audit -- sample game states from the historical play-call distribution and measure the simulator's value (predicted EPA) error vs realized EPA as a function of rollout horizon (1-8 s) and play-call novelty (route-concept embedding distance from the historical play-call distribution); (3) enforce the paper's fix -- MCTS over play calls uses a strong policy prior = the empirical league play-call distribution (down/distance/formation-conditioned), logging TV divergence between prior and MCTS visit distribution as a health metric; (4) gate any 4th-down/go-for-it or play-call optimizer on this audit -- then test the paper's untested hypothesis: compare value-equivalence vs reconstruction-based (Dreamer-style) vs hybrid training on the same simulator using the novelty-decile error audit.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a planning-bounds harness for the NFL play simulator: (1) train the learned play simulator; (2) replicate the paper's audit - sample game states from the historical play-call distribution and measure the simulator's value (predicted EPA) error vs realized EPA as a function of rollout horizon (1-8 s) and play-call novelty (route-concept embedding distance from the historical play-call distribution); (3) enforce the paper's fix - MCTS over play calls uses a strong policy prior = the empirical league play-call distribution (down/distance/formation-conditioned), logging TV divergence between prior and MCTS visit distribution as a health metric; (4) gate any 4th-down/go-for-it or play-call optimizer on this audit - then test the paper's untested hypothesis: compare value-equivalence vs reconstruction-based (Dreamer-style) vs hybrid training on the same simulator using the novelty-decile error audit.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the prior-constrained planning design if: (a) simulator error grows monotonically with horizon AND with play novelty, AND (b) league-prior-constrained MCTS backtests >= +0.05 EPA/play over the historical policy on 2024 held-out weeks, AND (c) uniform-prior MCTS does not beat it; reject the planning use-case if the simulator's error on novel plays is flat or if prior-constrained search cannot beat history.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: world_models_simulators | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Exponential moving average update. */
export function emaUpdate(prev: number[], next: number[], momentum: number): number[] {
  return prev.map((p, i) => momentum * p + (1 - momentum) * next[i]!);
}

/** Cosine schedule for momentum (ramp-up over epochs). */
export function cosineMomentum(epoch: number, epochs: number, base: number, max = 1): number {
  return max - (max - base) * (Math.cos((Math.PI * epoch) / Math.max(1, epochs)) + 1) / 2;
}

/** Latent transition prediction (world model forward step). */
export function latentTransition(
  z: number[],
  a: number[],
  A: number[][],
  B: number[][],
): number[] {
  const n = z.length;
  return A.map((rowA, i) => {
    let s = 0;
    for (let j = 0; j < n; j++) s += rowA[j]! * z[j]!;
    for (let j = 0; j < a.length; j++) s += B[i]![j]! * a[j]!;
    return Math.tanh(s);
  });
}

/** Novelty audit score: relative reconstruction error vs baseline population. */
export function noveltyScore(err: number, baselineErrs: number[]): number {
  const m = baselineErrs.reduce((a, b) => a + b, 0) / baselineErrs.length;
  const sd = Math.sqrt(
    baselineErrs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, baselineErrs.length - 1),
  );
  return sd <= 0 ? 0 : (err - m) / sd;
}
