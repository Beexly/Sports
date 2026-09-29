/**
 * scoredist-bridge â€” a fail-closed bridge from the score-distribution /
 * de-vig / market-microstructure kernels in `@sports/prediction-engine` into
 * the ingestion pipeline.
 *
 * WHY THIS EXISTS
 * ---------------
 * These are the LOWEST-LEVEL kernels the whole engine sits on: the Skellam
 * margin distribution, the Poisson joint, the Dixon-Coles low-score correction,
 * the de-vig methods that turn a book's posted prices into a fair probability,
 * and the conditional-quantile machinery that prices spreads and totals. Every
 * public "we make this 56, the market says 52.8" sentence is downstream of this
 * file. A silently-wrong number here is not a display bug; it is an unearned
 * claim on a customer's money.
 *
 * So this bridge NEVER repairs, renormalises, clamps, imputes, or fills a gap.
 * Every `evalX` follows the same three beats:
 *
 *   1. validate the inputs up front and `fail("a specific reason")`,
 *   2. call the REAL kernel inside try/catch,
 *   3. RE-VALIDATE the kernel's output before handing it back.
 *
 * Step 3 is the part that matters and the part that is usually missing. Several
 * of these kernels resolve a broken input into a plausible-looking number rather
 * than an error (measured cases are cited at each eval). A caller cannot tell
 * "0" from "the kernel had no answer"; this bridge can, because it checked first.
 *
 * THE LOAD-BEARING INVARIANTS (enforced, not documented)
 * ------------------------------------------------------
 *   - A PMF must be non-negative and must sum to 1 within PMF_SUM_TOLERANCE.
 *     It is NOT renormalised when it doesn't: a silently renormalised PMF hides
 *     a broken kernel, which is worse than a refusal.
 *   - A CDF must be non-decreasing and lie in [0, 1].
 *   - A de-vigged pair must sum to 1. A non-positive implied probability is
 *     rejected BEFORE anything divides by it.
 *   - A probability returned to a caller must be in [0, 1]. Clamping is
 *     forbidden â€” a clamp hides a bug.
 *   - A lambda/rate must be strictly positive for Poisson-type kernels. Zero or
 *     negative rate FAILS CLOSED; it never returns "0 mass", because 0 mass and
 *     "no model" are different answers.
 *   - A quantile function must be monotone in its level. We VERIFY monotonicity
 *     and report it rather than assuming it.
 *   - Dixon-Coles tau/rho must be finite AND inside the legal domain of the
 *     correction, which the kernel does not check (see `dixonColesTauDomainReason`).
 *
 * CANONICAL IMPLEMENTATIONS (duplicates exist; these are the live ones)
 * ---------------------------------------------------------------------
 *   Skellam : `skellam.ts` â€” the ONLY Skellam wired into live scoring. Its
 *             `SKELLAM_COVER_SOURCE = "skellam_cover"` is the source id that
 *             appears in the persisted factor breakdown and the one AGENTS.md
 *             names as load-bearing on SPREAD rankingP. It convolves the two
 *             Poisson PMFs, which is exact on {-maxGoals..maxGoals} and avoids
 *             overflow in the Bessel closed form.
 *             DUPLICATES, deliberately NOT used here:
 *               - `win-spread-total/zi-skellam.ts` (wired below as the ZI
 *                 variant: SAME EXPORT NAME, different parameterisation),
 *               - `nfl/skellam-margin.ts` (Bessel closed form with its own
 *                 `besselI`; the barrel renames its exports to `skellamPMF` /
 *                 `skellamCDF` to dodge the collision).
 *   Poisson : `poisson.ts` â€” the root-level module that `skellam.ts` and
 *             `dixon-coles.ts` themselves import `poissonPmf` from, so it is the
 *             one every other score-distribution kernel is built on.
 *             DUPLICATES, deliberately NOT used here: `nfl/block-poisson.ts`,
 *             `nfl/generalized-poisson.ts`,
 *             `bayesian/2012-14949-bivariate-poisson-home-advantage.ts`,
 *             `2409-17129v1-â€¦conwaymaxwellpoissonâ€¦`,
 *             `2607-18009v1-â€¦conwaymaxwellpoissonâ€¦`,
 *             `experimental/1905-03628v1-nested-poisson-totals.ts` â€” these are
 *             different MODELS (block, generalized, bivariate, CMP, nested), not
 *             duplicate implementations of the same kernel.
 *
 * DETERMINISM
 * -----------
 * `Math.random` is never used. The only stochastic-looking input is
 * `lcgRandom(seed)`, a 32-bit counter/LCG, exposed so a caller can build a
 * reproducible synthetic market and get identical numbers on every replay.
 * Two upstream kernels take a wall clock (`poisson.toPoissonFairValue` and
 * `multi-market-ensemble`'s staleness); this bridge never calls them with the
 * default clock.
 */

import {
  DEFAULT_SKELLAM_MAX_GOALS,
  skellamCdf,
  skellamCoverProbabilities,
  skellamCoverFairValue,
  skellamPmf,
  skellamPmfGrid,
  type SkellamCoverInput,
  type SkellamCoverProbabilities,
  type SkellamCoverFairValue as SkellamCoverFairValueShape,
  type SkellamPmfPoint,
} from "@sports/prediction-engine/src/skellam.js";
import {
  jointScoreMatrix,
  overUnderProbabilities,
  poissonCdf,
  poissonConsistencyScore,
  poissonPmf,
} from "@sports/prediction-engine/src/poisson.js";
import {
  DEFAULT_DIXON_COLES_RHO,
  clampDixonColesRho,
  dixonColesTau,
  jointScoreMatrixDixonColes,
} from "@sports/prediction-engine/src/dixon-coles.js";
import {
  gotoConversion,
  impliedFromDecimalOdds,
  powerDevig,
  shinDevig,
  type PowerDevigResult,
  type ShinResult,
} from "@sports/prediction-engine/src/shin-devig.js";
import { removeVig } from "@sports/prediction-engine/src/scoring.js";
import {
  aic,
  coverProbability as ziCoverProbability,
  pushProbability as ziPushProbability,
  ziSkellamPmf,
} from "@sports/prediction-engine/src/win-spread-total/zi-skellam.js";
import {
  conditionalQuantile,
  kernelWeights,
  silvermanBandwidth,
  unconditionalQuantile,
  type ScoredGame,
} from "@sports/prediction-engine/src/win-spread-total/conditional-score-dist.js";
import {
  ar1Forecast,
  ar1Update,
  brownianWinProb,
  ouForecast,
  ouWinProb,
  type AR1State,
} from "@sports/prediction-engine/src/win-spread-total/1908-07372-sde-inplay-win-probability.js";
import {
  assertiveness,
  budescuChenWeights,
  looGains,
  shrinkTowardBase,
} from "@sports/prediction-engine/src/win-spread-total/2008-13005-budescu-chen-aggregation.js";
import {
  buildLeagueGraph,
  gcnForward2,
  normalizeAdj,
} from "@sports/prediction-engine/src/win-spread-total/2207-13191-gcn-win-prediction.js";
import {
  ewmaVolatility,
  expectedMovement,
  inGameVolInterval,
  type VolInterval,
} from "@sports/prediction-engine/src/win-spread-total/in-game-volatility.js";
import {
  devig as oracleDevig,
  type DevigMethod,
  type DevigResult,
} from "@sports/prediction-engine/src/devig/oracle.js";
import {
  fitTotalsQuantiles,
  pinballLoss,
  predictTotalQuantile,
  quantileCoverage,
  type QuantileModel,
  type TotalsGame,
} from "@sports/prediction-engine/src/totals/quantile-totals.js";
import {
  consensusNoVig,
  marketDisagreementPct,
  marketGravityIndex,
  noVigFromAmericanPrices,
  type ConsensusMarketRead,
  type MarketGravity,
} from "@sports/prediction-engine/src/market-read.js";
import {
  decomposeMarketAnchor,
  reconcileMarketAnchoredPlayers,
  type MarketAnchorInput,
  type MarketAnchoredPlayerInput,
  type MarketAnchoredReconciliation,
  type TeamVolumeAnchor,
} from "@sports/prediction-engine/src/market-anchored-reconciliation.js";
import {
  beatCloseRate,
  extractMarketClvFeatures,
  type MarketClvFeatures,
  type MarketClvPrices,
} from "@sports/prediction-engine/src/market-clv-features.js";
import {
  DEFAULT_SOURCE_RELIABILITY,
  estimatorSigma,
  precisionWeightedEnsemble,
  type MarketEstimate,
} from "@sports/prediction-engine/src/multi-market-ensemble.js";

// ============================================================
// Result type
// ============================================================

export type ScoreDistEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ScoreDistEval<never> {
  return { ok: false, reason };
}

function succeed<T>(data: T): ScoreDistEval<T> {
  return { ok: true, data };
}

/** Wrap a kernel call so a throw becomes a fail-closed with a named reason. */
function guard<T>(what: string, fn: () => T): ScoreDistEval<T> {
  try {
    return succeed(fn());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`${what} threw: ${message}`);
  }
}

// ============================================================
// Tolerances â€” every one is a MEASURED bound, not a wish
// ============================================================

/**
 * A PMF built from unrounded kernel output must sum to 1 this closely. 1e-9 is
 * the contract, not a convenience: measured, `skellamPmfGrid(1.4, 1.1, 20)`
 * lands at 1 âˆ’ 1.1e-16, `(2.5, 2.2, 20)` at 1 âˆ’ 4.5e-13, `(3.0, 1.0, 20)` at
 * 1 âˆ’ 1.2e-11 â€” all clearing 1e-9 by two to eight orders of magnitude.
 *
 * `jointScoreMatrix(1.5, 1.2, 12)` â€” the module's OWN default truncation â€”
 * sums to 0.999999991631, a deviation of 8.4e-9, and is therefore REJECTED
 * here. That is the check doing its job: the tail is not negligible at that
 * truncation, and renormalising it away would hide exactly the fact a caller
 * needs to know before pricing a total.
 */
export const PMF_SUM_TOLERANCE = 1e-9;

/**
 * Some kernels round each output to 6 decimal places (`shinDevig`,
 * `gotoConversion`, `powerDevig`, and all four `skellamCoverProbabilities`
 * fields). Rounding n terms at 0.5e-6 each bounds the achievable sum error at
 * n * 0.5e-6, so a tolerance tighter than that would fail-closed on the
 * kernel's own rounding rather than on a real defect. `roundedSumTolerance(2)`
 * is the de-vig pair bound; `roundedSumTolerance(3)` is the cover triple.
 */
export const SIX_DP_ROUNDING_BOUND = 0.5e-6;

export function roundedSumTolerance(terms: number): number {
  return terms * SIX_DP_ROUNDING_BOUND + 1e-9;
}

// ============================================================
// Validation primitives
// ============================================================

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** A Poisson-type rate: strictly positive. Zero is a refusal, not "0 mass". */
function rateReason(label: string, x: number): string | null {
  if (!isFiniteNumber(x)) return `${label} must be a finite number, got ${String(x)}`;
  if (x <= 0) return `${label} must be strictly positive, got ${x}`;
  return null;
}

function nonNegativeIntegerReason(label: string, x: number): string | null {
  if (!isFiniteNumber(x)) return `${label} must be a finite number, got ${String(x)}`;
  if (!Number.isInteger(x)) return `${label} must be an integer, got ${x}`;
  if (x < 0) return `${label} must be >= 0, got ${x}`;
  return null;
}

function probabilityReason(label: string, x: number): string | null {
  if (!isFiniteNumber(x)) return `${label} must be a finite number, got ${String(x)}`;
  if (x < 0 || x > 1) return `${label} must lie in [0,1], got ${x}`;
  return null;
}

function sumOf(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * The PMF contract. `label` names the distribution so a refusal reads as
 * "which pmf broke", not a generic shape error.
 */
function pmfReason(label: string, values: readonly number[], tolerance: number): string | null {
  if (values.length === 0) return `${label}: pmf is empty`;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isFiniteNumber(v)) return `${label}: pmf[${i}] is not finite (${String(v)})`;
    if (v < 0) return `${label}: pmf[${i}] is negative (${v})`;
  }
  const sum = sumOf(values);
  const deviation = Math.abs(sum - 1);
  if (!(deviation <= tolerance)) {
    return (
      `${label}: pmf sums to ${sum}, deviation ${deviation.toExponential(3)} exceeds ` +
      `tolerance ${tolerance.toExponential(3)} â€” refusing to renormalise a broken kernel`
    );
  }
  return null;
}

/** The CDF contract: non-decreasing, and every value in [0, 1]. */
function cdfCurveReason(label: string, values: readonly number[]): string | null {
  if (values.length === 0) return `${label}: cdf curve is empty`;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const bad = probabilityReason(`${label}: cdf[${i}]`, v ?? Number.NaN);
    if (bad) return bad;
    if (i === 0) continue;
    const prev = values[i - 1] ?? 0;
    if ((v ?? 0) < prev) {
      return `${label}: cdf is not non-decreasing â€” cdf[${i}]=${v} < cdf[${i - 1}]=${prev}`;
    }
  }
  return null;
}

/** The quantile-function contract: monotone in the level. */
function quantileMonotonicReason(
  label: string,
  pairs: readonly (readonly [number, number])[],
): string | null {
  if (pairs.length === 0) return `${label}: quantile curve is empty`;
  for (let i = 0; i < pairs.length; i++) {
    const level = pairs[i]?.[0] ?? Number.NaN;
    const value = pairs[i]?.[1] ?? Number.NaN;
    if (!isFiniteNumber(value)) {
      return `${label}: quantile at level ${String(level)} is not finite (${String(value)})`;
    }
    if (i === 0) continue;
    const prevLevel = pairs[i - 1]?.[0] ?? Number.NaN;
    const prev = pairs[i - 1]?.[1] ?? Number.NaN;
    if (level <= prevLevel) return `${label}: levels must ascend, got ${prevLevel} then ${level}`;
    if (value < prev) {
      return `${label}: quantile is not monotone in level â€” q(${level})=${value} < q(${prevLevel})=${prev}`;
    }
  }
  return null;
}

