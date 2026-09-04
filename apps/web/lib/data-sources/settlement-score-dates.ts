/**
 * Derive ESPN / free-score date keys from pending pick commence times.
 *
 * ESPN's undated scoreboard is "now" only (offseason → next slate). Overdue
 * settlement requires date-targeted fetches (`dates=YYYYMMDD` or ranges).
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
  } = {},
): { espnKeys: string[]; isoKeys: string[] } {
  const maxDays = options.maxDays ?? 21;
  const includeFutureDays = options.includeFutureDays ?? 0;
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

  // Most recent past/today first — oxygen for overdue drain.
  const pastKeys = [...pastOrToday].sort((a, b) => b.localeCompare(a));
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
 * Collapse adjacent ESPN day keys into range strings when helpful
 * (e.g. 20260701-20260703). Singleton days stay as YYYYMMDD.
 */
export function compactEspnDateRanges(espnKeys: readonly string[]): string[] {
  if (espnKeys.length === 0) return [];
  const sorted = [...espnKeys].sort();
  const ranges: string[] = [];
  let start = sorted[0]!;
  let prev = start;

  // Pure calendar successor of a YYYYMMDD key. Deliberately does NOT round-trip
  // through toEspnDateKey: that maps an INSTANT to an Eastern day, while this
  // maps a calendar DAY to the next calendar day. Feeding a UTC-midnight Date
  // to an Eastern formatter lands on the previous evening, so the old
  // round-trip returned the same key back and adjacent days stopped compacting.
  const nextDay = (yyyymmdd: string): string => {
    const y = Number(yyyymmdd.slice(0, 4));
    const m = Number(yyyymmdd.slice(4, 6));
    const d = Number(yyyymmdd.slice(6, 8));
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    const ny = dt.getUTCFullYear();
    const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(dt.getUTCDate()).padStart(2, "0");
    return `${ny}${nm}${nd}`;
  };

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    if (cur === nextDay(prev)) {
      prev = cur;
      continue;
    }
    ranges.push(start === prev ? start : `${start}-${prev}`);
    start = cur;
    prev = cur;
  }
  ranges.push(start === prev ? start : `${start}-${prev}`);
  return ranges;
}
