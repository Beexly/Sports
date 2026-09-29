/**
 * Decision / ensemble bridge.
 *
 * Turns the engine's abstention gates (`decision/`), forecast-combination
 * kernels (`ensemble/`), drift monitors (`drift/`, `monitoring/`) and
 * evaluation gates (`evaluation/`) into a fail-closed, live-callable surface.
 *
 * DOMAIN RULES ENFORCED HERE (this family decides what gets PUBLISHED):
 *  - A gate returns an explicit `GateVerdict`, never a bare float. Where a
 *    module returns a score the field is named `...Score` and is never
 *    presented as a probability.
 *  - "No bet" and "could not compute" are structurally different:
 *    `ok:true, verdict:"NO_BET"` vs `ok:false`. Conflating them is lying
 *    about coverage.
 *  - An ensemble weight vector must be non-negative AND sum to 1. A sum that
 *    deviates beyond `WEIGHT_SUM_TOLERANCE` FAILS CLOSED; the bridge never
 *    renormalises, because a silent renormalisation hides a broken combiner.
 *  - A pooled probability must be finite and lie in [0,1]. No clamping.
 *  - Combiners surface an effective number of members so a single dominant
 *    member cannot dominate silently.
 *  - Drift verdicts require an explicit baseline window and echo it back.
 *  - Deterministic RNG only (`mulberry32`, a counter-based LCG). Never
 *    `Math.random`.
 *
 * SCOPE NOTE: many `decision/` modules ship `export const ENABLED = false`,
 * meaning "not wired into a publish path; activation is a human call". This
 * bridge does NOT flip those flags -- it calls the pure kernels so the gates
 * can be measured. Results carry `sourceModuleEnabled` so a reader can see
 * that a `FIRE` verdict here is a research verdict, not a publish
 * authorisation. Changing a flag is a founder action, not a bridge action.
 */

import {
  uncertaintySortedPublish,
  volumeGovernor,
  cqrVarianceGate,
  confidenceGateCheck,
  pairwiseRankAbstention,
  type AccuracyBin,
} from "@sports/prediction-engine/src/decision/no-bet-filters.js";

import {
  hostileMarketScore,
  hostileNoBet,
  type HostileMarketFeatures,
  type NoBetHeadWeights,
} from "@sports/prediction-engine/src/decision/1911-11253v1-hostile-market-abstain.js";

import {
  lateWeightedDisagreement,
  flipLineInteraction,
  nntdAbstain,
  type SnapshotPick,
} from "@sports/prediction-engine/src/decision/2205-13532-training-disagreement-gate.js";

import { instabilityGatePasses } from "@sports/prediction-engine/src/decision/2508-07556v2-instability-gate.js";

import {
  coverPrediction,
  calibrateAbstainTau,
  coveredAccuracy,
  type CoverHeadOutputs,
} from "@sports/prediction-engine/src/decision/2104-08281v1-cover-abstention-head.js";

import {
  totalsPublishRule,
  recalibrateTau,
  sigmaCalibration,
  totalsAbstentionGatePasses,
} from "@sports/prediction-engine/src/decision/2104-08236v1-totals-abstention-sigma.js";

import {
  twoStageRejector,
  abstentionLoss,
  predictorRejectorCascade,
  type DeferralTier,
} from "@sports/prediction-engine/src/decision/rejector-heads.js";

import {
  marketConditionedRho,
  risanPublish,
  risanAcceptedHitRate,
  risanGatePasses,
  type RisanPick,
} from "@sports/prediction-engine/src/decision/2107-03090-risan-instance-abstention.js";

import {
  precisionWeightedAggregate,
  binomialMajorityGate,
  agreementGate,
  disagreementNoBet,
  crowdsourcedReject,
  injectivityAudit,
  type EnsembleMember,
} from "@sports/prediction-engine/src/decision/forecast-aggregation.js";

import { conformalRiskControl } from "@sports/prediction-engine/src/decision/conformal-abstention.js";

import {
  calibrateConformalThreshold,
  rocTuneAbstentionThreshold,
  dualThresholdPublish,
  fixed70Publish,
  evaluatePolicy,
  rocAbstentionGatePasses,
  type ConformalPick,
} from "@sports/prediction-engine/src/decision/2502-07255v2-dual-threshold-conformal.js";

import {
  classGateDecision,
  classErrorRate,
  classAbstentionRate,
  perClassGatePasses,
  mulberry32,
  type ClassGate,
  type MarketType,
} from "@sports/prediction-engine/src/decision/2609-22632-perclass-gates.js";

import {
  hybridUncertainty,
  uncertaintyPostDecision,
  selectiveHitRate,
  hybridGatePasses,
  type UncertaintyComponents,
  type UncertaintyWeights,
} from "@sports/prediction-engine/src/decision/2607-24875v1-hybrid-uncertainty.js";

import {
  routerDecision,
  routedSystemUnits,
  deferralBiasAudit,
  deferralRouterGatePasses,
  type DeferralTriple,
  type SubpopulationAudit,
} from "@sports/prediction-engine/src/decision/2006-01862-expert-deferral-router.js";

import {
  blpApply,
  blpFit,
} from "@sports/prediction-engine/src/ensemble/2202-11834-beta-linear-pool.js";

import {
  pseudoBmaPlus,
  stackingWeights,
  stackedLogScore,
} from "@sports/prediction-engine/src/ensemble/logscore-stacking.js";

import {
  dampenedLogOddsCombine,
  tuneDamping,
} from "@sports/prediction-engine/src/ensemble/dampened-log-odds.js";

import {
  consensus,
  evaluateConsensus,
} from "@sports/prediction-engine/src/ensemble/median-consensus.js";

import {
  varianceEM,
  simpleAverage as varianceEmSimpleAverage,
  sourceReliabilityDashboard,
} from "@sports/prediction-engine/src/ensemble/variance-em-aggregator.js";

import {
  diversityMatrix,
  diversityContribution,
  diversityWeights,
} from "@sports/prediction-engine/src/ensemble/2012-01643-diversity-weighted-combiner.js";

import {
  covarianceIntersection,
  decomposeUncertainty,
  consistencyCheck,
  adaptiveWeights,
  type Source as CovarianceSource,
} from "@sports/prediction-engine/src/ensemble/covariance-intersection.js";

import {
  PageHinkley,
  Pudd,
  Ecdd as MonitoringEcdd,
  majorityVote,
  evaluateDrift,
  type Alarm,
} from "@sports/prediction-engine/src/monitoring/drift-monitor-ensemble.js";

import {
  createEcdd,
  ecddUpdate,
  ecddWorstCaseDelay,
  type EcddConfig,
  type EcddState,
} from "@sports/prediction-engine/src/drift/ecdd-monitor.js";

import {
  meanCrps,
  energyScore,
  crpsSum,
  discriminationGate,
  type ScoreFn,
  type DiscriminationCase,
} from "@sports/prediction-engine/src/evaluation/metric-discrimination-gate.js";

import {
  scorecard,
  rankingDisagreements,
  type GameEval,
  type Scorecard,
  type TierSets,
} from "@sports/prediction-engine/src/evaluation/model-scorecard.js";

import {
  murphyDiagram,
  meanPinballDiff,
  dieboldMariano,
} from "@sports/prediction-engine/src/evaluation/murphy-diagram.js";

import {
  classwiseEce,
  accuracy,
  bakeOff,
  fractionalKellyStake,
  selectionVerdict,
  type Forecast,
  type CandidateResult,
} from "@sports/prediction-engine/src/evaluation/selection-metric.js";

// ===========================================================================
// Core result type
// ===========================================================================

export type DecisionEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): DecisionEval<never> {
  return { ok: false, reason };
}

/**
 * FIRE         -- the gate's own rule says publish.
 * NO_BET       -- the gate ran and said do not publish. A finding, not a blank.
 * ABSTAIN      -- the gate ran and deliberately refused to decide (uncertainty
 *                  band, concept drift, ambiguous prediction set).
 * HUMAN_REVIEW -- a machine gate could not settle it; a human signs off.
 */
export type GateVerdict = "FIRE" | "NO_BET" | "ABSTAIN" | "HUMAN_REVIEW";

export type AbstainReasonCode =
  | "PUBLISHED"
  | "ABSTAINED_ALL_LOW_VALUE"
  | "VOLUME_GOVERNOR_SKIPPED_ALL"
  | "WIDE_CQR_INTERVAL"
  | "PAIR_TOO_CLOSE"
  | "TOO_UNCERTAIN"
  | "INVERSION_IN_ACCURACY_BINS"
  | "SCORE_NOT_CORRELATED_WITH_ACCURACY"
  | "HOSTILE_MARKET"
  | "TRAINING_DISAGREEMENT"
  | "INSTABILITY_GATE_FAILED"
  | "ABSTAIN_HEAD_ACTIVE"
  | "SIGMA_ABOVE_TAU"
  | "REJECTOR_SCORE_ABOVE_THRESHOLD"
  | "RISAN_BAND"
  | "MODEL_DISAGREEMENT"
  | "CONFIG_DISAGREEMENT"
  | "EDGE_BELOW_THRESHOLD"
  | "NO_POSITIVE_RELIABILITY"
  | "DUPLICATE_COMPONENT_DROPPED"
  | "CONFORMAL_RISK_NOT_CONTROLLED"
  | "SUSPICION_ABOVE_THRESHOLD"
  | "CLASS_ERROR_CAP"
  | "HIGH_UNCERTAINTY"
  | "EXPERT_ROUTE"
  | "DISSENT_OUTLIER"
  | "CONCEPT_DRIFT"
  | "METRIC_MISRANKS"
  | "BRIER_ABOVE_CALLER_FLOOR"
  | "CALIBRATION_FLOOR_FAIL"
  | "LOSS_DIFFERENCE_NOT_UNIFORM"
  | "DOMINATES_ON_EVERY_THETA"
  | "ECE_SELECTION_REJECTED"
  | "ECE_SELECTION_INCONCLUSIVE";

/** Common envelope every gate result carries. */
export interface GateResult {
  readonly verdict: GateVerdict;
  readonly reasonCode: AbstainReasonCode;
  /** Non-obvious provenance / caveats. Empty when there are none. */
  readonly notes: readonly string[];
  /**
   * The upstream module's own `ENABLED` flag, when it has one. `false` means
   * the module is not wired into a publish path and activation is a human
   * call -- this bridge does not change it.
   */
  readonly sourceModuleEnabled: boolean | null;
}

/** A gate that resolves a per-item publish vector over a slate. */
export interface SlateGateResult extends GateResult {
  readonly published: readonly boolean[];
  readonly publishedCount: number;
  readonly slateSize: number;
  readonly publishedShare: number;
}

// ===========================================================================
// Shared validation helpers (fail-closed, no imputation)
// ===========================================================================

/** Tolerance on `sum(weights) == 1`. Beyond this we FAIL rather than fix. */
export const WEIGHT_SUM_TOLERANCE = 1e-9;

function finiteProblem(what: string, xs: readonly number[]): string | null {
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (x === undefined || !Number.isFinite(x)) return `${what}[${i}] is not a finite number`;
  }
  return null;
}

function probabilityProblem(what: string, xs: readonly number[]): string | null {
  const f = finiteProblem(what, xs);
  if (f !== null) return f;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i] as number;
    if (x < 0 || x > 1) return `${what}[${i}] = ${x} is outside [0,1]`;
  }
  return null;
}

function nonNegativeProblem(what: string, xs: readonly number[]): string | null {
  const f = finiteProblem(what, xs);
  if (f !== null) return f;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i] as number;
    if (x < 0) return `${what}[${i}] = ${x} is negative`;
  }
  return null;
}

function scalarProblem(what: string, x: number): string | null {
  return Number.isFinite(x) ? null : `${what} is not a finite number`;
}

function unitIntervalProblem(what: string, x: number, lo: number, hi: number): string | null {
  const f = scalarProblem(what, x);
  if (f !== null) return f;
  if (x < lo || x > hi) return `${what} = ${x} is outside [${lo}, ${hi}]`;
  return null;
}

/**
 * Non-negative AND sums to 1. Deliberately does NOT renormalise: a silently
 * rescaled weight vector hides a broken combiner behind a plausible-looking
 * set of weights, which is the exact failure this bridge exists to surface.
 */
function weightVectorProblem(what: string, ws: readonly number[]): string | null {
  if (ws.length === 0) return `${what} is empty -- a weight vector needs at least one member`;
  const neg = nonNegativeProblem(`${what} weight`, ws);
  if (neg !== null) return neg;
  const sum = ws.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(sum)) return `${what} weights do not sum to a finite number`;
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    return (
      `${what} weights sum to ${sum}, not 1 (tolerance ${WEIGHT_SUM_TOLERANCE}). ` +
      `Refusing to renormalise a broken combiner.`
    );
  }
  return null;
}

/** A pooled probability: finite and in [0,1]. Never clamped into range. */
function pooledProbabilityProblem(what: string, p: number): string | null {
  const f = scalarProblem(what, p);
  if (f !== null) return f;
  if (p < 0 || p > 1) {
    return `${what} = ${p} is outside [0,1] -- the kernel returned an impossible probability`;
  }
  return null;
}

/**
 * Kish effective number of members: 1 / sum(w^2). 1 = one member is carrying
 * everything; n = a perfectly even blend. Surfaced so a combiner cannot
 * concentrate silently.
 */
export function effectiveMemberCount(weights: readonly number[]): number {
  const ss = weights.reduce((a, w) => a + w * w, 0);
  if (ss <= 0) return 0;
  return 1 / ss;
}

export interface WeightReport {
  readonly weights: readonly number[];
  readonly sum: number;
  readonly minWeight: number;
  readonly maxWeight: number;
  /** 1 / sum(w^2). */
  readonly effectiveMembers: number;
}

function buildWeightReport(ws: readonly number[]): WeightReport {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const w of ws) {
    if (w < min) min = w;
    if (w > max) max = w;
  }
  return {
    weights: ws,
    sum: ws.reduce((a, b) => a + b, 0),
    minWeight: Number.isFinite(min) ? min : 0,
    maxWeight: Number.isFinite(max) ? max : 0,
    effectiveMembers: effectiveMemberCount(ws),
  };
}

function countTrue(xs: readonly boolean[]): number {
  let n = 0;
  for (const x of xs) if (x) n++;
  return n;
}

function meanOf(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function fmt(x: number, digits = 4): string {
  return Number.isFinite(x) ? x.toFixed(digits) : String(x);
}

// ===========================================================================
// (a) decision/ -- abstention, gate and stake-decision layer
// ===========================================================================

/**
 * Uncertainty-sorted publish filter. Publishes the least-uncertain prefix of
 * the slate; `d = 0` is a legitimate "no bet on anything" answer and is
 * reported as NO_BET, not as a failure to compute.
 */
export function evalUncertaintySortedPublish(input: {
  readonly probs: readonly number[];
  readonly penaltyPerPick: number;
}): DecisionEval<SlateGateResult> {
  const { probs, penaltyPerPick } = input;
  if (!Array.isArray(probs) || probs.length === 0) {
    return fail("probs must be a non-empty array -- an empty slate is not a decision");
  }
  const bad = probabilityProblem("probs", probs);
  if (bad !== null) return fail(bad);
  const pen = scalarProblem("penaltyPerPick", penaltyPerPick);
  if (pen !== null) return fail(pen);
  if (penaltyPerPick < 0) return fail(`penaltyPerPick = ${penaltyPerPick} is negative`);
  try {
    const r = uncertaintySortedPublish([...probs], penaltyPerPick);
    if (r.publish.length !== probs.length) {
      return fail("kernel returned a publish vector of the wrong length");
    }
    if (!Number.isInteger(r.d) || r.d < 0 || r.d > probs.length) {
      return fail(`kernel returned an out-of-range publish count d=${r.d}`);
    }
    const publishedCount = countTrue(r.publish);
    if (publishedCount !== r.d) {
      return fail(`kernel self-inconsistent: d=${r.d} but ${publishedCount} rows published`);
    }
    return {
      ok: true,
      data: {
        verdict: r.d === 0 ? "NO_BET" : "FIRE",
        reasonCode: r.d === 0 ? "ABSTAINED_ALL_LOW_VALUE" : "PUBLISHED",
        notes: [
          "d is the least-uncertain publish count; u = 2*min(p,1-p) is an ambiguity score, not a win rate.",
        ],
        sourceModuleEnabled: null,
        published: [...r.publish],
        publishedCount,
        slateSize: probs.length,
        publishedShare: publishedCount / probs.length,
      },
    };
  } catch (err) {
    return fail(`uncertaintySortedPublish threw: ${errorText(err)}`);
  }
}

/** Weekly board volume governor: skip a fixed share of the most ambiguous games. */
export function evalVolumeGovernor(input: {
  readonly coverProbs: readonly number[];
  readonly delta: number;
}): DecisionEval<SlateGateResult> {
  const { coverProbs, delta } = input;
  if (!Array.isArray(coverProbs) || coverProbs.length === 0) {
    return fail("coverProbs must be a non-empty array");
  }
  const bad = probabilityProblem("coverProbs", coverProbs);
  if (bad !== null) return fail(bad);
  const d = unitIntervalProblem("delta", delta, 0, 1);
  if (d !== null) return fail(d);
  try {
    const r = volumeGovernor([...coverProbs], delta);
    if (r.publish.length !== coverProbs.length) {
      return fail("kernel returned a publish vector of the wrong length");
    }
    if (!Number.isFinite(r.achievedSkipRate) || r.achievedSkipRate < 0 || r.achievedSkipRate > 1) {
      return fail(`kernel returned an impossible achievedSkipRate ${r.achievedSkipRate}`);
    }
    const publishedCount = countTrue(r.publish);
    const notes = [
      `achieved skip rate ${fmt(r.achievedSkipRate)} vs requested delta ${delta}.`,
    ];
    if (Math.abs(r.achievedSkipRate - delta) > 0.03) {
      notes.push("Achieved skip rate is more than 3pp from the requested delta.");
    }
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "NO_BET" : "FIRE",
        reasonCode: publishedCount === 0 ? "VOLUME_GOVERNOR_SKIPPED_ALL" : "PUBLISHED",
        notes,
        sourceModuleEnabled: null,
        published: [...r.publish],
        publishedCount,
        slateSize: coverProbs.length,
        publishedShare: publishedCount / coverProbs.length,
      },
    };
  } catch (err) {
    return fail(`volumeGovernor threw: ${errorText(err)}`);
  }
}

