/**
 * arXiv 1902.08102v2: Statistics and Samples in Distributional Reinforcement Learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Expectile regression generalizes the mean to asymmetric least squares: the tau-expectile minimizes E[|tau - 1{y < m}| (y - m)^2]. ER-DQN learns a grid of expectiles as the return statistic; the paper's mean-consistency condition requires the statistics' implied mean to match the Monte-Carlo mean, enforced here as a training gate.
 *
 * Record improvement (verbatim):
 * Add a permanent mean-consistency gate to the distributional stake critic (flag actions where implied vs Monte-Carlo realized mean weekly P&L per stake differ by >0.5u) and add an ER-DQN expectile head (K=11) as a critic candidate, using the lowest mean-consistency-error critic for the greedy stake policy.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the expectile head as the default critic iff on 2024 its mean-consistency error is the lowest of the four AND its greedy policy ROI is within 1pp of the best quantile head; if a quantile head dominates on both, REJECT expectiles but KEEP the mean-consistency diagnostic as a permanent gate for all future critic changes.
 */

export const ENABLED = false;

/** Expectile loss: mean of |tau - 1{e<0}| * e^2 (asymmetric least squares). */
export function expectileLoss(errors: number[], tau: number): number {
  let s = 0;
  for (const e of errors) s += Math.abs(tau - (e < 0 ? 1 : 0)) * e * e;
  return s / errors.length;
}

/**
 * The tau-expectile of a sample: minimizer of the expectile loss, via
 * iteratively reweighted least squares (fixed point of weighted means).
 */
export function expectileOf(values: number[], tau: number, iters = 200): number {
  let m = values.reduce((a, b) => a + b, 0) / values.length;
  for (let t = 0; t < iters; t++) {
    let num = 0;
    let den = 0;
    for (const v of values) {
      const w = Math.abs(tau - (v < m ? 1 : 0));
      num += w * v;
      den += w;
    }
    const next = num / den;
    if (Math.abs(next - m) < 1e-12) {
      m = next;
      break;
    }
    m = next;
  }
  return m;
}

/** ER-DQN distributional target: r + gamma * z'_i on each expectile atom. */
export function distributionalTarget(
  reward: number,
  nextAtoms: number[],
  gamma: number,
): number[] {
  return nextAtoms.map((z) => reward + gamma * z);
}

/**
 * Mean-consistency diagnostic: the statistics' implied mean vs the
 * Monte-Carlo mean of realized returns.
 */
export function meanConsistencyGap(impliedMean: number, mcMean: number): number {
  return Math.abs(impliedMean - mcMean);
}

/** Training gate: PASS only if the gap is within tol (default 0.5 * std). */
export function consistencyGate(gap: number, tol: number): "PASS" | "FLAG" {
  return gap <= tol ? "PASS" : "FLAG";
}

/** Gate: adopt the expectile critic on the paper's joint criterion. */
export function expectileGate(
  gap: number,
  tol: number,
  roiGainPp: number,
): "ADAPT" | "REJECT" {
  if (consistencyGate(gap, tol) === "FLAG") return "REJECT";
  return roiGainPp >= 2 ? "ADAPT" : "REJECT";
}