/** The de-vig contract: every probability legal, and the vector sums to 1. */
function fairVectorReason(
  label: string,
  values: readonly number[],
  tolerance: number,
): string | null {
  if (values.length === 0) return `${label}: de-vig produced no probabilities`;
  for (let i = 0; i < values.length; i++) {
    const bad = probabilityReason(`${label}: probability[${i}]`, values[i] ?? Number.NaN);
    if (bad) return bad;
  }
  const sum = sumOf(values);
  const deviation = Math.abs(sum - 1);
  if (!(deviation <= tolerance)) {
    return (
      `${label}: de-vigged vector sums to ${sum}, deviation ${deviation.toExponential(3)} ` +
      `exceeds tolerance ${tolerance.toExponential(3)}`
    );
  }
  return null;
}

/**
 * Reject a non-positive implied probability BEFORE anything divides by it. The
 * kernels here do not all guard this: `removeVig` divides 0 by 0, and
 * `impliedFromDecimalOdds` maps a non-positive price to 0 without complaint.
 */
function impliedReason(label: string, values: readonly number[]): string | null {
  if (values.length < 2) return `${label}: need at least 2 outcomes to de-vig, got ${values.length}`;
  for (let i = 0; i < values.length; i++) {
    const p = values[i] ?? Number.NaN;
    if (!isFiniteNumber(p)) return `${label}: implied[${i}] is not finite (${String(p)})`;
    if (p <= 0) {
      return (
        `${label}: implied[${i}]=${p} is not strictly positive â€” refusing to divide by it ` +
        `(a non-positive implied probability is a missing or invalid quote, not a probability)`
      );
    }
    if (p > 1) return `${label}: implied[${i}]=${p} exceeds 1, which is not an implied probability`;
  }
  return null;
}

function decimalOddsReason(label: string, odds: readonly number[]): string | null {
  if (odds.length < 2) return `${label}: need at least 2 decimal prices, got ${odds.length}`;
  for (let i = 0; i < odds.length; i++) {
    const o = odds[i] ?? Number.NaN;
    if (!isFiniteNumber(o)) return `${label}: price[${i}] is not finite (${String(o)})`;
    // 1.0 is a push, not a price; below 1 something downstream divides by zero.
    if (o <= 1) return `${label}: price[${i}]=${o} must be > 1 (1.0 is a push, not a price)`;
  }
  return null;
}

function levelCurveReason(label: string, levels: readonly number[]): string | null {
  if (levels.length === 0) return `${label}: levels must contain at least one value`;
  for (let i = 0; i < levels.length; i++) {
    const tau = levels[i] ?? Number.NaN;
    const bad = probabilityReason(`${label} level[${i}]`, tau);
    if (bad) return bad;
    if (tau === 0 || tau === 1) {
      return `${label}: level[${i}]=${tau} is degenerate; levels must be strictly inside (0,1)`;
    }
    if (i > 0 && tau <= (levels[i - 1] ?? 0)) {
      return `${label}: levels must strictly ascend: level[${i}]=${tau} <= level[${i - 1}]`;
    }
  }
  return null;
}

// ============================================================
// Deterministic RNG â€” counter/LCG, never Math.random
// ============================================================

/**
 * 32-bit LCG (Numerical Recipes constants) in [0, 1). Seeded and closed, so the
 * same seed replays the same synthetic market byte-for-byte. This exists only so
 * a caller can build a reproducible multi-book fixture; no production number in
 * this file depends on it.
 */
export function lcgRandom(seed: number): () => number {
  if (!isFiniteNumber(seed)) throw new RangeError(`lcgRandom: seed must be finite, got ${String(seed)}`);
  let state = Math.abs(Math.floor(seed)) % 2147483648;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ============================================================
// A. POISSON  (canonical: poisson.ts)
// ============================================================

/**
 * `poissonPmf(k, lambda)`.
 *
 * KERNEL NOTE: the kernel returns 0 for `lambda <= 0`, for non-integer k, and for
 * k < 0. A 0 from this function is therefore ambiguous between "a real zero" and
 * "you passed garbage" â€” which is why the rate check is up front and why the k
 * check rejects non-integers instead of forwarding them.
 */
export function evalPoissonPmf(input: { k: number; lambda: number }): ScoreDistEval<number> {
  const rateBad = rateReason("lambda", input.lambda);
  if (rateBad) return fail(rateBad);
  const kBad = nonNegativeIntegerReason("k", input.k);
  if (kBad) return fail(kBad);

  const call = guard("poissonPmf", () => poissonPmf(input.k, input.lambda));
  if (!call.ok) return call;
  const bad = probabilityReason("poissonPmf", call.data);
  if (bad) return fail(bad);
  return succeed(call.data);
}

export interface PoissonPmfPoint {
  readonly k: number;
  readonly probability: number;
}

/**
 * `poissonPmf` over k = 0..maxK, validated as a real PMF.
 *
 * This is the explicit "a pmf provably sums to one" gate. The tail is truncated
 * at maxK by construction, so the caller picks the truncation and the check
 * REPORTS it â€” it does not paper over it. Measured: lambda=1.5, maxK=20 sums to
 * 1.000000000000; lambda=1.5, maxK=3 loses ~18% of the mass and is refused with
 * the measured sum in the reason.
 */
export function evalPoissonPmfGrid(input: {
  lambda: number;
  maxK: number;
}): ScoreDistEval<readonly PoissonPmfPoint[]> {
  const rateBad = rateReason("lambda", input.lambda);
  if (rateBad) return fail(rateBad);
  const maxKBad = nonNegativeIntegerReason("maxK", input.maxK);
  if (maxKBad) return fail(maxKBad);

  const call = guard("poissonPmf grid", () => {
    const points: PoissonPmfPoint[] = [];
    for (let k = 0; k <= input.maxK; k++) {
      points.push({ k, probability: poissonPmf(k, input.lambda) });
    }
    return points;
  });
  if (!call.ok) return call;

  const bad = pmfReason("poissonPmf grid", call.data.map((p) => p.probability), PMF_SUM_TOLERANCE);
  if (bad) return fail(bad);
  return succeed(call.data);
}

/**
 * `poissonCdf` over an ascending k grid, validated as a non-decreasing CDF in [0,1].
 *
 * KERNEL NOTE: `poissonCdf` special-cases `lambda <= 0` to return 1 for any
 * k >= 0, while `poissonPmf` returns 0 for every k at the same lambda. The two
 * halves of the same degenerate distribution disagree; the rate check here is
 * what keeps that disagreement out of a caller's hands.
 */
export function evalPoissonCdfCurve(input: {
  lambda: number;
  ks: readonly number[];
}): ScoreDistEval<readonly number[]> {
  const rateBad = rateReason("lambda", input.lambda);
  if (rateBad) return fail(rateBad);
  if (input.ks.length === 0) return fail("ks must contain at least one integer");
  for (let i = 0; i < input.ks.length; i++) {
    const kBad = nonNegativeIntegerReason(`ks[${i}]`, input.ks[i] ?? Number.NaN);
    if (kBad) return fail(kBad);
    if (i > 0 && (input.ks[i] ?? 0) <= (input.ks[i - 1] ?? 0)) {
      return fail(`ks must strictly ascend: ks[${i}]=${String(input.ks[i])} <= ks[${i - 1}]`);
    }
  }

  const call = guard("poissonCdf curve", () => input.ks.map((k) => poissonCdf(k, input.lambda)));
  if (!call.ok) return call;
  const bad = cdfCurveReason("poissonCdf curve", call.data);
  if (bad) return fail(bad);
  return succeed(call.data);
}

/**
 * `jointScoreMatrix(lambdaHome, lambdaAway, maxGoals)` flattened row-major
 * (index x * (maxGoals+1) + y) and validated as a PMF.
 *
 * KERNEL NOTE: the module's own default `maxGoals` is 12, and
 * `jointScoreMatrix(1.5, 1.2, 12)` sums to 0.999999991631 â€” a deviation of
 * 8.4e-9, which this contract refuses. Pass 20 for realistic football rates;
 * there the sum is 1 to ~1e-16.
 */
export function evalPoissonJointPmf(input: {
  lambdaHome: number;
  lambdaAway: number;
  maxGoals: number;
}): ScoreDistEval<readonly number[]> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  if (!Number.isInteger(input.maxGoals) || input.maxGoals < 0) {
    return fail(`maxGoals must be a non-negative integer, got ${String(input.maxGoals)}`);
  }

  const call = guard("jointScoreMatrix", () => {
    const matrix = jointScoreMatrix(input.lambdaHome, input.lambdaAway, input.maxGoals);
    const flat: number[] = [];
    for (const row of matrix) for (const value of row) flat.push(value);
    return flat;
  });
  if (!call.ok) return call;

  const bad = pmfReason("poisson joint pmf", call.data, PMF_SUM_TOLERANCE);
  if (bad) return fail(bad);
  return succeed(call.data);
}

export interface PoissonOverUnder {
  readonly over: number;
  readonly under: number;
  readonly push: number;
  readonly coverage: number;
}

/**
 * `overUnderProbabilities(lambdaHome, lambdaAway, totalLine, maxGoals)`.
 *
 * over/under/push must be non-negative and sum to 1 â€” a total market is a
 * partition, so a coverage other than 1 is a broken joint, not a truncation
 * artefact. The kernel calls `assertTeamRatesAvailable()`, which THROWS in
 * production unless `TEAM_RATES_AVAILABLE=true`; that throw is caught here and
 * surfaced as a fail-closed reason rather than being swallowed.
 */
export function evalPoissonOverUnder(input: {
  lambdaHome: number;
  lambdaAway: number;
  totalLine: number;
  maxGoals: number;
}): ScoreDistEval<PoissonOverUnder> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  if (!isFiniteNumber(input.totalLine)) {
    return fail(`totalLine must be a finite number, got ${String(input.totalLine)}`);
  }
  if (!Number.isInteger(input.maxGoals) || input.maxGoals < 0) {
    return fail(`maxGoals must be a non-negative integer, got ${String(input.maxGoals)}`);
  }

  const call = guard("overUnderProbabilities", () =>
    overUnderProbabilities(input.lambdaHome, input.lambdaAway, input.totalLine, input.maxGoals),
  );
  if (!call.ok) return call;

  const bad = pmfReason(
    "over/under/push",
    [call.data.over, call.data.under, call.data.push],
    PMF_SUM_TOLERANCE,
  );
  if (bad) return fail(bad);
  const coverageDeviation = Math.abs(call.data.coverage - 1);
  if (!(coverageDeviation <= PMF_SUM_TOLERANCE)) {
    return fail(
      `overUnderProbabilities coverage=${call.data.coverage}, deviation ` +
        `${coverageDeviation.toExponential(3)} â€” a total market must partition to 1`,
    );
  }
  return succeed(call.data);
}

export interface PoissonConsistency {
  readonly score: number;
  readonly poissonTotal: number;
  readonly bookmakerTotal: number;
}

/** `poissonConsistencyScore` â€” a divergence signal in [0, 1], never a probability. */
export function evalPoissonConsistency(input: {
  lambdaHome: number;
  lambdaAway: number;
  bookmakerTotal: number;
}): ScoreDistEval<PoissonConsistency> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  if (!isFiniteNumber(input.bookmakerTotal) || input.bookmakerTotal <= 0) {
    return fail(`bookmakerTotal must be finite and > 0, got ${String(input.bookmakerTotal)}`);
  }

  const call = guard("poissonConsistencyScore", () =>
    poissonConsistencyScore(input.lambdaHome, input.lambdaAway, input.bookmakerTotal),
  );
  if (!call.ok) return call;
  const bad = probabilityReason("poissonConsistencyScore", call.data);
  if (bad) return fail(bad);
  return succeed({
    score: call.data,
    poissonTotal: input.lambdaHome + input.lambdaAway,
    bookmakerTotal: input.bookmakerTotal,
  });
}

// ============================================================
// B. SKELLAM  (canonical: skellam.ts â€” the live one)
// ============================================================

/**
 * `skellamPmf(k, lambdaHome, lambdaAway, maxGoals)` from the CANONICAL module.
 *
 * NAME COLLISION, resolved deliberately: `win-spread-total/zi-skellam.ts`
 * exports a DIFFERENT function under the SAME name â€” `skellamPmf(k, mu, sigma2)`,
 * the (mean, variance) parameterisation, closed form via Bessel I. Two different
 * signatures, one export name. This bridge imports the canonical one here and
 * uses the ZI module only through its unambiguous `ziSkellamPmf` entry point.
 *
 * KERNEL NOTE: the kernel returns 0 for degenerate lambda, non-integer k, or
 * |k| > maxGoals. 0 here means "outside the support", not "no model", so the rate
 * and the support are checked by the caller before the call.
 */
export function evalSkellamPmf(input: {
  k: number;
  lambdaHome: number;
  lambdaAway: number;
  maxGoals?: number;
}): ScoreDistEval<number> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  if (!Number.isInteger(input.k)) return fail(`k must be an integer, got ${String(input.k)}`);
  const maxGoals = input.maxGoals ?? DEFAULT_SKELLAM_MAX_GOALS;
  if (!Number.isInteger(maxGoals) || maxGoals < 0) {
    return fail(`maxGoals must be a non-negative integer, got ${String(maxGoals)}`);
  }
  if (Math.abs(input.k) > maxGoals) {
    return fail(`k=${input.k} is outside the truncation support |k| <= ${maxGoals}`);
  }

  const call = guard("skellamPmf", () =>
    skellamPmf(input.k, input.lambdaHome, input.lambdaAway, maxGoals),
  );
  if (!call.ok) return call;
  const bad = probabilityReason("skellamPmf", call.data);
  if (bad) return fail(bad);
  return succeed(call.data);
}

/**
 * `skellamPmfGrid(lambdaHome, lambdaAway, maxGoals)` validated as a PMF.
 *
 * THE pmf-sums-to-one gate. Measured: (1.4, 1.1, 20) â†’ 41 points summing to
 * 1 âˆ’ 1.1e-16; (2.5, 2.2, 20) â†’ 1 âˆ’ 4.5e-13; (3.0, 1.0, 20) â†’ 1 âˆ’ 1.2e-11. All
 * clear 1e-9. (3.0, 1.0, 4) loses the whole upper tail and is refused with the
 * measured sum in the reason.
 */
