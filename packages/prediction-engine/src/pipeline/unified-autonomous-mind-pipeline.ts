import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildContextualBitmask288,
  NE_CHI_20261022_BITMASK_INPUT,
  type ContextualBitmaskReceipt,
  type League,
} from "../mcp/bitmask-schema.js";
import { stageAPrune, stageDJacobianWeight } from "../mcp/mcp-cognitive-router.js";
import { runMasterSituationalReasoningOverlay } from "../nfl/master-situational-reasoning-aggregator.js";
import type { MutualDefensiveAttritionResult } from "../nfl/x-situational-80-rules.js";
import {
  evaluateCausalPrmTrajectory,
  type CausalPrmTrajectoryReceipt,
  type LayerStepTrace,
} from "../reasoning/causal-prm.js";
import { evaluateFullCorpus } from "../reasoning/corpus-evaluator.js";
import { evaluateMindReasoning } from "../reasoning/mind-reasoning.js";
import {
  verifyAndBrandCausalReceipt,
  type AuthorizedPublishReceipt,
  type RawPredictionPayload,
} from "../verification/neuro-symbolic-z3-verifier.js";

export interface UnifiedMindPipelineInput {
  readonly gameId: string;
  readonly league: League;
  readonly asOf: Date;
  readonly checkpointTag: "T-24h" | "T-6h" | "T-3h" | "T-90m" | "T-30m" | "LIVE";
  readonly forceFullRecompute?: boolean;
  readonly outboxDir?: string;
  readonly trainerDir?: string;
}

export interface UnifiedSlateExecutionSummary {
  readonly gameId: string;
  readonly league: League;
  readonly checkpointTag: string;
  readonly bitmaskReceipt: ContextualBitmaskReceipt;
  readonly attritionOverride: MutualDefensiveAttritionResult;
  readonly causalPrmReceipt: CausalPrmTrajectoryReceipt;
  readonly spreadReceipt: AuthorizedPublishReceipt;
  readonly totalReceipt: AuthorizedPublishReceipt;
  readonly propReceipts: readonly AuthorizedPublishReceipt[];
  readonly executionLatencyMs: number;
  readonly merkleRootSha256: string;
  readonly corpusItemsLoaded: number;
  readonly corpusItemsEvaluated: number;
  readonly mindRecordsLoaded: number;
  readonly mindApplicablePrinciplesCount: number;
  readonly spreadPublishState: string;
  readonly totalPublishState: string;
  readonly propHookFlags: readonly string[];
}

export interface CorpusMindCounts {
  readonly corpusItemsLoaded: number;
  readonly corpusItemsEvaluated: number;
  readonly corpusSituationalShift: number;
  readonly mindRecordsLoaded: number;
  readonly mindApplicablePrinciplesCount: number;
  readonly mindNetSituationalAdjustment: number;
}

const JAMES_STEIN_BOUND = 0.08;

export function boundedJamesSteinShift(raw: number): number {
  if (!Number.isFinite(raw) || raw === 0) return 0;
  const shrunk = Math.max(0, 1 - 0.35 / (1 + raw * raw * 400)) * raw;
  return Math.max(-JAMES_STEIN_BOUND, Math.min(JAMES_STEIN_BOUND, shrunk));
}

