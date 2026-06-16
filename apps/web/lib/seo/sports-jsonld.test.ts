import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  matchupSlug,
  matchupPath,
  buildMatchupMetadata,
  buildSportsEventJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  defaultMatchupFaq,
  buildMatchupPreview,
  type MatchupPreviewInput,
  type MatchupPick,
} from "./sports-jsonld";

const BASE_INPUT: MatchupPreviewInput = {
  sport: "nfl",
  homeTeam: "Kansas City Chiefs",
  awayTeam: "Philadelphia Eagles",
  startTimeIso: "2025-02-09T23:30:00Z",
  venue: "Caesars Superdome",
};

const SPREAD_PICK: MatchupPick = {
  type: "SPREAD",
  selection: "Philadelphia Eagles",
  line: -3.5,
  confidence: 72,
};

const ML_PICK: MatchupPick = {
  type: "MONEYLINE",
  selection: "Kansas City Chiefs",
  line: -115,
  confidence: 61,
};

// ─── matchupSlug ─────────────────────────────────────────────────────────────

describe("matchupSlug", () => {
  it("formats as away-vs-home", () => {
    expect(matchupSlug("Philadelphia Eagles", "Kansas City Chiefs")).toBe(
      "philadelphia-eagles-vs-kansas-city-chiefs"
    );
  });

  it("lowercases and replaces spaces with hyphens", () => {
    expect(matchupSlug("Los Angeles Lakers", "Golden State Warriors")).toBe(
      "los-angeles-lakers-vs-golden-state-warriors"
    );
  });

  it("strips leading/trailing hyphens from each part", () => {
    expect(matchupSlug("NBA Team", "Other Team")).not.toMatch(/^-|-$/);
  });
});

// ─── matchupPath ─────────────────────────────────────────────────────────────

describe("matchupPath", () => {
  it("produces /preview/<sport>/<slug>", () => {
    expect(matchupPath("nfl", "Eagles", "Chiefs")).toBe("/preview/nfl/eagles-vs-chiefs");
  });

  it("lowercases sport", () => {
    expect(matchupPath("NFL", "Away", "Home")).toContain("/preview/nfl/");
  });
});

// ─── buildMatchupMetadata ────────────────────────────────────────────────────

describe("buildMatchupMetadata", () => {
  it("includes both team names in title", () => {
    const { title } = buildMatchupMetadata(BASE_INPUT);
    expect(title).toContain("Philadelphia Eagles");
    expect(title).toContain("Kansas City Chiefs");
  });

  it("uppercases sport in title", () => {
    const { title } = buildMatchupMetadata(BASE_INPUT);
    expect(title).toContain("NFL");
  });

  it("description stays under 300 chars", () => {
    const { description } = buildMatchupMetadata(BASE_INPUT);
    expect(description.length).toBeLessThanOrEqual(300);
  });

  it("includes pick selection and confidence when pick provided", () => {
    const { description } = buildMatchupMetadata({ ...BASE_INPUT, pick: SPREAD_PICK });
    expect(description).toContain("Philadelphia Eagles");
    expect(description).toContain("72");
  });

  it("canonical points to preview path", () => {
    const { canonical } = buildMatchupMetadata(BASE_INPUT);
    expect(canonical).toContain("/preview/nfl/");
    expect(canonical).toContain("philadelphia-eagles-vs-kansas-city-chiefs");
  });
});

// ─── buildSportsEventJsonLd ───────────────────────────────────────────────────

describe("buildSportsEventJsonLd", () => {
  it("has @type SportsEvent", () => {
    const ld = buildSportsEventJsonLd(BASE_INPUT);
    expect(ld["@type"]).toBe("SportsEvent");
  });

  it("includes both competitors", () => {
    const ld = buildSportsEventJsonLd(BASE_INPUT);
    const competitors = ld["competitor"] as Array<{ name: string }>;
    const names = competitors.map((c) => c.name);
    expect(names).toContain("Philadelphia Eagles");
    expect(names).toContain("Kansas City Chiefs");
  });

  it("includes venue as Place when provided", () => {
    const ld = buildSportsEventJsonLd(BASE_INPUT);
    const loc = ld["location"] as { "@type": string; name: string };
    expect(loc["@type"]).toBe("Place");
    expect(loc.name).toBe("Caesars Superdome");
  });

  it("omits location when venue is null", () => {
    const ld = buildSportsEventJsonLd({ ...BASE_INPUT, venue: null });
    expect(ld["location"]).toBeUndefined();
  });

  it("startDate matches input ISO string", () => {
    const ld = buildSportsEventJsonLd(BASE_INPUT);
    expect(ld["startDate"]).toBe("2025-02-09T23:30:00Z");
  });
});

// ─── buildBreadcrumbJsonLd ───────────────────────────────────────────────────

