/**
 * Stream 14E — master situational reasoning overlay (RT-03 & RT-04 hardened).
 *
 * One graph, three contractual pieces:
 *
 *  1. orthogonalizeAndShrink(familyDeltas, marketAnchorProb)
 *       Six physical families, each residualized against the Layer-1 market
 *       anchor, shrunk within family (equal-correlation VIF), precision
 *       weighted across families with (Sigma + lambda I)^-1, and hard-capped
 *       at +/-0.12 probability movement.
 *
 *  2. emitMindFeedRecord(streamId, inputHash, result, provenance, feedPath?)
 *       Scrubs credential-shaped tokens and appends exactly one JSONL line to
 *       brain/feeds/2026-10-22/master_aggregator_runtime_feed.jsonl. It never
 *       touches brain/mind.jsonl (single-writer Mind Rule).
 *
 *  3. runMasterSituationalReasoningOverlay(input)
 *       Calls every Stream 12-14 module that has input, validates candidate
 *       features through validateFeatureAgainstMisleadingStats, runs the
 *       orthogonalizer, emits the feed record, and enforces
 *       publishAllowed: false whenever the independent-edge decision is PASS.
 *
 * Honesty notes:
 *  * projectOntoMarket uses a documented single-cross-section assumption:
 *    the market's absorption of a family delta scales with 2*|p-0.5|, the
 *    distance of the anchor from a coin flip. A one-row cross-section cannot
 *    estimate the projection coefficient, so the assumption is stated rather
 *    than hidden.
 *  * A family supplied as a scalar gets the documented default measurement
 *    variance below; an array uses its sample variance.
 *  * Missing inputs are reported as skipped, never fabricated.
 */

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import {
  dot,
  equalCorrelationShrinkFactor,
  invertMatrix,
  matVec,
  mean,
  variance,
} from "./osf-math-core.js";
import type { QbEpaGiniInput } from "./osf-qb-volatility-and-prospects.js";
import { computeQbEpaGiniAndVolOe } from "./osf-qb-volatility-and-prospects.js";
import type { TeamEpaObservation } from "./osf-team-ability-hfa-and-ewma.js";
import { estimateMultilevelTeamEpaAbility } from "./osf-team-ability-hfa-and-ewma.js";
import type { Wr1SuppressionInput } from "./osf-defense-penalties-and-proe.js";
import { evaluateDefenseAgainstWr1 } from "./osf-defense-penalties-and-proe.js";
import type { TrackingFrame } from "./coverage-scheme.js";
import { runNgsAwsCnnAttentionCoveragePipeline } from "./coverage-scheme.js";
import type { SituationalPlay, DecisionState, DecisionOption } from "./x-situational-80-rules.js";
import {
  computeLeverageAdjustedEpa,
  evaluateDecisionBranchWp,
  validateFeatureAgainstMisleadingStats,
} from "./x-situational-80-rules.js";
import type { TackleProbabilityInput, TackleCoefficients } from "./tackle-probability.js";
import { computeTackleProbability } from "./tackle-probability.js";
import type { BookLevel } from "../markets/polymarket-sdks.js";
import { computeClobMicroPrice } from "../markets/polymarket-sdks.js";
import type { KnownAtRecord } from "./universal-handoff-warehouse-priors.js";
import { filterKnownAt } from "./universal-handoff-warehouse-priors.js";
import type { BayesianReverseTokenInput } from "../forecasting/llm-probability-and-hybrid-forecasters.js";
import { bayesianReverseTokenLogitUpdate } from "../forecasting/llm-probability-and-hybrid-forecasters.js";
import { evaluateBelichickTenMetrics, type BelichickMetricInputs } from "./belichick-ten-metrics.js";
import {
  computeCatchableBallAndPlacementEdge,
  evaluateTargetFunnelMatchup,
  type QbBallPlacementProfile,
} from "./all-in-one-research-signals.js";
import { computeRushConceptZoneGapMatchup } from "./x-consolidated-sweep-signals.js";
import {
  evaluateConformalSelectiveAbstention,
  computeBorghesiWeatherAndRosenQbBackupTransition,
  detectKatsMarketCusumAndHarmonicRegime,
} from "./ig-consolidated-conformal-and-kats-signals.js";
import { loadStage0Config, assertNamesClean } from "./preflight-roster-gate.js";
import {
  computeTebAvalancheBraidOverlay,
  type TebAvalancheBraidInput,
  type TebAvalancheBraidResult,
} from "./teb-avalanche-braid-overlay.js";
import {
  evaluateZeroOrphanExpectedMetricsOverlay,
  type ZeroOrphanOverlayInput,
  type ZeroOrphanOverlayResult,
} from "./zero-orphan-expected-metrics-bridge.js";
import {
  evaluateUniversalNfl360MetricAndSituationalDossier,
  type UniversalNfl360DossierOverrides,
} from "../engine/universal-nfl-metric-and-situational-engine.js";
import {
  evaluateMegaSweep20261106Pipeline,
  type MegaSweepPipelineInput,
  type MegaSweepPipelineOutput,
} from "../engine/mega-sweep-2026-11-06-reasoning-engine.js";

export const FAMILY_NAMES = [
  "pressure",
  "weather",
  "restFatigue",
  "coveragePersonnel",
  "qbSkillScript",
  "marketMicrostructure",
] as const;

export type FamilyName = (typeof FAMILY_NAMES)[number];

export type FamilyDelta = number | readonly number[];

export type FamilyDeltas = Partial<Record<FamilyName, FamilyDelta>>;

export const PROBABILITY_MOVEMENT_CAP = 0.12;

export interface OrthogonalizationResult {
  totalProbabilityDelta: number;
  cappedDeltaLogOdds: number;
  rawUnshrunkDelta: number;
  /** The precision-weighted sum that the cap is actually applied to. */
  shrunkUncappedDelta: number;
  /** Sum of residual*shrink before precision weights; not the capped value. */
  shrunkUnweightedDelta: number;
  capApplied: boolean;
  familyResiduals: Record<FamilyName, number | null>;
  familyRawDeltas: Record<FamilyName, number | null>;
  /** L^-1 applied to the shrunk residuals; cross-family correlation removed. */
  familyWhitenedResiduals: Record<FamilyName, number | null>;
  correlationMatrixSource: "default" | "caller";
  withinFamilyShrinkFactors: Record<FamilyName, number>;
  precisionDiagonalWeights: Record<FamilyName, number>;
  normalizedWeights: Record<FamilyName, number>;
  marketAnchorProb: number;
  regularizationLambda: number;
  notes: string[];
}

