import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import {
  __setClientForTests,
  composeSlateOverview,
  type SlatePickSnippet,
} from "@/lib/brief/slate-overview";

const SAMPLE_PICKS: readonly SlatePickSnippet[] = [
  {
    sport: "NBA",
    game: "Lakers vs Warriors",
    pickType: "SPREAD",
    selection: "Lakers -3.5",
    confidence: 82,
    pickGrade: "STRONG_PLAY",
  },
  {
    sport: "NBA",
    game: "Celtics vs Heat",
    pickType: "TOTAL",
    selection: "Over 218.5",
    confidence: 71,
    pickGrade: "SOLID_PLAY",
  },
];

function makeFakeClient(
  body: unknown,
  opts: { kind?: "text" | "no-text" | "throws" } = {}
): { client: Anthropic; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => {
    if (opts.kind === "throws") {
      throw new Error("simulated slate API error");
    }
    if (opts.kind === "no-text") {
      return { content: [{ type: "tool_use" as const }] };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(body) }],
    };
  });
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("composeSlateOverview", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
  });

  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
  });

  it("returns the parsed slate overview string + metadata", async () => {
    const overviewText =
      "Two NBA picks on the board for May 23, 2026. The strongest read is a Strong Play; the data suggests measured exposure tonight.";
    const { client, create } = makeFakeClient({ slateOverview: overviewText });
    __setClientForTests(client);

    const result = await composeSlateOverview({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(result.text).toBe(overviewText);
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.composedAt).toMatch(/T/);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("renders the picks summary grouped by sport in the user prompt", async () => {
    const { client, create } = makeFakeClient({ slateOverview: "ok" });
    __setClientForTests(client);

    await composeSlateOverview({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    const userPrompt = args.messages[0]!.content;
    expect(userPrompt).toContain("Date: May 23, 2026");
    expect(userPrompt).toContain("NBA:");
    expect(userPrompt).toContain("Lakers vs Warriors");
    expect(userPrompt).toContain("Celtics vs Heat");
    expect(userPrompt).toContain("STRONG_PLAY");
  });

  it("throws when the picks array is empty", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "x" }).client);

    await expect(
      composeSlateOverview({ date: "2026-05-23", picks: [] })
    ).rejects.toThrow("requires at least one pick");
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    __setClientForTests(undefined);

    await expect(
      composeSlateOverview({ date: "2026-05-23", picks: SAMPLE_PICKS })
    ).rejects.toThrow("ANTHROPIC_API_KEY is not configured");
  });

  it("throws when the SDK response has no text block", async () => {
    __setClientForTests(
      makeFakeClient({ slateOverview: "x" }, { kind: "no-text" }).client
    );

    await expect(
      composeSlateOverview({ date: "2026-05-23", picks: SAMPLE_PICKS })
    ).rejects.toThrow("No text content in slate-overview response");
  });

  it("propagates SDK errors to the caller", async () => {
    __setClientForTests(
      makeFakeClient({ slateOverview: "x" }, { kind: "throws" }).client
    );

    await expect(
      composeSlateOverview({ date: "2026-05-23", picks: SAMPLE_PICKS })
    ).rejects.toThrow("simulated slate API error");
  });
});
