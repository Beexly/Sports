import { describe, it, expect } from "vitest";
import {
  buildSportsEvent,
  buildArticle,
  buildBreadcrumb,
  buildFAQ,
  buildWebSite,
  jsonLdScript,
  combinedSchema,
} from "@/lib/seo/structured-data";
import {
  buildPageMeta,
  buildPickMeta,
  buildBlogMeta,
} from "@/lib/seo/meta-builder";

// ---------------------------------------------------------------------------
// buildSportsEvent
// ---------------------------------------------------------------------------
describe("buildSportsEvent", () => {
  it("sets correct @context and @type", () => {
    const result = buildSportsEvent({ name: "Test Game", startDate: "2026-09-01T18:00:00Z" });
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("SportsEvent");
  });

  it("sets name correctly", () => {
    const result = buildSportsEvent({ name: "Lakers vs Celtics", startDate: "2026-09-01T18:00:00Z" });
    expect(result.name).toBe("Lakers vs Celtics");
  });

  it("converts Date to ISO string for startDate", () => {
    const date = new Date("2026-09-01T18:00:00Z");
    const result = buildSportsEvent({ name: "Test Game", startDate: date });
    expect(result.startDate).toBe(date.toISOString());
  });

  it("passes through ISO string startDate unchanged", () => {
    const iso = "2026-09-01T18:00:00Z";
    const result = buildSportsEvent({ name: "Test Game", startDate: iso });
    expect(result.startDate).toBe(iso);
  });

  it("includes homeTeam when provided", () => {
    const result = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z", homeTeam: "Lakers" });
    expect(result.homeTeam).toEqual({ "@type": "SportsTeam", name: "Lakers" });
  });

  it("includes awayTeam when provided", () => {
    const result = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z", awayTeam: "Celtics" });
    expect(result.awayTeam).toEqual({ "@type": "SportsTeam", name: "Celtics" });
  });

  it("includes location when provided", () => {
    const result = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z", location: "Madison Square Garden" });
    expect(result.location).toEqual({ "@type": "Place", name: "Madison Square Garden" });
  });

  it("includes sport when provided", () => {
    const result = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z", sport: "Basketball" });
    expect(result.sport).toBe("Basketball");
  });

  it("includes url when provided", () => {
    const result = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z", url: "https://example.com/game" });
    expect(result.url).toBe("https://example.com/game");
  });

  it("includes description when provided", () => {
    const result = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z", description: "Big game" });
    expect(result.description).toBe("Big game");
  });

  it("omits optional fields when not provided", () => {
    const result = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z" });
    expect(result.homeTeam).toBeUndefined();
    expect(result.awayTeam).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.sport).toBeUndefined();
    expect(result.url).toBeUndefined();
    expect(result.description).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildArticle
// ---------------------------------------------------------------------------
describe("buildArticle", () => {
  it("sets correct @context and @type", () => {
    const result = buildArticle({ headline: "Test Article", datePublished: "2026-01-01T00:00:00Z" });
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Article");
  });

  it("sets headline correctly", () => {
    const result = buildArticle({ headline: "NFL Week 1 Preview", datePublished: "2026-01-01T00:00:00Z" });
    expect(result.headline).toBe("NFL Week 1 Preview");
  });

  it("converts Date to ISO string for datePublished", () => {
    const date = new Date("2026-06-19T12:00:00Z");
    const result = buildArticle({ headline: "Test", datePublished: date });
    expect(result.datePublished).toBe(date.toISOString());
  });

  it("passes through ISO string datePublished unchanged", () => {
    const iso = "2026-06-19T12:00:00Z";
    const result = buildArticle({ headline: "Test", datePublished: iso });
    expect(result.datePublished).toBe(iso);
  });

  it("includes dateModified when provided", () => {
    const result = buildArticle({
      headline: "Test",
      datePublished: "2026-01-01T00:00:00Z",
      dateModified: "2026-01-02T00:00:00Z",
    });
    expect(result.dateModified).toBe("2026-01-02T00:00:00Z");
  });

  it("converts Date to ISO for dateModified", () => {
    const date = new Date("2026-06-20T00:00:00Z");
    const result = buildArticle({
      headline: "Test",
      datePublished: "2026-01-01T00:00:00Z",
      dateModified: date,
    });
    expect(result.dateModified).toBe(date.toISOString());
  });

  it("includes author with default type Person when authorName provided", () => {
    const result = buildArticle({
      headline: "Test",
      datePublished: "2026-01-01T00:00:00Z",
      authorName: "Jane Smith",
    });
    expect(result.author).toEqual({ "@type": "Person", name: "Jane Smith" });
  });

  it("respects authorType Organization", () => {
    const result = buildArticle({
      headline: "Test",
      datePublished: "2026-01-01T00:00:00Z",
      authorName: "Galaxy Sports Edge",
      authorType: "Organization",
    });
    expect(result.author).toEqual({ "@type": "Organization", name: "Galaxy Sports Edge" });
  });

  it("includes publisher when publisherName provided", () => {
    const result = buildArticle({
      headline: "Test",
      datePublished: "2026-01-01T00:00:00Z",
      publisherName: "Galaxy Sports Edge",
    });
    expect(result.publisher?.["@type"]).toBe("Organization");
    expect(result.publisher?.name).toBe("Galaxy Sports Edge");
  });

  it("includes publisher logo when publisherLogo provided", () => {
    const result = buildArticle({
      headline: "Test",
      datePublished: "2026-01-01T00:00:00Z",
      publisherName: "Galaxy Sports Edge",
      publisherLogo: "https://example.com/logo.png",
    });
    expect(result.publisher?.logo).toEqual({ "@type": "ImageObject", url: "https://example.com/logo.png" });
  });

  it("omits optional fields when not provided", () => {
    const result = buildArticle({ headline: "Test", datePublished: "2026-01-01T00:00:00Z" });
    expect(result.description).toBeUndefined();
    expect(result.dateModified).toBeUndefined();
    expect(result.author).toBeUndefined();
    expect(result.publisher).toBeUndefined();
    expect(result.image).toBeUndefined();
    expect(result.url).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildBreadcrumb
// ---------------------------------------------------------------------------
describe("buildBreadcrumb", () => {
  it("sets correct @context and @type", () => {
    const result = buildBreadcrumb([{ name: "Home", url: "/" }]);
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("BreadcrumbList");
  });

  it("assigns position 1, 2, 3 in order", () => {
    const result = buildBreadcrumb([
      { name: "Home", url: "/" },
      { name: "Picks", url: "/picks" },
      { name: "NFL", url: "/picks/nfl" },
    ]);
    expect(result.itemListElement[0]!.position).toBe(1);
    expect(result.itemListElement[1]!.position).toBe(2);
    expect(result.itemListElement[2]!.position).toBe(3);
  });

  it("sets @type ListItem on each element", () => {
    const result = buildBreadcrumb([{ name: "Home", url: "/" }]);
    expect(result.itemListElement[0]!["@type"]).toBe("ListItem");
  });

  it("sets name on each element", () => {
    const result = buildBreadcrumb([{ name: "Picks", url: "/picks" }]);
    expect(result.itemListElement[0]!.name).toBe("Picks");
  });

  it("sets item (url) when url is provided", () => {
    const result = buildBreadcrumb([{ name: "Home", url: "https://example.com/" }]);
    expect(result.itemListElement[0]!.item).toBe("https://example.com/");
  });

  it("does NOT set item key when url is not provided", () => {
    const result = buildBreadcrumb([{ name: "Current Page" }]);
    expect("item" in result.itemListElement[0]!).toBe(false);
  });

  it("handles mixed items with and without urls", () => {
    const result = buildBreadcrumb([
      { name: "Home", url: "https://example.com/" },
      { name: "Picks", url: "https://example.com/picks" },
      { name: "Current Game" },
    ]);
    expect(result.itemListElement[0]!.item).toBe("https://example.com/");
    expect(result.itemListElement[1]!.item).toBe("https://example.com/picks");
    expect("item" in result.itemListElement[2]!).toBe(false);
  });

  it("handles empty array", () => {
    const result = buildBreadcrumb([]);
    expect(result.itemListElement).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildFAQ
// ---------------------------------------------------------------------------
describe("buildFAQ", () => {
  it("sets correct @context and @type", () => {
    const result = buildFAQ([{ question: "Q?", answer: "A." }]);
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("FAQPage");
  });

  it("builds correct mainEntity structure", () => {
    const result = buildFAQ([
      { question: "Who wins?", answer: "Uncertain." },
      { question: "When is the game?", answer: "Saturday." },
    ]);
    expect(result.mainEntity).toHaveLength(2);
    expect(result.mainEntity[0]!["@type"]).toBe("Question");
    expect(result.mainEntity[0]!.name).toBe("Who wins?");
    expect(result.mainEntity[0]!.acceptedAnswer["@type"]).toBe("Answer");
    expect(result.mainEntity[0]!.acceptedAnswer.text).toBe("Uncertain.");
  });

  it("handles empty FAQ list", () => {
    const result = buildFAQ([]);
    expect(result.mainEntity).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildWebSite
// ---------------------------------------------------------------------------
describe("buildWebSite", () => {
  it("sets correct @context and @type", () => {
    const result = buildWebSite({ name: "Galaxy Sports Edge", url: "https://galaxysportsedge.com" });
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("WebSite");
  });

  it("sets name and url", () => {
    const result = buildWebSite({ name: "Galaxy Sports Edge", url: "https://galaxysportsedge.com" });
    expect(result.name).toBe("Galaxy Sports Edge");
    expect(result.url).toBe("https://galaxysportsedge.com");
  });

  it("includes description when provided", () => {
    const result = buildWebSite({
      name: "Galaxy Sports Edge",
      url: "https://galaxysportsedge.com",
      description: "Sports analytics platform",
    });
    expect(result.description).toBe("Sports analytics platform");
  });

  it("omits description when not provided", () => {
    const result = buildWebSite({ name: "Galaxy Sports Edge", url: "https://galaxysportsedge.com" });
    expect(result.description).toBeUndefined();
  });

  it("adds SearchAction with searchUrl", () => {
    const result = buildWebSite({
      name: "Galaxy Sports Edge",
      url: "https://galaxysportsedge.com",
      searchUrl: "https://galaxysportsedge.com/search?q=",
    });
    expect(result.potentialAction).toBeDefined();
    expect(result.potentialAction?.["@type"]).toBe("SearchAction");
    expect(result.potentialAction?.target).toBe(
      "https://galaxysportsedge.com/search?q={search_term_string}"
    );
    expect(result.potentialAction?.["query-input"]).toBe("required name=search_term_string");
  });

  it("omits potentialAction when searchUrl not provided", () => {
    const result = buildWebSite({ name: "Galaxy Sports Edge", url: "https://galaxysportsedge.com" });
    expect(result.potentialAction).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// jsonLdScript
// ---------------------------------------------------------------------------
describe("jsonLdScript", () => {
  it("returns a valid JSON string", () => {
    const schema = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z" });
    const output = jsonLdScript(schema as unknown as Record<string, unknown>);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("parses back to the original schema", () => {
    const schema = buildSportsEvent({ name: "Test", startDate: "2026-09-01T00:00:00Z" });
    const output = jsonLdScript(schema as unknown as Record<string, unknown>);
    const parsed = JSON.parse(output);
    expect(parsed["@type"]).toBe("SportsEvent");
    expect(parsed.name).toBe("Test");
  });

  it("uses 2-space indentation", () => {
    const schema = { "@type": "WebSite", name: "Test" };
    const output = jsonLdScript(schema);
    expect(output).toContain("  ");
    expect(output).toMatch(/"@type": "WebSite"/);
  });
});

// ---------------------------------------------------------------------------
// combinedSchema
// ---------------------------------------------------------------------------
describe("combinedSchema", () => {
  it("returns a JSON array string", () => {
    const event = buildSportsEvent({ name: "Test Game", startDate: "2026-09-01T00:00:00Z" });
    const site = buildWebSite({ name: "GSE", url: "https://galaxysportsedge.com" });
    const output = combinedSchema([
      event as unknown as Record<string, unknown>,
      site as unknown as Record<string, unknown>,
    ]);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it("preserves both schemas in order", () => {
    const event = buildSportsEvent({ name: "Test Game", startDate: "2026-09-01T00:00:00Z" });
    const site = buildWebSite({ name: "GSE", url: "https://galaxysportsedge.com" });
    const output = combinedSchema([
      event as unknown as Record<string, unknown>,
      site as unknown as Record<string, unknown>,
    ]);
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>;
    expect(parsed[0]!["@type"]).toBe("SportsEvent");
    expect(parsed[1]!["@type"]).toBe("WebSite");
  });
});

// ---------------------------------------------------------------------------
// buildPageMeta
// ---------------------------------------------------------------------------
describe("buildPageMeta", () => {
  it("sets title and description", () => {
    const meta = buildPageMeta({ title: "Test Page", description: "Test desc" });
    expect(meta.title).toBe("Test Page");
    expect(meta.description).toBe("Test desc");
  });

  it("sets openGraph type to website by default", () => {
    const meta = buildPageMeta({ title: "Test", description: "Desc" });
    expect((meta.openGraph as { type?: string } | undefined)?.type).toBe("website");
  });

  it("sets openGraph type to article when specified", () => {
    const meta = buildPageMeta({ title: "Test", description: "Desc", type: "article" });
    expect((meta.openGraph as { type?: string } | undefined)?.type).toBe("article");
  });

  it("sets openGraph title and description", () => {
    const meta = buildPageMeta({ title: "Test Page", description: "Test desc" });
    expect(meta.openGraph?.title).toBe("Test Page");
    expect(meta.openGraph?.description).toBe("Test desc");
  });

  it("sets twitter card to summary_large_image by default", () => {
    const meta = buildPageMeta({ title: "Test", description: "Desc" });
    expect((meta.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
  });

  it("sets twitter card to summary when specified", () => {
    const meta = buildPageMeta({ title: "Test", description: "Desc", twitterCard: "summary" });
    expect((meta.twitter as { card?: string } | undefined)?.card).toBe("summary");
  });

  it("sets alternates.canonical when url provided", () => {
    const meta = buildPageMeta({
      title: "Test",
      description: "Desc",
      url: "https://example.com/page",
    });
    expect(meta.alternates?.canonical).toBe("https://example.com/page");
  });

  it("omits alternates when url not provided", () => {
    const meta = buildPageMeta({ title: "Test", description: "Desc" });
    expect(meta.alternates).toBeUndefined();
  });

  it("includes openGraph images when image provided", () => {
    const meta = buildPageMeta({
      title: "Test",
      description: "Desc",
      image: "https://example.com/img.png",
    });
    expect(meta.openGraph?.images).toContain("https://example.com/img.png");
  });

  it("includes twitter images when image provided", () => {
    const meta = buildPageMeta({
      title: "Test",
      description: "Desc",
      image: "https://example.com/img.png",
    });
    expect(meta.twitter?.images).toContain("https://example.com/img.png");
  });

  it("includes siteName in openGraph when provided", () => {
    const meta = buildPageMeta({
      title: "Test",
      description: "Desc",
      siteName: "Galaxy Sports Edge",
    });
    expect(meta.openGraph?.siteName).toBe("Galaxy Sports Edge");
  });
});

// ---------------------------------------------------------------------------
// buildPickMeta
// ---------------------------------------------------------------------------
describe("buildPickMeta", () => {
  const baseParams = {
    sport: "NFL",
    homeTeam: "Chiefs",
    awayTeam: "Ravens",
    confidence: 72,
    tier: "Pro",
  };

  it("includes both team names in title", () => {
    const meta = buildPickMeta(baseParams);
    expect(meta.title).toContain("Chiefs");
    expect(meta.title).toContain("Ravens");
  });

  it("includes sport in title", () => {
    const meta = buildPickMeta(baseParams);
    expect(meta.title).toContain("NFL");
  });

  it("includes Galaxy Sports Edge brand in title", () => {
    const meta = buildPickMeta(baseParams);
    expect(String(meta.title)).toContain("Galaxy Sports Edge");
  });

  it("includes confidence score in description", () => {
    const meta = buildPickMeta(baseParams);
    expect(meta.description).toContain("72%");
  });

  it("includes tier in description", () => {
    const meta = buildPickMeta(baseParams);
    expect(meta.description).toContain("Pro");
  });

  it("does NOT contain guaranteed in description", () => {
    const meta = buildPickMeta(baseParams);
    expect(String(meta.description).toLowerCase()).not.toContain("guaranteed");
  });

  it("does NOT contain win-rate fabrication in description", () => {
    const meta = buildPickMeta(baseParams);
    const desc = String(meta.description).toLowerCase();
    expect(desc).not.toContain("win every");
    expect(desc).not.toContain("100%");
    expect(desc).not.toContain("sure bet");
    expect(desc).not.toContain("sure win");
    expect(desc).not.toContain("profit every");
  });

  it("sets openGraph type", () => {
    const meta = buildPickMeta(baseParams);
    expect((meta.openGraph as { type?: string } | undefined)?.type).toBe("website");
  });

  it("sets twitter card", () => {
    const meta = buildPickMeta(baseParams);
    expect((meta.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
  });

  it("sets alternates.canonical when baseUrl provided", () => {
    const meta = buildPickMeta({ ...baseParams, baseUrl: "https://example.com/pick/1" });
    expect(meta.alternates?.canonical).toBe("https://example.com/pick/1");
  });
});

// ---------------------------------------------------------------------------
// buildBlogMeta
// ---------------------------------------------------------------------------
describe("buildBlogMeta", () => {
  it("sets title and description", () => {
    const meta = buildBlogMeta({
      title: "NFL Preview 2026",
      description: "Season preview",
      publishedAt: "2026-06-19T00:00:00Z",
    });
    expect(meta.title).toBe("NFL Preview 2026");
    expect(meta.description).toBe("Season preview");
  });

  it("sets openGraph type to article", () => {
    const meta = buildBlogMeta({
      title: "Test",
      description: "Desc",
      publishedAt: "2026-06-19T00:00:00Z",
    });
    expect((meta.openGraph as { type?: string } | undefined)?.type).toBe("article");
  });

  it("sets publishedTime from ISO string", () => {
    const meta = buildBlogMeta({
      title: "Test",
      description: "Desc",
      publishedAt: "2026-06-19T12:00:00Z",
    });
    expect((meta.openGraph as { publishedTime?: string } | undefined)?.publishedTime).toBe("2026-06-19T12:00:00Z");
  });

  it("sets publishedTime from Date object", () => {
    const date = new Date("2026-06-19T12:00:00Z");
    const meta = buildBlogMeta({
      title: "Test",
      description: "Desc",
      publishedAt: date,
    });
    expect((meta.openGraph as { publishedTime?: string } | undefined)?.publishedTime).toBe(date.toISOString());
  });

  it("includes authors when authorName provided", () => {
    const meta = buildBlogMeta({
      title: "Test",
      description: "Desc",
      publishedAt: "2026-06-19T00:00:00Z",
      authorName: "Jane Smith",
    });
    expect((meta.openGraph as { authors?: string[] } | undefined)?.authors).toContain("Jane Smith");
  });

  it("includes image in openGraph and twitter when provided", () => {
    const meta = buildBlogMeta({
      title: "Test",
      description: "Desc",
      publishedAt: "2026-06-19T00:00:00Z",
      image: "https://example.com/og.png",
    });
    expect(meta.openGraph?.images).toContain("https://example.com/og.png");
    expect(meta.twitter?.images).toContain("https://example.com/og.png");
  });

  it("sets alternates.canonical when url provided", () => {
    const meta = buildBlogMeta({
      title: "Test",
      description: "Desc",
      publishedAt: "2026-06-19T00:00:00Z",
      url: "https://example.com/blog/test",
    });
    expect(meta.alternates?.canonical).toBe("https://example.com/blog/test");
  });

  it("sets twitter card to summary_large_image", () => {
    const meta = buildBlogMeta({
      title: "Test",
      description: "Desc",
      publishedAt: "2026-06-19T00:00:00Z",
    });
    expect((meta.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
  });
});
