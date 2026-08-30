/**
 * Player-rate posteriors — small-sample shrinkage for per-player rate metrics.
 *
 * Purpose: turn a noisy, low-volume observed player rate (e.g. target share,
 * catch rate, yards per route) into a stabilized posterior by shrinking it
 * toward a peer/position prior. Two conjugate families are supported:
 *   - beta-binomial  for bounded [0,1] rates expressed as successes / trials
 *   - normal-normal  for continuous / unbounded rates expressed as a sample mean
 *
 * Shrinkage is credibility-style: w = n / (n + k), where n is the observed
 * sample size and k is the prior strength (a pseudo-count carried on the prior's
 * `sampleSize` field). Small n => posterior sits near the prior; large n =>
 * posterior tracks the observed rate.
 *
 * HONESTY GATE: every posterior is emitted with `priced: false` and
 * `status: "shadow"`. These are R&D/shadow signals only; they MUST NOT feed live
 * pricing, confidence scores, or user-facing picks until explicitly promoted.
 *
 * Determinism: pure functions of their inputs — no clock, no I/O, no randomness.
 * All emitted numbers are rounded to 4 decimals (`round4`) for stable, auditable
 * output.
 *
 * Units: rates are dimensionless. Bounded-rate means live in [0,1]; continuous
 * means are in the metric's native units. n and k are pseudo-counts in the same
 * unit as the observed sample size (games, routes, targets, ...).
 */

/**
 * Default prior strength k (pseudo-count) used by {@link buildEmpiricalBayesRatePrior}
 * when the caller does not supply `shrinkageK`. It is the number of
 * prior-equivalent observations the peer/position prior is worth: an observed
 * sample of n = k splits the posterior 50/50 between the observed rate and the
 * prior. This is a fixed hyperparameter, NOT derived from pool dispersion.
 */
export const DEFAULT_PLAYER_RATE_SHRINKAGE_K = 12;

export type PlayerRatePosteriorFamily = "beta-binomial" | "normal-normal";

/**
 * A rate prior for a single metric. Consumed by the posterior estimators as the
 * shrinkage target.
 *
 * - `mean`      prior location (the rate the posterior shrinks toward). In [0,1]
 *               for bounded rates; native units for continuous rates.
 * - `sampleSize` prior STRENGTH k, expressed as a pseudo-count — how many
 *               observed samples the prior is worth. This is NOT the size of the
 *               pool the prior was fit from; larger k => harder shrinkage.
 * - `source`    provenance of the prior. `empirical-bayes-peer-pool` means the
 *               MEAN was fit from a peer pool while k is a fixed hyperparameter
 *               (see {@link buildEmpiricalBayesRatePrior}); `position-prior` and
 *               `manual-prior` are externally supplied.
 */
export interface PlayerRatePrior {
  readonly mean: number;
  readonly sampleSize: number;
  readonly source: "empirical-bayes-peer-pool" | "position-prior" | "manual-prior";
}

export interface EmpiricalBayesRateObservation {
  readonly value: number;
  readonly sampleSize: number;
}

export interface EmpiricalBayesPriorOptions {
  readonly fallbackMean: number;
  readonly shrinkageK?: number;
  readonly source?: PlayerRatePrior["source"];
  readonly boundedRate?: boolean;
}

export interface BetaBinomialPosteriorInput {
  readonly playerId: string;
  readonly metricId: string;
  readonly successes: number;
  readonly trials: number;
  readonly prior: PlayerRatePrior;
}

export interface NormalNormalPosteriorInput {
  readonly playerId: string;
  readonly metricId: string;
  readonly sampleMean: number;
  readonly sampleSize: number;
  readonly prior: PlayerRatePrior;
  readonly observationVariance?: number;
}

