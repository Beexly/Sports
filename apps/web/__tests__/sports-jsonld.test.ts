import { describe, it, expect } from "vitest";
import {
  matchupSlug,
  matchupPath,
  buildMatchupMetadata,
  buildSportsEventJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildMatchupPreview,
  type MatchupPreviewInput,
} from "@/lib/seo/sports-jsonld";

const input: MatchupPreviewInput = {
  sport: "nba",
  homeTeam: "Boston Celtics",
  awayTeam: "Los Angeles Lakers",
  startTimeIso: "2026-01-15T00:30:00Z",
  venue: "TD Garden",
  // confidence is required on MatchupPick (#114): the builder embeds it, so
  // pages pass a pick only for viewers entitled to see it.
  pick: { type: "SPREAD", selection: "Boston Celtics -4.5", line: -4.5, confidence: 63.4 },
};

describe("programmatic SEO engine (matchup previews)", () => {
  it("builds clean slugs and canonical paths (away vs home)", () => {
    expect(matchupSlug("Los Angeles Lakers", "Boston Celtics")).toBe("los-angeles-lakers-vs-boston-celtics");
    expect(matchupPath("NBA", "Los Angeles Lakers", "Boston Celtics")).toBe("/preview/nba/los-angeles-lakers-vs-boston-celtics");
  });

  it("produces title/description metadata grounded in the pick", () => {
    const m = buildMatchupMetadata(input);
    expect(m.title).toContain("Los Angeles Lakers vs Boston Celtics");
    expect(m.title).toContain("NBA");
    expect(m.description).toContain("Boston Celtics");
    expect(m.description.length).toBeLessThanOrEqual(300);
    expect(m.canonical).toContain("/preview/nba/los-angeles-lakers-vs-boston-celtics");
  });

  it("emits valid SportsEvent JSON-LD with both competitors + venue", () => {
    const ld = buildSportsEventJsonLd(input);
    expect(ld["@type"]).toBe("SportsEvent");
    expect(ld["@context"]).toBe("https://schema.org");
    expect((ld.competitor as unknown[]).length).toBe(2);
    expect((ld.location as Record<string, unknown>).name).toBe("TD Garden");
    expect(ld.startDate).toBe("2026-01-15T00:30:00Z");
  });

  it("emits a BreadcrumbList whose positions all have distinct URLs (Picks → matchup)", () => {
    const bc = buildBreadcrumbJsonLd(input);
    expect(bc["@type"]).toBe("BreadcrumbList");
    const items = bc.itemListElement as { position: number; item: string }[];
    expect(items.length).toBe(2);
    // Every position must resolve to a DISTINCT URL — a duplicate consecutive URL
    // is an invalid breadcrumb trail that search engines drop.
    const urls = items.map((it) => it.item);
    expect(new Set(urls).size).toBe(urls.length);
    expect(items.map((it) => it.position)).toEqual([1, 2]);
  });

  it("emits FAQPage JSON-LD, or null when empty", () => {
    expect(buildFaqJsonLd([])).toBeNull();
    const faq = buildFaqJsonLd([{ q: "Who wins?", a: "The model leans Boston." }]);
    expect(faq!["@type"]).toBe("FAQPage");
    expect((faq!.mainEntity as unknown[]).length).toBe(1);
  });

  it("buildMatchupPreview returns metadata + path + all JSON-LD blocks in one call", () => {
    const out = buildMatchupPreview(input);
    expect(out.path).toBe("/preview/nba/los-angeles-lakers-vs-boston-celtics");
    expect(out.jsonLd.length).toBe(3); // SportsEvent + Breadcrumb + (default) FAQ
    expect(out.jsonLd.map((b) => b["@type"])).toEqual(["SportsEvent", "BreadcrumbList", "FAQPage"]);
    // default FAQ is fact-templated from the pick (no fabricated numbers)
    const faqBlock = out.jsonLd[2] as { mainEntity: { acceptedAnswer: { text: string } }[] };
    expect(faqBlock.mainEntity[0]!.acceptedAnswer.text).toContain("Boston Celtics");
  });

  it("handles a game with no pick yet (still valid SEO page)", () => {
    const out = buildMatchupPreview({ ...input, pick: null });
    expect(out.jsonLd[0]!["@type"]).toBe("SportsEvent");
    expect(out.metadata.description).toContain("NBA");
  });

  it("withholds a noncanonical market line from metadata and FAQ JSON-LD", () => {
    const unsafe = {
      ...input,
      pick: { ...input.pick!, line: -3.25, selection: "Boston Celtics -3.25" },
    };
    const out = buildMatchupPreview(unsafe);
    expect(out.metadata.description).not.toContain("-3.25");
    expect(JSON.stringify(out.jsonLd)).not.toContain("-3.25");
  });
});