/**
 * CQR variance-gated no-bet. Sigma-hat is the conformal interval WIDTH; the
 * kernel rejects the `round(epsilon * n)` widest intervals.
 */
export function evalCqrVarianceGate(input: {
  readonly widths: readonly number[];
  readonly epsilon: number;
}): DecisionEval<SlateGateResult> {
  const { widths, epsilon } = input;
  if (!Array.isArray(widths) || widths.length === 0) {
    return fail("widths must be a non-empty array -- an empty slate has no quantile band");
  }
  const bad = nonNegativeProblem("widths", widths);
  if (bad !== null) return fail(`${bad} (a conformal interval width cannot be negative)`);
  const e = unitIntervalProblem("epsilon", epsilon, 0, 1);
  if (e !== null) return fail(e);
  try {
    const r = cqrVarianceGate([...widths], epsilon);
    if (r.publish.length !== widths.length) {
      return fail("kernel returned a publish vector of the wrong length");
    }
    if (!Number.isFinite(r.lambdaHat) || r.lambdaHat < 0) {
      return fail(`kernel returned an impossible lambdaHat ${r.lambdaHat}`);
    }
    const publishedCount = countTrue(r.publish);
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "NO_BET" : "FIRE",
        reasonCode: publishedCount === 0 ? "WIDE_CQR_INTERVAL" : "PUBLISHED",
        notes: [
          `lambdaHat (monitoring only) = ${fmt(r.lambdaHat, 6)}; an interval width is a spread, not a probability.`,
        ],
        sourceModuleEnabled: null,
        published: [...r.publish],
        publishedCount,
        slateSize: widths.length,
        publishedShare: publishedCount / widths.length,
      },
    };
  } catch (err) {
    return fail(`cqrVarianceGate threw: ${errorText(err)}`);
  }
}

/**
 * C1/C2 confidence-gate theorem check on a candidate abstention POLICY. The
 * verdict is about the policy, not about a single pick: FIRE means the policy
 * is admissible (no bin inversions and the score correlates with accuracy).
 */
export function evalConfidenceGateCheck(input: {
  readonly bins: readonly AccuracyBin[];
}): DecisionEval<
  GateResult & {
    readonly c1Pass: boolean;
    readonly c2Pass: boolean;
    readonly inversions: number;
    readonly meanScoreSpread: number;
  }
> {
  const { bins } = input;
  if (!Array.isArray(bins) || bins.length < 2) {
    return fail("bins must contain at least 2 score bins -- one bin cannot be monotone-checked");
  }
  const means = bins.map((b) => b.meanScore);
  const accs = bins.map((b) => b.accuracy);
  const ms = finiteProblem("bins.meanScore", means);
  if (ms !== null) return fail(ms);
  const ap = probabilityProblem("bins.accuracy", accs);
  if (ap !== null) return fail(ap);
  for (let i = 0; i < bins.length; i++) {
    const b = bins[i] as AccuracyBin;
    if (!Number.isFinite(b.n) || b.n <= 0) return fail(`bins[${i}].n = ${b.n} must be a positive count`);
  }
  try {
    const r = confidenceGateCheck(bins.map((b) => ({ ...b })));
    if (!Number.isInteger(r.inversions) || r.inversions < 0) {
      return fail(`kernel returned an impossible inversion count ${r.inversions}`);
    }
    return {
      ok: true,
      data: {
        verdict: r.c2Pass && r.c1Pass ? "FIRE" : "NO_BET",
        reasonCode: !r.c2Pass
          ? "INVERSION_IN_ACCURACY_BINS"
          : !r.c1Pass
            ? "SCORE_NOT_CORRELATED_WITH_ACCURACY"
            : "PUBLISHED",
        notes: [
          "Verdict describes the abstention POLICY, not a pick. C2 fails on any bin-wise accuracy inversion.",
        ],
        sourceModuleEnabled: null,
        c1Pass: r.c1Pass,
        c2Pass: r.c2Pass,
        inversions: r.inversions,
        meanScoreSpread: Math.max(...means) - Math.min(...means),
      },
    };
  } catch (err) {
    return fail(`confidenceGateCheck threw: ${errorText(err)}`);
  }
}

/** Pairwise ranking with distance-based abstention. */
export function evalPairwiseRankAbstention(input: {
  readonly featureDistance: number;
  readonly uncertainty: number;
  readonly gamma: number;
  readonly uncertaintyThreshold: number;
}): DecisionEval<GateResult & { readonly reason: "too-close" | "uncertain" | "rank" }> {
  const { featureDistance, uncertainty, gamma, uncertaintyThreshold } = input;
  const checks: Array<[string, number]> = [
    ["featureDistance", featureDistance],
    ["uncertainty", uncertainty],
    ["gamma", gamma],
    ["uncertaintyThreshold", uncertaintyThreshold],
  ];
  for (const [name, value] of checks) {
    const p = scalarProblem(name, value);
    if (p !== null) return fail(p);
    if (value < 0) return fail(`${name} = ${value} must be non-negative`);
  }
  if (uncertaintyThreshold <= 0) {
    return fail(`uncertaintyThreshold = ${uncertaintyThreshold} must be > 0`);
  }
  try {
    const r = pairwiseRankAbstention(featureDistance, uncertainty, gamma, uncertaintyThreshold);
    const published = r.reason === "rank";
    return {
      ok: true,
      data: {
        verdict: published ? "FIRE" : "ABSTAIN",
        reasonCode:
          r.reason === "too-close"
            ? "PAIR_TOO_CLOSE"
            : r.reason === "uncertain"
              ? "TOO_UNCERTAIN"
              : "PUBLISHED",
        notes: [
          "uncertainty is a spread, not a win rate; gamma is a distance in feature space.",
        ],
        sourceModuleEnabled: null,
        reason: r.reason,
      },
    };
  } catch (err) {
    return fail(`pairwiseRankAbstention threw: ${errorText(err)}`);
  }
}

/**
 * Hostile-market no-bet head. `hostileHeadScore` is the linear head pushed
 * through the module's sigmoid: an ORDERING SCORE over hostile-market
 * features, not a calibrated probability that the market is hostile.
 */
export function evalHostileMarketNoBet(input: {
  readonly features: HostileMarketFeatures;
  readonly lambda: number;
  readonly weights?: NoBetHeadWeights;
}): DecisionEval<
  GateResult & {
    readonly hostileHeadScore: number;
    readonly lambda: number;
    readonly lateFactor: number;
  }
> {
  const { features, lambda, weights } = input;
  const lam = unitIntervalProblem("lambda", lambda, 0, 1);
  if (lam !== null) return fail(lam);
  if (features === null || typeof features !== "object") {
    return fail("features must be a HostileMarketFeatures object");
  }
  const featureScalars: Array<[string, number]> = [
    ["lineMoveMagnitude", features.lineMoveMagnitude],
    ["hoursToKickoffAtMove", features.hoursToKickoffAtMove],
    ["newsVolumeAnomaly", features.newsVolumeAnomaly],
    ["oodScore", features.oodScore],
  ];
  for (const [name, value] of featureScalars) {
    const p = scalarProblem(`features.${name}`, value);
    if (p !== null) return fail(p);
  }
  if (features.lineMoveMagnitude < 0) return fail("features.lineMoveMagnitude is negative");
  if (features.hoursToKickoffAtMove < 0) return fail("features.hoursToKickoffAtMove is negative");
  if (features.oodScore < 0 || features.oodScore > 1) {
    return fail(`features.oodScore = ${features.oodScore} is outside [0,1] by contract`);
  }
  if (typeof features.reverseLineMove !== "boolean") {
    return fail("features.reverseLineMove must be a boolean flag");
  }
  try {
    const w = weights ?? defaultNoBetWeights();
    const score = hostileMarketScore(features, w);
    const sp = pooledProbabilityProblem("hostileHeadScore", score);
    if (sp !== null) return fail(sp);
    const noBet = hostileNoBet(score, lambda);
    return {
      ok: true,
      data: {
        verdict: noBet ? "NO_BET" : "FIRE",
        reasonCode: noBet ? "HOSTILE_MARKET" : "PUBLISHED",
        notes: [
          "hostileHeadScore is a sigmoid of a linear feature head: an ordering score, not a calibrated probability.",
          "The module ships ENABLED = false; activation is a human call and this bridge does not change that.",
        ],
        sourceModuleEnabled: false,
        hostileHeadScore: score,
        lambda,
        lateFactor: 1 / (1 + Math.max(features.hoursToKickoffAtMove, 0) / 24),
      },
    };
  } catch (err) {
    return fail(`hostileMarketScore threw: ${errorText(err)}`);
  }
}

// Mirrors DEFAULT_NO_BET_WEIGHTS verbatim so the bridge does not depend on a
// re-exported module constant staying in the barrel.
function defaultNoBetWeights(): NoBetHeadWeights {
  return { wMove: 0.9, wLate: 0.6, wRlm: 0.8, wNews: 0.5, wOod: 0.7, bias: -1.6 };
}

/**
 * Training-dynamics (NNTD) disagreement gate. `suspicionScore` is a
 * disagreement magnitude in probability space, NOT a win rate.
 */
export function evalNntdDisagreementGate(input: {
  readonly pick: SnapshotPick;
  readonly tau: number;
  readonly lateFlipThreshold?: number;
}): DecisionEval<
  GateResult & {
    readonly suspicionScore: number;
    readonly lateWeightedDisagreement: number;
    readonly tau: number;
  }
> {
  const { pick, tau, lateFlipThreshold } = input;
  const t = scalarProblem("tau", tau);
  if (t !== null) return fail(t);
  if (tau < 0) return fail(`tau = ${tau} is negative`);
  if (pick === null || typeof pick !== "object") {
    return fail("pick must be a SnapshotPick object");
  }
  if (!Array.isArray(pick.snapshotProbs) || pick.snapshotProbs.length === 0) {
    return fail(
      "pick.snapshotProbs must be a non-empty array -- no snapshots means no disagreement signal",
    );
  }
  const sp = probabilityProblem("pick.snapshotProbs", pick.snapshotProbs);
  if (sp !== null) return fail(sp);
  const fp = unitIntervalProblem("pick.finalProb", pick.finalProb, 0, 1);
  if (fp !== null) return fail(fp);
  if (typeof pick.finalSide !== "boolean") return fail("pick.finalSide must be a boolean");
  if (typeof pick.won !== "boolean") return fail("pick.won must be a boolean");
  const lm = scalarProblem("pick.lineMoveAgainst", pick.lineMoveAgainst);
  if (lm !== null) return fail(lm);
  if (pick.lineMoveAgainst < 0) return fail("pick.lineMoveAgainst is negative");
  if (typeof pick.id !== "string" || pick.id.length === 0) {
    return fail("pick.id must be a non-empty string");
  }
  if (lateFlipThreshold !== undefined) {
    const lf = unitIntervalProblem("lateFlipThreshold", lateFlipThreshold, 0, 1);
    if (lf !== null) return fail(lf);
  }
  try {
    const disagreement = lateWeightedDisagreement(pick);
    const suspicion = flipLineInteraction(pick, lateFlipThreshold ?? 0.75);
    if (!Number.isFinite(suspicion) || suspicion < 0) {
      return fail(`kernel returned an impossible suspicion score ${suspicion}`);
    }
    const abstain = nntdAbstain(pick, tau);
    return {
      ok: true,
      data: {
        verdict: abstain ? "ABSTAIN" : "FIRE",
        reasonCode: abstain ? "TRAINING_DISAGREEMENT" : "PUBLISHED",
        notes: [
          "suspicionScore blends late-weighted snapshot disagreement with adverse line movement; it is a magnitude, not a probability of losing.",
          "The module ships ENABLED = false; activation is a human call.",
        ],
        sourceModuleEnabled: false,
        suspicionScore: suspicion,
        lateWeightedDisagreement: disagreement,
        tau,
      },
    };
  } catch (err) {
    return fail(`nntd gate threw: ${errorText(err)}`);
  }
}

/**
 * Instability-selection acceptance gate (2508.07556v2): does selecting the
 * LEAST unstable picks beat selecting the most confident picks? `liftPp` is a
 * hit-rate difference in percentage points, not a win rate.
 */
export function evalInstabilityGate(input: {
  readonly instabilities: readonly number[];
  readonly confidences: readonly number[];
  readonly outcomes: readonly (0 | 1)[];
  readonly coverage: number;
}): DecisionEval<
  GateResult & {
    readonly instabilityHitRate: number;
    readonly confidenceHitRate: number;
    readonly liftPp: number;
    readonly pValue: number;
    readonly coverage: number;
  }
> {
  const { instabilities, confidences, outcomes, coverage } = input;
  if (instabilities.length === 0) return fail("instabilities must be non-empty");
  if (instabilities.length !== confidences.length || instabilities.length !== outcomes.length) {
    return fail("instabilities / confidences / outcomes must be the same length");
  }
  const iv = nonNegativeProblem("instabilities", instabilities);
  if (iv !== null) return fail(iv);
  const cv = unitIntervalProblem("confidences[0]", confidences[0] ?? 0, 0, 1);
  if (cv !== null) return fail(`${cv} -- a confidence here is a score, but it must lie in [0,1]`);
  const cvAll = probabilityProblem("confidences", confidences);
  if (cvAll !== null) {
    return fail(`${cvAll} -- a confidence here is a score, but it must lie in [0,1]`);
  }
  for (let i = 0; i < outcomes.length; i++) {
    const o = outcomes[i];
    if (o !== 0 && o !== 1) return fail(`outcomes[${i}] must be 0|1`);
  }
  const c = unitIntervalProblem("coverage", coverage, 0, 1);
  if (c !== null) return fail(c);
  try {
    const g = instabilityGatePasses([...instabilities], [...confidences], [...outcomes], coverage);
    for (const pair of [
      ["instabilityHitRate", g.instabilityHitRate],
      ["confidenceHitRate", g.confidenceHitRate],
      ["liftPp", g.liftPp],
      ["pValue", g.pValue],
    ] as Array<[string, number]>) {
      if (!Number.isFinite(pair[1])) return fail(`kernel returned a non-finite ${pair[0]}`);
    }
    if (g.pValue < 0 || g.pValue > 1) return fail(`kernel returned pValue ${g.pValue} outside [0,1]`);
    return {
      ok: true,
      data: {
        verdict: g.passes ? "HUMAN_REVIEW" : "NO_BET",
        reasonCode: g.passes ? "PUBLISHED" : "INSTABILITY_GATE_FAILED",
        notes: [
          "A passing mechanical gate still needs a human call: the module ships ENABLED = false.",
          "liftPp is a hit-rate difference in percentage points, not a win rate.",
        ],
        sourceModuleEnabled: false,
        instabilityHitRate: g.instabilityHitRate,
        confidenceHitRate: g.confidenceHitRate,
        liftPp: g.liftPp,
        pValue: g.pValue,
        coverage,
      },
    };
  } catch (err) {
    return fail(`instabilityGatePasses threw: ${errorText(err)}`);
  }
}

/** NotWrong abstention head for cover/no-cover classification. */
export function evalCoverAbstentionHead(input: {
  readonly outputs: readonly CoverHeadOutputs[];
  readonly targetPublishFraction: number;
  readonly realizedCovered?: readonly boolean[];
}): DecisionEval<
  SlateGateResult & {
    readonly tau: number;
    readonly coveredAccuracy: number | null;
    readonly sides: readonly ("cover" | "no-cover")[];
  }
> {
  const { outputs, targetPublishFraction, realizedCovered } = input;
  if (!Array.isArray(outputs) || outputs.length === 0) {
    return fail("outputs must be a non-empty array of cover-head outputs");
  }
  for (let i = 0; i < outputs.length; i++) {
    const o = outputs[i] as CoverHeadOutputs;
    const pc = unitIntervalProblem(`outputs[${i}].pCover`, o.pCover, 0, 1);
    if (pc !== null) return fail(pc);
    const pn = unitIntervalProblem(`outputs[${i}].pNoCover`, o.pNoCover, 0, 1);
    if (pn !== null) return fail(pn);
    const pa = unitIntervalProblem(`outputs[${i}].pAbstain`, o.pAbstain, 0, 1);
    if (pa !== null) return fail(pa);
    const total = o.pCover + o.pNoCover + o.pAbstain;
    if (Math.abs(total - 1) > 1e-6) {
      return fail(`outputs[${i}] head probabilities sum to ${total}, not 1 -- the head is not normalised`);
    }
  }
  const f = unitIntervalProblem("targetPublishFraction", targetPublishFraction, 0, 1);
  if (f !== null) return fail(f);
  if (realizedCovered !== undefined) {
    if (realizedCovered.length !== outputs.length) {
      return fail("realizedCovered must be the same length as outputs when supplied");
    }
    for (let i = 0; i < realizedCovered.length; i++) {
      if (typeof realizedCovered[i] !== "boolean") {
        return fail(`realizedCovered[${i}] must be a boolean`);
      }
    }
  }
  try {
    const rows = outputs.map((o) => ({ ...o }));
    const tau = calibrateAbstainTau(rows, targetPublishFraction);
    if (!Number.isFinite(tau) || tau < 0 || tau > 1) {
      return fail(`kernel returned an impossible tau ${tau}`);
    }
    const published = rows.map((o) => o.pAbstain < tau);
    const publishedCount = countTrue(published);
    let acc: number | null = null;
    if (realizedCovered !== undefined) {
      acc = coveredAccuracy(rows, [...realizedCovered], tau);
      if (!Number.isFinite(acc) || acc < 0 || acc > 1) {
        return fail(`kernel returned an impossible coveredAccuracy ${acc}`);
      }
    }
    const sides = rows.map((o) => coverPrediction(o));
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "ABSTAIN" : "FIRE",
        reasonCode: publishedCount === 0 ? "ABSTAIN_HEAD_ACTIVE" : "PUBLISHED",
        notes: [
          "pAbstain is a class posterior over {cover, no-cover, abstain}, not a win rate for either side.",
          "The module ships ENABLED = false; activation is a human call.",
        ],
        sourceModuleEnabled: false,
        published,
        publishedCount,
        slateSize: outputs.length,
        publishedShare: publishedCount / outputs.length,
        tau,
        coveredAccuracy: acc,
        sides,
      },
    };
  } catch (err) {
    return fail(`cover abstention head threw: ${errorText(err)}`);
  }
}