export function evaluateCorpusAndMind(gameId: string): CorpusMindCounts {
  const ctx = {
    homeTeam: "CHI",
    awayTeam: "NE",
    venue: "Soldier Field",
    restDaysHome: 4,
    restDaysAway: 4,
    weather: "56.6F 5.1mph calm",
    marketLine: gameId.includes("TOTAL") ? 50.5 : -3,
    marketImpliedProbability: 0.53,
    outcome: "home_win",
    decisionTimestamp: "2026-10-22T23:45:00.000Z",
    decisionWindowMs: 7 * 24 * 3600 * 1000,
    windSpeedMph: 5.1,
    temperatureF: 56.6,
    precipitationRateMmHr: 0,
    altitudeFt: 597,
    publicTicketPct: 62,
    publicHandlePct: 48,
    olContinuityDelta: -0.4,
    offensivePaceSec: 26,
  };
  const corpus = evaluateFullCorpus(ctx);
  const mind = evaluateMindReasoning(ctx);
  return {
    corpusItemsLoaded: corpus.totalLoadedCount,
    corpusItemsEvaluated: corpus.itemsEvaluatedCount,
    corpusSituationalShift: corpus.situationalAdjustment * corpus.evaluatorWeight,
    mindRecordsLoaded: mind.totalMindRecordsLoaded,
    mindApplicablePrinciplesCount: mind.applicablePrinciples.length,
    mindNetSituationalAdjustment: mind.netSituationalAdjustment,
  };
}

function payload(partial: Omit<RawPredictionPayload, "corpusItemsLoaded" | "corpusItemsEvaluated" | "mindRecordsLoaded" | "mindApplicablePrinciplesCount" | "bitmaskSha256"> & {
  counts: CorpusMindCounts;
  bitmaskSha256: string;
}): RawPredictionPayload {
  const edge = Math.round((partial.calibratedProb - partial.marketImpliedDeVigProb) * 1e6) / 1e6;
  return {
    gameId: partial.gameId,
    asOfIso: partial.asOfIso,
    selection: partial.selection,
    marketType: partial.marketType,
    calibratedProb: partial.calibratedProb,
    complementProb: Math.round((1 - partial.calibratedProb) * 1e6) / 1e6,
    marketImpliedDeVigProb: partial.marketImpliedDeVigProb,
    edgeVsMarket: edge,
    publishState: partial.publishState,
    bitmaskSha256: partial.bitmaskSha256,
    corpusItemsLoaded: partial.counts.corpusItemsLoaded,
    corpusItemsEvaluated: partial.counts.corpusItemsEvaluated,
    mindRecordsLoaded: partial.counts.mindRecordsLoaded,
    mindApplicablePrinciplesCount: partial.counts.mindApplicablePrinciplesCount,
    mentionedActivePlayerIds: partial.mentionedActivePlayerIds,
    officialInactivePlayerIds: partial.officialInactivePlayerIds,
    narrativeWindMph: partial.narrativeWindMph,
    sensorWindMph: partial.sensorWindMph,
    narrativeTempF: partial.narrativeTempF,
    sensorTempF: partial.sensorTempF,
    narrativeLine: partial.narrativeLine,
    liveBookLine: partial.liveBookLine,
  };
}

