/**
 * Pure RSS 2.0 and Atom 1.0 feed builder.
 *
 * No npm dependencies — generates XML strings directly.
 * Pattern inspired by `feed` npm package (MIT, jpmonette/feed) but
 * re-implemented as a pure TS string builder with no runtime dependency.
 *
 * Escapes XML entities to prevent injection.
 */

export interface FeedItem {
  readonly title: string;
  readonly link: string;
  readonly description: string; // plain text or CDATA
  readonly pubDate: Date;
  readonly guid?: string; // defaults to link
  readonly author?: string;
  readonly category?: string;
  readonly enclosure?: {
    // for audio/video attachments
    readonly url: string;
    readonly length: number;
    readonly type: string;
  };
}

export interface FeedOptions {
  readonly title: string;
  readonly link: string; // site URL
  readonly feedUrl: string; // URL of this feed
  readonly description: string;
  readonly language?: string; // default "en-us"
  readonly copyright?: string;
  readonly lastBuildDate?: Date;
  readonly ttl?: number; // cache minutes (default 60)
  readonly imageUrl?: string;
}

/**
 * Escape XML special characters to prevent injection.
 * Handles: & < > " '
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format a Date as RFC-822 (used by RSS 2.0).
 * Example: "Thu, 19 Jun 2026 00:00:00 +0000"
 */
function toRfc822(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
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
  ];
  const pad2 = (n: number) => String(n).padStart(2, "0");

  const day = days[date.getUTCDay()];
  const dd = pad2(date.getUTCDate());
  const mon = months[date.getUTCMonth()];
  const yyyy = date.getUTCFullYear();
  const hh = pad2(date.getUTCHours());
  const mm = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());

  return `${day}, ${dd} ${mon} ${yyyy} ${hh}:${mm}:${ss} +0000`;
}

/**
 * Format a Date as ISO 8601 (used by Atom 1.0).
 * Example: "2026-06-19T00:00:00Z"
 */
function toIso8601(date: Date): string {
  return date.toISOString();
}

/** Generate RSS 2.0 XML string */
export function buildRss2Feed(
  options: FeedOptions,
  items: readonly FeedItem[]
): string {
  const language = options.language ?? "en-us";
  const ttl = options.ttl ?? 60;
  const lastBuildDate = options.lastBuildDate ?? new Date();

  const channelParts: string[] = [
    `    <title>${escapeXml(options.title)}</title>`,
    `    <link>${escapeXml(options.link)}</link>`,
    `    <description>${escapeXml(options.description)}</description>`,
    `    <language>${escapeXml(language)}</language>`,
  ];

  if (options.copyright !== undefined) {
    channelParts.push(
      `    <copyright>${escapeXml(options.copyright)}</copyright>`
    );
  }

  channelParts.push(
    `    <lastBuildDate>${escapeXml(toRfc822(lastBuildDate))}</lastBuildDate>`,
    `    <ttl>${ttl}</ttl>`,
    `    <atom:link href="${escapeXml(options.feedUrl)}" rel="self" type="application/rss+xml"/>`
  );

  if (options.imageUrl !== undefined) {
    channelParts.push(
      `    <image>`,
      `      <url>${escapeXml(options.imageUrl)}</url>`,
      `      <title>${escapeXml(options.title)}</title>`,
      `      <link>${escapeXml(options.link)}</link>`,
      `    </image>`
    );
  }

  for (const item of items) {
    const guid = item.guid ?? item.link;
    const itemParts: string[] = [
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(item.link)}</link>`,
      `      <description>${escapeXml(item.description)}</description>`,
      `      <pubDate>${escapeXml(toRfc822(item.pubDate))}</pubDate>`,
      `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
    ];

    if (item.author !== undefined) {
      itemParts.push(`      <author>${escapeXml(item.author)}</author>`);
    }

    if (item.category !== undefined) {
      itemParts.push(`      <category>${escapeXml(item.category)}</category>`);
    }

    if (item.enclosure !== undefined) {
      const enc = item.enclosure;
      itemParts.push(
        `      <enclosure url="${escapeXml(enc.url)}" length="${enc.length}" type="${escapeXml(enc.type)}"/>`
      );
    }

    channelParts.push(
      `    <item>`,
      ...itemParts,
      `    </item>`
    );
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `  <channel>`,
    ...channelParts,
    `  </channel>`,
    `</rss>`,
  ].join("\n");
}

/** Generate Atom 1.0 XML string */
export function buildAtomFeed(
  options: FeedOptions,
  items: readonly FeedItem[]
): string {
  const language = options.language ?? "en-us";
  const lastBuildDate = options.lastBuildDate ?? new Date();

  const feedParts: string[] = [
    `  <title>${escapeXml(options.title)}</title>`,
    `  <link href="${escapeXml(options.link)}"/>`,
    `  <link href="${escapeXml(options.feedUrl)}" rel="self"/>`,
    `  <id>${escapeXml(options.feedUrl)}</id>`,
    `  <updated>${toIso8601(lastBuildDate)}</updated>`,
    `  <subtitle>${escapeXml(options.description)}</subtitle>`,
  ];

  if (options.copyright !== undefined) {
    feedParts.push(`  <rights>${escapeXml(options.copyright)}</rights>`);
  }

  if (options.imageUrl !== undefined) {
    feedParts.push(`  <logo>${escapeXml(options.imageUrl)}</logo>`);
  }

  for (const item of items) {
    const guid = item.guid ?? item.link;
    const entryParts: string[] = [
      `    <title>${escapeXml(item.title)}</title>`,
      `    <link href="${escapeXml(item.link)}"/>`,
      `    <id>${escapeXml(guid)}</id>`,
      `    <updated>${toIso8601(item.pubDate)}</updated>`,
      `    <summary>${escapeXml(item.description)}</summary>`,
    ];

    if (item.author !== undefined) {
      entryParts.push(
        `    <author>`,
        `      <name>${escapeXml(item.author)}</name>`,
        `    </author>`
      );
    }

    if (item.category !== undefined) {
      entryParts.push(
        `    <category term="${escapeXml(item.category)}"/>`
      );
    }

    feedParts.push(`  <entry>`, ...entryParts, `  </entry>`);
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(language)}">`,
    ...feedParts,
    `</feed>`,
  ].join("\n");
}