/** Sigma-head abstention for totals regression. Sigma is a spread in points. */
export function evalTotalsAbstentionSigma(input: {
  readonly sigmas: readonly number[];
  readonly validationSigmas: readonly number[];
  readonly targetPublishFraction: number;
  readonly calibration?: {
    readonly ys: readonly number[];
    readonly mus: readonly number[];
    readonly sigmas: readonly number[];
  };
  readonly baselineMae?: number;
  readonly abstainMae?: number;
}): DecisionEval<
  SlateGateResult & {
    readonly tau: number;
    readonly sigmaCalibration: { readonly mean: number; readonly std: number };
    readonly gatePasses: boolean | null;
  }
> {
  const { sigmas, validationSigmas, targetPublishFraction, calibration, baselineMae, abstainMae } =
    input;
  if (!Array.isArray(sigmas) || sigmas.length === 0) return fail("sigmas must be non-empty");
  if (!Array.isArray(validationSigmas) || validationSigmas.length === 0) {
    return fail(
      "validationSigmas must be non-empty -- tau is the validation quantile; a sigma cut with no reference window is a guess",
    );
  }
  const sv = nonNegativeProblem("sigmas", sigmas);
  if (sv !== null) return fail(sv);
  for (let i = 0; i < sigmas.length; i++) {
    if ((sigmas[i] as number) <= 0) return fail(`sigmas[${i}] = ${sigmas[i]} must be > 0`);
  }
  const vv = nonNegativeProblem("validationSigmas", validationSigmas);
  if (vv !== null) return fail(vv);
  const f = unitIntervalProblem("targetPublishFraction", targetPublishFraction, 0, 1);
  if (f !== null) return fail(f);
  let calib: { mean: number; std: number } | null = null;
  if (calibration !== undefined) {
    const { ys, mus, sigmas: cs } = calibration;
    if (ys.length === 0) return fail("calibration.ys must be non-empty");
    if (ys.length !== mus.length || ys.length !== cs.length) {
      return fail("calibration ys / mus / sigmas must be the same length");
    }
    const cp = nonNegativeProblem("calibration.sigmas", cs);
    if (cp !== null) return fail(cp);
    const my = finiteProblem("calibration.ys", ys);
    if (my !== null) return fail(my);
    const mm = finiteProblem("calibration.mus", mus);
    if (mm !== null) return fail(mm);
    calib = sigmaCalibration([...ys], [...mus], [...cs]);
  }
  let gatePasses: boolean | null = null;
  if (calib !== null && baselineMae !== undefined && abstainMae !== undefined) {
    const b = scalarProblem("baselineMae", baselineMae);
    if (b !== null) return fail(b);
    const a = scalarProblem("abstainMae", abstainMae);
    if (a !== null) return fail(a);
    if (baselineMae < 0 || abstainMae < 0) return fail("MAE values must be non-negative");
    gatePasses = totalsAbstentionGatePasses(baselineMae, abstainMae, calib.mean, calib.std);
  }
  try {
    const tau = recalibrateTau([...validationSigmas], targetPublishFraction);
    if (!Number.isFinite(tau) || tau <= 0) return fail(`kernel returned an impossible tau ${tau}`);
    const published = sigmas.map((s) => totalsPublishRule(s, tau));
    const publishedCount = countTrue(published);
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "ABSTAIN" : "FIRE",
        reasonCode: publishedCount === 0 ? "SIGMA_ABOVE_TAU" : "PUBLISHED",
        notes: [
          "sigma is a predictive spread in total points; tau is the validation quantile at the target publish fraction.",
          "The module ships ENABLED = false; activation is a human call.",
        ],
        sourceModuleEnabled: false,
        published,
        publishedCount,
        slateSize: sigmas.length,
        publishedShare: publishedCount / sigmas.length,
        tau,
        sigmaCalibration: calib ?? { mean: 0, std: 1 },
        gatePasses,
      },
    };
  } catch (err) {
    return fail(`totals abstention threw: ${errorText(err)}`);
  }
}

/** Two-stage score-based rejector with an abstention-cost-aware loss. */
export function evalRejectorHeads(input: {
  readonly rejectorScores: readonly number[];
  readonly targetNoBetRate: number;
  readonly wrong?: readonly boolean[];
  readonly abstentionCost?: number;
}): DecisionEval<
  SlateGateResult & {
    readonly threshold: number;
    readonly loss: number | null;
  }
> {
  const { rejectorScores, targetNoBetRate, wrong, abstentionCost } = input;
  if (!Array.isArray(rejectorScores) || rejectorScores.length === 0) {
    return fail("rejectorScores must be non-empty -- an empty slate has no rejector to run");
  }
  const sv = finiteProblem("rejectorScores", rejectorScores);
  if (sv !== null) return fail(sv);
  const r = unitIntervalProblem("targetNoBetRate", targetNoBetRate, 0, 1);
  if (r !== null) return fail(r);
  if (wrong !== undefined) {
    if (wrong.length !== rejectorScores.length) return fail("wrong must align with rejectorScores");
    for (let i = 0; i < wrong.length; i++) {
      if (typeof wrong[i] !== "boolean") return fail(`wrong[${i}] must be a boolean`);
    }
    const cost = abstentionCost ?? 0.02;
    const cp = scalarProblem("abstentionCost", cost);
    if (cp !== null) return fail(cp);
    if (cost < 0) return fail(`abstentionCost = ${cost} is negative`);
  }
  try {
    const res = twoStageRejector([...rejectorScores], targetNoBetRate);
    if (res.accepted.length !== rejectorScores.length) {
      return fail("kernel returned an accept vector of the wrong length");
    }
    if (Number.isNaN(res.threshold)) {
      return fail("kernel returned a NaN threshold");
    }
    // +-Infinity thresholds are legitimate (rate 0 -> publish all, rate 1 -> reject all).
    const published = res.accepted.map((a) => a);
    const publishedCount = countTrue(published);
    let loss: number | null = null;
    if (wrong !== undefined) {
      loss = abstentionLoss([...res.accepted], [...wrong], abstentionCost ?? 0.02);
      if (!Number.isFinite(loss) || loss < 0) {
        return fail(`kernel returned an impossible loss ${loss}`);
      }
    }
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "NO_BET" : "FIRE",
        reasonCode: publishedCount === 0 ? "REJECTOR_SCORE_ABOVE_THRESHOLD" : "PUBLISHED",
        notes: [
          "Higher rejector score = more likely wrong. The score is a misclassification detector output, not a win rate.",
        ],
        sourceModuleEnabled: null,
        published,
        publishedCount,
        slateSize: rejectorScores.length,
        publishedShare: publishedCount / rejectorScores.length,
        threshold: res.threshold,
        loss,
      },
    };
  } catch (err) {
    return fail(`twoStageRejector threw: ${errorText(err)}`);
  }
}

/** Predictor-rejector cascade with publish / human-review / hard-no-bet tiers. */
export function evalPredictorRejectorCascade(input: {
  readonly rejectorScores: readonly number[];
  readonly reviewFraction: number;
  readonly noBetFraction: number;
}): DecisionEval<
  GateResult & {
    readonly tiers: readonly DeferralTier[];
    readonly tierCounts: Readonly<Record<DeferralTier, number>>;
    readonly publishCut: number;
    readonly reviewCut: number;
  }
> {
  const { rejectorScores, reviewFraction, noBetFraction } = input;
  if (!Array.isArray(rejectorScores) || rejectorScores.length === 0) {
    return fail("rejectorScores must be non-empty");
  }
  const sv = finiteProblem("rejectorScores", rejectorScores);
  if (sv !== null) return fail(sv);
  const rf = unitIntervalProblem("reviewFraction", reviewFraction, 0, 1);
  if (rf !== null) return fail(rf);
  const nf = unitIntervalProblem("noBetFraction", noBetFraction, 0, 1);
  if (nf !== null) return fail(nf);
  if (reviewFraction + noBetFraction > 1 + 1e-12) {
    return fail(
      `reviewFraction (${reviewFraction}) + noBetFraction (${noBetFraction}) exceeds 1 -- the tiers would overlap`,
    );
  }
  try {
    const res = predictorRejectorCascade([...rejectorScores], reviewFraction, noBetFraction);
    if (res.tiers.length !== rejectorScores.length) {
      return fail("kernel returned a tier vector of the wrong length");
    }
    const tierCounts: Record<DeferralTier, number> = {
      publish: 0,
      "human-review": 0,
      "hard-no-bet": 0,
    };
    for (const t of res.tiers) tierCounts[t] += 1;
    const verdict: GateVerdict =
      tierCounts.publish === 0
        ? "NO_BET"
        : tierCounts["human-review"] > 0
          ? "HUMAN_REVIEW"
          : "FIRE";
    return {
      ok: true,
      data: {
        verdict,
        reasonCode:
          tierCounts.publish === 0
            ? "REJECTOR_SCORE_ABOVE_THRESHOLD"
            : tierCounts["human-review"] > 0
              ? "TOO_UNCERTAIN"
              : "PUBLISHED",
        notes: [
          "human-review rows are deferred, not dropped: they leave the publish lane and wait for a human.",
        ],
        sourceModuleEnabled: null,
        tiers: [...res.tiers],
        tierCounts,
        publishCut: res.publishCut,
        reviewCut: res.reviewCut,
      },
    };
  } catch (err) {
    return fail(`predictorRejectorCascade threw: ${errorText(err)}`);
  }
}

/**
 * RISAN instance-specific abstention over a card. `margin` is signed model
 * confidence y*f(x); the abstention band widens when the market disagrees.
 */
export function evalRisanInstanceAbstention(input: {
  readonly picks: readonly RisanPick[];
  readonly cardSize: number;
  readonly globalGateHitRate?: number;
  readonly risanNoisyHitRate?: number;
  readonly globalNoisyHitRate?: number;
  readonly sensitivity?: number;
}): DecisionEval<
  GateResult & {
    readonly published: readonly boolean[];
    readonly publishedCount: number;
    readonly acceptedHitRate: number;
    readonly gatePasses: boolean | null;
    readonly rhos: readonly number[];
  }
> {
  const { picks, cardSize, globalGateHitRate, risanNoisyHitRate, globalNoisyHitRate, sensitivity } =
    input;
  if (!Array.isArray(picks) || picks.length === 0) return fail("picks must be non-empty");
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i] as RisanPick;
    if (typeof p.id !== "string" || p.id.length === 0) {
      return fail(`picks[${i}].id must be a non-empty string`);
    }
    const m = scalarProblem(`picks[${i}].margin`, p.margin);
    if (m !== null) return fail(m);
    const r = scalarProblem(`picks[${i}].baseRho`, p.baseRho);
    if (r !== null) return fail(r);
    if (p.baseRho < 0) return fail(`picks[${i}].baseRho is negative`);
    const d = scalarProblem(`picks[${i}].lineDisagreement`, p.lineDisagreement);
    if (d !== null) return fail(d);
    if (p.lineDisagreement < 0) return fail(`picks[${i}].lineDisagreement is negative`);
    if (typeof p.won !== "boolean") return fail(`picks[${i}].won must be a boolean`);
  }
  const cs = scalarProblem("cardSize", cardSize);
  if (cs !== null) return fail(cs);
  if (cardSize <= 0) return fail(`cardSize = ${cardSize} must be > 0`);
  const sens = sensitivity ?? 0.35;
  const sp = scalarProblem("sensitivity", sens);
  if (sp !== null) return fail(sp);
  if (globalGateHitRate !== undefined) {
    const p = unitIntervalProblem("globalGateHitRate", globalGateHitRate, 0, 1);
    if (p !== null) return fail(p);
  }
  if (risanNoisyHitRate !== undefined) {
    const p = unitIntervalProblem("risanNoisyHitRate", risanNoisyHitRate, 0, 1);
    if (p !== null) return fail(p);
  }
  if (globalNoisyHitRate !== undefined) {
    const p = unitIntervalProblem("globalNoisyHitRate", globalNoisyHitRate, 0, 1);
    if (p !== null) return fail(p);
  }
  try {
    const rhos = picks.map((p) => marketConditionedRho(p.baseRho, p.lineDisagreement, sens));
    for (let i = 0; i < rhos.length; i++) {
      const r = rhos[i] as number;
      if (!Number.isFinite(r) || r < 0) return fail(`kernel returned an impossible rho ${r}`);
    }
    const published = picks.map((p, i) => risanPublish(p.margin, rhos[i] as number));
    const publishedCount = countTrue(published);
    const hit = risanAcceptedHitRate(
      picks.map((p) => ({ ...p })),
      Math.round(cardSize),
      sens,
    );
    if (!Number.isFinite(hit) || hit < 0 || hit > 1) {
      return fail(`kernel returned an impossible hit rate ${hit}`);
    }
    let gatePasses: boolean | null = null;
    if (
      globalGateHitRate !== undefined &&
      risanNoisyHitRate !== undefined &&
      globalNoisyHitRate !== undefined
    ) {
      gatePasses = risanGatePasses(hit, globalGateHitRate, risanNoisyHitRate, globalNoisyHitRate);
    }
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "ABSTAIN" : "FIRE",
        reasonCode: publishedCount === 0 ? "RISAN_BAND" : "PUBLISHED",
        notes: [
          "margin is signed model confidence, not a win rate; rho is an abstention half-width in the same units.",
          "The module ships ENABLED = false; activation is a human call.",
        ],
        sourceModuleEnabled: false,
        published,
        publishedCount,
        acceptedHitRate: hit,
        gatePasses,
        rhos,
      },
    };
  } catch (err) {
    return fail(`RISAN bridge threw: ${errorText(err)}`);
  }
}

/** Binomial majority gate over seed-varied models. */
export function evalBinomialMajorityGate(input: {
  readonly votes: readonly boolean[];
  readonly alpha: number;
}): DecisionEval<
  GateResult & {
    readonly majority: boolean;
    readonly pValue: number;
    readonly votesFor: number;
  }
> {
  const { votes, alpha } = input;
  if (!Array.isArray(votes) || votes.length === 0) {
    return fail("votes must be non-empty -- with no members there is no majority to test");
  }
  for (let i = 0; i < votes.length; i++) {
    if (typeof votes[i] !== "boolean") return fail(`votes[${i}] must be a boolean`);
  }
  const a = unitIntervalProblem("alpha", alpha, 0, 1);
  if (a !== null) return fail(a);
  try {
    const r = binomialMajorityGate([...votes], alpha);
    if (!Number.isFinite(r.pValue) || r.pValue < 0 || r.pValue > 1) {
      return fail(`kernel returned an impossible pValue ${r.pValue}`);
    }
    return {
      ok: true,
      data: {
        verdict: r.publish ? "FIRE" : "ABSTAIN",
        reasonCode: r.publish ? "PUBLISHED" : "MODEL_DISAGREEMENT",
        notes: [
          "pValue is the one-sided binomial tail P(X >= max(k, n-k)) under p = 0.5 -- a consistency test, not a win probability.",
        ],
        sourceModuleEnabled: null,
        majority: r.majority,
        pValue: r.pValue,
        votesFor: votes.filter(Boolean).length,
      },
    };
  } catch (err) {
    return fail(`binomialMajorityGate threw: ${errorText(err)}`);
  }
}

/** Agreement gate as a reject option across two engine configurations. */
export function evalAgreementGate(input: {
  readonly sideA: "home" | "away";
  readonly sideB: "home" | "away";
  readonly edgeA: number;
  readonly edgeB: number;
  readonly edgeThreshold: number;
}): DecisionEval<GateResult & { readonly kernelReason: string }> {
  const { sideA, sideB, edgeA, edgeB, edgeThreshold } = input;
  if (sideA !== "home" && sideA !== "away") return fail(`sideA = ${sideA} is not "home"|"away"`);
  if (sideB !== "home" && sideB !== "away") return fail(`sideB = ${sideB} is not "home"|"away"`);
  for (const pair of [
    ["edgeA", edgeA],
    ["edgeB", edgeB],
    ["edgeThreshold", edgeThreshold],
  ] as Array<[string, number]>) {
    const p = scalarProblem(pair[0], pair[1]);
    if (p !== null) return fail(p);
  }
  try {
    const r = agreementGate(sideA, sideB, edgeA, edgeB, edgeThreshold);
    return {
      ok: true,
      data: {
        verdict: r.postable ? "FIRE" : "NO_BET",
        reasonCode: r.postable
          ? "PUBLISHED"
          : r.reason === "config-disagreement"
            ? "CONFIG_DISAGREEMENT"
            : "EDGE_BELOW_THRESHOLD",
        notes: ["edge is a model-vs-market edge; it is not itself a probability."],
        sourceModuleEnabled: null,
        kernelReason: r.reason,
      },
    };
  } catch (err) {
    return fail(`agreementGate threw: ${errorText(err)}`);
  }
}

/**
 * Expert-disagreement no-bet rule. `pooledExpertProbability` is a
 * Brier-reciprocal-weighted mean of member probabilities -- a pooled forecast,
 * not a calibrated win rate, and it is named as such.
 */
export function evalDisagreementNoBet(input: {
  readonly expertProbs: readonly number[];
  readonly recentBriers: readonly number[];
  readonly tau: number;
}): DecisionEval<
  GateResult & {
    readonly pooledExpertProbability: number;
    readonly noBetProbability: number;
  }
