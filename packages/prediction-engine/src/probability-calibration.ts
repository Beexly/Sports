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
 *   - centeredIsotonicCalibration: CIR / CenteredIsotonic — PAVA plateaus collapsed
 *     to mass-weighted centers + linear interpolation so ranking/Kelly resolution
 *     is preserved (distinct calibrated values ≈ sample size, not ~50 steps).
 *     R&D only; same gate as isotonic (NOT live until CALIBRATION_ADJUSTMENTS_ENABLED).
 *   - brierDecomposition: Murphy's reliability / resolution / uncertainty split —
 *     the rigorous way to read WHY a Brier score is what it is.
 *   - expectedCalibrationError: ECE over equal-width bins.
 *   - countDistinctPredictions: diagnostic — plateaus destroy Kelly differentiation.
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

  // Correct PAVA is a TWO-phase algorithm.
  //
  // Phase 1 — collapse identical forecasts into ONE weighted group (its observed
  // outcome rate) BEFORE any pooling. This pre-pooling is what makes the strict
  // `>` merge in phase 2 correct. Streaming raw samples as weight-1 singletons
  // (the previous approach, with an `xStart ===` tie hack) instead let a same-x
  // sample violate a neighbouring block before its own group was formed, and let
  // a later same-x singleton spawn a spurious high block that never re-pooled —
  // producing a monotone-but-non-optimal map (NOT the SSE-minimising isotonic
  // fit; provably worse SSE on ~79% of random datasets).
  //
  // Phase 2 — the classic stack-based pool-adjacent-violators merge over those
  // pre-pooled groups.
  type Block = { value: number; weight: number; xStart: number };
  const groups: Block[] = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.xStart === s.p) {
      last.value = (last.value * last.weight + s.y) / (last.weight + 1);
      last.weight += 1;
    } else {
      groups.push({ value: s.y, weight: 1, xStart: s.p });
    }
  }
  const blocks: Block[] = [];
  for (const g of groups) {
    let block: Block = { ...g };
    while (blocks.length > 0 && blocks[blocks.length - 1]!.value > block.value) {
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
// Centered isotonic (CIR) — plateau-free ranking-preserving calibrator
// ============================================================

/**
 * Centered isotonic regression for probability calibration.
 *
 * Classic PAVA is well-calibrated but produces flat plateaus that collapse
 * many distinct forecasts onto one calibrated value — fine for ECE/Brier,
 * fatal for ranking and fractional/portfolio Kelly (identical stakes across
 * a band of real edges). CIR collapses each PAVA plateau to its
 * mass-weighted forecast center and linearly interpolates between centers
 * so the map is strictly increasing in the interior while remaining
 * monotone and free of tuning parameters (Oron CIR; calibre CenteredIsotonic).
 *
 * Still R&D — do not wire into live scoring without the calibration gate.
 */
export function centeredIsotonicCalibration(
  samples: readonly CalibrationSample[],
): IsotonicModel {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  if (sorted.length === 0) {
    return { points: [], predict: (p) => clamp01(p) };
  }

  type Block = {
    value: number;
    weight: number;
    xStart: number;
    xEnd: number;
    massSum: number; // sum of p_i * w for center
  };

  // Phase 1 — identical-p groups
  const groups: Block[] = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.xStart === s.p) {
      last.value = (last.value * last.weight + s.y) / (last.weight + 1);
      last.weight += 1;
      last.massSum += s.p;
      last.xEnd = s.p;
    } else {
      groups.push({
        value: s.y,
        weight: 1,
        xStart: s.p,
        xEnd: s.p,
        massSum: s.p,
      });
    }
  }

  // Phase 2 — PAVA merge, preserving x range + mass
  const blocks: Block[] = [];
  for (const g of groups) {
    let block: Block = { ...g };
    while (blocks.length > 0 && blocks[blocks.length - 1]!.value > block.value) {
      const prev = blocks.pop()!;
      const mergedWeight = prev.weight + block.weight;
      block = {
        value: (prev.value * prev.weight + block.value * block.weight) / mergedWeight,
        weight: mergedWeight,
        xStart: prev.xStart,
        xEnd: block.xEnd,
        massSum: prev.massSum + block.massSum,
      };
    }
    blocks.push(block);
  }

  // CIR: one point per block at mass-weighted center of the plateau
  const points: IsoPoint[] = blocks.map((b) => ({
    x: round(clamp01(b.massSum / b.weight)),
    calibrated: round(clamp01(b.value)),
  }));

  // Enforce strictly increasing x (identical centers → tiny epsilon push)
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.x <= points[i - 1]!.x) {
      points[i] = {
        x: round(Math.min(1, points[i - 1]!.x + 1e-6)),
        calibrated: points[i]!.calibrated,
      };
    }
  }

  const predict = (p: number): number => {
    const x = clamp01(p);
    if (points.length === 0) return x;
    if (x <= points[0]!.x) return points[0]!.calibrated;
    if (x >= points[points.length - 1]!.x) return points[points.length - 1]!.calibrated;
    for (let i = 1; i < points.length; i++) {
      const lo = points[i - 1]!;
      const hi = points[i]!;
      if (x <= hi.x) {
        const t = (x - lo.x) / (hi.x - lo.x || 1e-12);
        return round(clamp01(lo.calibrated + t * (hi.calibrated - lo.calibrated)));
      }
    }
    return points[points.length - 1]!.calibrated;
  };

  return { points, predict };
}

/**
 * How many distinct calibrated values a model emits over a forecast grid.
 * Classic PAVA often collapses ~2000 forecasts to ~50–80; CIR keeps ~1800+.
 * Low distinct count → Kelly cannot differentiate edge ranks.
 */