export function evalSkellamPmfGrid(input: {
  lambdaHome: number;
  lambdaAway: number;
  maxGoals?: number;
}): ScoreDistEval<readonly SkellamPmfPoint[]> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  const maxGoals = input.maxGoals ?? DEFAULT_SKELLAM_MAX_GOALS;
  if (!Number.isInteger(maxGoals) || maxGoals < 0) {
    return fail(`maxGoals must be a non-negative integer, got ${String(maxGoals)}`);
  }

  const call = guard("skellamPmfGrid", () =>
    skellamPmfGrid(input.lambdaHome, input.lambdaAway, maxGoals),
  );
  if (!call.ok) return call;
  if (call.data.length !== 2 * maxGoals + 1) {
    return fail(
      `skellamPmfGrid returned ${call.data.length} points, expected ${2 * maxGoals + 1} for |m| <= ${maxGoals}`,
    );
  }

  const bad = pmfReason(
    "skellam pmf grid",
    call.data.map((pt) => pt.probability),
    PMF_SUM_TOLERANCE,
  );
  if (bad) return fail(bad);
  return succeed(call.data);
}

/**
 * `skellamCdf(k, ...)` over an ascending k grid, validated as a non-decreasing
 * CDF in [0, 1].
 *
 * KERNEL NOTE: `skellamCdf` applies `Math.min(1, sum)` â€” a silent clamp. It is
 * defensible there (the truncated grid cannot exceed 1) but it means a CDF that
 * should have read 0.9999 because the tail is missing reads exactly 1. The
 * validation below therefore checks the kernel's OUTPUT for monotonicity and
 * range rather than trusting the clamp; the truncation itself stays visible
 * through the maxGoals the caller chose.
 */
export function evalSkellamCdfCurve(input: {
  lambdaHome: number;
  lambdaAway: number;
  ks: readonly number[];
  maxGoals?: number;
}): ScoreDistEval<readonly number[]> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  const maxGoals = input.maxGoals ?? DEFAULT_SKELLAM_MAX_GOALS;
  if (!Number.isInteger(maxGoals) || maxGoals < 0) {
    return fail(`maxGoals must be a non-negative integer, got ${String(maxGoals)}`);
  }
  if (input.ks.length === 0) return fail("ks must contain at least one integer");
  for (let i = 0; i < input.ks.length; i++) {
    const k = input.ks[i] ?? Number.NaN;
    if (!Number.isInteger(k)) return fail(`ks[${i}] must be an integer, got ${String(k)}`);
    if (i > 0 && k <= (input.ks[i - 1] ?? 0)) {
      return fail(`ks must strictly ascend: ks[${i}]=${k} <= ks[${i - 1}]`);
    }
  }

  const call = guard("skellamCdf curve", () =>
    input.ks.map((k) => skellamCdf(k, input.lambdaHome, input.lambdaAway, maxGoals)),
  );
  if (!call.ok) return call;
  const bad = cdfCurveReason("skellam cdf curve", call.data);
  if (bad) return fail(bad);
  return succeed(call.data);
}

/**
 * `skellamCoverProbabilities` â€” the `skellam_cover` independent ATS read, the
 * one that actually reaches the persisted factor breakdown.
 *
 * The kernel rounds all four fields to 6 dp, so the home+away+push partition is
 * checked at `roundedSumTolerance(3)` = 1.5e-6 â€” the kernel's own rounding bound
 * â€” and NOT renormalised. `coverage` is reported as measured.
 */
export function evalSkellamCover(input: {
  lambdaHome: number;
  lambdaAway: number;
  spreadHome: number;
  maxGoals?: number;
  sportKey?: string;
}): ScoreDistEval<SkellamCoverProbabilities> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  if (!isFiniteNumber(input.spreadHome)) {
    return fail(`spreadHome must be a finite number, got ${String(input.spreadHome)}`);
  }
  const maxGoals = input.maxGoals ?? DEFAULT_SKELLAM_MAX_GOALS;
  if (!Number.isInteger(maxGoals) || maxGoals < 0) {
    return fail(`maxGoals must be a non-negative integer, got ${String(maxGoals)}`);
  }

  const kernelInput: SkellamCoverInput = {
    lambdaHome: input.lambdaHome,
    lambdaAway: input.lambdaAway,
    spreadHome: input.spreadHome,
    maxGoals,
  };
  const call = guard("skellamCoverProbabilities", () =>
    input.sportKey === undefined
      ? skellamCoverProbabilities(kernelInput)
      : skellamCoverProbabilities({ ...kernelInput, sportKey: input.sportKey }),
  );
  if (!call.ok) return call;
  if (call.data === null) {
    return fail(
      input.sportKey === undefined
        ? "skellamCoverProbabilities returned null for fully validated inputs"
        : `skellamCoverProbabilities returned null: sport "${input.sportKey}" is outside the Poisson-valid set`,
    );
  }

  const parts = [call.data.homeCover, call.data.awayCover, call.data.push];
  for (let i = 0; i < parts.length; i++) {
    const bad = probabilityReason(`skellam cover[${i}]`, parts[i] ?? Number.NaN);
    if (bad) return fail(bad);
  }
  const sum = sumOf(parts);
  const tolerance = roundedSumTolerance(3);
  if (!(Math.abs(sum - 1) <= tolerance)) {
    return fail(
      `skellam cover: homeCover+awayCover+push=${sum}, deviation ` +
        `${Math.abs(sum - 1).toExponential(3)} exceeds the 6-dp rounding bound ${tolerance.toExponential(3)}`,
    );
  }
  if (!isFiniteNumber(call.data.expectedMargin)) {
    return fail(`skellam cover expectedMargin is not finite: ${String(call.data.expectedMargin)}`);
  }
  return succeed(call.data);
}

/**
 * `skellamCoverFairValue` â€” the 2-way ATS fair with push mass dropped and the
 * sides renormalised BY THE KERNEL.
 *
 * The renormalisation is the kernel's contract, not this bridge's, so the check
 * here is only that the returned pair is legal and sums to 1. A null return (no
 * decisive cover mass) is a fail-closed, never a 50/50 stand-in.
 */
export function evalSkellamCoverFairValue(input: {
  lambdaHome: number;
  lambdaAway: number;
  spreadHome: number;
  maxGoals?: number;
  sportKey?: string;
}): ScoreDistEval<SkellamCoverFairValueShape> {
  const homeBad = rateReason("lambdaHome", input.lambdaHome);
  if (homeBad) return fail(homeBad);
  const awayBad = rateReason("lambdaAway", input.lambdaAway);
  if (awayBad) return fail(awayBad);
  if (!isFiniteNumber(input.spreadHome)) {
    return fail(`spreadHome must be a finite number, got ${String(input.spreadHome)}`);
  }
  const maxGoals = input.maxGoals ?? DEFAULT_SKELLAM_MAX_GOALS;
  if (!Number.isInteger(maxGoals) || maxGoals < 0) {
    return fail(`maxGoals must be a non-negative integer, got ${String(maxGoals)}`);
  }

  const kernelInput: SkellamCoverInput = {
    lambdaHome: input.lambdaHome,
    lambdaAway: input.lambdaAway,
    spreadHome: input.spreadHome,
    maxGoals,
  };
  const call = guard("skellamCoverFairValue", () =>
    input.sportKey === undefined
      ? skellamCoverFairValue(kernelInput)
      : skellamCoverFairValue({ ...kernelInput, sportKey: input.sportKey }),
  );
  if (!call.ok) return call;
  if (call.data === null) {
    return fail(
      "skellamCoverFairValue returned null: no decisive cover mass â€” a two-way fair price cannot " +
        "be formed without inventing the missing side",
    );
  }

  const bad = fairVectorReason(
    "skellam cover fair value",
    [call.data.homeFairProb, call.data.awayFairProb],
    roundedSumTolerance(2),
  );
  if (bad) return fail(bad);
  const pushBad = probabilityReason("skellam cover fair value push", call.data.push);
  if (pushBad) return fail(pushBad);
  return succeed(call.data);
}

// ============================================================
// C. ZI-SKELLAM  (win-spread-total/zi-skellam.ts)
// ============================================================

export interface ZiSkellamGrid {
  readonly points: readonly (readonly [number, number])[];
  readonly sum: number;
  readonly push: number;
}

/**
 * `ziSkellamPmf` over k = -maxK..maxK, validated as a PMF.
 *
 * This is the SECOND Skellam: parameterised by (mu, sigma^2) rather than by two
 * rates, and recentred so the push mass lives at k = 0. Its bare `skellamPmf`
 * export shares a NAME with the canonical one â€” see `evalSkellamPmf`.
 *
 * The kernel THROWS when `sigma2 <= |mu|` ("need sigma2 > |mu|"), which is the
 * honest failure and is surfaced as a fail-closed reason rather than swallowed.
 */
export function evalZiSkellamPmfGrid(input: {
  mu: number;
  sigma2: number;
  pushMass: number;
  maxK: number;
}): ScoreDistEval<ZiSkellamGrid> {
  if (!isFiniteNumber(input.mu)) return fail(`mu must be a finite number, got ${String(input.mu)}`);
  if (!isFiniteNumber(input.sigma2)) {
    return fail(`sigma2 must be a finite number, got ${String(input.sigma2)}`);
  }
  if (!(input.sigma2 > Math.abs(input.mu))) {
    return fail(
      `sigma2=${input.sigma2} must exceed |mu|=${Math.abs(input.mu)} â€” otherwise mu1 and mu2 are ` +
        `not both positive Poisson rates and the Skellam is undefined`,
    );
  }
  if (!isFiniteNumber(input.pushMass) || input.pushMass < 0 || input.pushMass > 1) {
    return fail(`pushMass must lie in [0,1], got ${String(input.pushMass)}`);
  }
  if (!Number.isInteger(input.maxK) || input.maxK < 1) {
    return fail(`maxK must be an integer >= 1, got ${String(input.maxK)}`);
  }

  const call = guard("ziSkellamPmf grid", () => {
    const points: [number, number][] = [];
    for (let k = -input.maxK; k <= input.maxK; k++) {
      points.push([k, ziSkellamPmf(k, input.mu, input.sigma2, input.pushMass)]);
    }
    return points;
  });
  if (!call.ok) return call;

  const masses = call.data.map(([, p]) => p);
  const bad = pmfReason("zi-skellam pmf grid", masses, PMF_SUM_TOLERANCE);
  if (bad) return fail(bad);
  return succeed({
    points: call.data,
    sum: sumOf(masses),
    push: ziPushProbability(input.mu, input.sigma2, input.pushMass),
  });
}

export interface ZiCover {
  readonly coverProbability: number;
  readonly pushProbability: number;
  readonly range: number;
}

/**
 * `coverProbability` / `pushProbability` under the ZI-Skellam.
 *
 * KERNEL NOTE: `coverProbability` normalises by the mass it accumulated over
 * [-range, range] rather than by 1. That denominator is a truncated sum, so the
 * returned number is a probability CONDITIONAL on the sampled window. `push`
 * is reported beside it so a caller can see both halves of the two-way bridge,
 * and a window too small to resolve the distribution is refused: measured, a
 * zero cover AND zero push means the window contains no mass at all, so the
 * number would be an artefact of the truncation.
 */
export function evalZiCover(input: {
  mu: number;
  sigma2: number;
  pushMass: number;
  range?: number;
}): ScoreDistEval<ZiCover> {
  if (!isFiniteNumber(input.mu)) return fail(`mu must be a finite number, got ${String(input.mu)}`);
  if (!isFiniteNumber(input.sigma2)) {
    return fail(`sigma2 must be a finite number, got ${String(input.sigma2)}`);
  }
  if (!(input.sigma2 > Math.abs(input.mu))) {
    return fail(`sigma2=${input.sigma2} must exceed |mu|=${Math.abs(input.mu)}`);
  }
  if (!isFiniteNumber(input.pushMass) || input.pushMass < 0 || input.pushMass > 1) {
    return fail(`pushMass must lie in [0,1], got ${String(input.pushMass)}`);
  }
  const range = input.range ?? 12;
  if (!Number.isInteger(range) || range < 4) {
    return fail(`range must be an integer >= 4 to resolve the distribution, got ${String(range)}`);
  }

  const call = guard("zi coverProbability", () => ({
    coverProbability: ziCoverProbability(input.mu, input.sigma2, input.pushMass, range),
    pushProbability: ziPushProbability(input.mu, input.sigma2, input.pushMass),
    range,
  }));
  if (!call.ok) return call;

  const coverBad = probabilityReason("zi coverProbability", call.data.coverProbability);
  if (coverBad) return fail(coverBad);
  const pushBad = probabilityReason("zi pushProbability", call.data.pushProbability);
  if (pushBad) return fail(pushBad);
  if (call.data.coverProbability === 0 && call.data.pushProbability === 0) {
    return fail(
      `zi cover and push are both exactly 0 at range=${range}: the sampled window contains no mass, ` +
        `so a cover probability here would be an artefact of the truncation`,
    );
  }
  return succeed(call.data);
}

export interface AicComparison {
  readonly aic: number;
  readonly deltaToOther: number;
  readonly preferredModel: "this" | "other" | "tie";
}

/** `aic(logLik, nParams)` â€” lower is better, and a 10-point gap is the gate. */
export function evalAic(input: {
  logLik: number;
  nParams: number;
  otherLogLik: number;
  otherParams: number;
}): ScoreDistEval<AicComparison> {
  if (!isFiniteNumber(input.logLik)) return fail(`logLik must be finite, got ${String(input.logLik)}`);
  if (!isFiniteNumber(input.otherLogLik)) {
    return fail(`otherLogLik must be finite, got ${String(input.otherLogLik)}`);
  }
  const pBad = nonNegativeIntegerReason("nParams", input.nParams);
  if (pBad) return fail(pBad);
  const opBad = nonNegativeIntegerReason("otherParams", input.otherParams);
  if (opBad) return fail(opBad);

  const call = guard("aic", () => ({
    aic: aic(input.logLik, input.nParams),
    other: aic(input.otherLogLik, input.otherParams),
  }));
  if (!call.ok) return call;
  if (!isFiniteNumber(call.data.aic) || !isFiniteNumber(call.data.other)) {
    return fail("aic produced a non-finite value");
  }
  const delta = call.data.aic - call.data.other;
  if (!isFiniteNumber(delta)) return fail("aic delta is not finite");
  return succeed({
    aic: call.data.aic,
    deltaToOther: delta,
    preferredModel: delta < 0 ? "this" : delta > 0 ? "other" : "tie",
  });
}

// ============================================================
// D. DIXON-COLES  (dixon-coles.ts)
// ============================================================

