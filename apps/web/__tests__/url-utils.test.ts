import { describe, it, expect } from "vitest";
import {
  parseQueryString,
  stringifyQueryString,
  buildUrl,
  parsePathParams,
  buildPath,
  getPathSegments,
  joinPaths,
  isRelativePath,
  isAbsoluteUrl,
  extractOrigin,
  extractPathname,
  addTrailingSlash,
  removeTrailingSlash,
  replaceQueryParam,
  getQueryParam,
  getAllQueryParams,
  sportsRoutes,
} from "@/lib/utils/url-utils";

// ---------------------------------------------------------------------------
// parseQueryString
// ---------------------------------------------------------------------------
describe("parseQueryString", () => {
  it("parses basic key=value pairs", () => {
    expect(parseQueryString("a=1&b=2")).toEqual({ a: "1", b: "2" });
  });

  it("strips leading '?' before parsing", () => {
    expect(parseQueryString("?a=1&b=2")).toEqual({ a: "1", b: "2" });
  });

  it("handles repeated keys as string[]", () => {
    expect(parseQueryString("a=1&a=2")).toEqual({ a: ["1", "2"] });
  });

  it("handles three or more repeated keys", () => {
    expect(parseQueryString("x=1&x=2&x=3")).toEqual({ x: ["1", "2", "3"] });
  });

  it("returns empty object for empty string", () => {
    expect(parseQueryString("")).toEqual({});
  });

  it("returns empty object for bare '?'", () => {
    expect(parseQueryString("?")).toEqual({});
  });

  it("decodes URI components in values", () => {
    expect(parseQueryString("q=hello%20world")).toEqual({ q: "hello world" });
  });

  it("decodes URI components in keys", () => {
    expect(parseQueryString("my%20key=val")).toEqual({ "my key": "val" });
  });

  it("handles empty value (key=)", () => {
    expect(parseQueryString("key=")).toEqual({ key: "" });
  });

  it("handles key with no '=' sign as empty string value", () => {
    const result = parseQueryString("flag");
    expect(result["flag"]).toBe("");
  });

  it("handles special characters in values", () => {
    expect(parseQueryString("redirect=%2Fpicks%2Fnfl")).toEqual({
      redirect: "/picks/nfl",
    });
  });

  it("handles multiple different keys", () => {
    const r = parseQueryString("sport=nfl&week=3&team=KC");
    expect(r).toEqual({ sport: "nfl", week: "3", team: "KC" });
  });

  it("handles '+' as plus sign (not space, since no encodeURIComponent special)", () => {
    // encodeURIComponent produces %20 for space; + is literal plus in decodeURIComponent
    const r = parseQueryString("q=a%2Bb");
    expect(r).toEqual({ q: "a+b" });
  });

  it("handles mixed single and multiple value keys", () => {
    const r = parseQueryString("a=1&b=2&b=3");
    expect(r).toEqual({ a: "1", b: ["2", "3"] });
  });
});

// ---------------------------------------------------------------------------
// stringifyQueryString
// ---------------------------------------------------------------------------
describe("stringifyQueryString", () => {
  it("serializes basic string values", () => {
    expect(stringifyQueryString({ a: "1", b: "2" })).toBe("a=1&b=2");
  });

  it("skips null values", () => {
    expect(stringifyQueryString({ a: "1", b: null })).toBe("a=1");
  });

  it("skips undefined values", () => {
    expect(stringifyQueryString({ a: "1", b: undefined })).toBe("a=1");
  });

  it("serializes boolean true as 'true'", () => {
    expect(stringifyQueryString({ flag: true })).toBe("flag=true");
  });

  it("serializes boolean false as 'false'", () => {
    expect(stringifyQueryString({ flag: false })).toBe("flag=false");
  });

  it("serializes number to string", () => {
    expect(stringifyQueryString({ page: 3 })).toBe("page=3");
  });

  it("serializes string[] as repeated keys", () => {
    expect(stringifyQueryString({ a: ["1", "2"] })).toBe("a=1&a=2");
  });

  it("returns empty string for empty object", () => {
    expect(stringifyQueryString({})).toBe("");
  });

  it("returns empty string when all values are null", () => {
    expect(stringifyQueryString({ a: null, b: undefined })).toBe("");
  });

  it("encodes special characters", () => {
    expect(stringifyQueryString({ q: "hello world" })).toBe("q=hello%20world");
  });

  it("encodes '&' in values", () => {
    expect(stringifyQueryString({ q: "a&b" })).toBe("q=a%26b");
  });

  it("encodes keys with special characters", () => {
    const result = stringifyQueryString({ "my key": "val" });
    expect(result).toBe("my%20key=val");
  });

  it("handles zero as a number", () => {
    expect(stringifyQueryString({ page: 0 })).toBe("page=0");
  });

  it("handles empty string value", () => {
    expect(stringifyQueryString({ key: "" })).toBe("key=");
  });
});

