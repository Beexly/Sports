/**
 * Probability calibration toolkit — R&D (NOT wired into live scoring).
 *
 * The platform's thesis is "calibrated, not just confident." Today `confidence`
 * is a 0–100 heuristic, not a win probability. Turning it into a calibrated
 * probability is a deliberate, human-gated MODEL_VERSION change (readiness.ts:
 * canApplyCalibrationAdjustments, default false via CALIBRATION_ADJUSTMENTS_ENABLED). This module provides the
 * standard, well-established math that work will need, built and unit-tested in
 * advance — exactly like kelly.ts / poisson.ts ("exported for future model work").
 *
 * Nothing here imports or mutates the live scoring path. It operates on
 * (forecastProbability, binaryOutcome) samples drawn from settled, canonical,
 * learning-eligible picks.
 *
 * Contents:
 *   - isotonicCalibration: non-parametric monotonic mapping (PAVA) — the gold
 *     standard for recalibrating a monotone-but-miscalibrated score.
 *   - brierDecomposition: Murphy's reliability / resolution / uncertainty split —
 *     the rigorous way to read WHY a Brier score is what it is.
 *   - expectedCalibrationError: ECE over equal-width bins.
 */

export interface CalibrationSample {
  /** Forecast probability in [0,1] (e.g. a candidate modeled win probability). */
  readonly p: number;
  /** Realized binary outcome: 1 = win, 0 = loss. (PUSH/VOID excluded upstream.) */
  readonly y: 0 | 1;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round(value: number, digits = 4): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

// ============================================================
// Isotonic regression via the Pool-Adjacent-Violators Algorithm (PAVA)
// ============================================================

interface IsoPoint {
  /** Forecast value at which the calibrated estimate steps to `calibrated`. */
  readonly x: number;
  /** Calibrated probability (monotonic non-decreasing in x). */
  readonly calibrated: number;
}

export interface IsotonicModel {
  readonly points: readonly IsoPoint[];
  /** Map a forecast probability to its calibrated probability (step function). */
  readonly predict: (p: number) => number;
}

/**
 * Fit a monotonic (non-decreasing) calibration map from forecast → observed.
 * Pure PAVA: sort by forecast, then pool adjacent blocks that violate monotonicity
 * into their weighted-average outcome rate.
 */
export function isotonicCalibration(samples: readonly CalibrationSample[]): IsotonicModel {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  if (sorted.length === 0) {
    return { points: [], predict: (p) => clamp01(p) };
  }

  // Each block tracks its weighted mean outcome, total weight, and source span.
  const blocks: { value: number; weight: number; xStart: number }[] = [];
  for (const s of sorted) {
    // Merge with previous blocks while the previous mean exceeds this one.
    let block: { value: number; weight: number; xStart: number } = {
      value: s.y,
      weight: 1,
      xStart: s.p,
    };
    while (
      blocks.length > 0 &&
      (blocks[blocks.length - 1]!.value > block.value ||
        // Pool samples that share the same forecast x, so a repeated confidence
        // with mixed outcomes collapses to its observed rate (order-independent).
        blocks[blocks.length - 1]!.xStart === block.xStart)
    ) {
      const prev = blocks.pop()!;
      const mergedWeight = prev.weight + block.weight;
      block = {
        value: (prev.value * prev.weight + block.value * block.weight) / mergedWeight,
        weight: mergedWeight,
        xStart: prev.xStart, // the lower forecast where this pooled block begins
      };
    }
    blocks.push(block);
  }

  const points: IsoPoint[] = blocks.map((b) => ({
    x: b.xStart,
    calibrated: round(clamp01(b.value)),
  }));

  const predict = (p: number): number => {
    // Step function: the calibrated value of the highest breakpoint with x <= p.
    let result = points[0]!.calibrated;
    for (const pt of points) {
      if (p >= pt.x) result = pt.calibrated;
      else break;
    }
    return result;
  };

  return { points, predict };
}

// ============================================================
// Brier score + Murphy decomposition (reliability / resolution / uncertainty)
// ============================================================

export interface BrierDecomposition {
  /** Mean squared error of the forecasts. brier = reliability − resolution + uncertainty. */
  readonly brier: number;
  /** Lower is better: how far bin forecasts stray from bin outcome rates. */
  readonly reliability: number;
  /** Higher is better: how much the forecasts separate outcomes from the base rate. */
  readonly resolution: number;
  /** Irreducible: baseRate·(1−baseRate). */
  readonly uncertainty: number;
  readonly baseRate: number;
  readonly sampleSize: number;
}

function binIndex(p: number, bins: number): number {
  const i = Math.floor(clamp01(p) * bins);
  return i === bins ? bins - 1 : i; // p === 1 lands in the last bin
}

/**
 * Murphy (1973) two-component decomposition over `bins` equal-width bins.
 * Reliability and resolution are the actionable terms; uncertainty is fixed by
 * the data's base rate.
 */
export function brierDecomposition(
  samples: readonly CalibrationSample[],
  bins = 10,
): BrierDecomposition {
  const n = samples.length;
  if (n === 0) {
    return { brier: 0, reliability: 0, resolution: 0, uncertainty: 0, baseRate: 0, sampleSize: 0 };
  }

  const baseRate = samples.reduce((sum, s) => sum + s.y, 0) / n;

  const raw = samples.reduce((sum, s) => sum + (s.p - s.y) ** 2, 0) / n;

  // Per-bin aggregates.
  const binCount = new Array(bins).fill(0);
  const binForecastSum = new Array(bins).fill(0);
  const binOutcomeSum = new Array(bins).fill(0);
  for (const s of samples) {
    const b = binIndex(s.p, bins);
    binCount[b] += 1;
    binForecastSum[b] += s.p;
    binOutcomeSum[b] += s.y;
  }

  let reliability = 0;
  let resolution = 0;
  for (let b = 0; b < bins; b++) {
    const nk = binCount[b];
    if (nk === 0) continue;
    const fk = binForecastSum[b] / nk; // mean forecast in bin
    const ok = binOutcomeSum[b] / nk; // observed rate in bin
    reliability += nk * (fk - ok) ** 2;
    resolution += nk * (ok - baseRate) ** 2;
  }
  reliability /= n;
  resolution /= n;
  const uncertainty = baseRate * (1 - baseRate);

  return {
    brier: round(raw),
    reliability: round(reliability),
    resolution: round(resolution),
    uncertainty: round(uncertainty),
    baseRate: round(baseRate),
    sampleSize: n,
  };
}

// ============================================================
// Expected Calibration Error (ECE)
// ============================================================

/**
 * ECE over `bins` equal-width bins: the sample-weighted average gap between the
 * mean forecast and the observed rate in each bin. 0 = perfectly calibrated.
 */
export function expectedCalibrationError(
  samples: readonly CalibrationSample[],
  bins = 10,
): number {
  const n = samples.length;
  if (n === 0) return 0;

  const binCount = new Array(bins).fill(0);
  const binForecastSum = new Array(bins).fill(0);
  const binOutcomeSum = new Array(bins).fill(0);
  for (const s of samples) {
    const b = binIndex(s.p, bins);
    binCount[b] += 1;
    binForecastSum[b] += s.p;
    binOutcomeSum[b] += s.y;
  }

  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const nk = binCount[b];
    if (nk === 0) continue;
    const fk = binForecastSum[b] / nk;
    const ok = binOutcomeSum[b] / nk;
    ece += (nk / n) * Math.abs(fk - ok);
  }
  return round(ece);
}