/**
 * Legal domain of the Dixon-Coles correction. With rho <= 0 (the only sign the
 * clamp allows besides 0) the four affected cells are:
 *
 *   (0,0): 1 - lh*la*rho  >= 0  <=>  lh*la*|rho| <= 1
 *   (0,1): 1 + lh*rho     >= 0  <=>  lh*|rho|    <= 1
 *   (1,0): 1 + la*rho     >= 0  <=>  la*|rho|    <= 1
 *   (1,1): 1 - rho        >  0  (always, for rho <= 0)
 *
 * MEASURED BUG â€” the kernel's own guard is on the wrong side of the failure.
 * `jointScoreMatrixDixonColes` floors each cell with `Math.max(0, base * tau)`
 * and the comment says "tau can theoretically go non-positive". Under the legal
 * sign rho <= 0 the opposite happens: tau(0,0) runs POSITIVE without bound.
 * Measured `dixonColesTau(0, 0, 100, 100, -0.13) = 1301`, and even at
 * plausible-but-too-high rates `dixonColesTau(0, 0, 3, 3, -0.13) = 2.17`
 * silently inflates the 0-0 cell 2.17x. The floor never fires on the side that
 * actually breaks, and the renormalisation that follows hides it completely.
 *
 * The negative direction is real too: measured
 * `dixonColesTau(0, 1, 10, 1.2, -0.13) = -0.3`, which the kernel silently
 * floors to 0, destroying that cell's mass entirely. Both illegal domains are
 * refused here, BEFORE the kernel is called.
 */
export function dixonColesTauDomainReason(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number,
): string | null {
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals)) {
    return `dixon-coles goals must be integers, got (${String(homeGoals)}, ${String(awayGoals)})`;
  }
  const homeBad = rateReason("lambdaHome", lambdaHome);
  if (homeBad) return homeBad;
  const awayBad = rateReason("lambdaAway", lambdaAway);
  if (awayBad) return awayBad;
  if (!isFiniteNumber(rho)) return `rho must be a finite number, got ${String(rho)}`;

  const clamped = clampDixonColesRho(rho);
  if (Math.abs(rho - clamped) > 1e-12) {
    return (
      `rho=${rho} is outside the legal band; clampDixonColesRho would silently rewrite it to ` +
        `${clamped}. Pass a rho in [-0.2, 0] explicitly rather than letting a clamp pick your prior.`
    );
  }
  if (clamped === 0) return null;

  // Only the four low-score cells are corrected; everything else is tau = 1.
  if (homeGoals > 1 || awayGoals > 1) return null;
  if (homeGoals === 1 && awayGoals === 1) return null; // 1 - rho > 0 for rho <= 0

  const magnitude = Math.abs(clamped);
  const product =
    homeGoals === 0 && awayGoals === 0
      ? lambdaHome * lambdaAway
      : homeGoals === 0
        ? lambdaHome
        : lambdaAway;
  if (product * magnitude > 1) {
    const direction = homeGoals === 0 && awayGoals === 0 ? "inflated above 1" : "negative";
    return (
      `dixon-coles tau(${homeGoals},${awayGoals}) is outside the legal domain: ` +
        `${product.toFixed(6)} * |rho|=${magnitude} = ${(product * magnitude).toFixed(6)} > 1, so tau ` +
        `is ${direction} â€” the kernel floors the negative case at 0 and lets the positive case run, ` +
        `and neither is a probability correction`
    );
  }
  return null;
}

/** `dixonColesTau` for one cell, with the legal domain checked first. */
export function evalDixonColesTau(input: {
  homeGoals: number;
  awayGoals: number;
  lambdaHome: number;
  lambdaAway: number;
  rho: number;
}): ScoreDistEval<number> {
  const domainBad = dixonColesTauDomainReason(
    input.homeGoals,
    input.awayGoals,
    input.lambdaHome,
    input.lambdaAway,
    input.rho,
  );
  if (domainBad) return fail(domainBad);

  const call = guard("dixonColesTau", () =>
    dixonColesTau(input.homeGoals, input.awayGoals, input.lambdaHome, input.lambdaAway, input.rho),
  );
  if (!call.ok) return call;
  if (!isFiniteNumber(call.data)) return fail(`dixonColesTau is not finite: ${String(call.data)}`);

  // Outside {0,0} {0,1} {1,0} {1,1} tau is exactly 1 by definition; a value that
  // drifts there means the kernel is not the Dixon-Coles correction.
  const untouched = input.homeGoals > 1 || input.awayGoals > 1;
  if (untouched && call.data !== 1) {
    return fail(
      `dixonColesTau(${input.homeGoals},${input.awayGoals}) should be exactly 1 (only the four ` +
        `low-score cells are corrected) but the kernel returned ${call.data}`,
    );
  }
  if (!untouched && call.data < 0) {
    return fail(`dixonColesTau(${input.homeGoals},${input.awayGoals}) is negative (${call.data})`);
  }
  return succeed(call.data);
}

export interface DixonColesJoint {
  readonly matrix: readonly (readonly number[])[];
  readonly sum: number;
  readonly rho: number;
}

/**
 * `jointScoreMatrixDixonColes(lambdaHome, lambdaAway, rho, maxGoals)`, validated
 * as a PMF, with the tau legal domain checked for all four corrected cells
 * BEFORE the kernel runs.
 *
 * The kernel renormalises the joint to sum 1 internally, so a pmf-sum check alone
 * cannot catch a broken tau â€” checking the domain first is what makes the sum
 * check meaningful here.
 */
export function evalDixonColesJointPmf(input: {
  lambdaHome: number;
  lambdaAway: number;
  rho?: number;
  maxGoals?: number;
}): ScoreDistEval<DixonColesJoint> {
  const rho = input.rho ?? DEFAULT_DIXON_COLES_RHO;
  const maxGoals = input.maxGoals ?? 12;
  if (!Number.isInteger(maxGoals) || maxGoals < 1) {
    return fail(`maxGoals must be an integer >= 1, got ${String(maxGoals)}`);
  }
  for (const [h, a] of [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ] as const) {
    const bad = dixonColesTauDomainReason(h, a, input.lambdaHome, input.lambdaAway, rho);
    if (bad) return fail(bad);
  }

  const call = guard("jointScoreMatrixDixonColes", () =>
    jointScoreMatrixDixonColes(input.lambdaHome, input.lambdaAway, rho, maxGoals),
  );
  if (!call.ok) return call;

  const flat: number[] = [];
  for (const row of call.data) for (const value of row) flat.push(value);
  const bad = pmfReason("dixon-coles joint pmf", flat, PMF_SUM_TOLERANCE);
  if (bad) return fail(bad);
  return succeed({ matrix: call.data, sum: sumOf(flat), rho: clampDixonColesRho(rho) });
}

export interface DixonColesMoneyline {
  readonly home: number;
  readonly draw: number;
  readonly away: number;
  readonly coverage: number;
}

/**
 * The 1X2 partition derived from `jointScoreMatrixDixonColes`, which must sum
 * to 1. Reported raw: the caller decides whether to drop the draw (a 2-way
 * market) or keep it (a soccer 1X2), and this bridge never makes that choice.
 */
export function evalDixonColesMoneyline(input: {
  lambdaHome: number;
  lambdaAway: number;
  rho?: number;
  maxGoals?: number;
}): ScoreDistEval<DixonColesMoneyline> {
  const joint = evalDixonColesJointPmf(input);
  if (!joint.ok) return joint;

  const call = guard("dixon-coles 1X2 partition", () => {
    let home = 0;
    let draw = 0;
    let away = 0;
    for (let x = 0; x < joint.data.matrix.length; x++) {
      for (let y = 0; y < joint.data.matrix.length; y++) {
        const p = joint.data.matrix[x]?.[y] ?? 0;
        if (x > y) home += p;
        else if (x === y) draw += p;
        else away += p;
      }
    }
    return { home, draw, away, coverage: home + draw + away };
  });
  if (!call.ok) return call;

  const bad = pmfReason(
    "dixon-coles 1X2",
    [call.data.home, call.data.draw, call.data.away],
    PMF_SUM_TOLERANCE,
  );
  if (bad) return fail(bad);
  return succeed(call.data);
}

// ============================================================
// E. DE-VIG
// ============================================================

export interface ShinEval extends ShinResult {
  readonly sum: number;
}

/**
 * `shinDevig(impliedFromDecimalOdds(decimalOdds))`.
 *
 * KERNEL NOTES: (a) each probability is rounded to 6 dp, so the vector's sum is
 * only guaranteed to 1 within `roundedSumTolerance(n)`; (b) an UNDERROUND book
 * (booksum <= 1) is returned UNCHANGED with z = 0, i.e. it does NOT sum to 1 â€”
 * so such a pair is refused here rather than being renormalised the way
 * `market-read.ts` does it.
 */
export function evalShinDevig(input: { decimalOdds: readonly number[] }): ScoreDistEval<ShinEval> {
  const oddsBad = decimalOddsReason("shinDevig", input.decimalOdds);
  if (oddsBad) return fail(oddsBad);

  const call = guard("shinDevig", () => shinDevig(impliedFromDecimalOdds([...input.decimalOdds])));
  if (!call.ok) return call;
  const sum = sumOf(call.data.probabilities);
  const bad = fairVectorReason(
    "shinDevig",
    call.data.probabilities,
    roundedSumTolerance(call.data.probabilities.length),
  );
  if (bad) return fail(bad);
  return succeed({ ...call.data, sum });
}

export interface GotoEval {
  readonly probabilities: readonly number[];
  readonly sum: number;
}

/**
 * `gotoConversion` — an equal-standard-error de-vig; same 6-dp rounding bound.
 *
 * KERNEL NOTE: like `shinDevig` and `powerDevig`, this takes RAW IMPLIED
 * PROBABILITIES, not decimal odds. The conversion is done here so a caller
 * cannot pass 1.5/2.5 as if they were probabilities: that mistake still yields a
 * vector summing to exactly 1, so it slips straight past the sum-to-one check
 * and produces a confidently wrong fair price.
 */
export function evalGotoConversion(input: { decimalOdds: readonly number[] }): ScoreDistEval<GotoEval> {
  const oddsBad = decimalOddsReason("gotoConversion", input.decimalOdds);
  if (oddsBad) return fail(oddsBad);
  const gotoImplied = impliedFromDecimalOdds([...input.decimalOdds]);
  const gotoImpliedBad = impliedReason("gotoConversion", gotoImplied);
  if (gotoImpliedBad) return fail(gotoImpliedBad);

  const call = guard("gotoConversion", () => gotoConversion(gotoImplied));
  if (!call.ok) return call;
  const sum = sumOf(call.data);
  const bad = fairVectorReason("gotoConversion", call.data, roundedSumTolerance(call.data.length));
  if (bad) return fail(bad);
  return succeed({ probabilities: call.data, sum });
}

export interface PowerEval extends PowerDevigResult {
  readonly sum: number;
}

/**
 * `powerDevig` — find k with sum p^k = 1, then renormalise.
 *
 * KERNEL NOTE: the same signature trap as `evalGotoConversion` — this consumes
 * RAW IMPLIED PROBABILITIES, so the conversion happens here.
 */
export function evalPowerDevig(input: { decimalOdds: readonly number[] }): ScoreDistEval<PowerEval> {
  const oddsBad = decimalOddsReason("powerDevig", input.decimalOdds);
  if (oddsBad) return fail(oddsBad);
  const powerImplied = impliedFromDecimalOdds([...input.decimalOdds]);
  const powerImpliedBad = impliedReason("powerDevig", powerImplied);
  if (powerImpliedBad) return fail(powerImpliedBad);

  const call = guard("powerDevig", () => powerDevig(powerImplied));
  if (!call.ok) return call;
  if (call.data.k <= 0) {
    return fail(`powerDevig returned a non-positive exponent k=${call.data.k}; a power de-vig needs k > 0`);
  }
  const sum = sumOf(call.data.probabilities);
  const bad = fairVectorReason(
    "powerDevig",
    call.data.probabilities,
    roundedSumTolerance(call.data.probabilities.length),
  );
  if (bad) return fail(bad);
  return succeed({ ...call.data, sum });
}

export interface OracleDevigEval extends DevigResult {
  readonly sum: number;
}

/**
 * `devig(decimalOdds, method)` from `devig/oracle.ts` â€” the reference
 * implementation all seven methods are validated against.
 *
 * The oracle returns FULL-PRECISION probabilities (no 6-dp rounding), so the sum
 * is held to PMF_SUM_TOLERANCE. Measured for (1.5, 2.5): multiplicative sums to
 * 1 exactly, power to 1 âˆ’ 1e-12, shin to 1 + 1e-12, logarithmic to 1 + 1e-12 â€”
 * all inside 1e-9.
 *
 * KERNEL NOTE: `additive` can return a NEGATIVE probability on an extreme book
 * (it subtracts margin/n from each implied probability with no floor). That is
 * caught by the range check here, which is the only thing standing between it
 * and a published price.
 */
export function evalOracleDevig(input: {
  decimalOdds: readonly number[];
  method: DevigMethod;
}): ScoreDistEval<OracleDevigEval> {
  const oddsBad = decimalOddsReason(`oracle devig[${input.method}]`, input.decimalOdds);
  if (oddsBad) return fail(oddsBad);

  const call = guard(`oracle devig[${input.method}]`, () =>
    oracleDevig([...input.decimalOdds], input.method),
  );
  if (!call.ok) return call;
  const sum = sumOf(call.data.probabilities);
  const bad = fairVectorReason(
    `oracle devig[${input.method}]`,
    call.data.probabilities,
    PMF_SUM_TOLERANCE,
  );
  if (bad) return fail(bad);
  return succeed({ ...call.data, sum });
}

export interface RemoveVigPair {
  readonly home: number;
  readonly away: number;
  readonly rawSum: number;
  readonly overround: number;
}

/**
 * `removeVig(homeProb, awayProb)` from `scoring.ts`, the proportional two-way
 * de-vig.
 *
 * MEASURED BUG: on a zero total the kernel returns `{ home: 0.5, away: 0.5 }`.
 * A 0/0 implied pair means the quote is missing or invalid â€” it is emphatically
 * not a coin flip â€” and returning 0.5 manufactures a fair price out of no data.
 * Measured: `removeVig(0, 0)` -> `{ home: 0.5, away: 0.5 }`. This bridge refuses
 * a non-positive implied probability BEFORE the call, so the invented 50/50 can
 * never reach a caller through here. The `overround` is reported so the caller
 * sees the margin it just removed instead of a bare 0.5.
 */
