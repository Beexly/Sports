/**
 * KERNEL CONTRACT — the frozen interface every kernel slot implements.
 *
 * WHY THIS FILE EXISTS
 * Many agents given many good instructions produce many incompatible artifacts.
 * The same agents given ONE frozen interface and ONE slot each produce a system.
 * This file is that interface. Implementations live in `slots/<name>.ts`, one
 * slot per file, tests in `__tests__/<name>.test.ts`.
 *
 * EXISTING REPO MATH — DO NOT REIMPLEMENT (masterplan "do not rediscover"):
 *  - Temporal splitting: `../walk-forward.js` (`walkForwardSplits`) is the ONLY
 *    sanctioned splitter. It is expanding-window by construction; random K-fold
 *    is not expressible through it, and no kernel slot may add a splitter.
 *  - Binary proper scores: `../../certificate/proper-scoring.js` (`brierScore`,
 *    `meanBrier`, `logLoss`, `meanLogLoss`, `reliabilityDiagram`).
 *  - Skill scores: `../fair-skill-brier.js`. CLV: `evVsClose` in `../placebo.js`.
 *  - Calibration maps: `../calibration-blend.js` (beta, monotone envelope, OOF).
 *  - Sizing/shrinkage: `../kelly.js` (fractional/portfolio Kelly, James-Stein,
 *    Ledoit-Wolf).
 *  The kernel ADDS what is missing: CRPS, randomized PIT, Murphy decomposition,
 *  calibration slope/intercept, BH-FDR, block bootstrap, effective sample size,
 *  and the distribution families (NB, Beta-Binomial, ZIP, Dirichlet-multinomial,
 *  censored counts, heavy-tail mixtures) behind one composable interface.
 *
 * RULES FOR IMPLEMENTERS (non-negotiable)
 *  1. Implement EXACTLY the declared type for your slot. Do not widen, narrow,
 *     or rename. Do not add parameters. Do not change units.
 *  2. Pure functions only. No I/O, no network, no filesystem, no clock, and no
 *     `Math.random` anywhere — stochastic functions take an injected `Rng`.
 *  3. Fail closed. Invalid input throws `KernelError` with the documented code.
 *     Never return NaN, never silently coerce, never clamp without documenting.
 *  4. No imports outside this package. Shared numerics live in `./numeric.js`
 *     (lgamma, logBeta, logChoose, erf, normal cdf/quantile, regularized gamma,
 *     Box-Muller) — use them; do not re-derive them in a slot.
 *  5. Every slot ships unit tests; every distribution slot must additionally
 *     pass `assertDistributionConformance` from `./conformance.js`.
 *
 * WHAT THIS CONTRACT ENCODES (the reason the engine is different)
 *  - Proper scoring on DISTRIBUTIONS (CRPS/PIT), not hit rate on point picks.
 *  - RANDOMIZED PIT for discrete predictives — plain PIT is NOT uniform on
 *    discrete outcomes; using it is the most common calibration error in this
 *    field, and it is a bug here, not a simplification.
 *  - Compositional (Dirichlet-multinomial) shares, so teammates are negatively
 *    correlated by construction rather than by a bolted-on copula.
 *  - Explicit zero-inflation and censoring, because props settle on quantiles
 *    of skewed, truncated distributions — not on means.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Numeric domains
// ─────────────────────────────────────────────────────────────────────────────

/** A probability in [0, 1]. */
export type Probability = number;

/** A p-value in [0, 1]. */
export type PValue = number;

/**
 * Deterministic uniform random source returning values in [0, 1).
 * Every stochastic function takes this explicitly, so all simulation output is
 * reproducible from a single integer seed and therefore auditable.
 */
export type Rng = () => number;

// ─────────────────────────────────────────────────────────────────────────────
// Errors — fail closed, always typed
// ─────────────────────────────────────────────────────────────────────────────

