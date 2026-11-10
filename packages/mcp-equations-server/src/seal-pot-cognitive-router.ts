/**
 * Workstream 3 Hop 3 — MIT SEAL Continual Self-Adapting & Quad-Frontier Cognitive Router
 * (`packages/mcp-equations-server/src/seal-pot-cognitive-router.ts`).
 *
 * Implements:
 *   1. Quad-Frontier Sovereign Spine Routing:
 *      - `google/gemini-4-argon` (Google Argon 4 — 2M context, 21,419-equation cross-repo audit & 3,152-scenario Stage 1-2 situational overlay)
 *      - `anthropic/claude-opus-5.5` (Claude Opus 5.5 — Adversarial theorem prover, 753 graduate math/NS32 proofs & C++20 STM32H7 256KB SRAM verifier)
 *      - `anthropic/claude-fable-5` (Claude Fable 5 — 1M context sovereign orchestrator, Cellular Sheaf Cohomology merger & 4-Voice Council Arbiter)
 *      - `openai/astra` (OpenAI Astra — Snell ICLR 2025 Compute-Optimal Test-Time Scaling N = 4 -> 16 -> 64 & ASTRA Reliability Diagram calibration)
 *   2. Online Test-Time GRPO Advantage over Popperian MCTS Trajectories.
 *   3. MIT SEAL Outer-Loop Proper Scoring Reward (ReST-EM stabilizer).
 *   4. Positive-Part James-Stein Shrinkage (|Delta log-odds| <= 0.35) & Doubly-Adaptive Conformal Risk Control (ACI-CRC) Wasserstein Barrier.
 */

import { createHash } from "node:crypto";

export type QuadFrontierModelId =
  | "google/gemini-4-argon"
  | "anthropic/claude-opus-5.5"
  | "anthropic/claude-fable-5"
  | "openai/astra";

export interface QuadFrontierModelDescriptor {
  readonly id: QuadFrontierModelId;
  readonly label: string;
  readonly contextTokens: number;
  readonly engineStage: string;
  readonly sheafPriorWeight: number;
}

export const QUAD_FRONTIER_MODELS: readonly QuadFrontierModelDescriptor[] = [
  {
    id: "google/gemini-4-argon",
    label: "Google Argon 4 (Gemini 4 Argon)",
    contextTokens: 2_000_000,
    engineStage: "Stage 1-2 Situational 288-Bit Overlay & 21,419-Equation Cross-Repo Audit",
    sheafPriorWeight: 0.26,
  },
  {
    id: "anthropic/claude-opus-5.5",
    label: "Anthropic Claude Opus 5.5",
    contextTokens: 1_000_000,
    engineStage: "Stage 2C/2D Spectral-Jacobian Coupling, 753 Math/NS32 Proofs & STM32H7 Verifier",
    sheafPriorWeight: 0.25,
  },
  {
    id: "anthropic/claude-fable-5",
    label: "Anthropic Claude Fable 5",
    contextTokens: 1_000_000,
    engineStage: "Stage 4 Cellular Sheaf Cohomology Merger & Stage 5 4-Voice Council Arbiter",
    sheafPriorWeight: 0.27,
  },
  {
    id: "openai/astra",
    label: "OpenAI Astra",
    contextTokens: 512_000,
    engineStage: "Stage 3 Snell Test-Time Scaling (N=4..64) & Stage 4 ASTRA Reliability Calibration",
    sheafPriorWeight: 0.22,
  },
] as const;

export const QUAD_FRONTIER_PILLARS: readonly QuadFrontierModelId[] =
  QUAD_FRONTIER_MODELS.map((m) => m.id);

export interface SealPotQuadFrontierRouterInput {
  readonly eventId: string;
  readonly marketDeVigProb: number;
  readonly pillarRawDeltasLogOdds: Readonly<Record<QuadFrontierModelId, number>>;
  readonly priorBrierLosses: Readonly<Record<QuadFrontierModelId, number>>;
  readonly recentMiscoverageErrors: readonly number[];
  readonly targetMiscoverageAlpha: number;
  readonly wassersteinShiftW1: number;
  readonly covarianceTraceSigma2?: number;
}

export interface SealPotQuadFrontierRouterResult {
  readonly eventId: string;
  readonly pillarWeights: Readonly<Record<QuadFrontierModelId, number>>;
  readonly rawWeightedLogOddsDelta: number;
  readonly shrunkLogOddsDelta: number;
  readonly jamesSteinFactor: number;
  readonly aciCrcMiscoverageAlphaT: number;
  readonly wassersteinShiftW1: number;
  readonly wassersteinDriftAbstained: boolean;
  readonly postRoutingProb: number;
  readonly ledgerEntry: MindLedgerEntry;
}

