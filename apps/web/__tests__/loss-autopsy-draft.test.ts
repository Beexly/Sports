import { describe, expect, it, vi } from "vitest";
import { draftLossAutopsy } from "@/lib/loss-autopsy/draft";
import type { FactorBreakdown } from "@sports/types";

const CITE = "(source: signal_snapshot at 2026-04-15T17:00:00.000Z)";

const factorBreakdown: FactorBreakdown = {
  consensusScore: 22,
  marketDepthScore: 18,
  edgeScore: 12,
  lineMovementScore: 6,
  volatilityPenalty: 0,
  headToHeadScore: 0,
  dataQualityScore: 80,
  independentEdge: null,
  factors: [
    { name: "Bookmaker Consensus", impact: "positive", description: "84% of books align.", weight: 22 },
  ],
};

function grounding() {
  return {
    game: {
      homeTeamName: "Chiefs",
      awayTeamName: "Eagles",
      sport: "americanfootball_nfl",
      commenceTime: new Date("2026-04-15T18:00:00Z"),
    },
    pick: {
      pickType: "MONEYLINE",
      selection: "Chiefs ML (-180)",
      line: -180,
      confidence: 72,
      edgeScore: 24,
      modelVersion: "v5.0.0",
      generatedAt: new Date("2026-04-15T17:00:00Z"),
      result: "LOSS",
      factorBreakdown,
    },
    snapshot: {
      capturedAt: new Date("2026-04-15T17:00:00Z"),
      confidenceAtPrediction: 72,
      dataQualityScore: 80,
      bookmakerCount: 9,
      lineMovementDelta: 6.0,
      settlementResult: "LOSS",
      signalFlags: {},
    },
  };
}

function validDraftJson(): string {
  return JSON.stringify({
    headline: "Consensus pick lost to a late swing, but the close confirmed the read",
    whatWeSaw: `An 84% bookmaker consensus and a confirming line move ${CITE}.`,
    whatHappened: "The side lost outright; closing-line value was still positive.",
    whatWeLearned: "Process held; this reads as variance, not a model miss.",
    rootCause: "VARIANCE",
    lessonTags: ["variance", "positive-clv"],
  });
}

function claudeResponse(text: string) {
  return vi.fn(
    async () =>
      new Response(
        JSON.stringify({ content: [{ type: "text", text }], usage: { input_tokens: 500, output_tokens: 120 } }),
        { status: 200 },
      ),
  );
}

describe("draftLossAutopsy — dispatch telemetry", () => {
  it("persists dispatch telemetry alongside the usage record", async () => {
    const fetchImpl = claudeResponse(validDraftJson());
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    await draftLossAutopsy({
      apiKey: "test-key",
      grounding: grounding() as never,
      fetchImpl,
      recordUsage: true,
      usageClient: { claudeApiCallRecord: { aggregate: vi.fn(), create } },
    });

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "LOSS_AUTOPSY_DRAFT",
      success: true,
      costMode: "normal",
      providerRequested: "anthropic",
      providerUsed: "anthropic",
      billingPool: "anthropic_direct",
      fallbackReason: null,
    });
  });

  it("still persists a dispatch record when the draft fails validation", async () => {
    const fetchImpl = claudeResponse(JSON.stringify({ headline: "" }));
    const create = vi.fn().mockResolvedValue({ id: "record-2" });

    await expect(
      draftLossAutopsy({
        apiKey: "test-key",
        grounding: grounding() as never,
        fetchImpl,
        recordUsage: true,
        usageClient: { claudeApiCallRecord: { aggregate: vi.fn(), create } },
      }),
    ).rejects.toThrow();

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      success: false,
      providerUsed: "anthropic",
      billingPool: "anthropic_direct",
    });
  });
});
