import type { NewsItem, SignalType, Tier } from "./impact";

/**
 * Live RSS wire — the first real crawler lane, dark-shipped.
 *
 * RSS is the one crawl target that needs no terms debate: a published
 * syndication feed exists specifically for machine consumption. We take
 * HEADLINES ONLY (title + timestamp), never article bodies, and attribute the
 * source on every card. Nothing is stored; items are fetched at render and
 * classified into the existing signal taxonomy.
 *
 * Dark by default: without NEWS_RSS_FEEDS the module returns null and The Beat
 * keeps its clearly-labeled fictional sample. With it, real headlines replace
 * the sample and the sample marker disappears.
 *
 * NEWS_RSS_FEEDS format (semicolon-separated feeds, pipe-separated fields):
 *   url|source-name|tier|team
 * e.g.
 *   https://www.espn.com/espn/rss/nfl/news|ESPN NFL|Aggregator|NFL
 * tier must be one of the Tier union (defaults to "Aggregator" — honest floor
 * for un-vetted feeds); team is the filter-chip label for the feed's scope.
 *
 * Honesty rules:
 *   - A headline that doesn't classify into a real SignalType is DROPPED, not
 *     guessed. The Beat is a signal wire, not a headline dump.
 *   - minutesAgo comes from the feed's own pubDate; items without a parseable
 *     date are dropped (no fake freshness).
 *   - Fetch failures return what succeeded; a feed outage never fabricates.
 */

const VALID_TIERS: readonly Tier[] = [
  "Insider",
  "Beat",
  "Verified",
  "Aggregator",
  "Unconfirmed",
];

export type RssFeedConfig = {
  readonly url: string;
  readonly source: string;
  readonly tier: Tier;
  readonly team: string;
};

/** Parse the NEWS_RSS_FEEDS env format. Malformed entries are skipped. */
export function parseFeedConfig(raw: string | undefined): RssFeedConfig[] {
  if (!raw?.trim()) return [];
  const feeds: RssFeedConfig[] = [];
  for (const entry of raw.split(";")) {
    const [url, source, tier, team] = entry.split("|").map((s) => s?.trim());
    if (!url || !source) continue;
    if (!/^https:\/\//.test(url)) continue; // https only
    feeds.push({
      url,
      source,
      tier: VALID_TIERS.includes(tier as Tier) ? (tier as Tier) : "Aggregator",
      team: team || "League",
    });
  }
  return feeds;
}

/** Minimal RSS 2.0 / Atom item extraction. No deps; headlines only. */
export function parseRssItems(
  xml: string,
): Array<{ title: string; pubDate: string | null }> {
  const items: Array<{ title: string; pubDate: string | null }> = [];
  const blocks = xml.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/g) ?? [];
  for (const block of blocks) {
    const titleMatch =
      block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const dateMatch =
      block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ??
      block.match(/<updated>([\s\S]*?)<\/updated>/) ??
      block.match(/<published>([\s\S]*?)<\/published>/);
    const title = titleMatch?.[1]
      ?.replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();
    if (!title) continue;
    items.push({ title, pubDate: dateMatch?.[1]?.trim() ?? null });
  }
  return items;
}

/**
 * Keyword classifier into the existing signal taxonomy. Deliberately
 * conservative: no match means the headline is dropped, never guessed.
 */
export function classifySignal(headline: string): SignalType | null {
  const h = headline.toLowerCase();
  if (/\b(out for|ruled out|out indefinitely|placed on (the )?(il|ir)|torn|surgery|fracture|acl|achilles)\b/.test(h))
    return "injury-out";
  if (/\b(activated|returns?|return from|back from|cleared to play|off (the )?(il|ir))\b/.test(h))
    return "injury-return";
  if (/\b(traded?|acquires?|acquired|sent to|deal sends)\b/.test(h)) return "trade";
  if (/\b(suspended|suspension|banned)\b/.test(h)) return "suspension";
  if (/\b(named (the )?starter|starting|promoted to|elevated|takes over|new starter)\b/.test(h))
    return "role-up";
  if (/\b(benched|demoted|loses? (the )?(starting )?job|bullpen role)\b/.test(h))
    return "role-down";
  if (/\b(depth chart)\b/.test(h)) return "depth-chart";
  if (/\b(rain|wind|snow|weather|postponed|delay(ed)?)\b/.test(h)) return "weather";
  if (/\b(new (offensive|defensive) coordinator|scheme|play-?calling)\b/.test(h))
    return "scheme";
  return null;
}

const FETCH_TIMEOUT_MS = 8_000;

/** Cheap stable id so React keys survive re-renders across fetches. */
function headlineId(source: string, title: string): string {
  let h = 0;
  const s = `${source}:${title}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `rss-${(h >>> 0).toString(36)}`;
}

/**
 * Fetch + classify the configured live wire. Returns null when unconfigured
 * (caller falls back to the labeled sample); returns [] when configured but
 * nothing classifiable arrived (an honest empty wire).
 */
export async function fetchLiveWire(
  now: Date = new Date(),
): Promise<NewsItem[] | null> {
  const feeds = parseFeedConfig(process.env["NEWS_RSS_FEEDS"]);
  if (feeds.length === 0) return null;

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "user-agent": "GSE-wire/1.0 (headlines only; contact: site)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 300 },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      const items: NewsItem[] = [];
      for (const raw of parseRssItems(xml).slice(0, 40)) {
        const signal = classifySignal(raw.title);
        if (!signal) continue; // no guessing
        if (!raw.pubDate) continue; // no fake freshness
        const t = Date.parse(raw.pubDate);
        if (!Number.isFinite(t)) continue;
        const minutesAgo = Math.max(0, Math.round((now.getTime() - t) / 60_000));
        if (minutesAgo > 48 * 60) continue; // stale news is not a signal
        items.push({
          id: headlineId(feed.source, raw.title),
          source: feed.source,
          tier: feed.tier,
          team: feed.team,
          headline: raw.title,
          signal,
          minutesAgo,
        });
      }
      return items;
    }),
  );

  const wire = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 60);
  return wire;
}
