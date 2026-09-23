/**
 * arXiv:2608.11203v1 — Capturing Uncertainty in Human Motion for Representation Learning in Soccer
 *
 * Self-supervised motion vocabulary: discrete distribution learning (DDL) categorical head over motion
 * codewords for 1.0s trajectory prediction, with frozen-rep linear heads for route-family classification —
 * the GTN+DDL pretraining stage for NFL 10Hz tracking.
 *
 * Improvement: Train a per-player spatio-temporal graph transformer with discrete distribution learning on NFL 10Hz tracking as a self-supervised motion-vocabulary pretraining stage, with frozen-rep linear heads for route-family classification and catch/tackle-frame spotting.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if: (a) GTN+DDL motion-prediction error >= 10% lower than GTN-only at the 1.0 s horizon on held-out weeks, AND (b) pretrained reps beat from-scratch by >= 5pp accuracy on route-family classification. REJECT if neither holds.
 */

/** DDL head: logits over K motion codewords at the prediction horizon. */
export interface DdlHead {
  /** codewords x feature-dim. */
  codebook: number[][];
  /** Temperature for the categorical distribution. */
  temperature: number;
}

/** Softmax with temperature. */
export function temperedSoftmax(logits: readonly number[], temp: number): number[] {
  if (temp <= 0) throw new Error("temperedSoftmax: temp > 0");
  const m = Math.max(...logits);
  const exps = logits.map((l) => Math.exp((l - m) / temp));
  const z = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / z);
}

/** DDL predictive distribution over codewords given frozen rep h. */
export function ddlDistribution(head: DdlHead, h: readonly number[]): number[] {
  const logits = head.codebook.map((cw) =>
    cw.reduce((s, v, i) => s + v * (h[i] ?? 0), 0),
  );
  return temperedSoftmax(logits, head.temperature);
}

/** Expected 1.0s displacement under the DDL distribution (codeword deltas). */
export function ddlExpectedDisplacement(
  head: DdlHead,
  h: readonly number[],
  codewordDeltas: readonly [number, number][],
): [number, number] {
  const probs = ddlDistribution(head, h);
  let dx = 0;
  let dy = 0;
  probs.forEach((p, i) => {
    dx += p * (codewordDeltas[i]?.[0] ?? 0);
    dy += p * (codewordDeltas[i]?.[1] ?? 0);
  });
  return [dx, dy];
}

/** Frozen-rep linear head for route-family classification. */
export function routeFamilyLogits(
  weights: readonly number[][],
  h: readonly number[],
): number[] {
  return weights.map((w) => w.reduce((s, v, i) => s + v * (h[i] ?? 0), 0));
}