> {
  const { expertProbs, recentBriers, tau } = input;
  if (!Array.isArray(expertProbs) || expertProbs.length === 0) {
    return fail("expertProbs must be non-empty");
  }
  if (expertProbs.length !== recentBriers.length) {
    return fail("expertProbs and recentBriers must be the same length");
  }
  const ep = probabilityProblem("expertProbs", expertProbs);
  if (ep !== null) return fail(ep);
  const rb = nonNegativeProblem("recentBriers", recentBriers);
  if (rb !== null) return fail(`${rb}; a Brier score is non-negative`);
  const t = unitIntervalProblem("tau", tau, 0, 1);
  if (t !== null) return fail(t);
  try {
    const r = disagreementNoBet([...expertProbs], [...recentBriers], tau);
    const pp = pooledProbabilityProblem("pooledExpertProbability", r.pStar);
    if (pp !== null) return fail(pp);
    const nb = pooledProbabilityProblem("noBetProbability", r.noBetProb);
    if (nb !== null) return fail(nb);
    return {
      ok: true,
      data: {
        verdict: r.publish ? "FIRE" : "NO_BET",
        reasonCode: r.publish ? "PUBLISHED" : "MODEL_DISAGREEMENT",
        notes: [
          "pooledExpertProbability is a weighted mean of member probabilities (a pooled forecast), not a calibrated win rate.",
          "The publish rule is the module's own alpha = 2(1 - p*) heuristic; the bridge does not re-threshold it.",
        ],
        sourceModuleEnabled: null,
        pooledExpertProbability: r.pStar,
        noBetProbability: r.noBetProb,
      },
    };
  } catch (err) {
    return fail(`disagreementNoBet threw: ${errorText(err)}`);
  }
}

/** Precision-weighted / average-prior forecast aggregation across experts. */
export function evalPrecisionWeightedAggregate(input: {
  readonly probs: readonly number[];
  readonly baseRate?: number;
  readonly correlatedWithoutPrior?: boolean;
}): DecisionEval<
  GateResult & {
    readonly pooledProbability: number;
    readonly scheme: "precision" | "average-prior" | "single-expert";
    readonly memberCount: number;
  }
> {
  const { probs, baseRate, correlatedWithoutPrior } = input;
  if (!Array.isArray(probs) || probs.length === 0) return fail("probs must be non-empty");
  const pp = probabilityProblem("probs", probs);
  if (pp !== null) return fail(pp);
  if (baseRate !== undefined) {
    const b = unitIntervalProblem("baseRate", baseRate, 1e-9, 1 - 1e-9);
    if (b !== null) return fail(b);
  }
  if (correlatedWithoutPrior !== undefined && typeof correlatedWithoutPrior !== "boolean") {
    return fail("correlatedWithoutPrior must be a boolean flag");
  }
  try {
    const r = precisionWeightedAggregate([...probs], baseRate, correlatedWithoutPrior ?? false);
    const ap = pooledProbabilityProblem("pooledProbability", r.aggregate);
    if (ap !== null) return fail(ap);
    return {
      ok: true,
      data: {
        verdict: "FIRE",
        reasonCode: "PUBLISHED",
        notes: [
          `scheme = ${r.scheme}.`,
          r.scheme === "single-expert"
            ? "Guardrail fired: correlated experts with no base rate are NOT averaged; the module returns one member verbatim."
            : "pooledProbability is a pooled forecast. It is not a calibrated win rate and must not be shown as one.",
        ],
        sourceModuleEnabled: null,
        pooledProbability: r.aggregate,
        scheme: r.scheme,
        memberCount: probs.length,
      },
    };
  } catch (err) {
    return fail(`precisionWeightedAggregate threw: ${errorText(err)}`);
  }
}

/**
 * Crowdsourced reject option. The kernel returns UNNORMALISED reliability
 * weights (they sum to the winner mass, not to 1), so the bridge validates
 * non-negativity on the raw vector and reports a separately-labelled
 * normalised view rather than pretending the raw one sums to 1.
 */
export function evalCrowdsourcedReject(input: {
  readonly members: readonly EnsembleMember[];
  readonly memberPicks: readonly boolean[];
}): DecisionEval<
  GateResult & {
    readonly aggregate: boolean;
    readonly reliabilityWeights: readonly number[];
    readonly normalisedWeights: readonly number[];
    readonly weightReport: WeightReport;
    readonly spammerCount: number;
  }
> {
  const { members, memberPicks } = input;
  if (!Array.isArray(members) || members.length === 0) return fail("members must be non-empty");
  if (memberPicks.length !== members.length) return fail("memberPicks must align with members");
  let spammerCount = 0;
  for (let i = 0; i < members.length; i++) {
    const m = members[i] as EnsembleMember;
    for (const pair of [
      ["abstentionRate", m.abstentionRate],
      ["hitRateGivenPick", m.hitRateGivenPick],
      ["slatePicks", m.slatePicks],
    ] as Array<[string, number]>) {
      const p = scalarProblem(`members[${i}].${pair[0]}`, pair[1]);
      if (p !== null) return fail(p);
    }
    if (m.abstentionRate < 0 || m.abstentionRate > 1) {
      return fail(`members[${i}].abstentionRate = ${m.abstentionRate} is outside [0,1]`);
    }
    if (m.hitRateGivenPick < 0 || m.hitRateGivenPick > 1) {
      return fail(`members[${i}].hitRateGivenPick = ${m.hitRateGivenPick} is outside [0,1]`);
    }
    if (m.slatePicks < 0) return fail(`members[${i}].slatePicks is negative`);
    if (m.abstentionRate < 0.05 && Math.abs(m.hitRateGivenPick - 0.5) < 0.03) spammerCount++;
  }
  for (let i = 0; i < memberPicks.length; i++) {
    if (typeof memberPicks[i] !== "boolean") return fail(`memberPicks[${i}] must be a boolean`);
  }
  try {
    const r = crowdsourcedReject(
      members.map((m) => ({ ...m })),
      [...memberPicks],
    );
    if (r.weights.length !== members.length) {
      return fail("kernel returned a weight vector of the wrong length");
    }
    const nb = nonNegativeProblem("reliabilityWeights", r.weights);
    if (nb !== null) return fail(`${nb}; a reliability weight cannot be negative`);
    const sum = r.weights.reduce((a, b) => a + b, 0);
    const normalised = sum > 0 ? r.weights.map((w) => w / sum) : r.weights.map(() => 0);
    if (sum > 0) {
      const bad = weightVectorProblem("normalised reliability", normalised);
      if (bad !== null) return fail(bad);
    }
    return {
      ok: true,
      data: {
        verdict: r.aggregate ? "FIRE" : "NO_BET",
        reasonCode: r.aggregate ? "PUBLISHED" : "NO_POSITIVE_RELIABILITY",
        notes: [
          "reliabilityWeights are the kernel's raw (unnormalised) reliability scores; normalisedWeights are the view that sums to 1.",
          "Members flagged as spammers are discounted 4x by the kernel.",
        ],
        sourceModuleEnabled: null,
        aggregate: r.aggregate,
        reliabilityWeights: [...r.weights],
        normalisedWeights: normalised,
        weightReport: buildWeightReport(normalised),
        spammerCount,
      },
    };
  } catch (err) {
    return fail(`crowdsourcedReject threw: ${errorText(err)}`);
  }
}

/** Injectivity audit: drop members that are byte-identical duplicates. */
export function evalInjectivityAudit(input: {
  readonly componentEvidence: readonly (readonly number[])[];
}): DecisionEval<
  GateResult & {
    readonly keptIndices: readonly number[];
    readonly droppedIndices: readonly number[];
  }
> {
  const { componentEvidence } = input;
  if (!Array.isArray(componentEvidence) || componentEvidence.length === 0) {
    return fail("componentEvidence must be non-empty");
  }
  for (let i = 0; i < componentEvidence.length; i++) {
    const row = componentEvidence[i] as readonly number[];
    if (row.length === 0) return fail(`componentEvidence[${i}] is empty`);
    const p = finiteProblem(`componentEvidence[${i}]`, row);
    if (p !== null) return fail(p);
  }
  try {
    const kept = injectivityAudit(componentEvidence.map((r) => [...r]));
    const keptSet = new Set(kept);
    const dropped: number[] = [];
    for (let i = 0; i < componentEvidence.length; i++) if (!keptSet.has(i)) dropped.push(i);
    if (kept.length === 0) {
      return fail("audit kept zero components -- the whole ensemble is one duplicate");
    }
    return {
      ok: true,
      data: {
        verdict: dropped.length > 0 ? "HUMAN_REVIEW" : "FIRE",
        reasonCode: dropped.length > 0 ? "DUPLICATE_COMPONENT_DROPPED" : "PUBLISHED",
        notes: [
          "Duplicated evidence inflates an average; the audit drops byte-identical members before any pooling happens.",
        ],
        sourceModuleEnabled: null,
        keptIndices: kept,
        droppedIndices: dropped,
      },
    };
  } catch (err) {
    return fail(`injectivityAudit threw: ${errorText(err)}`);
  }
}

/** Conformal risk control on the posted card. */
export function evalConformalRiskControl(input: {
  readonly calibrationEdges: readonly number[];
  readonly calibrationOutcomes: readonly boolean[];
  readonly alpha: number;
}): DecisionEval<
  SlateGateResult & {
    readonly lambdaHat: number;
    readonly empiricalLossRate: number;
    readonly alpha: number;
  }
> {
  const { calibrationEdges, calibrationOutcomes, alpha } = input;
  if (!Array.isArray(calibrationEdges) || calibrationEdges.length === 0) {
    return fail(
      "calibrationEdges must be non-empty -- a conformal cut with no calibration window is a guess",
    );
  }
  if (calibrationEdges.length !== calibrationOutcomes.length) {
    return fail("calibrationEdges and calibrationOutcomes must be the same length");
  }
  const ep = finiteProblem("calibrationEdges", calibrationEdges);
  if (ep !== null) return fail(ep);
  for (let i = 0; i < calibrationOutcomes.length; i++) {
    if (typeof calibrationOutcomes[i] !== "boolean") {
      return fail(`calibrationOutcomes[${i}] must be a boolean`);
    }
  }
  const a = unitIntervalProblem("alpha", alpha, 0, 1);
  if (a !== null) return fail(a);
  try {
    const r = conformalRiskControl([...calibrationEdges], [...calibrationOutcomes], alpha);
    if (r.posted.length !== calibrationEdges.length) {
      return fail("kernel returned a posted vector of the wrong length");
    }
    if (!Number.isFinite(r.empiricalLoss) || r.empiricalLoss < 0 || r.empiricalLoss > 1) {
      return fail(`kernel returned an impossible empiricalLoss ${r.empiricalLoss}`);
    }
    const publishedCount = countTrue(r.posted);
    const controlled = Number.isFinite(r.lambdaHat) && r.empiricalLoss <= alpha;
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "NO_BET" : controlled ? "FIRE" : "NO_BET",
        reasonCode:
          publishedCount === 0 || !controlled ? "CONFORMAL_RISK_NOT_CONTROLLED" : "PUBLISHED",
        notes: [
          `lambdaHat = ${r.lambdaHat}; empirical loss rate ${fmt(r.empiricalLoss)} vs alpha ${alpha}.`,
          "lambdaHat = Infinity means no edge cut on this window met the risk level: a legitimate no-bet, not a failure.",
        ],
        sourceModuleEnabled: null,
        published: [...r.posted],
        publishedCount,
        slateSize: calibrationEdges.length,
        publishedShare: publishedCount / calibrationEdges.length,
        lambdaHat: r.lambdaHat,
        empiricalLossRate: r.empiricalLoss,
        alpha,
      },
    };
  } catch (err) {
    return fail(`conformalRiskControl threw: ${errorText(err)}`);
  }
}

const KNOWN_REGIMES: readonly string[] = ["divisional", "non-divisional", "weather", "short-week"];

/** ROC-tuned dual-threshold conformal abstention against the fixed-70% baseline. */
export function evalDualThresholdConformal(input: {
  readonly holdout: readonly ConformalPick[];
  readonly liveSlate: readonly ConformalPick[];
  readonly alpha: number;
}): DecisionEval<
  SlateGateResult & {
    readonly qConf: number;
    readonly qAbs: number;
    readonly coverage: number;
    readonly roi: number;
    readonly fixed70Coverage: number;
    readonly fixed70Roi: number;
    readonly gatePasses: boolean;
  }
> {
  const { holdout, liveSlate, alpha } = input;
  if (!Array.isArray(holdout) || holdout.length === 0) {
    return fail("holdout must be non-empty -- thresholds fitted on nothing are not thresholds");
  }
  if (!Array.isArray(liveSlate) || liveSlate.length === 0) return fail("liveSlate must be non-empty");
  for (const pair of [
    ["holdout", holdout],
    ["liveSlate", liveSlate],
  ] as Array<[string, readonly ConformalPick[]]>) {
    const label = pair[0];
    const rows = pair[1];
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i] as ConformalPick;
      if (typeof p.id !== "string" || p.id.length === 0) {
        return fail(`${label}[${i}].id must be a non-empty string`);
      }
      if (!KNOWN_REGIMES.includes(p.regime)) {
        return fail(`${label}[${i}].regime = ${p.regime} is not a known regime`);
      }
      const c = scalarProblem(`${label}[${i}].conformity`, p.conformity);
      if (c !== null) return fail(c);
      const s = scalarProblem(`${label}[${i}].suspicion`, p.suspicion);
      if (s !== null) return fail(s);
      if (p.suspicion < 0) return fail(`${label}[${i}].suspicion is negative`);
      const pw = unitIntervalProblem(`${label}[${i}].predictedWinProb`, p.predictedWinProb, 0, 1);
      if (pw !== null) return fail(pw);
      if (typeof p.won !== "boolean") return fail(`${label}[${i}].won must be a boolean`);
      const pr = scalarProblem(`${label}[${i}].profit`, p.profit);
      if (pr !== null) return fail(pr);
    }
  }
  const a = unitIntervalProblem("alpha", alpha, 0, 1);
  if (a !== null) return fail(a);
  try {
    const qConf = calibrateConformalThreshold(
      holdout.map((p) => p.conformity),
      alpha,
    );
    const qAbs = rocTuneAbstentionThreshold(holdout.map((p) => ({ ...p })));
    if (Number.isNaN(qConf) || Number.isNaN(qAbs)) {
      return fail("threshold calibration produced NaN");
    }
    const pair = { qConf, qAbs };
    const published = liveSlate.map((p) => dualThresholdPublish(p, pair));
    const roc = evaluatePolicy(
      liveSlate.map((p) => ({ ...p })),
      (p) => dualThresholdPublish(p, pair),
    );
    const fixed = evaluatePolicy(
      liveSlate.map((p) => ({ ...p })),
      (p) => fixed70Publish(p),
    );
    for (const pair2 of [
      ["roc.roi", roc.roi],
      ["roc.coverage", roc.coverage],
      ["fixed.roi", fixed.roi],
      ["fixed.coverage", fixed.coverage],
    ] as Array<[string, number]>) {
      if (!Number.isFinite(pair2[1])) return fail(`kernel returned a non-finite ${pair2[0]}`);
    }
    if (roc.coverage < 0 || roc.coverage > 1 || fixed.coverage < 0 || fixed.coverage > 1) {
      return fail("kernel returned a coverage outside [0,1]");
    }
    const gate = rocAbstentionGatePasses(roc, fixed, alpha);
    const publishedCount = countTrue(published);
    return {
      ok: true,
      data: {
        verdict: gate ? "HUMAN_REVIEW" : publishedCount === 0 ? "ABSTAIN" : "NO_BET",
        reasonCode: gate
          ? "PUBLISHED"
          : publishedCount === 0
            ? "SUSPICION_ABOVE_THRESHOLD"
            : "LOSS_DIFFERENCE_NOT_UNIFORM",
        notes: [
          `qConf = ${qConf} (conformal), qAbs = ${qAbs} (ROC / Youden J on the holdout).`,
          `live coverage ${fmt(roc.coverage)} vs fixed-70% ${fmt(fixed.coverage)}; ROI ${fmt(roc.roi)} vs ${fmt(fixed.roi)}.`,
          "The module ships ENABLED = false; a passing mechanical gate still needs a human call.",
        ],
        sourceModuleEnabled: false,
        published,
        publishedCount,
        slateSize: liveSlate.length,
        publishedShare: publishedCount / liveSlate.length,
        qConf,
        qAbs,
        coverage: roc.coverage,
        roi: roc.roi,
        fixed70Coverage: fixed.coverage,
        fixed70Roi: fixed.roi,
        gatePasses: gate,
      },
    };
  } catch (err) {
    return fail(`dual-threshold conformal threw: ${errorText(err)}`);
  }
}

const MARKET_TYPES: readonly MarketType[] = ["spread", "total", "moneyline"];

/** Per-market-type gates with class-conditional error caps. */
export function evalPerClassGates(input: {
  readonly gates: readonly ClassGate[];
  readonly confidences: readonly (number | null)[];
  readonly realizedCorrect?: readonly (0 | 1)[];
  readonly globalAbstention?: number;
  readonly seasonsOverCap?: Readonly<Record<MarketType, number>>;
  readonly seed?: number;
}): DecisionEval<
  GateResult & {
    readonly posted: readonly (boolean | null)[];
    readonly errorRates: Readonly<Record<string, number>>;
    readonly abstentionRates: Readonly<Record<string, number>>;
    readonly perClassUnderCap: boolean;
    readonly hardFail: boolean;
  }
