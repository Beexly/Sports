import type { NewsItem, SignalType, Tier } from "./impact";
import {
  locationIsInternalTargetLocation,
  validateEndpointUrl,
} from "@sports/prediction-engine/src/ensemble/remote-model-client";

/**
 * SSRF guard for the RSS wire: feed URLs come from operator config (`$NEXT_PUBLIC_...`/env),
 * so before we fetch we refuse any target whose host is a private/loopback/link-local IP
 * literal or a cloud-metadata host — the standard SSRF escape hatch. We also fetch with
 * `redirect: "manual"` and reject any 3xx whose Location points at one of those hosts,
 * closing the redirect-to-internal-IP bypass. Relative redirects (same-origin) are safe.
 *
 * Reuses the prediction-engine's exported validators so the guard logic lives in one place
 * and stays tested by the remote-model-client suite.
 */

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


/**
 * Curated free sports RSS catalog (sports-skills harvest).
 * Opt-in via NEWS_RSS_USE_CURATED_DEFAULTS=true when NEWS_RSS_FEEDS is empty.
 * Headlines only; never invent signals.
 */
export const CURATED_SPORTS_NEWS_RSS: readonly RssFeedConfig[] = [
  {
    url: "https://www.espn.com/espn/rss/nfl/news",
    source: "ESPN NFL",
    tier: "Aggregator",
    team: "NFL",
  },
  {
    url: "https://www.espn.com/espn/rss/nba/news",
    source: "ESPN NBA",
    tier: "Aggregator",
    team: "NBA",
  },
  {
    url: "https://www.espn.com/espn/rss/mlb/news",
    source: "ESPN MLB",
    tier: "Aggregator",
    team: "MLB",
  },
  {
    url: "https://www.espn.com/espn/rss/soccer/news",
    source: "ESPN FC",
    tier: "Aggregator",
    team: "Soccer",
  },
  {
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    source: "BBC Sport Football",
    tier: "Aggregator",
    team: "Soccer",
  },
  {
    url: "https://www.skysports.com/rss/12040",
    source: "Sky Sports Football",
    tier: "Aggregator",
    team: "Soccer",
  },
] as const;

/** Env string form of curated catalog (founder can paste into NEWS_RSS_FEEDS). */
export function curatedNewsRssEnvString(): string {
  return CURATED_SPORTS_NEWS_RSS.map(
    (f) => `${f.url}|${f.source}|${f.tier}|${f.team}`,
  ).join(";");
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
  // Coach / beat-reporter report tier — checked LAST so a headline that also
  // matches a stronger signal (injury, role, trade…) keeps the stronger one.
  // Coach rumors and beat-reporter rumors are the founder's requested factor;
  // this only fires on explicit coach/report framing, never on plain prose.
  if (
    /\b(coach(es)?|head coach|offensive coordinator|defensive coordinator|oc|dc|gm|general manager|beat writer|beat reporter|reporter(s)?|insider(s)?|source(s)?)\b/.test(h) ||
    /\b(says?|said|according to|expected to|reported|per +[a-z-]+ +(report|source))\b/.test(h)
  )
    return "coach-report";
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

/** Per-feed outcome. `ok: false` means the feed did not answer at all. */
type FeedRead = { readonly ok: true; readonly items: NewsItem[] } | { readonly ok: false };
const FEED_FAILED: FeedRead = { ok: false };

/**
 * A wire read WITH the fate of the feeds that produced it.
 *
 * WHY THIS EXISTS. Every failure inside the per-feed lambda below returns an
 * empty array, and a thrown fetch is dropped by the `fulfilled` filter, so
 * `fetchLiveWire` returns [] both when the feeds answered and carried nothing
 * classifiable AND when every configured feed was unreachable. Those are
 * opposite facts. `/the-beat` renders the first as "No fresh reports", which
 * asserts the wire is up and quiet; during a total outage that sentence is
 * false, and it is the same class of defect as the sample-during-an-outage
 * one fixed in c71542292, one layer further down.
 *
 * `unconfigured` is kept distinct from both: it is the only state that may
 * fall back to the labeled fictional sample.
 */
export type LiveWireRead = {
  /** Classified, deduped, freshest first. Empty is a real answer, not an error. */
  readonly items: NewsItem[];
  /** Feeds configured for this read. Zero means unconfigured. */
  readonly attempted: number;
  /** Feeds that returned a parseable document, whether or not it classified. */
  readonly ok: number;
  /** No feeds are configured, so the labeled sample is the honest fallback. */
  readonly unconfigured: boolean;
  /**
   * Feeds were configured and NONE answered. The wire is down, not quiet, and
   * a caller must not describe it as empty.
   */
  readonly unavailable: boolean;
};

/**
 * Fetch + classify the configured live wire, reporting how many feeds actually
 * answered. Prefer this over `fetchLiveWire` on any surface that tells the
 * reader what the wire is doing.
 */
export async function fetchLiveWireRead(
  now: Date = new Date(),
): Promise<LiveWireRead> {
  let feeds = parseFeedConfig(process.env["NEWS_RSS_FEEDS"]);
  if (
    feeds.length === 0 &&
    process.env["NEWS_RSS_USE_CURATED_DEFAULTS"]?.trim() === "true"
  ) {
    feeds = [...CURATED_SPORTS_NEWS_RSS];
  }
  if (feeds.length === 0) {
    return { items: [], attempted: 0, ok: 0, unconfigured: true, unavailable: false };
  }

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      // SSRF choke point: refuse private/metadata IP literals before issuing.
      const check = validateEndpointUrl(feed.url);
      if (!check.ok) return FEED_FAILED;
      const res = await fetch(feed.url, {
        headers: { "user-agent": "GSE-wire/1.0 (headlines only; contact: site)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "manual", // do NOT auto-follow; validate each hop ourselves
        next: { revalidate: 300 },
      });
      // Reject 3xx redirects whose Location points at a private/metadata host
      // (redirect-to-internal-IP SSRF bypass). Same-origin relative redirects
      // are safe (skip check); absolute public redirects are re-validated then
      // followed exactly once, still under redirect:"manual".
      let xml: string;
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return FEED_FAILED;
        if (locationIsInternalTargetLocation(location)) return FEED_FAILED;
        const recheck = validateEndpointUrl(location);
        if (!recheck.ok) return FEED_FAILED;
        const followed = await fetch(location, {
          headers: { "user-agent": "GSE-wire/1.0 (headlines only; contact: site)" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          redirect: "manual",
        });
        if (!followed.ok) return FEED_FAILED;
        xml = await followed.text();
      } else {
        if (!res.ok) return FEED_FAILED;
        xml = await res.text();
      }
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
      return { ok: true, items } as const;
    }),
  );

  // A REJECTED promise is a failed feed, not an absent one. Counting only the
  // fulfilled-and-ok ones is what makes "every feed is down" expressible.
  const reads = results.map((r) => (r.status === "fulfilled" ? r.value : FEED_FAILED));
  const ok = reads.filter((r) => r.ok).length;
  const items = reads
    .flatMap((r) => (r.ok ? r.items : []))
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 60);
  return { items, attempted: feeds.length, ok, unconfigured: false, unavailable: ok === 0 };
}

/**
 * The wire alone, for callers that do not describe its state to a reader.
 * Null still means unconfigured. Kept so existing callers are unchanged;
 * anything that renders wire STATUS wants `fetchLiveWireRead`.
 */
export async function fetchLiveWire(
  now: Date = new Date(),
): Promise<NewsItem[] | null> {
  const read = await fetchLiveWireRead(now);
  return read.unconfigured ? null : read.items;
}
