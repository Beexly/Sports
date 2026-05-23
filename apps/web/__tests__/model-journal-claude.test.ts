import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CLAUDE_API_BUDGETS } from "@/lib/claude-api/cost-monitor";
import { generateModelJournalDraftMarkdown } from "@/lib/journal/claude";
import type { JournalWeekData } from "@/lib/journal/week-data";

const weekData: JournalWeekData = {
  isoWeek: 21,
  isoYear: 2026,
  rangeStart: "2026-05-18T00:00:00.000Z",
  rangeEnd: "2026-05-25T00:00:00.000Z",
  counts: {
    settledPicks: 1,
    wins: 1,
    losses: 0,
    pushes: 0,
    publicLossAutopsies: 0,
  },
  picks: [
    {
      id: "pick-bos-1",
      gameId: "game-bos-nyk",
      matchup: "BOS @ NYK",
      sportId: "basketball_nba",
      leagueId: "NBA",
      selection: "BOS -3.5",
      pickType: "SPREAD",
      tier: "FREE",
      pickGrade: "SOLID_PLAY",
      result: "WIN",
      settledAt: "2026-05-22T03:00:00.000Z",
      confidence: 72,
      edgeScore: 4.2,
      consensusPct: 0.68,
      bookmakerCount: 8,
      modelVersion: "v5.0.0",
      reasoning: "Consensus and line movement supported Boston.",
      factorBreakdown: { consensus: 0.68 },
      signalSnapshot: {
        id: "snap-1",
        capturedAt: "2026-05-21T18:00:00.000Z",
        eligibleForLearning: true,
        settlementResult: "WIN",
      },
    },
  ],
  lossAutopsies: [],
};

describe("Model Journal Claude generation", () => {
  it("enforces the Model Journal budget before calling Claude", async () => {
    const fetchImpl = vi.fn();

    await expect(
      generateModelJournalDraftMarkdown(weekData, {
        apiKey: "test-key",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        monthlySpendUsd: 50,
        budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.MODEL_JOURNAL_DRAFT,
      })
    ).rejects.toThrow("The Model Journal weekly draft is paused");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("records successful Model Journal draft calls", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "## Week In Numbers\n\nDraft body." }],
          usage: { input_tokens: 1200, output_tokens: 800 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    const markdown = await generateModelJournalDraftMarkdown(weekData, {
      apiKey: "test-key",
      fetchImpl,
      monthlySpendUsd: 0,
      budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.MODEL_JOURNAL_DRAFT,
      recordUsage: true,
      userId: "admin@example.com",
      usageClient: {
        claudeApiCallRecord: {
          aggregate: vi.fn(),
          create,
        },
      },
    });

    expect(markdown).toContain("Week In Numbers");
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "MODEL_JOURNAL_DRAFT",
      modelName: "claude-sonnet-4-6",
      inputTokens: 1200,
      outputTokens: 800,
      estimatedCostUsd: 0.0156,
      userId: "admin@example.com",
      templateKind: "MODEL_JOURNAL_DRAFT",
      success: true,
      errorKind: null,
    });
  });
});
