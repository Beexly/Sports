import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import { composeBriefAsync } from "@/lib/brief/compose";
import {
  __setClientForTests,
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
];

function makeFakeClient(body: unknown): Anthropic {
  const create = vi.fn(async () => ({
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  }));
  return { messages: { create } } as unknown as Anthropic;
}

describe("composeBriefAsync", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
  });

  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
  });

  it("with picks: populates summary, slateOverview, and a single SLATE_OVERVIEW section from composeSlateOverview", async () => {
    const overviewText =
      "Two NBA picks on tonight's board. Our model favors the home side; the data suggests measured exposure.";
    __setClientForTests(makeFakeClient({ slateOverview: overviewText }));

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(brief.status).toBe("DRAFT");
    expect(brief.date).toBe("2026-05-23");
    expect(brief.summary).toBe(overviewText);
    expect(brief.slateOverview.text).toBe(overviewText);
    expect(brief.sections).toHaveLength(1);
    expect(brief.sections[0]!.title).toBe("Tonight's slate");
    expect(brief.sections[0]!.body).toBe(overviewText);
    expect(brief.sections[0]!.type).toBe("SLATE_OVERVIEW");
    expect(brief.responsibleGamingText).toContain("responsibly");
  });

  it("empty picks: falls back to the stub shell without calling Claude", async () => {
    const create = vi.fn();
    __setClientForTests({ messages: { create } } as unknown as Anthropic);

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: [],
    });

    expect(create).not.toHaveBeenCalled();
    expect(brief.status).toBe("DRAFT");
    expect(brief.sections).toEqual([]);
    expect(brief.slateOverview.text).toContain("composer is being rebuilt");
    expect(brief.summary).toContain("composer is being rebuilt");
    expect(brief.responsibleGamingText).toContain("responsibly");
  });

  it("accepts a Date object for input.date and normalizes to YYYY-MM-DD", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "ok" }));

    const brief = await composeBriefAsync({
      date: new Date("2026-05-23T17:30:00Z"),
      picks: SAMPLE_PICKS,
    });

    expect(brief.date).toBe("2026-05-23");
  });

  it("never sets a publishedAt-shaped field and never flips status away from DRAFT", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "ok" }));

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(brief.status).toBe("DRAFT");
    // Defensive: the type doesn't include publishedAt, but make sure runtime
    // doesn't sneak it in.
    expect((brief as unknown as Record<string, unknown>)["publishedAt"]).toBeUndefined();
  });

  it("promotions / whatChanged / contentIdeas / manualReview remain empty (filled by future cycles)", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "ok" }));

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(brief.promotions.count).toBe(0);
    expect(brief.promotions.items).toEqual([]);
    expect(brief.whatChanged.items).toEqual([]);
    expect(brief.contentIdeas.items).toEqual([]);
    expect(brief.manualReview.items).toEqual([]);
  });
});