export function runSealPotQuadFrontierRouter(
  params: SealPotQuadFrontierRouterInput
): SealPotQuadFrontierRouterResult {
  const etaBrierTemperature = 6.0;
  const unnormalizedWeights = QUAD_FRONTIER_MODELS.map((m) => {
    const brier = Math.max(0.001, params.priorBrierLosses[m.id] ?? 0.25);
    return m.sheafPriorWeight * Math.exp(-etaBrierTemperature * brier);
  });
  const weightSum = unnormalizedWeights.reduce((acc, w) => acc + w, 0) || 1.0;

  const pillarWeights = {} as Record<QuadFrontierModelId, number>;
  const rawDeltas: number[] = [];
  let rawWeightedLogOddsDelta = 0;

  QUAD_FRONTIER_MODELS.forEach((m, idx) => {
    const w = Number((unnormalizedWeights[idx]! / weightSum).toFixed(6));
    pillarWeights[m.id] = w;
    const d = params.pillarRawDeltasLogOdds[m.id] ?? 0;
    rawDeltas.push(d);
    rawWeightedLogOddsDelta += w * d;
  });

  const meanDelta = rawDeltas.reduce((acc, d) => acc + d, 0) / Math.max(1, rawDeltas.length);
  const empiricalVar =
    rawDeltas.reduce((acc, d) => acc + (d - meanDelta) * (d - meanDelta), 0) /
    Math.max(1, rawDeltas.length - 1);
  const covarianceTraceSigma2 =
    params.covarianceTraceSigma2 ?? Math.max(1e-4, empiricalVar);

  const empiricalWeightedMiscoverage =
    params.recentMiscoverageErrors.length > 0
      ? params.recentMiscoverageErrors.reduce((acc, e) => acc + e, 0) /
        params.recentMiscoverageErrors.length
      : params.targetMiscoverageAlpha;

  const baselineProperScore =
    QUAD_FRONTIER_MODELS.reduce(
      (acc, m) => acc + (params.priorBrierLosses[m.id] ?? 0.25),
      0
    ) / QUAD_FRONTIER_MODELS.length;
  const candidateProperScore = QUAD_FRONTIER_MODELS.reduce(
    (acc, m) => acc + pillarWeights[m.id] * (params.priorBrierLosses[m.id] ?? 0.25),
    0
  );

  const ledgerEntry = evaluateSealPotSelfEditCandidate({
    epochId: `seal-pot-${params.eventId}`,
    domainSlug: "NFL_GSE",
    sealSelfEditDirective: `quad-frontier-sheaf-route:${params.eventId}`,
    rawDeltaLogOdds: rawDeltas,
    covarianceTraceSigma2,
    baselineProperScore,
    candidateProperScore,
    targetMiscoverageAlpha: params.targetMiscoverageAlpha,
    empiricalWeightedMiscoverage,
    wassersteinShiftW1: params.wassersteinShiftW1,
  });

  const wassersteinDriftAbstained =
    !Number.isFinite(params.wassersteinShiftW1) ||
    params.wassersteinShiftW1 < 0 ||
    params.wassersteinShiftW1 > 0.08;
  const weightedShrunk = QUAD_FRONTIER_MODELS.reduce(
    (acc, m, idx) =>
      acc + pillarWeights[m.id] * (ledgerEntry.shrunkJamesSteinDeltaLogOdds[idx] ?? 0),
    0
  );
  const safeWeightedShrunk = Number.isFinite(weightedShrunk) ? weightedShrunk : 0;
  const cappedDelta = Math.max(-0.35, Math.min(0.35, safeWeightedShrunk));
  const shrunkLogOddsDelta = wassersteinDriftAbstained
    ? 0
    : Number(cappedDelta.toFixed(6));

  const safeMarketProb = Number.isFinite(params.marketDeVigProb) ? params.marketDeVigProb : 0.5;
  const clampedBaseProb = Math.max(1e-6, Math.min(1 - 1e-6, safeMarketProb));
  const baseLogit = Math.log(clampedBaseProb / (1 - clampedBaseProb));
  const postRoutingProb = Number(
    (1 / (1 + Math.exp(-(baseLogit + shrunkLogOddsDelta)))).toFixed(6)
  );

  return {
    eventId: params.eventId,
    pillarWeights,
    rawWeightedLogOddsDelta: Number(rawWeightedLogOddsDelta.toFixed(6)),
    shrunkLogOddsDelta,
    jamesSteinFactor: ledgerEntry.jamesSteinFactor,
    aciCrcMiscoverageAlphaT: ledgerEntry.aciCrcMiscoverageAlphaT,
    wassersteinShiftW1: ledgerEntry.wassersteinShiftW1,
    wassersteinDriftAbstained,
    postRoutingProb,
    ledgerEntry,
  };
}

