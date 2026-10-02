/**
 * GSE CV watch-loop game-window scheduler.
 *
 * Knows the NFL schedule, arms the watch loop for each broadcast window, and
 * stands down between games. Cron-woken (every 10 min), never a 24/7 process.
 *
 * Schedule source: ESPN scoreboard API (no key):
 *   https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYYMMDD
 * All window math is done in America/Chicago (Garrett's timezone).
 *
 * Weekly rhythm (verified 2026-10-01):
 *   Thu 7:15 PM CT (TNF) · Sun 8:30 AM CT London (first-class window) /
 *   12:00 PM / 3:05-3:25 PM / 7:20 PM CT (SNF) · Mon 7:15 PM CT (MNF) ·
 *   occasional Saturday games late season.
 *
 * Coverage doctrine (honest): one capture input = one stream. The scheduler
 * arms for ALL in-window games, but the watcher can only watch one feed, so
 * multi-game windows run priority-game or RedZone mode (see watcher/README).
 * Nobody downstream may claim "every game live" — see
 * packages/prediction-engine/src/watch/README.md.
 */

export interface GameWindow {
  /** ESPN event id, e.g. "401872964". */
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly away: string;
  readonly home: string;
  /** Kickoff, epoch ms. */
  readonly kickoffTs: number;
  /** Arm time: kickoff − 15 min. */
  readonly windowStart: number;
  /** Stand-down: final + 30 min (or kickoff + 4.5h fallback). */
  readonly windowEnd: number;
  readonly status: "scheduled" | "live" | "final";
  /** Venue city, e.g. "London" — informational only. */
  readonly venueCity?: string;
}

export const ARM_LEAD_MS = 15 * 60 * 1000;
export const STAND_DOWN_MS = 30 * 60 * 1000;
/** Fallback window length when the final whistle isn't observed. */
export const FALLBACK_WINDOW_MS = 4.5 * 3600 * 1000;

export function windowStartFor(kickoffTs: number): number {
  return kickoffTs - ARM_LEAD_MS;
}

export function windowEndFor(
  kickoffTs: number,
  finalTs: number | null,
): number {
  if (finalTs != null) return finalTs + STAND_DOWN_MS;
  return kickoffTs + FALLBACK_WINDOW_MS;
}

interface EspnEvent {
  id: string;
  date: string;
  name: string;
  week?: { number?: number };
  season?: { year?: number };
  status?: { type?: { name?: string } };
  competitions?: Array<{
    competitors?: Array<{
      homeAway?: string;
      team?: { abbreviation?: string };
    }>;
    venue?: { address?: { city?: string } };
  }>;
}

/**
 * Normalize one ESPN scoreboard event into a GameWindow.
 * Pure function — the unit-testable core. `nowMs` injectable for tests.
 */
export function eventToWindow(
  event: EspnEvent,
  finalTs: number | null = null,
): GameWindow | null {
  const kickoffTs = Date.parse(event.date);
  if (!Number.isFinite(kickoffTs)) return null;
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const away = competitors.find((c) => c.homeAway === "away")?.team?.abbreviation ?? "AWY";
  const home = competitors.find((c) => c.homeAway === "home")?.team?.abbreviation ?? "HME";
  const statusName = event.status?.type?.name ?? "";
  const status: GameWindow["status"] =
    statusName === "STATUS_FINAL"
      ? "final"
      : statusName === "STATUS_IN_PROGRESS"
        ? "live"
        : "scheduled";
  return {
    gameId: event.id,
    season: event.season?.year ?? new Date(kickoffTs).getFullYear(),
    week: event.week?.number ?? 0,
    away,
    home,
    kickoffTs,
    windowStart: windowStartFor(kickoffTs),
    windowEnd: windowEndFor(kickoffTs, status === "final" ? finalTs : null),
    status,
    venueCity: comp?.venue?.address?.city,
  };
}

/** Fetch the scoreboard for one YYYYMMDD date and normalize to windows. */
export async function fetchWindowsForDate(
  yyyymmdd: string,
  fetchFn: typeof fetch = fetch,
): Promise<GameWindow[]> {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${yyyymmdd}`;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`ESPN scoreboard ${yyyymmdd}: HTTP ${res.status}`);
  const data = (await res.json()) as { events?: EspnEvent[] };
  const out: GameWindow[] = [];
  for (const e of data.events ?? []) {
    const w = eventToWindow(e);
    if (w) out.push(w);
  }
  return out;
}

/** YYYYMMDD for a Date in America/Chicago. */
export function chicagoYmd(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts.replaceAll("-", "");
}

/** Windows active at `nowMs` (default: now). */
export function getActiveWindows(
  windows: readonly GameWindow[],
  nowMs: number = Date.now(),
): GameWindow[] {
  return windows.filter((w) => w.windowStart <= nowMs && nowMs <= w.windowEnd);
}

/** Next window starting after `nowMs` (default: now), or null. */
export function nextWindow(
  windows: readonly GameWindow[],
  nowMs: number = Date.now(),
): GameWindow | null {
  let best: GameWindow | null = null;
  for (const w of windows) {
    if (w.windowStart > nowMs && (best == null || w.windowStart < best.windowStart)) {
      best = w;
    }
  }
  return best;
}

/**
 * Convenience: fetch today + tomorrow (Chicago) and merge windows.
 * This is what the cron tick calls.
 */
export async function fetchUpcomingWindows(
  now: Date = new Date(),
  fetchFn: typeof fetch = fetch,
): Promise<GameWindow[]> {
  const today = chicagoYmd(now);
  const tomorrow = chicagoYmd(new Date(now.getTime() + 24 * 3600 * 1000));
  const days = today === tomorrow ? [today] : [today, tomorrow];
  const lists = await Promise.all(days.map((d) => fetchWindowsForDate(d, fetchFn)));
  const seen = new Set<string>();
  const merged: GameWindow[] = [];
  for (const w of lists.flat()) {
    if (!seen.has(w.gameId)) {
      seen.add(w.gameId);
      merged.push(w);
    }
  }
  return merged.sort((a, b) => a.windowStart - b.windowStart);
}
