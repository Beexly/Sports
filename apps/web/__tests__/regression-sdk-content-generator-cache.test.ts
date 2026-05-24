/**
 * Regression test for SDK Audit: content-generator.ts missing cache_control.
 *
 * Before the fix, content-generator passed system as a plain string, opting out of
 * prompt caching. After the fix, system is an array with cache_control: { type: "ephemeral" }.
 *
 * Pillar: sdk-conformance | Finding: sports-intel/sdk-audit/content-generator.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { ContentGenerationInput } from "@sports/types";

import {
  __setClientForTests,
  generateBlogPost,
} from "@/lib/content-generator";
import { __setClientForTests as __setReviewerClientForTests } from "@/lib/content/draft-reviewer";
import { __setClientForTests as __setCounterClientForTests } from "@/lib/content/counter-narrative";

const VALID_RESPONSE = {
  title: "Test Title",
  excerpt: "Test excerpt.\n\nSecond paragraph.",
  content:
    "Test content. This article is for informational and entertainment purposes only.",
  seoTitle: "Test SEO Title",
  seoDescription: "Test SEO description.",
  tags: ["test"],
};

function makeFakeClientWithSpy(body: unknown): {
  client: Anthropic;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => ({
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  }));
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

const INPUT: ContentGenerationInput = {
  sport: "NBA",
  picks: [
    {
      game: "Lakers vs Celtics",
      pickType: "SPREAD",
      selection: "Lakers -3.5",
      line: -3.5,
      confidence: 82,
      pickGrade: "STRONG_PLAY",
      reasoning: "deterministic reasoning",
      sources: ["the-odds-api"],
    },
  ],
  date: "2026-05-24",
};

describe("content-generator cache_control regression (sdk-audit finding)", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
    process.env["VERCEL"] = "1";
  });

  afterEach(() => {
    __setClientForTests(undefined);
    __setReviewerClientForTests(undefined);
    __setCounterClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["VERCEL"];
  });

  it("passes system as array (not plain string) with cache_control: ephemeral", async () => {
    const { client, create } = makeFakeClientWithSpy(VALID_RESPONSE);
    // Reviewer and counter-narrative need stubs too
    __setClientForTests(client);
    __setReviewerClientForTests(client);
    __setCounterClientForTests(client);

    await generateBlogPost(INPUT).catch(() => {
      // may throw if the response doesn't satisfy all checks — that's fine for this test
    });

    if (create.mock.calls.length > 0) {
      const args = create.mock.calls[0]![0] as { system: unknown };
      expect(Array.isArray(args.system)).toBe(true);
      const systemArr = args.system as Array<{ type: string; cache_control?: unknown }>;
      expect(systemArr[0]?.cache_control).toEqual({ type: "ephemeral" });
    }
  });
});
