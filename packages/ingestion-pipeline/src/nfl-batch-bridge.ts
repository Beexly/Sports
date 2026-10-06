/**
 * NFL batch bridge — wires four score-distribution / season modules that had
 * zero barrel coverage:
 *   block-poisson      Dawid-Sebastiani dispersion MLE for chance rates
 *   parsimonious-season schedule-adjusted wins regression against a null table
 *   progress-target    play/drive progress + incremental R-squared
 *   skellam-margin     independent-Poisson margin distribution (l1 - l2)
 *
 * Doctrine: fail-closed everywhere. A season with too few teams, a Skellam
 * rate that is not positive, or a degenerate fit returns a typed refusal.
 * No rate is imputed, no season is projected from nothing, and a margin
 * distribution is never built from a non-positive lambda.
 */

import {
  logLambda,
  poissonLogLik,
  dawidSebastiani,
  fitChanceRates,
  type BlockObs,
  type ChanceRateParams,
} from "@sports/prediction-engine";
import {
  maeNullTable,
  scheduleAdjustedDiff,
  fitWinsRegression,
  predictWins,
  tableMae,
  type EarlyGame,
} from "@sports/prediction-engine";
import {
  playProgress,
  driveProgress,
  incrementalRSquared,
} from "@sports/prediction-engine";
import {
  besselI,
  skellamPMF,
  skellamCDF,
  marginProbs,
  coverProb,
  fitSkellamRegression,
  predictMarginProbs,
  type SkellamObs,
  type MarginProbs,
  type SkellamRegression,
} from "@sports/prediction-engine";

export type NflEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function requirePositive(value: number, label: string): NflEval<true> {
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: `${label} must be finite and > 0 — not imputed` };
  }
  return { ok: true, data: true };
}

function requireObjectMap(
  v: Readonly<Record<string, number>> | null | undefined,
  label: string,
): NflEval<true> {
  if (v == null || typeof v !== "object" || Array.isArray(v)) {
    return { ok: false, reason: `${label} must be an object map` };
  }
  const keys = Object.keys(v);
  if (keys.length === 0) {
    return { ok: false, reason: `${label} empty — not imputed` };
  }
  return { ok: true, data: true };
}

// ── block-poisson ───────────────────────────────────────────────────────────