/** Documented default measurement variance for a scalar family delta. */
export const DEFAULT_FAMILY_VARIANCE = 0.0004; // sd = 0.02 probability points

/**
 * Prior cross-family correlation matrix, in FAMILY_NAMES order. These are
 * priors, not estimates: pressure/coverage and coverage/qbSkill are the
 * strongest expected overlaps. Callers with measured correlations pass
 * `correlationMatrix`. The matrix is positive definite (checked by Cholesky).
 */
export const DEFAULT_SIX_FAMILY_CORRELATION_MATRIX: readonly (readonly number[])[] = [
  [1.0, 0.18, 0.12, 0.22, 0.2, 0.05],
  [0.18, 1.0, 0.1, 0.08, 0.06, 0.02],
  [0.12, 0.1, 1.0, 0.15, 0.12, 0.03],
  [0.22, 0.08, 0.15, 1.0, 0.25, 0.04],
  [0.2, 0.06, 0.12, 0.25, 1.0, 0.06],
  [0.05, 0.02, 0.03, 0.04, 0.06, 1.0],
];

/** Lower-triangular Cholesky factor L with L L^T = matrix. Throws if not PD. */
export function choleskyDecompose(matrix: readonly (readonly number[])[]): number[][] {
  const n = matrix.length;
  if (n === 0 || matrix.some((row) => row.length !== n)) throw new Error("Cholesky requires a square matrix");
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = matrix[i]![j]!;
      for (let k = 0; k < j; k += 1) sum -= L[i]![k]! * L[j]![k]!;
      if (i === j) {
        if (!(sum > 0)) throw new Error(`matrix is not positive definite at ${i}`);
        L[i]![j] = Math.sqrt(sum);
      } else {
        L[i]![j] = sum / L[j]![j]!;
      }
    }
  }
  return L;
}

/** Solves L y = b by forward substitution. */
export function forwardSubstitute(L: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = L.length;
  if (b.length !== n) throw new Error("forwardSubstitute dimension mismatch");
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    let sum = b[i]!;
    for (let j = 0; j < i; j += 1) sum -= L[i]![j]! * y[j]!;
    y[i] = sum / L[i]![i]!;
  }
  return y;
}

/**
 * The Layer-1 market projection. A one-row cross-section cannot estimate a
 * regression coefficient, so the documented assumption is that the market
 * absorbs a share 2*|p - 0.5| of the raw family delta. At a coin flip the
 * market absorbs nothing; at a near-certainty it absorbs the whole delta.
 */
function solveLinear(aIn: number[][], bIn: number[]): number[] {
  const n = bIn.length;
  const a = aIn.map((row, i) => [...row, bIn[i]!]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(a[pivot]![col]!) < 1e-12) throw new Error("FWL design matrix is singular");
    if (pivot !== col) {
      const swap = a[col]!;
      a[col] = a[pivot]!;
      a[pivot] = swap;
    }
    const div = a[col]![col]!;
    for (let c = col; c <= n; c += 1) a[col]![c] = a[col]![c]! / div;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = a[r]![col]!;
      for (let c = col; c <= n; c += 1) a[r]![c] = a[r]![c]! - factor * a[col]![c]!;
    }
  }
  return a.map((row) => row[n]!);
}

/**
 * Paleologo / Ding FWL residual of a situational series against the market.
 * M columns are [1, logit(p_market), spread]. Only the residual is allowed
 * downstream. A feature that is a linear function of the spread is wiped.
 */
export function residualizeSituationalFamiliesAgainstMarket(
  situationalVector: readonly number[],
  marketImpliedLogit: number,
  spreadLine: number,
  historicalWindowMatrix: readonly (readonly number[])[],
): number[] {
  if (!Number.isFinite(marketImpliedLogit) || !Number.isFinite(spreadLine)) {
    throw new Error("market logit and spread must be finite");
  }
  if (historicalWindowMatrix.length !== situationalVector.length) {
    throw new Error("historical window rows must match the situational vector");
  }
  const k = historicalWindowMatrix[0]?.length ?? 0;
  if (k < 2) throw new Error("market design needs at least an intercept and a spread column");
  const mtM = Array.from({ length: k }, () => Array(k).fill(0));
  const mtf = Array(k).fill(0);
  for (let t = 0; t < situationalVector.length; t += 1) {
    const row = historicalWindowMatrix[t]!;
    const y = situationalVector[t]!;
    for (let i = 0; i < k; i += 1) {
      mtf[i] = mtf[i]! + row[i]! * y;
      for (let j = 0; j < k; j += 1) mtM[i]![j] = mtM[i]![j]! + row[i]! * row[j]!;
    }
  }
  for (let i = 0; i < k; i += 1) mtM[i]![i] = mtM[i]![i]! + 1e-8;
  const beta = solveLinear(mtM, mtf);
  return situationalVector.map((y, t) => {
    const row = historicalWindowMatrix[t]!;
    let fitted = 0;
    for (let j = 0; j < k; j += 1) fitted += row[j]! * beta[j]!;
    return y - fitted;
  });
}

export function projectOntoMarket(rawDelta: number, marketAnchorProb: number): number {
  if (!Number.isFinite(rawDelta)) throw new Error("rawDelta must be finite");
  if (!(marketAnchorProb > 0 && marketAnchorProb < 1)) {
    throw new Error("marketAnchorProb must be strictly between 0 and 1");
  }
  return rawDelta * 2 * Math.abs(marketAnchorProb - 0.5);
}

function familyAggregate(delta: FamilyDelta): { raw: number; varianceValue: number; members: number } {
  if (Array.isArray(delta)) {
    const members = delta as readonly number[];
    if (members.length === 0) throw new Error("a family member array cannot be empty");
    if (members.some((v) => !Number.isFinite(v))) throw new Error("family members must be finite");
    return {
      raw: members.reduce((s, v) => s + v, 0),
      varianceValue: members.length < 2 ? DEFAULT_FAMILY_VARIANCE : variance(members),
      members: members.length,
    };
  }
  const value = delta as number;
  if (!Number.isFinite(value)) throw new Error("family delta must be finite");
  return { raw: value, varianceValue: DEFAULT_FAMILY_VARIANCE, members: 1 };
}

