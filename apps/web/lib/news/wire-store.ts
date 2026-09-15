/**
 * C-416 — the wire as a stored, polled feed.
 *
 * Cron (every 10 minutes in NFL season) fetches every curated roster feed,
 * keeps headlines + pubDate only (never bodies), classifies with
 * `classifySignal` (rss.ts) / `impact.ts` magnitudes, and upserts one `Signal`
 * row per classified item. `/the-beat` and The Beat render from this store —
 * never from a page-render fetch and never from fictional sample data.
 *
 * Dedup: the existing `@@unique([entityType, entityId, key, season, week])`
 * on Signal. One row per (team, wire.<signalType>, season). Within a cycle,
 * the same (sourceId, headline) is also collapsed. No migration.
 */

import { db } from "@sports/db";
import {
  TIER_WEIGHT,
  SIGNAL_MAGNITUDES,
  type NewsItem,
  type SignalType,
  type Tier,
} from "./impact";
import { classifySignal, parseRssItems, type RssFeedConfig } from "./rss";
import { toCuratedRssFeeds } from "./reporter-roster";
import {
  locationIsInternalTargetLocation,
  validateEndpointUrl,
} from "@sports/prediction-engine/src/ensemble/remote-model-client";

/** Seconds a single feed fetch may take before it is abandoned. */
const FETCH_TIMEOUT_MS = 8_000;

/** Most entries scanned per feed (bound on work, not on kept output). */
const MAX_SCAN_PER_FEED = 200;

/** Most classified items kept per feed this cycle. */
const MAX_ITEMS_PER_FEED = 40;

/** Wire signals older than this are not stored (stale news is not a signal). */
const MAX_AGE_MINUTES = 48 * 60;

/** Prefix on Signal.key for every wire row. */
export const WIRE_KEY_PREFIX = "wire.";