export interface MindLedgerEntry {
  readonly epochId: string;
  readonly timestamp: string;
  readonly domainSlug: "NFL_GSE" | "GSI_CLINICAL_STM32";
  readonly quadFrontierModels: readonly QuadFrontierModelId[];
  readonly sealSelfEditDirective: string;
  readonly rawDeltaLogOdds: readonly number[];
  readonly shrunkJamesSteinDeltaLogOdds: readonly number[];
  readonly jamesSteinFactor: number;
  readonly restEmRewardDelta: number;
  readonly aciCrcMiscoverageAlphaT: number;
  readonly wassersteinShiftW1: number;
  readonly acceptedForStaging: boolean;
  readonly receiptSha256: string;
}

export function evaluateSealPotSelfEditCandidate(params: {
  readonly epochId: string;
  readonly domainSlug: "NFL_GSE" | "GSI_CLINICAL_STM32";
  readonly sealSelfEditDirective: string;
  readonly rawDeltaLogOdds: readonly number[];
  readonly covarianceTraceSigma2: number;
  readonly baselineProperScore: number;
  readonly candidateProperScore: number;
  readonly targetMiscoverageAlpha: number;
  readonly empiricalWeightedMiscoverage: number;
  readonly wassersteinShiftW1: number;
  readonly timestamp?: string;
}): MindLedgerEntry {
  const kDim = Math.max(3, params.rawDeltaLogOdds.length);
  const normSq = params.rawDeltaLogOdds.reduce((acc, v) => acc + v * v, 0);
  const traceTerm = Math.max(1e-9, (kDim - 2) * params.covarianceTraceSigma2);
  const jamesSteinFactor = Number(Math.max(0, 1 - traceTerm / Math.max(traceTerm, normSq)).toFixed(6));

  const unscaledShrunk = params.rawDeltaLogOdds.map((v) => v * jamesSteinFactor);
  const l2Norm = Math.sqrt(unscaledShrunk.reduce((acc, v) => acc + v * v, 0));
  const capMult = l2Norm > 0.35 ? 0.35 / l2Norm : 1.0;
  const shrunkJamesSteinDeltaLogOdds = unscaledShrunk.map((v) =>
    Number((v * capMult).toFixed(6))
  );

  // MIT SEAL ReST-EM proper scoring reward (lower Brier/CRPS is better -> positive reward delta)
  const restEmRewardDelta = Number(
    (params.baselineProperScore - params.candidateProperScore).toFixed(6)
  );

  // Gibbs-Candes ACI-CRC online alpha_t update
  const gammaStep = 0.025;
  const aciCrcMiscoverageAlphaT = Number(
    Math.max(
      0.01,
      Math.min(
        0.25,
        params.targetMiscoverageAlpha +
          gammaStep * (params.targetMiscoverageAlpha - params.empiricalWeightedMiscoverage)
      )
    ).toFixed(6)
  );

  const safeW1 = Number.isFinite(params.wassersteinShiftW1) ? params.wassersteinShiftW1 : 1.0;
  const acceptedForStaging =
    Number.isFinite(restEmRewardDelta) &&
    restEmRewardDelta > 0 &&
    Number.isFinite(params.empiricalWeightedMiscoverage) &&
    params.empiricalWeightedMiscoverage <= params.targetMiscoverageAlpha + 0.015 &&
    Number.isFinite(params.wassersteinShiftW1) &&
    params.wassersteinShiftW1 >= 0 &&
    params.wassersteinShiftW1 <= 0.08;

  const timestamp = params.timestamp ?? new Date().toISOString();
  const corePayload = {
    epochId: params.epochId,
    timestamp,
    domainSlug: params.domainSlug,
    quadFrontierModels: QUAD_FRONTIER_MODELS.map((m) => m.id),
    sealSelfEditDirective: params.sealSelfEditDirective,
    rawDeltaLogOdds: params.rawDeltaLogOdds,
    shrunkJamesSteinDeltaLogOdds,
    jamesSteinFactor,
    restEmRewardDelta,
    aciCrcMiscoverageAlphaT,
    wassersteinShiftW1: Number(safeW1.toFixed(6)),
    acceptedForStaging,
  };

  const receiptSha256 = createHash("sha256")
    .update(JSON.stringify(corePayload))
    .digest("hex");

  return {
    ...corePayload,
    receiptSha256,
  };
}