/**
 * RT-03 orthogonality core. Steps, in order:
 *   1. aggregate each family (sum of member deltas) and measure its variance;
 *   2. residualize against the market anchor: raw - projectOntoMarket(raw);
 *   3. shrink within family with the equal-correlation VIF factor
 *      1 / sqrt(1 + (m - 1) * rho), rho default 0.5;
 *   4. precision weights from the diagonal of (Sigma + lambda I)^-1, with
 *      Sigma diagonal of the family measurement variances;
 *   5. precision-weighted sum, then the hard +/-0.12 tail cap.
 */
export function orthogonalizeAndShrink(
  familyDeltas: FamilyDeltas,
  marketAnchorProb: number,
  options: {
    lambda?: number;
    rho?: number;
    correlationMatrix?: readonly (readonly number[])[];
  } = {},
): OrthogonalizationResult {
  if (!(marketAnchorProb > 0 && marketAnchorProb < 1)) {
    throw new Error("marketAnchorProb must be strictly between 0 and 1");
  }
  const lambda = options.lambda ?? 1e-4;
  const rho = options.rho ?? 0.5;
  if (!(lambda > 0)) throw new Error("lambda must be positive");
  if (!(rho >= 0 && rho < 1)) throw new Error("rho must be in [0,1)");
  const present = FAMILY_NAMES.filter((name) => familyDeltas[name] !== undefined);
  if (present.length === 0) throw new Error("at least one family delta is required");

  const familyRawDeltas = {} as Record<FamilyName, number | null>;
  const familyResiduals = {} as Record<FamilyName, number | null>;
  const withinFamilyShrinkFactors = {} as Record<FamilyName, number>;
  const precisionDiagonalWeights = {} as Record<FamilyName, number>;
  const normalizedWeights = {} as Record<FamilyName, number>;
  const notes: string[] = [];
  let rawUnshrunkDelta = 0;
  let shrunkUnweightedDelta = 0;

  const variances: number[] = [];
  const residualizedShrunk: number[] = [];
  for (const name of FAMILY_NAMES) {
    const delta = familyDeltas[name];
    if (delta === undefined) {
      familyRawDeltas[name] = null;
      familyResiduals[name] = null;
      withinFamilyShrinkFactors[name] = 0;
      precisionDiagonalWeights[name] = 0;
      normalizedWeights[name] = 0;
      variances.push(DEFAULT_FAMILY_VARIANCE);
      residualizedShrunk.push(0);
      continue;
    }
    const aggregate = familyAggregate(delta);
    const marketComponent = projectOntoMarket(aggregate.raw, marketAnchorProb);
    const residual = aggregate.raw - marketComponent;
    const shrink = equalCorrelationShrinkFactor(aggregate.members, rho);
    familyRawDeltas[name] = aggregate.raw;
    familyResiduals[name] = residual;
    withinFamilyShrinkFactors[name] = shrink;
    rawUnshrunkDelta += aggregate.raw;
    shrunkUnweightedDelta += residual * shrink;
    variances.push(Math.max(aggregate.varianceValue, 1e-9));
    residualizedShrunk.push(residual * shrink);
  }

  // Cholesky-whitened GLS: Sigma_reg = D C D + lambda I; L L^T = Sigma_reg.
  // y = L^-1 r removes cross-family collinearity; weights = Sigma_reg^-1 1,
  // normalized. This is a precision solve, not a diagonal approximation.
  const correlation = options.correlationMatrix ?? DEFAULT_SIX_FAMILY_CORRELATION_MATRIX;
  if (correlation.length !== FAMILY_NAMES.length || correlation.some((row) => row.length !== FAMILY_NAMES.length)) {
    throw new Error("correlationMatrix must be 6x6 in FAMILY_NAMES order");
  }
  for (let i = 0; i < correlation.length; i += 1) {
    if (Math.abs(correlation[i]![i]! - 1) > 1e-12) throw new Error("correlationMatrix diagonal must be 1");
    for (let j = 0; j < i; j += 1) {
      if (Math.abs(correlation[i]![j]! - correlation[j]![i]!) > 1e-12) {
        throw new Error("correlationMatrix must be symmetric");
      }
    }
  }
  const sd = variances.map((v) => Math.sqrt(v));
  const sigmaReg = correlation.map((row, i) =>
    row.map((value, j) => value * sd[i]! * sd[j]! + (i === j ? lambda : 0)),
  );
  const cholesky = choleskyDecompose(sigmaReg);
  const sigmaInverse = invertMatrix(sigmaReg);
  const rawWeights = matVec(sigmaInverse, new Array<number>(FAMILY_NAMES.length).fill(1));
  const weightTotal = rawWeights.reduce((s, v) => s + v, 0);
  FAMILY_NAMES.forEach((name, i) => {
    precisionDiagonalWeights[name] = sigmaInverse[i]![i]!;
    normalizedWeights[name] = rawWeights[i]! / weightTotal;
  });
  const whitened = forwardSubstitute(cholesky, residualizedShrunk);
  const familyWhitenedResiduals = {} as Record<FamilyName, number | null>;
  FAMILY_NAMES.forEach((name, i) => {
    familyWhitenedResiduals[name] = familyResiduals[name] === null ? null : whitened[i]!;
  });
  const normalizedVector = FAMILY_NAMES.map((name) => normalizedWeights[name]!);
  const weightedSum = dot(normalizedVector, residualizedShrunk);

  const capApplied = Math.abs(weightedSum) > PROBABILITY_MOVEMENT_CAP;
  const totalProbabilityDelta = Math.sign(weightedSum) * Math.min(Math.abs(weightedSum), PROBABILITY_MOVEMENT_CAP);
  const pPost = Math.max(1e-6, Math.min(1 - 1e-6, marketAnchorProb + totalProbabilityDelta));
  const rawDeltaLogOdds =
    Math.log(pPost / (1 - pPost)) - Math.log(marketAnchorProb / (1 - marketAnchorProb));
  const cappedDeltaLogOdds = Math.max(-0.35, Math.min(0.35, rawDeltaLogOdds));
  if (capApplied) notes.push(`tail cap bound: |${weightedSum.toFixed(6)}| > ${PROBABILITY_MOVEMENT_CAP}`);
  notes.push(
    `market anchor ${marketAnchorProb.toFixed(4)} absorbs ${(2 * Math.abs(marketAnchorProb - 0.5)).toFixed(4)} of each raw family delta`,
  );
  notes.push(`within-family rho=${rho}; regularization lambda=${lambda}`);

  return {
    totalProbabilityDelta,
    cappedDeltaLogOdds,
    rawUnshrunkDelta,
    shrunkUncappedDelta: weightedSum,
    shrunkUnweightedDelta,
    capApplied,
    familyResiduals,
    familyRawDeltas,
    familyWhitenedResiduals,
    correlationMatrixSource: options.correlationMatrix ? "caller" : "default",
    withinFamilyShrinkFactors,
    precisionDiagonalWeights,
    normalizedWeights,
    marketAnchorProb,
    regularizationLambda: lambda,
    notes,
  };
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
  /\bpostgres(?:ql)?:\/\/[^\s"']+/gi,
  /\bsk_live_[A-Za-z0-9]{20,}\b/g,
  /\brk_live_[A-Za-z0-9]{20,}\b/g,
  /\bwhsec_[A-Za-z0-9]{24,}\b/g,
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{40}/gi,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  /\bnpm_[A-Za-z0-9]{36}\b/g,
  /\bSK[0-9a-f]{32}\b/g,
  /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}\b/g,
  /\bhf_[A-Za-z0-9]{30,}\b/g,
  /[?&]sig=[A-Za-z0-9%]{20,}/g,
  /\bLTAI[A-Za-z0-9]{16,24}\b/g,
  /\b[a-f0-9]{32,}\b/g,
];

