/**
 * DFS bridge — wires the six DFS computation families into the live slate path.
 *
 * Covers modules that had zero barrel coverage:
 *   cluster-salary-screen  kMeansClusters / flagUndervalued / teammateDifferential
 *   dominance-pruning      paretoFilter / dominancePrune / prunePool /
 *                         bruteForceOptimal / verifyPruning
 *   ip-portfolio          stackBonus / buildLineup / shrinkVariance / buildPortfolio
 *   payout-framework      fitPowerLawAlpha / powerLawShares / bucketPayouts / niceNumber
 *   tournament-variance   calibrateLambdaFromLadder / varianceBudgetPass /
 *                         bystanderEquityDonation / requiredDeltaEV
 *   value-tier            quantizeToTiers / tierErrorCost / top3TierAccuracy /
 *                         flagMispriced
 *
 * Doctrine: the engine reasons, it does not average. Every wrapper is
 * fail-closed — an empty pool, a length mismatch, or an unpriceable contest
 * returns a typed refusal with a reason. Nothing is imputed and no lineup is
 * fabricated from a partial slate.
 */

import {
  kMeansClusters,
  flagUndervalued,
  teammateDifferential,
  type SlatePlayer,
  type ValueFlag,
} from "@sports/prediction-engine";
import {
  paretoFilter,
  dominancePrune,
  prunePool,
  bruteForceOptimal,
  verifyPruning,
  type DominationDfsPlayer,
  type Lineup,
  type PruneVerification,
} from "@sports/prediction-engine";
import {
  stackBonus,
  buildLineup,
  shrinkVariance,
  buildPortfolio,
  type PortfolioDfsPlayer,
  type PortfolioConfig,
} from "@sports/prediction-engine";
import {
  fitPowerLawAlpha,
  powerLawShares,
  bucketPayouts,
  niceNumber,
} from "@sports/prediction-engine";
import {
  calibrateLambdaFromLadder,
  varianceBudgetPass,
  bystanderEquityDonation,
  requiredDeltaEV,
} from "@sports/prediction-engine";
import {
  quantizeToTiers,
  tierErrorCost,
  top3TierAccuracy,
  flagMispriced,
  type MispriceFlag,
} from "@sports/prediction-engine";

export type DfsEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function requirePool<T>(
  pool: readonly T[] | null | undefined,
  label: string,
): DfsEval<true> {
  if (!Array.isArray(pool) || pool.length === 0) {
    return { ok: false, reason: `${label} empty — not imputed` };
  }
  return { ok: true, data: true };
}

function requireSameLength(
  a: readonly unknown[],
  b: readonly unknown[],
  labelA: string,
  labelB: string,
): DfsEval<true> {
  if (a.length !== b.length) {
    return {
      ok: false,
      reason: `${labelA} (${a.length}) and ${labelB} (${b.length}) must be equal-length`,
    };
  }
  return { ok: true, data: true };
}

// ── cluster-salary-screen ───────────────────────────────────────────────────