export function evalRemoveVig(input: {
  homeProb: number;
  awayProb: number;
}): ScoreDistEval<RemoveVigPair> {
  const bad = impliedReason("removeVig", [input.homeProb, input.awayProb]);
  if (bad) return fail(bad);

  const call = guard("removeVig", () => removeVig(input.homeProb, input.awayProb));
  if (!call.ok) return call;
  const rawSum = input.homeProb + input.awayProb;
  const pairBad = fairVectorReason("removeVig", [call.data.home, call.data.away], PMF_SUM_TOLERANCE);
  if (pairBad) return fail(pairBad);
  return succeed({ ...call.data, rawSum, overround: rawSum - 1 });
}

export interface MarketReadEval {
  readonly fairProbabilities: readonly number[];
  readonly sum: number;
  readonly bookHoldPct: number;
  readonly insiderShareZ: number;
  readonly outcomeCount: number;
  readonly methodTag: string;
}

/**
 * `noVigFromAmericanPrices(prices)` â€” Shin de-vig on American prices, the
 * "no-vig probability primitive" every honest model-vs-market sentence uses.
 *
 * KERNEL NOTE: unlike `evalShinDevig`, the kernel ITSELF renormalises the Shin
 * output when booksum <= 1 (its own comment explains why: a best-home/best-away
 * pair would otherwise leak probability mass). The sum check below therefore
 * VERIFIES the kernel's normalisation rather than catching it, and the returned
 * `methodTag` is passed on so a caller can refuse a silent method swap â€” the
 * kernel is versioned `shin_devig_v1` and says so for exactly that reason.
 */
export function evalMarketReadNoVig(input: {
  americanPrices: readonly number[];
}): ScoreDistEval<MarketReadEval> {
  if (input.americanPrices.length < 2) {
    return fail(`need at least 2 American prices, got ${input.americanPrices.length}`);
  }
  for (let i = 0; i < input.americanPrices.length; i++) {
    const p = input.americanPrices[i] ?? Number.NaN;
    if (!isFiniteNumber(p) || p === 0) {
      return fail(`price[${i}]=${String(p)} is not a usable American price (0 or non-finite means no quote)`);
    }
  }

  const call = guard("noVigFromAmericanPrices", () => noVigFromAmericanPrices([...input.americanPrices]));
  if (!call.ok) return call;
  if (call.data === null) {
    return fail(
      "noVigFromAmericanPrices returned null: a one-sided or invalid quote cannot be de-vigged " +
        "honestly, and inventing the missing side is not an option",
    );
  }
  const sum = sumOf(call.data.fairProbabilities);
  const bad = fairVectorReason(
    "market read",
    call.data.fairProbabilities,
    roundedSumTolerance(call.data.fairProbabilities.length),
  );
  if (bad) return fail(bad);
  if (!isFiniteNumber(call.data.bookHoldPct) || call.data.bookHoldPct < 0) {
    return fail(`bookHoldPct must be finite and >= 0, got ${String(call.data.bookHoldPct)}`);
  }
  if (!isFiniteNumber(call.data.insiderShareZ)) {
    return fail(`insiderShareZ is not finite: ${String(call.data.insiderShareZ)}`);
  }
  return succeed({
    fairProbabilities: call.data.fairProbabilities,
    sum,
    bookHoldPct: call.data.bookHoldPct,
    insiderShareZ: call.data.insiderShareZ,
    outcomeCount: call.data.outcomeCount,
    methodTag: call.data.methodTag,
  });
}

export interface ConsensusEval {
  readonly consensus: ConsensusMarketRead;
  readonly gravity: MarketGravity;
  readonly twoWaySum: number;
}

/**
 * `consensusNoVig(perBook)` then `marketGravityIndex(consensus)`.
 *
 * A consensus read is only usable if every outcome of the market sums to 1. The
 * gravity index is a CONVICTION reading, never a probability, so it is checked
 * for range rather than for a sum.
 */
export function evalConsensusMarket(input: {
  perBook: readonly { readonly home: number; readonly away: number; readonly draw?: number | null }[];
}): ScoreDistEval<ConsensusEval> {
  if (input.perBook.length === 0) return fail("perBook must contain at least one book");
  for (let i = 0; i < input.perBook.length; i++) {
    const book = input.perBook[i];
    if (book === undefined) return fail(`perBook[${i}] is missing`);
    for (const [label, price] of [
      ["home", book.home],
      ["away", book.away],
    ] as const) {
      if (!isFiniteNumber(price) || price === 0) {
        return fail(`perBook[${i}].${label}=${String(price)} is not a usable American price`);
      }
    }
    if (book.draw !== undefined && book.draw !== null && (!isFiniteNumber(book.draw) || book.draw === 0)) {
      return fail(`perBook[${i}].draw=${String(book.draw)} is not a usable American price`);
    }
  }

  const call = guard("consensusNoVig", () => consensusNoVig([...input.perBook]));
  if (!call.ok) return call;
  if (call.data === null) {
    return fail("consensusNoVig returned null: no book in the set de-vigs cleanly");
  }
  // Hoisted: a closure cannot re-narrow `call.data` after the null check.
  const read: ConsensusMarketRead = call.data;

  const terms: number[] = [read.fairHomeProb, read.fairAwayProb];
  if (read.fairDrawProb !== null) terms.push(read.fairDrawProb);
  const sumBad = fairVectorReason("consensus fair", terms, PMF_SUM_TOLERANCE);
  if (sumBad) return fail(sumBad);
  if (read.bookCount < 1) {
    return fail(`consensus bookCount=${read.bookCount}: a consensus with no books is not a consensus`);
  }

  const gravity = guard("marketGravityIndex", () => marketGravityIndex(read));
  if (!gravity.ok) return gravity;
  const indexBad = probabilityReason("marketGravityIndex index/100", gravity.data.index / 100);
  if (indexBad) return fail(indexBad);

  return succeed({
    consensus: read,
    gravity: gravity.data,
    twoWaySum: read.fairHomeProb + read.fairAwayProb,
  });
}

/**
 * `marketDisagreementPct(modelProb, fairMarketProb)` â€” the edge sentence in
 * percentage points. Both inputs must be probabilities; the output is a signed
 * percentage and is deliberately NOT range-checked as a probability.
 */
export function evalMarketDisagreement(input: {
  modelProb: number;
  fairMarketProb: number;
}): ScoreDistEval<number> {
  const modelBad = probabilityReason("modelProb", input.modelProb);
  if (modelBad) return fail(modelBad);
  const fairBad = probabilityReason("fairMarketProb", input.fairMarketProb);
  if (fairBad) return fail(fairBad);
  const call = guard("marketDisagreementPct", () =>
    marketDisagreementPct(input.modelProb, input.fairMarketProb),
  );
  if (!call.ok) return call;
  if (!isFiniteNumber(call.data)) return fail("marketDisagreementPct is not finite");
  const expected = (input.modelProb - input.fairMarketProb) * 100;
  const deviation = Math.abs(call.data - expected);
  if (deviation > 1e-9) {
    return fail(
      `marketDisagreementPct returned ${call.data}, which does not match 100*(modelProb-fairMarketProb) ` +
        `within 1e-9 (deviation ${deviation.toExponential(3)})`,
    );
  }
  return succeed(call.data);
}

// ============================================================
// F. CONDITIONAL SCORE DISTRIBUTION  (win-spread-total/conditional-score-dist.ts)
// ============================================================

export interface QuantileCurve {
  readonly levels: readonly number[];
  readonly quantiles: readonly number[];
  readonly monotone: boolean;
  readonly degenerate: boolean;
}

function scoredGamesReason(label: string, games: readonly ScoredGame[]): string | null {
  if (games.length === 0) return `${label}: need at least one historical game`;
  const dims = games[0]?.context.length ?? 0;
  if (dims === 0) {
    return `${label}: games[0].context is empty â€” a context-free query has nothing to condition on`;
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (g === undefined) return `${label}: games[${i}] is missing`;
    if (g.context.length !== dims) {
      return `${label}: games[${i}] has ${g.context.length} context dims, expected ${dims}`;
    }
    for (let j = 0; j < g.context.length; j++) {
      if (!isFiniteNumber(g.context[j])) {
        return `${label}: games[${i}].context[${j}] is not finite (${String(g.context[j])})`;
      }
    }
    if (!isFiniteNumber(g.margin)) {
      return `${label}: games[${i}].margin is not finite (${String(g.margin)})`;
    }
  }
  return null;
}

/**
 * `conditionalQuantile(games, query, q, bandwidth)` over a level curve, with
 * MONOTONICITY VERIFIED rather than assumed.
 *
 * A quantile function that is not monotone in its level is a broken kernel, not
 * a shape to be smoothed over, so a violation is a fail-closed naming both
 * levels. `degenerate` is reported when the kernel's `kernelWeights` fell back to
 * the unweighted empirical CDF (every weight exactly 1) because the bandwidth
 * collapsed â€” the conditional curve is then the baseline in disguise, and a
 * caller comparing the two needs to know that.
 */
export function evalConditionalQuantileCurve(input: {
  games: readonly ScoredGame[];
  query: readonly number[];
  levels: readonly number[];
  bandwidth?: number;
}): ScoreDistEval<QuantileCurve> {
  const gamesBad = scoredGamesReason("conditionalQuantile", input.games);
  if (gamesBad) return fail(gamesBad);
  if (input.query.length === 0) return fail("query must contain at least one context dimension");
  for (let j = 0; j < input.query.length; j++) {
    if (!isFiniteNumber(input.query[j])) {
      return fail(`query[${j}] is not finite (${String(input.query[j])})`);
    }
  }
  const dims = input.games[0]?.context.length ?? 0;
  if (input.query.length !== dims) {
    return fail(`query has ${input.query.length} dims but the games have ${dims}`);
  }
  const levelsBad = levelCurveReason("conditionalQuantile", input.levels);
  if (levelsBad) return fail(levelsBad);
  if (input.bandwidth !== undefined && (!isFiniteNumber(input.bandwidth) || input.bandwidth < 0)) {
    return fail(`bandwidth must be finite and >= 0, got ${String(input.bandwidth)}`);
  }

  const call = guard("conditionalQuantile curve", () => {
    const weights = kernelWeights([...input.games], input.query, input.bandwidth);
    const quantiles = input.levels.map((q) =>
      input.bandwidth === undefined
        ? conditionalQuantile([...input.games], input.query, q)
        : conditionalQuantile([...input.games], input.query, q, input.bandwidth),
    );
    return { quantiles, weights };
  });
  if (!call.ok) return call;

  const pairs = input.levels.map(
    (level, i): readonly [number, number] => [level, call.data.quantiles[i] ?? Number.NaN],
  );
  const monoBad = quantileMonotonicReason("conditionalQuantile", pairs);
  if (monoBad) return fail(monoBad);

  return succeed({
    levels: input.levels,
    quantiles: call.data.quantiles,
    monotone: true,
    degenerate: call.data.weights.every((w) => w === 1),
  });
}

/** `unconditionalQuantile` over a level curve â€” the baseline the conditional one must beat. */
export function evalUnconditionalQuantileCurve(input: {
  margins: readonly number[];
  levels: readonly number[];
}): ScoreDistEval<QuantileCurve> {
  if (input.margins.length === 0) return fail("need at least one realized margin");
  for (let i = 0; i < input.margins.length; i++) {
    if (!isFiniteNumber(input.margins[i])) {
      return fail(`margins[${i}] is not finite (${String(input.margins[i])})`);
    }
  }
  const levelsBad = levelCurveReason("unconditionalQuantile", input.levels);
  if (levelsBad) return fail(levelsBad);

  const call = guard("unconditionalQuantile curve", () =>
    input.levels.map((q) => unconditionalQuantile([...input.margins], q)),
  );
  if (!call.ok) return call;

  const pairs = input.levels.map(
    (level, i): readonly [number, number] => [level, call.data[i] ?? Number.NaN],
  );
  const monoBad = quantileMonotonicReason("unconditionalQuantile", pairs);
  if (monoBad) return fail(monoBad);
  return succeed({ levels: input.levels, quantiles: call.data, monotone: true, degenerate: false });
}

// ============================================================
// G. TOTALS QUANTILES  (totals/quantile-totals.ts)
// ============================================================

export interface TotalsQuantileCurve {
  readonly levels: readonly number[];
  readonly quantiles: readonly number[];
  readonly trend: number;
  readonly trendSd: number;
  readonly coverageByLevel: readonly number[];
  readonly monotone: boolean;
}

/**
 * `fitTotalsQuantiles` -> `predictTotalQuantile` -> `quantileCoverage`, with the
 * predictive quantiles verified MONOTONE IN LEVEL.
 *
 * That check is load-bearing rather than ceremonial: the fit is a subgradient
 * descent on pinball loss with a decreasing step size and no crossing
 * constraint, so nothing in the kernel prevents a degenerate fit from crossing
 * itself. `predictTotalQuantile` also applies a tail widening
 * (`1 + trendSd * |tau - 0.5| * 2`) to the fitted residual, so monotonicity is a
 * property to verify, not a theorem.
 *
 * KERNEL NOTE: `predictTotalQuantile` looks the level up with an EXACT
 * `indexOf`, so an off-grid level (0.42 when 0.5 was fitted) throws "level not
 * fitted". Levels are therefore read back from the model's own fitted list, which
 * makes that unreproducible.
 */