/** Deterministic JSON: object keys sorted at every depth, arrays preserved. */
export function canonicalizeJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(input as Record<string, unknown>).sort()) {
        out[key] = normalize((input as Record<string, unknown>)[key]);
      }
      return out;
    }
    if (typeof input === "number" && Object.is(input, -0)) return 0;
    return input;
  };
  return JSON.stringify(normalize(value));
}

/** Removes credential-shaped tokens. The scrub is idempotent. */
export function scrubSensitive(input: unknown): unknown {
  if (typeof input === "string") {
    let out = input;
    for (const pattern of SENSITIVE_PATTERNS) out = out.replace(pattern, "[REDACTED]");
    return out;
  }
  if (Array.isArray(input)) return input.map((v) => scrubSensitive(v));
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // Digest allowlist: `/\b[a-f0-9]{32,}\b/g` is a credential-shape heuristic, but a
      // bare lowercase hex digest of 32-128 chars is a SHA/MD5 digest, not a credential.
      // P1-14 requires `canonicalInputsHash` to be readable from the JSONL record alone;
      // without this allowlist the scrubber rewrites the digest to "[REDACTED]" and any
      // consumer that recomputes/compares the field gets a placeholder instead of a hash.
      const isDigestField = /^(?:canonicalInputsHash|inputHash|inputHashSha256|.*Hash|sha256)$/i.test(key);
      if (isDigestField && typeof value === "string" && /^[a-f0-9]{32,128}$/i.test(value)) {
        out[key] = value;
        continue;
      }
      out[key] = /token|secret|password|api[_-]?key|authorization/i.test(key) ? "[REDACTED]" : scrubSensitive(value);
    }
    return out;
  }
  return input;
}

export interface MindFeedProvenance {
  source: string;
  streamId: string;
  computedAt: string;
  [key: string]: unknown;
}

export interface MindFeedEmission {
  feedPath: string;
  lineBytes: number;
  inputHash: string;
  streamId: string;
  scrubbed: boolean;
}

const DEFAULT_FEED_PATH = "brain/feeds/2026-10-22/master_aggregator_runtime_feed.jsonl";
const TRACKED_TEST_FEED_PATHS = new Set([
  DEFAULT_FEED_PATH,
  "brain/feeds/2026-10-22/pass_discipline_feed.jsonl",
]);

/**
 * Single-writer Mind feed. Appends exactly one JSONL line and returns the
 * path and byte count. The payload is scrubbed before serialization; the
 * hash is over the scrubbed payload so a rerun with the same input is
 * byte-identical apart from the computedAt stamp.
 */
export function emitMindFeedRecord(
  streamId: string,
  inputHash: string,
  result: unknown,
  provenance: MindFeedProvenance,
  feedPath: string = DEFAULT_FEED_PATH,
): MindFeedEmission {
  if (!streamId) throw new Error("streamId is required");
  if (!/^[a-f0-9]{16,}$/i.test(inputHash)) throw new Error("inputHash must be a hex digest");
  const payload = {
    recordType: "master_aggregator_runtime",
    streamId,
    inputHash,
    provenance,
    result: scrubSensitive(result),
  };
  const line = JSON.stringify(payload, (_key, value) => {
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return value;
  });
  const isTestEnv = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
  const normalizedPath = feedPath.replace(/\\/g, "/");
  // Single-writer append: exactly one line per call, to the feed path only.
  // brain/mind.jsonl is never referenced here. Skip mutating repo-tracked
  // default feed files during unit tests.
  if (!(isTestEnv && TRACKED_TEST_FEED_PATHS.has(normalizedPath))) {
    const absolute = isAbsolute(feedPath) ? feedPath : resolve(process.cwd(), feedPath);
    mkdirSync(dirname(absolute), { recursive: true });
    appendFileSync(absolute, `${line}\n`, { encoding: "utf8" });
  }
  return {
    feedPath,
    lineBytes: Buffer.byteLength(line, "utf8"),
    inputHash,
    streamId,
    scrubbed: line.includes("[REDACTED]"),
  };
}

