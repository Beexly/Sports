/**
 * arXiv:2508.15299v1 — BasketLiDAR: The First LiDAR-Camera Multimodal Dataset for Professional Basketball MOT
 *
 * Next-gen-stats game-state predictor: game classification (close / blowout trajectory) from
 * tracking-derived features with model-uncertainty bands, plus drive-outcome forecasts for every live
 * possession.
 *
 * Improvement: GSE adopts the occlusion-triggered repair design pattern for its film-analysis tracking tooling: primary tracker on the wide view, occlusion trigger on track-count drops, ReID repair from the alternate view — a pattern for college film where NGS is unavailable.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the repair pattern if on the 50-play occlusion test it reduces ID switches by >=30% vs the single-view baseline with per-play latency overhead <=2x; REJECT if ID-switch reduction <30% or the trigger fires on >20% of non-occluded frames.
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
/** Game-state features available live. */
export interface GameStateFeatures {
  scoreDiff: number;
  timeLeftFrac: number; // [0,1]
  yardLine: number; // 0..100
  down: 1 | 2 | 3 | 4;
  distance: number;
  pace: number; // plays per minute, recent
}

/** Classify the trajectory: close / lean / blowout. */
export function classifyGameState(f: GameStateFeatures): "close" | "lean" | "blowout" {
  const pressure = Math.abs(f.scoreDiff) / Math.max(0.05, f.timeLeftFrac);
  if (pressure < 14) return "close";
  if (pressure < 35) return "lean";
  return "blowout";
}

/**
 * Drive-outcome forecast: P(TD), P(FG), P(punt/turnover) from yard line,
 * down/distance via a simple calibrated mapping.
 */
export function driveOutcomeForecast(f: GameStateFeatures): { td: number; fg: number; stop: number } {
  if (f.yardLine < 0 || f.yardLine > 100) throw new Error("driveOutcomeForecast: yardLine in [0,100]");
  const toGo = Math.max(0, 100 - f.yardLine);
  const downPenalty = (f.down - 1) * 0.06 + Math.min(0.3, f.distance * 0.012);
  let td = Math.max(0.02, 0.42 * Math.exp(-toGo / 45) - downPenalty);
  let fg = toGo <= 35 ? Math.max(0.05, 0.35 - downPenalty * 0.5) : Math.max(0.01, 0.08 - downPenalty * 0.2);
  const total = td + fg;
  const stop = Math.max(0.05, 1 - total);
  const z = td + fg + stop;
  return { td: td / z, fg: fg / z, stop: stop / z };
}

/**
 * Uncertainty band: widen the point forecast by model disagreement across an
 * ensemble of forecasters (mean ± k*sd clipped to [0,1]).
 */
export function uncertaintyBand(
  ensemble: readonly number[],
  k = 1.5,
): [number, number] {
  if (ensemble.length < 2) throw new Error("uncertaintyBand: need >= 2 members");
  const m = mean(ensemble);
  const sd = std(ensemble);
  return [Math.max(0, m - k * sd), Math.min(1, m + k * sd)];
}

/** Win probability from score diff + time (logistic clock model). */
export function clockWinProb(scoreDiff: number, timeLeftFrac: number): number {
  const t = Math.max(0.02, timeLeftFrac);
  return 1 / (1 + Math.exp(-(scoreDiff * 0.35) / Math.sqrt(t)));
}
