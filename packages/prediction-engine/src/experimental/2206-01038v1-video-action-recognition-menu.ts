/**
 * arXiv 2206.01038v1: A Survey on Video Action Recognition in Sports (arXiv:2206.01038v1) — REPLACEMENT for 0620
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Use the survey's method taxonomy as the build menu for GSE's experimental video lane: (1) reproduce a SlowFast/TSM baseline on public SoccerNet event classification in PyTorch (validation of the pipeline before NFL footage); (2) fine-tune to NFL play-type/event recognition (formation, play result, personnel); (3) add the pose stream (ST-GCN) for the injury-hazard direction; then train a single multi-task model (event classification + temporal localization + pose estimation) instead of the survey's single-task baselines -- localization and pose are the same underlying signal as recognition on small NFL pilots.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Use the survey's method taxonomy as the build menu for GSE's experimental video lane: (1) reproduce a SlowFast/TSM baseline on public SoccerNet event classification in PyTorch (validation of the pipeline before NFL footage); (2) fine-tune to NFL play-type/event recognition (formation, play result, personnel); (3) add the pose stream (ST-GCN) for the injury-hazard direction; then train a single multi-task model (event classification + temporal localization + pose estimation) instead of the survey's single-task baselines — localization and pose are the same underlying signal as recognition on small NFL pilots.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the video lane's architecture menu iff the SoccerNet reproduction lands within 3 points of published accuracy AND a pilot fine-tune on ~200 labeled NFL plays achieves top-1 >= 0.70 on play-type classification; if the NFL pilot < 0.60, park the lane.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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