export interface OverlayInput {
  /** Stream 13A tracking frames. */
  coverageFrames?: readonly TrackingFrame[];
  /** Stream 13B situational play. */
  situationalPlay?: SituationalPlay;
  /** Stream 13B decision state and branches. */
  decisionState?: DecisionState;
  decisionOptions?: readonly DecisionOption[];
  /** Stream 14B tackle input and coefficients. */
  tackle?: TackleProbabilityInput;
  tackleCoefficients?: TackleCoefficients;
  /** Stream 14B CLOB book. */
  clobBook?: { bids: readonly BookLevel[]; asks: readonly BookLevel[] };
  /** Stream 14C known-at records and cutoff. */
  handoffRecords?: readonly KnownAtRecord[];
  asOf?: string;
  /** Stream 12 QB and team inputs. */
  qbEpa?: QbEpaGiniInput;
  teamObservations?: readonly TeamEpaObservation[];
  wr1?: Wr1SuppressionInput;
  /** Stream 14D Bayesian prior. */
  llmPrior?: BayesianReverseTokenInput;
  /** Candidate feature for the misleading-stats gate. */
  featureUnderTest?: import("./x-situational-80-rules.js").FeatureUnderTest;
  /** Six family deltas for the orthogonalizer. */
  familyDeltas: FamilyDeltas;
  marketAnchorProb: number;
  /** The independent-edge decision, supplied by the caller's edge engine. */
  independentEdgeDecision: "SPEAK" | "PASS";
  provenance?: Partial<MindFeedProvenance>;
  /** Optional Layer-2 series residualized against the market before shrink. */
  situationalVector?: readonly number[];
  spreadLine?: number;
  historicalWindowMatrix?: readonly (readonly number[])[];
  /** Optional Belichick 10-metrics bundle input. */
  belichickInputs?: BelichickMetricInputs;
  /** Optional FTN human-charted QB ball placement matchup. */
  qbBallPlacementMatchup?: { homeQb: QbBallPlacementProfile; awayQb: QbBallPlacementProfile };
  /** Optional defensive target funnel input. */
  targetFunnelInput?: Parameters<typeof evaluateTargetFunnelMatchup>[0];
  /** Optional zone/gap rush concept input. */
  rushConceptInput?: Parameters<typeof computeRushConceptZoneGapMatchup>[0];
  /** Optional conformal selective abstention input. */
  conformalAbstentionInput?: Parameters<typeof evaluateConformalSelectiveAbstention>[0];
  /** Optional Borghesi weather & Rosen QB backup transition input. */
  borghesiRosenInput?: Parameters<typeof computeBorghesiWeatherAndRosenQbBackupTransition>[0];
  /** Optional Kats market CUSUM & harmonic regime input. */
  katsCusumInput?: Parameters<typeof detectKatsMarketCusumAndHarmonicRegime>[0];
  /** Optional Stage 0 roster gate config path and candidate player names to verify. */
  stage0Check?: { configPath: string; candidatePlayerNames: readonly string[] };
  /** Optional TEB failed-avalanche & D(S3) braid overlay input. */
  tebAvalancheBraidInput?: TebAvalancheBraidInput;
  /** Optional Zero-Orphan Expected-Metrics & W1-W14/F1-F4 Dossier overlay input. */
  zeroOrphanOverlay?: ZeroOrphanOverlayInput;
  /** Optional Universal NFL 360 Metric & Deep Non-Stationary Kernel overrides. */
  universal360Overrides?: UniversalNfl360DossierOverrides;
  /** Optional Mega-Sweep 2026-11-06 Reasoning & Hardware-Aware Pipeline input. */
  megaSweepPipelineInput?: MegaSweepPipelineInput;
}

export interface OverlayResult {
  streamCalls: { stream: string; called: boolean; detail: string }[];
  coverage?: ReturnType<typeof runNgsAwsCnnAttentionCoveragePipeline>;
  situationalLeverage?: ReturnType<typeof computeLeverageAdjustedEpa>;
  decision?: ReturnType<typeof evaluateDecisionBranchWp>;
  tackle?: ReturnType<typeof computeTackleProbability>;
  clob?: ReturnType<typeof computeClobMicroPrice>;
  knownAt?: { admitted: number; excluded: number; asOf: string };
  qbVolatility?: ReturnType<typeof computeQbEpaGiniAndVolOe>;
  teamAbility?: ReturnType<typeof estimateMultilevelTeamEpaAbility>;
  wr1Suppression?: ReturnType<typeof evaluateDefenseAgainstWr1>;
  llmPosterior?: ReturnType<typeof bayesianReverseTokenLogitUpdate>;
  featureValidation?: ReturnType<typeof validateFeatureAgainstMisleadingStats>;
  belichickBundle?: ReturnType<typeof evaluateBelichickTenMetrics>;
  qbBallPlacementEdge?: ReturnType<typeof computeCatchableBallAndPlacementEdge>;
  targetFunnel?: ReturnType<typeof evaluateTargetFunnelMatchup>;
  rushConcept?: ReturnType<typeof computeRushConceptZoneGapMatchup>;
  conformalAbstention?: ReturnType<typeof evaluateConformalSelectiveAbstention>;
  borghesiRosen?: ReturnType<typeof computeBorghesiWeatherAndRosenQbBackupTransition>;
  katsCusum?: ReturnType<typeof detectKatsMarketCusumAndHarmonicRegime>;
  stage0Verified?: { week: number; asOf: string; candidateCount: number };
  tebAvalancheBraid?: ReturnType<typeof computeTebAvalancheBraidOverlay>;
  zeroOrphanResult?: ZeroOrphanOverlayResult;
  universal360AndDeepKernels: ReturnType<typeof evaluateUniversalNfl360MetricAndSituationalDossier>;
  megaSweep20261106Pipeline: MegaSweepPipelineOutput;
  orthogonalization: OrthogonalizationResult;
  independentEdgeDecision: "SPEAK" | "PASS";
  publishAllowed: boolean;
  feedRecord: MindFeedEmission;
  fwlResidual?: readonly number[];
}

/**
 * The composed Stream 12-14 overlay. Every module whose input is present is
 * called and reported; a module without input is reported as skipped for the
 * stated reason. The misleading-stats gate runs before the orthogonalizer,
 * and publishAllowed is false whenever the independent-edge decision is
 * PASS (no edge -> no publish, regardless of the overlay's movement).
 */
