// @ts-nocheck
/**
 * arXiv 2609.05561: Rollcast: Proper-Score Gated Rolling Anchors for Adaptive Probabilistic Time-Series Forecasting.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Rollcast analog over team offensive/defensive efficiency time series: anchors from rolling mean/median/extremes/regression endpoints over windows of 6/10/16 games, standardized anchor-displacement states, a residual archive from similar past states, and a persistence rule that reacts to regime shocks faster than fixed persistence.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Build a Rollcast analog over team offensive/defensive efficiency time series: anchors from rolling mean/median/extremes/regression endpoints over windows of 6/10/16 games, standardized anchor-displacement states, and a residual archive from similar past states, with a persistence rule that reacts to regime shocks faster than fixed persistence.
 *
 * ACCEPTANCE GATE:
 * ADAPT the anchor/persistence components if the prototype's CRPS is within 10% of the engine's current distributions on stable-team stretches AND the persistence rule demonstrably reacts faster to regime shocks (post-injury weeks) than a fixed-persistence baseline; full rollout only after a real-data comparison the paper lacks.
 *
 * ENABLED=false: anchor/persistence components pending the real-data comparison gate.
 */


export const ENABLED = false;

export const ANCHOR_WINDOWS = [6, 10, 16];

export interface AnchorSet {
  readonly mean: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
  readonly regressionEndpoint: number;
}

/** Anchors over a trailing window of the efficiency series. */
export function computeAnchors(series: readonly number[], window: number): AnchorSet {
  const w = series.slice(Math.max(series.length - window, 0));
  const n = w.length;
  const mean = w.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const sorted = [...w].sort((a, b) => a - b);
  const median = n % 2 === 1 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
  // Regression endpoint: OLS fit over the window, evaluated at the last index.
  let slope = 0;
  let intercept = mean;
  if (n > 1) {
    const mx = (n - 1) / 2;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - mx) * (w[i]! - mean);
      den += (i - mx) * (i - mx);
    }
    slope = den > 0 ? num / den : 0;
    intercept = mean - slope * mx;
  }
  return {
    mean,
    median,
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
    regressionEndpoint: intercept + slope * (n - 1),
  };
}

/**
 * Standardized anchor-displacement state: z-scores of (current - anchor) for
 * each anchor type, concatenated across the 6/10/16 windows.
 */
export function anchorDisplacementState(
  series: readonly number[],
  scale: number,
): number[] {
  const current = series[series.length - 1] ?? 0;
  const s = Math.max(scale, 1e-9);
  const state: number[] = [];
  for (const w of ANCHOR_WINDOWS) {
    const a = computeAnchors(series, w);
    state.push(
      (current - a.mean) / s,
      (current - a.median) / s,
      (current - a.min) / s,
      (current - a.max) / s,
      (current - a.regressionEndpoint) / s,
    );
  }
  return state;
}

export interface ArchiveEntry {
  readonly state: readonly number[];
  readonly residual: number;
}

/** Find the k most similar past states (Euclidean) and return their residuals. */
export function residualArchiveLookup(
  archive: readonly ArchiveEntry[],
  state: readonly number[],
  k = 20,
): number[] {
  const dist = (a: readonly number[], b: readonly number[]) => {
    let s = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      s += (a[i]! - b[i]!) * (a[i]! - b[i]!);
    }
    return Math.sqrt(s);
  };
  return [...archive]
    .sort((x, y) => dist(x.state, state) - dist(y.state, state))
    .slice(0, k)
    .map((e) => e.residual);
}

/**
 * Persistence rule with regime-shock reaction: blend the anchor forecast with
 * the latest observation; when the shock detector (|z| of the last move)
 * exceeds the threshold, drop persistence weight toward the latest observation.
 */
export function persistenceForecast(
  anchorMean: number,
  lastValue: number,
  shockZ: number,
  basePersistence = 0.7,
  shockThreshold = 2.0,
): number {
  const persistence = Math.abs(shockZ) > shockThreshold ? 0.2 : basePersistence;
  return persistence * anchorMean + (1 - persistence) * lastValue;
}

/** Fixed-persistence baseline for the reaction-speed comparison. */
export function fixedPersistenceForecast(
  anchorMean: number,
  lastValue: number,
  persistence = 0.7,
): number {
  return persistence * anchorMean + (1 - persistence) * lastValue;
}
