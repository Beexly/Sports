/**
 * arXiv 2108.08797: Physics-informed ML for head impact detection
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Adapt the synthetic-pretraining recipe for rare-event detectors in GSE's data pipeline (injury-event flags from tracking data, anomalous-play detection): build a physics/simulation-based synthetic generator for the rare class (the FE head-neck analog), pretrain the detector on synthetic + real negatives, fine-tune on real data, with time-shift augmentation, class-weighted loss, and pre-registered F2 (recall-weighted) reporting -- then extend to uncertainty-aware triage: MC-dropout at inference routes low-confidence events to manual review, quantifying the residual manual workload (hours/season) rather than claiming full automation. Serving = automated triage replacing manual video/charting review.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adapt the synthetic-pretraining recipe for rare-event detectors in GSE's data pipeline (injury-event flags from tracking data, anomalous-play detection): build a physics/simulation-based synthetic generator for the rare class (the FE head-neck analog), pretrain the detector on synthetic + real negatives, fine-tune on real data, with time-shift augmentation, class-weighted loss, and pre-registered F2 (recall-weighted) reporting — then extend to uncertainty-aware triage: MC-dropout at inference routes low-confidence events to manual review, quantifying the residual manual workload (hours/season) rather than claiming full automation. Serving = automated triage replacing manual video/charting review.
 *
 * ACCEPTANCE GATE (verbatim):
 * Gate (numeric): ADAPT the synthetic-pretraining recipe if the replication shows F2 gain >= 0.03 with no increase in false negatives. REJECT if synthetic pretraining degrades real-data calibration (PPV drop > 0.05 on real data).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: causal_injury | verdict: ADAPT | doctrine: SITUATIONAL
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
