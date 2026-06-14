import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * SEO metadata contract for the highest-value public routes.
 *
 * Each must export Next metadata (static `metadata` or `generateMetadata`) that
 * declares a `title` and a self-`canonical`. This is the durable guard the brief
 * asked for (WAVE-3: "112/113 public pages have no page-level test") for the top
 * surfaces — it catches the regression where a route silently loses its canonical
 * (which has happened: /stats/* shipped without metadata once). Source-level only.
 */

const webRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

const TOP_ROUTES = [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "app/board/page.tsx",
  "app/picks/page.tsx",
  "app/performance/page.tsx",
  "app/room/[gameId]/page.tsx",
  "app/intelligence/page.tsx",
  "app/academy/page.tsx",
  "app/methodology/page.tsx",
  "app/vault/page.tsx",
] as const;

describe("top public routes — SEO metadata contract", () => {
  for (const route of TOP_ROUTES) {
    it(`${route} exports metadata with a title and a canonical`, () => {
      const src = read(route);
      expect(
        src,
        `${route} must export 'metadata' or 'generateMetadata'`,
      ).toMatch(
        /export\s+(?:const\s+metadata|(?:async\s+)?function\s+generateMetadata)/,
      );
      expect(src, `${route} must set a title`).toMatch(/title:/);
      expect(src, `${route} must set alternates.canonical`).toMatch(
        /canonical:/,
      );
    });
  }
});
