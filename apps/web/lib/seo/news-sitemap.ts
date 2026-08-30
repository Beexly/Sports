/**
 * Google News sitemap builder (pure).
 *
 * Emits a `<urlset>` in the Google News namespace for articles published within
 * the last 48 hours. Supports journal, newsletter, and podcast paths via
 * `pathPrefix` so substance is not journal-only.
 */

/** The 48-hour inclusion window Google News enforces, in milliseconds. */
export const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface NewsSitemapEntry {
  readonly slug: string;
  readonly title: string;
  /** ISO-8601 publish timestamp. */
  readonly publishedAt: string;
  /**
   * URL path prefix without trailing slash. Default `/journal`.
   * Examples: `/newsletter`, `/podcast`.
   */
  readonly pathPrefix?: string;
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
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;")
    .replace(/'/g, "&" + "apos;");
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
      return Number.isFinite(published) && published >= cutoff && published <= opts.now.getTime();
    })
    .map((entry) => {
      const prefix = (entry.pathPrefix ?? "/journal").replace(/\/+$/, "") || "/journal";
      const loc = `${base}${prefix}/${entry.slug}`;
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