> {
  const { gates, confidences, realizedCorrect, globalAbstention, seasonsOverCap, seed } = input;
  if (!Array.isArray(gates) || gates.length === 0) return fail("gates must be non-empty");
  if (gates.length !== confidences.length) return fail("gates and confidences must be the same length");
  for (let i = 0; i < gates.length; i++) {
    const g = gates[i] as ClassGate;
    if (!MARKET_TYPES.includes(g.marketType)) {
      return fail(`gates[${i}].marketType = ${g.marketType} is unknown`);
    }
    const ec = unitIntervalProblem(`gates[${i}].errorCap`, g.errorCap, 0, 1);
    if (ec !== null) return fail(ec);
    const th = unitIntervalProblem(`gates[${i}].threshold`, g.threshold, 0, 1);
    if (th !== null) return fail(th);
    const c = confidences[i];
    if (c === null || c === undefined) continue;
    const cp = unitIntervalProblem(`confidences[${i}]`, c, 0, 1);
    if (cp !== null) return fail(`${cp} -- a confidence is a score, but it must lie in [0,1]`);
  }
  if (realizedCorrect !== undefined) {
    if (realizedCorrect.length !== gates.length) {
      return fail("realizedCorrect must align with gates");
    }
    for (let i = 0; i < realizedCorrect.length; i++) {
      const v = realizedCorrect[i];
      if (v !== 0 && v !== 1) return fail(`realizedCorrect[${i}] must be 0|1`);
    }
  }
  if (seed !== undefined) {
    const sp = scalarProblem("seed", seed);
    if (sp !== null) return fail(sp);
  }
  if (globalAbstention !== undefined) {
    const g = unitIntervalProblem("globalAbstention", globalAbstention, 0, 1);
    if (g !== null) return fail(g);
  }
  if (seasonsOverCap !== undefined) {
    for (const t of MARKET_TYPES) {
      const v = seasonsOverCap[t];
      if (v === undefined) return fail(`seasonsOverCap.${t} is missing`);
      if (!Number.isFinite(v) || v < 0) {
        return fail(`seasonsOverCap.${t} = ${v} must be a non-negative count`);
      }
    }
  }
  try {
    // Deterministic RNG only: mulberry32 (a counter-based LCG). Never Math.random.
    const rand = mulberry32(seed ?? 20260924);
    const posted = gates.map((g, i) => {
      const c = confidences[i];
      if (c === null || c === undefined) return null;
      return classGateDecision(g, c, rand);
    });
    const errorRates: Record<string, number> = {};
    const abstentionRates: Record<string, number> = {};
    for (const t of MARKET_TYPES) {
      const idx: number[] = [];
      for (let i = 0; i < gates.length; i++) {
        if ((gates[i] as ClassGate).marketType === t) idx.push(i);
      }
      const flags = idx.map((i) => posted[i] ?? false);
      abstentionRates[t] = classAbstentionRate(flags);
      errorRates[t] =
        realizedCorrect === undefined
          ? 0
          : classErrorRate(flags, idx.map((i) => realizedCorrect[i] as 0 | 1));
    }
    let perClassUnderCap = true;
    let hardFail = false;
    if (
      realizedCorrect !== undefined &&
      globalAbstention !== undefined &&
      seasonsOverCap !== undefined
    ) {
      const caps = {} as Record<MarketType, number>;
      for (const t of MARKET_TYPES) {
        const g = gates.find((x) => x.marketType === t);
        caps[t] = g === undefined ? 1 : g.errorCap;
      }
      const res = perClassGatePasses(
        errorRates as Record<MarketType, number>,
        caps,
        meanOf(MARKET_TYPES.map((t) => abstentionRates[t] as number)),
        globalAbstention,
        seasonsOverCap,
      );
      perClassUnderCap = res.perClassUnderCap;
      hardFail = res.hardFail;
    }
    const postedCount = posted.filter((p) => p === true).length;
    return {
      ok: true,
      data: {
        verdict: postedCount === 0 ? "NO_BET" : perClassUnderCap && !hardFail ? "FIRE" : "HUMAN_REVIEW",
        reasonCode:
          postedCount === 0 || !perClassUnderCap || hardFail ? "CLASS_ERROR_CAP" : "PUBLISHED",
        notes: [
          "A null confidence means no data: that row is not posted and is not counted as a decision.",
          "Tie-breaking at the threshold uses mulberry32(seed) -- deterministic, never Math.random.",
          "The module ships ENABLED = false; activation is a human call.",
        ],
        sourceModuleEnabled: false,
        posted,
        errorRates,
        abstentionRates,
        perClassUnderCap,
        hardFail,
      },
    };
  } catch (err) {
    return fail(`per-class gates threw: ${errorText(err)}`);
  }
}

/** Hybrid-uncertainty scoring with a selective hit-rate read-out. */
export function evalHybridUncertaintyGate(input: {
  readonly components: readonly UncertaintyComponents[];
  readonly weights: UncertaintyWeights;
  readonly theta: number;
  readonly correct?: readonly (0 | 1)[];
  readonly coverage?: number;
  readonly tempScalingHitRate?: number;
  readonly mcDropoutHitRate?: number;
}): DecisionEval<
  SlateGateResult & {
    readonly uncertainties: readonly number[];
    readonly hybridHitRate: number | null;
    readonly liftVsBestPp: number | null;
    readonly gatePasses: boolean | null;
  }
> {
  const { components, weights, theta, correct, coverage, tempScalingHitRate, mcDropoutHitRate } =
    input;
  if (!Array.isArray(components) || components.length === 0) return fail("components must be non-empty");
  const fields: Array<keyof UncertaintyComponents> = [
    "evidenceDisagreement",
    "sourceContradiction",
    "runDisagreement",
    "dataIncompleteness",
    "entropy",
    "calibrationGap",
  ];
  for (let i = 0; i < components.length; i++) {
    const c = components[i] as UncertaintyComponents;
    for (const f of fields) {
      const v = c[f];
      const p = scalarProblem(`components[${i}].${f}`, v);
      if (p !== null) return fail(p);
      if (v < 0) return fail(`components[${i}].${f} is negative`);
    }
  }
  const wFields: Array<keyof UncertaintyWeights> = ["wD", "wC", "wR", "wI", "wE", "wG"];
  for (const f of wFields) {
    const p = scalarProblem(`weights.${f}`, weights[f]);
    if (p !== null) return fail(p);
  }
  const t = scalarProblem("theta", theta);
  if (t !== null) return fail(t);
  if (theta < 0) return fail(`theta = ${theta} is negative`);
  if (correct !== undefined) {
    if (correct.length !== components.length) return fail("correct must align with components");
    for (let i = 0; i < correct.length; i++) {
      const v = correct[i];
      if (v !== 0 && v !== 1) return fail(`correct[${i}] must be 0|1`);
    }
  }
  try {
    const uncertainties = components.map((c) => hybridUncertainty(c, weights));
    for (let i = 0; i < uncertainties.length; i++) {
      const u = uncertainties[i] as number;
      if (!Number.isFinite(u) || u < 0) {
        return fail(`kernel returned an impossible uncertainty ${u}`);
      }
    }
    const published = uncertainties.map((u) => uncertaintyPostDecision(u, theta));
    const publishedCount = countTrue(published);
    let hit: number | null = null;
    let lift: number | null = null;
    let gatePasses: boolean | null = null;
    if (correct !== undefined && coverage !== undefined) {
      const cv = unitIntervalProblem("coverage", coverage, 0, 1);
      if (cv !== null) return fail(cv);
      hit = selectiveHitRate([...uncertainties], [...correct], coverage);
      if (!Number.isFinite(hit) || hit < 0 || hit > 1) {
        return fail(`kernel returned an impossible selective hit rate ${hit}`);
      }
      if (tempScalingHitRate !== undefined && mcDropoutHitRate !== undefined) {
        for (const pair of [
          ["tempScalingHitRate", tempScalingHitRate],
          ["mcDropoutHitRate", mcDropoutHitRate],
        ] as Array<[string, number]>) {
          const p = unitIntervalProblem(pair[0], pair[1], 0, 1);
          if (p !== null) return fail(p);
        }
        const g = hybridGatePasses(
          hit,
          tempScalingHitRate,
          mcDropoutHitRate,
          weights.wD,
          weights.wC,
        );
        lift = g.liftVsBestPp;
        gatePasses = g.passes;
      }
    }
    return {
      ok: true,
      data: {
        verdict: publishedCount === 0 ? "ABSTAIN" : "FIRE",
        reasonCode: publishedCount === 0 ? "HIGH_UNCERTAINTY" : "PUBLISHED",
        notes: [
          "hybrid uncertainty U is a weighted sum of disagreement magnitudes; it is not a probability of being wrong.",
          "The module ships ENABLED = false; activation is a human call.",
        ],
        sourceModuleEnabled: false,
        published,
        publishedCount,
        slateSize: components.length,
        publishedShare: publishedCount / components.length,
        uncertainties,
        hybridHitRate: hit,
        liftVsBestPp: lift,
        gatePasses,
      },
    };
  } catch (err) {
    return fail(`hybrid uncertainty bridge threw: ${errorText(err)}`);
  }
}

/** Model / expert / abstain deferral router with a sub-population bias audit. */
export function evalDeferralRouter(input: {
  readonly triples: readonly DeferralTriple[];
  readonly modelScores: readonly number[];
  readonly expertScores: readonly number[];
  readonly abstainScores: readonly number[];
  readonly abstainThreshold: number;
  readonly audits?: readonly SubpopulationAudit[];
  readonly alwaysModelUnits?: number;
  readonly thresholdRoutingUnits?: number;
}): DecisionEval<
  GateResult & {
    readonly routes: readonly ("model" | "expert" | "abstain")[];
    readonly routeCounts: Readonly<Record<string, number>>;
    readonly systemUnits: number;
    readonly biasedGroups: readonly string[];
    readonly gatePasses: boolean | null;
  }
> {
  const {
    triples,
    modelScores,
    expertScores,
    abstainScores,
    abstainThreshold,
    audits,
    alwaysModelUnits,
    thresholdRoutingUnits,
  } = input;
  if (!Array.isArray(triples) || triples.length === 0) return fail("triples must be non-empty");
  if (
    modelScores.length !== triples.length ||
    expertScores.length !== triples.length ||
    abstainScores.length !== triples.length
  ) {
    return fail("modelScores / expertScores / abstainScores must all align with triples");
  }
  for (let i = 0; i < triples.length; i++) {
    const t = triples[i] as DeferralTriple;
    const m = scalarProblem(`triples[${i}].modelUnits`, t.modelUnits);
    if (m !== null) return fail(m);
    const e = scalarProblem(`triples[${i}].expertUnits`, t.expertUnits);
    if (e !== null) return fail(e);
  }
  const ms = finiteProblem("modelScores", modelScores);
  if (ms !== null) return fail(ms);
  const es = finiteProblem("expertScores", expertScores);
  if (es !== null) return fail(es);
  const as = finiteProblem("abstainScores", abstainScores);
  if (as !== null) return fail(as);
  const at = scalarProblem("abstainThreshold", abstainThreshold);
  if (at !== null) return fail(at);
  if (audits !== undefined) {
    for (let i = 0; i < audits.length; i++) {
      const a = audits[i] as SubpopulationAudit;
      if (typeof a.group !== "string" || a.group.length === 0) {
        return fail(`audits[${i}].group must be a non-empty string`);
      }
      const dr = unitIntervalProblem(`audits[${i}].deferralRate`, a.deferralRate, 0, 1);
      if (dr !== null) return fail(dr);
      const ew = unitIntervalProblem(
        `audits[${i}].expertWinRateWhenDeferred`,
        a.expertWinRateWhenDeferred,
        0,
        1,
      );
      if (ew !== null) return fail(ew);
      const nn = scalarProblem(`audits[${i}].n`, a.n);
      if (nn !== null) return fail(nn);
      if (a.n <= 0) return fail(`audits[${i}].n must be > 0`);
    }
  }
  if (alwaysModelUnits !== undefined) {
    const a = scalarProblem("alwaysModelUnits", alwaysModelUnits);
    if (a !== null) return fail(a);
  }
  if (thresholdRoutingUnits !== undefined) {
    const b = scalarProblem("thresholdRoutingUnits", thresholdRoutingUnits);
    if (b !== null) return fail(b);
  }
  try {
    const routes = triples.map((_, i) =>
      routerDecision(
        modelScores[i] as number,
        expertScores[i] as number,
        abstainScores[i] as number,
        abstainThreshold,
      ),
    );
    const routeCounts: Record<string, number> = { model: 0, expert: 0, abstain: 0 };
    for (const r of routes) routeCounts[r] = (routeCounts[r] ?? 0) + 1;
    const units = routedSystemUnits(
      triples.map((t) => ({ ...t })),
      [...routes],
    );
    if (!Number.isFinite(units)) return fail(`kernel returned non-finite system units ${units}`);
    const biased = audits === undefined ? [] : deferralBiasAudit(audits.map((a) => ({ ...a })));
    // The acceptance gate is only reported when every one of its inputs was
    // supplied; a partial gate read is worse than no gate read.
    let gatePasses: boolean | null = null;
    if (
      alwaysModelUnits !== undefined &&
      thresholdRoutingUnits !== undefined &&
      audits !== undefined
    ) {
      gatePasses = deferralRouterGatePasses(units, alwaysModelUnits, thresholdRoutingUnits, [
        ...biased,
      ]);
    }
    const nAbstain = routeCounts.abstain ?? 0;
    const nExpert = routeCounts.expert ?? 0;
    return {
      ok: true,
      data: {
        verdict: nAbstain > 0 ? "ABSTAIN" : nExpert > 0 ? "HUMAN_REVIEW" : "FIRE",
        reasonCode: nAbstain > 0 ? "TOO_UNCERTAIN" : nExpert > 0 ? "EXPERT_ROUTE" : "PUBLISHED",
        notes: [
          "systemUnits is realised unit P&L of the routed slate; it is profit, not a probability.",
          "The module ships ENABLED = false; activation is a human call.",
        ],
        sourceModuleEnabled: false,
        routes,
        routeCounts,
        systemUnits: units,
        biasedGroups: biased,
        gatePasses,
      },
    };
  } catch (err) {
    return fail(`deferral router threw: ${errorText(err)}`);
  }
}

// ===========================================================================
// (b) ensemble/ -- forecast combination
// ===========================================================================

/** Beta Linear Pool recalibration of a pooled probability. */
export function evalBetaLinearPool(input: {
  readonly pooledProbs: readonly number[];
  readonly outcomes: readonly (0 | 1)[];
  readonly grid: readonly number[];
}): DecisionEval<
  GateResult & {
    readonly alpha: number;
    readonly beta: number;
    readonly logScore: number;
    readonly recalibrated: readonly number[];
    readonly identitySelected: boolean;
  }
> {
  const { pooledProbs, outcomes, grid } = input;
  if (!Array.isArray(pooledProbs) || pooledProbs.length === 0) {
    return fail("pooledProbs must be non-empty");
  }
  if (pooledProbs.length !== outcomes.length) {
    return fail("pooledProbs and outcomes must be the same length");
  }
  const pp = probabilityProblem("pooledProbs", pooledProbs);
  if (pp !== null) return fail(pp);
  for (let i = 0; i < outcomes.length; i++) {
    const y = outcomes[i];
    if (y !== 0 && y !== 1) return fail(`outcomes[${i}] must be 0|1`);
  }
  if (!Array.isArray(grid) || grid.length === 0) {
    return fail("grid must be a non-empty (alpha, beta) grid");
  }
  const gp = nonNegativeProblem("grid", grid);
  if (gp !== null) return fail(gp);
  for (let i = 0; i < grid.length; i++) {
    if ((grid[i] as number) <= 0) return fail(`grid[${i}] must be > 0 (beta shape parameters)`);
  }
  try {
    const fit = blpFit([...pooledProbs], [...outcomes], [...grid]);
    if (!Number.isFinite(fit.alpha) || fit.alpha <= 0) {
      return fail(`kernel returned alpha ${fit.alpha}`);
    }
    if (!Number.isFinite(fit.beta) || fit.beta <= 0) {
      return fail(`kernel returned beta ${fit.beta}`);
    }
    if (!Number.isFinite(fit.score) || fit.score > 0) {
      return fail(`kernel returned a mean log score ${fit.score} that is not <= 0`);
    }
    const recalibrated = pooledProbs.map((p) => blpApply(p, fit.alpha, fit.beta));
    for (let i = 0; i < recalibrated.length; i++) {
      const bad = pooledProbabilityProblem(`recalibrated[${i}]`, recalibrated[i] as number);
      if (bad !== null) return fail(bad);
    }
    const identitySelected = Math.abs(fit.alpha - 1) < 1e-12 && Math.abs(fit.beta - 1) < 1e-12;
    return {
      ok: true,
      data: {
        // The identity recalibration means the layer would do nothing. Shipping
        // a no-op as an "improvement" is a lie; the bridge calls it out.
        verdict: identitySelected ? "NO_BET" : "FIRE",
        reasonCode: identitySelected ? "CALIBRATION_FLOOR_FAIL" : "PUBLISHED",
        notes: [
          `BLP (alpha=${fit.alpha}, beta=${fit.beta}) mean log score ${fmt(fit.score, 6)}.`,
          identitySelected
            ? "The grid search selected the IDENTITY recalibration: this pooled forecast is already calibrated, so a BLP layer adds nothing and would ship a no-op as an improvement."
            : "recalibrated[] are recalibrated probabilities, not win rates for a specific side.",
        ],
        sourceModuleEnabled: false,
        alpha: fit.alpha,
        beta: fit.beta,
        logScore: fit.score,
        recalibrated,
        identitySelected,
      },
    };
  } catch (err) {
    return fail(`blpFit threw: ${errorText(err)}`);
  }
}

/**
 * PSIS log-score stacking weights. The simplex projection is validated: a
 * weight vector that does not sum to 1 beyond WEIGHT_SUM_TOLERANCE FAILS
 * CLOSED rather than being silently rescaled.
 */
export function evalLogScoreStackingWeights(input: {
  readonly lpdPointwise: ReadonlyArray<readonly number[]>;
  readonly elpd?: readonly number[];
  readonly se?: readonly number[];
  readonly iters?: number;
}): DecisionEval<
  GateResult & {
    readonly stackingWeights: readonly number[];
    readonly weightReport: WeightReport;
    readonly stackedLogScore: number;
    readonly pseudoBmaPlusWeights: readonly number[] | null;
  }
