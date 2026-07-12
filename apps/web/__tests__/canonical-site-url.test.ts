import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Canonical-host consistency.
 *
 * There is ONE source of truth for the public base URL — apps/web/lib/seo/site-url.ts.
 * It resolves to NEXT_PUBLIC_APP_URL when set, else defaults to the WWW host
 * (https://www.galaxysportsedge.com) — never the apex. metadataBase, sitemap,
 * robots, canonical tags, JSON-LD, RSS, and bot links all route through it.
 *
 * These tests assert the default resolves to www, that it honors the env override,
 * and that the metadataBase / sitemap / robots surfaces emit the www host (not the
 * apex) by default.
 */

const WWW = "https://www.galaxysportsedge.com";
const APEX = "https://galaxysportsedge.com";
const appDir = resolve(__dirname, "..", "app");
const libDir = resolve(__dirname, "..", "lib");

// sitemap.ts pulls in the DB + journal loader; stub both so sitemap() runs
// deterministically and we observe only the base-URL it stamps onto every route.
vi.mock("@/lib/journal/load", () => ({
  loadPublicJournalEntries: async () => [],
}));
vi.mock("@sports/db", () => ({
  db: {
    game: {
      findMany: async () => {
        throw new Error("no db in unit test");
      },
    },
  },
}));

const ORIGINAL_APP_URL = process.env["NEXT_PUBLIC_APP_URL"];

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_APP_URL === undefined) delete process.env["NEXT_PUBLIC_APP_URL"];
  else process.env["NEXT_PUBLIC_APP_URL"] = ORIGINAL_APP_URL;
  vi.resetModules();
});

function setAppUrl(value: string | undefined): void {
  if (value === undefined) delete process.env["NEXT_PUBLIC_APP_URL"];
  else process.env["NEXT_PUBLIC_APP_URL"] = value;
  vi.resetModules();
}

describe("canonical site URL — single source of truth (lib/seo/site-url.ts)", () => {
  it("defaults to the WWW host (not the apex) when NEXT_PUBLIC_APP_URL is unset", async () => {
    setAppUrl(undefined);
    const { SITE_URL, CANONICAL_SITE_URL } = await import("@/lib/seo/site-url");
    expect(SITE_URL).toBe(WWW);
    expect(CANONICAL_SITE_URL).toBe(WWW);
    // Explicitly not the apex.
    expect(SITE_URL).not.toBe(APEX);
    expect(SITE_URL.startsWith("https://www.")).toBe(true);
  });

  it("honors NEXT_PUBLIC_APP_URL when set", async () => {
    setAppUrl("https://staging.example.com");
    const { SITE_URL } = await import("@/lib/seo/site-url");
    expect(SITE_URL).toBe("https://staging.example.com");
  });

  it("strips a trailing slash so `${SITE_URL}${path}` never doubles up", async () => {
    setAppUrl("https://www.galaxysportsedge.com/");
    const { SITE_URL, absoluteUrl } = await import("@/lib/seo/site-url");
    expect(SITE_URL).toBe(WWW);
    expect(absoluteUrl("/picks")).toBe(`${WWW}/picks`);
    expect(absoluteUrl("picks")).toBe(`${WWW}/picks`);
  });

  it("re-exports the same SITE_URL through lib/seo/sports-jsonld", async () => {
    setAppUrl(undefined);
    const jsonld = await import("@/lib/seo/sports-jsonld");
    expect(jsonld.SITE_URL).toBe(WWW);
    // The programmatic-SEO canonical is built on the www host.
    const canonical = jsonld.matchupCanonical({
      sport: "nba",
      homeTeam: "Boston Celtics",
      awayTeam: "Los Angeles Lakers",
      startTimeIso: "2026-01-15T00:30:00Z",
    });
    expect(canonical.startsWith(`${WWW}/preview/nba/`)).toBe(true);
  });
});

describe("robots.txt emits the canonical www host by default", () => {
  it("points host + sitemap at the www host (not the apex) when env is unset", async () => {
    setAppUrl(undefined);
    const robots = (await import("@/app/robots")).default;
    const out = robots();
    expect(out.host).toBe(WWW);
    expect(out.sitemap).toBe(`${WWW}/sitemap.xml`);
    expect(out.host).not.toBe(APEX);
  });

  it("honors NEXT_PUBLIC_APP_URL when set", async () => {
    setAppUrl("https://staging.example.com");
    const robots = (await import("@/app/robots")).default;
    const out = robots();
    expect(out.host).toBe("https://staging.example.com");
  });
});

describe("sitemap emits the canonical www host by default", () => {
  it("stamps every route with the www host (not the apex) when env is unset", async () => {
    setAppUrl(undefined);
    const sitemap = (await import("@/app/sitemap")).default;
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith(`${WWW}/`)).toBe(true);
      expect(entry.url.startsWith(`${APEX}/`)).toBe(false);
    }
    // The homepage route resolves to the www host (path "/").
    expect(entries.some((e) => e.url === `${WWW}/`)).toBe(true);
  });
});

describe("metadataBase / SEO surfaces route through the single canonical source", () => {
  it("layout.tsx sets metadataBase from the shared SITE_URL and hardcodes no apex", () => {
    const src = readFileSync(resolve(appDir, "layout.tsx"), "utf8");
    expect(src).toMatch(/from\s+["']@\/lib\/seo\/site-url["']/);
    expect(src).toMatch(/metadataBase:\s*new URL\(SITE_URL\)/);
    expect(src).not.toContain(`"${APEX}"`);
  });

  it("no SEO surface hardcodes the apex as a default", () => {
    const files = [
      resolve(appDir, "sitemap.ts"),
      resolve(appDir, "robots.ts"),
      resolve(appDir, "journal", "rss.xml", "route.ts"),
      resolve(libDir, "seo", "sports-jsonld.ts"),
      resolve(libDir, "bot-outbox", "load.ts"),
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} must not default to the apex`).not.toContain(
        `?? "${APEX}"`,
      );
      expect(src, `${file} must route through the site-url module`).toMatch(
        /site-url["']/,
      );
    }
  });
});
