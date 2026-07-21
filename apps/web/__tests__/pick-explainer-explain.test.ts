import { describe, expect, it, vi } from "vitest";
import { explainPick } from "@/lib/pick-explainer/explain";
import type { FactorBreakdown } from "@sports/types";

const CITE = "(source: factor_breakdown at 2026-04-15T17:00:00.000Z)";

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
      result: "PENDING",
      factorBreakdown,
    },
    snapshot: {
      capturedAt: new Date("2026-04-15T17:00:00Z"),
      confidenceAtPrediction: 72,
      dataQualityScore: 80,
      bookmakerCount: 9,
      lineMovementDelta: 6.0,
      settlementResult: null,
      signalFlags: {},
    },
  };
}

function claudeResponse(text: string) {
  return vi.fn(
    async () =>
      new Response(
        JSON.stringify({ content: [{ type: "text", text }], usage: { input_tokens: 400, output_tokens: 90 } }),
        { status: 200 },
      ),
  );
}

describe("explainPick — dispatch telemetry", () => {
  it("persists dispatch telemetry alongside the usage record", async () => {
    const fetchImpl = claudeResponse(
      `The pick is driven by an 84% bookmaker consensus and a +6.1 line-movement factor ${CITE}.`,
    );
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    await explainPick({
      apiKey: "test-key",
      grounding: grounding() as never,
      fetchImpl,
      recordUsage: true,
      usageClient: { claudeApiCallRecord: { aggregate: vi.fn(), create } },
    });

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "PICK_EXPLANATION",
      success: true,
      costMode: "normal",
      providerRequested: "anthropic",
      providerUsed: "anthropic",
      billingPool: "anthropic_direct",
      fallbackReason: null,
    });
  });

  it("still persists a dispatch record on a policy failure", async () => {
    const fetchImpl = claudeResponse("You should bet more on this — guaranteed win.");
    const create = vi.fn().mockResolvedValue({ id: "record-2" });

    await expect(
      explainPick({
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
