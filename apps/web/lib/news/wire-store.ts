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
import { normalizeTeamAlias } from "@/lib/nfl/team-resolver";
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

/**
 * One source's report on a (team, signal) slot.
 *
 * C-417: the Signal unique key is one row per (team, signal, season), so
 * multi-source corroboration and "one alert per (player, signal, source)"
 * both live in `rightsSnapshot.reports` — never in extra Signal rows.
 */
export type WireReport = {
  /** Feed URL — the stable per-source identity. */
  readonly sourceId: string;
  readonly sourceName: string;
  readonly headline: string;
  readonly url: string;
  readonly tier: Tier;
  /** ISO timestamp of the report's own pubDate. */
  readonly capturedAt: string;
  /** C-415/C-417: GSN's own feed never counts toward corroboration. */
  readonly selfSourced?: boolean;
};

/** Rights snapshot stored on every wire Signal row. */
export type WireRightsSnapshot = {
  readonly sourceName: string;
  readonly headline: string;
  readonly url: string;
  readonly tier: Tier;
  readonly feedUrl: string;
  /**
   * Every distinct source that has reported this (team, signal) recently.
   * Absent on rows written before C-417; readers fall back to the primary
   * fields above as a single-source report.
   */
  readonly reports?: readonly WireReport[];
};

/** How long two sources may be apart and still corroborate (C-417). */
export const CORROBORATION_WINDOW_MINUTES = 6 * 60;

/** Bound on stored reports per Signal slot (work bound, not a truth claim). */
export const MAX_REPORTS_PER_SIGNAL = 12;

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

/** Map a feed + raw entry into one stored report (C-417). */
export function toWireReport(
  feed: RssFeedConfig,
  raw: { title: string },
  capturedAt: Date,
): WireReport {
  return {
    sourceId: feedIdFor(feed),
    sourceName: feed.source,
    headline: raw.title,
    url: feed.url,
    tier: feed.tier,
    capturedAt: capturedAt.toISOString(),
    ...(feed.selfSourced ? { selfSourced: true as const } : {}),
  };
}

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
  const report = toWireReport(feed, raw, capturedAt);
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
      reports: [report],
    },
    headline: raw.title,
  };
}

/**
 * Merge one incoming report into the slot's report list.
 *
 * Same sourceId → refresh that source's headline/time; NOT a new report
 * (so a cron re-run against unchanged feeds never re-alerts). New sourceId →
 * append (this is what produces "one alert per (player, signal, source)").
 * Stale reports (older than the corroboration window relative to the newest)
 * and overflow past MAX_REPORTS_PER_SIGNAL are pruned.
 */
export function mergeWireReports(
  existing: readonly WireReport[] | undefined,
  incoming: WireReport,
  options: { readonly now?: Date } = {},
): { readonly reports: WireReport[]; readonly added: boolean } {
  const now = options.now ?? new Date();
  const prior = Array.isArray(existing) ? [...existing] : [];
  const idx = prior.findIndex((r) => r.sourceId === incoming.sourceId);
  let added = false;
  if (idx >= 0) {
    prior[idx] = incoming;
  } else {
    prior.push(incoming);
    added = true;
  }

  // Keep the window honest: reports older than 6h from the newest drop out
  // of corroboration (and of the alert surface) so two sources a day apart
  // can never claim to confirm each other.
  const times = prior.map((r) => Date.parse(r.capturedAt)).filter((t) => Number.isFinite(t));
  const newest = times.length > 0 ? Math.max(...times) : now.getTime();
  const windowStart = newest - CORROBORATION_WINDOW_MINUTES * 60_000;
  let kept = prior.filter((r) => {
    const t = Date.parse(r.capturedAt);
    return Number.isFinite(t) && t >= windowStart;
  });
  // Newest first, then cap.
  kept = kept
    .slice()
    .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))
    .slice(0, MAX_REPORTS_PER_SIGNAL);
  return { reports: kept, added };
}

/**
 * Map a stored Signal row's primary (freshest) report into one NewsItem.
 * Prefer `signalRowToNewsItems` when corroboration matters — one Signal row
 * can carry many sources in `rightsSnapshot.reports` (C-417).
 */
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

/**
 * Expand one Signal row into one NewsItem per stored report (C-417).
 *
 * Falls back to the primary rights fields when `reports` is absent (rows
 * written before C-417). Each report becomes a distinct NewsItem so
 * `impact.ts` `corroborate()` can count two distinct sources without needing
 * two Signal rows — the unique key forbids that.
 *
 * `options.playerByName` maps a lowercased player full name to that name,
 * used to attach `player` so corroboration can group by player. Headlines
 * that mention no known player stay player-less and therefore never
 * corroborate (same honesty rule as impact.ts).
 */
