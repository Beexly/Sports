import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Launch-blocking SEO guards — blog canonical/OG/JSON-LD, blog in the sitemap,
 * and robots↔sitemap agreement on `/stats`.
 *
 * 1. `/blog/[slug]` used to return only `{ title, description }`: no
 *    self-referencing canonical (duplicate-content risk against any tracked or
 *    syndicated variant) and no per-post OG card. Pinned here: the canonical is
 *    emitted and resolves onto the single canonical host (`SITE_URL`).
 *
 * 2. `/blog` and `/blog/<slug>` were absent from sitemap.xml entirely — a whole
 *    content surface never submitted. Pinned here: both appear.
 *
 * 3. robots.txt disallowed `/stats` unconditionally while the sitemap ADDS five
 *    `/stats*` URLs when `STATS_PUBLIC=true`. That combination makes Search
 *    Console report "Submitted URL blocked by robots.txt" and indexes none of
 *    them. The guard below asserts the AGREEMENT directly — no sitemap URL may
 *    be blocked by robots — in BOTH flag states, so the two files cannot drift
 *    apart again.
 *
 * These are behavioural assertions, not type-level ones: apps/web/tsconfig.json
 * excludes test files from the typecheck, so a type-level assertion in this file
 * would prove nothing.
 */

const mocks = vi.hoisted(() => ({
  blogFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  blogFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@/lib/journal/load", () => ({
  loadPublicJournalEntries: async () => [],
}));

vi.mock("@sports/db", () => ({
  db: {
    blogPost: { findUnique: mocks.blogFindUnique, findMany: mocks.blogFindMany },
    game: { findMany: mocks.gameFindMany },
  },
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ canPublishContent: true }),
}));

// The blog page imports NextAuth at module scope; the metadata path never calls
// it. Stub it so importing the route stays cheap and deterministic.
vi.mock("@/lib/auth", () => ({ auth: async () => null }));

const ORIGINAL_STATS_PUBLIC = process.env["STATS_PUBLIC"];

beforeEach(() => {
  mocks.blogFindUnique.mockReset().mockResolvedValue({
    title: "Line movement on the Ravens number",
    seoTitle: null,
    seoDescription: null,
    excerpt: "How the market moved into kickoff, and what the model logged.",
    publishedAt: new Date("2026-08-01T15:00:00.000Z"),
  });
  mocks.blogFindMany.mockReset().mockResolvedValue([
    {
      slug: "line-movement-ravens",
      publishedAt: new Date("2026-08-01T15:00:00.000Z"),
      updatedAt: new Date("2026-08-02T15:00:00.000Z"),
    },
  ]);
  mocks.gameFindMany.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  if (ORIGINAL_STATS_PUBLIC === undefined) delete process.env["STATS_PUBLIC"];
  else process.env["STATS_PUBLIC"] = ORIGINAL_STATS_PUBLIC;
  vi.resetModules();
});

function setStatsPublic(value: string | undefined): void {
  if (value === undefined) delete process.env["STATS_PUBLIC"];
  else process.env["STATS_PUBLIC"] = value;
  vi.resetModules();
}

/** robots.txt prefix semantics: `Disallow: /stats` blocks `/stats/compare`. */
function robotsBlocks(disallow: readonly string[], path: string): boolean {
  return disallow.some((rule) => path.startsWith(rule));
}

type RobotsLike = { rules?: unknown };

/** Flatten robots() output (rules may be one object or an array) to its disallow paths. */
function disallowList(out: RobotsLike): string[] {
  const rules = Array.isArray(out.rules) ? out.rules : [out.rules];
  return rules.flatMap((rule) => {
    const d = (rule as { disallow?: string | string[] } | undefined)?.disallow;
    if (d === undefined) return [];
    return Array.isArray(d) ? d : [d];
  });
}

describe("FIX 1 — /blog/[slug] emits a self-referencing canonical + OG card", () => {
  it("canonical is the post's own path and resolves onto the canonical SITE_URL host", async () => {
    const { SITE_URL } = await import("@/lib/seo/site-url");
    const { generateMetadata } = await import("@/app/blog/[slug]/page");

    const meta = await generateMetadata({ params: { slug: "line-movement-ravens" } });

    expect(meta.alternates?.canonical).toBe("/blog/line-movement-ravens");
    // Next resolves a relative canonical against metadataBase (= SITE_URL), so
    // what a crawler actually reads is the absolute canonical-host URL.
    expect(new URL(String(meta.alternates?.canonical), SITE_URL).toString()).toBe(
      `${SITE_URL}/blog/line-movement-ravens`,
    );
    // ...and never the apex.
    expect(SITE_URL.startsWith("https://www.")).toBe(true);
  });

  it("emits a per-post OpenGraph article card instead of inheriting the homepage's", async () => {
    const { generateMetadata } = await import("@/app/blog/[slug]/page");
    const meta = await generateMetadata({ params: { slug: "line-movement-ravens" } });

    const og = meta.openGraph as
      | { type?: string; title?: string; url?: string; publishedTime?: string }
      | undefined;
    expect(og?.type).toBe("article");
    expect(og?.title).toBe("Line movement on the Ravens number");
    expect(og?.url).toBe("/blog/line-movement-ravens");
    expect(og?.publishedTime).toBe("2026-08-01T15:00:00.000Z");
  });

  it("claims no publishedTime when the record carries no publish date", async () => {
    mocks.blogFindUnique.mockResolvedValue({
      title: "Undated desk note",
      seoTitle: null,
      seoDescription: null,
      excerpt: "No publish timestamp on this record.",
      publishedAt: null,
    });
    const { generateMetadata } = await import("@/app/blog/[slug]/page");
    const meta = await generateMetadata({ params: { slug: "undated" } });

    expect(meta.alternates?.canonical).toBe("/blog/undated");
    expect((meta.openGraph as { publishedTime?: string } | undefined)?.publishedTime).toBeUndefined();
  });
});

