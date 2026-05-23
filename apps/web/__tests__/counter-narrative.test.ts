import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import {
  __setClientForTests,
  composeCounterNarrative,
  type CounterPickSnippet,
} from "@/lib/content/counter-narrative";

const SAMPLE_PICKS: readonly CounterPickSnippet[] = [
  {
    game: "Lakers vs Warriors",
    pickType: "SPREAD",
    selection: "Lakers -3.5",
    line: -3.5,
    confidence: 82,
  },
  {
    game: "Celtics vs Heat",
    pickType: "TOTAL",
    selection: "Over 218.5",
    line: 218.5,
    confidence: 80,
  },
];

const SAMPLE_DRAFT = "Two NBA picks tonight. Our model favors LA and the Celtics-Heat over.";

function makeFakeClient(body: unknown): { client: Anthropic; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => ({
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  }));
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("composeCounterNarrative", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
    process.env["VERCEL"] = "1"; // silence telemetry file-write
  });

  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["VERCEL"];
  });

  it("returns counterTake + redFlags + metadata on success", async () => {
    const { client, create } = makeFakeClient({
      counterTake:
        "Two picks at near-identical confidence (82, 80) means the slate is concentrated. A single source failure would take the whole slate down.",
      redFlags: [
        {
          pick: "Lakers -3.5",
          concern: "confidence concentration with Celtics-Heat over",
          severity: "MEDIUM",
        },
      ],
    });
    __setClientForTests(client);

    const report = await composeCounterNarrative({
      picks: SAMPLE_PICKS,
      draft: SAMPLE_DRAFT,
      sources: ["the-odds-api"],
    });

    expect(report.counterTake).toContain("concentrated");
    expect(report.redFlags).toHaveLength(1);
    expect(report.redFlags[0]!.severity).toBe("MEDIUM");
    expect(report.model).toBe("claude-sonnet-4-6");
    expect(report.composerVersion).toMatch(/^counter-narrative\/v/);
    expect(report.composedAt).toMatch(/T/);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("renders the picks block + sources line in the user prompt", async () => {
    const { client, create } = makeFakeClient({
      counterTake: "clean",
      redFlags: [],
    });
    __setClientForTests(client);

    await composeCounterNarrative({
      picks: SAMPLE_PICKS,
      draft: SAMPLE_DRAFT,
      sources: ["the-odds-api", "schedule-internal"],
    });

    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    const userPrompt = args.messages[0]!.content;
    expect(userPrompt).toContain("Lakers vs Warriors");
    expect(userPrompt).toContain("Celtics vs Heat");
    expect(userPrompt).toContain("SOURCES CITED: the-odds-api, schedule-internal");
    expect(userPrompt).toContain('DRAFT:');
  });

  it("omits the SOURCES line when no sources are passed", async () => {
    const { client, create } = makeFakeClient({ counterTake: "x", redFlags: [] });
    __setClientForTests(client);

    await composeCounterNarrative({ picks: SAMPLE_PICKS, draft: SAMPLE_DRAFT });

    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    expect(args.messages[0]!.content).not.toContain("SOURCES CITED");
  });

  it("accepts an empty redFlags array as honest clean-slate output", async () => {
    __setClientForTests(
      makeFakeClient({
        counterTake: "Slate reads cleanly: no confidence concentration, sources are diversified.",
        redFlags: [],
      }).client
    );

    const report = await composeCounterNarrative({
      picks: SAMPLE_PICKS,
      draft: SAMPLE_DRAFT,
    });

    expect(report.redFlags).toEqual([]);
    expect(report.counterTake).toMatch(/clean/i);
  });

  it("caps redFlags at the documented maximum", async () => {
    const tooMany = Array.from({ length: 20 }, (_, i) => ({
      pick: `pick ${i}`,
      concern: "x",
      severity: "LOW" as const,
    }));
    __setClientForTests(
      makeFakeClient({ counterTake: "many", redFlags: tooMany }).client
    );

    const report = await composeCounterNarrative({
      picks: SAMPLE_PICKS,
      draft: SAMPLE_DRAFT,
    });

    expect(report.redFlags.length).toBe(12);
  });

  it("attaches ephemeral cache_control to the system block", async () => {
    const { client, create } = makeFakeClient({ counterTake: "x", redFlags: [] });
    __setClientForTests(client);

    await composeCounterNarrative({ picks: SAMPLE_PICKS, draft: SAMPLE_DRAFT });

    const args = create.mock.calls[0]![0] as {
      system: Array<{ cache_control?: unknown }>;
    };
    expect(Array.isArray(args.system)).toBe(true);
    expect(args.system[0]!.cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws when picks array is empty", async () => {
    __setClientForTests(makeFakeClient({ counterTake: "x", redFlags: [] }).client);
    await expect(
      composeCounterNarrative({ picks: [], draft: SAMPLE_DRAFT })
    ).rejects.toThrow("requires at least one pick");
  });

  it("throws when draft is empty / whitespace only", async () => {
    __setClientForTests(makeFakeClient({ counterTake: "x", redFlags: [] }).client);
    await expect(
      composeCounterNarrative({ picks: SAMPLE_PICKS, draft: "   \n  " })
    ).rejects.toThrow("non-empty draft");
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    __setClientForTests(undefined);
    await expect(
      composeCounterNarrative({ picks: SAMPLE_PICKS, draft: SAMPLE_DRAFT })
    ).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});