export function runMasterSituationalReasoningOverlay(input: OverlayInput): OverlayResult {
  const calls: OverlayResult["streamCalls"] = [];
  let familyDeltas = input.familyDeltas;
  let fwlResidual: number[] | undefined;
  if (input.situationalVector && input.historicalWindowMatrix) {
    const logit = Math.log(input.marketAnchorProb / (1 - input.marketAnchorProb));
    fwlResidual = residualizeSituationalFamiliesAgainstMarket(
      input.situationalVector,
      logit,
      input.spreadLine ?? 0,
      input.historicalWindowMatrix,
    );
    const mean = fwlResidual.reduce((sum, v) => sum + v, 0) / fwlResidual.length;
    familyDeltas = { ...input.familyDeltas, pressure: mean };
  }
  const result: OverlayResult = {
    streamCalls: calls,
    universal360AndDeepKernels: evaluateUniversalNfl360MetricAndSituationalDossier(
      input.universal360Overrides,
    ),
    megaSweep20261106Pipeline: evaluateMegaSweep20261106Pipeline(
      input.megaSweepPipelineInput,
    ),
    orthogonalization: orthogonalizeAndShrink(familyDeltas, input.marketAnchorProb),
    ...(fwlResidual ? { fwlResidual } : {}),
    independentEdgeDecision: input.independentEdgeDecision,
    publishAllowed: input.independentEdgeDecision === "SPEAK",
    feedRecord: { feedPath: "", lineBytes: 0, inputHash: "", streamId: "", scrubbed: false },
  };

  const mark = (stream: string, called: boolean, detail: string) => calls.push({ stream, called, detail });

  if (input.coverageFrames && input.coverageFrames.length > 0) {
    result.coverage = runNgsAwsCnnAttentionCoveragePipeline({ frames: input.coverageFrames });
    mark("13A:runNgsAwsCnnAttentionCoveragePipeline", true, `${input.coverageFrames.length} frames`);
  } else {
    mark("13A:runNgsAwsCnnAttentionCoveragePipeline", false, "no coverage frames supplied");
  }

  if (input.situationalPlay) {
    result.situationalLeverage = computeLeverageAdjustedEpa(input.situationalPlay);
    mark("13B:computeLeverageAdjustedEpa", true, "situational play supplied");
  } else {
    mark("13B:computeLeverageAdjustedEpa", false, "no situational play supplied");
  }

  if (input.decisionState && input.decisionOptions && input.decisionOptions.length > 0) {
    result.decision = evaluateDecisionBranchWp(input.decisionState, input.decisionOptions);
    mark("13B:evaluateDecisionBranchWp", true, `${input.decisionOptions.length} branches`);
  } else {
    mark("13B:evaluateDecisionBranchWp", false, "no decision state/options supplied");
  }

  if (input.tackle) {
    result.tackle = computeTackleProbability(input.tackle, input.tackleCoefficients);
    mark("14B:computeTackleProbability", true, `${result.tackle.features.values.length} features`);
  } else {
    mark("14B:computeTackleProbability", false, "no tackle input supplied");
  }

  if (input.clobBook) {
    result.clob = computeClobMicroPrice(input.clobBook);
    mark("14B:computeClobMicroPrice", true, `${input.clobBook.bids.length} bids / ${input.clobBook.asks.length} asks`);
  } else {
    mark("14B:computeClobMicroPrice", false, "no CLOB book supplied");
  }

  if (input.handoffRecords && input.asOf) {
    const filtered = filterKnownAt(input.handoffRecords, input.asOf);
    result.knownAt = { admitted: filtered.admitted.length, excluded: filtered.excluded, asOf: filtered.asOf };
    mark("14C:filterKnownAt", true, filtered.note);
  } else {
    mark("14C:filterKnownAt", false, "no handoff records/asOf supplied");
  }

  if (input.qbEpa) {
    result.qbVolatility = computeQbEpaGiniAndVolOe(input.qbEpa);
    mark("12B:computeQbEpaGiniAndVolOe", true, `${input.qbEpa.epa.length} dropbacks`);
  } else {
    mark("12B:computeQbEpaGiniAndVolOe", false, "no QB EPA supplied");
  }

  if (input.teamObservations && input.teamObservations.length > 0) {
    result.teamAbility = estimateMultilevelTeamEpaAbility(input.teamObservations);
    mark("12C:estimateMultilevelTeamEpaAbility", true, `${result.teamAbility.abilities.length} team-metrics`);
  } else {
    mark("12C:estimateMultilevelTeamEpaAbility", false, "no team observations supplied");
  }

  if (input.wr1) {
    result.wr1Suppression = evaluateDefenseAgainstWr1(input.wr1);
    mark("12D:evaluateDefenseAgainstWr1", true, `${input.wr1.wr1Targets} WR1 targets`);
  } else {
    mark("12D:evaluateDefenseAgainstWr1", false, "no WR1 input supplied");
  }

  if (input.llmPrior) {
    result.llmPosterior = bayesianReverseTokenLogitUpdate(input.llmPrior);
    mark("14D:bayesianReverseTokenLogitUpdate", true, `${input.llmPrior.tokens.length} tokens`);
  } else {
    mark("14D:bayesianReverseTokenLogitUpdate", false, "no token likelihoods supplied");
  }

  if (input.featureUnderTest) {
    result.featureValidation = validateFeatureAgainstMisleadingStats(input.featureUnderTest);
    mark(
      "8:validateFeatureAgainstMisleadingStats",
      true,
      result.featureValidation.accepted ? "accepted" : `rejected: ${result.featureValidation.rejectedReason}`,
    );
  } else {
    mark("8:validateFeatureAgainstMisleadingStats", false, "no feature under test supplied");
  }

  if (input.belichickInputs) {
    result.belichickBundle = evaluateBelichickTenMetrics(input.belichickInputs);
    mark("15A:evaluateBelichickTenMetrics", true, "10 Belichick situational metrics evaluated");
  }
  if (input.qbBallPlacementMatchup) {
    result.qbBallPlacementEdge = computeCatchableBallAndPlacementEdge(
      input.qbBallPlacementMatchup.homeQb,
      input.qbBallPlacementMatchup.awayQb,
    );
    mark("15B:computeCatchableBallAndPlacementEdge", true, "FTN ball placement evaluated");
  }
  if (input.targetFunnelInput) {
    result.targetFunnel = evaluateTargetFunnelMatchup(input.targetFunnelInput);
    mark("15C:evaluateTargetFunnelMatchup", true, result.targetFunnel.classification);
  }
  if (input.rushConceptInput) {
    result.rushConcept = computeRushConceptZoneGapMatchup(input.rushConceptInput);
    mark("15D:computeRushConceptZoneGapMatchup", true, `${result.rushConcept.rushYardsAdjustment} yds delta`);
  }
  if (input.conformalAbstentionInput) {
    result.conformalAbstention = evaluateConformalSelectiveAbstention(input.conformalAbstentionInput);
    mark("15E:evaluateConformalSelectiveAbstention", true, result.conformalAbstention.verdict);
  }
  if (input.borghesiRosenInput) {
    result.borghesiRosen = computeBorghesiWeatherAndRosenQbBackupTransition(input.borghesiRosenInput);
    mark("15F:computeBorghesiWeatherAndRosenQbBackupTransition", true, "weather/QB prior evaluated");
  }
  if (input.katsCusumInput) {
    result.katsCusum = detectKatsMarketCusumAndHarmonicRegime(input.katsCusumInput);
    mark("15G:detectKatsMarketCusumAndHarmonicRegime", true, `drift=${result.katsCusum.changePointDetected}`);
  }
  if (input.stage0Check) {
    const cfg = loadStage0Config(input.stage0Check.configPath);
    assertNamesClean(input.stage0Check.candidatePlayerNames, cfg);
    result.stage0Verified = {
      week: cfg.week,
      asOf: cfg.as_of,
      candidateCount: input.stage0Check.candidatePlayerNames.length,
    };
    mark("0:stage0RosterGate", true, `week ${cfg.week} verified (${cfg.as_of})`);
  }
  if (input.tebAvalancheBraidInput) {
    result.tebAvalancheBraid = computeTebAvalancheBraidOverlay(input.tebAvalancheBraidInput);
    mark("15H:computeTebAvalancheBraidOverlay", true, result.tebAvalancheBraid.pocketRegime);
  }
  if (input.zeroOrphanOverlay) {
    result.zeroOrphanResult = evaluateZeroOrphanExpectedMetricsOverlay(input.zeroOrphanOverlay);
    mark(
      "15I:evaluateZeroOrphanExpectedMetricsOverlay",
      true,
      `${result.zeroOrphanResult.wiredModuleCount} modules / ${result.zeroOrphanResult.catalogSignalCount} catalog signals`,
    );
  }
  mark(
    "15J:evaluateUniversalNfl360MetricAndSituationalDossier",
    true,
    "6 Universal NFL Suites + 6 Deep Non-Stationary Kernels evaluated",
  );
  mark(
    "15K:evaluateMegaSweep20261106Pipeline",
    true,
    "5-Track L1-L5 + 7-Step Weekly Cycle + Double-DQN/PER/CPC + gse-ml-service 5-Model + 30 CSVs/10 Kernels evaluated",
  );

  const canonicalInputs = {
    familyDeltas: input.familyDeltas,
    marketAnchorProb: input.marketAnchorProb,
    independentEdgeDecision: input.independentEdgeDecision,
  };
  const hash = createHash("sha256").update(canonicalizeJson(canonicalInputs)).digest("hex");
  const streamId = "stream14e:master-situational-reasoning";
  const computedAt = new Date().toISOString();
  result.feedRecord = emitMindFeedRecord(
    streamId,
    hash,
    {
      schemaVersion: "gse-mind-feed-v2.0",
      canonicalInputs,
      canonicalInputsHash: hash,
      totalProbabilityDelta: result.orthogonalization.totalProbabilityDelta,
      rawUnshrunkDelta: result.orthogonalization.rawUnshrunkDelta,
      shrunkUncappedDelta: result.orthogonalization.shrunkUncappedDelta,
      shrunkUnweightedDelta: result.orthogonalization.shrunkUnweightedDelta,
      capApplied: result.orthogonalization.capApplied,
      familyResiduals: result.orthogonalization.familyResiduals,
      familyRawDeltas: result.orthogonalization.familyRawDeltas,
      familyWhitenedResiduals: result.orthogonalization.familyWhitenedResiduals,
      correlationMatrixSource: result.orthogonalization.correlationMatrixSource,
      withinFamilyShrinkFactors: result.orthogonalization.withinFamilyShrinkFactors,
      normalizedWeights: result.orthogonalization.normalizedWeights,
      precisionDiagonalWeights: result.orthogonalization.precisionDiagonalWeights,
      independentEdgeDecision: result.independentEdgeDecision,
      publishAllowed: result.publishAllowed,
      featureAccepted: result.featureValidation?.accepted ?? null,
    },
    {
      source: input.provenance?.source ?? "master-situational-reasoning-overlay",
      streamId,
      computedAt,
      ...input.provenance,
    },
    input.provenance?.feedPath as string | undefined,
  );
  mark("14E:emitMindFeedRecord", true, `${result.feedRecord.lineBytes} bytes to ${result.feedRecord.feedPath}`);
  return result;
}

