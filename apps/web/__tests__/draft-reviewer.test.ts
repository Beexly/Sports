import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import {
  __setClientForTests,
  reviewDraft,
} from "@/lib/content/draft-reviewer";

const SAMPLE_BANNED = [
  "guaranteed",
  "lock",
  "sure thing",
  "risk-free",
];

const SAMPLE_DRAFT = "Our model favors the Lakers tonight. The data suggests strong value.";

function makeFakeClient(
  body: unknown,
  opts: { kind?: "text" | "no-text" | "throws" } = {}
): Anthropic {
  const create = vi.fn(async () => {
    if (opts.kind === "throws") {
      throw new Error("simulated reviewer API error");
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

describe("reviewDraft", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
  });

  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
  });

  it("returns READY when Claude reports no findings", async () => {
    __setClientForTests(makeFakeClient({ findings: [] }));

    const report = await reviewDraft({
      content: SAMPLE_DRAFT,
      banned: SAMPLE_BANNED,
    });

    expect(report.findings).toEqual([]);
    expect(report.summary.totalFindings).toBe(0);
    expect(report.summary.blockingFindings).toBe(0);
    expect(report.summary.verdict).toBe("READY");
    expect(report.model).toBe("claude-haiku-4-5");
    expect(report.reviewerVersion).toMatch(/^draft-reviewer\/v/);
    expect(report.reviewedAt).toMatch(/T/);
  });

  it("returns REVISE when only WARN findings are reported", async () => {
    __setClientForTests(
      makeFakeClient({
        findings: [
          {
            severity: "WARN",
            quote: "data suggests strong value",
            bannedPhraseSemantic: "guaranteed",
            explanation: "Hedged value claim borders on guarantee language.",
            suggestion: "The data suggests our model favors this side.",
          },
        ],
      })
    );

    const report = await reviewDraft({
      content: SAMPLE_DRAFT,
      banned: SAMPLE_BANNED,
    });

    expect(report.summary.verdict).toBe("REVISE");
    expect(report.summary.totalFindings).toBe(1);
    expect(report.summary.blockingFindings).toBe(0);
  });

  it("returns REJECT when any BLOCK finding is reported", async () => {
    __setClientForTests(
      makeFakeClient({
        findings: [
          {
            severity: "BLOCK",
            quote: "tonight is a lock",
            bannedPhraseSemantic: "lock",
            explanation: "Direct paraphrase of banned 'lock' language.",
            suggestion: "Our model favors this side with strong confidence.",
          },
          {
            severity: "WARN",
            quote: "no risk in this play",
            bannedPhraseSemantic: "risk-free",
            explanation: "Implies no downside which is the same as risk-free.",
            suggestion: "Lower-variance spot in our model's read.",
          },
        ],
      })
    );

    const report = await reviewDraft({
      content: SAMPLE_DRAFT,
      banned: SAMPLE_BANNED,
    });

    expect(report.summary.verdict).toBe("REJECT");
    expect(report.summary.totalFindings).toBe(2);
    expect(report.summary.blockingFindings).toBe(1);
  });

  it("caps findings at the documented maximum", async () => {
    const tooMany = Array.from({ length: 25 }, (_, i) => ({
      severity: "WARN" as const,
      quote: `phrase ${i}`,
      bannedPhraseSemantic: "guaranteed",
      explanation: "x",
      suggestion: "y",
    }));
    __setClientForTests(makeFakeClient({ findings: tooMany }));

    const report = await reviewDraft({
      content: SAMPLE_DRAFT,
      banned: SAMPLE_BANNED,
    });

    expect(report.findings.length).toBe(20);
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    __setClientForTests(undefined);

    await expect(
      reviewDraft({ content: SAMPLE_DRAFT, banned: SAMPLE_BANNED })
    ).rejects.toThrow("ANTHROPIC_API_KEY is not configured");
  });

  it("throws when banned list is empty", async () => {
    __setClientForTests(makeFakeClient({ findings: [] }));

    await expect(
      reviewDraft({ content: SAMPLE_DRAFT, banned: [] })
    ).rejects.toThrow("non-empty banned phrase list");
  });

  it("throws when content is empty / whitespace-only", async () => {
    __setClientForTests(makeFakeClient({ findings: [] }));

    await expect(
      reviewDraft({ content: "   \n  ", banned: SAMPLE_BANNED })
    ).rejects.toThrow("non-empty content");
  });

  it("throws when the SDK response has no text block", async () => {
    __setClientForTests(makeFakeClient({ findings: [] }, { kind: "no-text" }));

    await expect(
      reviewDraft({ content: SAMPLE_DRAFT, banned: SAMPLE_BANNED })
    ).rejects.toThrow("No text content in draft-reviewer response");
  });

  it("propagates SDK errors to the caller", async () => {
    __setClientForTests(makeFakeClient({ findings: [] }, { kind: "throws" }));

    await expect(
      reviewDraft({ content: SAMPLE_DRAFT, banned: SAMPLE_BANNED })
    ).rejects.toThrow("simulated reviewer API error");
  });
});
