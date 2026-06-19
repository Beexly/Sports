/**
 * Tests for URL slug utilities — apps/web/lib/utils/slug.ts
 *
 * Minimum 55 tests covering: slugify, slugifyTeam, slugifyGame,
 * slugifyPick, slugifyPlayer, slugifyContent, isValidSlug,
 * normalizeSlug, uniqueSlugs, slugToTitle, extractDateFromSlug,
 * buildPickUrl, buildTeamUrl, buildPlayerUrl, truncateSlug, sportSlug.
 */

import { describe, it, expect } from "vitest";
import {
  slugify,
  slugifyTeam,
  slugifyGame,
  slugifyPick,
  slugifyPlayer,
  slugifyContent,
  isValidSlug,
  normalizeSlug,
  uniqueSlugs,
  slugToTitle,
  extractDateFromSlug,
  buildPickUrl,
  buildTeamUrl,
  buildPlayerUrl,
  truncateSlug,
  sportSlug,
} from "@/lib/utils/slug";

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe("slugify", () => {
  it("converts a team name to a slug", () => {
    expect(slugify("Kansas City Chiefs")).toBe("kansas-city-chiefs");
  });

  it("handles roman numerals and suffixes", () => {
    expect(slugify("Patrick Mahomes II")).toBe("patrick-mahomes-ii");
  });

  it("replaces special characters — decimal point", () => {
    expect(slugify("Over 44.5")).toBe("over-44-5");
  });

  it("collapses multiple spaces", () => {
    expect(slugify("  multiple   spaces  ")).toBe("multiple-spaces");
  });

  it("replaces underscores with separator", () => {
    expect(slugify("with_underscore", { separator: "-" })).toBe("with-underscore");
  });

  it("respects maxLength by trimming at word boundary", () => {
    const result = slugify("kansas-city-chiefs", { maxLength: 7 });
    expect(result.length).toBeLessThanOrEqual(7);
    expect(result).not.toMatch(/-$/);
  });

  it("respects maxLength: short string passes through unchanged", () => {
    expect(slugify("hello", { maxLength: 10 })).toBe("hello");
  });

  it("removes diacritics — café", () => {
    expect(slugify("café")).toBe("cafe");
  });

  it("removes diacritics — ñ", () => {
    expect(slugify("cañón")).toBe("canon");
  });

  it("removes diacritics — é", () => {
    expect(slugify("résumé")).toBe("resume");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles string with only special chars", () => {
    expect(slugify("---!!!---")).toBe("");
  });

  it("uses custom separator", () => {
    expect(slugify("hello world", { separator: "_" })).toBe("hello_world");
  });

  it("can opt out of lowercasing", () => {
    expect(slugify("Hello World", { lowercase: false })).toBe("Hello-World");
  });

  it("deduplicates separators", () => {
    expect(slugify("a--b  c")).toBe("a-b-c");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("handles numbers in text", () => {
    expect(slugify("Week 15 Picks")).toBe("week-15-picks");
  });

  it("handles plus sign (spread notation)", () => {
    expect(slugify("Chiefs +3")).toBe("chiefs-3");
  });

  it("handles mixed punctuation", () => {
    expect(slugify("Chiefs: -3.5 (Spread)")).toBe("chiefs-3-5-spread");
  });
});

// ---------------------------------------------------------------------------
// slugifyTeam
// ---------------------------------------------------------------------------

describe("slugifyTeam", () => {
  it("includes sport prefix when provided", () => {
    expect(slugifyTeam("Kansas City Chiefs", "NFL")).toBe("nfl-kansas-city-chiefs");
  });

  it("returns just the team slug without sport", () => {
    expect(slugifyTeam("Golden State Warriors")).toBe("golden-state-warriors");
  });

  it("lowercases the sport prefix", () => {
    expect(slugifyTeam("Lakers", "NBA")).toBe("nba-lakers");
  });

  it("handles team names with special chars", () => {
    expect(slugifyTeam("St. Louis Blues", "NHL")).toBe("nhl-st-louis-blues");
  });
});

// ---------------------------------------------------------------------------
// slugifyGame
// ---------------------------------------------------------------------------

describe("slugifyGame", () => {
  it("contains both team slugs and date (no sport)", () => {
    const result = slugifyGame("Chiefs", "Raiders", "2024-01-07");
    expect(result).toContain("chiefs");
    expect(result).toContain("raiders");
    expect(result).toContain("2024-01-07");
  });

  it("starts with sport prefix when provided", () => {
    const result = slugifyGame("Chiefs", "Raiders", "2024-01-07", "NFL");
    expect(result).toMatch(/^nfl-/);
  });

  it("uses 'at' between away and home", () => {
    const result = slugifyGame("Chiefs", "Raiders", "2024-01-07");
    expect(result).toContain("raiders-at-chiefs");
  });

  it("formats a Date object correctly", () => {
    const result = slugifyGame("Chiefs", "Raiders", new Date(2024, 0, 7));
    expect(result).toContain("2024-01-07");
  });

  it("formats an ISO date string correctly", () => {
    const result = slugifyGame("Chiefs", "Raiders", "2024-01-07T20:00:00Z");
    expect(result).toContain("2024-01-07");
  });

  it("full game slug with sport is correct", () => {
    expect(slugifyGame("Chiefs", "Raiders", "2024-01-07", "NFL")).toBe(
      "nfl-raiders-at-chiefs-2024-01-07",
    );
  });

  it("slugifies team names with spaces", () => {
    const result = slugifyGame("Green Bay Packers", "New York Giants", "2024-01-07", "NFL");
    expect(result).toBe("nfl-new-york-giants-at-green-bay-packers-2024-01-07");
  });
});

// ---------------------------------------------------------------------------
// slugifyPick
// ---------------------------------------------------------------------------

describe("slugifyPick", () => {
  it("contains the slugified pick and game slug", () => {
    const result = slugifyPick("Chiefs -3.5", "chiefs-at-raiders-2024-01-07");
    expect(result).toContain("chiefs");
    // "Chiefs -3.5" → "chiefs-3-5" (dot becomes separator)
    expect(result).toContain("3-5");
    expect(result).toContain("chiefs-at-raiders-2024-01-07");
  });

  it("appends first 8 chars of id when provided", () => {
    const result = slugifyPick(
      "Chiefs -3.5",
      "chiefs-at-raiders-2024-01-07",
      "abc12345xyz",
    );
    expect(result).toContain("abc12345");
    expect(result).not.toContain("xyz");
  });

  it("does not append id when not provided", () => {
    const result = slugifyPick("Over 44.5", "chiefs-at-raiders-2024-01-07");
    expect(result).toBe("over-44-5-chiefs-at-raiders-2024-01-07");
  });
});

// ---------------------------------------------------------------------------
// slugifyPlayer
// ---------------------------------------------------------------------------

describe("slugifyPlayer", () => {
  it("includes sport, team, and player", () => {
    const result = slugifyPlayer("Patrick Mahomes", "Chiefs", "NFL");
    expect(result).toContain("patrick-mahomes");
    expect(result).toContain("nfl");
    expect(result).toContain("chiefs");
  });

  it("returns just the player slug when no team or sport", () => {
    expect(slugifyPlayer("Patrick Mahomes")).toBe("patrick-mahomes");
  });

  it("includes team but not sport", () => {
    expect(slugifyPlayer("LeBron James", "Lakers")).toBe("lakers-lebron-james");
  });

  it("uses sport slug normalization", () => {
    const result = slugifyPlayer("Patrick Mahomes", "Chiefs", "NFL");
    expect(result).toBe("nfl-chiefs-patrick-mahomes");
  });
});

// ---------------------------------------------------------------------------
// slugifyContent
// ---------------------------------------------------------------------------

describe("slugifyContent", () => {
  it("combines title slug and date", () => {
    expect(slugifyContent("Week 15 NFL Preview", "2024-12-12")).toBe(
      "week-15-nfl-preview-2024-12-12",
    );
  });

  it("returns just title slug when no date", () => {
    expect(slugifyContent("Week 15 NFL Preview")).toBe("week-15-nfl-preview");
  });

  it("accepts a Date object", () => {
    const result = slugifyContent("My Article", new Date(2024, 11, 12));
    expect(result).toBe("my-article-2024-12-12");
  });
});

// ---------------------------------------------------------------------------
// isValidSlug
// ---------------------------------------------------------------------------

describe("isValidSlug", () => {
  it("accepts a valid slug", () => {
    expect(isValidSlug("kansas-city-chiefs")).toBe(true);
  });

  it("accepts a single word", () => {
    expect(isValidSlug("nfl")).toBe(true);
  });

  it("rejects a leading dash", () => {
    expect(isValidSlug("-invalid")).toBe(false);
  });

  it("rejects spaces", () => {
    expect(isValidSlug("has spaces")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects consecutive dashes", () => {
    expect(isValidSlug("double--dash")).toBe(false);
  });

  it("rejects uppercase", () => {
    expect(isValidSlug("NFL")).toBe(false);
  });

  it("rejects trailing dash", () => {
    expect(isValidSlug("trailing-")).toBe(false);
  });

  it("accepts alphanumeric with dashes", () => {
    expect(isValidSlug("week-15-nfl-preview")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeSlug
// ---------------------------------------------------------------------------

describe("normalizeSlug", () => {
  it("strips leading and trailing dashes", () => {
    expect(normalizeSlug("--Some Weird Slug--")).toBe("some-weird-slug");
  });

  it("lowercases", () => {
    expect(normalizeSlug("HELLO-WORLD")).toBe("hello-world");
  });

  it("deduplicates dashes", () => {
    expect(normalizeSlug("a--b---c")).toBe("a-b-c");
  });

  it("removes special characters", () => {
    expect(normalizeSlug("hello!@#world")).toBe("hello-world");
  });
});

// ---------------------------------------------------------------------------
// uniqueSlugs
// ---------------------------------------------------------------------------

describe("uniqueSlugs", () => {
  it("deduplicates three identical slugs", () => {
    expect(uniqueSlugs(["a", "a", "a"])).toEqual(["a", "a-2", "a-3"]);
  });

  it("leaves distinct slugs unchanged", () => {
    expect(uniqueSlugs(["a", "b"])).toEqual(["a", "b"]);
  });

  it("handles an empty array", () => {
    expect(uniqueSlugs([])).toEqual([]);
  });

  it("handles a single item", () => {
    expect(uniqueSlugs(["my-pick"])).toEqual(["my-pick"]);
  });

  it("deduplicates mixed slugs", () => {
    const result = uniqueSlugs(["a", "b", "a", "c", "b"]);
    expect(result[0]).toBe("a");
    expect(result[1]).toBe("b");
    expect(result[2]).toBe("a-2");
    expect(result[3]).toBe("c");
    expect(result[4]).toBe("b-2");
  });
});

// ---------------------------------------------------------------------------
// slugToTitle
// ---------------------------------------------------------------------------

describe("slugToTitle", () => {
  it("converts a slug to title case", () => {
    expect(slugToTitle("kansas-city-chiefs")).toBe("Kansas City Chiefs");
  });

  it("handles a single word", () => {
    expect(slugToTitle("nfl")).toBe("Nfl");
  });

  it("handles numeric segments", () => {
    expect(slugToTitle("week-15-picks")).toBe("Week 15 Picks");
  });
});

// ---------------------------------------------------------------------------
// extractDateFromSlug
// ---------------------------------------------------------------------------

describe("extractDateFromSlug", () => {
  it("extracts a date from a game slug", () => {
    expect(extractDateFromSlug("nfl-chiefs-at-raiders-2024-01-07")).toBe("2024-01-07");
  });

  it("returns null when no date is present", () => {
    expect(extractDateFromSlug("no-date-here")).toBeNull();
  });

  it("extracts date from a content slug", () => {
    expect(extractDateFromSlug("week-15-nfl-preview-2024-12-12")).toBe("2024-12-12");
  });

  it("returns null for an empty string", () => {
    expect(extractDateFromSlug("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildPickUrl
// ---------------------------------------------------------------------------

describe("buildPickUrl", () => {
  it("builds the correct pick URL", () => {
    expect(buildPickUrl("https://example.com", "my-pick")).toBe(
      "https://example.com/picks/my-pick",
    );
  });

  it("strips trailing slash from baseUrl", () => {
    expect(buildPickUrl("https://example.com/", "my-pick")).toBe(
      "https://example.com/picks/my-pick",
    );
  });

  it("works with galaxy sports edge domain", () => {
    expect(buildPickUrl("https://galaxysportsedge.com", "nfl-chiefs-35")).toBe(
      "https://galaxysportsedge.com/picks/nfl-chiefs-35",
    );
  });
});

// ---------------------------------------------------------------------------
// buildTeamUrl
// ---------------------------------------------------------------------------

describe("buildTeamUrl", () => {
  it("builds the correct team URL", () => {
    expect(buildTeamUrl("https://example.com", "NFL", "chiefs")).toBe(
      "https://example.com/nfl/chiefs",
    );
  });

  it("lowercases the sport segment", () => {
    expect(buildTeamUrl("https://example.com", "NBA", "lakers")).toBe(
      "https://example.com/nba/lakers",
    );
  });

  it("strips trailing slash from baseUrl", () => {
    expect(buildTeamUrl("https://example.com/", "NFL", "chiefs")).toBe(
      "https://example.com/nfl/chiefs",
    );
  });
});

// ---------------------------------------------------------------------------
// buildPlayerUrl
// ---------------------------------------------------------------------------

describe("buildPlayerUrl", () => {
  it("builds the correct player URL", () => {
    expect(buildPlayerUrl("https://example.com", "NFL", "mahomes")).toBe(
      "https://example.com/players/nfl/mahomes",
    );
  });

  it("lowercases the sport segment", () => {
    expect(buildPlayerUrl("https://example.com", "NBA", "lebron-james")).toBe(
      "https://example.com/players/nba/lebron-james",
    );
  });

  it("strips trailing slash from baseUrl", () => {
    expect(buildPlayerUrl("https://example.com/", "NFL", "mahomes")).toBe(
      "https://example.com/players/nfl/mahomes",
    );
  });
});

// ---------------------------------------------------------------------------
// truncateSlug
// ---------------------------------------------------------------------------

describe("truncateSlug", () => {
  it("truncates to maxLength without trailing dash", () => {
    const result = truncateSlug("a-very-long-slug", 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result).not.toMatch(/-$/);
  });

  it("returns slug unchanged when shorter than maxLength", () => {
    expect(truncateSlug("short", 20)).toBe("short");
  });

  it("returns slug unchanged when equal to maxLength", () => {
    expect(truncateSlug("exact", 5)).toBe("exact");
  });

  it("truncates at word boundary", () => {
    expect(truncateSlug("hello-world-foo", 11)).toBe("hello-world");
  });

  it("result is a valid slug (no trailing dash)", () => {
    const result = truncateSlug("one-two-three-four", 8);
    expect(result).not.toMatch(/-$/);
    expect(result.length).toBeLessThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// sportSlug
// ---------------------------------------------------------------------------

describe("sportSlug", () => {
  it("normalizes NFL", () => {
    expect(sportSlug("NFL")).toBe("nfl");
  });

  it("normalizes nfl (lowercase)", () => {
    expect(sportSlug("nfl")).toBe("nfl");
  });

  it("normalizes full name National Football League", () => {
    expect(sportSlug("National Football League")).toBe("nfl");
  });

  it("normalizes NCAAF to cfb", () => {
    expect(sportSlug("NCAAF")).toBe("cfb");
  });

  it("normalizes CFB", () => {
    expect(sportSlug("CFB")).toBe("cfb");
  });

  it("normalizes NBA", () => {
    expect(sportSlug("NBA")).toBe("nba");
  });

  it("normalizes MLB", () => {
    expect(sportSlug("MLB")).toBe("mlb");
  });

  it("normalizes NHL", () => {
    expect(sportSlug("NHL")).toBe("nhl");
  });

  it("normalizes NCAAB", () => {
    expect(sportSlug("NCAAB")).toBe("ncaab");
  });

  it("normalizes EPL", () => {
    expect(sportSlug("EPL")).toBe("epl");
  });

  it("normalizes MLS", () => {
    expect(sportSlug("MLS")).toBe("mls");
  });

  it("falls back to slugify for unknown sports", () => {
    expect(sportSlug("XFL")).toBe("xfl");
  });

  it("falls back to slugify for a long unknown name", () => {
    expect(sportSlug("Pro Badminton League")).toBe("pro-badminton-league");
  });
});
