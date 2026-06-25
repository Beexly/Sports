/**
 * Closing-line forecaster (Charter Move #1) — predict the signed line delta
 * (close − decision) from leakage-safe, decision-time features, and fire only when
 * the line is expected to move in our favor (positive expected CLV).
 *
 * Beating the close IS the ESTABLISHED rung (CLV ≥ 52.4%), so this is the highest-
 * leverage honest move. It is also fully backtestable on timestamped odds — no new
 * feeds, no exotic math.
 *
 * THE NULL WE MUST DISPROVE (H0): the current line already prices everything, so the
 * best estimate of the close is the current line itself — Δ̂ = 0 ("lock now"), and
 * expected CLV after vig is zero. A forecaster SHIPS A SIGNAL ONLY IF, OUT-OF-SAMPLE,
 * it beats that baseline on RMSE *and* clears ≥ 52.4% beat-close at adequate sample.
 * If it cannot, we shelve it and publish the null — a proven "no edge here" is an
 * honest success, not a failure. (Build spec: GSE_CLV_Forecaster_BuildSpec.md.)
 *
 * PURE BY DESIGN: feature extraction + a transparent ridge-linear predictor whose
 * weights are FIT OFFLINE (in the walk-forward harness) and injected here. This module
 * never trains in place, never does I/O, never reads a clock — every forecast is
 * replayable. Leakage-safe by construction: the feature builder accepts only
 * pre-decision inputs; the realized close is used solely as the label/grade.
 *
 * Convention: spread is HOME-perspective (negative = home favored); a "delta" is the
 * signed change in that home-perspective number from decision time to the close.
 *   HOME beats the close when the line moves DOWN (close < current) → HOME CLV = −delta.
 *   AWAY beats the close when the line moves UP   (close > current) → AWAY CLV = +delta.
 */

// ── Leakage-safe decision-time features ─────────────────────────────────────────

export interface ForecastFeatures {
  /** Hours from the decision snapshot to kickoff (≥ 0). */
  readonly hoursToKickoff: number;
  /** Movement already observed: current − opening (home-perspective points). */
  readonly driftSoFar: number;
  /** Cross-book disagreement at decision time (std or range across books, ≥ 0). */
  readonly crossBookDispersion: number;
  /** Independent fair line minus current line (e.g. Kalshi de-vig); 0 when absent. */
  readonly independentGap: number;
  /** 1 when an independent fair line was available, else 0 (so the model can gate it). */
  readonly hasIndependent: 0 | 1;
}

/** Canonical feature order — the linear weights align to this exactly. */
export const FEATURE_ORDER = [
  "driftSoFar",
  "crossBookDispersion",
  "independentGap",
  "hasIndependent",
  "hoursToKickoff",
] as const;

export function toFeatureVector(f: ForecastFeatures): number[] {
  return [f.driftSoFar, f.crossBookDispersion, f.independentGap, f.hasIndependent, f.hoursToKickoff];
}

export interface ForecastSample {
  readonly features: ForecastFeatures;
  /** The label: realized signed delta = close − current (home-perspective points). */
  readonly label: number;
}

// ── The model: a transparent ridge-linear predictor ─────────────────────────────

export interface RidgeModel {
  readonly intercept: number;
  /** Weights aligned to FEATURE_ORDER. */
  readonly weights: readonly number[];
  readonly lambda: number;
  readonly nTrain: number;
}

/** The H0 baseline: Δ̂ = 0 for everything ("lock now"). The bar every model must beat. */
export const BASELINE_MODEL: RidgeModel = {
  intercept: 0,
  weights: FEATURE_ORDER.map(() => 0),
  lambda: 0,
  nTrain: 0,
};

/** Predict the signed delta (close − current) for one decision snapshot. */
export function predictDelta(model: RidgeModel, features: ForecastFeatures): number {
  const x = toFeatureVector(features);
  let sum = model.intercept;
  for (let i = 0; i < x.length; i++) sum += (model.weights[i] ?? 0) * x[i]!;
  return sum;
}

// ── Linear algebra: a small dense solver + ridge normal equations ────────────────