// ============================================================
// Reliability curve (forecast vs observed per bin)
// ============================================================

export interface ReliabilityBin {
  /** Bin lower edge in [0,1]. */
  readonly binStart: number;
  /** Bin upper edge in [0,1]. */
  readonly binEnd: number;
  readonly count: number;
  /** Mean forecast probability of the samples in the bin. */
  readonly meanForecast: number;
  /** Observed outcome rate of the samples in the bin (the empirical truth). */
  readonly observedRate: number;
}

/**
 * The reliability diagram, as data: for each equal-width bin, the mean forecast
 * vs the observed outcome rate. A perfectly calibrated forecaster sits on the
 * diagonal (meanForecast === observedRate) in every populated bin.
 */
export function reliabilityCurve(samples: readonly CalibrationSample[], bins = 10): ReliabilityBin[] {
  // Untyped arrays (any[]) to match the package's other bin aggregators under
  // noUncheckedIndexedAccess.
  const binCount = new Array(bins).fill(0);
  const binForecastSum = new Array(bins).fill(0);
  const binOutcomeSum = new Array(bins).fill(0);
  for (const s of samples) {
    const b = binIndex(s.p, bins);
    binCount[b] += 1;
    binForecastSum[b] += s.p;
    binOutcomeSum[b] += s.y;
  }
  const out: ReliabilityBin[] = [];
  for (let b = 0; b < bins; b++) {
    const nk: number = binCount[b];
    out.push({
      binStart: round(b / bins),
      binEnd: round((b + 1) / bins),
      count: nk,
      meanForecast: nk > 0 ? round(binForecastSum[b] / nk) : 0,
      observedRate: nk > 0 ? round(binOutcomeSum[b] / nk) : 0,
    });
  }
  return out;
}
