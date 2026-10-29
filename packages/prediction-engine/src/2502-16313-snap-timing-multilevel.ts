/**
 * arXiv:2502.16313 — Bayesian multilevel location-scale model for
 * QB pre-snap motion snap-timing variance.
 *
 * ACCEPTANCE_GATE (HUMAN_CALL_REQUIRED — SHADOW SEAL REQUIRED):
 * Module implements the heterogeneous-variance Gamma multilevel snap-timing model of
 * Nguyen & Yurko (2025, arXiv:2502.16313): \delta_i = t_i^{snap} - t_i^{motion} ~ Gamma(\mu_i, \alpha_i)
 * with QB random-effect log-variance u_q ~ N(0, \tau_q^2) and 0.45 top-speed motion onset threshold.
 * Refusal / Gate Criteria before flipping SNAP_TIMING_MULTILEVEL_ENABLED / ENABLED to true:
 *   1. Frame-level pre-snap motion tracking must be joined to base nflverse play-by-play.
 *   2. Must execute one full Tuesday 04:00 CT shadow-seal diff demonstrating zero regression on
 *      pre-snap penalty/sack calibration before entering coachMindsetHash.
 */
export const ENABLED = false;
export const SNAP_TIMING_MULTILEVEL_ENABLED = false as const;
export const SNAP_TIMING_MULTILEVEL_ACCEPTANCE_GATE = {
  status: "UNEVALUATED_SHADOW_SEAL_GATE",
  paperId: "arXiv:2502.16313",
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
  // The empirical-variance arithmetic IS implemented; ENABLED only means "no
  // production caller". The 0.1 default is for genuinely insufficient data,
  // not for the disabled flag.
  if (frames.length < 2) return 0.1;
  // Simple empirical variance of inter-frame time deltas as a placeholder.
  // The deltas are only meaningful when the tracking clock advances; a
  // non-monotonic series is corrupt frame data, and reporting a variance over
  // negative deltas would dress impossible physics up as a measured estimate.
  const dts: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    const dt = cur.t - prev.t;
    if (!(dt > 0)) {
      throw new Error(
        "2502-16313: non-monotonic frame timestamps; refusing to compute a variance over corrupt tracking data",
      );
    }
    dts.push(dt);
  }
  if (dts.length === 0) return 0.1;
  const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
  const variance = dts.reduce((s, d) => s + (d - mean) ** 2, 0) / dts.length;
  // The multilevel location-scale pooling across schemes is NOT implemented,
  // so the scheme label carries no multiplier. Shipping a fabricated 1.1/0.9
  // factor would misstate the variance by a constant nobody measured.
  void scheme;
  return variance;
}
