/**
 * Proper scoring rules — the honest foundation the incumbent accuracy
 * leaderboards do not have.
 *
 * The dominant industry grader ranks experts by z-scoring rank-accuracy gaps
 * AGAINST THE FIELD and dropping each expert's worst week. That design has
 * six structural seams; the deepest is that a relative score can never detect
 * consensus-wide error — being wrong with everyone is free. These functions
 * are the antidote, and each one closes a specific seam BY CONSTRUCTION:
 *
 *   - Brier score / log loss are PROPER: the expected score is uniquely
 *     minimized by reporting true beliefs, so calibrated conviction (not
 *     ordinal chalk-hugging) wins. [closes: rank-only grading, seam 1]
 *   - Scores are ABSOLUTE: a forecaster is measured against reality, not the
 *     field, so consensus-wide misses cost everyone. [closes: relative-only,
 *     seam 6]
 *   - No dropped observations: every scored forecast counts. [closes:
 *     drop-worst-week blowup laundering, seam 2]
 *   - Coverage is reported alongside skill: skipping hard calls is visible,
 *     not free. [closes: omission gaming, seam 3]
 *
 * All functions are pure and deterministic. Probabilities are in [0, 1];
 * outcomes are 0/1. Invalid inputs throw — a scoring rule that silently
 * repairs its inputs is not a scoring rule.
 */

export interface ScoredForecast {
  /** Forecast probability the event happens, in [0, 1]. */
  readonly probability: number;
  /** What actually happened: 1 = event occurred, 0 = it did not. */
  readonly outcome: 0 | 1;
}

function assertForecast(f: ScoredForecast, index: number): void {
  if (!Number.isFinite(f.probability) || f.probability < 0 || f.probability > 1) {
    throw new Error(`scoring: forecast[${index}] probability must be in [0,1], got ${f.probability}`);
  }
  if (f.outcome !== 0 && f.outcome !== 1) {
    throw new Error(`scoring: forecast[${index}] outcome must be 0 or 1`);
  }
}

/**
 * Mean Brier score: (1/n)·Σ(p−o)². Lower is better; 0.25 is the score of a
 * coin-flip forecaster on balanced events; 0 is perfect.
 */
export function brierScore(forecasts: readonly ScoredForecast[]): number {
  if (forecasts.length === 0) return Number.NaN;
  let sum = 0;
  forecasts.forEach((f, i) => {
    assertForecast(f, i);
    sum += (f.probability - f.outcome) ** 2;
  });
  return sum / forecasts.length;
}

/**
 * Mean log loss (natural log), with probabilities clamped away from {0,1} by
 * epsilon so a single overconfident miss is heavily punished but finite —
 * an unbounded score would let one degenerate forecast dominate a season.
 * The clamp is public and fixed (1e-9): no per-forecaster tuning surface.
 */
export function logLoss(forecasts: readonly ScoredForecast[], epsilon = 1e-9): number {
  if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon >= 0.5) {
    // An out-of-range clamp silently produces invalid probabilities (negative
    // p, or no clamp at all) — reject instead of scoring garbage.
    throw new Error(`scoring: epsilon must be in (0, 0.5), got ${epsilon}`);
  }
  if (forecasts.length === 0) return Number.NaN;
  let sum = 0;
  forecasts.forEach((f, i) => {
    assertForecast(f, i);
    const p = Math.min(1 - epsilon, Math.max(epsilon, f.probability));
    sum += -(f.outcome === 1 ? Math.log(p) : Math.log(1 - p));
  });
  return sum / forecasts.length;
}

/**
 * Brier skill score vs a reference forecaster (conventionally the climatology
 * / base-rate forecaster). Positive = better than the reference; 0 = no
 * skill over it. This is the ABSOLUTE-anchored relative view: it compares to
 * a fixed, stated baseline, never to the shifting field.
 */
export function brierSkillScore(
  forecasts: readonly ScoredForecast[],
  referenceProbability?: number,
): number {
  if (forecasts.length === 0) return Number.NaN;
  const base =
    referenceProbability ?? forecasts.reduce((s, f) => s + f.outcome, 0) / forecasts.length;
  const ref = brierScore(forecasts.map((f) => ({ probability: base, outcome: f.outcome })));
  const own = brierScore(forecasts);
  if (ref === 0) return own === 0 ? 0 : Number.NEGATIVE_INFINITY;
  return 1 - own / ref;
}

export interface CalibrationBin {
  /** Inclusive lower edge of the forecast-probability bin. */
  readonly lower: number;
  /** Exclusive upper edge (inclusive for the final bin). */
  readonly upper: number;
  readonly count: number;
  /** Mean forecast probability inside the bin (NaN when empty). */
  readonly meanForecast: number;
  /** Realized frequency inside the bin (NaN when empty). */
  readonly realizedRate: number;
}

/**
 * Fixed-width reliability bins. Calibration is the DISPLAYED promise: a
 * forecaster who says 70% should be right ~70% of the time, and the gap is
 * shown per bin rather than laundered into a single number.
 */
export function calibrationBins(
  forecasts: readonly ScoredForecast[],
  binCount = 10,
): CalibrationBin[] {
  if (!Number.isInteger(binCount) || binCount < 1) {
    throw new Error(`scoring: binCount must be a positive integer, got ${binCount}`);
  }
  const sums = Array.from({ length: binCount }, () => ({ n: 0, p: 0, o: 0 }));
  forecasts.forEach((f, i) => {
    assertForecast(f, i);
    const idx = Math.min(binCount - 1, Math.floor(f.probability * binCount));
    const b = sums[idx]!;
    b.n++;
    b.p += f.probability;
    b.o += f.outcome;
  });
  return sums.map((b, i) => ({
    lower: i / binCount,
    upper: (i + 1) / binCount,
    count: b.n,
    meanForecast: b.n === 0 ? Number.NaN : b.p / b.n,
    realizedRate: b.n === 0 ? Number.NaN : b.o / b.n,
  }));
}

/**
 * Expected calibration error: coverage-weighted mean |forecast − realized|
 * across the reliability bins. 0 = perfectly calibrated.
 */
export function expectedCalibrationError(
  forecasts: readonly ScoredForecast[],
  binCount = 10,
): number {
  if (forecasts.length === 0) return Number.NaN;
  const bins = calibrationBins(forecasts, binCount);
  let acc = 0;
  for (const b of bins) {
    if (b.count > 0) {
      acc += (b.count / forecasts.length) * Math.abs(b.meanForecast - b.realizedRate);
    }
  }
  return acc;
}
