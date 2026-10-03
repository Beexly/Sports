import { NextResponse } from "next/server";
import { loadPublicJournalEntries } from "@/lib/journal/load";
import { SITE_URL } from "@/lib/seo/site-url";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<NextResponse> {
  const entries = await loadPublicJournalEntries();
  const latestPublishedAt = entries[0]?.publishedAt ?? new Date().toISOString();

  const items = entries
    .map((entry) => {
      const url = `${SITE_URL}/journal/${entry.slug}`;
      return `<item>
  <title>${escapeXml(entry.title)}</title>
  <link>${escapeXml(url)}</link>
  <guid>${escapeXml(url)}</guid>
  <pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate>
  <description>${escapeXml(entry.coldOpen)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Galaxy Sports Edge Model Journal</title>
  <link>${escapeXml(`${SITE_URL}/journal`)}</link>
  <description>Weekly research notes on settled picks, gated slates, factor behavior, and model-version changes.</description>
  <lastBuildDate>${new Date(latestPublishedAt).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