/**
 * Solve A·x = b for a square system via Gaussian elimination with partial pivoting.
 * Returns null if the system is singular to working precision.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  // Work on copies so callers' matrices are untouched.
  const M = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col++) {
    // Partial pivot: swap in the row with the largest magnitude in this column.
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-12) return null; // singular
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];

    // Eliminate below.
    for (let r = col + 1; r < n; r++) {
      const factor = M[r]![col]! / M[col]![col]!;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r]![c]! -= factor * M[col]![c]!;
    }
  }

  // Back-substitution.
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let acc = M[row]![n]!;
    for (let c = row + 1; c < n; c++) acc -= M[row]![c]! * x[c]!;
    x[row] = acc / M[row]![row]!;
  }
  return x;
}

/**
 * Fit a ridge-regularized linear model predicting the signed delta from features.
 *
 * Solves (XᵀX + λI)·w = Xᵀy with an UNPENALIZED intercept column. λ shrinks the
 * feature weights toward zero (toward the Δ̂=0 baseline) — the regularization that
 * stops a small sample from inventing a signal. Returns the BASELINE_MODEL when the
 * sample is too small or the system is singular (an honest "no signal yet").
 */
export function fitRidge(samples: readonly ForecastSample[], lambda = 1): RidgeModel {
  const p = FEATURE_ORDER.length;
  const n = samples.length;
  // Need more rows than parameters for a meaningful fit; else stay at the baseline.
  if (n <= p + 1) return BASELINE_MODEL;

  // Design matrix with a leading intercept column of 1s.
  const X = samples.map((s) => [1, ...toFeatureVector(s.features)]);
  const y = samples.map((s) => s.label);
  const dim = p + 1;

  // Normal-equation system A = XᵀX + λI (intercept diagonal unpenalized), rhs = Xᵀy.
  const A: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  const rhs = new Array<number>(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      let acc = 0;
      for (let r = 0; r < n; r++) acc += X[r]![i]! * X[r]![j]!;
      A[i]![j] = acc;
    }
    A[i]![i]! += i === 0 ? 0 : lambda; // do not penalize the intercept
    let racc = 0;
    for (let r = 0; r < n; r++) racc += X[r]![i]! * y[r]!;
    rhs[i] = racc;
  }

  const solution = solveLinearSystem(A, rhs);
  if (!solution) return BASELINE_MODEL;

  return {
    intercept: solution[0]!,
    weights: solution.slice(1),
    lambda,
    nTrain: n,
  };
}

// ── Decision rule: SPEAK / LEAN / PASS, driven by expected CLV ───────────────────

export type ForecastRecommendation = "BET_HOME" | "BET_AWAY" | "PASS";

export interface ForecastAction {
  /** Predicted signed delta E[close − current]. */
  readonly predictedDelta: number;
  /** Expected CLV for taking HOME now (= −predictedDelta). */
  readonly homeExpectedClv: number;
  /** Expected CLV for taking AWAY now (= +predictedDelta). */
  readonly awayExpectedClv: number;
  readonly recommendation: ForecastRecommendation;
}

/**
 * Translate a forecast into an action: bet the side whose expected CLV clears the
 * threshold τ, else PASS. τ should be set so the net-of-vig expectation stays
 * positive (this is `edge-engine`'s SPEAK/LEAN/PASS fed by a CLV estimate).
 */
export function forecastAction(
  model: RidgeModel,
  features: ForecastFeatures,
  tau: number,
): ForecastAction {
  const predictedDelta = predictDelta(model, features);
  const homeExpectedClv = -predictedDelta;
  const awayExpectedClv = predictedDelta;
  let recommendation: ForecastRecommendation = "PASS";
  if (homeExpectedClv > tau) recommendation = "BET_HOME";
  else if (awayExpectedClv > tau) recommendation = "BET_AWAY";
  return { predictedDelta, homeExpectedClv, awayExpectedClv, recommendation };
}

// ── Evaluation: RMSE vs the Δ̂=0 baseline ────────────────────────────────────────

export interface ForecastEvalRow {
  readonly predictedDelta: number;
  /** Truth: realized close − current (home-perspective points). */
  readonly realizedDelta: number;
}

export interface ForecastEvaluation {
  readonly n: number;
  /** RMSE of the forecaster's predicted delta. */
  readonly rmse: number;
  /** RMSE of the Δ̂=0 baseline (= RMS of realized deltas). */
  readonly baselineRmse: number;
  /** baselineRmse − rmse; POSITIVE means the forecaster beats lock-now. */
  readonly rmseImprovement: number;
  /** Share where sign(predicted) = sign(realized) among non-trivial realized moves. */
  readonly directionalAccuracy: number;
}

