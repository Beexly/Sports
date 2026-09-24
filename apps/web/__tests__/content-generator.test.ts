import { describe, expect, it, vi } from "vitest";
import {
  buildBlogNumericGrounding,
  evaluateGeneratedBlogPolicy,
  generateBlogPost,
} from "@/lib/content-generator";
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

const validBlogJson = JSON.stringify({
  title: "NBA Picks for May 22",
  excerpt: "A measured preview.",
  content: "Full analysis. Please gamble responsibly and only bet what you can afford to lose.",
  seoTitle: "NBA Picks May 22",
  seoDescription: "Measured NBA pick analysis.",
  tags: ["NBA", "picks", "analysis"],
});

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
      { dataText: "PICKS DATA: BOS -3.5. Market consensus 64%. Confidence: 72/100", values: [] },
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
      { dataText: "PICKS DATA: BOS -3.5. Market consensus 64%. Confidence: 72/100", values: [] },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  // REGRESSION: grounding used to be the whole assembled user prompt, which wraps
  // the PICKS DATA in this file's own formatting requirements ("4-6 paragraphs",
  // "3-5 relevant tags"). Those are record-shaped, so the platform's instructions
  // whitelisted 3/4/5/6 and a fabricated team record laundered through as
  // "grounded". Grounding is now the PICKS DATA block only.
  describe("prompt instructions do not ground numbers in the copy", () => {
    it("keeps the formatting requirements out of the grounding data block", () => {
      const grounding = buildBlogNumericGrounding(input, "1. BOS @ NYK (Line: -3.5)");

      expect(grounding.dataText).not.toContain("4-6 paragraphs");
      expect(grounding.dataText).not.toContain("3-5 relevant tags");
      expect(grounding.dataText).toContain("BOS @ NYK");
      // The real line is carried structurally: "-3.5" is invisible to the claim
      // extractor (a digit preceded by "-"), so copy saying "laying 3.5" must
      // still be recognised as the platform's own number.
      expect(grounding.values).toContain(3.5);
      expect(grounding.values).toContain(-3.5);
    });

    it("rejects a record that appears only in the prompt's formatting requirements", async () => {
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
                  // "4-6" appears nowhere in the picks data — only in the prompt's
                  // "Content: Full analysis (4-6 paragraphs)" requirement.
                  content:
                    "Boston is 4-6 as a road favorite this season. Please gamble responsibly and only bet what you can afford to lose.",
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
      const create = vi.fn().mockResolvedValue({ id: "record-ungrounded" });

      await expect(
        generateBlogPost(input, {
          fetchImpl,
          monthlySpendUsd: 0,
          budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.BLOG_GENERATION,
          recordUsage: true,
          usageClient: {
            claudeApiCallRecord: { aggregate: vi.fn(), create },
          },
        })
      ).rejects.toThrow("Generated blog post failed policy validation.");

      expect(create.mock.calls[0]?.[0].data).toMatchObject({
        surface: "BLOG_GENERATION",
        success: false,
        errorKind: "POLICY_UNGROUNDED_NUMERIC",
      });
    });

    it("still accepts copy whose numbers come from the picks data itself", async () => {
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
                  content:
                    "Our model favors Boston laying 3.5 in this spot. Please gamble responsibly and only bet what you can afford to lose.",
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

      const post = await generateBlogPost(input, {
        fetchImpl,
        monthlySpendUsd: 0,
        budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.BLOG_GENERATION,
      });

      expect(post.content).toContain("laying 3.5");
    });
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
              text: validBlogJson,
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

  it("routes blog generation through Cerebras free-lane when enabled", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes("cerebras")) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: validBlogJson } }],
            usage: { prompt_tokens: 50, completion_tokens: 80 },
          }),
          { status: 200 },
        );
      }
      return new Response("unexpected anthropic", { status: 500 });
    });
    const create = vi.fn().mockResolvedValue({ id: "record-free" });

    const post = await generateBlogPost(input, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      monthlySpendUsd: 0,
      budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.BLOG_GENERATION,
      recordUsage: true,
      usageClient: {
        claudeApiCallRecord: {
          aggregate: vi.fn(),
          create,
        },
      },
      env: {
        ANTHROPIC_API_KEY: "test-key",
        CONTENT_FREE_LANE_ENABLED: "true",
        CEREBRAS_API_KEY: "cb-test",
      },
    });

    expect(post.title).toBe("NBA Picks for May 22");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("api.cerebras.ai");
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "BLOG_GENERATION",
      modelName: "gpt-oss-120b",
      estimatedCostUsd: 0,
      success: true,
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
