/**
 * Derive ESPN / free-score date keys from pending pick commence times.
 *
 * ESPN's undated scoreboard is "now" only (offseason → next slate). Overdue
 * settlement requires date-targeted fetches (`dates=YYYYMMDD` or ranges).
 */

/** UTC calendar day as ESPN expects: YYYYMMDD */
export function toEspnDateKey(isoOrDate: string | Date): string | null {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** ISO calendar day YYYY-MM-DD (UTC) for MLB/NHL/BALLDONTLIE style APIs */
export function toIsoDateKey(isoOrDate: string | Date): string | null {
  const espn = toEspnDateKey(isoOrDate);
  if (!espn || espn.length !== 8) return null;
  return `${espn.slice(0, 4)}-${espn.slice(4, 6)}-${espn.slice(6, 8)}`;
}

/**
 * Unique ESPN date keys for a set of commence times, most recent first.
 * Caps volume so a 300s cron cannot unbounded-fan-out HTTP.
 */
export function uniqueScoreboardDates(
  commenceTimes: readonly (string | Date)[],
  options: { maxDays?: number } = {},
): { espnKeys: string[]; isoKeys: string[] } {
  const maxDays = options.maxDays ?? 21;
  const set = new Set<string>();
  for (const t of commenceTimes) {
    const k = toEspnDateKey(t);
    if (k) set.add(k);
  }
  const espnKeys = [...set].sort((a, b) => b.localeCompare(a)).slice(0, maxDays);
  const isoKeys = espnKeys
    .map((k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`)
    .filter(Boolean);
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

  const nextDay = (yyyymmdd: string): string => {
    const y = Number(yyyymmdd.slice(0, 4));
    const m = Number(yyyymmdd.slice(4, 6));
    const d = Number(yyyymmdd.slice(6, 8));
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    return toEspnDateKey(dt)!;
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