/** k-means cluster assignment over standardized predictor vectors. */
export function evalPlayerClusters(input: {
  readonly players: readonly SlatePlayer[];
  readonly k: number;
  readonly iters?: number;
}): DfsEval<readonly number[]> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  if (!Number.isInteger(input.k) || input.k < 1) {
    return { ok: false, reason: "k must be a positive integer" };
  }
  try {
    return {
      ok: true,
      data: kMeansClusters(input.players, input.k, input.iters ?? 50),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Flag bottom-tail salary anomalies per (position, cluster) cell as value
 * plays, under a lognormal salary fit. The cluster vector comes from
 * evalPlayerClusters — a caller cannot invent it.
 */
export function evalUndervaluedFlags(input: {
  readonly players: readonly SlatePlayer[];
  readonly clusters: readonly number[];
  readonly tailPct?: number;
}): DfsEval<readonly ValueFlag[]> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  const len = requireSameLength(input.players, input.clusters, "players", "clusters");
  if (!len.ok) return len;
  try {
    return {
      ok: true,
      data: flagUndervalued(input.players, input.clusters, input.tailPct ?? 0.05),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Role-rate differential: a player's rate at this role minus his off-role
 * rate. The stacking signal for a shared-backfield lineup.
 */
export function evalTeammateDifferential(input: {
  readonly toRoleRate: number;
  readonly offRoleRate: number;
}): DfsEval<number> {
  const { toRoleRate, offRoleRate } = input;
  if (!Number.isFinite(toRoleRate) || !Number.isFinite(offRoleRate)) {
    return { ok: false, reason: "both rates must be finite — not imputed" };
  }
  try {
    return { ok: true, data: teammateDifferential(toRoleRate, offRoleRate) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── dominance-pruning ───────────────────────────────────────────────────────

/** Per (position, salary-bucket) Pareto frontier of the pool. */
export function evalParetoFilter(input: {
  readonly players: readonly DominationDfsPlayer[];
  readonly bucketSize?: number;
}): DfsEval<readonly DominationDfsPlayer[]> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  try {
    return { ok: true, data: paretoFilter(input.players, input.bucketSize ?? 500) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Players strictly dominated by a same-position alternative. */
export function evalDominancePrune(input: {
  readonly players: readonly DominationDfsPlayer[];
}): DfsEval<readonly DominationDfsPlayer[]> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  try {
    return { ok: true, data: dominancePrune(input.players) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Pareto filter then dominance prune — the production pool reduction. */
export function evalPrunePool(input: {
  readonly players: readonly DominationDfsPlayer[];
  readonly bucketSize?: number;
}): DfsEval<readonly DominationDfsPlayer[]> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  try {
    return { ok: true, data: prunePool(input.players, input.bucketSize ?? 500) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Exhaustive optimal lineup for small slates. Returns a refusal when the
 * slate cannot field a legal lineup — never a partial lineup.
 */
export function evalBruteForceLineup(input: {
  readonly players: readonly DominationDfsPlayer[];
  readonly positions: readonly string[];
  readonly cap: number;
}): DfsEval<Lineup> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  if (!Array.isArray(input.positions) || input.positions.length === 0) {
    return { ok: false, reason: "positions empty — not imputed" };
  }
  if (!Number.isFinite(input.cap) || input.cap <= 0) {
    return { ok: false, reason: "cap must be finite and > 0" };
  }
  try {
    const lineup = bruteForceOptimal(input.players, input.positions, input.cap);
    if (lineup == null) {
      return {
        ok: false,
        reason: "no legal lineup under the cap for these positions — not imputed",
      };
    }
    return { ok: true, data: lineup };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Prove the pruned pool reproduces the unpruned optimum exactly. */
export function evalVerifyPruning(input: {
  readonly players: readonly DominationDfsPlayer[];
  readonly positions: readonly string[];
  readonly cap: number;
  readonly bucketSize?: number;
}): DfsEval<PruneVerification> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  if (!Array.isArray(input.positions) || input.positions.length === 0) {
    return { ok: false, reason: "positions empty — not imputed" };
  }
  if (!Number.isFinite(input.cap) || input.cap <= 0) {
    return { ok: false, reason: "cap must be finite and > 0" };
  }
  try {
    const v = verifyPruning(
      input.players,
      input.positions,
      input.cap,
      input.bucketSize ?? 500,
    );
    if (!v.optimaMatch) {
      return {
        ok: false,
        reason: `pruning changed the optimum (${v.originalProjection} -> ${v.prunedProjection})`,
      };
    }
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── ip-portfolio ────────────────────────────────────────────────────────────

/** Stack bonus for co-owned passers and receivers. */
export function evalStackBonus(input: {
  readonly players: readonly PortfolioDfsPlayer[];
}): DfsEval<number> {
  const pool = requirePool(input.players, "players");
  if (!pool.ok) return pool;
  try {
    return { ok: true, data: stackBonus(input.players) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Greedy lineup under the portfolio's roster, cap and variance floor. */
export function evalBuildLineup(input: {
  readonly pool: readonly PortfolioDfsPlayer[];
  readonly config: PortfolioConfig;
  readonly exclude?: ReadonlySet<string>;
}): DfsEval<readonly PortfolioDfsPlayer[]> {
  const pool = requirePool(input.pool, "pool");
  if (!pool.ok) return pool;
  if (!input.config) {
    return { ok: false, reason: "config required — not imputed" };
  }
  try {
    return { ok: true, data: buildLineup(input.pool, input.config, input.exclude) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Shrink a raw sample variance toward a prior variance. Few observations
 * means trust the prior; many means trust the data.
 */
export function evalShrinkVariance(input: {
  readonly rawVar: number;
  readonly priorVar: number;
  readonly nObs: number;
  readonly priorWeight?: number;
}): DfsEval<number> {
  const { rawVar, priorVar, nObs } = input;
  if (!Number.isFinite(rawVar) || rawVar < 0) {
    return { ok: false, reason: "rawVar must be finite and >= 0" };
  }
  if (!Number.isFinite(priorVar) || priorVar < 0) {
    return { ok: false, reason: "priorVar must be finite and >= 0" };
  }
  if (!Number.isInteger(nObs) || nObs < 0) {
    return { ok: false, reason: "nObs must be a non-negative integer" };
  }
  try {
    return {
      ok: true,
      data: shrinkVariance(rawVar, priorVar, nObs, input.priorWeight ?? 10),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Sequential portfolio of n lineups under overlap + variance constraints. */
export function evalBuildPortfolio(input: {
  readonly pool: readonly PortfolioDfsPlayer[];
  readonly config: PortfolioConfig;
  readonly n: number;
  readonly ownershipPenalty?: number;
}): DfsEval<readonly (readonly PortfolioDfsPlayer[])[]> {
  const pool = requirePool(input.pool, "pool");
  if (!pool.ok) return pool;
  if (!input.config) {
    return { ok: false, reason: "config required — not imputed" };
  }
  if (!Number.isInteger(input.n) || input.n < 1) {
    return { ok: false, reason: "n must be a positive integer" };
  }
  try {
    return {
      ok: true,
      data: buildPortfolio(input.pool, input.config, input.n, input.ownershipPenalty ?? 20),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── payout-framework ────────────────────────────────────────────────────────

/** Fit the power-law exponent reproducing a target winner share. */
export function evalPowerLawAlpha(input: {
  readonly nPaid: number;
  readonly targetWinnerShare: number;
  readonly tol?: number;
}): DfsEval<number> {
  if (!Number.isInteger(input.nPaid) || input.nPaid < 1) {
    return { ok: false, reason: "nPaid must be a positive integer" };
  }
  const share = input.targetWinnerShare;
  if (!Number.isFinite(share) || share <= 0 || share > 1) {
    return { ok: false, reason: "targetWinnerShare must be in (0,1] — not imputed" };
  }
  try {
    const alpha = fitPowerLawAlpha(input.nPaid, share, input.tol ?? 1e-9);
    if (!Number.isFinite(alpha)) {
      return { ok: false, reason: "fitPowerLawAlpha returned a non-finite alpha" };
    }
    return { ok: true, data: alpha };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Prize-pool share split across N paid places. Refuses any split that does
 * not partition the pool — a partial payout table is a mispricing claim.
 */
export function evalPowerLawShares(input: {
  readonly nPaid: number;
  readonly alpha: number;
}): DfsEval<readonly number[]> {
  if (!Number.isInteger(input.nPaid) || input.nPaid < 1) {
    return { ok: false, reason: "nPaid must be a positive integer" };
  }
  if (!Number.isFinite(input.alpha)) {
    return { ok: false, reason: "alpha must be finite" };
  }
  try {
    const shares = powerLawShares(input.nPaid, input.alpha);
    const total = shares.reduce((s, x) => s + x, 0);
    if (Math.abs(total - 1) > 1e-6) {
      return { ok: false, reason: `shares sum to ${total}, not 1 — not a partition` };
    }
    return { ok: true, data: shares };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Payout buckets that land on contest-friendly round numbers. */
export function evalBucketPayouts(input: {
  readonly totalPrize: number;
  readonly nPaid: number;
  readonly alpha: number;
  readonly tolerance?: number;
}): DfsEval<readonly { rankStart: number; rankEnd: number; prizePerWinner: number }[]> {
  if (!Number.isFinite(input.totalPrize) || input.totalPrize <= 0) {
    return { ok: false, reason: "totalPrize must be finite and > 0" };
  }
  if (!Number.isInteger(input.nPaid) || input.nPaid < 1) {
    return { ok: false, reason: "nPaid must be a positive integer" };
  }
  if (!Number.isFinite(input.alpha)) {
    return { ok: false, reason: "alpha must be finite" };
  }
  try {
    const buckets = bucketPayouts(
      input.totalPrize,
      input.nPaid,
      input.alpha,
      input.tolerance ?? 0.05,
    );
    if (buckets.length === 0) {
      return {
        ok: false,
        reason: "no payout bucket lands within tolerance — not imputed",
      };
    }
    return { ok: true, data: buckets };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Nearest contest-friendly round number. */
export function evalNiceNumber(input: { readonly x: number }): DfsEval<number> {
  if (!Number.isFinite(input.x)) {
    return { ok: false, reason: "x must be finite" };
  }
  try {
    return { ok: true, data: niceNumber(input.x) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── tournament-variance ─────────────────────────────────────────────────────

/**
 * Calibrate risk aversion from a contest payout ladder. The ladder is a
 * real function of score; a lambda derived from an invented ladder is a
 * claim we refuse to make.
 */
export function evalCalibrateLambda(input: {
  readonly payoutAtScore: (score: number) => number;
  readonly centerScore: number;
  readonly delta?: number;
}): DfsEval<number> {
  if (typeof input.payoutAtScore !== "function") {
    return { ok: false, reason: "payoutAtScore must be a function" };
  }
  if (!Number.isFinite(input.centerScore)) {
    return { ok: false, reason: "centerScore must be finite" };
  }
  if (!Number.isFinite(input.delta) || (input.delta ?? 1) <= 0) {
    return { ok: false, reason: "delta must be finite and > 0" };
  }
  try {
    const lambda = calibrateLambdaFromLadder(
      input.payoutAtScore,
      input.centerScore,
      input.delta ?? 1,
    );
    if (!Number.isFinite(lambda)) {
      return { ok: false, reason: "calibrateLambdaFromLadder returned a non-finite lambda" };
    }
    return { ok: true, data: lambda };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Does this EV/Variance trade respect the tournament's variance budget? */
export function evalVarianceBudgetPass(input: {
  readonly deltaEV: number;
  readonly deltaVar: number;
  readonly lambda: number;
}): DfsEval<boolean> {
  const { deltaEV, deltaVar, lambda } = input;
  if (![deltaEV, deltaVar, lambda].every(Number.isFinite)) {
    return { ok: false, reason: "deltaEV, deltaVar, lambda must be finite" };
  }
  if (deltaVar < 0) {
    return { ok: false, reason: "deltaVar must be >= 0" };
  }
  if (lambda < 0) {
    return { ok: false, reason: "lambda must be non-negative" };
  }
  try {
    return { ok: true, data: varianceBudgetPass(deltaEV, deltaVar, lambda) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Equity a bystander contributes by entering a contest late. */
export function evalBystanderEquity(input: {
  readonly expectedPrize: number;
  readonly expectedPrizeAtMeanVariance: number;
}): DfsEval<number> {
  const { expectedPrize, expectedPrizeAtMeanVariance } = input;
  if (!Number.isFinite(expectedPrize) || !Number.isFinite(expectedPrizeAtMeanVariance)) {
    return { ok: false, reason: "both expected prizes must be finite — not imputed" };
  }
  try {
    return {
      ok: true,
      data: bystanderEquityDonation(expectedPrize, expectedPrizeAtMeanVariance),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Minimum EV improvement that justifies a given variance increase. */
export function evalRequiredDeltaEV(input: {
  readonly deltaVar: number;
  readonly lambda: number;
}): DfsEval<number> {
  const { deltaVar, lambda } = input;
  if (!Number.isFinite(deltaVar) || !Number.isFinite(lambda)) {
    return { ok: false, reason: "deltaVar and lambda must be finite" };
  }
  if (deltaVar < 0) {
    return { ok: false, reason: "deltaVar must be >= 0" };
  }
  if (lambda < 0) {
    return { ok: false, reason: "lambda must be non-negative" };
  }
  try {
    return { ok: true, data: requiredDeltaEV(deltaVar, lambda) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── value-tier ──────────────────────────────────────────────────────────────

/** Quantize a value vector onto n rank-based tiers. */
export function evalQuantizeTiers(input: {
  readonly values: readonly number[];
  readonly nTiers?: number;
}): DfsEval<readonly number[]> {
  const pool = requirePool(input.values, "values");
  if (!pool.ok) return pool;
  if (!Number.isInteger(input.nTiers ?? 20) || (input.nTiers ?? 20) < 2) {
    return { ok: false, reason: "nTiers must be an integer >= 2" };
  }
  try {
    return { ok: true, data: quantizeToTiers(input.values, input.nTiers ?? 20) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Error cost of the tier quantization, penalizing upward misses. */
export function evalTierErrorCost(input: {
  readonly predicted: readonly number[];
  readonly actual: readonly number[];
  readonly upMissPenalty?: number;
}): DfsEval<number> {
  if (!Array.isArray(input.predicted) || !Array.isArray(input.actual)) {
    return { ok: false, reason: "predicted and actual must be arrays" };
  }
  if (input.predicted.length === 0) {
    return { ok: false, reason: "predicted empty — not imputed" };
  }
  const len = requireSameLength(input.predicted, input.actual, "predicted", "actual");
  if (!len.ok) return len;
  try {
    return {
      ok: true,
      data: tierErrorCost(input.predicted, input.actual, input.upMissPenalty ?? 1),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Top-3 tier hit rate. */
export function evalTop3TierAccuracy(input: {
  readonly predicted: readonly number[];
  readonly actual: readonly number[];
}): DfsEval<number> {
  if (!Array.isArray(input.predicted) || !Array.isArray(input.actual)) {
    return { ok: false, reason: "predicted and actual must be arrays" };
  }
  if (input.predicted.length === 0) {
    return { ok: false, reason: "predicted empty — not imputed" };
  }
  const len = requireSameLength(input.predicted, input.actual, "predicted", "actual");
  if (!len.ok) return len;
  try {
    return { ok: true, data: top3TierAccuracy(input.predicted, input.actual) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Players whose model tier exceeds their salary tier by at least minGap. */
export function evalMispricedFlags(input: {
  readonly ids: readonly string[];
  readonly salaryTiers: readonly number[];
  readonly modelTiers: readonly number[];
  readonly minGap?: number;
}): DfsEval<readonly MispriceFlag[]> {
  const pool = requirePool(input.ids, "ids");
  if (!pool.ok) return pool;
  const a = requireSameLength(input.ids, input.salaryTiers, "ids", "salaryTiers");
  if (!a.ok) return a;
  const b = requireSameLength(input.ids, input.modelTiers, "ids", "modelTiers");
  if (!b.ok) return b;
  try {
    return {
      ok: true,
      data: flagMispriced(
        input.ids,
        input.salaryTiers,
        input.modelTiers,
        input.minGap ?? 3,
      ),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  kMeansClusters,
  flagUndervalued,
  teammateDifferential,
  paretoFilter,
  dominancePrune,
  prunePool,
  bruteForceOptimal,
  verifyPruning,
  stackBonus,
  buildLineup,
  shrinkVariance,
  buildPortfolio,
  fitPowerLawAlpha,
  powerLawShares,
  bucketPayouts,
  niceNumber,
  calibrateLambdaFromLadder,
  varianceBudgetPass,
  bystanderEquityDonation,
  requiredDeltaEV,
  quantizeToTiers,
  tierErrorCost,
  top3TierAccuracy,
  flagMispriced,
};
export type {
  SlatePlayer,
  ValueFlag,
  DominationDfsPlayer,
  Lineup,
  PruneVerification,
  PortfolioDfsPlayer,
  PortfolioConfig,
  MispriceFlag,
};
