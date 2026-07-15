import type { NewsItem, SignalType, Tier } from "./impact";

export type RssFeedConfig = {
  readonly url: string;
  readonly source: string;
  readonly tier: Tier;
  readonly team: string;
};

export type WireFetchStatus = "UNCONFIGURED" | "AVAILABLE" | "OUTAGE";

export interface WireFetchResult {
  readonly status: WireFetchStatus;
  readonly items: readonly NewsItem[];
  readonly configuredFeedCount: number;
  readonly successfulFeedCount: number;
  readonly failedFeedCount: number;
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
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60_000;

/** Cheap stable id so React keys survive re-renders across fetches. */
function headlineId(source: string, title: string): string {
  let h = 0;
  const s = `${source}:${title}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `rss-${(h >>> 0).toString(36)}`;
}

export async function fetchLiveWire(
  feeds: readonly RssFeedConfig[],
  now: Date = new Date(),
): Promise<WireFetchResult> {
  if (feeds.length === 0) {
    return {
      status: "UNCONFIGURED",
      items: [],
      configuredFeedCount: 0,
      successfulFeedCount: 0,
      failedFeedCount: 0,
    };
  }

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "user-agent": "GSE-wire/1.0 (headlines only; contact: site)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 300 },
      });
      if (!res.ok) throw new Error(`RSS request failed with ${res.status}`);
      const xml = await res.text();
      const items: NewsItem[] = [];
      for (const raw of parseRssItems(xml).slice(0, 40)) {
        const signal = classifySignal(raw.title);
        if (!signal) continue; // no guessing
        if (!raw.pubDate) continue; // no fake freshness
        const t = Date.parse(raw.pubDate);
        if (!Number.isFinite(t)) continue;
        const ageMs = now.getTime() - t;
        if (ageMs < -MAX_FUTURE_CLOCK_SKEW_MS) continue;
        const minutesAgo = Math.max(0, Math.round(ageMs / 60_000));
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

  const successfulResults = results.filter(
    (result): result is PromiseFulfilledResult<NewsItem[]> =>
      result.status === "fulfilled",
  );
  const wire = successfulResults
    .flatMap((r) => r.value)
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 60);
  return {
    status: successfulResults.length > 0 ? "AVAILABLE" : "OUTAGE",
    items: wire,
    configuredFeedCount: feeds.length,
    successfulFeedCount: successfulResults.length,
    failedFeedCount: feeds.length - successfulResults.length,
  };
}