// ---------------------------------------------------------------------------
// buildUrl
// ---------------------------------------------------------------------------
describe("buildUrl", () => {
  it("returns base unchanged when no params", () => {
    expect(buildUrl("/picks")).toBe("/picks");
  });

  it("returns base unchanged when params is undefined", () => {
    expect(buildUrl("/picks", undefined)).toBe("/picks");
  });

  it("returns base unchanged when all params are null", () => {
    expect(buildUrl("/picks", { a: null })).toBe("/picks");
  });

  it("appends query string with '?'", () => {
    expect(buildUrl("/picks", { sport: "nfl" })).toBe("/picks?sport=nfl");
  });

  it("appends with '&' if base already has '?'", () => {
    expect(buildUrl("/picks?page=1", { sport: "nfl" })).toBe(
      "/picks?page=1&sport=nfl"
    );
  });

  it("handles absolute URLs", () => {
    expect(buildUrl("https://example.com/picks", { q: "test" })).toBe(
      "https://example.com/picks?q=test"
    );
  });

  it("handles multiple params", () => {
    const result = buildUrl("/picks", { sport: "nfl", week: "3" });
    expect(result).toBe("/picks?sport=nfl&week=3");
  });

  it("handles array param values", () => {
    const result = buildUrl("/search", { tags: ["nfl", "nba"] });
    expect(result).toBe("/search?tags=nfl&tags=nba");
  });
});

// ---------------------------------------------------------------------------
// parsePathParams
// ---------------------------------------------------------------------------
describe("parsePathParams", () => {
  it("extracts single param", () => {
    expect(parsePathParams("/picks/:id", "/picks/42")).toEqual({ id: "42" });
  });

  it("extracts multiple params", () => {
    expect(parsePathParams("/picks/:sport/:id", "/picks/nfl/123")).toEqual({
      sport: "nfl",
      id: "123",
    });
  });

  it("returns null when segment count differs (fewer)", () => {
    expect(parsePathParams("/picks/:sport/:id", "/picks/nfl")).toBeNull();
  });

  it("returns null when segment count differs (more)", () => {
    expect(parsePathParams("/picks/:sport", "/picks/nfl/123")).toBeNull();
  });

  it("returns null when literal segment doesn't match", () => {
    expect(parsePathParams("/picks/:id", "/board/42")).toBeNull();
  });

  it("returns empty object for exact literal match with no params", () => {
    expect(parsePathParams("/picks", "/picks")).toEqual({});
  });

  it("handles root path match", () => {
    expect(parsePathParams("/", "/")).toEqual({});
  });

  it("returns null for root template vs non-root path", () => {
    expect(parsePathParams("/", "/picks")).toBeNull();
  });

  it("matches three-segment template", () => {
    expect(
      parsePathParams("/team/:league/:teamSlug", "/team/nfl/kansas-city-chiefs")
    ).toEqual({ league: "nfl", teamSlug: "kansas-city-chiefs" });
  });
});

