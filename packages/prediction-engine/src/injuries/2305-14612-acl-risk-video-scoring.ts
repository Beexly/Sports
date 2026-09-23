/**
 * arXiv 2305.14612: Automated ACL injury-risk scoring from 2D video
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Replicate automated landing/cutting-mechanics scoring for NFL draft prospects from Combine drill video: run RTMPose per frame on vertical-jump/broad-jump landings and 3-cone/shuttle cuts, replicate the 5-feature extraction + threshold scoring, then replace the subjective AHP weights with supervised weights -- penalized logistic regression of actual prospect lower-body injuries (first-2-season IR) on the five feature scores across 3+ draft classes -- turning a screening score into a calibrated injury-probability model, extended to cutting mechanics (the more football-relevant ACL mechanism) with knee-valgus-at-plant as a sixth feature.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Replicate automated landing/cutting-mechanics scoring for NFL draft prospects from Combine drill video: run RTMPose per frame on vertical-jump/broad-jump landings and 3-cone/shuttle cuts, replicate the 5-feature extraction + threshold scoring, then replace the subjective AHP weights with supervised weights - penalized logistic regression of actual prospect lower-body injuries (first-2-season IR) on the five feature scores across 3+ draft classes - turning a screening score into a calibrated injury-probability model, extended to cutting mechanics (the more football-relevant ACL mechanism) with knee-valgus-at-plant as a sixth feature.
 *
 * ACCEPTANCE GATE (verbatim):
 * Gate (numeric): ADAPT if the replication achieves automated-vs-manual ICC >= 0.75 on the composite score; REJECT if ICC < 0.6 (2D pose noise swamps the clinical signal) or if the AHP-weighted composite fails to separate known groups (p > 0.05 for any pair).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: causal_injury | verdict: ADAPT | doctrine: SITUATIONAL
 */

export const ENABLED = false;

/** Scaled dot-product attention for one query row. */
export function attentionRow(q: number[], K: number[][], V: number[][]): number[] {
  const d = q.length;
  const scores = K.map((k) => k.reduce((s, v, i) => s + v * q[i]!, 0) / Math.sqrt(d));
  const mx = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - mx));
  const tot = e.reduce((a, b) => a + b, 0);
  const dOut = V[0]!.length;
  const out = new Array<number>(dOut).fill(0);
  e.forEach((w, i) => {
    const nw = w / tot;
    for (let j = 0; j < dOut; j++) out[j]! += nw * V[i]![j]!;
  });
  return out;
}

/** Trajectory attention map: per-frame attention weights. */
export function trajectoryAttention(traj: number[][], queryIdx: number): number[] {
  const q = traj[queryIdx]!;
  const scores = traj.map((k) => k.reduce((s, v, i) => s + v * q[i]!, 0) / Math.sqrt(q.length));
  const mx = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - mx));
  const tot = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / tot);
}

/** Temporal smoothing of an attention map (moving average). */
export function smoothAttention(weights: number[], radius: number): number[] {
  return weights.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(weights.length - 1, i + radius); j++) {
      s += weights[j]!;
      c++;
    }
    return s / c;
  });
}
