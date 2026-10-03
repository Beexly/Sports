import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const loader = fs.readFileSync(path.join(repoRoot, "apps/web/lib/journal/load.ts"), "utf8");
const indexPage = fs.readFileSync(path.join(repoRoot, "apps/web/app/journal/page.tsx"), "utf8");
const detailPage = fs.readFileSync(path.join(repoRoot, "apps/web/app/journal/[slug]/page.tsx"), "utf8");
const rssRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/journal/rss.xml/route.ts"), "utf8");
const sitemap = fs.readFileSync(path.join(repoRoot, "apps/web/app/sitemap.ts"), "utf8");

describe("public Model Journal routes", () => {
  it("loads only published entries for the public index", () => {
    expect(loader).toContain("loadPublicJournalEntries");
    expect(loader).toMatch(/where:\s*\{\s*status:\s*"PUBLISHED"\s*\}/);
    expect(loader).toContain("take: 20");
  });

  it("loads public detail pages by slug and published status", () => {
    expect(loader).toContain("loadPublicJournalEntry");
    expect(loader).toMatch(/where:\s*\{\s*slug,\s*status:\s*"PUBLISHED"\s*\}/);
    expect(detailPage).toContain("notFound()");
  });

  it("renders the index with cold open, read time, and published-entry links", () => {
    expect(indexPage).toContain("Model Journal");
    expect(indexPage).toContain("Weekly notes on what the model learned.");
    expect(indexPage).toContain("entry.coldOpen");
    expect(indexPage).toContain("entry.readTimeMinutes");
    expect(indexPage).toContain("`/journal/${entry.slug}`");
  });

  it("renders detail pages with references and RSS link", () => {
    expect(detailPage).toContain("MarkdownBody");
    expect(detailPage).toContain("ReferenceLinks");
    expect(detailPage).toContain("/journal/rss.xml");
    expect(detailPage).toContain("Weekly digest");
  });

  it("ships an RSS route for published Journal entries", () => {
    expect(rssRoute).toContain("application/rss+xml");
    expect(rssRoute).toContain("loadPublicJournalEntries");
    expect(rssRoute).toContain("<rss version=\"2.0\">");
    expect(rssRoute).toContain("escapeXml");
  });

  it("adds the Journal index and published entries to the public sitemap", () => {
    expect(sitemap).toContain('path: "/journal"');
    expect(sitemap).toContain("loadPublicJournalEntries");
    expect(sitemap).toContain("journalEntries.map");
    expect(sitemap).toContain("`${baseUrl}/journal/${entry.slug}`");
  });
});
