import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readWeb(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

function existsWeb(rel: string): boolean {
  return existsSync(resolve(__dirname, "..", rel));
}

// /calibration and /verify are the two most-shareable public trust pages
// (the credibility play the founder leans on) — this pins that a share of
// either link renders its own Open Graph card and carries machine-readable
// JSON-LD, instead of silently falling back to the generic homepage card.
const TRUST_PAGES = [
  { path: "/calibration", file: "app/calibration/page.tsx", ogImage: "app/calibration/opengraph-image.tsx" },
  { path: "/verify", file: "app/verify/page.tsx", ogImage: "app/verify/opengraph-image.tsx" },
] as const;

describe("public trust pages have a distinct share surface", () => {
  for (const page of TRUST_PAGES) {
    it(`${page.path} has canonical, Open Graph, JSON-LD, and its own opengraph-image`, () => {
      const src = readWeb(page.file);
      expect(src).toContain(`canonical: "${page.path}"`);
      expect(src).toContain("openGraph:");
      expect(src).toContain("application/ld+json");
      expect(src).toContain("jsonLdScript");
      expect(existsWeb(page.ogImage), `${page.ogImage} should exist`).toBe(true);
    });
  }

  for (const page of TRUST_PAGES) {
    it(`${page.ogImage} declares standard OG image export contract`, () => {
      const src = readWeb(page.ogImage);
      expect(src).toContain("export const size");
      expect(src).toContain("export const contentType");
      expect(src).toContain("ImageResponse");
    });
  }
});
