import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import {
  __setClientForTests as __setWhatChangedClient,
  composeWhatChanged,
} from "@/lib/brief/what-changed";
import {
  __setClientForTests as __setContentIdeasClient,
  composeContentIdeas,
} from "@/lib/brief/content-ideas";
import {
  __setClientForTests as __setPromotionsClient,
  composePromotions,
  type PromotionOffer,
} from "@/lib/brief/promotions";
import type { SlatePickSnippet } from "@/lib/brief/slate-overview";

function makeFakeClient(body: unknown): { client: Anthropic; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => ({
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  }));
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

beforeEach(() => {
  process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
  process.env["VERCEL"] = "1";
});

afterEach(() => {
  __setWhatChangedClient(undefined);
  __setContentIdeasClient(undefined);
  __setPromotionsClient(undefined);
  delete process.env["ANTHROPIC_API_KEY"];
  delete process.env["VERCEL"];
});

describe("composeWhatChanged", () => {
  it("returns summary + items + metadata", async () => {
    __setWhatChangedClient(
      makeFakeClient({
        summary: "LeBron ruled out; Lakers slate downgraded.",
        items: [
          {
            headline: "LeBron ruled out",
            detail: "5:30pm injury report — Lakers spread bumped from STRONG_PLAY to LEAN",
            impact: "NEGATIVE",
          },
        ],
      }).client
    );

    const report = await composeWhatChanged({
      changesContext: "5:30pm — LeBron ruled out. Lakers spread bumped down.",
    });

    expect(report.summary).toContain("LeBron");
    expect(report.items).toHaveLength(1);
    expect(report.items[0]!.impact).toBe("NEGATIVE");
    expect(report.model).toBe("claude-haiku-4-5");
  });

  it("caps items at 12", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      headline: `h ${i}`,
      detail: `d ${i}`,
      impact: "NEUTRAL" as const,
    }));
    __setWhatChangedClient(makeFakeClient({ summary: "many", items: many }).client);

    const report = await composeWhatChanged({ changesContext: "any" });
    expect(report.items.length).toBe(12);
  });

  it("throws on empty / whitespace-only context (no spend on no-news days)", async () => {
    __setWhatChangedClient(makeFakeClient({ summary: "", items: [] }).client);
    await expect(composeWhatChanged({ changesContext: "  \n  " })).rejects.toThrow(
      "non-empty changesContext"
    );
  });

  it("attaches ephemeral cache_control to the system block", async () => {
    const { client, create } = makeFakeClient({ summary: "x", items: [] });
    __setWhatChangedClient(client);
    await composeWhatChanged({ changesContext: "real context" });
    const args = create.mock.calls[0]![0] as { system: Array<{ cache_control?: unknown }> };
    expect(args.system[0]!.cache_control).toEqual({ type: "ephemeral" });
  });
});

describe("composeContentIdeas", () => {
  const SAMPLE_PICKS: readonly SlatePickSnippet[] = [
    {
      sport: "NBA",
      game: "Lakers vs Warriors",
      pickType: "SPREAD",
      selection: "Lakers -3.5",
      confidence: 82,
      pickGrade: "STRONG_PLAY",
    },
  ];

  it("returns ideas + metadata", async () => {
    __setContentIdeasClient(
      makeFakeClient({
        ideas: [
          {
            headline: "Why our Lakers read holds up",
            angle: "Walks through the 78% bookmaker consensus and rest split",
            audienceFit: "PRO",
          },
        ],
      }).client
    );

    const report = await composeContentIdeas({ picks: SAMPLE_PICKS });
    expect(report.ideas).toHaveLength(1);
    expect(report.ideas[0]!.audienceFit).toBe("PRO");
    expect(report.model).toBe("claude-haiku-4-5");
  });

  it("renders the picks block with sport + grade in the user prompt", async () => {
    const { client, create } = makeFakeClient({ ideas: [] });
    __setContentIdeasClient(client);
    await composeContentIdeas({ picks: SAMPLE_PICKS });
    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    expect(args.messages[0]!.content).toContain("[NBA] Lakers vs Warriors");
    expect(args.messages[0]!.content).toContain("STRONG_PLAY");
  });

  it("caps ideas at 8", async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      headline: `h ${i}`,
      angle: `a ${i}`,
      audienceFit: "FREE" as const,
    }));
    __setContentIdeasClient(makeFakeClient({ ideas: many }).client);
    const report = await composeContentIdeas({ picks: SAMPLE_PICKS });
    expect(report.ideas.length).toBe(8);
  });

  it("throws on empty picks", async () => {
    __setContentIdeasClient(makeFakeClient({ ideas: [] }).client);
    await expect(composeContentIdeas({ picks: [] })).rejects.toThrow(
      "at least one pick"
    );
  });
});

describe("composePromotions", () => {
  const SAMPLE_OFFERS: readonly PromotionOffer[] = [
    {
      book: "DraftKings",
      headline: "Bet $5, get $200 in bonus bets",
      terms: "21+. New customers only. NJ/PA/etc.",
      sourceUrl: "https://example.com/dk",
    },
  ];

  it("returns summary + items with disclosure attached to every item", async () => {
    __setPromotionsClient(
      makeFakeClient({
        summary: "One promotional offer surfaced.",
        items: [
          {
            book: "DraftKings",
            headline: "Bet $5, get $200 in bonus bets",
            valueStatement: "Standard new-customer match offer",
            disclosure: "21+. New customers only. NJ/PA/etc.",
          },
        ],
      }).client
    );

    const report = await composePromotions({ offers: SAMPLE_OFFERS });
    expect(report.summary).toContain("offer");
    expect(report.items[0]!.disclosure).toContain("21+");
    expect(report.model).toBe("claude-haiku-4-5");
  });

  it("renders offers block with book + headline + terms in the user prompt", async () => {
    const { client, create } = makeFakeClient({ summary: "", items: [] });
    __setPromotionsClient(client);
    await composePromotions({ offers: SAMPLE_OFFERS });
    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    expect(args.messages[0]!.content).toContain("DraftKings");
    expect(args.messages[0]!.content).toContain("TERMS:");
    expect(args.messages[0]!.content).toContain("SOURCE: https://example.com/dk");
  });

  it("caps items at 8", async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      book: `b${i}`,
      headline: `h${i}`,
      valueStatement: "x",
      disclosure: "21+",
    }));
    __setPromotionsClient(makeFakeClient({ summary: "", items: many }).client);
    const report = await composePromotions({ offers: SAMPLE_OFFERS });
    expect(report.items.length).toBe(8);
  });

  it("throws on empty offers (no spend when there's nothing to surface)", async () => {
    __setPromotionsClient(makeFakeClient({ summary: "", items: [] }).client);
    await expect(composePromotions({ offers: [] })).rejects.toThrow(
      "at least one offer"
    );
  });
});