export type KernelErrorCode =
  /** An argument was outside its documented domain (e.g. p > 1, negative count). */
  | "DOMAIN"
  /** A value was NaN or non-finite where a finite number was required. */
  | "NOT_FINITE"
  /** An input collection was empty where at least one element was required. */
  | "EMPTY"
  /** Two collections that must align had different lengths. */
  | "MISMATCHED_LENGTH"
  /** The requested operation is not defined for these parameters. */
  | "UNSUPPORTED"
  /** A numerical routine failed to converge within its iteration budget. */
  | "NO_CONVERGENCE";

export class KernelError extends Error {
  readonly code: KernelErrorCode;

  constructor(code: KernelErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "KernelError";
    this.code = code;
  }
}

/** Throws `KernelError("NOT_FINITE")` unless `value` is a finite number. */
export function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new KernelError("NOT_FINITE", `${label} must be finite, received ${value}`);
  }
}

/** Throws `KernelError("DOMAIN")` unless `value` is a probability in [0, 1]. */
export function assertProbability(value: number, label: string): void {
  assertFinite(value, label);
  if (value < 0 || value > 1) {
    throw new KernelError("DOMAIN", `${label} must be in [0,1], received ${value}`);
  }
}

/** Throws `KernelError("DOMAIN")` unless `value` is a non-negative integer. */
export function assertCount(value: number, label: string): void {
  assertFinite(value, label);
  if (!Number.isInteger(value) || value < 0) {
    throw new KernelError(
      "DOMAIN",
      `${label} must be a non-negative integer, received ${value}`,
    );
  }
}

/** Throws `KernelError("EMPTY")` if the collection has no elements. */
export function assertNonEmpty(values: readonly unknown[], label: string): void {
  if (values.length === 0) {
    throw new KernelError("EMPTY", `${label} must not be empty`);
  }
}

