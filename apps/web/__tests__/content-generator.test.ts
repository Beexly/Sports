import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { ContentGenerationInput } from "@sports/types";

import {
  __setClientForTests,
  generateAndReviewBlogPost,
  generateBlogPost,
} from "@/lib/content-generator";
import { __setClientForTests as __setReviewerClientForTests } from "@/lib/content/draft-reviewer";

const VALID_RESPONSE = {
  title: "NBA Picks for May 23, 2026 — Sharps Like the Lakers",
  excerpt:
    "Our model favors the Lakers tonight.\n\nThe data suggests strong value on the home side.",
  content:
    "The first pick on the board: Lakers -3.5 with a confidence reading of 82/100. " +
    "Our model favors LA based on the provided line and the reasoning supplied with the pick. " +
    "This article is for informational and entertainment purposes only.",
  seoTitle: "NBA Picks May 23 2026 — Lakers Spread Analysis",
  seoDescription:
    "Data-backed NBA picks for May 23, 2026. Our model favors LA on the spread.",
  tags: ["NBA", "Lakers", "spread", "picks", "2026"],
};

function makeFakeClient(
  body: unknown,
  opts: { kind?: "text" | "no-text" | "throws" } = {}
): Anthropic {
  const create = vi.fn(async () => {
    if (opts.kind === "throws") {
      throw new Error("simulated API error");
    }
    if (opts.kind === "no-text") {
      return { content: [{ type: "tool_use" as const }] };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(body) }],
    };
  });
  return { messages: { create } } as unknown as Anthropic;
}

const SAMPLE_INPUT: ContentGenerationInput = {
  date: "2026-05-23",
  sport: "NBA",
  picks: [
    {
      game: "Lakers vs Warriors",
      pickType: "SPREAD",
      selection: "Lakers -3.5",
      line: -3.5,
      confidence: 82,
      reasoning: "Model favors LA based on pace and shooting splits.",
    },
  ],
};

describe("generateBlogPost", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
  });

  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
  });

  it("parses a valid SDK response into GeneratedContent", async () => {
    __setClientForTests(makeFakeClient(VALID_RESPONSE));

    const out = await generateBlogPost(SAMPLE_INPUT);

    expect(out.title).toBe(VALID_RESPONSE.title);
    expect(out.excerpt).toBe(VALID_RESPONSE.excerpt);
    expect(out.content).toBe(VALID_RESPONSE.content);
    expect(out.seoTitle).toBe(VALID_RESPONSE.seoTitle);
    expect(out.seoDescription).toBe(VALID_RESPONSE.seoDescription);
    expect(out.tags).toEqual(VALID_RESPONSE.tags);
    // Slug is derived deterministically from sport + date.
    expect(out.slug).toBe("nba-picks-2026-05-23");
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    __setClientForTests(undefined);

    await expect(generateBlogPost(SAMPLE_INPUT)).rejects.toThrow(
      "ANTHROPIC_API_KEY is not configured"
    );
  });

  it("throws when the SDK response has no text block", async () => {
    __setClientForTests(makeFakeClient(VALID_RESPONSE, { kind: "no-text" }));

    await expect(generateBlogPost(SAMPLE_INPUT)).rejects.toThrow(
      "No text content in Claude response"
    );
  });

  it("propagates SDK errors to the caller", async () => {
    __setClientForTests(makeFakeClient(VALID_RESPONSE, { kind: "throws" }));

    await expect(generateBlogPost(SAMPLE_INPUT)).rejects.toThrow(
      "simulated API error"
    );
  });
});

describe("generateAndReviewBlogPost", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
  });

  afterEach(() => {
    __setClientForTests(undefined);
    __setReviewerClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
  });

  it("returns post + READY review when the reviewer finds nothing", async () => {
    __setClientForTests(makeFakeClient(VALID_RESPONSE));
    __setReviewerClientForTests(makeFakeClient({ findings: [] }));

    const { post, review } = await generateAndReviewBlogPost(SAMPLE_INPUT);

    expect(post.title).toBe(VALID_RESPONSE.title);
    expect(review.summary.verdict).toBe("READY");
    expect(review.summary.totalFindings).toBe(0);
    expect(review.summary.blockingFindings).toBe(0);
  });

  it("returns post + REVISE review when reviewer reports only WARNs", async () => {
    __setClientForTests(makeFakeClient(VALID_RESPONSE));
    __setReviewerClientForTests(
      makeFakeClient({
        findings: [
          {
            severity: "WARN",
            quote: "the data suggests",
            bannedPhraseSemantic: "guaranteed",
            explanation: "borderline",
            suggestion: "our model favors",
          },
        ],
      })
    );

    const { post, review } = await generateAndReviewBlogPost(SAMPLE_INPUT);

    expect(post.slug).toBe("nba-picks-2026-05-23");
    expect(review.summary.verdict).toBe("REVISE");
    expect(review.summary.blockingFindings).toBe(0);
  });

  it("returns post + REJECT review when reviewer reports a BLOCK", async () => {
    __setClientForTests(makeFakeClient(VALID_RESPONSE));
    __setReviewerClientForTests(
      makeFakeClient({
        findings: [
          {
            severity: "BLOCK",
            quote: "lock of the night",
            bannedPhraseSemantic: "lock",
            explanation: "direct banned phrase",
            suggestion: "our model's highest-confidence read",
          },
        ],
      })
    );

    const { post, review } = await generateAndReviewBlogPost(SAMPLE_INPUT);

    // We DO return the post — the wrapper is non-throwing by design.
    expect(post.title).toBe(VALID_RESPONSE.title);
    expect(review.summary.verdict).toBe("REJECT");
    expect(review.summary.blockingFindings).toBe(1);
  });

  it("does not call the reviewer when generation fails", async () => {
    __setClientForTests(makeFakeClient(VALID_RESPONSE, { kind: "throws" }));
    const reviewerCreate = vi.fn();
    __setReviewerClientForTests({
      messages: { create: reviewerCreate },
    } as unknown as Anthropic);

    await expect(generateAndReviewBlogPost(SAMPLE_INPUT)).rejects.toThrow(
      "simulated API error"
    );
    expect(reviewerCreate).not.toHaveBeenCalled();
  });
});
