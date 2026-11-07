import { describe, expect, it } from "vitest";
import {
  computeWiringScore,
  getWiringLabel,
  CAPABILITY_REGISTRY,
  GSE_143_SKILLS_AND_PLUGINS_SUMMARY,
} from "@/lib/jarvis/capability-registry";
import { buildIntelligenceGrowthSnapshot } from "@/lib/intelligence/growth-observatory";
import { loadVerifiedConnectedWorkflowBundle } from "@/lib/engine/connected-workflow-loader";
import { METRIC_COVERAGE, clearedMetrics } from "@/lib/metrics/coverage-map";
import {
  shouldRenderPostHogAnalytics,
  shouldEnableCopilotKitTelemetry,
} from "@/lib/analytics/provider-gating";
import { SOCIAL } from "@/lib/brand";
import { loadCreditStackPosture } from "@/lib/ops/credit-stack-posture";
import {
  getWeek9VideoAndRevenueSummary,
  getMultiChannelVideoScripts,
  getDfsAndPlaysCommercialPosture,
  getRevenueStreamAttributionMatrix,
} from "@/lib/content-os/video-and-revenue-engine";

describe("Mega-Sweep 2026-11-06 & Live Surface Truth Wiring", () => {
  it("elevates Jarvis Capability Registry wiring score from 44/100 to 67/100 (Building) without claiming false autonomy", () => {
    const score = computeWiringScore();
    expect(score).toBe(67);
    expect(getWiringLabel(score)).toBe("Building");
    expect(CAPABILITY_REGISTRY.every((c) => c.canExecute === false)).toBe(true);
    expect(GSE_143_SKILLS_AND_PLUGINS_SUMMARY.totalCoreSkills).toBe(143);
    expect(GSE_143_SKILLS_AND_PLUGINS_SUMMARY.agyCliPluginsRegistered).toBe(7);
    expect(GSE_143_SKILLS_AND_PLUGINS_SUMMARY.zeroRecursiveSymlinksVerified).toBe(true);
  });

  it("wires 210 books, 372 repos/URLs, 40 Morning Sweep CSVs/Kernels, 742 Pinecone vectors, 71 xAI waves, 17 Downloads packs, 143 skills, 721 openai/math manuscripts, 167 Jules sessions, and 204 Coupled 5-API GSE/GSI nodes into Growth Observatory", () => {
    const snap = buildIntelligenceGrowthSnapshot();
    expect(snap.quadEngineCounts.megaSweepBooksIngested).toBe(210);
    expect(snap.quadEngineCounts.megaSweepReposAndUrlsWired).toBe(372);
    expect(snap.quadEngineCounts.morningSweepCsvsAndKernels).toBe(40);
    expect(snap.quadEngineCounts.pineconeHybridVectors).toBe(742);
    expect(snap.quadEngineCounts.xaiOmniscienceWavesExecuted).toBe(71);
    expect(snap.quadEngineCounts.coupled5ApiScientificNodes).toBe(204);
    expect(snap.quadEngineCounts.reverseInterleaved8StepCascadeNodes).toBe(8);
    expect(snap.quadEngineCounts.posthogDataWarehouseTablesSynced).toBe(5);
    expect(snap.quadEngineCounts.downloadsFlagshipPacksWired).toBe(17);
    expect(snap.quadEngineCounts.sovereignOpenAiEyiKernelsWired).toBe(9);
    expect(snap.quadEngineCounts.registeredAgentSkillsWired).toBe(143);
    expect(snap.quadEngineCounts.agyCliPluginsRegistered).toBe(7);
    expect(snap.quadEngineCounts.openaiMathManuscriptsWired).toBe(721);
    expect(snap.quadEngineCounts.openaiMathResultFamiliesWired).toBe(373);
    expect(snap.quadEngineCounts.openaiMathLeanFilesCataloged).toBe(53554);
    expect(snap.quadEngineCounts.openaiEcosystemReposWired).toBe(10);
    expect(snap.quadEngineCounts.copilotKitEcosystemReposWired).toBe(5);
    expect(snap.quadEngineCounts.julesConnectedSourcesCount).toBe(28);
    expect(snap.quadEngineCounts.julesTotalSessionsAudited).toBe(167);
    expect(snap.quadEngineCounts.julesCompletedPatchOutputsHarvested).toBe(75);
    expect(snap.quadEngineCounts.freeTechnicalTextbooksIndexed).toBe(1116);
    expect(snap.quadEngineCounts.totalCanonicalNodes).toBe(5620);
    expect(snap.routerFunnel.stageA).toBe(5620);
    expect(snap.postGameAutopsyStats.brierTrajectory.some((p) => p.week === "W9_TNF")).toBe(true);
  });

  it("exposes verified 2026-11-06 Mega-Sweep, Coupled 5-API + 8-Step Reverse Cascade, 17 Downloads Flagship Packs, OpenAI Math 721 + Jules 167 Sessions + OpenDots, and Pre-Projection/Simulation Conditioned Overlay in Connected Workflow Loader", () => {
    const bundle = loadVerifiedConnectedWorkflowBundle();
    expect(bundle.status).toBe("CONNECTED_WORKFLOW_VERIFIED");
    expect(bundle.megaSweep20261106Summary).toEqual({
      booksCataloged: 210,
      driveUniquePdfsExtracted: 197,
      totalDrivePdfsScanned: 395,
      mdWaveFilesScanned: 41,
      reposAndUrlsWired: 372,
      morningSweepCsvsWired: 30,
      innovationKernelsWired: 10,
      gseMlServiceModelsWired: 5,
      amHarvestReposWired: 20,
      ngsAndCommercialFullIngestActive: true,
    });
    expect(bundle.coupled5ApiOmniscienceSummary).toEqual({
      xaiWavesExecuted: 71,
      arxivPreprintsHarvested: 48,
      openalexWorksHarvested: 60,
      huggingfaceAssetsHarvested: 52,
      kaggleDatasetsHarvested: 43,
      totalCrossApiScientificNodes: 204,
      gseAndGsiDualEngineActive: true,
      reverseInterleaved8StepCascadeActive: true,
      reverseCascadeOrder: [
        "kaggle_to_xai",
        "arxiv_to_xai",
        "openalex_to_xai",
        "huggingface_to_xai",
      ],
      posthogDataWarehouseTablesSynced: 5,
      pineconeHybridVectorsIndexed: 742,
      bazelBuildOptimizationConfigured: true,
    });
    expect(bundle.preProjectionAndSimulationConditionedOverlay).toEqual({
      universal360SuitesActive: true,
      deepNonStationaryKernelsCount: 6,
      stage2CognitiveRouterInjectedSignals: 13,
      stage3SimulationWorldsConditioned: 10000,
      stage3SnapsPerWorld: 175,
      subSecondVectorizedExecutionVerified: true,
    });
    expect(bundle.downloads10FlagshipPacksAndSovereignSummary).toEqual({
      flagshipFilesAudited: 17,
      grokExportConversationMarkers: 39635,
      eyiWorkspaceFilesCataloged: 1514,
      sovereignOpenAiEyiKernelsActive: 9,
      registeredSkillsCount: 143,
      agyCliPluginsCount: 7,
      federalPatentPortfolioTargetUsd: 20000000,
    });
    expect(bundle.openAiMathAndJulesOpenDotsSummary).toEqual({
      manuscriptsWired: 721,
      resultFamiliesWired: 373,
      leanFilesCataloged: 53554,
      comparatorChallengesWired: 419,
      openaiReposWired: 10,
      copilotKitReposWired: 5,
      openDotsLocalUiUrl: "http://127.0.0.1:5173",
      openDotsApiPort: 4310,
      parallelAiSearchMcpWired: true,
      julesConnectedSourcesCount: 28,
      julesTotalSessionsAudited: 167,
      julesCompletedPatchesArchived: 75,
      julesActiveSessionId: "2776851182236750878",
      doctrine19RulesPassed: 19,
      freeTechnicalTextbooksIndexed: 1116,
    });
  });

  it("registers 9 cleared Tier-1 football intelligence metrics in Coverage Map", () => {
    expect(METRIC_COVERAGE.length).toBe(9);
    expect(clearedMetrics().length).toBe(9);
  });

  it("gates PostHog and CopilotKit/OpenDots telemetry independently", () => {
    expect(shouldRenderPostHogAnalytics("true", "phc_test_key")).toBe(true);
    expect(shouldRenderPostHogAnalytics("false", "phc_test_key")).toBe(false);
    expect(shouldRenderPostHogAnalytics("true", undefined)).toBe(false);
    expect(shouldRenderPostHogAnalytics("true", "  ")).toBe(false);
    expect(shouldEnableCopilotKitTelemetry(undefined, "true")).toBe(false);
    expect(shouldEnableCopilotKitTelemetry("1", undefined)).toBe(false);
    expect(shouldEnableCopilotKitTelemetry("false", "false")).toBe(true);
  });

  it("wires official Galaxy Sports Edge LinkedIn company page in brand SOCIAL", () => {
    expect(SOCIAL.linkedin).toBe("https://www.linkedin.com/company/galaxy-sports-edge");
  });

  it("reports Pinecone, PostHog, Inbox Zero, xAI ($37.98), Google Jules, and $55,656.31 verified grant stack in CreditStackPosture without leaking secrets", () => {
    const posture = loadCreditStackPosture({
      PINECONE_API_KEY: "pcsk_secret_do_not_leak",
      POSTHOG_PERSONAL_API_KEY: "phx_secret_do_not_leak",
      EMAIL_ENCRYPT_SECRET: "inbox_secret_do_not_leak",
      XAI_API_KEY: "xai_secret_do_not_leak",
      JULES_API_KEY: "AQ.secret_do_not_leak",
    });
    expect(posture.pineconeConfigured).toBe(true);
    expect(posture.posthogConfigured).toBe(true);
    expect(posture.inboxZeroConfigured).toBe(true);
    expect(posture.xaiConfigured).toBe(true);
    expect(posture.julesApiKeyConfigured).toBe(true);
    expect(posture.xaiCreditsRemainingUsd).toBe(37.98);
    expect(posture.verifiedGrantStackUsd).toBe(55656.31);
    expect(posture.submittedPipelineCount).toBe(24);
    expect(JSON.stringify(posture)).not.toContain("secret_do_not_leak");
  });

  it("wires Week 9 Plays (47-19-1, +26.50u), DraftKings/FanDuel DFS, 5 Multi-Channel Short-Form Video Scripts, and 7 Revenue Attribution Streams without leaking paid picks", () => {
    const summary = getWeek9VideoAndRevenueSummary();
    const scripts = getMultiChannelVideoScripts();
    const dfsPosture = getDfsAndPlaysCommercialPosture();
    const streams = getRevenueStreamAttributionMatrix();

    expect(summary.record).toBe("47-19-1");
    expect(summary.winRateLabel).toBe("72.9%");
    expect(summary.netUnits).toBe(26.5);
    expect(scripts.length).toBe(5);
    expect(scripts.every((s) => s.paywallSafe === true)).toBe(true);
    expect(dfsPosture.verifiedRecord.record).toBe("47-19-1");
    expect(dfsPosture.dfsPlatformsSupported).toEqual(["DraftKings", "FanDuel"]);
    expect(dfsPosture.officialPicksAndLineupsGated).toBe(true);
    expect(streams.length).toBe(7);
  });
});
