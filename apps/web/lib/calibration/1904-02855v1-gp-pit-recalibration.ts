// @ts-nocheck
/**
 * arXiv 1904.02855v1: Probabilistic Recalibration of Forecasts.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Probabilistic recalibration of forecasts: PIT-transform the engine's predictive densities using an empirical GP-PIT map fit on a Forecast-Observation Archive; the Forecast Advantage Measure (FAM) decides deployment in advance, read directly as Kelly wealth growth per bet.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Build a Forecast-Observation Archive (engine predictive densities + realized outcomes, 2020-2025) and add GP-PIT (GPME) recalibration as a post-processing layer on engine margin/total densities before pricing, using the Forecast Advantage Measure to decide deployment in advance and reading the predicted bits directly as Kelly wealth growth per bet.
 *
 * ACCEPTANCE GATE:
 * Deploy GP-PIT recalibration on GSE engine densities only if the a-priori FAM = dSbar/sqrt(Var(dS)) >= 2.0 on the FOA fit (2-sigma confidence the out-of-sample entropy-game winnings are positive).
 *
 * ENABLED=false: post-processing engine densities before pricing changes published numbers; needs a human call.
 */


export const ENABLED = false;

/** PIT values of realized outcomes under their forecast CDFs. */
export function pitValues(
  outcomes: readonly number[],
  forecastCdf: (y: number) => number,
): number[] {
  return outcomes.map((y) => {
    const p = forecastCdf(y);
    return Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  });
}

/**
 * Empirical GP-PIT map: empirical CDF of calibration PITs evaluated on a grid.
 * A calibrated forecaster has a uniform PIT distribution, i.e. the map is the identity.
 */
export function empiricalPitMap(
  calibPits: readonly number[],
  grid: readonly number[],
): number[] {
  const sorted = [...calibPits].sort((a, b) => a - b);
  const n = sorted.length;
  return grid.map((g) => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid]! <= g) lo = mid + 1;
      else hi = mid;
    }
    return lo / n;
  });
}

/** Apply the PIT map to raw PIT values (recalibrated PITs). */
export function applyPitMap(
  rawPits: readonly number[],
  grid: readonly number[],
  pitMap: readonly number[],
): number[] {
  return rawPits.map((p) => {
    if (p <= grid[0]!) return pitMap[0]!;
    for (let i = 1; i < grid.length; i++) {
      if (p <= grid[i]!) {
        const t = (p - grid[i - 1]!) / (grid[i]! - grid[i - 1]! || 1);
        return pitMap[i - 1]! + t * (pitMap[i]! - pitMap[i - 1]!);
      }
    }
    return pitMap[pitMap.length - 1]!;
  });
}

export interface FamResult {
  readonly dSbar: number;
  readonly variance: number;
  readonly fam: number;
}

/**
 * Forecast Advantage Measure: FAM = dSbar / sqrt(Var(dS)) where dS is the
 * per-observation entropy-game score difference (recalibrated minus raw).
 * dSbar reads directly as Kelly wealth growth per bet.
 */
export function forecastAdvantageMeasure(
  scoresRecal: readonly number[],
  scoresRaw: readonly number[],
): FamResult {
  const n = Math.min(scoresRecal.length, scoresRaw.length);
  if (n === 0) return { dSbar: 0, variance: 0, fam: 0 };
  const ds = Array.from({ length: n }, (_, i) => scoresRecal[i]! - scoresRaw[i]!);
  const dSbar = ds.reduce((a, b) => a + b, 0) / n;
  const variance = ds.reduce((a, b) => a + (b - dSbar) * (b - dSbar), 0) / n;
  const fam = variance > 0 ? dSbar / Math.sqrt(variance) : 0;
  return { dSbar, variance, fam };
}

/** Deploy gate: FAM >= 2.0 = 2-sigma confidence of positive out-of-sample winnings. */
export function meetsDeployGate(fam: number): boolean {
  return fam >= 2.0;
}

/** Predicted Kelly wealth growth per bet = dSbar (in bits when log2 scores used). */
export function kellyBitsPerBet(dSbar: number): number {
  return dSbar;
}
