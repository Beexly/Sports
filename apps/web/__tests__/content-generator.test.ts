import { describe, expect, it, vi } from "vitest";
import { evaluateGeneratedBlogPolicy, generateBlogPost } from "@/lib/content-generator";
import { DEFAULT_CLAUDE_API_BUDGETS } from "@/lib/claude-api/cost-monitor";

const input = {
  date: "2026-05-22",
  sport: "NBA",
  picks: [
    {
      game: "BOS @ NYK",
      pickType: "SPREAD" as const,
      selection: "BOS -3.5",
      line: -3.5,
      confidence: 72,
      reasoning: "Consensus and line movement support Boston.",
    },
  ],
};

describe("blog content generator", () => {
  it("blocks generated blog content missing the responsible-gambling disclaimer", () => {
    expect(
      evaluateGeneratedBlogPolicy({
        title: "NBA Picks for May 22",
        excerpt: "A measured preview.",
        content: "Full analysis without the required footer.",
        seoTitle: "NBA Picks May 22",
        seoDescription: "Measured NBA pick analysis.",
        tags: ["NBA", "picks", "analysis"],
      })
    ).toEqual({ allowed: false, reason: "MISSING_DISCLAIMER" });
  });

  it("blocks blog copy with a fabricated stat absent from the source prompt", () => {
    const result = evaluateGeneratedBlogPolicy(
      {
        title: "NBA Picks for May 22",
        excerpt: "A measured preview.",
        content:
          "Our model hit 87% of spreads last month. Please gamble responsibly and only bet what you can afford to lose.",
        seoTitle: "NBA Picks May 22",
        seoDescription: "Measured NBA pick analysis.",
        tags: ["NBA", "picks", "analysis"],
      },
      { promptText: "PICKS DATA: BOS -3.5. Market consensus 64%. Confidence: 72/100" },
    );
    expect(result).toEqual({ allowed: false, reason: "UNGROUNDED_NUMERIC" });
  });

  it("allows blog copy whose numbers all trace back to the source prompt", () => {
    const result = evaluateGeneratedBlogPolicy(
      {
        title: "NBA Picks for May 22",
        excerpt: "A measured preview.",
        content:
          "The market consensus sat near 64% on our lead read. Please gamble responsibly and only bet what you can afford to lose.",
        seoTitle: "NBA Picks May 22",
        seoDescription: "Measured NBA pick analysis.",
        tags: ["NBA", "picks", "analysis"],
      },
      { promptText: "PICKS DATA: BOS -3.5. Market consensus 64%. Confidence: 72/100" },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it("enforces the blog generation budget before calling Claude", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    const fetchImpl = vi.fn();

    await expect(
      generateBlogPost(input, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        monthlySpendUsd: 50,
        budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.BLOG_GENERATION,
      })
    ).rejects.toThrow("Blog drafting is paused while the API budget recovers.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("records successful blog generation calls", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                title: "NBA Picks for May 22",
                excerpt: "A measured preview.",
                content: "Full analysis. Please gamble responsibly and only bet what you can afford to lose.",
                seoTitle: "NBA Picks May 22",
                seoDescription: "Measured NBA pick analysis.",
                tags: ["NBA", "picks", "analysis"],
              }),
            },
          ],
          usage: { input_tokens: 1000, output_tokens: 500 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    const post = await generateBlogPost(input, {
      fetchImpl,
      monthlySpendUsd: 0,
      budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.BLOG_GENERATION,
      recordUsage: true,
      userId: "user-1",
      usageClient: {
        claudeApiCallRecord: {
          aggregate: vi.fn(),
          create,
        },
      },
    });

    expect(post.slug).toBe("nba-picks-2026-05-22");
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "BLOG_GENERATION",
      modelName: "claude-sonnet-4-6",
      inputTokens: 1000,
      outputTokens: 500,
      estimatedCostUsd: 0.0105,
      userId: "user-1",
      gameId: null,
      templateKind: null,
      success: true,
      errorKind: null,
    });
  });

  it("records policy failures after Claude returns unsafe blog JSON", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                title: "NBA Picks for May 22",
                excerpt: "A measured preview.",
                content: "Full analysis without the required footer.",
                seoTitle: "NBA Picks May 22",
                seoDescription: "Measured NBA pick analysis.",
                tags: ["NBA", "picks", "analysis"],
              }),
            },
          ],
          usage: { input_tokens: 1000, output_tokens: 250 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    await expect(
      generateBlogPost(input, {
        fetchImpl,
        monthlySpendUsd: 0,
        budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.BLOG_GENERATION,
        recordUsage: true,
        usageClient: {
          claudeApiCallRecord: {
            aggregate: vi.fn(),
            create,
          },
        },
      })
    ).rejects.toThrow("Generated blog post failed policy validation.");

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "BLOG_GENERATION",
      success: false,
      errorKind: "POLICY_MISSING_DISCLAIMER",
    });
  });
});
