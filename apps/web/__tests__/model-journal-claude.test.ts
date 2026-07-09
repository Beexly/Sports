import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CLAUDE_API_BUDGETS } from "@/lib/claude-api/cost-monitor";
import {
  evaluateModelJournalDraftPolicy,
  generateModelJournalDraftMarkdown,
} from "@/lib/journal/claude";
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

  it("records a policy failure when Claude returns blocked Journal copy", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "## Week In Numbers\n\nThis was an AI-powered week." }],
          usage: { input_tokens: 1200, output_tokens: 400 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-policy" });

    await expect(
      generateModelJournalDraftMarkdown(weekData, {
        apiKey: "test-key",
        fetchImpl,
        monthlySpendUsd: 0,
        budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.MODEL_JOURNAL_DRAFT,
        recordUsage: true,
        usageClient: {
          claudeApiCallRecord: {
            aggregate: vi.fn(),
            create,
          },
        },
      })
    ).rejects.toThrow("policy validation");

    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "MODEL_JOURNAL_DRAFT",
      success: false,
      errorKind: "POLICY_L1-AI-POWERED",
    });
  });

  it("exposes Journal draft policy checks for cockpit routes", () => {
    expect(evaluateModelJournalDraftPolicy("")).toEqual(["EMPTY"]);
    expect(evaluateModelJournalDraftPolicy("We believe this was a clean sample.")).toEqual(
      expect.arrayContaining(["MJ-FIRST-PERSON-CONFIDENCE"])
    );
  });

  describe("numeric grounding guard (fabricated-stat safety net)", () => {
    // Real week: 7 wins, 4 losses. The prompt exposes those counts + a 64% consensus.
    const grounding = {
      promptText: "Settled picks (11) | consensus 64% | 12 books",
      counts: { settledPicks: 11, wins: 7, losses: 4, pushes: 0, publicLossAutopsies: 2 },
    };

    it("blocks a fabricated win-loss record (9-2 when the week was 7-4)", () => {
      const draft = "The model closed the week 9-2 on settled sides, its best stretch yet.";
      expect(evaluateModelJournalDraftPolicy(draft, grounding)).toContain("UNGROUNDED_NUMERIC");
    });

    it("blocks an invented win rate the prompt never contained", () => {
      const draft = "We connected on 81% of our settled unders this week.";
      expect(evaluateModelJournalDraftPolicy(draft, grounding)).toContain("UNGROUNDED_NUMERIC");
    });

    it("passes copy that only cites grounded numbers (real record + a given consensus)", () => {
      const draft = "A steady 7-4 week; the market consensus sat near 64% on our best read.";
      expect(evaluateModelJournalDraftPolicy(draft, grounding)).not.toContain("UNGROUNDED_NUMERIC");
    });

    it("does not run the numeric check when no grounding is supplied (backward compatible)", () => {
      expect(evaluateModelJournalDraftPolicy("A 9-2 week.")).not.toContain("UNGROUNDED_NUMERIC");
    });
  });
});