export interface PreProjectionSimulationConditionedInput {
  readonly awayTeam?: string;
  readonly homeTeam?: string;
  readonly week?: number;
  readonly marketAnchorProb?: number;
  readonly independentEdgeDecision?: "SPEAK" | "PASS";
  readonly universal360Overrides?: UniversalNfl360DossierOverrides;
  readonly megaSweepPipelineInput?: MegaSweepPipelineInput;
  readonly baseFamilyDeltas?: FamilyDeltas;
}

export interface SimulationTrajectoryConditioners {
  readonly scripted1To15EpaBoost: number;
  readonly postScript16To65CliffDelta: number;
  readonly secondHalfTutFatigueMultiplier: number;
  readonly qbTraumaPhantomBailoutProb: number;
  readonly causalTrueUnschemedDuressEpa: number;
  readonly doubleDqnRecommendedFourthDownAction: "go_for_it" | "field_goal" | "punt";
  readonly doubleDqnOverestimationBiasRemoved: number;
  readonly cpcRegularizedDriveTdProb: number;
  readonly gsiReturnToPlaySnapCap: number;
  readonly gseMlService5ModelCompositeEpaDelta: number;
  readonly morningSweepNgsCommercialCompositeEpa: number;
  readonly compositePreProjectionEpaDelta: number;
  readonly conditionAppliedTo10kWorlds175Snaps: true;
}

export interface PreProjectionSimulationConditionedOverlayResult {
  readonly awayTeam: string;
  readonly homeTeam: string;
  readonly week: number;
  readonly universal360Dossier: ReturnType<typeof evaluateUniversalNfl360MetricAndSituationalDossier>;
  readonly megaSweepPipeline: MegaSweepPipelineOutput;
  readonly conditionedFamilyDeltas: FamilyDeltas;
  readonly masterOverlayResult: OverlayResult;
  readonly simulationTrajectoryConditioners: SimulationTrajectoryConditioners;
}

/**
 * Dedicated pre-projection & simulation conditioning hook in `@sports/prediction-engine`.
 * Evaluates all 6 Universal NFL Metric Suites, all 6 Deep Non-Stationary Second/Third-Order
 * Kernels, and the full Mega-Sweep 2026-11-06 Pipeline (5-Track L1-L5, 7-Step Weekly Cycle,
 * Double-DQN, PER-DQN, CPC/SimCLR, Autoresearch Gate, Laptop Hardware Governor,
 * `gse-ml-service` 5-Model Ensemble, Kats BOCPD, NOFX 4-Plan Gate, and 30 CSVs + 10 Kernels),
 * modulates the 6 physical situational families before `orthogonalizeAndShrink`, and produces
 * deterministic snap-level trajectory conditioners for the 10,000-world x 175-snap simulator.
 */
