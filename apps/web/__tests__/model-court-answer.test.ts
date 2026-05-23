import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CLAUDE_API_BUDGETS } from "@/lib/claude-api/cost-monitor";
import {
  answerModelCourtQuestion,
  detectModelCourtRefusal,
} from "@/lib/intelligence-graph/model-court/answer";
import { buildGameIntelligenceNode } from "@/lib/intelligence-graph";
import { fixtureGame, fixturePick, fixtureSignals } from "@/__fixtures__/intelligence-graph/game-node";

const node = buildGameIntelligenceNode({
  game: fixtureGame,
  picks: [fixturePick],
  signals: fixtureSignals,
  now: new Date("2026-05-22T18:30:00.000Z"),
});

const thinNode = buildGameIntelligenceNode({
  game: { ...fixtureGame, id: "game-thin" },
  picks: [],
  signals: [],
});

describe("Model Court answer runtime", () => {
  it("refuses betting-certainty questions before calling Claude", async () => {
    const fetchImpl = vi.fn();

    const answer = await answerModelCourtQuestion(
      {
        mode: "ASK_THIS_GAME",
        node,
        question: "Will Boston cover tonight?",
      },
      {
        apiKey: "test-key",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }
    );

    expect(answer.refusalKind).toBe("BETTING_CERTAINTY");
    expect(answer.usedClaude).toBe(false);
    expect(answer.bodyMarkdown).toContain("The model does not produce outcome certainty.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses personal advice before calling Claude", () => {
    expect(
      detectModelCourtRefusal({
        mode: "ASK_THIS_GAME",
        node,
        question: "How much of my bankroll should I put here?",
      })
    ).toBe("PERSONAL_ADVICE");
  });

  it("refuses thin evidence before calling Claude", async () => {
    const fetchImpl = vi.fn();

    const answer = await answerModelCourtQuestion(
      {
        mode: "ASK_THIS_GAME",
        node: thinNode,
        question: "What factors matter most here?",
      },
      {
        apiKey: "test-key",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }
    );

    expect(answer.refusalKind).toBe("EVIDENCE_THIN");
    expect(answer.bodyMarkdown).toContain("Evidence on this game is currently THIN");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("enforces the Model Court budget before calling Claude", async () => {
    const fetchImpl = vi.fn();

    await expect(
      answerModelCourtQuestion(
        {
          mode: "ASK_THIS_GAME",
          node,
          question: "Which factor changed most since open?",
        },
        {
          apiKey: "test-key",
          fetchImpl: fetchImpl as unknown as typeof fetch,
          monthlySpendUsd: 2000,
          budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.MODEL_COURT_ANSWER,
        }
      )
    ).rejects.toThrow("The Model Court is at capacity");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls Claude and records usage for grounded game questions", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Line movement is the clearest change. (source: market at 2026-05-22T18:00:00.000Z)" }],
          usage: { input_tokens: 900, output_tokens: 300 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    const answer = await answerModelCourtQuestion(
      {
        mode: "ASK_THIS_GAME",
        node,
        question: "Which factor changed most since open?",
      },
      {
        apiKey: "test-key",
        fetchImpl,
        monthlySpendUsd: 0,
        budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.MODEL_COURT_ANSWER,
        recordUsage: true,
        userId: "user-1",
        usageClient: {
          claudeApiCallRecord: {
            aggregate: vi.fn(),
            create,
          },
        },
      }
    );

    expect(answer).toMatchObject({
      refusalKind: null,
      usedClaude: true,
      modelName: "claude-sonnet-4-6",
    });
    expect(answer.bodyMarkdown).toContain("Line movement");
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "MODEL_COURT_ANSWER",
      modelName: "claude-sonnet-4-6",
      inputTokens: 900,
      outputTokens: 300,
      estimatedCostUsd: 0.0072,
      userId: "user-1",
      gameId: node.id,
      templateKind: "ASK_THIS_GAME",
      success: true,
      errorKind: null,
    });
  });
});