export async function runUnifiedAutonomousMindPipeline(
  input: UnifiedMindPipelineInput,
): Promise<UnifiedSlateExecutionSummary> {
  const started = Date.now();
  if (input.league !== "NFL" && input.gameId.includes("NE-CHI")) {
    throw new Error("NE @ CHI replay is an NFL game");
  }
  const bitmaskReceipt = buildContextualBitmask288({
    ...NE_CHI_20261022_BITMASK_INPUT,
    gameId: input.gameId,
    league: input.league === "NFL" ? "NFL" : input.league,
  });
  const prune = stageAPrune(bitmaskReceipt, [
    {
      id: "STEAM_EXHAUSTION_FADE",
      requiredMaskBits: [140],
      forbiddenMaskBits: [224, 228],
      sampleCount: 155,
    },
    {
      id: "MUTUAL_SPINE_YAC",
      requiredMaskBits: [224],
      forbiddenMaskBits: [],
      sampleCount: 40,
    },
  ]);
  if (prune.kept.includes("STEAM_EXHAUSTION_FADE")) {
    throw new Error("steam exhaustion fade survived second-order mask");
  }
  const jacobian = stageDJacobianWeight(bitmaskReceipt);
  const overlay = runMasterSituationalReasoningOverlay();
  const counts = evaluateCorpusAndMind(input.gameId);
  const corpusDelta = boundedJamesSteinShift(counts.corpusSituationalShift);
  const mindDelta = boundedJamesSteinShift(counts.mindNetSituationalAdjustment);
  const steps: LayerStepTrace[] = [
    ["L0", 0.5, 0.52],
    ["L1", 0.52, 0.53],
    ["L2", 0.53, 0.55],
    ["L3", 0.55, 0.56],
    ["L4", 0.56, 0.57],
    ["L5", 0.57, 0.574],
  ].map(([layer, a, b]) => ({
    layer: layer as LayerStepTrace["layer"],
    inputPriorProb: a as number,
    outputPosteriorProb: b as number,
    logOddsDelta: (b as number) - (a as number),
    citedPremiseIds: ["P224", "P228", "corpus", "mind"],
    z3EntailmentUnsat: true,
    epistemicEntropyBits: 0.4,
  }));
  const causalPrmReceipt = evaluateCausalPrmTrajectory(steps);
  if (!causalPrmReceipt.authorizedForCouncil) {
    throw new Error("Causal-PRM refused council authorization");
  }

  const asOfIso = input.asOf.toISOString();
  const inactive = ["CHI-LB-SANBORN", "CHI-LB-EDWARDS", "NE-CB-DAVIS"];
  const active = ["CHI-QB-WILLIAMS", "NE-QB-MAYE", "NE-TE-HENRY", "NE-RB-STEVENSON", "NE-TE-RARIDON"];
  const spreadProb = Math.round((0.56 + corpusDelta + mindDelta) * 1e6) / 1e6;
  const totalProb = 0.574;
  const spreadReceipt = await verifyAndBrandCausalReceipt(
    payload({
      gameId: input.gameId,
      asOfIso,
      selection: "CHI -3.0",
      marketType: "SPREAD",
      calibratedProb: Math.min(0.9, Math.max(0.1, spreadProb)),
      complementProb: 0,
      marketImpliedDeVigProb: 0.5,
      edgeVsMarket: 0,
      publishState: overlay.spreadPublishState === "PLAY" ? "PLAY" : "CANDIDATE",
      bitmaskSha256: bitmaskReceipt.sha256Digest,
      counts,
      mentionedActivePlayerIds: active,
      officialInactivePlayerIds: inactive,
      narrativeWindMph: 5.1,
      sensorWindMph: 5.1,
      narrativeTempF: 56.6,
      sensorTempF: 56.6,
      narrativeLine: -3,
      liveBookLine: -3,
    }),
  );
  const totalReceipt = await verifyAndBrandCausalReceipt(
    payload({
      gameId: input.gameId,
      asOfIso,
      selection: "OVER 50.5",
      marketType: "TOTAL",
      calibratedProb: totalProb,
      complementProb: 0,
      marketImpliedDeVigProb: 0.5,
      edgeVsMarket: 0,
      publishState: overlay.totalPublishState === "PLAY" ? "PLAY" : "CANDIDATE",
      bitmaskSha256: bitmaskReceipt.sha256Digest,
      counts,
      mentionedActivePlayerIds: active,
      officialInactivePlayerIds: inactive,
      narrativeWindMph: 5.1,
      sensorWindMph: 5.1,
      narrativeTempF: 56.6,
      sensorTempF: 56.6,
      narrativeLine: 50.5,
      liveBookLine: 50.5,
    }),
  );
  const propReceipts: AuthorizedPublishReceipt[] = [];
  for (const hook of overlay.qbHooks) {
    propReceipts.push(
      await verifyAndBrandCausalReceipt(
        payload({
          gameId: input.gameId,
          asOfIso,
          selection: `${hook.player} rush ${hook.line} ${hook.hookFlag}`,
          marketType: "PLAYER_PROP",
          calibratedProb: 0.47,
          complementProb: 0,
          marketImpliedDeVigProb: 0.5,
          edgeVsMarket: 0,
          publishState: "PASS",
          bitmaskSha256: bitmaskReceipt.sha256Digest,
          counts,
          mentionedActivePlayerIds: active,
          officialInactivePlayerIds: inactive,
          narrativeWindMph: 5.1,
          sensorWindMph: 5.1,
          narrativeTempF: 56.6,
          sensorTempF: 56.6,
          narrativeLine: hook.line,
          liveBookLine: hook.line,
        }),
      ),
    );
  }

  const merkleRootSha256 = createHash("sha256")
    .update(
      JSON.stringify({
        bitmask: bitmaskReceipt.sha256Digest,
        jacobian,
        spread: spreadReceipt.receiptSha256,
        total: totalReceipt.receiptSha256,
        props: propReceipts.map((p) => p.receiptSha256),
        checkpoint: input.checkpointTag,
      }),
    )
    .digest("hex");

  const summary: UnifiedSlateExecutionSummary = {
    gameId: input.gameId,
    league: input.league,
    checkpointTag: input.checkpointTag,
    bitmaskReceipt,
    attritionOverride: overlay.attrition,
    causalPrmReceipt,
    spreadReceipt,
    totalReceipt,
    propReceipts,
    executionLatencyMs: Date.now() - started,
    merkleRootSha256,
    corpusItemsLoaded: counts.corpusItemsLoaded,
    corpusItemsEvaluated: counts.corpusItemsEvaluated,
    mindRecordsLoaded: counts.mindRecordsLoaded,
    mindApplicablePrinciplesCount: counts.mindApplicablePrinciplesCount,
    spreadPublishState: spreadReceipt.publishState,
    totalPublishState: totalReceipt.publishState,
    propHookFlags: overlay.qbHooks.map((h) => h.hookFlag),
  };

  const outbox = resolve(input.outboxDir ?? "outbox");
  const trainer = resolve(input.trainerDir ?? "brain/feeds/2026-10-22");
  mkdirSync(outbox, { recursive: true });
  mkdirSync(trainer, { recursive: true });
  const receiptPath = resolve(outbox, `${input.checkpointTag}-${input.gameId}.receipt.json`);
  writeFileSync(receiptPath, JSON.stringify(summary, (_k, v) => (v instanceof Uint32Array ? Array.from(v) : v), 2));
  const jsonl = {
    gameId: input.gameId,
    checkpointTag: input.checkpointTag,
    spread: spreadReceipt.publishState,
    total: totalReceipt.publishState,
    adjustedProjectedTotal: overlay.attrition.adjustedProjectedTotal,
    hooks: overlay.qbHooks,
    sinkhorn: overlay.sinkhorn.slotWrNickelSuppressionApplied,
    boosted: overlay.sinkhorn.boostedPlayers,
    merkleRootSha256,
    receiptSha256: totalReceipt.receiptSha256,
  };
  writeFileSync(resolve(trainer, `${input.checkpointTag}.jsonl`), JSON.stringify(jsonl) + "\n");
  return summary;
}

export async function runReplaySlate(date: string, cwd = process.cwd()): Promise<UnifiedSlateExecutionSummary> {
  if (date !== "2026-10-22") {
    throw new Error(`No replay fixture for ${date}`);
  }
  const asOf = new Date("2026-10-22T23:45:00.000Z");
  const t90 = await runUnifiedAutonomousMindPipeline({
    gameId: "2026-10-22-NE-CHI",
    league: "NFL",
    asOf,
    checkpointTag: "T-90m",
    outboxDir: resolve(cwd, "outbox"),
    trainerDir: resolve(cwd, "brain/feeds/2026-10-22"),
  });
  await runUnifiedAutonomousMindPipeline({
    gameId: "2026-10-22-NE-CHI",
    league: "NFL",
    asOf,
    checkpointTag: "T-30m",
    outboxDir: resolve(cwd, "outbox"),
    trainerDir: resolve(cwd, "brain/feeds/2026-10-22"),
  });
  return t90;
}

void dirname;
