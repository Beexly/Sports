import { NextResponse } from "next/server";
import { loadPublicJournalEntries } from "@/lib/journal/load";
import { buildGoogleNewsSitemap, type NewsSitemapEntry } from "@/lib/seo/news-sitemap";
import { SITE_URL } from "@/lib/seo/site-url";
import { BRAND_NAME } from "@/lib/brand";
import { listIssues } from "@/lib/newsletter/issues";
import { listEpisodes } from "@/lib/podcast/episodes";

/**
 * GET /news-sitemap.xml — Google News sitemap for recent journal, newsletter,
 * and podcast items (48h window). Empty-but-valid when nothing qualifies.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const entries: NewsSitemapEntry[] = [];

  try {
    const journal = await loadPublicJournalEntries();
    for (const e of journal) {
      entries.push({
        slug: e.slug,
        title: e.title,
        publishedAt: e.publishedAt,
        pathPrefix: "/journal",
      });
    }
  } catch {
    /* DB unavailable — continue with static catalogs */
  }

  for (const issue of listIssues()) {
    entries.push({
      slug: issue.slug,
      title: issue.title,
      publishedAt: issue.publishedAt,
      pathPrefix: "/newsletter",
    });
  }

  for (const ep of listEpisodes()) {
    entries.push({
      slug: ep.slug,
      title: ep.title,
      publishedAt: ep.publishedAt,
      pathPrefix: "/podcast",
    });
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