/** Per-block log-lambda under the chance-rate parameterization. */
export function evalLogLambda(input: {
  readonly obs: BlockObs;
  readonly params: ChanceRateParams;
}): NflEval<number> {
  if (!input.obs) {
    return { ok: false, reason: "obs required — not imputed" };
  }
  if (!input.params) {
    return { ok: false, reason: "params required — not imputed" };
  }
  try {
    const v = logLambda(input.obs, input.params);
    if (!Number.isFinite(v)) {
      return { ok: false, reason: "logLambda returned a non-finite value" };
    }
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Poisson log-likelihood of a block panel. */
export function evalPoissonLogLik(input: {
  readonly obs: readonly BlockObs[];
  readonly params: ChanceRateParams;
}): NflEval<number> {
  if (!Array.isArray(input.obs) || input.obs.length === 0) {
    return { ok: false, reason: "obs empty — not imputed" };
  }
  try {
    const v = poissonLogLik(input.obs, input.params);
    if (!Number.isFinite(v)) {
      return { ok: false, reason: "poissonLogLik returned a non-finite value" };
    }
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Dawid-Sebastiani dispersion. Above 1 means the block panel is
 * over-dispersed relative to Poisson, so a negative-binomial is warranted.
 */
export function evalDispersion(input: {
  readonly obs: readonly BlockObs[];
  readonly params: ChanceRateParams;
}): NflEval<number> {
  if (!Array.isArray(input.obs) || input.obs.length === 0) {
    return { ok: false, reason: "obs empty — not imputed" };
  }
  try {
    const v = dawidSebastiani(input.obs, input.params);
    if (!Number.isFinite(v)) {
      return {
        ok: false,
        reason: "dawidSebastiani returned a non-finite dispersion",
      };
    }
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Gradient-ascent MLE of the chance-rate parameters for a block panel. */
export function evalFitChanceRates(input: {
  readonly obs: readonly BlockObs[];
  readonly lr?: number;
  readonly iters?: number;
}): NflEval<ChanceRateParams> {
  if (!Array.isArray(input.obs) || input.obs.length === 0) {
    return { ok: false, reason: "obs empty — not imputed" };
  }
  try {
    const p = fitChanceRates(input.obs, input.lr ?? 0.05, input.iters ?? 500);
    if (p == null) {
      return { ok: false, reason: "fitChanceRates returned null (insufficient data)" };
    }
    if (!Number.isFinite(p.baseRate)) {
      return { ok: false, reason: "fitChanceRates produced a non-finite base rate" };
    }
    return { ok: true, data: p };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── parsimonious-season ─────────────────────────────────────────────────────

/**
 * MAE a table of n teams scores against a null model. A wins regression
 * that cannot beat this number has earned nothing.
 */
export function evalMaeNullTable(input: { readonly n: number }): NflEval<number> {
  if (!Number.isInteger(input.n) || input.n < 2) {
    return { ok: false, reason: "n must be an integer >= 2" };
  }
  try {
    const v = maeNullTable(input.n);
    if (!Number.isFinite(v)) {
      return { ok: false, reason: "maeNullTable returned a non-finite value" };
    }
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Schedule-adjusted early point differential per team. */
export function evalScheduleAdjustedDiff(input: {
  readonly games: readonly EarlyGame[];
}): NflEval<Record<string, number>> {
  if (!Array.isArray(input.games) || input.games.length === 0) {
    return { ok: false, reason: "games empty — not imputed" };
  }
  try {
    return { ok: true, data: scheduleAdjustedDiff(input.games) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * OLS fit of final wins on schedule-adjusted early diff, with R-squared.
 * Needs at least 3 overlapping teams.
 */
export function evalFitWinsRegression(input: {
  readonly earlyDiff: Readonly<Record<string, number>>;
  readonly finalWins: Readonly<Record<string, number>>;
}): NflEval<{ slope: number; intercept: number; rSquared: number }> {
  const early = requireObjectMap(input.earlyDiff, "earlyDiff");
  if (!early.ok) return early;
  const wins = requireObjectMap(input.finalWins, "finalWins");
  if (!wins.ok) return wins;
  try {
    const fit = fitWinsRegression(input.earlyDiff, input.finalWins);
    if (![fit.slope, fit.intercept, fit.rSquared].every(Number.isFinite)) {
      return { ok: false, reason: "fitWinsRegression returned non-finite coefficients" };
    }
    return { ok: true, data: fit };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Predicted wins per team from a fitted model. */
export function evalPredictWins(input: {
  readonly earlyDiff: Readonly<Record<string, number>>;
  readonly slope: number;
  readonly intercept: number;
}): NflEval<Record<string, number>> {
  const early = requireObjectMap(input.earlyDiff, "earlyDiff");
  if (!early.ok) return early;
  if (!Number.isFinite(input.slope) || !Number.isFinite(input.intercept)) {
    return { ok: false, reason: "slope and intercept must be finite" };
  }
  try {
    return {
      ok: true,
      data: predictWins(input.earlyDiff, {
        slope: input.slope,
        intercept: input.intercept,
      }),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** MAE of a predicted-wins table against actuals, over overlapping teams. */
export function evalTableMae(input: {
  readonly predicted: Readonly<Record<string, number>>;
  readonly actual: Readonly<Record<string, number>>;
}): NflEval<number> {
  const predicted = requireObjectMap(input.predicted, "predicted");
  if (!predicted.ok) return predicted;
  const actual = requireObjectMap(input.actual, "actual");
  if (!actual.ok) return actual;
  const overlap = Object.keys(input.predicted).filter((t) => t in input.actual);
  if (overlap.length === 0) {
    return { ok: false, reason: "predicted and actual share no teams" };
  }
  try {
    return { ok: true, data: tableMae(input.predicted, input.actual) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── progress-target ─────────────────────────────────────────────────────────

/** Progress toward a first-down target on one play. */
export function evalPlayProgress(input: {
  readonly yardsGained: number;
  readonly yardsToGo: number;
  readonly down: 1 | 2 | 3 | 4;
  readonly downPenalty?: number;
}): NflEval<number> {
  const { yardsGained, yardsToGo, down } = input;
  if (!Number.isFinite(yardsGained) || !Number.isFinite(yardsToGo)) {
    return { ok: false, reason: "yardsGained and yardsToGo must be finite" };
  }
  if (yardsToGo <= 0) {
    return { ok: false, reason: "yardsToGo must be > 0" };
  }
  if (down < 1 || down > 4) {
    return { ok: false, reason: "down must be 1 | 2 | 3 | 4" };
  }
  try {
    return {
      ok: true,
      data: playProgress(yardsGained, yardsToGo, down, input.downPenalty ?? 0.1),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Mean play progress across a drive. */
export function evalDriveProgress(input: {
  readonly plays: readonly {
    readonly yardsGained: number;
    readonly yardsToGo: number;
    readonly down: 1 | 2 | 3 | 4;
  }[];
}): NflEval<number> {
  if (!Array.isArray(input.plays) || input.plays.length === 0) {
    return { ok: false, reason: "plays empty — not imputed" };
  }
  try {
    return { ok: true, data: driveProgress(input.plays) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Incremental R-squared of a full model over a baseline. A feature set that
 * cannot add explanatory power is not worth wiring into the gate.
 */
export function evalIncrementalRSquared(input: {
  readonly actual: readonly number[];
  readonly predEpaOnly: readonly number[];
  readonly predFull: readonly number[];
}): NflEval<number> {
  const { actual, predEpaOnly, predFull } = input;
  if (!Array.isArray(actual) || !Array.isArray(predEpaOnly) || !Array.isArray(predFull)) {
    return { ok: false, reason: "actual, predEpaOnly and predFull must be arrays" };
  }
  if (actual.length === 0) {
    return { ok: false, reason: "actual empty — not imputed" };
  }
  if (actual.length !== predEpaOnly.length || actual.length !== predFull.length) {
    return { ok: false, reason: "actual, predEpaOnly and predFull must be equal-length" };
  }
  try {
    const v = incrementalRSquared(actual, predEpaOnly, predFull);
    if (!Number.isFinite(v)) {
      return { ok: false, reason: "incrementalRSquared returned a non-finite value" };
    }
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── skellam-margin ──────────────────────────────────────────────────────────

/** Modified Bessel function of the first kind, order n. */
export function evalBesselI(input: {
  readonly n: number;
  readonly x: number;
}): NflEval<number> {
  const { n, x } = input;
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, reason: "n must be finite and >= 0" };
  }
  if (!Number.isFinite(x) || x < 0) {
    return { ok: false, reason: "x must be finite and >= 0" };
  }
  try {
    const v = besselI(n, x);
    if (!Number.isFinite(v)) {
      return { ok: false, reason: "besselI returned a non-finite value" };
    }
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Skellam PMF at k for independent Poisson scoring rates. */
export function evalSkellamPMF(input: {
  readonly k: number;
  readonly l1: number;
  readonly l2: number;
}): NflEval<number> {
  const { k, l1, l2 } = input;
  if (!Number.isFinite(k)) {
    return { ok: false, reason: "k must be finite" };
  }
  const a = requirePositive(l1, "l1");
  if (!a.ok) return a;
  const b = requirePositive(l2, "l2");
  if (!b.ok) return b;
  try {
    const p = skellamPMF(k, l1, l2);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return { ok: false, reason: "skellamPMF returned a value outside [0,1]" };
    }
    return { ok: true, data: p };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Skellam CDF at k. */
export function evalSkellamCDF(input: {
  readonly k: number;
  readonly l1: number;
  readonly l2: number;
}): NflEval<number> {
  const { k, l1, l2 } = input;
  if (!Number.isFinite(k)) {
    return { ok: false, reason: "k must be finite" };
  }
  const a = requirePositive(l1, "l1");
  if (!a.ok) return a;
  const b = requirePositive(l2, "l2");
  if (!b.ok) return b;
  try {
    const c = skellamCDF(k, l1, l2);
    if (!Number.isFinite(c) || c < 0 || c > 1) {
      return { ok: false, reason: "skellamCDF returned a value outside [0,1]" };
    }
    return { ok: true, data: c };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Full margin outcome probabilities from two scoring rates. */
export function evalMarginProbs(input: {
  readonly l1: number;
  readonly l2: number;
}): NflEval<MarginProbs> {
  const a = requirePositive(input.l1, "l1");
  if (!a.ok) return a;
  const b = requirePositive(input.l2, "l2");
  if (!b.ok) return b;
  try {
    const m = marginProbs(input.l1, input.l2);
    if (![m.homeWin, m.push, m.awayWin].every(Number.isFinite)) {
      return { ok: false, reason: "marginProbs returned non-finite probabilities" };
    }
    const total = m.homeWin + m.push + m.awayWin;
    if (Math.abs(total - 1) > 1e-6) {
      return { ok: false, reason: `marginProbs sum to ${total}, not 1 — not a partition` };
    }
    return { ok: true, data: m };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** P(home covers | spread) — the cover probability for a projected margin. */
export function evalCoverProb(input: {
  readonly l1: number;
  readonly l2: number;
  readonly spread: number;
}): NflEval<number> {
  const a = requirePositive(input.l1, "l1");
  if (!a.ok) return a;
  const b = requirePositive(input.l2, "l2");
  if (!b.ok) return b;
  if (!Number.isFinite(input.spread)) {
    return { ok: false, reason: "spread must be finite" };
  }
  try {
    const p = coverProb(input.l1, input.l2, input.spread);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return { ok: false, reason: "coverProb returned a value outside [0,1]" };
    }
    return { ok: true, data: p };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Fit scoring-rate regression coefficients from observed margins. */
export function evalFitSkellamRegression(input: {
  readonly data: readonly SkellamObs[];
  readonly iters?: number;
  readonly lr?: number;
  readonly l2?: number;
}): NflEval<SkellamRegression> {
  if (!Array.isArray(input.data) || input.data.length === 0) {
    return { ok: false, reason: "data empty — not imputed" };
  }
  try {
    const r = fitSkellamRegression(input.data, {
      iters: input.iters,
      lr: input.lr,
      l2: input.l2,
    });
    if (r == null) {
      return { ok: false, reason: "fitSkellamRegression returned null (insufficient data)" };
    }
    return { ok: true, data: r };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Margin probabilities implied by a fitted Skellam regression. */
export function evalPredictMarginProbs(input: {
  readonly regression: SkellamRegression;
  readonly covariates: readonly number[];
}): NflEval<MarginProbs> {
  if (!input.regression) {
    return { ok: false, reason: "regression required — not imputed" };
  }
  if (!Array.isArray(input.covariates)) {
    return { ok: false, reason: "covariates must be an array — not imputed" };
  }
  const d = input.regression.coef1.length - 1;
  if (input.covariates.length !== d) {
    return {
      ok: false,
      reason: `covariates (${input.covariates.length}) must match model width (${d})`,
    };
  }
  try {
    return {
      ok: true,
      data: predictMarginProbs(input.regression, input.covariates),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  logLambda,
  poissonLogLik,
  dawidSebastiani,
  fitChanceRates,
  maeNullTable,
  scheduleAdjustedDiff,
  fitWinsRegression,
  predictWins,
  tableMae,
  playProgress,
  driveProgress,
  incrementalRSquared,
  besselI,
  skellamPMF,
  skellamCDF,
  marginProbs,
  coverProb,
  fitSkellamRegression,
  predictMarginProbs,
};
export type {
  BlockObs,
  ChanceRateParams,
  EarlyGame,
  SkellamObs,
  MarginProbs,
  SkellamRegression,
};
