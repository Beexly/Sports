import { describe, expect, it } from "vitest";
import { computeWiringScore, getWiringLabel, CAPABILITY_REGISTRY } from "@/lib/jarvis/capability-registry";
import { buildIntelligenceGrowthSnapshot } from "@/lib/intelligence/growth-observatory";
import { loadVerifiedConnectedWorkflowBundle } from "@/lib/engine/connected-workflow-loader";
import { METRIC_COVERAGE, clearedMetrics } from "@/lib/metrics/coverage-map";
import { shouldRenderPostHogAnalytics } from "@/lib/analytics/provider-gating";
import { SOCIAL } from "@/lib/brand";
import { loadCreditStackPosture } from "@/lib/ops/credit-stack-posture";

describe("Mega-Sweep 2026-11-06 & Live Surface Truth Wiring", () => {
  it("elevates Jarvis Capability Registry wiring score from 44/100 to 67/100 (Building) without claiming false autonomy", () => {
    const score = computeWiringScore();
    expect(score).toBe(67);
    expect(getWiringLabel(score)).toBe("Building");
    expect(CAPABILITY_REGISTRY.every((c) => c.canExecute === false)).toBe(true);
  });

  it("wires 210 books, 372 repos/URLs, 40 Morning Sweep CSVs/Kernels, 624 Pinecone vectors, 48 xAI waves, and 204 Coupled 5-API GSE/GSI nodes into Growth Observatory", () => {
    const snap = buildIntelligenceGrowthSnapshot();
    expect(snap.quadEngineCounts.megaSweepBooksIngested).toBe(210);
    expect(snap.quadEngineCounts.megaSweepReposAndUrlsWired).toBe(372);
    expect(snap.quadEngineCounts.morningSweepCsvsAndKernels).toBe(40);
    expect(snap.quadEngineCounts.pineconeHybridVectors).toBe(624);
    expect(snap.quadEngineCounts.xaiOmniscienceWavesExecuted).toBe(48);
    expect(snap.quadEngineCounts.coupled5ApiScientificNodes).toBe(204);
    expect(snap.quadEngineCounts.totalCanonicalNodes).toBe(4622);
    expect(snap.routerFunnel.stageA).toBe(4622);
    expect(snap.postGameAutopsyStats.brierTrajectory.some((p) => p.week === "W9_TNF")).toBe(true);
  });

  it("exposes verified 2026-11-06 Mega-Sweep and Coupled 5-API GSE/GSI Omniscience summaries in Connected Workflow Loader", () => {
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
      xaiWavesExecuted: 48,
      arxivPreprintsHarvested: 48,
      openalexWorksHarvested: 60,
      huggingfaceAssetsHarvested: 52,
      kaggleDatasetsHarvested: 43,
      totalCrossApiScientificNodes: 204,
      gseAndGsiDualEngineActive: true,
    });
  });

  it("registers 9 cleared Tier-1 football intelligence metrics in Coverage Map", () => {
    expect(METRIC_COVERAGE.length).toBe(9);
    expect(clearedMetrics().length).toBe(9);
  });

  it("gates PostHog analytics independently on master flag and project key", () => {
    expect(shouldRenderPostHogAnalytics("true", "phc_test_key")).toBe(true);
    expect(shouldRenderPostHogAnalytics("false", "phc_test_key")).toBe(false);
    expect(shouldRenderPostHogAnalytics("true", undefined)).toBe(false);
    expect(shouldRenderPostHogAnalytics("true", "  ")).toBe(false);
  });

  it("wires official Galaxy Sports Edge LinkedIn company page in brand SOCIAL", () => {
    expect(SOCIAL.linkedin).toBe("https://www.linkedin.com/company/galaxy-sports-edge");
  });

  it("reports Pinecone, PostHog, Inbox Zero, xAI ($37.98), and $55,656.31 verified grant stack in CreditStackPosture without leaking secrets", () => {
    const posture = loadCreditStackPosture({
      PINECONE_API_KEY: "pcsk_secret_do_not_leak",
      POSTHOG_PERSONAL_API_KEY: "phx_secret_do_not_leak",
      EMAIL_ENCRYPT_SECRET: "inbox_secret_do_not_leak",
      XAI_API_KEY: "xai_secret_do_not_leak",
    });
    expect(posture.pineconeConfigured).toBe(true);
    expect(posture.posthogConfigured).toBe(true);
    expect(posture.inboxZeroConfigured).toBe(true);
    expect(posture.xaiConfigured).toBe(true);
    expect(posture.xaiCreditsRemainingUsd).toBe(37.98);
    expect(posture.verifiedGrantStackUsd).toBe(55656.31);
    expect(posture.submittedPipelineCount).toBe(24);
    expect(JSON.stringify(posture)).not.toContain("secret_do_not_leak");
  });
});
