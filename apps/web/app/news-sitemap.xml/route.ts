import { NextResponse } from "next/server";
import { loadPublicJournalEntries } from "@/lib/journal/load";
import { buildGoogleNewsSitemap } from "@/lib/seo/news-sitemap";
import { SITE_URL } from "@/lib/seo/site-url";
import { BRAND_NAME } from "@/lib/brand";

/**
 * GET /news-sitemap.xml — Google News sitemap for recently-published journal
 * entries (last 48h). Separate from the main sitemap.xml (which lists all
 * evergreen URLs) because the News namespace requires the tight recency window.
 * Submit this URL in Google News Publisher Center / Search Console.
 *
 * Degrades to a valid empty <urlset> when nothing is within the window or the
 * DB is unavailable — never a 500.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  let entries: readonly { slug: string; title: string; publishedAt: string }[] = [];
  try {
    entries = await loadPublicJournalEntries();
  } catch {
    // DB unavailable — serve an empty-but-valid news sitemap rather than 500.
    entries = [];
  }

  const xml = buildGoogleNewsSitemap({
    entries,
    now: new Date(),
    siteUrl: SITE_URL,
    publicationName: BRAND_NAME,
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
