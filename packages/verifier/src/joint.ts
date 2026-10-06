/**
 * Joint factor test (F17/F19 shape, LAST_PLAN §4.2).
 *
 * Logistic on the market logit, add one factor at a time, report holdout
 * ΔBrier, P(better), and discover-vs-validate sign.
 *
 * **Keep rule:** ΔBrier < 0 AND P(better) ≥ 0.75 AND sign agrees across eras.
 * Otherwise DEAD, with the number.
 */

import type { JointResult, JointRow } from "./types";
import {
  DEFAULT_BOOTSTRAP_RESAMPLES,
  DEFAULT_BOOTSTRAP_SEED,
  brierScore,
  fitLogistic,
  logisticPredict,
  logit,
  pairedBootstrap,
} from "./stats";

export const JOINT_KEEP_RULE =
  "ΔBrier < 0 AND P(better) ≥ 0.75 AND factor-coefficient sign agrees across eras";

export const JOINT_P_BETTER_FLOOR = 0.75;

export type JointOptions = {
  readonly resamples?: number;
  readonly seed?: number;
  readonly minN?: number;
};

/**
 * Score one factor added to the market-logit logistic.
 *
 * Design matrices:
 *   market-only:  [logit(marketFairProb)]
 *   with factor:  [logit(marketFairProb), factor]
 *
 * Fit on discover era, evaluate both on validate era (identical rows).
 */
export function runJoint(
  factorId: string,
  rows: readonly JointRow[],
  options?: JointOptions,
): JointResult {
  const minN = options?.minN ?? 30;
  const discover = rows.filter((r) => r.era === "discover" && r.factor != null);
  const validate = rows.filter((r) => r.era === "validate" && r.factor != null);

  if (discover.length < minN || validate.length < minN) {
    return {
      factorId,
      nDiscover: discover.length,
      nValidate: validate.length,
      marketOnlyBrierValidate: NaN,
      withFactorBrierValidate: NaN,
      deltaBrier: NaN,
      pBetter: 0.5,
      factorCoefDiscover: NaN,
      factorCoefValidate: NaN,
      signAgrees: false,
      status: "INSUFFICIENT",
      keepRule: JOINT_KEEP_RULE,
      reason: `n discover=${discover.length} validate=${validate.length} below minN=${minN}`,
    };
  }

  const Xd = discover.map((r) => [logit(r.marketFairProb), r.factor!]);
  const yd = discover.map((r) => r.outcome);
  const fitFullD = fitLogistic(Xd, yd);
  const fitBaseD = fitLogistic(discover.map((r) => [logit(r.marketFairProb)]), yd);
  const coefFactorD = fitFullD.coef[2] ?? NaN;

  const Xv = validate.map((r) => [logit(r.marketFairProb), r.factor!]);
  const yv = validate.map((r) => r.outcome);
  const fitFullV = fitLogistic(Xv, yv);
  const coefFactorV = fitFullV.coef[2] ?? NaN;

  // Evaluate discover-fitted models on validate rows (true holdout).
  const pBase = logisticPredict(fitBaseD.coef, validate.map((r) => [logit(r.marketFairProb)]));
  const pFull = logisticPredict(fitFullD.coef, Xv);

  const baseLoss: number[] = [];
  const fullLoss: number[] = [];
  for (let i = 0; i < validate.length; i++) {
    baseLoss.push(brierScore(pBase[i]!, yv[i]!));
    fullLoss.push(brierScore(pFull[i]!, yv[i]!));
  }
  const mean = (a: readonly number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
  const marketOnlyBrierValidate = mean(baseLoss);
  const withFactorBrierValidate = mean(fullLoss);
  const deltaBrier = withFactorBrierValidate - marketOnlyBrierValidate;

  const boot = pairedBootstrap(
    { candidateLoss: fullLoss, marketLoss: baseLoss },
    {
      resamples: options?.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES,
      seed: options?.seed ?? DEFAULT_BOOTSTRAP_SEED,
    },
  );

  // Sign agreement: the factor coefficient's sign on discover-fitted model
  // must match the sign when re-fit on validate (same feature, same scale).
  const signAgrees =
    Number.isFinite(coefFactorD) &&
    Number.isFinite(coefFactorV) &&
    Math.sign(coefFactorD) === Math.sign(coefFactorV) &&
    coefFactorD !== 0 &&
    coefFactorV !== 0;

  const keep =
    Number.isFinite(deltaBrier) &&
    deltaBrier < 0 &&
    boot.pBetter >= JOINT_P_BETTER_FLOOR &&
    signAgrees;

  const status: JointResult["status"] = keep ? "CANDIDATE" : "DEAD";
  const reason = keep
    ? `KEEP: ΔBrier=${deltaBrier.toFixed(5)} P(better)=${boot.pBetter.toFixed(3)} signs D=${coefFactorD.toFixed(4)} V=${coefFactorV.toFixed(4)}`
    : `DEAD: ΔBrier=${deltaBrier.toFixed(5)} P(better)=${boot.pBetter.toFixed(3)} signAgrees=${signAgrees} (need ΔBrier<0, P(better)≥${JOINT_P_BETTER_FLOOR}, sign agreement)`;

  return {
    factorId,
    nDiscover: discover.length,
    nValidate: validate.length,
    marketOnlyBrierValidate,
    withFactorBrierValidate,
    deltaBrier,
    pBetter: boot.pBetter,
    factorCoefDiscover: coefFactorD,
    factorCoefValidate: coefFactorV,
    signAgrees,
    status,
    keepRule: JOINT_KEEP_RULE,
    reason,
  };
}

/**
 * Map holdout pick rows into JointRow using a factor extractor.
 * Rows without a factor value are dropped (never imputed).
 */
export function toJointRows(
  rows: readonly {
    readonly id: string;
    readonly outcome: 0 | 1;
    readonly marketFairProb: number;
    readonly sport: string;
    readonly season?: number | null;
  }[],
  options: {
    readonly factorOf: (row: {
      readonly id: string;
      readonly outcome: 0 | 1;
      readonly marketFairProb: number;
      readonly sport: string;
      readonly season?: number | null;
    }) => number | null;
    readonly discoverMaxSeason: number;
  },
): JointRow[] {
  const out: JointRow[] = [];
  for (const r of rows) {
    const factor = options.factorOf(r);
    if (factor == null || !Number.isFinite(factor)) continue;
    const season = r.season ?? 0;
    out.push({
      outcome: r.outcome,
      marketFairProb: r.marketFairProb,
      factor,
      era: season <= options.discoverMaxSeason ? "discover" : "validate",
      sport: r.sport,
      id: r.id,
    });
  }
  return out;
}