> {
  const { lpdPointwise, elpd, se, iters } = input;
  if (!Array.isArray(lpdPointwise) || lpdPointwise.length === 0) {
    return fail("lpdPointwise must be a non-empty matrix of log predictive densities");
  }
  const k = (lpdPointwise[0] as readonly number[]).length;
  if (k === 0) return fail("lpdPointwise rows must have at least one model column");
  const flat: number[] = [];
  for (let i = 0; i < lpdPointwise.length; i++) {
    const row = lpdPointwise[i] as readonly number[];
    if (row.length !== k) {
      return fail(`lpdPointwise row ${i} has ${row.length} columns, expected ${k} (ragged matrix)`);
    }
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      if (v === undefined || !Number.isFinite(v)) {
        return fail(`lpdPointwise[${i}][${j}] is not a finite log density`);
      }
      if (v > 0) {
        return fail(`lpdPointwise[${i}][${j}] = ${v} is positive; a log predictive density cannot exceed 0`);
      }
      flat.push(v);
    }
  }
  if (flat.length === 0) return fail("lpdPointwise is empty");
  if (iters !== undefined) {
    const it = scalarProblem("iters", iters);
    if (it !== null) return fail(it);
    if (iters <= 0) return fail(`iters = ${iters} must be > 0`);
  }
  if (elpd !== undefined || se !== undefined) {
    if (elpd === undefined || se === undefined) {
      return fail("elpd and se must be supplied together");
    }
    if (elpd.length !== se.length) return fail("elpd and se must be the same length");
    const ef = finiteProblem("elpd", elpd);
    if (ef !== null) return fail(ef);
    const sf = finiteProblem("se", se);
    if (sf !== null) return fail(sf);
  }
  try {
    const w = stackingWeights(lpdPointwise, undefined, iters ?? 2000, 1.0);
    const wBad = weightVectorProblem("stacking", w);
    if (wBad !== null) return fail(wBad);
    const ls = stackedLogScore(lpdPointwise, w);
    if (!Number.isFinite(ls) || ls > 0) {
      return fail(`kernel returned a stacked log score ${ls} that is not <= 0`);
    }
    let bma: readonly number[] | null = null;
    if (elpd !== undefined && se !== undefined) {
      bma = pseudoBmaPlus(elpd, se);
      const bBad = weightVectorProblem("pseudoBMA+", bma);
      if (bBad !== null) return fail(bBad);
    }
    return {
      ok: true,
      data: {
        verdict: "FIRE",
        reasonCode: "PUBLISHED",
        notes: [
          `stacked log score ${fmt(ls, 6)}; effective members ${fmt(effectiveMemberCount(w), 3)} of ${k}.`,
          bma !== null
            ? "pseudoBmaPlusWeights are the regularised-elpd warm start, not the fitted stacking solution."
            : "Supply elpd and se to also read the pseudoBMA+ warm start.",
          "Weights are mixing coefficients, not probabilities of any outcome.",
        ],
        sourceModuleEnabled: null,
        stackingWeights: w,
        weightReport: buildWeightReport(w),
        stackedLogScore: ls,
        pseudoBmaPlusWeights: bma,
      },
    };
  } catch (err) {
    return fail(`stacking threw: ${errorText(err)}`);
  }
}

/** Dampened log-odds pooling. `pooledProbability` is a forecast, not a win rate. */
export function evalDampenedLogOdds(input: {
  readonly memberProbs: readonly number[];
  readonly damping?: number;
  readonly validationRows?: ReadonlyArray<readonly number[]>;
  readonly validationOutcomes?: readonly number[];
  readonly dampingCandidates?: readonly number[];
}): DecisionEval<
  GateResult & {
    readonly pooledProbability: number;
    readonly damping: number;
    readonly meanLogit: number;
    readonly tunedDamping: number | null;
  }
> {
  const { memberProbs, damping, validationRows, validationOutcomes, dampingCandidates } = input;
  if (!Array.isArray(memberProbs) || memberProbs.length === 0) {
    return fail("memberProbs must be non-empty");
  }
  const mp = probabilityProblem("memberProbs", memberProbs);
  if (mp !== null) return fail(mp);
  for (let i = 0; i < memberProbs.length; i++) {
    if ((memberProbs[i] as number) <= 0 || (memberProbs[i] as number) >= 1) {
      return fail(`memberProbs[${i}] = ${memberProbs[i]} must be strictly inside (0,1) for a log-odds pool`);
    }
  }
  const d = damping ?? 0.8;
  const dr = unitIntervalProblem("damping", d, 0, 1);
  if (dr !== null) return fail(`${dr}; the kernel requires damping in (0,1]`);
  if (d <= 0) return fail(`damping = ${d} must be > 0`);
  let tuned: number | null = null;
  if (validationRows !== undefined || validationOutcomes !== undefined) {
    if (validationRows === undefined || validationOutcomes === undefined) {
      return fail("validationRows and validationOutcomes must be supplied together");
    }
    if (validationRows.length !== validationOutcomes.length) {
      return fail("validationRows and validationOutcomes must be the same length");
    }
    if (validationRows.length === 0) return fail("validationRows must be non-empty");
    for (let i = 0; i < validationRows.length; i++) {
      const row = validationRows[i] as readonly number[];
      if (row.length === 0) return fail(`validationRows[${i}] is empty`);
      const rp = probabilityProblem(`validationRows[${i}]`, row);
      if (rp !== null) return fail(rp);
    }
    for (let i = 0; i < validationOutcomes.length; i++) {
      const y = validationOutcomes[i] as number;
      if (y !== 0 && y !== 1) return fail(`validationOutcomes[${i}] must be 0|1`);
    }
    if (dampingCandidates !== undefined) {
      if (dampingCandidates.length === 0) return fail("dampingCandidates must be non-empty when supplied");
      for (let i = 0; i < dampingCandidates.length; i++) {
        const c = unitIntervalProblem(`dampingCandidates[${i}]`, dampingCandidates[i] as number, 0, 1);
        if (c !== null) return fail(c);
        if ((dampingCandidates[i] as number) <= 0) {
          return fail(`dampingCandidates[${i}] must be > 0`);
        }
      }
    }
  }
  try {
    const pooled = dampenedLogOddsCombine(memberProbs, d);
    const pp = pooledProbabilityProblem("pooledProbability", pooled);
    if (pp !== null) return fail(pp);
    if (validationRows !== undefined && validationOutcomes !== undefined) {
      const candidates = dampingCandidates ?? [0.2, 0.4, 0.6, 0.8, 1];
      tuned = tuneDamping(validationRows, validationOutcomes, candidates);
      const t = unitIntervalProblem("tunedDamping", tuned, 0, 1);
      if (t !== null) return fail(t);
    }
    const meanLogit = memberProbs.reduce((s, p) => s + Math.log(p / (1 - p)), 0) / memberProbs.length;
    return {
      ok: true,
      data: {
        verdict: "FIRE",
        reasonCode: "PUBLISHED",
        notes: [
          `mean member logit ${fmt(meanLogit, 6)} x damping ${d}.`,
          "pooledProbability is a dampened pooled forecast, not a calibrated win rate.",
        ],
        sourceModuleEnabled: null,
        pooledProbability: pooled,
        damping: d,
        meanLogit,
        tunedDamping: tuned,
      },
    };
  } catch (err) {
    return fail(`dampened log-odds threw: ${errorText(err)}`);
  }
}

/** Median consensus with the mean/median dissent flag. */
export function evalMedianConsensus(input: {
  readonly forecasts: readonly number[];
  readonly backtestWeeks?: ReadonlyArray<{ forecasts: number[][]; outcomes: number[] }>;
}): DecisionEval<
  GateResult & {
    readonly mean: number;
    readonly median: number;
    readonly combined: number;
    readonly dissent: boolean;
    readonly disagreementPp: number;
    readonly backtest: {
      readonly meanLogLoss: number;
      readonly medianLogLoss: number;
      readonly relativeGap: number;
      readonly beatAllRate: number;
      readonly dissentRate: number;
      readonly verdict: string;
    } | null;
  }
> {
  const { forecasts, backtestWeeks } = input;
  if (!Array.isArray(forecasts) || forecasts.length === 0) {
    return fail("forecasts must be non-empty");
  }
  const fp = probabilityProblem("forecasts", forecasts);
  if (fp !== null) return fail(fp);
  if (backtestWeeks !== undefined) {
    if (backtestWeeks.length === 0) {
      return fail("backtestWeeks must be non-empty when supplied");
    }
    for (let w = 0; w < backtestWeeks.length; w++) {
      const week = backtestWeeks[w] as { forecasts: number[][]; outcomes: number[] };
      if (week.forecasts.length === 0) return fail(`backtestWeeks[${w}].forecasts is empty`);
      if (week.forecasts.length !== week.outcomes.length) {
        return fail(`backtestWeeks[${w}].forecasts and .outcomes must align`);
      }
      for (let g = 0; g < week.forecasts.length; g++) {
        const row = week.forecasts[g] as number[];
        if (row.length === 0) return fail(`backtestWeeks[${w}].forecasts[${g}] is empty`);
        const rp = probabilityProblem(`backtestWeeks[${w}].forecasts[${g}]`, row);
        if (rp !== null) return fail(rp);
        const y = week.outcomes[g] as number;
        if (y !== 0 && y !== 1) return fail(`backtestWeeks[${w}].outcomes[${g}] must be 0|1`);
      }
    }
  }
  try {
    const c = consensus(forecasts);
    for (const pair of [
      ["mean", c.mean],
      ["median", c.median],
      ["combined", c.combined],
    ] as Array<[string, number]>) {
      const p = pooledProbabilityProblem(`consensus.${pair[0]}`, pair[1]);
      if (p !== null) return fail(p);
    }
    let backtest: {
      readonly meanLogLoss: number;
      readonly medianLogLoss: number;
      readonly relativeGap: number;
      readonly beatAllRate: number;
      readonly dissentRate: number;
      readonly verdict: string;
    } | null = null;
    if (backtestWeeks !== undefined) {
      const e = evaluateConsensus(backtestWeeks);
      for (const pair of [
        ["meanLogLoss", e.meanLogLoss],
        ["medianLogLoss", e.medianLogLoss],
        ["relativeGap", e.relativeGap],
        ["beatAllRate", e.beatAllRate],
        ["dissentRate", e.dissentRate],
      ] as Array<[string, number]>) {
        if (!Number.isFinite(pair[1])) return fail(`kernel returned a non-finite ${pair[0]}`);
      }
      backtest = {
        meanLogLoss: e.meanLogLoss,
        medianLogLoss: e.medianLogLoss,
        relativeGap: e.relativeGap,
        beatAllRate: e.beatAllRate,
        dissentRate: e.dissentRate,
        verdict: e.verdict,
      };
    }
    return {
      ok: true,
      data: {
        verdict: c.dissent ? "HUMAN_REVIEW" : "FIRE",
        reasonCode: c.dissent ? "DISSENT_OUTLIER" : "PUBLISHED",
        notes: c.dissent
          ? [
              "A constituent sits more than 3pp off the median: the slate has a dissent outlier and needs a human read, not a silent median.",
            ]
          : ["Mean and median agree within 3pp: no dissent outlier."],
        sourceModuleEnabled: null,
        mean: c.mean,
        median: c.median,
        combined: c.combined,
        dissent: c.dissent,
        disagreementPp: c.disagreementPp,
        backtest,
      },
    };
  } catch (err) {
    return fail(`median consensus threw: ${errorText(err)}`);
  }
}

/** Variance-EM aggregation of a source panel, with the reliability dashboard. */
export function evalVarianceEmAggregate(input: {
  readonly panel: readonly number[];
  readonly perGameVariances?: ReadonlyArray<readonly number[]>;
}): DecisionEval<
  GateResult & {
    readonly pooledProbability: number;
    readonly sourceVariances: readonly number[];
    readonly iterations: number;
    readonly converged: boolean;
    readonly simpleAverage: number;
    readonly emVsSimpleAverage: number;
    readonly precisionWeights: readonly number[];
    readonly weightReport: WeightReport;
    readonly sourceReliability: readonly number[] | null;
  }
> {
  const { panel, perGameVariances } = input;
  if (!Array.isArray(panel) || panel.length === 0) {
    return fail("panel must be non-empty");
  }
  const pp = probabilityProblem("panel", panel);
  if (pp !== null) return fail(pp);
  if (perGameVariances !== undefined) {
    if (perGameVariances.length === 0) {
      return fail("perGameVariances must be non-empty when supplied");
    }
    const width = (perGameVariances[0] as readonly number[]).length;
    for (let i = 0; i < perGameVariances.length; i++) {
      const row = perGameVariances[i] as readonly number[];
      if (row.length !== width) {
        return fail(`perGameVariances row ${i} has ${row.length} sources, expected ${width}`);
      }
      const nv = nonNegativeProblem(`perGameVariances[${i}]`, row);
      if (nv !== null) return fail(nv);
    }
  }
  try {
    const em = varianceEM(panel);
    const mp = pooledProbabilityProblem("varianceEM.mu", em.mu);
    if (mp !== null) return fail(mp);
    if (em.iterations <= 0) return fail(`kernel reported ${em.iterations} iterations`);
    for (let i = 0; i < em.sourceVariances.length; i++) {
      const v = em.sourceVariances[i] as number;
      if (!Number.isFinite(v) || v <= 0) {
        return fail(`kernel returned a non-positive sourceVariances[${i}] = ${v}`);
      }
    }
    const simple = varianceEmSimpleAverage(panel);
    const sp = pooledProbabilityProblem("simpleAverage", simple);
    if (sp !== null) return fail(sp);
    // Precision weights from the converged variances: these sum to 1 by
    // construction, but they are validated rather than assumed.
    const precisions = em.sourceVariances.map((v) => 1 / v);
    const pSum = precisions.reduce((a, b) => a + b, 0);
    const weights = precisions.map((p) => p / pSum);
    const wBad = weightVectorProblem("varianceEM precision", weights);
    if (wBad !== null) return fail(wBad);
    const reliability =
      perGameVariances === undefined ? null : sourceReliabilityDashboard(perGameVariances);
    return {
      ok: true,
      data: {
        verdict: "FIRE",
        reasonCode: "PUBLISHED",
        notes: [
          `EM converged = ${em.converged} after ${em.iterations} iteration(s); simple average ${fmt(simple)} vs EM ${fmt(em.mu)}.`,
          "pooledProbability is a precision-weighted pooled forecast, not a calibrated win rate.",
          "sourceVariances are error variances (lower = more reliable); they are not probabilities.",
        ],
        sourceModuleEnabled: null,
        pooledProbability: em.mu,
        sourceVariances: [...em.sourceVariances],
        iterations: em.iterations,
        converged: em.converged,
        simpleAverage: simple,
        emVsSimpleAverage: em.mu - simple,
        precisionWeights: weights,
        weightReport: buildWeightReport(weights),
        sourceReliability: reliability === null ? null : [...reliability],
      },
    };
  } catch (err) {
    return fail(`varianceEM threw: ${errorText(err)}`);
  }
}

/** Diversity-weighted combiner: slate diversity matrix -> softmax weights. */
export function evalDiversityWeightedCombiner(input: {
  readonly memberForecasts: readonly (readonly number[])[];
  readonly skillScores: readonly number[];
  readonly gamma: number;
}): DecisionEval<
  GateResult & {
    readonly diversityMatrix: readonly (readonly number[])[];
    readonly diversityContributions: readonly number[];
    readonly weights: readonly number[];
    readonly weightReport: WeightReport;
  }
> {
  const { memberForecasts, skillScores, gamma } = input;
  if (!Array.isArray(memberForecasts) || memberForecasts.length < 2) {
    return fail("memberForecasts must contain at least 2 models to measure diversity between them");
  }
  const horizon = (memberForecasts[0] as readonly number[]).length;
  if (horizon === 0) return fail("memberForecasts rows must be non-empty");
  for (let i = 0; i < memberForecasts.length; i++) {
    const row = memberForecasts[i] as readonly number[];
    if (row.length !== horizon) {
      return fail(`memberForecasts[${i}] has ${row.length} games, expected ${horizon}`);
    }
    const f = finiteProblem(`memberForecasts[${i}]`, row);
    if (f !== null) return fail(f);
  }
  if (skillScores.length !== memberForecasts.length) {
    return fail("skillScores must align with memberForecasts");
  }
  const sf = finiteProblem("skillScores", skillScores);
  if (sf !== null) return fail(sf);
  const g = scalarProblem("gamma", gamma);
  if (g !== null) return fail(g);
  try {
    const d = diversityMatrix(memberForecasts.map((r) => [...r]));
    for (let i = 0; i < d.length; i++) {
      const row = d[i] as number[];
      for (let j = 0; j < row.length; j++) {
        const v = row[j] as number;
        if (!Number.isFinite(v) || v < 0) {
          return fail(`kernel returned an impossible diversity D[${i}][${j}] = ${v}`);
        }
      }
    }
    const contrib = diversityContribution(d);
    for (let i = 0; i < contrib.length; i++) {
      const v = contrib[i] as number;
      if (!Number.isFinite(v) || v < 0) {
        return fail(`kernel returned an impossible diversity contribution ${v}`);
      }
    }
    const w = diversityWeights([...skillScores], contrib, gamma);
    const wBad = weightVectorProblem("diversity", w);
    if (wBad !== null) return fail(wBad);
    return {
      ok: true,
      data: {
        verdict: "FIRE",
        reasonCode: "PUBLISHED",
        notes: [
          `effective members ${fmt(effectiveMemberCount(w), 3)} of ${memberForecasts.length}; max weight ${fmt(Math.max(...w))}.`,
          "Weights combine skill (log-score) and diversity; they are mixing coefficients, not probabilities.",
        ],
        sourceModuleEnabled: false,
        diversityMatrix: d.map((r) => [...r]),
        diversityContributions: contrib,
        weights: w,
        weightReport: buildWeightReport(w),
      },
    };
  } catch (err) {
    return fail(`diversity-weighted combiner threw: ${errorText(err)}`);
  }
}

/** Covariance-intersection fusion of correlated sources. */
export function evalCovarianceIntersection(input: {
  readonly sources: readonly CovarianceSource[];
  readonly truth?: number;
  readonly recentLogLoss?: readonly number[];
}): DecisionEval<
  GateResult & {
    readonly fused: CovarianceSource;
    readonly omega: number;
    readonly epistemic: number;
    readonly aleatoric: number;
    readonly squaredError: number | null;
    readonly consistent: boolean | null;
    readonly adaptiveWeights: readonly number[] | null;
  }
