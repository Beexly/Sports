/**
 * arXiv:2502.16313 — Bayesian multilevel location-scale model for
 * QB pre-snap motion snap-timing variance.
 *
 * ENABLED = false until tracking and scheme priors are wired.
 */
export const ENABLED = false;

export const ACCEPTANCE_GATE = {
  status: "UNEVALUATED_SHADOW_SEAL_GATE",
  paperId: "arXiv:2502.16313",
  title: "Bayesian multilevel location-scale model for QB pre-snap motion snap-timing variance",
  motionSpeedThresholdRatio: 0.45,
  requiresShadowSealDiff: true,
  sealBoundary: "PRE_SEAL_TUESDAY_0400_CT_ONLY",
} as const;

export type MotionFrame = {
  playerId: string;
  t: number;
  x: number;
  y: number;
};

/**
 * Returns the estimated snap-timing variance for the given scheme.
 * Production version fits a multilevel location-scale model.
 */
export function snapTimingVariance(frames: MotionFrame[], scheme: string): number {
  if (!ENABLED || frames.length < 2) return 0.1;
  // Simple empirical variance of inter-frame time deltas as a placeholder
  const dts: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    dts.push(frames[i].t - frames[i - 1].t);
  }
  const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
  const variance = dts.reduce((s, d) => s + (d - mean) ** 2, 0) / dts.length;
  // Scheme-specific scaling (placeholder)
  const schemeScale = scheme === "shanahan" ? 1.1 : scheme === "mcvay" ? 0.9 : 1.0;
  return variance * schemeScale;
}
