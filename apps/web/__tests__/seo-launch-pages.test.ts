import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readWeb(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const PAGES = [
  { path: "/kill-ledger", file: "app/kill-ledger/page.tsx" },
  { path: "/bookgrade", file: "app/bookgrade/page.tsx" },
  { path: "/pledge", file: "app/pledge/page.tsx" },
  { path: "/fable", file: "app/fable/page.tsx" },
] as const;

describe("H-F6 SEO pass — launch proof pages", () => {
  const sitemap = readWeb("app/sitemap.ts");

  for (const page of PAGES) {
    it(`${page.path} has canonical, Open Graph, twitter, JSON-LD, and a sitemap entry`, () => {
      const src = readWeb(page.file);
      expect(src).toContain(`canonical: "${page.path}"`);
      expect(src).toContain("openGraph:");
      expect(src).toContain("twitter:");
      expect(src).toContain("application/ld+json");
      expect(src).toContain("jsonLdScript");
      expect(sitemap).toContain(`path: "${page.path}"`);
    });
  }
});