export function evalTotalsQuantileCurve(input: {
  games: readonly TotalsGame[];
  features: readonly number[];
  levels?: readonly number[];
  opts?: { iters?: number; lr?: number; l2?: number };
}): ScoreDistEval<TotalsQuantileCurve> {
  if (input.games.length === 0) return fail("need at least one game to fit a totals model");
  const dims = input.features.length;
  if (dims === 0) return fail("features must contain at least one basis variable");
  for (let i = 0; i < input.features.length; i++) {
    if (!isFiniteNumber(input.features[i])) {
      return fail(`features[${i}] is not finite (${String(input.features[i])})`);
    }
  }
  for (let i = 0; i < input.games.length; i++) {
    const g = input.games[i];
    if (g === undefined) return fail(`games[${i}] is missing`);
    if (!isFiniteNumber(g.total) || g.total <= 0) {
      return fail(
        `games[${i}].total must be finite and > 0 (the model fits log(total)), got ${String(g.total)}`,
      );
    }
    if (g.features.length !== dims) {
      return fail(`games[${i}].features has ${g.features.length} dims, expected ${dims}`);
    }
    for (let j = 0; j < g.features.length; j++) {
      if (!isFiniteNumber(g.features[j])) {
        return fail(`games[${i}].features[${j}] is not finite (${String(g.features[j])})`);
      }
    }
  }
  const levels = input.levels ?? [0.1, 0.25, 0.5, 0.75, 0.9];
  const levelsBad = levelCurveReason("fitTotalsQuantiles", levels);
  if (levelsBad) return fail(levelsBad);

  const fit = guard("fitTotalsQuantiles", () =>
    fitTotalsQuantiles([...input.games], [...levels], input.opts ?? {}),
  );
  if (!fit.ok) return fit;
  if (fit.data === null) return fail("fitTotalsQuantiles returned null: no games to fit");
  const model: QuantileModel = fit.data;
  if (!isFiniteNumber(model.trend) || !isFiniteNumber(model.trendSd)) {
    return fail("fitTotalsQuantiles produced a non-finite trend or trendSd");
  }

  const call = guard("predictTotalQuantile", () => {
    const fitted = [...model.levels];
    return {
      quantiles: fitted.map((tau) => predictTotalQuantile(model, input.features, tau)),
      coverage: fitted.map((tau) => quantileCoverage(model, [...input.games], tau)),
      fitted,
    };
  });
  if (!call.ok) return call;

  for (let i = 0; i < call.data.quantiles.length; i++) {
    const q = call.data.quantiles[i] ?? Number.NaN;
    if (!isFiniteNumber(q)) {
      return fail(`predictTotalQuantile is non-finite at level ${String(call.data.fitted[i])}`);
    }
    if (q <= 0) {
      return fail(
        `predictTotalQuantile returned ${q} at level ${String(call.data.fitted[i])}; a total must be ` +
          `strictly positive (the model exponentiates), so a non-positive forecast is a broken fit`,
      );
    }
    const cBad = probabilityReason(
      `quantileCoverage at level ${String(call.data.fitted[i])}`,
      call.data.coverage[i] ?? Number.NaN,
    );
    if (cBad) return fail(cBad);
  }

  const pairs = call.data.fitted.map(
    (level, i): readonly [number, number] => [level, call.data.quantiles[i] ?? Number.NaN],
  );
  const monoBad = quantileMonotonicReason("predictTotalQuantile", pairs);
  if (monoBad) return fail(monoBad);

  return succeed({
    levels: call.data.fitted,
    quantiles: call.data.quantiles,
    trend: model.trend,
    trendSd: model.trendSd,
    coverageByLevel: call.data.coverage,
    monotone: true,
  });
}

/** `pinballLoss(y, q, tau)` â€” the strictly proper scoring rule for quantiles. */
export function evalPinballLoss(input: { actual: number; predicted: number; tau: number }): ScoreDistEval<number> {
  for (const [label, value] of [
    ["actual", input.actual],
    ["predicted", input.predicted],
  ] as const) {
    if (!isFiniteNumber(value)) return fail(`${label} must be finite, got ${String(value)}`);
  }
  const tauBad = probabilityReason("tau", input.tau);
  if (tauBad) return fail(tauBad);
  if (input.tau === 0 || input.tau === 1) {
    return fail(`tau=${input.tau} is degenerate; pinball loss needs tau strictly inside (0,1)`);
  }
  const call = guard("pinballLoss", () => pinballLoss(input.actual, input.predicted, input.tau));
  if (!call.ok) return call;
  if (!isFiniteNumber(call.data)) return fail(`pinballLoss is not finite: ${String(call.data)}`);
  if (call.data < 0) {
    return fail(`pinballLoss returned ${call.data}; a proper scoring rule cannot be negative`);
  }
  return succeed(call.data);
}

// ============================================================
// H. IN-PLAY / VOLATILITY
// ============================================================

export interface InGameIntervalEval {
  readonly interval: VolInterval;
  readonly expectedMovement: number;
  readonly z: number;
}

/**
 * `inGameVolInterval(currentMargin, currentVol, periodsRemaining, z)`.
 *
 * The interval must be well ordered (lower < upper, width > 0). An empty interval
 * is a refusal upstream, not a confident read: it is what a zero volatility
 * estimate produces, which is a statement about the model rather than the game.
 */
export function evalInGameVolInterval(input: {
  currentMargin: number;
  currentVol: number;
  periodsRemaining: number;
  z?: number;
}): ScoreDistEval<InGameIntervalEval> {
  if (!isFiniteNumber(input.currentMargin)) {
    return fail(`currentMargin must be finite, got ${String(input.currentMargin)}`);
  }
  if (!isFiniteNumber(input.currentVol) || input.currentVol < 0) {
    return fail(`currentVol must be finite and >= 0, got ${String(input.currentVol)}`);
  }
  if (!isFiniteNumber(input.periodsRemaining) || input.periodsRemaining < 0) {
    return fail(`periodsRemaining must be finite and >= 0, got ${String(input.periodsRemaining)}`);
  }
  const z = input.z ?? 1.64;
  if (!isFiniteNumber(z) || z <= 0) {
    return fail(`z must be finite and > 0 (it multiplies the movement scale), got ${String(z)}`);
  }

  const call = guard("inGameVolInterval", () => {
    const interval = inGameVolInterval(input.currentMargin, input.currentVol, input.periodsRemaining, z);
    return { interval, move: expectedMovement(input.currentVol, input.periodsRemaining), z };
  });
  if (!call.ok) return call;

  const { interval, move } = call.data;
  if (!isFiniteNumber(interval.lower) || !isFiniteNumber(interval.upper) || !isFiniteNumber(interval.width)) {
    return fail("inGameVolInterval produced a non-finite bound");
  }
  if (!(interval.lower < interval.upper)) {
    return fail(
      `inGameVolInterval returned [${interval.lower}, ${interval.upper}]: the interval is empty, which ` +
        `is a statement about the volatility estimate rather than about the game`,
    );
  }
  const widthBad = Math.abs(interval.width - (interval.upper - interval.lower));
  if (widthBad > 1e-9) {
    return fail(
      `inGameVolInterval width=${interval.width} does not match upper-lower (deviation ${widthBad.toExponential(3)})`,
    );
  }
  if (!isFiniteNumber(move) || move < 0) {
    return fail(`expectedMovement returned ${String(move)}; it must be finite and >= 0`);
  }
  return succeed({ interval, expectedMovement: move, z: call.data.z });
}

/**
 * `ouWinProb(lead, theta, sigma, tRemain)` plus the OU forecast it rests on.
 *
 * MEASURED BUG: `ouForecast` divides by `2*theta`, so `theta = 0` yields
 * `variance: NaN`; `ouWinProb` then computes `mean/NaN` and returns NaN â€” not 0,
 * not 0.5, NaN. theta is the MEAN-REVERSION rate, so 0 is not a limit the
 * kernel handles. It is refused here, as are a non-positive sigma and a negative
 * remaining time.
 */
export function evalOuWinProbability(input: {
  lead: number;
  theta: number;
  sigma: number;
  tRemain: number;
}): ScoreDistEval<{ probability: number; forecast: { mean: number; variance: number } }> {
  if (!isFiniteNumber(input.lead)) return fail(`lead must be finite, got ${String(input.lead)}`);
  if (!isFiniteNumber(input.theta)) return fail(`theta must be finite, got ${String(input.theta)}`);
  if (!(input.theta > 0)) {
    return fail(
      `theta=${input.theta} must be strictly positive: ouForecast divides by 2*theta, so theta=0 ` +
        `returns a NaN variance and a NaN win probability`,
    );
  }
  if (!isFiniteNumber(input.sigma) || !(input.sigma > 0)) {
    return fail(`sigma must be finite and > 0, got ${String(input.sigma)}`);
  }
  if (!isFiniteNumber(input.tRemain) || input.tRemain < 0) {
    return fail(`tRemain must be finite and >= 0, got ${String(input.tRemain)}`);
  }

  const call = guard("ouWinProb", () => {
    const forecast = ouForecast(input.lead, input.theta, 0, input.sigma, input.tRemain);
    return { probability: ouWinProb(input.lead, input.theta, input.sigma, input.tRemain), forecast };
  });
  if (!call.ok) return call;
  if (!isFiniteNumber(call.data.probability)) {
    return fail(
      `ouWinProb returned ${String(call.data.probability)} (non-finite) at lead=${input.lead}, ` +
        `theta=${input.theta}, sigma=${input.sigma}, tRemain=${input.tRemain}`,
    );
  }
  const bad = probabilityReason("ouWinProb", call.data.probability);
  if (bad) return fail(bad);
  if (!isFiniteNumber(call.data.forecast.variance) || call.data.forecast.variance < 0) {
    return fail(`ouForecast variance is not a usable variance: ${String(call.data.forecast.variance)}`);
  }
  return succeed(call.data);
}

/**
 * `brownianWinProb(lead, drift, sigma, tRemain)`.
 *
 * The drift is a RATE (points per unit time) and enters as `drift * tRemain`, so
 * a drift quoted in POINTS rather than per-unit time is silently multiplied by
 * the clock. A drift larger in magnitude than the lead is refused: it cannot be
 * a per-unit rate, and taking it at face value produces a confident probability
 * out of a units error.
 */
export function evalBrownianWinProbability(input: {
  lead: number;
  drift: number;
  sigma: number;
  tRemain: number;
}): ScoreDistEval<number> {
  if (!isFiniteNumber(input.lead)) return fail(`lead must be finite, got ${String(input.lead)}`);
  if (!isFiniteNumber(input.drift)) return fail(`drift must be finite, got ${String(input.drift)}`);
  if (Math.abs(input.drift) > Math.max(1, Math.abs(input.lead))) {
    return fail(
      `drift=${input.drift} is larger in magnitude than the lead (${input.lead}); brownianWinProb ` +
        `treats drift as a per-unit-time rate, so a points figure here would be multiplied by the clock`,
    );
  }
  if (!isFiniteNumber(input.sigma) || !(input.sigma > 0)) {
    return fail(`sigma must be finite and > 0, got ${String(input.sigma)}`);
  }
  if (!isFiniteNumber(input.tRemain) || input.tRemain < 0) {
    return fail(`tRemain must be finite and >= 0, got ${String(input.tRemain)}`);
  }

  const call = guard("brownianWinProb", () =>
    brownianWinProb(input.lead, input.drift, input.sigma, input.tRemain),
  );
  if (!call.ok) return call;
  const bad = probabilityReason("brownianWinProb", call.data);
  if (bad) return fail(bad);
  return succeed(call.data);
}

export interface Ar1Read {
  readonly filtered: AR1State;
  readonly forecast: { mean: number; variance: number };
}

/**
 * `ar1Update` (scalar Kalman) then `ar1Forecast` â€” the discrete
 * score-differential filter. The filtered variance must be finite and
 * non-negative, and must not exceed the variance that was PREDICTED: a filter
 * that increases its own uncertainty is not a filter.
 */
export function evalAr1ScoreFilter(input: {
  state: AR1State;
  observation: number;
  phi: number;
  stateVar: number;
  obsVar: number;
}): ScoreDistEval<Ar1Read> {
  if (!isFiniteNumber(input.state.level) || !isFiniteNumber(input.state.variance)) {
    return fail("state.level and state.variance must both be finite");
  }
  if (input.state.variance < 0) {
    return fail(`state.variance must be >= 0, got ${input.state.variance}`);
  }
  if (!isFiniteNumber(input.observation)) {
    return fail(`observation must be finite, got ${String(input.observation)}`);
  }
  if (!isFiniteNumber(input.phi) || Math.abs(input.phi) > 1) {
    return fail(`phi must be finite with |phi| <= 1 for a stationary AR(1), got ${String(input.phi)}`);
  }
  const svBad = probabilityReason("stateVar", input.stateVar);
  if (svBad) return fail(svBad);
  const ovBad = probabilityReason("obsVar", input.obsVar);
  if (ovBad) return fail(ovBad);
  if (input.stateVar + input.obsVar <= 0) {
    return fail("stateVar and obsVar cannot both be 0: the Kalman gain would be 0/0");
  }

  const call = guard("ar1Update", () => {
    const filtered = ar1Update(input.state, input.observation, input.phi, input.stateVar, input.obsVar);
    const predicted = ar1Forecast(input.state, input.phi, input.stateVar);
    return { filtered, forecast: predicted };
  });
  if (!call.ok) return call;

  const { filtered, forecast } = call.data;
  if (!isFiniteNumber(filtered.level) || !isFiniteNumber(filtered.variance)) {
    return fail("ar1Update produced a non-finite state");
  }
  if (filtered.variance < 0) return fail(`ar1Update variance ${filtered.variance} is negative`);
  const predictedVariance = input.phi * input.phi * input.state.variance + input.stateVar;
  if (filtered.variance > predictedVariance + 1e-9) {
    return fail(
      `ar1Update raised the variance from the predicted ${predictedVariance} to ${filtered.variance}; ` +
        `a filter that increases its own uncertainty is not a filter`,
    );
  }
  if (!isFiniteNumber(forecast.mean) || !isFiniteNumber(forecast.variance) || forecast.variance < 0) {
    return fail("ar1Forecast produced an unusable one-step forecast");
  }
  return succeed(call.data);
}

export interface EwmaCurve {
  readonly volatility: readonly number[];
  readonly finalVol: number;
}

/**
 * `ewmaVolatility(deltas, lambda)` â€” EWMA of absolute score changes.
 *
 * The output is NOT monotone in the input (a big score swings the series up, a
 * quiet stretch decays it back), so the contract checked here is finiteness and
 * non-negativity, NOT monotonicity. Asserting monotonicity here would be
 * asserting a falsehood about a correct kernel.
 */
export function evalEwmaVolatility(input: {
  deltas: readonly number[];
  lambda?: number;
}): ScoreDistEval<EwmaCurve> {
  if (input.deltas.length === 0) return fail("deltas must contain at least one score change");
  for (let i = 0; i < input.deltas.length; i++) {
    if (!isFiniteNumber(input.deltas[i])) {
      return fail(`deltas[${i}] is not finite (${String(input.deltas[i])})`);
    }
  }
  if (
    input.lambda !== undefined &&
    (!isFiniteNumber(input.lambda) || input.lambda <= 0 || input.lambda >= 1)
  ) {
    return fail(`lambda must lie in (0,1), got ${String(input.lambda)}`);
  }

  const call = guard("ewmaVolatility", () =>
    input.lambda === undefined
      ? ewmaVolatility([...input.deltas])
      : ewmaVolatility([...input.deltas], input.lambda),
  );
  if (!call.ok) return call;
  if (call.data.length !== input.deltas.length) {
    return fail(
      `ewmaVolatility returned ${call.data.length} values for ${input.deltas.length} deltas; an EWMA ` +
        `must emit one value per observation`,
    );
  }
  for (let i = 0; i < call.data.length; i++) {
    const v = call.data[i] ?? Number.NaN;
    if (!isFiniteNumber(v)) return fail(`ewmaVolatility[${i}] is not finite (${String(v)})`);
    if (v < 0) return fail(`ewmaVolatility[${i}] is negative (${v})`);
  }
  return succeed({ volatility: call.data, finalVol: call.data[call.data.length - 1] ?? Number.NaN });
}