> {
  const { sources, truth, recentLogLoss } = input;
  if (!Array.isArray(sources) || sources.length === 0) {
    return fail("sources must be non-empty");
  }
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i] as CovarianceSource;
    const m = scalarProblem(`sources[${i}].mean`, s.mean);
    if (m !== null) return fail(m);
    const v = scalarProblem(`sources[${i}].variance`, s.variance);
    if (v !== null) return fail(v);
    if (s.variance <= 0) return fail(`sources[${i}].variance = ${s.variance} must be > 0`);
  }
  if (truth !== undefined) {
    const t = scalarProblem("truth", truth);
    if (t !== null) return fail(t);
  }
  if (recentLogLoss !== undefined) {
    if (recentLogLoss.length === 0) return fail("recentLogLoss must be non-empty when supplied");
    const f = finiteProblem("recentLogLoss", recentLogLoss);
    if (f !== null) return fail(f);
    const w = adaptiveWeights(recentLogLoss);
    const wBad = weightVectorProblem("adaptive", w);
    if (wBad !== null) return fail(wBad);
  }
  try {
    const fused = covarianceIntersection(sources);
    const mp = pooledProbabilityProblem("fused.mean", fused.mean);
    if (mp !== null) return fail(mp);
    if (!Number.isFinite(fused.variance) || fused.variance <= 0) {
      return fail(`kernel returned a non-positive fused variance ${fused.variance}`);
    }
    if (!Number.isFinite(fused.omega) || fused.omega < 0 || fused.omega > 1) {
      return fail(`kernel returned omega ${fused.omega} outside [0,1]`);
    }
    const split = decomposeUncertainty(sources);
    for (const pair of [
      ["epistemic", split.epistemic],
      ["aleatoric", split.aleatoric],
    ] as Array<[string, number]>) {
      if (!Number.isFinite(pair[1]) || pair[1] < 0) {
        return fail(`kernel returned an impossible ${pair[0]} ${pair[1]}`);
      }
    }
    let sq: number | null = null;
    let consistent: boolean | null = null;
    if (truth !== undefined) {
      const c = consistencyCheck({ mean: fused.mean, variance: fused.variance }, truth);
      if (!Number.isFinite(c.squaredError) || c.squaredError < 0) {
        return fail(`kernel returned an impossible squaredError ${c.squaredError}`);
      }
      sq = c.squaredError;
      consistent = c.consistent;
    }
    const notes: string[] = [
      `omega = ${fused.omega} (the CI attenuation factor); epistemic ${fmt(split.epistemic)} vs aleatoric ${fmt(split.aleatoric)}.`,
    ];
    if (consistent === false) {
      notes.push(
        "Consistency check FAILED: the fused variance understates the observed squared error by more than 4x. Do not publish the fused number as calibrated.",
      );
    }
    return {
      ok: true,
      data: {
        verdict: consistent === false ? "HUMAN_REVIEW" : "FIRE",
        reasonCode: consistent === false ? "DISSENT_OUTLIER" : "PUBLISHED",
        notes,
        sourceModuleEnabled: null,
        fused: { mean: fused.mean, variance: fused.variance },
        omega: fused.omega,
        epistemic: split.epistemic,
        aleatoric: split.aleatoric,
        squaredError: sq,
        consistent,
        adaptiveWeights: recentLogLoss === undefined ? null : [...adaptiveWeights(recentLogLoss)],
      },
    };
  } catch (err) {
    return fail(`covariance intersection threw: ${errorText(err)}`);
  }
}

// ===========================================================================
// (c) drift/ + monitoring/ -- concept-drift detectors
// ===========================================================================

/**
 * A drift verdict without a stated reference window is not a finding. Every
 * drift eval in this bridge takes a `DriftBaseline` and echoes it back in the
 * result so a reader can see what "normal" was measured against.
 */
export interface DriftBaseline {
  /** Human-readable identity of the reference window (season, fold, ...). */
  readonly window: string;
  /** In-control error rate the monitor compares against. */
  readonly baselineErrorRate: number;
  /** Number of observations in the reference window. */
  readonly referenceObservations: number;
}

function baselineProblem(b: DriftBaseline | undefined): string | null {
  if (b === undefined) {
    return "a drift baseline is required: a drift verdict without a stated reference window is not a finding";
  }
  if (typeof b.window !== "string" || b.window.trim().length === 0) {
    return "baseline.window must be a non-empty label naming the reference window";
  }
  const e = unitIntervalProblem("baseline.baselineErrorRate", b.baselineErrorRate, 1e-9, 1 - 1e-9);
  if (e !== null) return e;
  const n = scalarProblem("baseline.referenceObservations", b.referenceObservations);
  if (n !== null) return n;
  if (b.referenceObservations <= 0) {
    return `baseline.referenceObservations = ${b.referenceObservations} must be > 0`;
  }
  return null;
}

/** EWMA (ECDD) concept-drift monitor over a binary error stream. */
export function evalEcddDriftState(input: {
  readonly baseline: DriftBaseline;
  readonly errors: readonly (0 | 1)[];
  readonly config?: EcddConfig;
  readonly tolerance?: number;
}): DecisionEval<
  GateResult & {
    readonly baselineWindow: string;
    readonly upperControlLimit: number;
    readonly finalLevel: number;
    readonly streamed: number;
    readonly firstAlarmAt: number | null;
    readonly alarms: readonly number[];
    readonly worstCaseDelay: number;
  }
> {
  const { baseline, errors, config, tolerance } = input;
  const bErr = baselineProblem(baseline);
  if (bErr !== null) return fail(bErr);
  if (!Array.isArray(errors) || errors.length === 0) {
    return fail("errors must be a non-empty stream of 0|1 outcomes");
  }
  for (let i = 0; i < errors.length; i++) {
    const e = errors[i];
    if (e !== 0 && e !== 1) return fail(`errors[${i}] must be 0|1`);
  }
  if (tolerance !== undefined) {
    const t = unitIntervalProblem("tolerance", tolerance, 0, 1);
    if (t !== null) return fail(t);
  }
  const cfg: EcddConfig = {
    lambda: config?.lambda ?? 0.2,
    limitMultiplier: config?.limitMultiplier ?? 2.4,
    baseErrorRate: config?.baseErrorRate ?? baseline.baselineErrorRate,
  };
  if (cfg.lambda === undefined || cfg.limitMultiplier === undefined || cfg.baseErrorRate === undefined) {
    return fail("monitor config is incomplete");
  }
  try {
    let state: EcddState = createEcdd(cfg);
    const alarms: number[] = [];
    for (let i = 0; i < errors.length; i++) {
      state = ecddUpdate(state, errors[i] as 0 | 1, cfg);
      if (state.alarmed) alarms.push(i);
    }
    if (state.n !== errors.length) {
      return fail(`kernel streamed ${state.n} observations, expected ${errors.length}`);
    }
    const p0 = cfg.baseErrorRate as number;
    const lambda = cfg.lambda as number;
    const L = cfg.limitMultiplier as number;
    const sigmaZ = Math.sqrt(p0 * (1 - p0)) * Math.sqrt(lambda / (2 - lambda));
    const ucl = p0 + L * sigmaZ;
    if (!Number.isFinite(state.level)) return fail(`kernel produced a non-finite EWMA level ${state.level}`);
    const delay = ecddWorstCaseDelay(cfg);
    if (!Number.isFinite(delay) || delay <= 0) {
      return fail(`kernel returned an impossible worst-case delay ${delay}`);
    }
    const first = alarms.length > 0 ? (alarms[0] as number) : null;
    const threshold = tolerance ?? 0;
    const drifted = first !== null && first <= threshold;
    return {
      ok: true,
      data: {
        verdict: drifted ? "ABSTAIN" : "FIRE",
        reasonCode: drifted ? "CONCEPT_DRIFT" : "PUBLISHED",
        notes: [
          `baseline window "${baseline.window}" at error rate ${p0}; UCL = ${fmt(ucl, 6)}; final EWMA level ${fmt(state.level, 6)}.`,
          alarms.length === 0
            ? "No EWMA control-limit breach in this stream."
            : `EWMA breached at observation(s) ${alarms.join(", ")} of ${errors.length}.`,
          "The EWMA level is an error rate, not a win rate; do not render it as one.",
        ],
        sourceModuleEnabled: null,
        baselineWindow: baseline.window,
        upperControlLimit: ucl,
        finalLevel: state.level,
        streamed: state.n,
        firstAlarmAt: first,
        alarms,
        worstCaseDelay: delay,
      },
    };
  } catch (err) {
    return fail(`ecdd monitor threw: ${errorText(err)}`);
  }
}

/**
 * Three-detector drift ensemble (ECDD + PUDD + Page-Hinkley) confirmed by
 * majority vote over a 3-week window. Every detector is seeded from the same
 * declared baseline, and the reference window is reported back.
 */
export function evalDriftMonitorEnsemble(input: {
  readonly baseline: DriftBaseline;
  readonly weeklyErrorRates: readonly number[];
  readonly weeklyBrier: readonly number[];
  readonly uncertainCounts: readonly number[];
  readonly totalCounts: readonly number[];
  readonly regimeShiftWeeks?: readonly number[];
  readonly totalWeeks?: number;
  readonly voteWindowWeeks?: number;
  readonly refWeeks?: number;
  readonly recentWeeks?: number;
}): DecisionEval<
  GateResult & {
    readonly baselineWindow: string;
    readonly alarms: readonly Alarm[];
    readonly confirmedEpisodes: readonly number[];
    readonly driftEval: {
      readonly detectionsPerEpisode: number;
      readonly falseAlarmsPerSeason: number;
      readonly add: number;
    } | null;
  }
> {
  const {
    baseline,
    weeklyErrorRates,
    weeklyBrier,
    uncertainCounts,
    totalCounts,
    regimeShiftWeeks,
    totalWeeks,
    voteWindowWeeks,
    refWeeks,
    recentWeeks,
  } = input;
  const bErr = baselineProblem(baseline);
  if (bErr !== null) return fail(bErr);
  const n = weeklyErrorRates.length;
  if (n === 0) return fail("weeklyErrorRates must be a non-empty weekly stream");
  if (weeklyBrier.length !== n) return fail("weeklyBrier must align with weeklyErrorRates");
  if (uncertainCounts.length !== n || totalCounts.length !== n) {
    return fail("uncertainCounts and totalCounts must align with weeklyErrorRates");
  }
  const ef = finiteProblem("weeklyErrorRates", weeklyErrorRates);
  if (ef !== null) return fail(ef);
  for (let i = 0; i < n; i++) {
    const e = weeklyErrorRates[i] as number;
    if (e < 0 || e > 1) return fail(`weeklyErrorRates[${i}] = ${e} is outside [0,1]`);
    const b = scalarProblem(`weeklyBrier[${i}]`, weeklyBrier[i] as number);
    if (b !== null) return fail(b);
    if ((weeklyBrier[i] as number) < 0) return fail(`weeklyBrier[${i}] is negative`);
    const u = scalarProblem(`uncertainCounts[${i}]`, uncertainCounts[i] as number);
    if (u !== null) return fail(u);
    const t = scalarProblem(`totalCounts[${i}]`, totalCounts[i] as number);
    if (t !== null) return fail(t);
    if ((uncertainCounts[i] as number) < 0 || (totalCounts[i] as number) <= 0) {
      return fail(
        `week ${i}: need 0 <= uncertain <= total and total > 0 (got uncertain=${uncertainCounts[i]}, total=${totalCounts[i]})`,
      );
    }
    if ((uncertainCounts[i] as number) > (totalCounts[i] as number)) {
      return fail(`week ${i}: uncertain count exceeds total count`);
    }
  }
  const rw = refWeeks ?? Math.min(8, n);
  const rWeeks = recentWeeks ?? 3;
  if (!Number.isInteger(rw) || rw < 2) return fail(`refWeeks = ${rw} must be an integer >= 2`);
  if (!Number.isInteger(rWeeks) || rWeeks < 1) return fail(`recentWeeks = ${rWeeks} must be an integer >= 1`);
  const vw = voteWindowWeeks ?? 3;
  if (!Number.isInteger(vw) || vw < 1) return fail(`voteWindowWeeks = ${vw} must be an integer >= 1`);
  if (regimeShiftWeeks !== undefined && totalWeeks === undefined) {
    return fail("totalWeeks must be supplied with regimeShiftWeeks so false alarms can be normalised");
  }
  if (totalWeeks !== undefined && (!Number.isInteger(totalWeeks) || totalWeeks <= 0)) {
    return fail(`totalWeeks = ${totalWeeks} must be a positive integer`);
  }
  if (regimeShiftWeeks !== undefined) {
    const rf = finiteProblem("regimeShiftWeeks", regimeShiftWeeks);
    if (rf !== null) return fail(rf);
    for (let i = 0; i < regimeShiftWeeks.length; i++) {
      const w = regimeShiftWeeks[i] as number;
      if (!Number.isInteger(w) || w < 0) {
        return fail(`regimeShiftWeeks[${i}] = ${w} must be a non-negative week index`);
      }
    }
  }
  try {
    const alarms: Alarm[] = [];
    // PUDD is a two-sample test: it needs a reference window to compare against.
    const pudd = new Pudd(rw, rWeeks, 3);
    const pageHinkley = new PageHinkley(0.005, 0.2);
    const stream: Array<{ err: number; brier: number; u: number; t: number }> = [];
    for (let i = 0; i < n; i++) {
      stream.push({
        err: weeklyErrorRates[i] as number,
        brier: weeklyBrier[i] as number,
        u: uncertainCounts[i] as number,
        t: totalCounts[i] as number,
      });
    }
    for (const week of stream) {
      const ph = pageHinkley.update(week.brier);
      if (ph) alarms.push({ detector: "pageHinkley", week: alarms.length });
      const pd = pudd.update(week.u, week.t);
      if (pd) alarms.push({ detector: "pudd", week: alarms.length });
    }
    // The monitoring-module ECDD class is distinct from drift/ecdd-monitor's
    // functional kernel, and is seeded from the SAME declared baseline.
    const ecdd = new MonitoringEcdd(baseline.baselineErrorRate, 0.2, 3, 0.02);
    let weekIdx = 0;
    for (const week of stream) {
      const fired = ecdd.update(week.err);
      if (fired) alarms.push({ detector: "ecdd", week: weekIdx });
      weekIdx++;
    }
    const episodes = majorityVote(alarms, vw);
    let driftEval: {
      readonly detectionsPerEpisode: number;
      readonly falseAlarmsPerSeason: number;
      readonly add: number;
    } | null = null;
    if (regimeShiftWeeks !== undefined && totalWeeks !== undefined) {
      const e = evaluateDrift(episodes, regimeShiftWeeks, totalWeeks, 4);
      if (!Number.isFinite(e.detectionsPerEpisode) || e.detectionsPerEpisode < 0) {
        return fail(`kernel returned an impossible detectionsPerEpisode ${e.detectionsPerEpisode}`);
      }
      if (!Number.isFinite(e.falseAlarmsPerSeason) || e.falseAlarmsPerSeason < 0) {
        return fail(`kernel returned an impossible falseAlarmsPerSeason ${e.falseAlarmsPerSeason}`);
      }
      driftEval = {
        detectionsPerEpisode: e.detectionsPerEpisode,
        falseAlarmsPerSeason: e.falseAlarmsPerSeason,
        add: e.add,
      };
    }
    return {
      ok: true,
      data: {
        verdict: episodes.length > 0 ? "ABSTAIN" : "FIRE",
        reasonCode: episodes.length > 0 ? "CONCEPT_DRIFT" : "PUBLISHED",
        notes: [
          `baseline window "${baseline.window}" at error rate ${baseline.baselineErrorRate}.`,
          `PUDD reference window = ${rw} week(s), recent window = ${rWeeks} week(s); majority-vote window = ${vw} week(s).`,
          episodes.length === 0
            ? "No two detectors fired inside one vote window: no confirmed drift episode."
            : `Confirmed episode(s) at week(s) ${episodes.join(", ")} (>= 2 of 3 detectors inside the vote window).`,
          "detector week indices in `alarms` are alarm-order indices, not calendar weeks -- the kernel records them as it fires.",
        ],
        sourceModuleEnabled: null,
        baselineWindow: baseline.window,
        alarms,
        confirmedEpisodes: episodes,
        driftEval,
      },
    };
  } catch (err) {
    return fail(`drift monitor ensemble threw: ${errorText(err)}`);
  }
}

// ===========================================================================
// (d) evaluation/ -- metric and model-selection gates
// ===========================================================================

/**
 * Metric discrimination gate. A metric is admissible only if it ranks a
 * known-good forecaster strictly above BOTH a marginal-matched noise model
 * and a constant forecaster. CRPS-Sum is included so the misranking it causes
 * is visible, and is BANNED from model selection regardless of its verdict.
 */
export function evalDiscriminationGate(input: {
  readonly cases: readonly DiscriminationCase[];
  readonly metrics?: readonly { readonly name: string; readonly fn: ScoreFn }[];
}): DecisionEval<
  GateResult & {
    readonly perMetric: ReadonlyArray<{
      readonly metric: string;
      readonly discriminates: boolean;
      readonly good: number;
      readonly noise: number;
      readonly constant: number;
    }>;
    readonly bannedMetrics: readonly string[];
  }
> {
  const { cases, metrics } = input;
  if (!Array.isArray(cases) || cases.length === 0) {
    return fail("cases must be non-empty -- a discrimination gate with no case is no gate");
  }
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i] as DiscriminationCase;
    if (typeof c.name !== "string" || c.name.length === 0) {
      return fail(`cases[${i}].name must be a non-empty string`);
    }
    if (c.outcome.length === 0) return fail(`cases[${i}].outcome must be non-empty`);
    const dims = c.outcome.length;
    for (const pair of [
      ["good", c.good],
      ["noise", c.noise],
      ["constant", c.constant],
    ] as Array<[string, number[][]]>) {
      const rows = pair[1];
      if (!Array.isArray(rows) || rows.length === 0) {
        return fail(`cases[${i}].${pair[0]} must be a non-empty ensemble`);
      }
      for (let m = 0; m < rows.length; m++) {
        const row = rows[m] as number[];
        if (row.length !== dims) {
          return fail(`cases[${i}].${pair[0]}[${m}] has ${row.length} dimensions, expected ${dims}`);
        }
        const f = finiteProblem(`cases[${i}].${pair[0]}[${m}]`, row);
        if (f !== null) return fail(f);
      }
    }
    const of = finiteProblem(`cases[${i}].outcome`, c.outcome);
    if (of !== null) return fail(of);
  }
  const active: Array<{ name: string; fn: ScoreFn }> =
    metrics === undefined
      ? [
          { name: "meanCrps", fn: meanCrps },
          { name: "energyScore", fn: energyScore },
          { name: "crpsSum", fn: crpsSum },
        ]
      : [...metrics];
  if (active.length === 0) return fail("metrics must be non-empty when supplied");
  try {
    const perMetric = active.map((m) => {
      const v = discriminationGate(m.name, m.fn, cases);
      return {
        metric: v.metric,
        discriminates: v.discriminates,
        good: v.scores.good,
        noise: v.scores.noise,
        constant: v.scores.constant,
      };
    });
    for (const r of perMetric) {
      for (const pair of [
        ["good", r.good],
        ["noise", r.noise],
        ["constant", r.constant],
      ] as Array<[string, number]>) {
        if (!Number.isFinite(pair[1])) {
          return fail(`metric ${r.metric} returned a non-finite ${pair[0]} score`);
        }
      }
    }
    const banned = perMetric.filter((r) => !r.discriminates).map((r) => r.metric);
    return {
      ok: true,
      data: {
        verdict: banned.length === perMetric.length ? "NO_BET" : "HUMAN_REVIEW",
        reasonCode: banned.length === perMetric.length ? "METRIC_MISRANKS" : "PUBLISHED",
        notes:
          banned.length === 0
            ? ["Every supplied metric ranks the known-good forecaster above both dummies."]
            : [
                `Metric(s) that MISRANK (a dummy beats or ties the known-good forecaster): ${banned.join(", ")}. These are banned from model selection.`,
                "Lower score is better for all three metrics here.",
              ],
        sourceModuleEnabled: null,
        perMetric,
        bannedMetrics: banned,
      },
    };
  } catch (err) {
    return fail(`discriminationGate threw: ${errorText(err)}`);
  }
}

