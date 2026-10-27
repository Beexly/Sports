/**
 * arXiv:2502.16313 — Bayesian multilevel location-scale model for
 * QB pre-snap motion snap-timing variance.
 *
 * ENABLED = false until tracking and scheme priors are wired.
 */
export const ENABLED = false;

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