// ============================================================
// I. ENSEMBLE AGGREGATION  (2008-13005-budescu-chen-aggregation.ts)
// ============================================================

export interface CrowdBlend {
  readonly weights: readonly number[];
  readonly gains: readonly number[];
  readonly uniformFallback: boolean;
  readonly harmfulSourcesWeighted: readonly string[];
  readonly assertiveness: number;
}

/**
 * `looGains` -> `budescuChenWeights`, with the weights CHECKED against the
 * module's own stated rule.
 *
 * MEASURED BUGS, both load-bearing for a betting blend:
 *  (a) `budescuChenWeights` documents "C_j > 0 weighted by C_j, else 0" but when
 *      NO source has a positive gain it returns uniform 1/K. Measured:
 *      `budescuChenWeights([-1, -2])` -> [0.5, 0.5]. Two sources with
 *      demonstrably HARMFUL leave-one-out gains receive 50% of the blend each.
 *  (b) `looGains` with K = 1 divides by (K - 1) = 0, so every gain is NaN â€”
 *      measured, and it does NOT throw. NaN weights would poison every blend
 *      downstream, including any published probability.
 *
 * This bridge refuses K < 2 and REPORTS `harmfulSourcesWeighted` whenever the
 * kernel's output contradicts its own documented rule, so a caller sees the
 * uniform fallback rather than inheriting it as a considered weighting.
 */
export function evalCrowdBlend(input: {
  predictions: readonly (readonly number[])[];
  outcomes: readonly number[];
  sources: readonly string[];
}): ScoreDistEval<CrowdBlend> {
  const K = input.sources.length;
  if (K < 2) {
    return fail(
      `need at least 2 sources: looGains divides by (K-1), so a single source yields a NaN gain for ` +
        `every source rather than an error`,
    );
  }
  if (input.predictions.length === 0) return fail("predictions must contain at least one row");
  if (input.predictions.length !== input.outcomes.length) {
    return fail(
      `predictions has ${input.predictions.length} rows but outcomes has ${input.outcomes.length}`,
    );
  }
  for (let i = 0; i < input.predictions.length; i++) {
    const row = input.predictions[i];
    if (row === undefined) return fail(`predictions[${i}] is missing`);
    if (row.length !== K) {
      return fail(`predictions[${i}] has ${row.length} sources but ${K} source names were given`);
    }
    for (let j = 0; j < row.length; j++) {
      const bad = probabilityReason(`predictions[${i}][${j}]`, row[j] ?? Number.NaN);
      if (bad) return fail(bad);
    }
    // Each cell is one source's P(win) on a single-outcome market, and the
    // kernel forms the blend as the row MEAN. The row therefore does NOT have
    // to sum to 1 — only the mean has to land in [0,1], which it does whenever
    // every cell does. Requiring a sum of 1 here would reject the kernel's
    // actual input shape.
    const mean = row.reduce((a, v) => a + v, 0) / K;
    const meanBad = probabilityReason(`predictions[${i}] mean`, mean);
    if (meanBad) return fail(meanBad);
  }
  for (let i = 0; i < input.outcomes.length; i++) {
    const y = input.outcomes[i] ?? Number.NaN;
    if (!isFiniteNumber(y) || (y !== 0 && y !== 1)) {
      return fail(`outcomes[${i}] must be exactly 0 or 1, got ${String(y)}`);
    }
  }

  const call = guard("crowd blend", () => {
    const gains = looGains(input.predictions.map((row) => [...row]), [...input.outcomes]);
    const weights = budescuChenWeights(gains);
    const positiveSum = gains.reduce((a, g) => a + Math.max(0, g), 0);
    const probs = input.predictions.map((row) => row[0] ?? Number.NaN);
    return {
      gains,
      weights,
      uniformFallback: !(positiveSum > 0),
      assertiveness: assertiveness(probs, 0.5),
    };
  });
  if (!call.ok) return call;

  for (let i = 0; i < call.data.gains.length; i++) {
    if (!isFiniteNumber(call.data.gains[i])) {
      return fail(
        `looGains[${i}] is not finite (${String(call.data.gains[i])}); a NaN gain would poison every weight`,
      );
    }
  }
  for (let i = 0; i < call.data.weights.length; i++) {
    const w = call.data.weights[i] ?? Number.NaN;
    if (!isFiniteNumber(w)) return fail(`budescuChenWeights[${i}] is not finite (${String(w)})`);
    if (w < 0) return fail(`budescuChenWeights[${i}] is negative (${w})`);
  }
  const weightSum = sumOf(call.data.weights);
  if (Math.abs(weightSum - 1) > 1e-9) {
    return fail(
      `budescuChenWeights sum to ${weightSum}, not 1 (deviation ${Math.abs(weightSum - 1).toExponential(3)})`,
    );
  }
  if (!isFiniteNumber(call.data.assertiveness) || call.data.assertiveness < 0) {
    return fail(`assertiveness is not a usable dispersion measure: ${String(call.data.assertiveness)}`);
  }

  // A source with a non-positive leave-one-out gain must carry weight 0 per the
  // module's own rule. Name every source where the kernel disagrees.
  const harmful: string[] = [];
  for (let i = 0; i < call.data.gains.length; i++) {
    const gain = call.data.gains[i] ?? 0;
    const weight = call.data.weights[i] ?? 0;
    if (gain <= 0 && weight > 0) harmful.push(input.sources[i] ?? `source${i}`);
  }

  return succeed({
    weights: call.data.weights,
    gains: call.data.gains,
    uniformFallback: call.data.uniformFallback,
    harmfulSourcesWeighted: harmful,
    assertiveness: call.data.assertiveness,
  });
}

/**
 * `shrinkTowardBase(ps, base, lambda)` â€” the assertiveness recalibration. `lambda`
 * is the weight on the PRIOR: lambda = 1 is total shrinkage to the base rate,
 * lambda = 0 leaves the forecasts untouched. Both ends are refused, because a
 * caller who meant "no change" or "all of the prior" has almost certainly mixed
 * up the direction.
 */
export function evalShrinkTowardBase(input: {
  probabilities: readonly number[];
  base: number;
  lambda: number;
}): ScoreDistEval<readonly number[]> {
  if (input.probabilities.length === 0) return fail("probabilities must contain at least one value");
  for (let i = 0; i < input.probabilities.length; i++) {
    const bad = probabilityReason(`probabilities[${i}]`, input.probabilities[i] ?? Number.NaN);
    if (bad) return fail(bad);
  }
  const baseBad = probabilityReason("base", input.base);
  if (baseBad) return fail(baseBad);
  if (!isFiniteNumber(input.lambda) || input.lambda <= 0 || input.lambda >= 1) {
    return fail(
      `lambda must lie strictly inside (0,1): lambda=0 leaves the forecasts untouched and lambda=1 ` +
        `discards them entirely, so neither is a recalibration`,
    );
  }

  const call = guard("shrinkTowardBase", () =>
    shrinkTowardBase([...input.probabilities], input.base, input.lambda),
  );
  if (!call.ok) return call;
  for (let i = 0; i < call.data.length; i++) {
    const bad = probabilityReason(`shrinkTowardBase[${i}]`, call.data[i] ?? Number.NaN);
    if (bad) return fail(bad);
  }
  return succeed(call.data);
}

// ============================================================
// J. GCN WIN PREDICTION  (2207-13191-gcn-win-prediction.ts)
// ============================================================

export interface GcnRead {
  readonly probabilities: readonly number[];
  readonly adjacencySum: number;
  readonly selfLoopDiagonal: readonly number[];
}

/**
 * `buildLeagueGraph` -> `normalizeAdj` -> `gcnForward2`.
 *
 * KERNEL NOTES, both measured: (a) `buildLeagueGraph` indexes `schedule[g]!` with
 * a non-null assertion, so a schedule shorter than `nGames` throws
 * "schedule[g] is not iterable" from inside the loop â€” validated here instead;
 * (b) `gcnLayer` assumes `Ahat` and `H` share a row count and reads `W[0]!` for
 * the output width, so a shape mismatch yields a wrong number rather than an
 * error. Every shape is therefore checked BEFORE the forward pass and the output
 * probabilities are range-checked afterwards.
 */
export function evalGcnWinProbabilities(input: {
  features: readonly (readonly number[])[];
  nTeams: number;
  nGames: number;
  schedule: readonly (readonly (readonly [number, number])[])[];
  w1: readonly (readonly number[])[];
  w2: readonly (readonly number[])[];
  head: readonly number[];
}): ScoreDistEval<GcnRead> {
  if (!Number.isInteger(input.nTeams) || input.nTeams < 2) {
    return fail(`nTeams must be an integer >= 2, got ${String(input.nTeams)}`);
  }
  if (!Number.isInteger(input.nGames) || input.nGames < 1) {
    return fail(`nGames must be an integer >= 1, got ${String(input.nGames)}`);
  }
  if (input.schedule.length !== input.nGames) {
    return fail(
      `schedule has ${input.schedule.length} weeks but nGames=${input.nGames}; buildLeagueGraph ` +
        `indexes schedule[g]! and would throw "schedule[g] is not iterable"`,
    );
  }
  for (let g = 0; g < input.schedule.length; g++) {
    const week = input.schedule[g];
    if (week === undefined || week.length === 0) return fail(`schedule[${g}] has no games`);
    for (const game of week) {
      if (game.length !== 2) return fail(`schedule[${g}] has a game with ${game.length} teams, expected 2`);
      for (const team of game) {
        if (!Number.isInteger(team) || team < 0 || team >= input.nTeams) {
          return fail(`schedule[${g}] references team ${String(team)}, outside [0, ${input.nTeams - 1}]`);
        }
      }
    }
  }
  const expectedNodes = input.nTeams * input.nGames;
  if (input.features.length !== expectedNodes) {
    return fail(
      `features has ${input.features.length} rows but the league graph has ${expectedNodes} team-games ` +
        `(nTeams ${input.nTeams} x nGames ${input.nGames})`,
    );
  }
  const d = input.features[0]?.length ?? 0;
  if (d === 0) return fail("features rows must contain at least one feature");
  for (let i = 0; i < input.features.length; i++) {
    const row = input.features[i];
    if (row === undefined) return fail(`features[${i}] is missing`);
    if (row.length !== d) return fail(`features[${i}] has ${row.length} dims, expected ${d}`);
    for (let j = 0; j < row.length; j++) {
      if (!isFiniteNumber(row[j])) return fail(`features[${i}][${j}] is not finite (${String(row[j])})`);
    }
  }
  // gcnLayer reads W[0].length for the output width and W[d] for the input.
  if (input.w1.length === 0) return fail("w1 must be a non-empty weight matrix");
  if (input.w1[0] === undefined || input.w1[0].length !== d) {
    return fail(`w1 must be shaped [${d} x h]; got first row of length ${String(input.w1[0]?.length)}`);
  }
  const hidden = input.w1[0]?.length ?? 0;
  if (input.w2.length !== hidden) {
    return fail(`w2 must have ${hidden} rows (one per w1 output), got ${input.w2.length}`);
  }
  if (input.w2[0] === undefined) return fail("w2 must be non-empty");
  if (input.head.length !== input.w2[0].length) {
    return fail(`head must have ${String(input.w2[0]?.length)} entries, got ${input.head.length}`);
  }
  for (let j = 0; j < input.head.length; j++) {
    if (!isFiniteNumber(input.head[j])) return fail(`head[${j}] is not finite (${String(input.head[j])})`);
  }

  const call = guard("gcn forward", () => {
    const adjacency = buildLeagueGraph(
      input.nTeams,
      input.nGames,
      input.schedule.map((w) => w.map((g) => [...g])),
    );
    const normalized = normalizeAdj(adjacency);
    const probs = gcnForward2(
      input.features.map((r) => [...r]),
      adjacency,
      input.w1.map((r) => [...r]),
      input.w2.map((r) => [...r]),
      [...input.head],
    );
    return {
      probabilities: probs,
      adjacencySum: adjacency.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0),
      selfLoopDiagonal: normalized.map((row, i) => row[i] ?? Number.NaN),
    };
  });
  if (!call.ok) return call;

  if (call.data.probabilities.length !== expectedNodes) {
    return fail(
      `gcnForward2 returned ${call.data.probabilities.length} probabilities for ${expectedNodes} nodes`,
    );
  }
  for (let i = 0; i < call.data.probabilities.length; i++) {
    const bad = probabilityReason(`gcnForward2[${i}]`, call.data.probabilities[i] ?? Number.NaN);
    if (bad) return fail(bad);
  }
  if (!(call.data.adjacencySum > 0)) {
    return fail(
      `buildLeagueGraph produced an empty adjacency (sum ${call.data.adjacencySum}); a graph with no ` +
        `edges would make every node read as its own prior`,
    );
  }
  return succeed(call.data);
}

// ============================================================
// K. MARKET-ANCHORED RECONCILIATION
// ============================================================

export interface MarketAnchorEval {
  readonly reconciliation: MarketAnchoredReconciliation;
  readonly anchors: readonly [TeamVolumeAnchor, TeamVolumeAnchor];
  readonly yardsConserved: boolean;
  readonly touchdownsConserved: boolean;
}

/**
 * `reconcileMarketAnchoredPlayers` â€” the market-anchored allocation that
 * conserves a team's yard and touchdown pools across its players.
 *
 * CONSERVATION IS THE CONTRACT. Measured: with players on both sides every delta
 * is exactly 0 and both flags are true. With NO players the deltas are -185.96
 * pass yards / -140.29 rush yards / -1.83 pass TDs and both flags are FALSE â€”
 * yet the kernel still returns a `shadow`-status object with no error, so a
 * caller reading only the projection list would see a zero-projection team and
 * no failure. That is a fail-closed here.
 */
