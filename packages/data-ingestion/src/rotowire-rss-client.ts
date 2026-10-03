/**
 * RotoWire NFL news RSS — headlines only, never full article text.
 *
 * VERIFIED LIVE 2026-09-18 (registry evidence):
 *   - rotowire-rss → https://www.rotowire.com/rss/news.php?sport=NFL : HTTP 200,
 *     valid RSS 2.0 (5 items with title/pubDate/link).
 *     Verified fixture item: title "Jameson Williams: Retains modest role in
 *     loss", pubDate "Thu, 17 Sep 2026 9:54:00 PM PDT".
 *
 * LEGAL (registry: cleared-with-attribution, DEFAULT ON — no env gate):
 *   - Attribution: "News headlines via RotoWire."
 *   - Standard RSS fair-use: attribute + link back, NEVER republish full
 *     article text. This client parses only <title>, <pubDate>, <link> from
 *     <item> blocks and never fetches the linked article body.
 *   - assertIngestible("rotowire-rss") runs before any network; GET only,
 *     no-store fetch.
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const ROTOWIRE_RSS_SOURCE_ID = "rotowire-rss";
export const ROTOWIRE_BASE = "https://www.rotowire.com/rss";
export const ROTOWIRE_RSS_ATTRIBUTION = "News headlines via RotoWire.";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export class RotoWireError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RotoWireError";
  }
}

/** One RSS item: headline + link only (fair-use; no article body). */
export interface RwNewsItem {
  readonly title: string;
  readonly pubDate: string | null;
  readonly link: string | null;
}

function unwrapCdata(s: string): string {
  const start = s.indexOf("<![CDATA[");
  if (start === -1) return s;
  const end = s.indexOf("]]>", start);
  if (end === -1) return s;
  return s.slice(start + "<![CDATA[".length, end);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Extract a child element's text from an <item> block, with CDATA support. */
function itemField(itemXml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(itemXml);
  if (!m) return null;
  const text = decodeEntities(unwrapCdata(m[1] ?? "")).trim();
  return text === "" ? null : text;
}

/** Parse RSS 2.0 <item> blocks. Pure: exported for testing. */
export function parseRotoWireRss(xml: string): RwNewsItem[] {
  const items: RwNewsItem[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const title = itemField(block, "title");
    if (title === null) continue;
    items.push({
      title,
      pubDate: itemField(block, "pubDate"),
      link: itemField(block, "link"),
    });
  }
  return items;
}

export class RotoWireClient {
  constructor(private readonly fetchImpl: typeof fetch = noStoreFetch) {}

  /** NFL news headlines from the RotoWire RSS feed. Headlines + links only. */
  async getNflNews(): Promise<RwNewsItem[]> {
    assertIngestible(ROTOWIRE_RSS_SOURCE_ID);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${ROTOWIRE_BASE}/news.php?sport=NFL`, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
        signal: controller.signal,
      });
      if (!res.ok) throw new RotoWireError(`RotoWire RSS HTTP ${res.status}`, res.status);
      const xml = await res.text();
      return parseRotoWireRss(xml);
    } finally {
      clearTimeout(timer);
    }
  }
}