describe("FIX 2 — sitemap.xml carries the /blog surface", () => {
  it("includes the /blog index and every published post", async () => {
    const { SITE_URL } = await import("@/lib/seo/site-url");
    const sitemap = (await import("@/app/sitemap")).default;
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(`${SITE_URL}/blog`);
    expect(urls).toContain(`${SITE_URL}/blog/line-movement-ravens`);
  });

  it("queries only PUBLISHED posts", async () => {
    const sitemap = (await import("@/app/sitemap")).default;
    await sitemap();

    expect(mocks.blogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PUBLISHED" } }),
    );
  });

  it("survives a DB outage without dropping the rest of the sitemap", async () => {
    mocks.blogFindMany.mockRejectedValue(new Error("db down"));
    const { SITE_URL } = await import("@/lib/seo/site-url");
    const sitemap = (await import("@/app/sitemap")).default;
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    // Static /blog still submitted; per-post URLs simply absent.
    expect(urls).toContain(`${SITE_URL}/blog`);
    expect(urls).toContain(`${SITE_URL}/`);
  });
});

describe("FIX 3 — robots.txt and sitemap.xml AGREE about /stats in both flag states", () => {
  for (const [label, flag] of [
    ["STATS_PUBLIC unset (stats dark)", undefined],
    ["STATS_PUBLIC=true (stats public)", "true"],
  ] as ReadonlyArray<readonly [string, string | undefined]>) {
    it(`submits no sitemap URL that robots.txt blocks — ${label}`, async () => {
      setStatsPublic(flag);
      const { SITE_URL } = await import("@/lib/seo/site-url");
      const robots = (await import("@/app/robots")).default;
      const sitemap = (await import("@/app/sitemap")).default;

      const disallow = disallowList(robots());
      const entries = await sitemap();

      const blocked = entries
        .map((e) => e.url.slice(SITE_URL.length))
        .filter((path) => robotsBlocks(disallow, path));

      // The agreement itself — asserted directly, not as two separate facts
      // that could drift apart.
      expect(blocked).toEqual([]);
    });
  }

  it("dark state: robots blocks /stats AND the sitemap submits none of it", async () => {
    setStatsPublic(undefined);
    const { SITE_URL } = await import("@/lib/seo/site-url");
    const robots = (await import("@/app/robots")).default;
    const sitemap = (await import("@/app/sitemap")).default;

    const disallow = disallowList(robots());
    expect(disallow).toContain("/stats");
    expect(disallow).toContain("/stats/");

    const entries = await sitemap();
    expect(entries.filter((e) => e.url.startsWith(`${SITE_URL}/stats`))).toEqual([]);
  });

  it("public state: the sitemap submits the five /stats URLs AND robots stops blocking them", async () => {
    setStatsPublic("true");
    const { SITE_URL } = await import("@/lib/seo/site-url");
    const robots = (await import("@/app/robots")).default;
    const sitemap = (await import("@/app/sitemap")).default;

    const disallow = disallowList(robots());
    expect(disallow).not.toContain("/stats");
    expect(disallow).not.toContain("/stats/");

    const entries = await sitemap();
    const statsPaths = entries
      .map((e) => e.url.slice(SITE_URL.length))
      .filter((path) => path.startsWith("/stats"));
    expect(statsPaths.sort()).toEqual([
      "/stats",
      "/stats/ask",
      "/stats/compare",
      "/stats/expert-board",
      "/stats/proof",
    ]);
    // Every one of them crawlable — the exact pairing Search Console flagged.
    for (const path of statsPaths) {
      expect(robotsBlocks(disallow, path)).toBe(false);
    }
  });

  it("still blocks the operator surfaces in both flag states", async () => {
    for (const flag of [undefined, "true"] as const) {
      setStatsPublic(flag);
      const robots = (await import("@/app/robots")).default;
      const disallow = disallowList(robots());
      expect(disallow).toContain("/admin");
      expect(disallow).toContain("/api/");
      expect(disallow).toContain("/dashboard");
    }
  });
});