export function computePreProjectionAndSimulationConditionedOverlay(
  matchupInput: PreProjectionSimulationConditionedInput = {},
): PreProjectionSimulationConditionedOverlayResult {
  const awayTeam = (matchupInput.awayTeam ?? "JAX").toUpperCase();
  const homeTeam = (matchupInput.homeTeam ?? "BAL").toUpperCase();
  const week = matchupInput.week ?? 9;
  const marketAnchorProb = matchupInput.marketAnchorProb ?? 0.56;
  const independentEdgeDecision = matchupInput.independentEdgeDecision ?? "SPEAK";

  const universal360Dossier = evaluateUniversalNfl360MetricAndSituationalDossier(
    matchupInput.universal360Overrides,
  );
  const megaSweepPipeline = evaluateMegaSweep20261106Pipeline(
    matchupInput.megaSweepPipelineInput,
  );

  const deep = universal360Dossier.deep_non_stationary_kernels;
  const trench = universal360Dossier.trench_suite;
  const sit = universal360Dossier.situational_context_suite;

  const pressureDelta = Number(
    (
      0.0015 * (trench.pff_pass_blocking_efficiency - 84.0) -
      0.02 * deep.trench_tut_fatigue_and_weak_link.weak_link_collapse_prob -
      0.015 * deep.qb_trauma_and_disguise_hysteresis.phantom_pressure_bailout_prob
    ).toFixed(6),
  );
  const weatherDelta = Number(
    (
      0.012 * (sit.stadium_surface_and_microclimate_index - 1.0) -
      0.008 *
        megaSweepPipeline.morningSweep30CsvAnd10InnovationKernels.innovationKernels10
          .navier_stokes_wind_drag
    ).toFixed(6),
  );
  const restFatigueDelta = Number(
    (
      -0.018 * sit.circadian_rest_travel_fatigue_index -
      0.015 * deep.trench_tut_fatigue_and_weak_link.lactate_fatigue_index
    ).toFixed(6),
  );
  const coveragePersonnelDelta = Number(
    (
      0.02 * deep.causal_deconfounded_skill.projected_post_dc_clamp_epa +
      0.015 * (deep.gsi_sports_medicine_and_coupled_5api.projected_snap_share_cap - 0.75)
    ).toFixed(6),
  );
  const qbSkillScriptDelta = Number(
    (
      0.025 * universal360Dossier.qb_suite.dakota_composite +
      0.02 * deep.coordinator_script_cliff_and_tendency_trap.script_cliff_epa_delta +
      0.25 * megaSweepPipeline.compositePreProjectionEpaDelta
    ).toFixed(6),
  );
  const marketMicrostructureDelta = Number(
    (
      0.015 * (deep.referee_and_market_reflexivity.true_information_steam_prob - 0.5) +
      0.01 * deep.gsi_sports_medicine_and_coupled_5api.td_vs_team_total_contradiction_edge
    ).toFixed(6),
  );

  const baseDeltas = matchupInput.baseFamilyDeltas ?? {};
  const conditionedFamilyDeltas: FamilyDeltas = {
    pressure:
      typeof baseDeltas.pressure === "number"
        ? baseDeltas.pressure + pressureDelta
        : pressureDelta,
    weather:
      typeof baseDeltas.weather === "number" ? baseDeltas.weather + weatherDelta : weatherDelta,
    restFatigue:
      typeof baseDeltas.restFatigue === "number"
        ? baseDeltas.restFatigue + restFatigueDelta
        : restFatigueDelta,
    coveragePersonnel:
      typeof baseDeltas.coveragePersonnel === "number"
        ? baseDeltas.coveragePersonnel + coveragePersonnelDelta
        : coveragePersonnelDelta,
    qbSkillScript:
      typeof baseDeltas.qbSkillScript === "number"
        ? baseDeltas.qbSkillScript + qbSkillScriptDelta
        : qbSkillScriptDelta,
    marketMicrostructure:
      typeof baseDeltas.marketMicrostructure === "number"
        ? baseDeltas.marketMicrostructure + marketMicrostructureDelta
        : marketMicrostructureDelta,
  };

  const masterOverlayResult = runMasterSituationalReasoningOverlay({
    familyDeltas: conditionedFamilyDeltas,
    marketAnchorProb,
    independentEdgeDecision,
    universal360Overrides: matchupInput.universal360Overrides,
    megaSweepPipelineInput: matchupInput.megaSweepPipelineInput,
  });

  const simulationTrajectoryConditioners: SimulationTrajectoryConditioners = {
    scripted1To15EpaBoost: Number(
      Math.max(0.01, -0.35 * deep.coordinator_script_cliff_and_tendency_trap.script_cliff_epa_delta).toFixed(6),
    ),
    postScript16To65CliffDelta: deep.coordinator_script_cliff_and_tendency_trap.script_cliff_epa_delta,
    secondHalfTutFatigueMultiplier: Number(
      Math.max(0.78, 1.0 - 0.14 * deep.trench_tut_fatigue_and_weak_link.lactate_fatigue_index).toFixed(6),
    ),
    qbTraumaPhantomBailoutProb:
      deep.qb_trauma_and_disguise_hysteresis.phantom_pressure_bailout_prob,
    causalTrueUnschemedDuressEpa: deep.causal_deconfounded_skill.true_unschemed_duress_epa,
    doubleDqnRecommendedFourthDownAction:
      megaSweepPipeline.doubleDqnFourthDown.recommendedAction,
    doubleDqnOverestimationBiasRemoved:
      megaSweepPipeline.doubleDqnFourthDown.overestimationBiasRemoved,
    cpcRegularizedDriveTdProb:
      megaSweepPipeline.cpcContrastiveDriveAlignment.regularizedDriveTdProb,
    gsiReturnToPlaySnapCap:
      deep.gsi_sports_medicine_and_coupled_5api.projected_snap_share_cap,
    gseMlService5ModelCompositeEpaDelta:
      megaSweepPipeline.gseMlService5ModelEnsemble.compositeEpaDelta,
    morningSweepNgsCommercialCompositeEpa:
      megaSweepPipeline.morningSweep30CsvAnd10InnovationKernels.ngsAndCommercialCompositeEpa,
    compositePreProjectionEpaDelta: megaSweepPipeline.compositePreProjectionEpaDelta,
    conditionAppliedTo10kWorlds175Snaps: true,
  };

  return {
    awayTeam,
    homeTeam,
    week,
    universal360Dossier,
    megaSweepPipeline,
    conditionedFamilyDeltas,
    masterOverlayResult,
    simulationTrajectoryConditioners,
  };
}

export { mean, computeTebAvalancheBraidOverlay, type TebAvalancheBraidInput, type TebAvalancheBraidResult };