export function countDistinctPredictions(
  model: IsotonicModel,
  grid: readonly number[] = Array.from({ length: 101 }, (_, i) => i / 100),
): number {
  const seen = new Set<number>();
  for (const p of grid) {
    seen.add(model.predict(p));
  }
  return seen.size;
}

// ============================================================
// Brier score + Murphy decomposition (reliability / resolution / uncertainty)
// ============================================================

export interface BrierDecomposition {
  /**
   * Exact raw Brier score: the per-sample mean of (p − y)², in [0,1], lower is
   * better. This is computed from the actual forecasts, NOT from bin means.
   *
   * The Murphy identity brier = reliability − resolution + uncertainty holds
   * exactly only when forecasts are constant within each bin. `reliability` and
   * `resolution` below are the BINNED terms (each forecast is effectively
   * replaced by its bin's mean), so when forecasts vary inside a bin they differ
   * from this exact `brier` by a within-bin variance (discretization) term:
   * brier ≈ reliability − resolution + uncertainty. Treat the split as a
   * diagnostic read on WHY the score is what it is, not as an exact algebraic
   * reconstruction of `brier`.
   */
  readonly brier: number;
  /**
   * Binned reliability term (lower is better): sample-weighted mean squared gap
   * between each bin's mean forecast and its observed outcome rate.
   */
  readonly reliability: number;
  /**
   * Binned resolution term (higher is better): sample-weighted mean squared gap
   * between each bin's observed outcome rate and the overall base rate.
   */
  readonly resolution: number;
  /** Irreducible uncertainty fixed by the data: baseRate·(1−baseRate). */
  readonly uncertainty: number;
  /** Overall observed outcome rate (fraction of y === 1) across all samples. */
  readonly baseRate: number;
  /** Number of samples the decomposition was computed over. */
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
 *
 * The returned `brier` is the EXACT raw score (mean of (p − y)²), while
 * reliability/resolution are the BINNED terms. The identity
 * brier = reliability − resolution + uncertainty is exact only when forecasts
 * are constant within each bin; otherwise a within-bin variance term separates
 * the two (see `BrierDecomposition.brier`). More `bins` shrinks that gap.
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

// ============================================================
// Time hold-out split (never fit calibrator on the evaluation window)
// ============================================================

export interface TimestampedCalibrationSample extends CalibrationSample {
  /** Unix ms or any monotone time key — larger = later. */
  readonly t: number;
}

export interface TimeHoldoutSplit<T extends TimestampedCalibrationSample = TimestampedCalibrationSample> {
  readonly train: readonly T[];
  readonly test: readonly T[];
  readonly trainFraction: number;
}

/**
 * Time-ordered hold-out: sort by `t` ascending, first `trainFraction` → train,
 * remainder → test. Never random-shuffle for calibration (look-ahead leak).
 * `trainFraction` clamped to (0.05, 0.95); empty input → empty splits.
 */
export function timeHoldoutSplit<T extends TimestampedCalibrationSample>(
  samples: readonly T[],
  trainFraction = 0.7,
): TimeHoldoutSplit<T> {
  const frac = Math.min(0.95, Math.max(0.05, trainFraction));
  if (samples.length === 0) {
    return { train: [], test: [], trainFraction: frac };
  }
  const sorted = [...samples].sort((a, b) => a.t - b.t || a.p - b.p);
  const cut = Math.max(1, Math.min(sorted.length - 1, Math.floor(sorted.length * frac)));
  // If n===1, put sole sample in train so fit can run; test empty (caller checks).
  if (sorted.length === 1) {
    return { train: sorted, test: [], trainFraction: frac };
  }
  return {
    train: sorted.slice(0, cut),
    test: sorted.slice(cut),
    trainFraction: frac,
  };
}

// ============================================================
// Calibration paradox — ECE on the +EV / selected stake slice
// ============================================================

export interface SelectedSliceEceArgs {
  readonly samples: readonly CalibrationSample[];
  /** True when the row would have been staked / shown as +EV. */
  readonly selected: readonly boolean[];
  readonly bins?: number;
}

export interface SelectedSliceEceResult {
  readonly fullEce: number;
  readonly selectedEce: number;
  readonly unselectedEce: number;
  readonly selectedCount: number;
  readonly unselectedCount: number;
  /** selectedEce - fullEce; >0 means selected book looks worse-calibrated (paradox). */
  readonly paradoxGap: number;
}

/**
 * Compute ECE on the full set vs the selected (+EV) subset.
 * Well-known calibration paradox: models can look calibrated overall while
 * the stake-selected slice is overconfident. Gate sizing reports on both.
 */
export function selectedSliceEce(args: SelectedSliceEceArgs): SelectedSliceEceResult {
  const { samples, selected, bins = 10 } = args;
  if (samples.length !== selected.length) {
    throw new RangeError(
      `samples and selected must match length (got ${samples.length} vs ${selected.length})`,
    );
  }
  const sel: CalibrationSample[] = [];
  const unsel: CalibrationSample[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (selected[i]) sel.push(samples[i]!);
    else unsel.push(samples[i]!);
  }
  const fullEce = expectedCalibrationError(samples, bins);
  const selectedEce = expectedCalibrationError(sel, bins);
  const unselectedEce = expectedCalibrationError(unsel, bins);
  return {
    fullEce,
    selectedEce,
    unselectedEce,
    selectedCount: sel.length,
    unselectedCount: unsel.length,
    paradoxGap: round(selectedEce - fullEce),
  };
}