/** Season label for wire rows — same convention as nflverse (Sep+ → this year). */
export function wireSeasonLabel(now: Date = new Date()): number {
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/**
 * NFL news is in season roughly September through early February. The cron
 * still fires every 10 minutes year-round; this gate is what makes it
 * "every 10 minutes in season" without a second scheduler.
 */
export function isInNflWireSeason(now: Date = new Date()): boolean {
  const month = now.getUTCMonth();
  return month >= 8 || month <= 1;
}

/** Rights snapshot stored on every wire Signal row. */
export type WireRightsSnapshot = {
  readonly sourceName: string;
  readonly headline: string;
  readonly url: string;
  readonly tier: Tier;
  readonly feedUrl: string;
};

/** Map a signal type onto the SignalCategory vocabulary (string column). */
export function wireCategoryFor(signal: SignalType): string {
  switch (signal) {
    case "injury-out":
    case "injury-return":
      return "INJURIES";
    case "weather":
      return "WEATHER";
    case "role-up":
    case "role-down":
    case "depth-chart":
    case "suspension":
      return "PLAYER_AVAILABILITY";
    default:
      return "MARKET_SENTIMENT";
  }
}

/** Directional value in −1..1 from the impact fantasy magnitude. */
export function wireValueFor(signal: SignalType): number {
  const fantasy = SIGNAL_MAGNITUDES[signal].fantasy;
  return Math.round((fantasy / 100) * 1000) / 1000;
}

/** Stable feed id for Signal.sourceId — the feed URL. */
export function feedIdFor(feed: RssFeedConfig): string {
  return feed.url;
}

export function wireKeyFor(signal: SignalType): string {
  return `${WIRE_KEY_PREFIX}${signal}`;
}

/** Strip the wire prefix; null when the key is not a wire signal. */
export function signalTypeFromKey(key: string): SignalType | null {
  if (!key.startsWith(WIRE_KEY_PREFIX)) return null;
  const rest = key.slice(WIRE_KEY_PREFIX.length);
  if (rest in SIGNAL_MAGNITUDES) return rest as SignalType;
  return null;
}

/** One classified feed item, ready to upsert. */
export type WireUpsertCandidate = {
  readonly entityType: "team";
  readonly entityId: string;
  readonly key: string;
  readonly category: string;
  readonly value: number;
  readonly valueRaw: number;
  readonly confidence: number;
  readonly capturedAt: Date;
  readonly season: number;
  readonly week: number;
  readonly sourceId: string;
  readonly rightsSnapshot: WireRightsSnapshot;
  /** Within-cycle dedup handle. */
  readonly headline: string;
};

/**
 * Classify one raw feed entry into an upsert candidate, or drop it.
 * Headlines that do not classify are dropped (never guessed). Items without a
 * parseable pubDate are dropped (no fake freshness).
 */
export function toWireCandidate(
  feed: RssFeedConfig,
  raw: { title: string; pubDate: string | null },
  now: Date = new Date(),
): WireUpsertCandidate | null {
  const signal = classifySignal(raw.title);
  if (!signal) return null;
  if (!raw.pubDate) return null;
  const t = Date.parse(raw.pubDate);
  if (!Number.isFinite(t)) return null;
  const minutesAgo = Math.max(0, Math.round((now.getTime() - t) / 60_000));
  if (minutesAgo > MAX_AGE_MINUTES) return null;
  const capturedAt = new Date(t);
  const tier = feed.tier;
  return {
    entityType: "team",
    entityId: feed.team,
    key: wireKeyFor(signal),
    category: wireCategoryFor(signal),
    value: wireValueFor(signal),
    valueRaw: SIGNAL_MAGNITUDES[signal].fantasy,
    confidence: TIER_WEIGHT[tier],
    capturedAt,
    season: wireSeasonLabel(now),
    // Season-agnostic weekly slot: wire signals are not week-scoped game facts.
    week: 0,
    sourceId: feedIdFor(feed),
    rightsSnapshot: {
      sourceName: feed.source,
      headline: raw.title,
      url: feed.url,
      tier,
      feedUrl: feed.url,
    },
    headline: raw.title,
  };
}

/** Map a stored Signal row (plus rightsSnapshot) back into a NewsItem. */
export function signalRowToNewsItem(
  row: {
    id: string;
    entityId: string;
    key: string;
    capturedAt: Date;
    sourceId: string;
    rightsSnapshot: unknown;
  },
  now: Date = new Date(),
): NewsItem | null {
  const signal = signalTypeFromKey(row.key);
  if (!signal) return null;
  const snap = row.rightsSnapshot as Partial<WireRightsSnapshot> | null;
  if (!snap || typeof snap !== "object") return null;
  const headline = typeof snap.headline === "string" ? snap.headline : null;
  const sourceName = typeof snap.sourceName === "string" ? snap.sourceName : row.sourceId;
  const tierRaw = typeof snap.tier === "string" ? snap.tier : null;
  if (!headline || !tierRaw) return null;
  if (!(tierRaw in TIER_WEIGHT)) return null;
  const minutesAgo = Math.max(
    0,
    Math.round((now.getTime() - row.capturedAt.getTime()) / 60_000),
  );
  return {
    id: row.id,
    source: sourceName,
    tier: tierRaw as Tier,
    team: row.entityId,
    headline,
    signal,
    minutesAgo,
  };
}

/** Collapse candidates that share the same feed + headline in one cycle. */
export function dedupeCandidates(
  candidates: readonly WireUpsertCandidate[],
): WireUpsertCandidate[] {
  const seen = new Set<string>();
  const out: WireUpsertCandidate[] = [];
  for (const c of candidates) {
    const handle = `${c.sourceId}|${c.headline}|${c.key}`;
    if (seen.has(handle)) continue;
    seen.add(handle);
    out.push(c);
  }
  return out;
}

export type WireFetchHealth = {
  readonly configured: number;
  readonly reached: number;
  readonly classified: number;
  readonly upserted: number;
  readonly skipped: "out-of-season" | null;
};

type FetchOneResult = { ok: boolean; candidates: WireUpsertCandidate[] };

/**
 * Fetch one feed's headlines and classify them. Never throws: failures become
 * `ok: false` so a single dead feed cannot kill the cycle.
 */
async function fetchAndClassifyFeed(
  feed: RssFeedConfig,
  now: Date,
): Promise<FetchOneResult> {
  const check = validateEndpointUrl(feed.url);
  if (!check.ok) return { ok: false, candidates: [] };
  try {
    const res = await fetch(feed.url, {
      headers: { "user-agent": "GSE-wire/1.0 (headlines only; contact: site)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "manual",
      cache: "no-store",
    });
    let xml: string;
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { ok: false, candidates: [] };
      if (locationIsInternalTargetLocation(location)) return { ok: false, candidates: [] };
      let resolved: string;
      try {
        resolved = new URL(location, feed.url).toString();
      } catch {
        return { ok: false, candidates: [] };
      }
      const recheck = validateEndpointUrl(resolved);
      if (!recheck.ok) return { ok: false, candidates: [] };
      const followed = await fetch(resolved, {
        headers: { "user-agent": "GSE-wire/1.0 (headlines only; contact: site)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "manual",
        cache: "no-store",
      });
      if (!followed.ok) return { ok: false, candidates: [] };
      xml = await followed.text();
    } else {
      if (!res.ok) return { ok: false, candidates: [] };
      xml = await res.text();
    }
    const candidates: WireUpsertCandidate[] = [];
    for (const raw of parseRssItems(xml).slice(0, MAX_SCAN_PER_FEED)) {
      if (candidates.length >= MAX_ITEMS_PER_FEED) break;
      const candidate = toWireCandidate(feed, raw, now);
      if (candidate) candidates.push(candidate);
    }
    return { ok: true, candidates };
  } catch {
    return { ok: false, candidates: [] };
  }
}

/**
 * Poll every curated roster feed and upsert classified items into Signal.
 * Used by the refresh-wire cron. Returns fetch health for the JSON envelope.
 */
export async function refreshWireFromRoster(
  options: {
    readonly now?: Date;
    readonly feeds?: readonly RssFeedConfig[];
    /** Skip the in-season gate (tests). */
    readonly force?: boolean;
  } = {},
): Promise<WireFetchHealth> {
  const now = options.now ?? new Date();
  if (!options.force && !isInNflWireSeason(now)) {
    return {
      configured: 0,
      reached: 0,
      classified: 0,
      upserted: 0,
      skipped: "out-of-season",
    };
  }
  const feeds = options.feeds ?? toCuratedRssFeeds();
  const settled = await Promise.allSettled(
    feeds.map((feed) => fetchAndClassifyFeed(feed, now)),
  );
  const results = settled
    .filter((r): r is PromiseFulfilledResult<FetchOneResult> => r.status === "fulfilled")
    .map((r) => r.value);
  const reached = results.filter((r) => r.ok).length;
  const candidates = dedupeCandidates(results.flatMap((r) => r.candidates));

  let upserted = 0;
  for (const c of candidates) {
    try {
      await db.signal.upsert({
        where: {
          entityType_entityId_key_season_week: {
            entityType: c.entityType,
            entityId: c.entityId,
            key: c.key,
            season: c.season,
            week: c.week,
          },
        },
        create: {
          entityType: c.entityType,
          entityId: c.entityId,
          key: c.key,
          category: c.category,
          value: c.value,
          valueRaw: c.valueRaw,
          weight: 1,
          confidence: c.confidence,
          capturedAt: c.capturedAt,
          season: c.season,
          week: c.week,
          sourceId: c.sourceId,
          rightsSnapshot: { ...c.rightsSnapshot },
          fetchedAt: now,
        },
        update: {
          // Keep the freshest / most reliable report on the unique slot.
          category: c.category,
          value: c.value,
          valueRaw: c.valueRaw,
          confidence: c.confidence,
          capturedAt: c.capturedAt,
          sourceId: c.sourceId,
          rightsSnapshot: { ...c.rightsSnapshot },
          fetchedAt: now,
        },
      });
      upserted += 1;
    } catch (err) {
      console.error(
        `[wire-store] upsert failed for ${c.key}/${c.entityId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  return {
    configured: feeds.length,
    reached,
    classified: candidates.length,
    upserted,
    skipped: null,
  };
}

export type LoadWireResult = {
  readonly items: NewsItem[];
  /** True when the store read itself failed (not the same as empty). */
  readonly failed: boolean;
};

/**
 * Read the stored wire (Signal rows with key `wire.*`), newest first.
 * An empty store is an honest empty wire — never a sample.
 */
export async function loadWireFromStore(
  options: { readonly now?: Date; readonly limit?: number } = {},
): Promise<LoadWireResult> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 60;
  try {
    const rows = await db.signal.findMany({
      where: { key: { startsWith: WIRE_KEY_PREFIX } },
      orderBy: { capturedAt: "desc" },
      take: limit,
    });
    const items = rows
      .map((row) =>
        signalRowToNewsItem(
          {
            id: row.id,
            entityId: row.entityId,
            key: row.key,
            capturedAt: row.capturedAt,
            sourceId: row.sourceId,
            rightsSnapshot: row.rightsSnapshot,
          },
          now,
        ),
      )
      .filter((item): item is NewsItem => item !== null);
    return { items, failed: false };
  } catch (err) {
    console.error(
      `[wire-store] load failed: ${err instanceof Error ? err.message : err}`,
    );
    return { items: [], failed: true };
  }
}
