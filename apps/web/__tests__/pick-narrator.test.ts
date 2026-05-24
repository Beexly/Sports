import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { ScoredPick } from "@sports/types";

import {
  __setClientForTests,
  narratePick,
} from "@/lib/cockpit/pick-narrator";

const SAMPLE_PICK: ScoredPick = {
  gameId: "game-1",
  pickType: "SPREAD",
  selection: "Lakers -3.5",
  line: -3.5,
  confidence: 82,
  edgeScore: 0.05,
  consensusPct: 0.78,
  bookmakerCount: 9,
  dataQualityScore: 88,
  tier: "PREMIUM",
  pickGrade: "STRONG_PLAY",
  riskLevel: "MODERATE",
  reasoning: "deterministic reasoning text",
  reasoningShort: "deterministic teaser",
  factorBreakdown: {
    consensusScore: 24,
    marketDepthScore: 18,
    edgeScore: 18,
    lineMovementScore: 6,
    volatilityPenalty: -2,
    factors: [
      {
        name: "Market consensus",
        impact: "positive",
        description: "78% bookmaker consensus on Lakers",
        weight: 24,
        evidence: {
          sourceCategory: "ODDS",
          sourceName: "the-odds-api",
          freshnessStatus: "FRESH",
          trustLevel: 90,
          activationStatus: "ACTIVE",
          whyUsedOrBlocked: "9 bookmakers agreeing",
        },
      },
      {
        name: "Rest advantage",
        impact: "positive",
        description: "5 days rest vs 2",
        weight: 8,
        evidence: {
          sourceCategory: "SCHEDULE",
          sourceName: "schedule-internal",
          freshnessStatus: "FRESH",
          trustLevel: 100,
          activationStatus: "ACTIVE",
          whyUsedOrBlocked: "fresh schedule data",
        },
      },
    ],
  },
  modelVersion: "v5.0.0",
  dataFreshnessAt: new Date(),
};

function makeFakeClient(narrative: string): {
  client: Anthropic;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => ({
    content: [{ type: "text" as const, text: JSON.stringify({ narrative }) }],
  }));
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("narratePick", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
    process.env["VERCEL"] = "1";
  });
  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["VERCEL"];
  });

  it("returns narrative + sources + metadata on success", async () => {
    const { client } = makeFakeClient(
      "Strong market consensus drives this Lakers -3.5 read; rest advantage compounds the spot. Watch for late line movement."
    );
    __setClientForTests(client);

    const report = await narratePick(SAMPLE_PICK);

    expect(report.narrative).toContain("Lakers");
    expect(report.sources).toEqual(["the-odds-api", "schedule-internal"]);
    expect(report.model).toBe("claude-sonnet-4-6");
    expect(report.narratorVersion).toMatch(/^pick-narrator\/v/);
    expect(report.narratedAt).toMatch(/T/);
  });

  it("renders all factor names + impact + weight + evidence in the user prompt", async () => {
    const { client, create } = makeFakeClient("ok");
    __setClientForTests(client);

    await narratePick(SAMPLE_PICK);

    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    const userPrompt = args.messages[0]!.content;
    expect(userPrompt).toContain("Market consensus");
    expect(userPrompt).toContain("Rest advantage");
    expect(userPrompt).toContain("positive");
    expect(userPrompt).toContain("weight 24");
    expect(userPrompt).toContain("[source: the-odds-api, ACTIVE, FRESH]");
    expect(userPrompt).toContain("SOURCES BACKING THIS PICK: the-odds-api, schedule-internal");
  });

  it("renders pick header (type, selection, line, confidence, grade, risk)", async () => {
    const { client, create } = makeFakeClient("ok");
    __setClientForTests(client);

    await narratePick(SAMPLE_PICK);

    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    const userPrompt = args.messages[0]!.content;
    expect(userPrompt).toContain("SPREAD: Lakers -3.5");
    expect(userPrompt).toContain("line: -3.5");
    expect(userPrompt).toContain("confidence: 82/100");
    expect(userPrompt).toContain("grade: STRONG_PLAY");
    expect(userPrompt).toContain("risk: MODERATE");
  });

  it("omits the SOURCES line when no ACTIVE sources are present", async () => {
    const noSources: ScoredPick = {
      ...SAMPLE_PICK,
      factorBreakdown: {
        ...SAMPLE_PICK.factorBreakdown,
        factors: [
          {
            name: "Shadow factor",
            impact: "neutral",
            description: "shadow only",
            weight: 0,
            evidence: {
              sourceCategory: "STANDINGS",
              sourceName: "shadow-source",
              freshnessStatus: "FRESH",
              trustLevel: 50,
              activationStatus: "SHADOW_ONLY",
              whyUsedOrBlocked: "shadow mode",
            },
          },
        ],
      },
    };

    const { client, create } = makeFakeClient("ok");
    __setClientForTests(client);
    await narratePick(noSources);
    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    expect(args.messages[0]!.content).not.toContain("SOURCES BACKING THIS PICK");
  });

  it("attaches ephemeral cache_control to the system block", async () => {
    const { client, create } = makeFakeClient("ok");
    __setClientForTests(client);
    await narratePick(SAMPLE_PICK);
    const args = create.mock.calls[0]![0] as {
      system: Array<{ cache_control?: unknown }>;
    };
    expect(args.system[0]!.cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    __setClientForTests(undefined);
    await expect(narratePick(SAMPLE_PICK)).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("throws when SDK response has no text block", async () => {
    const create = vi.fn(async () => ({
      content: [{ type: "tool_use" as const }],
    }));
    __setClientForTests({ messages: { create } } as unknown as Anthropic);
    await expect(narratePick(SAMPLE_PICK)).rejects.toThrow(
      "No text content in pick-narrator response"
    );
  });
});
