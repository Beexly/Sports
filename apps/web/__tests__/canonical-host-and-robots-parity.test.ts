import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * C-182 / C-185. Two invariants that had drifted, both of them stated in
 * CLAUDE.md and neither of them enforced anywhere.
 *
 * 1. ONE CANONICAL HOST. Every absolute URL derives from lib/seo/site-url.ts,
 *    which resolves to the **www** host, never the apex. The studio content
 *    templates hardcoded `https://galaxysportsedge.com` - the apex - and that
 *    value is interpolated into generated X threads, TikTok scripts,
 *    newsletter blocks and sponsor copy. A published draft carried the
 *    non-canonical host out into search and social, where it is expensive to
 *    take back. The hardcode existed in TWO places that do not share code, so
 *    fixing one did not fix the other.
 *
 * 2. robots.txt AND THE SITEMAP MUST NOT DISAGREE. sitemap.ts adds the /stats
 *    family when isStatsPublic() is true; robots.ts disallowed /stats
 *    unconditionally. Submitting a URL you also forbid produces "Indexed,
 *    though blocked by robots.txt" - neither crawled nor cleanly excluded.
 *    Latent while the gate is off, which is exactly when it is cheap to fix.
 *
 * Source-level assertions, because both defects are the presence or absence of
 * a literal in a file that a runtime test would only reach on one branch.
 */

const APEX = "https://galaxysportsedge.com";

function read(...parts: string[]): string {
  return readFileSync(resolve(__dirname, "..", ...parts), "utf8");
}

describe("one canonical host", () => {
  const files: readonly (readonly string[])[] = [
    ["lib", "studio", "load.ts"],
    ["app", "api", "cockpit", "studio", "generate", "route.ts"],
  ];

  it("no content-generating surface hardcodes the apex", () => {
    for (const parts of files) {
      const source = read(...parts);
      // The apex with no `www.` in front of it. Written as a plain search so
      // the assertion says exactly what it forbids.
      const offending = source
        .split("\n")
        .filter((line) => line.includes(APEX) && !line.trimStart().startsWith("//"));
      expect(offending, parts.join("/")).toEqual([]);
    }
  });

  it("both of them resolve the host from site-url instead", () => {
    // A negative assertion alone passes on a file that dropped the field
    // entirely. This pins that the value is still supplied, from the right
    // place.
    for (const parts of files) {
      const source = read(...parts);
      expect(source, parts.join("/")).toContain("@/lib/seo/site-url");
      expect(source, parts.join("/")).toContain("publicUrl: SITE_URL");
    }
  });
});

describe("robots and the sitemap agree about /stats", () => {
  const robots = read("app", "robots.ts");
  const sitemap = read("app", "sitemap.ts");

  it("both derive the decision from the same gate", () => {
    expect(sitemap).toContain("isStatsPublic()");
    expect(robots).toContain("isStatsPublic()");
  });

  it("robots no longer disallows /stats unconditionally", () => {
    // The old shape was a bare `"/stats",` entry in the disallow array. It has
    // to be inside the gate expression now, not standing on its own.
    const unconditional = /^\s*"\/stats\/?",\s*$/m.test(robots);
    expect(unconditional).toBe(false);
  });
});
