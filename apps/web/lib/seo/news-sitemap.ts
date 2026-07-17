/**
 * Google News sitemap builder (pure).
 *
 * Emits a `<urlset>` in the Google News namespace for journal entries
 * published within the last 48 hours — Google News only accepts articles that
 * recent, so older entries are excluded by design (they stay in the main
 * sitemap.xml). Degrades to a valid empty `<urlset>` when nothing qualifies,
 * never an error.
 *
 * Pure + injectable clock/base URL so it is unit-testable without a DB or
 * server. The route (app/news-sitemap.xml/route.ts) supplies the loaded
 * entries, `now`, and the canonical base URL.
 */

/** The 48-hour inclusion window Google News enforces, in milliseconds. */
export const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface NewsSitemapEntry {
  readonly slug: string;
  readonly title: string;
  /** ISO-8601 publish timestamp. */
  readonly publishedAt: string;
}

export interface BuildNewsSitemapOptions {
  readonly entries: readonly NewsSitemapEntry[];
  readonly now: Date;
  readonly siteUrl: string;
  readonly publicationName: string;
  /** BCP-47 language code. Defaults to "en". */
  readonly language?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the Google News sitemap XML. Only entries with a parseable
 * `publishedAt` within `NEWS_WINDOW_MS` of `now` are included.
 */
export function buildGoogleNewsSitemap(opts: BuildNewsSitemapOptions): string {
  const base = opts.siteUrl.replace(/\/+$/, "");
  const language = opts.language ?? "en";
  const cutoff = opts.now.getTime() - NEWS_WINDOW_MS;

  const urls = opts.entries
    .filter((entry) => {
      const published = new Date(entry.publishedAt).getTime();
      // Exclude unparseable dates and anything outside the 48h window. Also
      // guard against future-dated entries (clock skew) — never advertise a
      // publish time ahead of now.
      return Number.isFinite(published) && published >= cutoff && published <= opts.now.getTime();
    })
    .map((entry) => {
      const loc = `${base}/journal/${entry.slug}`;
      const publicationDate = new Date(entry.publishedAt).toISOString();
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(opts.publicationName)}</news:name>
        <news:language>${escapeXml(language)}</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${escapeXml(entry.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
}
