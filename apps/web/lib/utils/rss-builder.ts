/**
 * RSS 2.0 feed builder — pure, zero dependencies.
 *
 * Builds valid RSS 2.0 XML strings for sports picks distribution.
 * No DOM, no external XML libraries.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RssItem {
  readonly title: string;
  readonly link: string;
  readonly description: string;
  readonly pubDate?: Date | string;
  readonly guid?: string;
  readonly author?: string;
  readonly category?: string;
  readonly enclosure?: { url: string; type: string; length: number };
}

export interface RssFeed {
  readonly title: string;
  readonly link: string;
  readonly description: string;
  readonly language?: string;
  readonly ttl?: number; // time-to-live in minutes
  readonly lastBuildDate?: Date | string;
  readonly items: readonly RssItem[];
}

// ---------------------------------------------------------------------------
// XML escaping
// ---------------------------------------------------------------------------

/**
 * Escape XML special characters.
 * & → &amp;  < → &lt;  > → &gt;  " → &quot;  ' → &apos;
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Format a date as RFC 2822 (e.g. "Mon, 01 Jan 2024 00:00:00 +0000").
 */
export function formatRssDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const day = DAYS[d.getUTCDay()];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${day}, ${dd} ${month} ${year} ${hh}:${mm}:${ss} +0000`;
}

// ---------------------------------------------------------------------------
// Item builder
// ---------------------------------------------------------------------------

/**
 * Build one `<item>` XML block, using CDATA for title and description.
 */
export function buildRssItem(item: RssItem): string {
  const lines: string[] = ["  <item>"];

  lines.push(`    <title><![CDATA[${item.title}]]></title>`);
  lines.push(`    <link>${escapeXml(item.link)}</link>`);
  lines.push(
    `    <description><![CDATA[${item.description}]]></description>`
  );

  const guidValue = item.guid ?? item.link;
  lines.push(`    <guid isPermaLink="false">${escapeXml(guidValue)}</guid>`);

  if (item.pubDate !== undefined) {
    lines.push(`    <pubDate>${formatRssDate(item.pubDate)}</pubDate>`);
  }

  if (item.author !== undefined) {
    lines.push(`    <author>${escapeXml(item.author)}</author>`);
  }

  if (item.category !== undefined) {
    lines.push(`    <category>${escapeXml(item.category)}</category>`);
  }

  if (item.enclosure !== undefined) {
    const { url, type, length } = item.enclosure;
    lines.push(
      `    <enclosure url="${escapeXml(url)}" type="${escapeXml(type)}" length="${length}"/>`
    );
  }

  lines.push("  </item>");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Feed builder
// ---------------------------------------------------------------------------

/**
 * Build a complete RSS 2.0 XML string from an RssFeed.
 * Includes XML declaration, <rss>, <channel>, and all items.
 */
export function buildRssFeed(feed: RssFeed): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<rss version="2.0">');
  lines.push("  <channel>");

  lines.push(`    <title><![CDATA[${feed.title}]]></title>`);
  lines.push(`    <link>${escapeXml(feed.link)}</link>`);
  lines.push(
    `    <description><![CDATA[${feed.description}]]></description>`
  );

  if (feed.language !== undefined) {
    lines.push(`    <language>${escapeXml(feed.language)}</language>`);
  }

  if (feed.ttl !== undefined) {
    lines.push(`    <ttl>${feed.ttl}</ttl>`);
  }

  if (feed.lastBuildDate !== undefined) {
    lines.push(
      `    <lastBuildDate>${formatRssDate(feed.lastBuildDate)}</lastBuildDate>`
    );
  }

  for (const item of feed.items) {
    lines.push(buildRssItem(item));
  }

  lines.push("  </channel>");
  lines.push("</rss>");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an RssItem. Returns an array of error strings (empty = valid).
 */
export function validateRssItem(item: RssItem): string[] {
  const errors: string[] = [];

  if (typeof item.title !== "string" || item.title.trim() === "") {
    errors.push("title must be a non-empty string");
  }
  if (typeof item.link !== "string" || item.link.trim() === "") {
    errors.push("link must be a non-empty string");
  } else if (!item.link.startsWith("http")) {
    errors.push("link must start with http");
  }
  if (typeof item.description !== "string" || item.description.trim() === "") {
    errors.push("description must be a non-empty string");
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Pick feed builder
// ---------------------------------------------------------------------------

/**
 * Build an RssFeed from a list of picks.
 */
export function buildPickFeed(params: {
  baseUrl: string;
  picks: readonly {
    id: string;
    title: string;
    description: string;
    sport: string;
    confidence: number;
    publishedAt: Date;
  }[];
}): RssFeed {
  const { baseUrl, picks } = params;

  const items: RssItem[] = picks.map((pick) => ({
    title: pick.title,
    link: `${baseUrl}/picks/${pick.id}`,
    description: pick.description,
    pubDate: pick.publishedAt,
    guid: pick.id,
    category: pick.sport,
  }));

  return {
    title: "Galaxy Sports Edge — Picks Feed",
    link: baseUrl,
    description: "Sports picks and analysis",
    items,
  };
}