// ---------------------------------------------------------------------------
// buildPath
// ---------------------------------------------------------------------------
describe("buildPath", () => {
  it("replaces a single placeholder", () => {
    expect(buildPath("/picks/:sport", { sport: "nfl" })).toBe("/picks/nfl");
  });

  it("replaces multiple placeholders", () => {
    expect(buildPath("/picks/:sport/:id", { sport: "nfl", id: 123 })).toBe(
      "/picks/nfl/123"
    );
  });

  it("throws when a placeholder is missing", () => {
    expect(() => buildPath("/picks/:sport/:id", { sport: "nfl" })).toThrow();
  });

  it("handles numeric values", () => {
    expect(buildPath("/page/:num", { num: 0 })).toBe("/page/0");
  });

  it("does not mutate template for unused params", () => {
    // extra param in object — should be fine, just ignores it
    expect(buildPath("/picks/:sport", { sport: "nba", extra: "x" })).toBe(
      "/picks/nba"
    );
  });
});

// ---------------------------------------------------------------------------
// getPathSegments
// ---------------------------------------------------------------------------
describe("getPathSegments", () => {
  it("splits '/a/b/c' into ['a','b','c']", () => {
    expect(getPathSegments("/a/b/c")).toEqual(["a", "b", "c"]);
  });

  it("returns [] for '/'", () => {
    expect(getPathSegments("/")).toEqual([]);
  });

  it("returns [] for empty string", () => {
    expect(getPathSegments("")).toEqual([]);
  });

  it("handles no leading slash", () => {
    expect(getPathSegments("a/b")).toEqual(["a", "b"]);
  });

  it("filters out empty segments from double slashes", () => {
    expect(getPathSegments("/a//b")).toEqual(["a", "b"]);
  });

  it("handles trailing slash", () => {
    expect(getPathSegments("/a/b/")).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// joinPaths
// ---------------------------------------------------------------------------
describe("joinPaths", () => {
  it("joins paths and deduplicates slashes", () => {
    expect(joinPaths("/a/", "/b/", "c")).toBe("/a/b/c");
  });

  it("preserves leading slash from first part", () => {
    expect(joinPaths("/a", "b", "c")).toBe("/a/b/c");
  });

  it("no leading slash when first part has none", () => {
    expect(joinPaths("a", "b", "c")).toBe("a/b/c");
  });

  it("handles single part with slash", () => {
    expect(joinPaths("/a")).toBe("/a");
  });

  it("handles empty parts gracefully", () => {
    expect(joinPaths("/a", "", "b")).toBe("/a/b");
  });

  it("returns empty string with no arguments", () => {
    expect(joinPaths()).toBe("");
  });

  it("handles multiple consecutive slashes in parts", () => {
    expect(joinPaths("/a//b", "//c")).toBe("/a/b/c");
  });
});

// ---------------------------------------------------------------------------
// isRelativePath
// ---------------------------------------------------------------------------
describe("isRelativePath", () => {
  it("returns false for '/path'", () => {
    expect(isRelativePath("/path")).toBe(false);
  });

  it("returns true for 'path' (no leading slash)", () => {
    expect(isRelativePath("path")).toBe(true);
  });

  it("returns false for 'http://' URL", () => {
    expect(isRelativePath("http://example.com")).toBe(false);
  });

  it("returns false for 'https://' URL", () => {
    expect(isRelativePath("https://example.com")).toBe(false);
  });

  it("returns true for relative with subdirectory", () => {
    expect(isRelativePath("picks/nfl/123")).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isRelativePath("")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isAbsoluteUrl
// ---------------------------------------------------------------------------
describe("isAbsoluteUrl", () => {
  it("returns true for 'http://' URL", () => {
    expect(isAbsoluteUrl("http://example.com")).toBe(true);
  });

  it("returns true for 'https://' URL", () => {
    expect(isAbsoluteUrl("https://example.com/path")).toBe(true);
  });

  it("returns false for relative path", () => {
    expect(isAbsoluteUrl("/path")).toBe(false);
  });

  it("returns false for plain relative path", () => {
    expect(isAbsoluteUrl("picks/nfl")).toBe(false);
  });

  it("returns false for ftp:// (not http/https)", () => {
    expect(isAbsoluteUrl("ftp://example.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAbsoluteUrl("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractOrigin
// ---------------------------------------------------------------------------
describe("extractOrigin", () => {
  it("extracts origin from https URL with path", () => {
    expect(extractOrigin("https://example.com/path")).toBe(
      "https://example.com"
    );
  });

  it("extracts origin from http URL", () => {
    expect(extractOrigin("http://example.com")).toBe("http://example.com");
  });

  it("includes port in origin", () => {
    expect(extractOrigin("https://example.com:8080/path")).toBe(
      "https://example.com:8080"
    );
  });

  it("returns null for relative path", () => {
    expect(extractOrigin("/path/to/page")).toBeNull();
  });

  it("extracts origin when URL has query string", () => {
    expect(extractOrigin("https://example.com/picks?sport=nfl")).toBe(
      "https://example.com"
    );
  });

  it("extracts origin when URL has hash", () => {
    expect(extractOrigin("https://example.com/picks#section")).toBe(
      "https://example.com"
    );
  });
});

// ---------------------------------------------------------------------------
// extractPathname
// ---------------------------------------------------------------------------
describe("extractPathname", () => {
  it("extracts pathname from absolute URL with query and hash", () => {
    expect(extractPathname("https://example.com/a/b?q=1#hash")).toBe("/a/b");
  });

  it("extracts pathname from absolute URL with no query/hash", () => {
    expect(extractPathname("https://example.com/picks")).toBe("/picks");
  });

  it("returns '/' for domain-only URL", () => {
    expect(extractPathname("https://example.com")).toBe("/");
  });

  it("strips query string from relative path", () => {
    expect(extractPathname("/picks/nfl?week=3")).toBe("/picks/nfl");
  });

  it("strips hash from relative path", () => {
    expect(extractPathname("/picks#section")).toBe("/picks");
  });

  it("handles relative path with both query and hash", () => {
    expect(extractPathname("picks/nfl?q=1#h")).toBe("picks/nfl");
  });
});

// ---------------------------------------------------------------------------
// addTrailingSlash / removeTrailingSlash
// ---------------------------------------------------------------------------
describe("addTrailingSlash", () => {
  it("adds trailing slash to path", () => {
    expect(addTrailingSlash("/picks")).toBe("/picks/");
  });

  it("does not double-add trailing slash", () => {
    expect(addTrailingSlash("/picks/")).toBe("/picks/");
  });

  it("returns '/' unchanged", () => {
    expect(addTrailingSlash("/")).toBe("/");
  });

  it("adds slash to non-rooted path", () => {
    expect(addTrailingSlash("picks")).toBe("picks/");
  });
});

describe("removeTrailingSlash", () => {
  it("removes trailing slash", () => {
    expect(removeTrailingSlash("/picks/")).toBe("/picks");
  });

  it("returns unchanged if no trailing slash", () => {
    expect(removeTrailingSlash("/picks")).toBe("/picks");
  });

  it("returns '/' unchanged", () => {
    expect(removeTrailingSlash("/")).toBe("/");
  });

  it("removes from non-rooted path", () => {
    expect(removeTrailingSlash("picks/")).toBe("picks");
  });
});

// ---------------------------------------------------------------------------
// replaceQueryParam
// ---------------------------------------------------------------------------
describe("replaceQueryParam", () => {
  it("adds a new param when none exist", () => {
    expect(replaceQueryParam("/picks", "sport", "nfl")).toBe("/picks?sport=nfl");
  });

  it("replaces an existing param", () => {
    expect(replaceQueryParam("/picks?sport=nba", "sport", "nfl")).toBe(
      "/picks?sport=nfl"
    );
  });

  it("adds a param preserving existing ones", () => {
    const result = replaceQueryParam("/picks?sport=nfl", "week", "3");
    expect(result).toContain("sport=nfl");
    expect(result).toContain("week=3");
  });

  it("removes a param when value is null", () => {
    expect(replaceQueryParam("/picks?sport=nfl&week=3", "sport", null)).toBe(
      "/picks?week=3"
    );
  });

  it("returns base unchanged when removing non-existent param", () => {
    expect(replaceQueryParam("/picks?sport=nfl", "missing", null)).toBe(
      "/picks?sport=nfl"
    );
  });

  it("works with absolute URLs", () => {
    const result = replaceQueryParam(
      "https://example.com/picks?sport=nfl",
      "sport",
      "nba"
    );
    expect(result).toBe("https://example.com/picks?sport=nba");
  });

  it("preserves hash fragments", () => {
    const result = replaceQueryParam("/picks?sport=nfl#section", "week", "3");
    expect(result).toContain("#section");
    expect(result).toContain("week=3");
  });
});

// ---------------------------------------------------------------------------
// getQueryParam
// ---------------------------------------------------------------------------
describe("getQueryParam", () => {
  it("returns param value when found", () => {
    expect(getQueryParam("/picks?sport=nfl&week=3", "sport")).toBe("nfl");
  });

  it("returns null when param not found", () => {
    expect(getQueryParam("/picks?sport=nfl", "week")).toBeNull();
  });

  it("returns null when no query string", () => {
    expect(getQueryParam("/picks", "sport")).toBeNull();
  });

  it("returns first value when param appears multiple times", () => {
    expect(getQueryParam("/search?tag=nfl&tag=nba", "tag")).toBe("nfl");
  });

  it("works with absolute URL", () => {
    expect(
      getQueryParam("https://example.com/picks?sport=nfl", "sport")
    ).toBe("nfl");
  });
});

// ---------------------------------------------------------------------------
// getAllQueryParams
// ---------------------------------------------------------------------------
describe("getAllQueryParams", () => {
  it("parses all params from a URL", () => {
    expect(getAllQueryParams("/picks?sport=nfl&week=3")).toEqual({
      sport: "nfl",
      week: "3",
    });
  });

  it("handles repeated keys", () => {
    expect(getAllQueryParams("/search?tag=nfl&tag=nba")).toEqual({
      tag: ["nfl", "nba"],
    });
  });

  it("returns empty object with no query string", () => {
    expect(getAllQueryParams("/picks")).toEqual({});
  });

  it("works with absolute URL", () => {
    expect(
      getAllQueryParams("https://example.com/picks?sport=nfl")
    ).toEqual({ sport: "nfl" });
  });

  it("strips hash before parsing", () => {
    expect(getAllQueryParams("/picks?sport=nfl#section")).toEqual({
      sport: "nfl",
    });
  });
});

// ---------------------------------------------------------------------------
// sportsRoutes
// ---------------------------------------------------------------------------
describe("sportsRoutes", () => {
  it("picks() returns '/picks'", () => {
    expect(sportsRoutes.picks()).toBe("/picks");
  });

  it("pick(id) returns '/picks/:id'", () => {
    expect(sportsRoutes.pick("abc-123")).toBe("/picks/abc-123");
  });

  it("board() returns '/board'", () => {
    expect(sportsRoutes.board()).toBe("/board");
  });

  it("game(gameId) returns '/game/:gameId'", () => {
    expect(sportsRoutes.game("g-001")).toBe("/game/g-001");
  });

  it("team(teamSlug) returns '/team/:teamSlug'", () => {
    expect(sportsRoutes.team("kansas-city-chiefs")).toBe(
      "/team/kansas-city-chiefs"
    );
  });

  it("sport(sport) returns '/:sport'", () => {
    expect(sportsRoutes.sport("nfl")).toBe("/nfl");
  });

  it("trending() returns '/trends'", () => {
    expect(sportsRoutes.trending()).toBe("/trends");
  });

  it("today() returns '/today'", () => {
    expect(sportsRoutes.today()).toBe("/today");
  });

  it("track() returns '/track'", () => {
    expect(sportsRoutes.track()).toBe("/track");
  });
});
