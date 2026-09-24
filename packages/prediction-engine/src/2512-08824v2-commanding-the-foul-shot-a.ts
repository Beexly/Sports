/**
 * arXiv:2512.08824v2 — Commanding the Foul Shot: A New Ensemble of Free Throw Metrics
 *
 * Hawk-Eye-style ball tracking from broadcast video: ball localization pipeline with a 2.43-pixel mean
 * error target, trajectory smoothing, and possession-event detection off the tracked path.
 *
 * Improvement: GSE ships a 'Kicker Command' module: C = 1/(1 + mu^2 + sigma^2) computed from NGS kick trajectories and upright-crossing deviation, evaluated alongside raw FG% as a truer kicker skill measure.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt if first-half kicker command predicts second-half distance-adjusted FG% with significantly higher correlation than first-half raw FG% (p<0.05, paired bootstrap), OR if command identifies >=3 kickers/year whose raw FG% misstates true skill by >5pp.
 */

/** Arithmetic mean. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean: empty");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Population standard deviation. */
export function std(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("std: empty");
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}
/** A 2D detection: frame index, pixel coords, confidence. */
export interface Detection {
  frame: number;
  x: number;
  y: number;
  conf: number;
}

/** Mean pixel error between detections and ground truth. */
export function meanPixelError(
  preds: readonly Detection[],
  truth: ReadonlyMap<number, { x: number; y: number }>,
): number {
  const errs: number[] = [];
  for (const p of preds) {
    const t = truth.get(p.frame);
    if (t) errs.push(Math.hypot(p.x - t.x, p.y - t.y));
  }
  if (errs.length === 0) throw new Error("meanPixelError: no matched frames");
  return mean(errs);
}

/**
 * Trajectory smoothing: confidence-weighted moving average with a
 * max-jump gate (rejects teleport detections).
 */
export function smoothTrajectory(
  dets: readonly Detection[],
  window: number,
  maxJump: number,
): Detection[] {
  if (window < 1) throw new Error("smoothTrajectory: window >= 1");
  const kept = dets.filter((d) => d.conf > 0.2).sort((a, b) => a.frame - b.frame);
  const out: Detection[] = [];
  for (let i = 0; i < kept.length; i++) {
    const lo = Math.max(0, i - window);
    const slice = kept.slice(lo, i + 1);
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (const d of slice) {
      sx += d.x * d.conf;
      sy += d.y * d.conf;
      sw += d.conf;
    }
    const cand = { frame: kept[i]!.frame, x: sx / sw, y: sy / sw, conf: kept[i]!.conf };
    const prev = out[out.length - 1];
    if (prev && Math.hypot(cand.x - prev.x, cand.y - prev.y) > maxJump) continue;
    out.push(cand);
  }
  return out;
}

/**
 * Possession-event detection: frames where ball speed drops below the catch
 * threshold while near a player marker are candidate receptions.
 */
export function detectPossessionEvents(
  traj: readonly Detection[],
  playerAt: (frame: number) => { x: number; y: number } | null,
  speedThresh: number,
  proxThresh: number,
): number[] {
  const events: number[] = [];
  for (let i = 1; i < traj.length; i++) {
    const a = traj[i - 1]!;
    const b = traj[i]!;
    const dt = b.frame - a.frame;
    if (dt <= 0) continue;
    const speed = Math.hypot(b.x - a.x, b.y - a.y) / dt;
    const pl = playerAt(b.frame);
    if (speed < speedThresh && pl && Math.hypot(b.x - pl.x, b.y - pl.y) < proxThresh) {
      if (events[events.length - 1] !== b.frame) events.push(b.frame);
    }
  }
  return events;
}