export function evaluateForecastRmse(rows: readonly ForecastEvalRow[]): ForecastEvaluation {
  const n = rows.length;
  if (n === 0) {
    return { n: 0, rmse: 0, baselineRmse: 0, rmseImprovement: 0, directionalAccuracy: 0 };
  }
  let se = 0;
  let baseSe = 0;
  let dirHits = 0;
  let dirTotal = 0;
  for (const r of rows) {
    se += (r.predictedDelta - r.realizedDelta) ** 2;
    baseSe += r.realizedDelta ** 2;
    if (Math.abs(r.realizedDelta) > 1e-9) {
      dirTotal += 1;
      if (Math.sign(r.predictedDelta) === Math.sign(r.realizedDelta)) dirHits += 1;
    }
  }
  const rmse = Math.sqrt(se / n);
  const baselineRmse = Math.sqrt(baseSe / n);
  return {
    n,
    rmse,
    baselineRmse,
    rmseImprovement: baselineRmse - rmse,
    directionalAccuracy: dirTotal === 0 ? 0 : dirHits / dirTotal,
  };
}

// ── Evaluation: realized CLV at a decision threshold (the ≥52.4% gate input) ──────

export interface ClvAtThreshold {
  /** Rows where the rule fired a bet (HOME or AWAY). */
  readonly fired: number;
  /** Rows the rule passed on. */
  readonly passed: number;
  /** Share of FIRED bets that beat the close (realized CLV > 0) — the 52.4% target. */
  readonly beatCloseRate: number;
  /** Mean realized signed CLV across fired bets (points). */
  readonly meanSignedClv: number;
}

/**
 * Grade a forecaster's fired bets against the realized close. For each row the action
 * is decided from `predictedDelta` vs τ; the realized CLV is then read from
 * `realizedDelta` with the side's sign (HOME: −realized, AWAY: +realized). PASS rows
 * earn nothing and are excluded from the rate (you don't bet, so you can't beat the close).
 */
export function evaluateClvAtThreshold(
  rows: readonly ForecastEvalRow[],
  tau: number,
): ClvAtThreshold {
  let fired = 0;
  let passed = 0;
  let beats = 0;
  let clvSum = 0;
  for (const r of rows) {
    const homeClv = -r.predictedDelta;
    const awayClv = r.predictedDelta;
    let realizedClv: number | null = null;
    if (homeClv > tau) realizedClv = -r.realizedDelta;
    else if (awayClv > tau) realizedClv = r.realizedDelta;
    if (realizedClv === null) {
      passed += 1;
      continue;
    }
    fired += 1;
    clvSum += realizedClv;
    if (realizedClv > 0) beats += 1;
  }
  return {
    fired,
    passed,
    beatCloseRate: fired === 0 ? 0 : beats / fired,
    meanSignedClv: fired === 0 ? 0 : clvSum / fired,
  };
}

// ── Walk-forward OOS backtest (purged/embargoed, keystone-shaped) ────────────────

export interface WalkForwardOptions {
  /** Minimum training rows before the first OOS prediction. Default 50. */
  readonly minTrain?: number;
  /** Ridge λ. Default 1. */
  readonly lambda?: number;
  /** Rows to drop between train and test (embargo) to prevent leakage. Default 0. */
  readonly embargo?: number;
  /** Predict every `step`-th row (≥1) to bound cost on large samples. Default 1. */
  readonly step?: number;
}

/**
 * Expanding-window walk-forward: for each test row i (from minTrain onward), refit on
 * rows [0, i − embargo) and predict row i. Samples MUST be time-ordered oldest→newest.
 * Returns the OOS (predicted, realized) pairs — feed them to evaluateForecastRmse /
 * evaluateClvAtThreshold. This mirrors the keystone backtest's purge/embargo discipline.
 */
export function walkForwardForecast(
  samples: readonly ForecastSample[],
  options: WalkForwardOptions = {},
): ForecastEvalRow[] {
  const minTrain = options.minTrain ?? 50;
  const lambda = options.lambda ?? 1;
  const embargo = options.embargo ?? 0;
  const step = Math.max(1, Math.floor(options.step ?? 1));

  const out: ForecastEvalRow[] = [];
  for (let i = minTrain; i < samples.length; i += step) {
    const trainEnd = i - embargo;
    if (trainEnd <= FEATURE_ORDER.length + 1) continue;
    const model = fitRidge(samples.slice(0, trainEnd), lambda);
    out.push({ predictedDelta: predictDelta(model, samples[i]!.features), realizedDelta: samples[i]!.label });
  }
  return out;
}