export function signalRowToNewsItems(
  row: {
    id: string;
    entityId: string;
    key: string;
    capturedAt: Date;
    sourceId: string;
    rightsSnapshot: unknown;
  },
  options: {
    readonly now?: Date;
    /** Drop self-sourced (GSN) reports entirely. Default true (C-417). */
    readonly dropSelfSourced?: boolean;
    readonly playerByName?: readonly string[];
  } = {},
): NewsItem[] {
  const now = options.now ?? new Date();
  const dropSelfSourced = options.dropSelfSourced ?? true;
  const signal = signalTypeFromKey(row.key);
  if (!signal) return [];
  const snap = row.rightsSnapshot as Partial<WireRightsSnapshot> | null;
  if (!snap || typeof snap !== "object") return [];

  const primary: WireReport = {
    sourceId: row.sourceId,
    sourceName: typeof snap.sourceName === "string" ? snap.sourceName : row.sourceId,
    headline: typeof snap.headline === "string" ? snap.headline : "",
    url: typeof snap.url === "string" ? snap.url : "",
    tier: (typeof snap.tier === "string" && snap.tier in TIER_WEIGHT ? snap.tier : "Unconfirmed") as Tier,
    capturedAt: row.capturedAt.toISOString(),
  };
  const reports =
    Array.isArray(snap.reports) && snap.reports.length > 0 ? snap.reports : [primary];

  const out: NewsItem[] = [];
  reports.forEach((report, index) => {
    if (!report || typeof report !== "object") return;
    if (dropSelfSourced && report.selfSourced === true) return;
    const headline = typeof report.headline === "string" ? report.headline : null;
    const sourceName = typeof report.sourceName === "string" ? report.sourceName : row.sourceId;
    const tierRaw = typeof report.tier === "string" ? report.tier : null;
    if (!headline || !tierRaw || !(tierRaw in TIER_WEIGHT)) return;
    const capturedMs = Date.parse(report.capturedAt);
    const capturedAt = Number.isFinite(capturedMs) ? new Date(capturedMs) : row.capturedAt;
    const minutesAgo = Math.max(0, Math.round((now.getTime() - capturedAt.getTime()) / 60_000));
    const player = matchPlayerInHeadline(headline, options.playerByName);
    out.push({
      // Distinct id per report so corroborate() can key each item.
      id: `${row.id}#${index}`,
      source: sourceName,
      tier: tierRaw as Tier,
      team: row.entityId,
      ...(player ? { player } : {}),
      headline,
      signal,
      minutesAgo,
    });
  });
  return out;
}

/**
 * Conservative player match: full-name containment, or a unique last name of
 * 4+ characters when several candidates are supplied. Never guesses a player
 * the headline does not name.
 */
export function matchPlayerInHeadline(
  headline: string,
  playerNames: readonly string[] | undefined,
): string | null {
  if (!playerNames || playerNames.length === 0) return null;
  const h = headline.toLowerCase();

  const lastNameCounts = new Map<string, number>();
  for (const name of playerNames) {
    const parts = name.trim().split(/\s+/);
    const last = (parts[parts.length - 1] ?? "").toLowerCase();
    if (last.length >= 4) lastNameCounts.set(last, (lastNameCounts.get(last) ?? 0) + 1);
  }

  for (const name of playerNames) {
    const n = name.trim();
    if (n.length < 3) continue;
    if (h.includes(n.toLowerCase())) return n;
    const parts = n.split(/\s+/);
    const last = (parts[parts.length - 1] ?? "").toLowerCase();
    if (last.length >= 4 && lastNameCounts.get(last) === 1 && h.includes(last)) return n;
  }
  return null;
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
  /**
   * C-417: reports that were NOT already on the slot (new sourceId). This is
   * the alert surface — a re-run against unchanged feeds yields an empty list.
   */
  readonly newReports: readonly WireNewReport[];
};

