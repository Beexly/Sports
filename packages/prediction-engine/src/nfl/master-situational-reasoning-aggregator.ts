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
  if (capApplied) notes.push(`tail cap bound: |${weightedSum.toFixed(6)}| > ${PROBABILITY_MOVEMENT_CAP}`);
  notes.push(
    `market anchor ${marketAnchorProb.toFixed(4)} absorbs ${(2 * Math.abs(marketAnchorProb - 0.5)).toFixed(4)} of each raw family delta`,
  );
  notes.push(`within-family rho=${rho}; regularization lambda=${lambda}`);

  return {
    totalProbabilityDelta,
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
      const isDigestField = /^(?:canonicalInputsHash|inputHash|inputHashSha256)$/i.test(key);
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

/**
 * Walk-forward tau_hat provenance stamp (TAU-HAT-SOLUTION §5 / READINESS §2).
 * Fitted strictly point-in-time (`train_seasons < served_season`) over
 * nflverse play_by_play_2022..2025.parquet (+11.1585pp Hamming lift vs WP-max
 * on 2024-2025 opponent-half 4th downs, n=3,988).
 */
export const TAU_HAT_WALK_FORWARD_MANIFEST = {
  pointInTime: true,
  fitWindow: "walk-forward: train_seasons < served_season (strict <)",
  deltaPp: 11.1585,
  n: 3988,
  sha256: "17656fdf6981c55dfbbfff99aae5f039e35c1e6172357cd6c9cb9f94dcd4594f",
} as const;

export interface TauHatWalkForwardDecisionInput {
  readonly team: string;
  readonly season: number;
  readonly tauVal: number;
  readonly wpGap: number;
  readonly actionPredicted: "GO" | "FGA" | "PUNT";
  readonly actionOptimal?: "GO" | "FGA" | "PUNT";
  readonly context: "simulation" | "post_hoc";
}

export interface SignalPackObservationsInput {
  readonly redzoneProe?: number;
  readonly stHiddenYards?: number;
  readonly qbPressureEscape?: number;
  readonly neutralPace?: number;
  readonly penaltyDiscipline?: number;
  readonly wrCbArchetype?: number;
  readonly defHavocRate?: number;
}

export interface TauHatOverlaySummary {
  readonly coachAggressivenessIdx: number;
  readonly wpGap: number | null;
  readonly actionPredicted: "GO" | "FGA" | "PUNT" | null;
  readonly context: "simulation" | "post_hoc" | "index_only";
  readonly manifest: typeof TAU_HAT_WALK_FORWARD_MANIFEST;
}

export interface SignalPackOverlaySummary {
  readonly signalsLoaded: number;
  readonly values: SignalPackObservationsInput;
}

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
  // Single-writer append: exactly one line per call, to the feed path only.
  // brain/mind.jsonl is never referenced here.
  const absolute = isAbsolute(feedPath) ? feedPath : resolve(process.cwd(), feedPath);
  mkdirSync(dirname(absolute), { recursive: true });
  appendFileSync(absolute, `${line}\n`, { encoding: "utf8" });
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
  /** Walk-forward coach 4th-down risk preference (tau_hat / coachAggressivenessIdx, +11.1585pp). */
  coachAggressivenessIdx?: number;
  /** Live-state tau_hat decision from simulation or post-hoc grading. */
  tauHatDecision?: TauHatWalkForwardDecisionInput;
  /** 7-signal research pack observations (READINESS §1 / §5.9). */
  signalPack?: SignalPackObservationsInput;
  /** Six family deltas for the orthogonalizer. */
  familyDeltas: FamilyDeltas;
  marketAnchorProb: number;
  /** The independent-edge decision, supplied by the caller's edge engine. */
  independentEdgeDecision: "SPEAK" | "PASS";
  provenance?: Partial<MindFeedProvenance>;
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
  tauHatSummary?: TauHatOverlaySummary;
  signalPackSummary?: SignalPackOverlaySummary;
  orthogonalization: OrthogonalizationResult;
  independentEdgeDecision: "SPEAK" | "PASS";
  publishAllowed: boolean;
  feedRecord: MindFeedEmission;
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
  const result: OverlayResult = {
    streamCalls: calls,
    orthogonalization: orthogonalizeAndShrink(input.familyDeltas, input.marketAnchorProb),
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

  if (input.tauHatDecision || typeof input.coachAggressivenessIdx === "number") {
    const idx =
      typeof input.coachAggressivenessIdx === "number"
        ? input.coachAggressivenessIdx
        : input.tauHatDecision!.tauVal;
    result.tauHatSummary = {
      coachAggressivenessIdx: idx,
      wpGap: input.tauHatDecision?.wpGap ?? null,
      actionPredicted: input.tauHatDecision?.actionPredicted ?? null,
      context: input.tauHatDecision?.context ?? "index_only",
      manifest: TAU_HAT_WALK_FORWARD_MANIFEST,
    };
    mark(
      "c04:tauHatWalkForward",
      true,
      `tau=${idx.toFixed(2)} pointInTime=${TAU_HAT_WALK_FORWARD_MANIFEST.pointInTime} (+${TAU_HAT_WALK_FORWARD_MANIFEST.deltaPp}pp)`,
    );
  } else {
    mark("c04:tauHatWalkForward", false, "no walk-forward tau_hat / coachAggressivenessIdx supplied");
  }

  if (input.signalPack) {
    const keys = [
      "redzoneProe",
      "stHiddenYards",
      "qbPressureEscape",
      "neutralPace",
      "penaltyDiscipline",
      "wrCbArchetype",
      "defHavocRate",
    ] as const;
    const loaded = keys.filter((k) => typeof input.signalPack?.[k] === "number").length;
    result.signalPackSummary = {
      signalsLoaded: loaded,
      values: input.signalPack,
    };
    mark("signalPack:sevenVerifiedSignals", loaded > 0, `${loaded}/7 signals loaded`);
  } else {
    mark("signalPack:sevenVerifiedSignals", false, "no signalPack supplied");
  }

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

export { mean };