/**
 * Four-part model scorecard. The honesty floor is CALLER-SUPPLIED: the bridge
 * never invents, lowers or softens a threshold (a floor change is a founder
 * action), it only compares the measured Brier against what the caller
 * declared.
 */
export function evalModelScorecard(input: {
  readonly games: readonly GameEval[];
  readonly predictedWins: Readonly<Record<string, number>>;
  readonly actualWins: Readonly<Record<string, number>>;
  readonly tiers: TierSets;
  readonly maxBrier: number;
  readonly edgeThreshold?: number;
  readonly comparisonScorecard?: Scorecard;
}): DecisionEval<
  GateResult & {
    readonly scorecard: Scorecard;
    readonly rankingDisagreements: readonly string[];
  }
> {
  const { games, predictedWins, actualWins, tiers, maxBrier, edgeThreshold, comparisonScorecard } =
    input;
  if (!Array.isArray(games) || games.length === 0) return fail("games must be non-empty");
  for (let i = 0; i < games.length; i++) {
    const g = games[i] as GameEval;
    const p = unitIntervalProblem(`games[${i}].predicted`, g.predicted, 0, 1);
    if (p !== null) return fail(p);
    if (g.actual !== 0 && g.actual !== 1) return fail(`games[${i}].actual must be 0|1`);
    const c = unitIntervalProblem(`games[${i}].closingHomeProb`, g.closingHomeProb, 0, 1);
    if (c !== null) return fail(c);
  }
  const floor = unitIntervalProblem("maxBrier", maxBrier, 1e-9, 0.5);
  if (floor !== null) {
    return fail(`${floor}; the bridge refuses to invent or widen a Brier floor`);
  }
  const pw = Object.values(predictedWins);
  const aw = Object.values(actualWins);
  if (pw.length !== aw.length || pw.length < 2) {
    return fail("predictedWins and actualWins must hold the same number of teams (>= 2)");
  }
  const pf = finiteProblem("predictedWins", pw);
  if (pf !== null) return fail(pf);
  const af = finiteProblem("actualWins", aw);
  if (af !== null) return fail(af);
  if (tiers === null || typeof tiers !== "object") return fail("tiers must be a TierSets object");
  for (const pair of [
    ["predictedPlayoff", tiers.predictedPlayoff],
    ["actualPlayoff", tiers.actualPlayoff],
    ["predictedDivision", tiers.predictedDivision],
    ["actualDivision", tiers.actualDivision],
  ] as Array<[string, ReadonlySet<string>]>) {
    if (!(pair[1] instanceof Set)) return fail(`tiers.${pair[0]} must be a Set of team names`);
    if (pair[1].size === 0) return fail(`tiers.${pair[0]} is empty`);
  }
  if (edgeThreshold !== undefined) {
    const e = unitIntervalProblem("edgeThreshold", edgeThreshold, 0, 1);
    if (e !== null) return fail(e);
  }
  try {
    const s = scorecard(
      games.map((g) => ({ ...g })),
      predictedWins,
      actualWins,
      {
        predictedPlayoff: tiers.predictedPlayoff,
        actualPlayoff: tiers.actualPlayoff,
        predictedDivision: tiers.predictedDivision,
        actualDivision: tiers.actualDivision,
      },
      edgeThreshold ?? 0.03,
    );
    for (const pair of [
      ["brier", s.fitness.brier],
      ["rmse", s.fitness.rmse],
      ["logLoss", s.fitness.logLoss],
      ["tableCorrelation", s.tableCorrelation],
    ] as Array<[string, number]>) {
      if (!Number.isFinite(pair[1])) return fail(`kernel returned a non-finite ${pair[0]}`);
    }
    if (s.fitness.brier < 0) return fail(`kernel returned a negative Brier ${s.fitness.brier}`);
    if (s.betting.nBets < 0) return fail(`kernel returned a negative bet count ${s.betting.nBets}`);
    const overFloor = s.fitness.brier > maxBrier;
    const disagreements =
      comparisonScorecard === undefined ? [] : rankingDisagreements(s, comparisonScorecard);
    return {
      ok: true,
      data: {
        verdict: overFloor ? "NO_BET" : "FIRE",
        reasonCode: overFloor ? "BRIER_ABOVE_CALLER_FLOOR" : "PUBLISHED",
        notes: [
          `Brier ${fmt(s.fitness.brier, 6)} vs the caller-declared floor ${maxBrier}; RMSE ${fmt(s.fitness.rmse, 6)}, log loss ${fmt(s.fitness.logLoss, 6)}.`,
          `Betting sim: ${s.betting.nBets} bet(s), ROI ${fmt(s.betting.roi)}, CLV ${fmt(s.betting.clv)} (probability points).`,
          s.betting.nBets === 0
            ? "No bet crossed the edge threshold: the ROI and CLV reads are 0 by construction, not by performance."
            : "ROI is profit per unit staked; it is not a win rate.",
        ],
        sourceModuleEnabled: null,
        scorecard: s,
        rankingDisagreements: [...disagreements],
      },
    };
  } catch (err) {
    return fail(`model scorecard threw: ${errorText(err)}`);
  }
}

/** Murphy diagram + Diebold-Mariano for quantile forecasts. */
export function evalMurphyDiagram(input: {
  readonly actuals: readonly number[];
  readonly forecastA: readonly number[];
  readonly forecastB: readonly number[];
  readonly tau: number;
  readonly thetas: readonly number[];
  readonly dmTest?: boolean;
}): DecisionEval<
  GateResult & {
    readonly diagram: ReadonlyArray<{ theta: number; diff: number; integratedDiff: number }>;
    readonly integratedDiff: number;
    readonly meanPinballDiff: number;
    readonly dm: { dm: number; pValue: number; meanDiff: number } | null;
  }
> {
  const { actuals, forecastA, forecastB, tau, thetas, dmTest } = input;
  if (!Array.isArray(actuals) || actuals.length === 0) return fail("actuals must be non-empty");
  if (actuals.length !== forecastA.length || actuals.length !== forecastB.length) {
    return fail("actuals / forecastA / forecastB must be the same length");
  }
  const af = finiteProblem("actuals", actuals);
  if (af !== null) return fail(af);
  const a1 = finiteProblem("forecastA", forecastA);
  if (a1 !== null) return fail(a1);
  const a2 = finiteProblem("forecastB", forecastB);
  if (a2 !== null) return fail(a2);
  const t = unitIntervalProblem("tau", tau, 0, 1);
  if (t !== null) return fail(`${t}; a quantile level must be strictly inside (0,1)`);
  if (tau <= 0 || tau >= 1) return fail(`tau = ${tau} must be strictly inside (0,1)`);
  if (!Array.isArray(thetas) || thetas.length < 2) {
    return fail("thetas must contain at least 2 grid points to integrate a Murphy diagram");
  }
  const tf = finiteProblem("thetas", thetas);
  if (tf !== null) return fail(tf);
  try {
    const diagram = murphyDiagram(actuals, forecastA, forecastB, tau, thetas);
    for (let i = 0; i < diagram.length; i++) {
      const row = diagram[i] as { theta: number; diff: number; integratedDiff: number };
      if (!Number.isFinite(row.diff)) return fail(`kernel returned a non-finite diff at theta ${row.theta}`);
    }
    const mpd = meanPinballDiff(actuals, forecastA, forecastB, tau);
    if (!Number.isFinite(mpd)) return fail(`kernel returned a non-finite mean pinball difference ${mpd}`);
    let dm: { dm: number; pValue: number; meanDiff: number } | null = null;
    if (dmTest === true) {
      const lossesA = actuals.map((y, i) => pinballLossLocal(y, forecastA[i] as number, tau));
      const lossesB = actuals.map((y, i) => pinballLossLocal(y, forecastB[i] as number, tau));
      const r = dieboldMariano(lossesA, lossesB);
      if (!Number.isFinite(r.dm) || !Number.isFinite(r.pValue)) {
        return fail("kernel returned a non-finite Diebold-Mariano result");
      }
      if (r.pValue < 0 || r.pValue > 1) return fail(`kernel returned pValue ${r.pValue} outside [0,1]`);
      dm = { dm: r.dm, pValue: r.pValue, meanDiff: r.meanDiff };
    }
    const allNegative = diagram.every((row) => (row as { diff: number }).diff < 0);
    const allPositive = diagram.every((row) => (row as { diff: number }).diff > 0);
    const integrated = (diagram[0] as { integratedDiff: number }).integratedDiff;
    return {
      ok: true,
      data: {
        // Negative diff favours forecast A. Uniform sign is the strong result.
        verdict: allNegative ? "FIRE" : allPositive ? "NO_BET" : "HUMAN_REVIEW",
        reasonCode: allNegative
          ? "DOMINATES_ON_EVERY_THETA"
          : allPositive
            ? "LOSS_DIFFERENCE_NOT_UNIFORM"
            : "LOSS_DIFFERENCE_NOT_UNIFORM",
        notes: [
          `tau = ${tau}; integrated Murphy difference ${fmt(integrated, 6)}; mean pinball difference ${fmt(mpd, 6)} (negative favours forecast A).`,
          allNegative
            ? "Forecast A dominates on EVERY theta: uniform dominance, which is stronger evidence than a scalar pinball delta."
            : allPositive
              ? "Forecast B dominates on every theta."
              : "The sign flips across theta: theta-local dominance. Treat as inconclusive, not as a win for either side.",
          dm === null ? "Set dmTest to add the Newey-West Diebold-Mariano p-value." : `DM p = ${fmt(dm.pValue, 6)}.`,
        ],
        sourceModuleEnabled: null,
        diagram: diagram.map((r) => ({ ...r })),
        integratedDiff: integrated,
        meanPinballDiff: mpd,
        dm,
      },
    };
  } catch (err) {
    return fail(`murphy diagram threw: ${errorText(err)}`);
  }
}

// Local pinball so the DM loss series uses the same convention as the module
// under test (y, q, tau) without depending on a colliding name.
function pinballLossLocal(y: number, q: number, tau: number): number {
  const e = y - q;
  return e >= 0 ? tau * e : (tau - 1) * e;
}

/** Accuracy vs classwise-ECE two-branch model bake-off. */
export function evalSelectionMetricBakeOff(input: {
  readonly candidates: readonly CandidateResult[];
  readonly eceImprovementPp?: number;
  readonly roiEceFixed?: number;
  readonly roiAccFixed?: number;
  readonly roiEceKelly?: number;
  readonly roiAccKelly?: number;
  readonly stakeProbe?: { prob: number; decimalOdds: number; kellyFraction: number };
}): DecisionEval<
  GateResult & {
    readonly accuracyWinner: string;
    readonly eceWinner: string;
    readonly eceImprovementPp: number;
    readonly accuracyOfEceWinner: number;
    readonly accuracyOfAccuracyWinner: number;
    readonly winnerEce: number;
    readonly probeStake: number | null;
    readonly selectionVerdict: string | null;
  }
> {
  const {
    candidates,
    eceImprovementPp,
    roiEceFixed,
    roiAccFixed,
    roiEceKelly,
    roiAccKelly,
    stakeProbe,
  } = input;
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return fail("candidates must contain at least 2 models to run a bake-off");
  }
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i] as CandidateResult;
    if (typeof c.name !== "string" || c.name.length === 0) {
      return fail(`candidates[${i}].name must be a non-empty string`);
    }
    if (!Array.isArray(c.forecasts) || c.forecasts.length === 0) {
      return fail(`candidates[${i}].forecasts must be non-empty`);
    }
    for (let j = 0; j < c.forecasts.length; j++) {
      const f = c.forecasts[j] as Forecast;
      const p = unitIntervalProblem(`candidates[${i}].forecasts[${j}].prob`, f.prob, 0, 1);
      if (p !== null) return fail(p);
      if (f.outcome !== 0 && f.outcome !== 1) {
        return fail(`candidates[${i}].forecasts[${j}].outcome must be 0|1`);
      }
    }
  }
  const roiArgs = [roiEceFixed, roiAccFixed, roiEceKelly, roiAccKelly];
  const suppliedRoi = roiArgs.filter((v) => v !== undefined).length;
  if (suppliedRoi !== 0 && suppliedRoi !== 4) {
    return fail("supply all four ROI readings (roiEceFixed / roiAccFixed / roiEceKelly / roiAccKelly) or none");
  }
  for (const v of roiArgs) {
    if (v === undefined) continue;
    const p = scalarProblem("roi", v);
    if (p !== null) return fail(p);
  }
  if (stakeProbe !== undefined) {
    const p = unitIntervalProblem("stakeProbe.prob", stakeProbe.prob, 1e-9, 1 - 1e-9);
    if (p !== null) return fail(p);
    const o = scalarProblem("stakeProbe.decimalOdds", stakeProbe.decimalOdds);
    if (o !== null) return fail(o);
    if (stakeProbe.decimalOdds <= 1) {
      return fail(`stakeProbe.decimalOdds = ${stakeProbe.decimalOdds} must be > 1`);
    }
    const k = unitIntervalProblem("stakeProbe.kellyFraction", stakeProbe.kellyFraction, 1e-9, 1 / 8);
    if (k !== null) return fail(`${k}; the sizing rule caps the fraction at 1/8`);
  }
  let probeStake: number | null = null;
  try {
    if (stakeProbe !== undefined) {
      probeStake = fractionalKellyStake(
        stakeProbe.prob,
        stakeProbe.decimalOdds,
        stakeProbe.kellyFraction,
      );
      if (!Number.isFinite(probeStake) || probeStake < 0) {
        return fail(`kernel returned an impossible fractional-Kelly stake ${probeStake}`);
      }
      if (probeStake > stakeProbe.kellyFraction + 1e-12) {
        return fail(`kernel returned a stake ${probeStake} above the 1/8 sizing cap`);
      }
    }
    const bakeOffInput = candidates.map((c: CandidateResult) => ({
      name: c.name,
      forecasts: c.forecasts.map((f: Forecast): Forecast => ({ prob: f.prob, outcome: f.outcome })),
    }));
    const r = bakeOff(bakeOffInput);
    for (const pair of [
      ["eceImprovementPp", r.eceImprovementPp],
      ["accuracyOfEceWinner", r.accuracyOfEceWinner],
      ["accuracyOfAccuracyWinner", r.accuracyOfAccuracyWinner],
    ] as Array<[string, number]>) {
      if (!Number.isFinite(pair[1])) return fail(`kernel returned a non-finite ${pair[0]}`);
    }
    let winnerEce = 0;
    for (const c of candidates) {
      if (c.name === r.eceWinner) {
        winnerEce = classwiseEce(c.forecasts).ece;
      }
    }
    if (!Number.isFinite(winnerEce) || winnerEce < 0) {
      return fail(`kernel returned an impossible classwise ECE ${winnerEce}`);
    }
    // The guard (>= 80% non-empty bins) is a REAL precondition; the kernel
    // throws on failure and the bridge must not paper over it.
    const accCheck = accuracy(candidates[0]!.forecasts);
    if (!Number.isFinite(accCheck) || accCheck < 0 || accCheck > 1) {
      return fail(`kernel returned an impossible accuracy ${accCheck}`);
    }
    let verdict: string | null = null;
    if (suppliedRoi === 4 && eceImprovementPp !== undefined) {
      verdict = selectionVerdict(
        eceImprovementPp,
        roiEceFixed as number,
        roiAccFixed as number,
        roiEceKelly as number,
        roiAccKelly as number,
      );
    }
    return {
      ok: true,
      data: {
        verdict:
          verdict === "adopt-ece" ? "FIRE" : verdict === "reject" ? "NO_BET" : "HUMAN_REVIEW",
        reasonCode:
          verdict === "adopt-ece"
            ? "PUBLISHED"
            : verdict === "reject"
              ? "ECE_SELECTION_REJECTED"
              : "ECE_SELECTION_INCONCLUSIVE",
        notes: [
          `accuracy winner "${r.accuracyWinner}" (${fmt(r.accuracyOfAccuracyWinner)}); classwise-ECE winner "${r.eceWinner}" (ECE ${fmt(winnerEce, 6)}); improvement ${fmt(r.eceImprovementPp, 3)} pp.`,
          "Accuracy is a hit rate; classwise ECE is a calibration gap. They answer different questions and the doctrine prefers ECE for the probability engine.",
          verdict === null
            ? "Supply eceImprovementPp plus the four ROI readings to get a selection verdict."
            : `Pre-registered selection verdict: ${verdict}.`,
        ],
        sourceModuleEnabled: null,
        accuracyWinner: r.accuracyWinner,
        eceWinner: r.eceWinner,
        eceImprovementPp: r.eceImprovementPp,
        accuracyOfEceWinner: r.accuracyOfEceWinner,
        accuracyOfAccuracyWinner: r.accuracyOfAccuracyWinner,
        winnerEce,
        probeStake,
        selectionVerdict: verdict,
      },
    };
  } catch (err) {
    return fail(`bake-off threw: ${errorText(err)}`);
  }
}