/** A report that landed on a Signal slot for the first time this cycle. */
export type WireNewReport = {
  readonly team: string;
  readonly signal: SignalType;
  readonly key: string;
  readonly report: WireReport;
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
 * Used by the refresh-wire cron. Returns fetch health for the JSON envelope
 * plus `newReports` — the sources that were not already on each slot (C-417).
 */
export async function refreshWireFromRoster(
  options: {
    readonly now?: Date;
    readonly feeds?: readonly RssFeedConfig[];
    /** Skip the in-season gate (tests). */
    readonly force?: boolean;
    /** Injectable db for tests; defaults to the shared Prisma handle. */
    readonly dbArg?: unknown;
  } = {},
): Promise<WireFetchHealth> {
  const now = options.now ?? new Date();
  const dbHandle = (options.dbArg ?? db) as {
    signal: {
      findUnique(args: unknown): Promise<{ rightsSnapshot: unknown } | null>;
      upsert(args: unknown): Promise<unknown>;
    };
  };
  if (!options.force && !isInNflWireSeason(now)) {
    return {
      configured: 0,
      reached: 0,
      classified: 0,
      upserted: 0,
      skipped: "out-of-season",
      newReports: [],
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
  const newReports: WireNewReport[] = [];
  for (const c of candidates) {
    try {
      const uniqueWhere = {
        entityType_entityId_key_season_week: {
          entityType: c.entityType,
          entityId: c.entityId,
          key: c.key,
          season: c.season,
          week: c.week,
        },
      };
      let priorReports: readonly WireReport[] | undefined;
      try {
        const existing = await dbHandle.signal.findUnique({ where: uniqueWhere });
        const snap = existing?.rightsSnapshot as Partial<WireRightsSnapshot> | null;
        if (snap && Array.isArray(snap.reports)) priorReports = snap.reports;
      } catch {
        priorReports = undefined;
      }

      const incomingReport =
        c.rightsSnapshot.reports?.[0] ??
        toWireReport(
          {
            url: c.rightsSnapshot.url,
            source: c.rightsSnapshot.sourceName,
            tier: c.rightsSnapshot.tier,
            team: c.entityId,
          },
          { title: c.headline },
          c.capturedAt,
        );
      const merged = mergeWireReports(priorReports, incomingReport, { now });
      const signalType = signalTypeFromKey(c.key);
      if (merged.added && signalType) {
        newReports.push({
          team: c.entityId,
          signal: signalType,
          key: c.key,
          report: incomingReport,
        });
      }
      const rightsSnapshot = {
        ...c.rightsSnapshot,
        reports: merged.reports,
      };

      await dbHandle.signal.upsert({
        where: uniqueWhere,
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
          rightsSnapshot,
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
          rightsSnapshot,
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
    newReports,
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

/**
 * Resolve a game team name ("Kansas City Chiefs") or abbreviation ("KC")
 * onto the Signal.entityId vocabulary. Tries the full string first, then the
 * nickname token ("Chiefs") — the same tokens `team-resolver` already knows.
 */
export function wireTeamIdFromName(name: string): string | null {
  const direct = normalizeTeamAlias(name);
  if (direct) return direct;
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 0 ? parts[parts.length - 1] : "";
  return last ? normalizeTeamAlias(last) : null;
}

/**
 * C-417 — the beat-report live loader.
 *
 * `NewsItem[]` built from stored Signal rows for the two teams in a game.
 * Each stored report becomes its own NewsItem so `impact.ts` `corroborate()`
 * can see two distinct sources without two Signal rows (the unique key
 * forbids that). Self-sourced GSN reports are dropped. Only Beat / Insider /
 * Verified reports are returned — Aggregator and Unconfirmed may render on
 * The Beat but never count toward the two-source rule.
 *
 * The caller (beat-report.ts) still owns `live`: this function only ever
 * reads real stored rows, and an empty store is an honest empty wire.
 */
export async function loadBeatReportWireFromStore(
  teams: { home: string; away: string },
  options: {
    readonly now?: Date;
    readonly dbArg?: unknown;
    /** Player full names used to attach `player` for corroboration grouping. */
    readonly playerNames?: readonly string[];
    readonly limit?: number;
  } = {},
): Promise<NewsItem[]> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 120;
  const dbHandle = (options.dbArg ?? db) as {
    signal: {
      findMany(args: unknown): Promise<
        Array<{
          id: string;
          entityId: string;
          key: string;
          capturedAt: Date;
          sourceId: string;
          rightsSnapshot: unknown;
        }>
      >;
    };
  };

  const homeId = wireTeamIdFromName(teams.home);
  const awayId = wireTeamIdFromName(teams.away);
  const teamIds = [homeId, awayId].filter((t): t is string => t !== null);
  if (teamIds.length === 0) return [];
  // beat-report's teamMatches compares display names ("Kansas City Chiefs"),
  // while Signal.entityId is the abbreviation ("KC"). Carry the game's own
  // display name onto each NewsItem so the gate can match without a second
  // vocabulary table.
  const idToDisplayName = new Map<string, string>();
  if (homeId) idToDisplayName.set(homeId, teams.home);
  if (awayId) idToDisplayName.set(awayId, teams.away);

  try {
    const rows = await dbHandle.signal.findMany({
      where: {
        key: { startsWith: WIRE_KEY_PREFIX },
        entityId: { in: teamIds },
      },
      orderBy: { capturedAt: "desc" },
      take: limit,
    });
    const verdictTiers: ReadonlySet<Tier> = new Set(["Insider", "Beat", "Verified"]);
    const items: NewsItem[] = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      for (const item of signalRowToNewsItems(row, {
        now,
        dropSelfSourced: true,
        playerByName: options.playerNames,
      })) {
        if (!verdictTiers.has(item.tier)) continue;
        items.push({
          ...item,
          team: idToDisplayName.get(item.team) ?? item.team,
        });
      }
    }
    return items;
  } catch (err) {
    console.error(
      `[wire-store] beat-report load failed: ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}
