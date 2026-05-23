import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import { composeBriefAsync } from "@/lib/brief/compose";
import {
  __setClientForTests,
  type SlatePickSnippet,
} from "@/lib/brief/slate-overview";
import { __setClientForTests as __setPreMortemClientForTests } from "@/lib/brief/pre-mortem";
import { __setClientForTests as __setWhatChangedClientForTests } from "@/lib/brief/what-changed";
import { __setClientForTests as __setContentIdeasClientForTests } from "@/lib/brief/content-ideas";
import { __setClientForTests as __setPromotionsClientForTests } from "@/lib/brief/promotions";

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

const CLEAN_PRE_MORTEM = { risks: [], summary: "Slate is structurally healthy." };

describe("composeBriefAsync", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
    process.env["VERCEL"] = "1"; // silence telemetry file-write
  });

  afterEach(() => {
    __setClientForTests(undefined);
    __setPreMortemClientForTests(undefined);
    __setWhatChangedClientForTests(undefined);
    __setContentIdeasClientForTests(undefined);
    __setPromotionsClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["VERCEL"];
  });

  it("with picks: populates summary, slateOverview, and a SLATE_OVERVIEW section (no MANUAL_REVIEW when pre-mortem is clean)", async () => {
    const overviewText =
      "Two NBA picks on tonight's board. Our model favors the home side; the data suggests measured exposure.";
    __setClientForTests(makeFakeClient({ slateOverview: overviewText }));
    __setPreMortemClientForTests(makeFakeClient(CLEAN_PRE_MORTEM));

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
    expect(brief.manualReview.items).toEqual([]);
    expect(brief.responsibleGamingText).toContain("responsibly");
  });

  it("with HIGH-severity pre-mortem risks: adds MANUAL_REVIEW section + populates manualReview.items", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "Slate text" }));
    __setPreMortemClientForTests(
      makeFakeClient({
        risks: [
          {
            kind: "SINGLE_SOURCE_DEPENDENCE",
            severity: "HIGH",
            observation: "All picks cite the same source",
            affectedCount: 2,
          },
          {
            kind: "OTHER",
            severity: "LOW",
            observation: "low-noise observation",
            affectedCount: 1,
          },
        ],
        summary: "Single-source risk on the whole slate.",
      })
    );

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(brief.sections).toHaveLength(2);
    expect(brief.sections[1]!.type).toBe("MANUAL_REVIEW");
    expect(brief.sections[1]!.body).toContain("Single-source");
    // LOW-severity risks drop out of manualReview.items (only HIGH+MEDIUM)
    expect(brief.manualReview.items).toHaveLength(1);
    expect(
      (brief.manualReview.items[0] as { severity: string }).severity
    ).toBe("HIGH");
  });

  it("empty picks: falls back to the stub shell without calling Claude", async () => {
    const slateCreate = vi.fn();
    const preCreate = vi.fn();
    __setClientForTests({ messages: { create: slateCreate } } as unknown as Anthropic);
    __setPreMortemClientForTests({ messages: { create: preCreate } } as unknown as Anthropic);

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: [],
    });

    expect(slateCreate).not.toHaveBeenCalled();
    expect(preCreate).not.toHaveBeenCalled();
    expect(brief.status).toBe("DRAFT");
    expect(brief.sections).toEqual([]);
    expect(brief.slateOverview.text).toContain("composer is being rebuilt");
    expect(brief.summary).toContain("composer is being rebuilt");
    expect(brief.responsibleGamingText).toContain("responsibly");
  });

  it("accepts a Date object for input.date and normalizes to YYYY-MM-DD", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "ok" }));
    __setPreMortemClientForTests(makeFakeClient(CLEAN_PRE_MORTEM));

    const brief = await composeBriefAsync({
      date: new Date("2026-05-23T17:30:00Z"),
      picks: SAMPLE_PICKS,
    });

    expect(brief.date).toBe("2026-05-23");
  });

  it("never sets a publishedAt-shaped field and never flips status away from DRAFT", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "ok" }));
    __setPreMortemClientForTests(makeFakeClient(CLEAN_PRE_MORTEM));

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(brief.status).toBe("DRAFT");
    expect((brief as unknown as Record<string, unknown>)["publishedAt"]).toBeUndefined();
  });

  it("promotions / whatChanged / contentIdeas stay empty when their inputs aren't supplied", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "ok" }));
    __setPreMortemClientForTests(makeFakeClient(CLEAN_PRE_MORTEM));

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(brief.promotions.count).toBe(0);
    expect(brief.promotions.items).toEqual([]);
    expect(brief.whatChanged.items).toEqual([]);
    expect(brief.contentIdeas.items).toEqual([]);
    expect(brief.sections.map((s) => s.type)).toEqual(["SLATE_OVERVIEW"]);
  });

  it("populates WHAT_CHANGED + PROMOTIONS + CONTENT_IDEAS when caller supplies their inputs", async () => {
    __setClientForTests(makeFakeClient({ slateOverview: "Slate text" }));
    __setPreMortemClientForTests(makeFakeClient(CLEAN_PRE_MORTEM));
    __setWhatChangedClientForTests(
      makeFakeClient({
        summary: "Two updates rolled in.",
        items: [
          { headline: "h", detail: "d", impact: "NEGATIVE" },
        ],
      })
    );
    __setContentIdeasClientForTests(
      makeFakeClient({
        ideas: [{ headline: "h", angle: "a", audienceFit: "PRO" }],
      })
    );
    __setPromotionsClientForTests(
      makeFakeClient({
        summary: "Two offers.",
        items: [
          {
            book: "DK",
            headline: "x",
            valueStatement: "x",
            disclosure: "21+",
          },
        ],
      })
    );

    const brief = await composeBriefAsync({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
      changesContext: "LeBron ruled out at 17:30",
      promotionOffers: [
        { book: "DK", headline: "$200 in bonus bets", terms: "21+" },
      ],
      includeContentIdeas: true,
    });

    // sections grow: SLATE_OVERVIEW + WHAT_CHANGED + PROMOTIONS + CONTENT_IDEAS
    // (pre-mortem is clean so no MANUAL_REVIEW)
    const sectionTypes = brief.sections.map((s) => s.type);
    expect(sectionTypes).toContain("SLATE_OVERVIEW");
    expect(sectionTypes).toContain("WHAT_CHANGED");
    expect(sectionTypes).toContain("PROMOTIONS");
    expect(sectionTypes).toContain("CONTENT_IDEAS");
    expect(brief.whatChanged.items).toHaveLength(1);
    expect(brief.contentIdeas.items).toHaveLength(1);
    expect(brief.promotions.count).toBe(1);
    expect(brief.promotions.items).toHaveLength(1);
  });
});