/** Throws `KernelError("MISMATCHED_LENGTH")` unless both collections align. */
export function assertSameLength(
  a: readonly unknown[],
  b: readonly unknown[],
  labelA: string,
  labelB: string,
): void {
  if (a.length !== b.length) {
    throw new KernelError(
      "MISMATCHED_LENGTH",
      `${labelA} (${a.length}) and ${labelB} (${b.length}) must have equal length`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared deterministic RNG — the ONE uniform source this package uses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * mulberry32 — small, fast, well-distributed 32-bit PRNG.
 * Provided here (not per-slot) so every simulation in the engine is
 * reproducible from a single integer seed. Implementers MUST accept an `Rng`
 * parameter rather than constructing their own source.
 */
export function makeRng(seed: number): Rng {
  assertFinite(seed, "seed");
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Distributions — one shape so the joint simulator can compose anything
// ─────────────────────────────────────────────────────────────────────────────

export interface Support {
  readonly min: number;
  /** May be `Number.POSITIVE_INFINITY` for unbounded counts. */
  readonly max: number;
}

/**
 * A discrete predictive distribution over integer outcomes.
 * Every count-valued prop (receptions, attempts, TDs, sacks) is one of these.
 */
export interface DiscreteDistribution {
  readonly kind: "discrete";
  /** P(X = k). Zero outside the support; throws DOMAIN for non-integer k. */
  pmf(k: number): Probability;
  /** P(X <= k). Non-decreasing; approaches 1 at the upper support bound. */
  cdf(k: number): Probability;
  /** Smallest k in support such that cdf(k) >= p. Throws DOMAIN unless p in [0,1]. */
  quantile(p: Probability): number;
  /** One draw, using the injected deterministic source. */
  sample(rng: Rng): number;
  mean(): number;
  variance(): number;
  support(): Support;
}

/** A continuous predictive distribution (yards, time-to-throw, YAC). */
export interface ContinuousDistribution {
  readonly kind: "continuous";
  pdf(x: number): number;
  cdf(x: number): Probability;
  quantile(p: Probability): number;
  sample(rng: Rng): number;
  mean(): number;
  variance(): number;
  support(): Support;
}

export type Predictive = DiscreteDistribution | ContinuousDistribution;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT `crps` — proper scoring for whole distributions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CRPS for a discrete predictive against an observed integer:
 *   CRPS = Σ_k ( F(k) − 1{k >= y} )²   over the (truncated) support.
 * Lower is better; units are outcome-units. Truncate an unbounded support where
 * the remaining tail mass is < 1e-12 and document the truncation.
 */
export type CrpsDiscreteFn = (dist: DiscreteDistribution, observed: number) => number;

/**
 * CRPS from an ensemble of samples (simulation output with no closed form):
 *   CRPS = mean_i |X_i − y| − 0.5 · mean_{i,j} |X_i − X_j|.
 * Must use the O(n log n) sorted-sample identity for the second term — the
 * naive O(n²) double loop is rejected in review for ensembles this engine
 * produces (10⁴–10⁵ draws). Must not mutate the input.
 */
export type CrpsEmpiricalFn = (samples: readonly number[], observed: number) => number;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT `pit` — calibration for count distributions, done correctly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RANDOMIZED probability integral transform for a discrete predictive:
 *   u = F(y − 1) + v · P(Y = y),   v ~ Uniform(0,1) drawn from `rng`
 * (with F(min − 1) = 0). Under a correct forecast, u ~ Uniform(0,1) EXACTLY.
 * Plain PIT is not uniform for discrete outcomes; implementing it here is a
 * correctness bug, and the test suite must demonstrate uniformity under a
 * matched simulate/score pair.
 */
export type PitDiscreteFn = (
  dist: DiscreteDistribution,
  observed: number,
  rng: Rng,
) => Probability;

export interface PitHistogram {
  readonly counts: readonly number[];
  readonly bins: number;
  /**
   * Chi-square goodness-of-fit p-value against the uniform (bins − 1 df),
   * computed via the regularized incomplete gamma in `./numeric.js`.
   * Small values = miscalibration (U-shape: under-dispersed; hump: over-).
   */
  readonly uniformityPValue: PValue;
}

/** Bin PIT values on [0,1] and test uniformity. `bins` must be >= 2 (default 10). */
export type PitHistogramFn = (
  pitValues: readonly Probability[],
  bins?: number,
) => PitHistogram;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT `brier-murphy` + `calibration-fit` — forecast diagnostics
// ─────────────────────────────────────────────────────────────────────────────

/** Murphy decomposition: `brier = reliability − resolution + uncertainty` (binned). */
export interface BrierDecomposition {
  readonly brier: number;
  /** Calibration error — lower is better. */
  readonly reliability: number;
  /** Discrimination — higher is better. */
  readonly resolution: number;
  /** Base-rate variance; independent of the forecast. */
  readonly uncertainty: number;
}

/**
 * Brier score plus its Murphy decomposition, binned by predicted probability
 * (`bins` >= 2, default 10, uniform on [0,1]). Reuse `meanBrier` semantics from
 * `../../certificate/proper-scoring.js` for the headline number; the identity
 * holds exactly for the BINNED Brier score — assert that in tests.
 */
export type BrierMurphyFn = (
  predicted: readonly Probability[],
  outcomes: readonly (0 | 1)[],
  bins?: number,
) => BrierDecomposition;

export interface CalibrationFit {
  /** 1.0 = calibrated; < 1 over-confident; > 1 under-confident. */
  readonly slope: number;
  /** 0.0 = unbiased (log-odds scale). */
  readonly intercept: number;
}

/**
 * Logistic recalibration (Cox): regress outcomes on logit(predicted) via IRLS,
 * iteration budget 100, tolerance 1e-10; throws NO_CONVERGENCE past budget.
 * Predictions are clamped to [1e-12, 1 − 1e-12] before logit; document it.
 */
export type CalibrationFitFn = (
  predicted: readonly Probability[],
  outcomes: readonly (0 | 1)[],
) => CalibrationFit;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT `bh-fdr` + `ess` — the mining engine's statistical spine
// ─────────────────────────────────────────────────────────────────────────────

export interface FdrResult {
  /** BH-adjusted q-values, aligned to the INPUT order (not sorted order). */
  readonly qValues: readonly number[];
  /** Rejection decisions at the given alpha, aligned to the input order. */
  readonly rejected: readonly boolean[];
  /** The largest p-value rejected, or 0 if none were. */
  readonly threshold: number;
}

/**
 * Benjamini–Hochberg step-up FDR control across an ENTIRE pre-registered grid.
 * q-values use the cumulative-minimum from the largest rank downward. This is
 * what stops the mining engine from being a p-hacking machine, so it must be
 * applied to every hypothesis in the grid — never to a filtered subset.
 */
export type BenjaminiHochbergFn = (pValues: readonly PValue[], alpha: number) => FdrResult;

export interface EffectiveSampleSize {
  /** Information-equivalent independent sample count, in (0, n]. */
  readonly ess: number;
  /** nominal n / ess; > 1 means the nominal count overstates information. */
  readonly designEffect: number;
}

/**
 * Cluster-adjusted ESS: `ess = n / (1 + (m̄ − 1)·ρ)` with m̄ the mean cluster
 * size and ρ the intraclass correlation (one-way ANOVA estimator, clamped to
 * [0, 1]). Many rows from one player-season are not independent evidence; the
 * mining engine's minimum-sample gate must use THIS, never `rows.length`.
 */
export type EffectiveSampleSizeFn = (
  values: readonly number[],
  clusterIds: readonly (string | number)[],
) => EffectiveSampleSize;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT `block-bootstrap` — uncertainty on autocorrelated series
// ─────────────────────────────────────────────────────────────────────────────

export interface Interval {
  readonly point: number;
  readonly lower: number;
  readonly upper: number;
  readonly level: Probability;
}

export interface BlockBootstrapOptions {
  /** Contiguous block length, to preserve week-to-week autocorrelation. */
  readonly blockLength: number;
  readonly resamples: number;
  /** Confidence level, e.g. 0.95. */
  readonly level: Probability;
  readonly rng: Rng;
}

/**
 * Moving-block bootstrap percentile CI for a statistic of a time-ordered
 * series: draw ceil(n / L) non-wrapping blocks of length L uniformly from the
 * n − L + 1 starts, concatenate, truncate to n, apply the statistic. An i.i.d.
 * bootstrap understates uncertainty on autocorrelated football data, which is
 * why the block form is mandated. `point` is the statistic on the original.
 */
export type BlockBootstrapFn = (
  values: readonly number[],
  statistic: (sample: readonly number[]) => number,
  options: BlockBootstrapOptions,
) => Interval;

// ─────────────────────────────────────────────────────────────────────────────
// Distribution family slots
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SLOT `neg-binomial` — volume counts (attempts, targets given script).
 * (r, p) form: pmf(k) = C(k + r − 1, k) · p^r · (1 − p)^k, mean r(1−p)/p.
 * Fit by method of moments; if sample variance <= mean (no overdispersion),
 * return a near-Poisson fit (large r) and document the degeneracy — do not throw.
 */
export interface NegBinomialParams {
  readonly r: number;
  readonly p: Probability;
}
export type FitNegBinomialFn = (counts: readonly number[]) => NegBinomialParams;
export type MakeNegBinomialFn = (params: NegBinomialParams) => DiscreteDistribution;

/**
 * SLOT `beta-binomial` — catch|targets, completions|attempts, sacks|dropbacks.
 * pmf via logChoose + logBeta from `./numeric.js` (never raw factorials).
 * Fit (alpha, beta) by method of moments on success/trial pairs; `n` for the
 * returned distribution is supplied at `make` time via params.
 */
export interface BetaBinomialParams {
  readonly n: number;
  readonly alpha: number;
  readonly beta: number;
}
export type FitBetaBinomialFn = (
  successes: readonly number[],
  trials: readonly number[],
) => Omit<BetaBinomialParams, "n">;
export type MakeBetaBinomialFn = (params: BetaBinomialParams) => DiscreteDistribution;

/**
 * SLOT `zip-hurdle` — zero-inflated counts. P(0) dominates 1.5/2.5-line props,
 * so the zero mass is a product feature, not a nuisance parameter.
 * Fit: estimate the NB component from the positive part + implied zeros
 * (moment-based; document the estimator honestly, including its bias).
 */
export interface ZipParams {
  /** Excess-zero probability, on top of the count process. */
  readonly zeroInflation: Probability;
  readonly base: NegBinomialParams;
}
export type FitZipFn = (counts: readonly number[]) => ZipParams;
export type MakeZipFn = (params: ZipParams) => DiscreteDistribution;

/**
 * SLOT `dirichlet-multinomial` — THE structural core: teammates compete for one
 * pie. Shares sum to 1, so modelling them jointly makes teammate counts
 * negatively correlated by construction, makes same-game props coherent, and
 * turns injury re-projection into renormalisation of the surviving weights.
 *
 * `fit` recovers alpha from observed count rows (rows = games, columns =
 * players) via Minka's fixed-point iteration (budget 500, tol 1e-9; throw
 * NO_CONVERGENCE past budget). `sample` draws category probabilities from the
 * Dirichlet (Marsaglia–Tsang gamma using ONLY the injected rng + Box–Muller
 * from `./numeric.js`) and then allocates `trials` by cdf inversion; counts
 * must sum EXACTLY to `trials`.
 */
export interface DirichletMultinomialParams {
  /** One concentration parameter per category; all strictly positive. */
  readonly alpha: readonly number[];
  /** Total trials to allocate across categories. */
  readonly trials: number;
}
export interface DirichletMultinomialDraw {
  /** Counts per category, summing exactly to `trials`. */
  readonly counts: readonly number[];
}
export type FitDirichletMultinomialFn = (
  countRows: readonly (readonly number[])[],
) => readonly number[];
export type SampleDirichletMultinomialFn = (
  params: DirichletMultinomialParams,
  rng: Rng,
) => DirichletMultinomialDraw;

/**
 * SLOT `censored-count` — right-censoring for blowout benchings. Books that
 * mean-shift instead of truncating misprice BOTH tails of a heavy favourite's
 * star props; this slot is that edge. Model: with prob (1 − c) the count is the
 * base draw; with prob c the exposure is cut and the count is a binomial
 * thinning of the base draw with retention f:
 *   pmf(k) = (1−c)·base.pmf(k) + c·Σ_j base.pmf(j)·Binom(j, f).pmf(k),
 * with the base support truncated where its tail mass < 1e-12.
 */
export interface CensoredCountParams {
  readonly base: DiscreteDistribution;
  /** Probability the exposure is truncated (e.g. starter benched in a blowout). */
  readonly censorProbability: Probability;
  /** Expected fraction of exposure retained when censoring occurs, in (0, 1]. */
  readonly retainedFraction: number;
}
export type MakeCensoredCountFn = (params: CensoredCountParams) => DiscreteDistribution;

/**
 * SLOT `lognormal-tail` — YAC / per-reception yardage: right-skewed, one broken
 * play can be a large share of a game's yards, so median ≪ mean and a
 * mean-anchored line systematically favours the under. Mixture: Normal body
 * (may be negative — being tackled behind the catch is real) + lognormal tail
 * on [0, ∞). cdf = (1−w)·Φ_body + w·LN; quantile by monotone bisection on the
 * cdf (tol 1e-10); sample by component pick then Box–Muller from `./numeric.js`.
 */
export interface LognormalTailMixtureParams {
  /** Weight on the heavy-tail component, in [0, 1]. */
  readonly tailWeight: Probability;
  readonly bodyMean: number;
  readonly bodySd: number;
  readonly tailMu: number;
  readonly tailSigma: number;
}
export type MakeLognormalTailMixtureFn = (
  params: LognormalTailMixtureParams,
) => ContinuousDistribution;
