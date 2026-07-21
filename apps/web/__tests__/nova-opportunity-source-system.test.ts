import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPPORTUNITY_SOURCES,
  evaluateDataAssetUse,
  getMonetizationLane,
  getOpportunitySource,
  parseOpportunitySourcePayload,
  scheduleOpportunitySources,
} from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-21T12:00:00.000Z");

describe("NOVA source scheduling and adapters", () => {
  it("prioritizes due security and credit sources while respecting capacity", () => {
    const selected = scheduleOpportunitySources(
      DEFAULT_OPPORTUNITY_SOURCES,
      [],
      NOW,
      { maxSourcesPerCycle: 2, includeDisabled: false },
    ).filter((item) => item.due);
    expect(selected).toHaveLength(2);
    expect(selected.every((item) => item.source.enabledByDefault)).toBe(true);
    expect(selected[0]!.priority).toBeGreaterThanOrEqual(selected[1]!.priority);
  });

  it("holds manual snapshots and disabled experimental sources", () => {
    const sources = [getOpportunitySource("aws-activate")!, getOpportunitySource("coinbase-x402")!];
    const scheduled = scheduleOpportunitySources(sources, [], NOW, { maxSourcesPerCycle: 2, includeDisabled: false });
    expect(scheduled.find((item) => item.source.id === "aws-activate")?.due).toBe(false);
    expect(scheduled.find((item) => item.source.id === "coinbase-x402")?.due).toBe(false);
  });

  it("normalizes GitHub release metadata without retaining raw bodies", () => {
    const source = getOpportunitySource("openai-codex-releases")!;
    const parsed = parseOpportunitySourcePayload(source, JSON.stringify([
      { id: 7, tag_name: "v7", name: "Codex v7", html_url: "https://github.com/openai/codex/releases/tag/v7", published_at: "2026-07-20T10:00:00Z", draft: false, prerelease: false },
      { id: 8, tag_name: "draft", html_url: "https://example.com/draft", draft: true },
    ]), NOW);
    expect(parsed.observations).toHaveLength(1);
    expect(parsed.observations[0]?.externalId).toBe("7");
    expect(parsed.rawBodyRetained).toBe(false);
  });

  it("normalizes MCP registry records without granting install authority", () => {
    const source = getOpportunitySource("mcp-official-registry")!;
    const parsed = parseOpportunitySourcePayload(source, JSON.stringify({
      servers: [{ server: { name: "io.example/tool", version: "1.2.3", repository: { url: "https://github.com/example/tool" } }, _meta: { status: "active", publishedAt: "2026-07-20T10:00:00Z" } }],
    }), NOW);
    expect(parsed.observations[0]?.externalId).toBe("io.example/tool@1.2.3");
    expect(source.prohibitedCapture).toContain("automatic install");
  });
});

describe("NOVA economic and data-asset controls", () => {
  it("defines proof and metrics for every monetization lane", () => {
    const lane = getMonetizationLane("usage_based_api");
    expect(lane.requiredProof).toEqual(expect.arrayContaining(["metering", "billing event"]));
    expect(lane.requiredMetrics).toContain("gross margin");
  });

  it("treats credits as non-dilutive economic leverage rather than revenue", () => {
    expect(getMonetizationLane("cloud_credit").economicType).toBe("NON_DILUTIVE");
    expect(getMonetizationLane("cost_avoidance").economicType).toBe("COST_LEVER");
  });

  it("blocks training and data licensing without explicit rights", () => {
    const record = {
      assetId: "signals",
      sourceIds: ["third-party"],
      rightsStatus: "unknown" as const,
      ownedByGse: false,
      containsPersonalData: false,
      containsThirdPartyExpression: true,
      commercialUseAllowed: false,
      derivedUseAllowed: false,
      modelTrainingAllowed: false,
      redistributionAllowed: false,
      deletionProcessDefined: false,
      reviewedAt: "2026-07-21T00:00:00Z",
      evidenceUrls: [],
    };
    expect(evaluateDataAssetUse(record, "model_training").allowed).toBe(false);
    expect(evaluateDataAssetUse(record, "training_data_license").reasons.join(" ")).toMatch(/training|redistribution|rights/i);
  });

  it("allows owned, cleared derived assets through audit and owner review", () => {
    const decision = evaluateDataAssetUse({
      assetId: "gse-derived-benchmark",
      sourceIds: ["gse-owned"],
      rightsStatus: "cleared",
      ownedByGse: true,
      containsPersonalData: false,
      containsThirdPartyExpression: false,
      commercialUseAllowed: true,
      derivedUseAllowed: true,
      modelTrainingAllowed: true,
      redistributionAllowed: true,
      deletionProcessDefined: true,
      reviewedAt: "2026-07-21T00:00:00Z",
      evidenceUrls: ["https://example.com/license"],
    }, "evaluation_benchmark");
    expect(decision.allowed).toBe(true);
    expect(decision.auditRequired).toBe(true);
    expect(decision.ownerApprovalRequired).toBe(true);
  });
});