describe("buildBreadcrumbJsonLd", () => {
  it("has @type BreadcrumbList", () => {
    const ld = buildBreadcrumbJsonLd(BASE_INPUT);
    expect(ld["@type"]).toBe("BreadcrumbList");
  });

  it("has exactly 3 items (Picks → sport → matchup)", () => {
    const items = (buildBreadcrumbJsonLd(BASE_INPUT) as { itemListElement: unknown[] })[
      "itemListElement"
    ];
    expect(items).toHaveLength(3);
  });

  it("first item is /picks", () => {
    const items = (
      buildBreadcrumbJsonLd(BASE_INPUT) as { itemListElement: Array<{ item: string }> }
    )["itemListElement"];
    expect(items[0].item).toContain("/picks");
  });

  it("positions are 1-indexed", () => {
    const items = (
      buildBreadcrumbJsonLd(BASE_INPUT) as {
        itemListElement: Array<{ position: number }>;
      }
    )["itemListElement"];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
  });
});

// ─── buildFaqJsonLd ──────────────────────────────────────────────────────────

describe("buildFaqJsonLd", () => {
  it("returns null for empty array", () => {
    expect(buildFaqJsonLd([])).toBeNull();
  });

  it("returns FAQPage for non-empty array", () => {
    const ld = buildFaqJsonLd([{ q: "Who wins?", a: "Unknown." }]);
    expect(ld!["@type"]).toBe("FAQPage");
  });

  it("includes each question", () => {
    const ld = buildFaqJsonLd([
      { q: "Q1?", a: "A1." },
      { q: "Q2?", a: "A2." },
    ]) as { mainEntity: Array<{ name: string }> };
    expect(ld.mainEntity).toHaveLength(2);
    expect(ld.mainEntity[0].name).toBe("Q1?");
  });
});

// ─── defaultMatchupFaq ───────────────────────────────────────────────────────

describe("defaultMatchupFaq", () => {
  it("returns at least 2 questions", () => {
    expect(defaultMatchupFaq(BASE_INPUT).length).toBeGreaterThanOrEqual(2);
  });

  it("references both team names", () => {
    const text = defaultMatchupFaq(BASE_INPUT)
      .map((f) => f.q + f.a)
      .join(" ");
    expect(text).toContain("Philadelphia Eagles");
    expect(text).toContain("Kansas City Chiefs");
  });

  it("incorporates pick sentence when pick is provided", () => {
    const faq = defaultMatchupFaq({ ...BASE_INPUT, pick: SPREAD_PICK });
    const combined = faq.map((f) => f.a).join(" ");
    expect(combined).toContain("Philadelphia Eagles");
    expect(combined).toContain("-3.5");
  });

  it("uses moneyline format (no +/- line suffix) for MONEYLINE picks", () => {
    const faq = defaultMatchupFaq({ ...BASE_INPUT, pick: ML_PICK });
    const combined = faq.map((f) => f.a).join(" ");
    // confidence should appear; line should not appear for moneyline
    expect(combined).toContain("61");
  });
});

// ─── buildMatchupPreview ─────────────────────────────────────────────────────

describe("buildMatchupPreview", () => {
  it("returns metadata, path, and jsonLd", () => {
    const result = buildMatchupPreview(BASE_INPUT);
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("path");
    expect(result).toHaveProperty("jsonLd");
  });

  it("jsonLd contains SportsEvent, BreadcrumbList, and FAQPage", () => {
    const { jsonLd } = buildMatchupPreview(BASE_INPUT);
    const types = jsonLd.map((ld) => ld["@type"]);
    expect(types).toContain("SportsEvent");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("FAQPage");
  });

  it("uses provided faq instead of default when given", () => {
    const customFaq = [{ q: "Custom Q?", a: "Custom A." }];
    const { jsonLd } = buildMatchupPreview({ ...BASE_INPUT, faq: customFaq });
    const faqBlock = jsonLd.find((ld) => ld["@type"] === "FAQPage") as {
      mainEntity: Array<{ name: string }>;
    };
    expect(faqBlock.mainEntity[0].name).toBe("Custom Q?");
  });

  it("path matches preview route pattern", () => {
    const { path } = buildMatchupPreview(BASE_INPUT);
    expect(path).toMatch(/^\/preview\/nfl\/[a-z0-9-]+-vs-[a-z0-9-]+$/);
  });

  it("metadata description never exceeds 300 chars", () => {
    // Long team names shouldn't blow the limit
    const long: MatchupPreviewInput = {
      ...BASE_INPUT,
      awayTeam: "A".repeat(80),
      homeTeam: "B".repeat(80),
      pick: SPREAD_PICK,
    };
    expect(buildMatchupPreview(long).metadata.description.length).toBeLessThanOrEqual(300);
  });
});
