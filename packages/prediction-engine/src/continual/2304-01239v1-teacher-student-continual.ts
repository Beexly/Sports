/**
 * arXiv 2304.01239v1: Online Distillation with Continual Learning for Cyclic Domain Shifts
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Teacher-student weekly update: the teacher is GSE's full-history calibrated model (refit monthly); the student is a lightweight model refit weekly on recent games but trained against the teacher's predicted probabilities (soft targets), not hard outcomes -- preserving calibration while tracking the current regime fast; serve the student, falling back to the teacher when the student's regime-OOD score is high -- with a cyclic replay buffer guaranteeing minimum representation of each regime stratum (early/mid/December-weather/playoffs) from prior seasons, RWalk-style drift regularization on the top-K features, and a regime-conditional teacher variant (4 frozen regime teachers, distilling against the upcoming regime's teacher each week).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Teacher-student weekly update: the teacher is GSE's full-history calibrated model (refit monthly); the student is a lightweight model refit weekly on recent games but trained against the teacher's predicted probabilities (soft targets), not hard outcomes - preserving calibration while tracking the current regime fast; serve the student, falling back to the teacher when the student's regime-OOD score is high - with a cyclic replay buffer guaranteeing minimum representation of each regime stratum (early/mid/December-weather/playoffs) from prior seasons, RWalk-style drift regularization on the top-K features, and a regime-conditional teacher variant (4 frozen regime teachers, distilling against the upcoming regime's teacher each week).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the teacher-student update if on 2020-2025 walk-forward: (i) the distilled student matches or beats hard-label refit on anytime Brier while improving ECE by >=0.002, (ii) adding the cyclic buffer + RWalk improves December/playoff-regime Brier by >=0.003 with no metric worse by >0.001; REJECT distillation if the student's edge comes only from the teacher's information (teacher-frozen-since-August control); REJECT the RWalk half if it adds nothing over the buffer alone.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: continual_online_learning | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** EMA teacher weight update: theta_t = m * theta_t + (1 - m) * theta_s. */
export function teacherEmaUpdate(
  teacher: number[],
  student: number[],
  momentum: number,
): number[] {
  return teacher.map((t, i) => momentum * t + (1 - momentum) * student[i]!);
}

/** Consistency loss between student and teacher logits (MSE). */
export function consistencyLoss(student: number[], teacher: number[]): number {
  let s = 0;
  for (let i = 0; i < student.length; i++) s += (student[i]! - teacher[i]!) ** 2;
  return s / student.length;
}

/** Multi-crop agreement: average pairwise consistency across crops. */
export function multiCropAgreement(crops: number[][]): number {
  let s = 0;
  let c = 0;
  for (let i = 0; i < crops.length; i++) {
    for (let j = i + 1; j < crops.length; j++) {
      s += consistencyLoss(crops[i]!, crops[j]!);
      c++;
    }
  }
  return c === 0 ? 0 : s / c;
}

/** Fisher-information diagonal (empirical) for quadratic penalty terms. */
export function diagFisher(
  grads: number[][],
  n: number,
): number[] {
  const d = grads[0]!.length;
  const F = new Array<number>(d).fill(0);
  for (const g of grads) for (let j = 0; j < d; j++) F[j]! += g[j]! * g[j]!;
  return F.map((f) => f / Math.max(1, n));
}

/** RWalk quadratic penalty around stored optima (Fisher + path integral). */
export function rwalkPenalty(
  theta: number[],
  optParams: number[][],
  fishers: number[][],
  lambdas: number[],
): number {
  let s = 0;
  for (let k = 0; k < optParams.length; k++) {
    for (let j = 0; j < theta.length; j++) {
      const f = fishers[k]![j]!;
      const d = theta[j]! - optParams[k]![j]!;
      s += lambdas[k]! * f * d * d;
    }
  }
  return s;
}

/** Forgetting audit: accuracy drop on old-task holdout after new-task training. */
export function forgettingAudit(
  accBefore: number[],
  accAfter: number[],
): { forget: number; bwt: number } {
  const n = accBefore.length;
  const forget = accBefore.reduce((s, a, i) => s + Math.max(0, a - accAfter[i]!), 0) / n;
  const bwt = accAfter.reduce((s, a, i) => s + (a - accBefore[i]!), 0) / n;
  return { forget, bwt };
}