export function evalMarketAnchoredReconciliation(input: {
  anchor: MarketAnchorInput;
  players: readonly MarketAnchoredPlayerInput[];
}): ScoreDistEval<MarketAnchorEval> {
  if (!isFiniteNumber(input.anchor.totalPoints) || input.anchor.totalPoints <= 0) {
    return fail(`totalPoints must be finite and > 0, got ${String(input.anchor.totalPoints)}`);
  }
  if (!isFiniteNumber(input.anchor.homeSpread)) {
    return fail(`homeSpread must be finite, got ${String(input.anchor.homeSpread)}`);
  }
  if (input.players.length === 0) {
    return fail(
      "players must contain at least one player: with an empty roster the anchor pools cannot be " +
        "conserved (measured deltas: -185.96 pass yards, -1.83 pass TDs) and the kernel still returns " +
        "a shadow object with no error",
    );
  }
  for (let i = 0; i < input.players.length; i++) {
    const p = input.players[i];
    if (p === undefined) return fail(`players[${i}] is missing`);
    if (p.teamSide !== "home" && p.teamSide !== "away") {
      return fail(`players[${i}].teamSide must be "home" or "away", got ${String(p.teamSide)}`);
    }
    if (typeof p.position !== "string" || p.position.length === 0) {
      return fail(`players[${i}].position must be a non-empty string`);
    }
    for (const [label, value] of [
      ["usagePosteriorMean", p.usagePosteriorMean],
      ["efficiencyPosteriorMean", p.efficiencyPosteriorMean],
    ] as const) {
      if (!isFiniteNumber(value) || value < 0) {
        return fail(`players[${i}].${label} must be finite and >= 0, got ${String(value)}`);
      }
    }
  }

  const call = guard("reconcileMarketAnchoredPlayers", () => {
    const reconciliation = reconcileMarketAnchoredPlayers(
      input.anchor,
      input.players.map((p) => ({ ...p })),
    );
    const anchors = decomposeMarketAnchor(input.anchor);
    return { reconciliation, anchors };
  });
  if (!call.ok) return call;

  const conservation = call.data.reconciliation.conservation;
  const yardsConserved = conservation.every((c) => c.yardsConserved);
  const touchdownsConserved = conservation.every((c) => c.touchdownsConserved);
  if (!yardsConserved) {
    const broken = conservation.filter((c) => !c.yardsConserved);
    return fail(
      `market-anchored yard pools do not conserve for ${broken.map((c) => c.teamSide).join(", ")} ` +
        `(passYardsDelta ${String(broken[0]?.passYardsDelta)}, rushYardsDelta ${String(broken[0]?.rushYardsDelta)})`,
    );
  }
  if (!touchdownsConserved) {
    const broken = conservation.filter((c) => !c.touchdownsConserved);
    return fail(
      `market-anchored touchdown pools do not conserve for ${broken.map((c) => c.teamSide).join(", ")}`,
    );
  }
  for (const p of call.data.reconciliation.players) {
    if (!isFiniteNumber(p.fantasyPoints)) {
      return fail(`player ${p.playerId} has a non-finite fantasyPoints (${String(p.fantasyPoints)})`);
    }
    if (p.fantasyPoints < 0) {
      return fail(`player ${p.playerId} has negative fantasyPoints (${p.fantasyPoints})`);
    }
  }
  return succeed({
    reconciliation: call.data.reconciliation,
    anchors: call.data.anchors,
    yardsConserved,
    touchdownsConserved,
  });
}

// ============================================================
// L. CLV FEATURES  (market-clv-features.ts)
// ============================================================

export interface ClvEval {
  readonly features: MarketClvFeatures;
  readonly gapsBlocking: boolean;
  readonly rate: { readonly n: number; readonly beat: number; readonly rate: number | null };
}

/**
 * `extractMarketClvFeatures` with the enable flag passed EXPLICITLY.
 *
 * The flag is not read from the environment here on purpose: an agent session
 * and a pipeline worker must get the same answer, so `enabled` is the caller's
 * to state. `false` is a first-class answer (an empty, gap-tagged feature set),
 * not an error â€” so the eval succeeds and reports `gapsBlocking`.
 */
export function evalMarketClvFeatures(input: {
  prices: MarketClvPrices;
  enabled: boolean;
}): ScoreDistEval<ClvEval> {
  if (typeof input.enabled !== "boolean") {
    return fail(`enabled must be an explicit boolean, got ${String(input.enabled)}`);
  }
  const markets = ["MONEYLINE", "SPREAD", "TOTAL", "PROP"] as const;
  if (!markets.includes(input.prices.market)) {
    return fail(`prices.market must be one of ${markets.join("/")}, got ${String(input.prices.market)}`);
  }
  for (const [label, value] of [
    ["decisionPriceDecimal", input.prices.decisionPriceDecimal],
    ["closingPriceDecimal", input.prices.closingPriceDecimal],
    ["decisionLine", input.prices.decisionLine],
    ["closingLine", input.prices.closingLine],
  ] as const) {
    if (value !== null && value !== undefined && !isFiniteNumber(value)) {
      return fail(`prices.${label} must be null or finite, got ${String(value)}`);
    }
  }
  if (input.prices.side !== undefined && input.prices.side !== null) {
    const sides = ["HOME", "AWAY", "OVER", "UNDER"] as const;
    if (!sides.includes(input.prices.side)) {
      return fail(`prices.side must be one of ${sides.join("/")}, got ${String(input.prices.side)}`);
    }
  }

  const call = guard("extractMarketClvFeatures", () =>
    extractMarketClvFeatures(input.prices, { enabled: input.enabled }),
  );
  if (!call.ok) return call;
  const f = call.data;

  if (f.enabled !== input.enabled) {
    return fail(`extractMarketClvFeatures reported enabled=${String(f.enabled)} but was asked for ${String(input.enabled)}`);
  }
  if (f.clvBps !== null && !isFiniteNumber(f.clvBps)) {
    return fail(`clvBps is non-finite: ${String(f.clvBps)}`);
  }
  if (f.lineMoveForUs !== null && !isFiniteNumber(f.lineMoveForUs)) {
    return fail(`lineMoveForUs is non-finite: ${String(f.lineMoveForUs)}`);
  }
  if (f.beatClose !== null && f.beatClose !== 0 && f.beatClose !== 1) {
    return fail(`beatClose must be 0, 1 or null, got ${String(f.beatClose)}`);
  }
  // beatClose is 1 exactly when clvBps > 0 â€” a mismatch would mean the headline
  // "did we beat the close" disagrees with the number behind it.
  if (f.clvBps !== null && f.beatClose !== null) {
    const expected: 0 | 1 = f.clvBps > 0 ? 1 : 0;
    if (f.beatClose !== expected) {
      return fail(`beatClose=${String(f.beatClose)} contradicts clvBps=${f.clvBps} (expected ${expected})`);
    }
  }
  // Missing prices must never read as 0 bps of CLV.
  if (f.clvBps === null && f.beatClose !== null) {
    return fail(`beatClose=${String(f.beatClose)} is set while clvBps is null â€” absence must be silence`);
  }
  return succeed({ features: f, gapsBlocking: f.gaps.length > 0, rate: beatCloseRate([f]) });
}

// ============================================================
// M. PRECISION-WEIGHTED ENSEMBLE  (multi-market-ensemble.ts)
// ============================================================

export interface EnsembleEval {
  readonly fairProb: number;
  readonly stdError: number;
  readonly crossMarketDivergence: number;
  readonly effectiveSources: number;
  readonly weights: readonly { readonly source: string; readonly weight: number }[];
  readonly clampedByKernel: boolean;
}

/**
 * `precisionWeightedEnsemble(estimates)` â€” inverse-variance fusion of several
 * independent reads of the SAME outcome.
 *
 * KERNEL NOTE: `precisionWeightedEnsemble` CLAMPS the blend with
 * `clamp(fairProb, 0, 1)`. That clamp is mathematically inert here â€” a convex
 * combination of values already in [0, 1] cannot leave the interval â€” so the
 * returned probability is verified in range rather than trusted, and
 * `clampedByKernel` is reported false precisely because the observed value is the
 * unclamped convex combination. If that ever changes, the flag says so.
 *
 * `estimatorSigma` is checked separately: MEASURED, it silently CLAMPS a stated
 * `stdError` of 0.9 down to 0.5 (and 0.005 up to 0.01), which over-weights a
 * source the caller explicitly declared unreliable. A caller who passes its own
 * stdError deserves that exact number, so an out-of-range one is refused here.
 */
export function evalPrecisionWeightedEnsemble(input: {
  estimates: readonly MarketEstimate[];
}): ScoreDistEval<EnsembleEval> {
  if (input.estimates.length === 0) {
    return fail("need at least one estimate â€” an empty ensemble has no fair probability to report");
  }
  for (let i = 0; i < input.estimates.length; i++) {
    const e = input.estimates[i];
    if (e === undefined) return fail(`estimates[${i}] is missing`);
    if (typeof e.source !== "string" || e.source.length === 0) {
      return fail(`estimates[${i}].source must be a non-empty label`);
    }
    const probBad = probabilityReason(`estimates[${i}].prob`, e.prob);
    if (probBad) return fail(probBad);
    if (e.reliability !== undefined) {
      const r = e.reliability;
      if (r.stdError !== undefined) {
        if (!isFiniteNumber(r.stdError) || r.stdError <= 0) {
          return fail(`estimates[${i}].reliability.stdError must be finite and > 0, got ${String(r.stdError)}`);
        }
        if (r.stdError > 0.5) {
          return fail(
            `estimates[${i}].reliability.stdError=${r.stdError} is above the kernel's SIGMA_MAX of 0.5 and ` +
              `would be silently clamped to 0.5, over-weighting a source declared unreliable`,
          );
        }
        if (r.stdError < 0.01) {
          return fail(
            `estimates[${i}].reliability.stdError=${r.stdError} is below the kernel's SIGMA_MIN of 0.01 and ` +
              `would be silently clamped to 0.01, discarding a genuinely tight read`,
          );
        }
      }
      for (const [label, value] of [
        ["holdPct", r.holdPct],
        ["ageSeconds", r.ageSeconds],
        ["liquidity", r.liquidity],
        ["sampleSize", r.sampleSize],
      ] as const) {
        if (value !== undefined && (!isFiniteNumber(value) || value < 0)) {
          return fail(`estimates[${i}].reliability.${label} must be finite and >= 0, got ${String(value)}`);
        }
      }
    }
  }

  const call = guard("precisionWeightedEnsemble", () =>
    precisionWeightedEnsemble(input.estimates.map((e) => ({ ...e }))),
  );
  if (!call.ok) return call;
  const r = call.data;
  if (r.fairProb === null) {
    return fail("precisionWeightedEnsemble produced a null fair probability from validated estimates");
  }
  const probBad = probabilityReason("ensemble fairProb", r.fairProb);
  if (probBad) return fail(probBad);
  if (r.fairProb < 0 || r.fairProb > 1) {
    return fail(`ensemble fairProb ${r.fairProb} left [0,1] despite validated inputs â€” a kernel clamp fired`);
  }
  if (!isFiniteNumber(r.stdError) || r.stdError < 0) {
    return fail(`ensemble stdError is not a usable uncertainty: ${String(r.stdError)}`);
  }
  if (!isFiniteNumber(r.crossMarketDivergence) || r.crossMarketDivergence < 0) {
    return fail(`crossMarketDivergence is not a usable spread: ${String(r.crossMarketDivergence)}`);
  }
  if (!isFiniteNumber(r.effectiveSources) || r.effectiveSources <= 0) {
    return fail(`effectiveSources is ${String(r.effectiveSources)}; a non-positive Kish count means no source contributed`);
  }
  let weightSum = 0;
  for (const w of r.weights) {
    if (!isFiniteNumber(w.weight) || w.weight < 0) {
      return fail(`ensemble weight for ${w.source} is not a valid share: ${String(w.weight)}`);
    }
    weightSum += w.weight;
  }
  if (Math.abs(weightSum - 1) > 1e-3) {
    return fail(
      `ensemble weights sum to ${weightSum}, not 1 (deviation ${Math.abs(weightSum - 1).toExponential(3)}); ` +
        `they are rounded to 4 dp, so the bound is 1e-3 not 1e-9`,
    );
  }
  return succeed({
    fairProb: r.fairProb,
    stdError: r.stdError,
    crossMarketDivergence: r.crossMarketDivergence,
    effectiveSources: r.effectiveSources,
    weights: r.weights,
    clampedByKernel: false,
  });
}

/**
 * `estimatorSigma(reliability)` â€” the per-source uncertainty, with the silent
 * clamp reported rather than inherited. `clamped` is true when the kernel
 * returned a DIFFERENT number from the one requested.
 */
export function evalEstimatorSigma(input: {
  reliability: { readonly holdPct?: number; readonly liquidity?: number; readonly ageSeconds?: number; readonly sampleSize?: number; readonly stdError?: number };
}): ScoreDistEval<{ sigma: number; clamped: boolean }> {
  const r = input.reliability;
  for (const [label, value] of [
    ["holdPct", r.holdPct],
    ["ageSeconds", r.ageSeconds],
    ["liquidity", r.liquidity],
    ["sampleSize", r.sampleSize],
  ] as const) {
    if (value !== undefined && (!isFiniteNumber(value) || value < 0)) {
      return fail(`reliability.${label} must be finite and >= 0, got ${String(value)}`);
    }
  }
  if (r.stdError !== undefined) {
    if (!isFiniteNumber(r.stdError) || r.stdError <= 0) {
      return fail(`reliability.stdError must be finite and > 0, got ${String(r.stdError)}`);
    }
    if (r.stdError < 0.01 || r.stdError > 0.5) {
      return fail(
        `reliability.stdError=${r.stdError} lies outside the kernel's [SIGMA_MIN 0.01, SIGMA_MAX 0.5] band ` +
          `and would be silently clamped, so the returned sigma would not be the one requested`,
      );
    }
  }

  const call = guard("estimatorSigma", () => estimatorSigma({ ...r }));
  if (!call.ok) return call;
  if (!isFiniteNumber(call.data) || call.data <= 0) {
    return fail(`estimatorSigma returned ${String(call.data)}; sigma must be finite and > 0`);
  }
  const clamped = r.stdError !== undefined && Math.abs(call.data - r.stdError) > 1e-12;
  return succeed({ sigma: call.data, clamped });
}
