/**
 * Derive ESPN / free-score date keys from pending pick commence times.
 *
 * ESPN's undated scoreboard is "now" only (offseason → next slate). Overdue
 * settlement requires date-targeted fetches (`dates=YYYYMMDD`, ONE day per
 * request — ESPN 400s every multi-day value; see compactEspnDateRanges).
 *
 * Critical: do NOT fill the maxDays budget with *future* commence days
 * (e.g. NFL week-1 in September while draining July/August overdue). Future
 * dates starve historical scoreboards and leave OVERDUE_NO_SCORE stuck.
 *
 * THE DATE KEY IS US EASTERN, NOT UTC. ESPN buckets a game under its US
 * Eastern calendar date, so every game kicking off at or after 00:00 UTC
 * (8pm ET during EDT, 7pm ET during EST) lands on the PREVIOUS Eastern day.
 * That is Sunday Night Football, Monday Night Football and the late West
 * Coast window: the marquee slate.
 *
 * Verified against the live ESPN scoreboard rather than assumed. The MNF game
 * SF @ IND carries `date: 2025-12-23T01:15Z`, so a UTC key reads 20251223:
 *
 *   GET .../nfl/scoreboard?dates=20251222 -> 1 event  (SF @ IND)
 *   GET .../nfl/scoreboard?dates=20251223 -> 0 events
 *
 * A UTC key therefore asks ESPN for a day the game is not on, and the pick
 * settles only by luck, when some other pick that day happens to contribute
 * the correct key to the same batch.
 */

const SCOREBOARD_TZ = "America/New_York";

/**
 * US Eastern calendar day as ESPN buckets it: YYYYMMDD.
 *
 * Uses Intl.formatToParts, the same mechanism lib/cipher/cipher.ts uses for
 * its Eastern window, so DST is handled by the runtime rather than by a fixed
 * offset (the EDT/EST difference moves this boundary by an hour).
 */
export function toEspnDateKey(isoOrDate: string | Date): string | null {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return null;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: SCOREBOARD_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(d)) if (part.type !== "literal") p[part.type] = part.value;
  const y = p["year"];
  const m = p["month"];
  const day = p["day"];
  if (!y || !m || !day) return null;
  return `${y}${m}${day}`;
}

/**
 * ISO calendar day YYYY-MM-DD for MLB/NHL/BALLDONTLIE style APIs.
 *
 * Derived from the Eastern key above. These providers key a game by its
 * scheduled game date rather than by a UTC instant, so a late game belongs to
 * the Eastern day here too.
 */
export function toIsoDateKey(isoOrDate: string | Date): string | null {
  const espn = toEspnDateKey(isoOrDate);
  if (!espn || espn.length !== 8) return null;
  return `${espn.slice(0, 4)}-${espn.slice(4, 6)}-${espn.slice(6, 8)}`;
}

/**
 * Unique ESPN date keys for a set of commence times.
 *
 * Default: only **today and past** UTC days, most recent first, capped at
 * `maxDays`. Optionally include a small number of future days via
 * `includeFutureDays` (default 0) for live-day lookahead only.
 */
export function uniqueScoreboardDates(
  commenceTimes: readonly (string | Date)[],
  options: {
    maxDays?: number;
    now?: Date;
    /** How many future UTC days to allow after past/today (default 0). */
    includeFutureDays?: number;
    /**
     * Which end of a backlog wider than `maxDays` survives the cap. The runner
     * wants "newest" (oxygen for the health band); the stale-backfill lane exists
     * to drain the TAIL and must ask for "oldest", otherwise the oldest overdue
     * days are dropped every cycle and those picks report NO_FINAL forever.
     */
    order?: "newest" | "oldest";
  } = {},
): { espnKeys: string[]; isoKeys: string[] } {
  const maxDays = options.maxDays ?? 21;
  const includeFutureDays = options.includeFutureDays ?? 0;
  const order = options.order ?? "newest";
  const now = options.now ?? new Date();
  const todayKey = toEspnDateKey(now);
  if (!todayKey) return { espnKeys: [], isoKeys: [] };

  const pastOrToday = new Set<string>();
  const future = new Set<string>();
  for (const t of commenceTimes) {
    const k = toEspnDateKey(t);
    if (!k) continue;
    if (k <= todayKey) pastOrToday.add(k);
    else future.add(k);
  }

  // Default: most recent past/today first — oxygen for overdue drain. The
  // backfill lane flips this so the cap keeps the oldest days instead.
  const pastKeys = [...pastOrToday].sort((a, b) =>
    order === "oldest" ? a.localeCompare(b) : b.localeCompare(a),
  );
  // Soonest future first if explicitly allowed (rare).
  const futureKeys = [...future].sort((a, b) => a.localeCompare(b));

  const espnKeys: string[] = [];
  for (const k of pastKeys) {
    if (espnKeys.length >= maxDays) break;
    espnKeys.push(k);
  }
  if (includeFutureDays > 0) {
    for (const k of futureKeys.slice(0, includeFutureDays)) {
      if (espnKeys.length >= maxDays) break;
      espnKeys.push(k);
    }
  }

  const isoKeys = espnKeys.map(
    (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`,
  );
  return { espnKeys, isoKeys };
}

/**
 * One ESPN day key per element, sorted and deduped.
 *
 * ESPN's scoreboard endpoint REJECTS every multi-day `dates` value with HTTP
 * 400 — verified live 2026-10-15 on MLB, NHL and NFL: `dates=20261003-20261005`,
 * `dates=20261003,20261004` and the reversed range all return 400 while
 * `dates=20261003` returns 200 with the full board. The previous behavior
 * compacted adjacent days into ranges like `20260701-20260703`, so EVERY dated
 * settlement fetch spanning two or more days was a guaranteed-rejected request:
 * the graders loaded no finals, every pick held NO_FINAL, and the Oct 3-6
 * cohort sat ungraded for 12 days while the zero-sit lane correctly refused to
 * void on a missing board (fetch error = skip, by design).
 *
 * The name stays for grep continuity; every caller treats the output as opaque
 * request params. If ESPN ever reinstates multi-day keys, re-verify against the
 * live endpoint before reintroducing ranges here.
 */
export function compactEspnDateRanges(espnKeys: readonly string[]): string[] {
  return [...new Set(espnKeys)].sort();
}
