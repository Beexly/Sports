/**
 * Google News sitemap builder — /news-sitemap.xml.
 *
 * Pins the recency window (Google News accepts only articles < 48h old), the
 * namespace, XML escaping, and graceful empty output.
 */

import { describe, expect, it } from "vitest";
import { buildGoogleNewsSitemap, type NewsSitemapEntry } from "@/lib/seo/news-sitemap";

const NOW = new Date("2026-07-17T12:00:00.000Z");
const BASE = "https://www.galaxysportsedge.com";
const PUB = "Galaxy Sports Edge";

function build(entries: NewsSitemapEntry[]): string {
  return buildGoogleNewsSitemap({ entries, now: NOW, siteUrl: BASE, publicationName: PUB });
}

describe("buildGoogleNewsSitemap", () => {
  it("emits the sitemap + news namespaces", () => {
    const xml = build([]);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
  });

  it("includes an entry published within the last 48h with an absolute loc + ISO publication_date", () => {
    const xml = build([{ slug: "week-3-notes", title: "Week 3 Notes", publishedAt: "2026-07-17T06:00:00.000Z" }]);
    expect(xml).toContain(`<loc>${BASE}/journal/week-3-notes</loc>`);
    expect(xml).toContain("<news:publication_date>2026-07-17T06:00:00.000Z</news:publication_date>");
    expect(xml).toContain("<news:name>Galaxy Sports Edge</news:name>");
    expect(xml).toContain("<news:title>Week 3 Notes</news:title>");
  });

  it("excludes entries older than 48h (they stay in the main sitemap)", () => {
    const xml = build([{ slug: "stale-entry", title: "Old", publishedAt: "2026-07-14T12:00:00.000Z" }]);
    expect(xml).not.toContain("stale-entry");
  });

  it("excludes future-dated entries (clock-skew guard)", () => {
    const xml = build([{ slug: "future-entry", title: "Future", publishedAt: "2026-07-18T00:00:00.000Z" }]);
    expect(xml).not.toContain("future-entry");
  });

  it("excludes entries with an unparseable date", () => {
    const xml = build([{ slug: "bad-date", title: "Bad", publishedAt: "not-a-date" }]);
    expect(xml).not.toContain("bad-date");
  });

  it("escapes XML-special characters in titles", () => {
    const xml = build([{ slug: "amp", title: 'A & B <c> "d"', publishedAt: "2026-07-17T06:00:00.000Z" }]);
    expect(xml).toContain("A &amp; B &lt;c&gt; &quot;d&quot;");
    expect(xml).not.toContain("<c>");
  });

  it("keeps only in-window entries when mixed", () => {
    const xml = build([
      { slug: "fresh", title: "Fresh", publishedAt: "2026-07-17T00:00:00.000Z" },
      { slug: "old", title: "Old", publishedAt: "2026-07-01T00:00:00.000Z" },
    ]);
    expect(xml).toContain("fresh");
    expect(xml).not.toContain(">old<");
    expect(xml).not.toContain("/journal/old<");
  });

  it("produces a valid empty urlset when nothing qualifies", () => {
    const xml = build([{ slug: "old", title: "Old", publishedAt: "2020-01-01T00:00:00.000Z" }]);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });

  it("supports newsletter/podcast pathPrefix", () => {
    const xml = build([
      {
        slug: "003-launch-autonomy",
        title: "Launch",
        publishedAt: "2026-07-17T06:00:00.000Z",
        pathPrefix: "/newsletter",
      },
    ]);
    expect(xml).toContain(`${BASE}/newsletter/003-launch-autonomy`);
    expect(xml).not.toContain("/journal/003-launch-autonomy");
  });
});