export interface PlayerRatePosterior {
  readonly playerId: string;
  readonly metricId: string;
  readonly family: PlayerRatePosteriorFamily;
  readonly sampleSize: number;
  readonly observedMean: number;
  readonly unshrunkMean: number;
  readonly priorMean: number;
  readonly shrinkageK: number;
  readonly shrinkageWeight: number;
  readonly posteriorMean: number;
  readonly posteriorVariance?: number;
  readonly alpha?: number;
  readonly beta?: number;
  readonly priced: false;
  readonly status: "shadow";
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Credibility weight on the observed sample: w = n / (n + k).
 *
 * The posterior mean is w * observed + (1 - w) * prior, so w is the fraction of
 * trust placed in the observed rate vs. the prior.
 *
 * @param sampleSize observed sample size n (negatives are floored to 0)
 * @param shrinkageK prior strength k / pseudo-count (negatives are floored to 0)
 * @returns w in [0,1], rounded to 4 dp. Returns 0 when n + k == 0 (no evidence
 *   on either side), which collapses the posterior onto the prior.
 */
export function playerRateShrinkageWeight(sampleSize: number, shrinkageK: number): number {
  const n = Math.max(0, sampleSize);
  const k = Math.max(0, shrinkageK);
  if (n + k === 0) return 0;
  return round4(n / (n + k));
}

/**
 * Build a rate prior from a pool of peer observations.
 *
 * Estimates the prior MEAN as the sample-size-weighted average of the peer
 * pool's rates: Σ(valueᵢ · sampleSizeᵢ) / Σ(sampleSizeᵢ), so higher-volume peers
 * pull the prior location more. Observations with a non-positive/non-finite
 * sample size or a non-finite value are dropped; if none survive, the
 * caller-supplied `fallbackMean` is used. `boundedRate: true` clamps the result
 * to [0,1] for probability/share metrics; continuous metrics leave it unclamped.
 *
 * PARTIAL empirical Bayes — read the label precisely. Only the prior *location*
 * (mean) is fit from data. The prior *strength* k (returned on `sampleSize`) is a
 * FIXED hyperparameter — `options.shrinkageK` or {@link DEFAULT_PLAYER_RATE_SHRINKAGE_K}
 * — passed straight through regardless of the pool's dispersion. A full
 * empirical-Bayes fit would derive k from the between-player variance of the pool
 * (a tightly clustered pool => larger k => harder shrinkage; a dispersed pool =>
 * smaller k), but this estimator does not: a tight pool and a wildly dispersed
 * pool of the same size yield the same k. Read the `empirical-bayes-peer-pool`
 * source tag as "empirical prior mean, fixed prior strength", not a
 * variance-derived shrinkage.
 *
 * @returns a {@link PlayerRatePrior} whose `mean` is the fitted peer location and
 *   whose `sampleSize` is the fixed prior pseudo-count k (the prior's strength,
 *   NOT the pool's total sample size).
 */
export function buildEmpiricalBayesRatePrior(
  observations: readonly EmpiricalBayesRateObservation[],
  options: EmpiricalBayesPriorOptions,
): PlayerRatePrior {
  const usable = observations.filter(
    (observation) =>
      observation.sampleSize > 0 &&
      Number.isFinite(observation.sampleSize) &&
      Number.isFinite(observation.value),
  );
  // Fixed prior strength: passed through as-is, never derived from the pool's
  // between-player variance (see the doc note above on partial empirical Bayes).
  const k = Math.max(0, options.shrinkageK ?? DEFAULT_PLAYER_RATE_SHRINKAGE_K);

  if (usable.length === 0) {
    return {
      mean: round4(options.boundedRate === true ? clamp01(options.fallbackMean) : options.fallbackMean),
      sampleSize: k,
      source: options.source ?? "empirical-bayes-peer-pool",
    };
  }

  const sampleTotal = usable.reduce((sum, observation) => sum + observation.sampleSize, 0);
  const weightedMean =
    usable.reduce((sum, observation) => sum + observation.value * observation.sampleSize, 0) /
    sampleTotal;

  return {
    mean: round4(options.boundedRate === true ? clamp01(weightedMean) : weightedMean),
    sampleSize: k,
    source: options.source ?? "empirical-bayes-peer-pool",
  };
}

/**
 * Beta-binomial posterior for a bounded [0,1] player rate given as successes/trials.
 *
 * Updates a Beta prior parameterized by its mean and strength
 * (alpha0 = priorMean * k, beta0 = (1 - priorMean) * k) with the binomial data:
 *   alpha         = successes + priorMean * k
 *   beta          = (trials - successes) + (1 - priorMean) * k
 *   posteriorMean = alpha / (alpha + beta)   (falls back to priorMean when both are 0)
 *
 * Guards: trials floored at 0, successes clamped to [0, trials], priorMean
 * clamped to [0,1], k = max(0, prior.sampleSize). With zero trials the observed
 * and posterior means both collapse to the prior. `shrinkageWeight` is the
 * credibility weight n / (n + k) for reference; the posterior mean above is the
 * equivalent Beta update.
 *
 * Emitted shadow-only (`priced: false`, `status: "shadow"`). `posteriorVariance`
 * is intentionally omitted for this family (alpha/beta carry the dispersion).
 */
export function estimateBetaBinomialRatePosterior(
  input: BetaBinomialPosteriorInput,
): PlayerRatePosterior {
  const sampleSize = Math.max(0, input.trials);
  const successes = Math.min(sampleSize, Math.max(0, input.successes));
  const priorMean = clamp01(input.prior.mean);
  const shrinkageK = Math.max(0, input.prior.sampleSize);
  const observedMean = sampleSize === 0 ? priorMean : successes / sampleSize;
  const alpha = successes + priorMean * shrinkageK;
  const beta = sampleSize - successes + (1 - priorMean) * shrinkageK;
  const posteriorMean = alpha + beta === 0 ? priorMean : alpha / (alpha + beta);

  return {
    playerId: input.playerId,
    metricId: input.metricId,
    family: "beta-binomial",
    sampleSize,
    observedMean: round4(observedMean),
    unshrunkMean: round4(observedMean),
    priorMean: round4(priorMean),
    shrinkageK,
    shrinkageWeight: playerRateShrinkageWeight(sampleSize, shrinkageK),
    posteriorMean: round4(posteriorMean),
    alpha: round4(alpha),
    beta: round4(beta),
    priced: false,
    status: "shadow",
  };
}

/**
 * Normal-normal posterior for a continuous / unbounded player rate given as a sample mean.
 *
 * Conjugate posterior under equal per-observation precision, with prior
 * pseudo-count k = max(0, prior.sampleSize):
 *   w                 = n / (n + k)
 *   posteriorMean     = w * sampleMean + (1 - w) * priorMean
 *   posteriorVariance = observationVariance / (n + k)   (0 when n + k == 0)
 *
 * The prior mean is used as-is and is NOT clamped to [0,1], since continuous
 * metrics may be unbounded. `observationVariance` is the per-observation variance
 * (default 1); `posteriorVariance` is the variance of the shrunk mean. With zero
 * sample size the observed and posterior means collapse to the prior.
 *
 * Emitted shadow-only (`priced: false`, `status: "shadow"`).
 */
export function estimateNormalNormalRatePosterior(
  input: NormalNormalPosteriorInput,
): PlayerRatePosterior {
  const sampleSize = Math.max(0, input.sampleSize);
  const priorMean = input.prior.mean;
  const shrinkageK = Math.max(0, input.prior.sampleSize);
  const observedMean = sampleSize === 0 ? priorMean : input.sampleMean;
  const weight = playerRateShrinkageWeight(sampleSize, shrinkageK);
  const posteriorMean = weight * observedMean + (1 - weight) * priorMean;
  const observationVariance = Math.max(0, input.observationVariance ?? 1);
  const posteriorDenominator = sampleSize + shrinkageK;

  return {
    playerId: input.playerId,
    metricId: input.metricId,
    family: "normal-normal",
    sampleSize,
    observedMean: round4(observedMean),
    unshrunkMean: round4(observedMean),
    priorMean: round4(priorMean),
    shrinkageK,
    shrinkageWeight: weight,
    posteriorMean: round4(posteriorMean),
    posteriorVariance:
      posteriorDenominator === 0 ? 0 : round4(observationVariance / posteriorDenominator),
    priced: false,
    status: "shadow",
  };
}
